import { NextRequest, NextResponse } from "next/server";

import {
  shouldAllowShadowWebhookAcceptance,
  shouldEnforceWebhookSignature
} from "@/lib/http/webhook-security";
import {
  resolveMetaWebhookConfig,
  summarizeMetaWebhookPayload,
  validateMetaWebhookSignature,
  verifyMetaWebhookChallenge
} from "@/lib/meta/meta-webhook-config";
import { sendFacebookCommentReply, sendFacebookDirectMessage } from "@/lib/meta/facebook-service";
import {
  sendInstagramCommentReply,
  sendInstagramDirectMessage
} from "@/lib/meta/instagram-service";
import { traceOperationalEvent } from "@/lib/observability/operational-trace";
import { assertOperationalSchemaCompatibility } from "@/lib/schema/compatibility";
import { processChannelConversationEvent } from "../../../../lib/services/channel-conversation-router";

type MetaChannel = "instagram" | "facebook";

function logEvent(
  event: string,
  data?: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  traceOperationalEvent(
    level,
    event,
    {
      service: "meta_webhook",
      action: event.toLowerCase(),
      eventId: typeof data?.eventId === "string" ? data.eventId : null,
      sessionId: typeof data?.sessionId === "string" ? data.sessionId : null,
      channel: typeof data?.channel === "string" ? data.channel : "meta",
      pipelineId: typeof data?.pipelineId === "string" ? data.pipelineId : null,
      decisionState: typeof data?.decisionState === "string" ? data.decisionState : null,
      sendResult: typeof data?.sendResult === "string" ? data.sendResult : null,
      handoffState: typeof data?.handoffState === "string" ? data.handoffState : null
    },
    data ?? {}
  );
}

function extractDmMessageText(message: Record<string, unknown>) {
  const textValue = typeof message.text === "string" ? message.text : "";
  if (textValue.trim().length > 0) {
    return textValue;
  }

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  if (attachments.length > 0) {
    return "[conteudo_nao_textual]";
  }

  return "";
}

async function sendDirectMessage(
  channel: MetaChannel,
  recipientId: string,
  messageText: string,
  context?: {
    eventId: string;
    externalUserId: string;
    sessionId?: string | null;
    pipelineId?: string | null;
    messageType?: string | null;
    responseType?: string | null;
    responseLength?: number | null;
    reason?: string | null;
  }
) {
  const result =
    channel === "facebook"
      ? await sendFacebookDirectMessage(recipientId, messageText, {
          ...context
        })
      : await sendInstagramDirectMessage(recipientId, messageText, {
          ...context
        });

  logEvent(result.ok ? "META_SEND_SUCCESS" : "META_SEND_ERROR", {
    channel,
    recipientId,
    ...result.metadata,
    messageId: result.messageId,
    rawStatus: result.rawStatus,
    error: result.error
  }, result.ok ? "info" : "error");

  return result;
}

async function sendCommentReply(
  channel: MetaChannel,
  commentId: string,
  messageText: string,
  context?: {
    eventId: string;
    externalUserId: string;
    sessionId?: string | null;
    pipelineId?: string | null;
    responseType?: string | null;
    responseLength?: number | null;
    reason?: string | null;
  }
) {
  const result =
    channel === "facebook"
      ? await sendFacebookCommentReply(commentId, messageText, {
          ...context
        })
      : await sendInstagramCommentReply(commentId, messageText, {
          ...context
        });

  logEvent(result.ok ? "META_COMMENT_REPLY_SUCCESS" : "META_COMMENT_REPLY_ERROR", {
    channel,
    commentId,
    ...result.metadata,
    messageId: result.messageId,
    rawStatus: result.rawStatus,
    error: result.error
  }, result.ok ? "info" : "error");

  return result.ok;
}

async function processMetaMessagingEntry(channel: MetaChannel, entry: Record<string, unknown>) {
  for (const messaging of Array.isArray(entry.messaging) ? entry.messaging : []) {
    const senderId =
      typeof (messaging as Record<string, any>).sender?.id === "string"
        ? (messaging as Record<string, any>).sender.id
        : "";
    const senderUsername =
      typeof (messaging as Record<string, any>).sender?.username === "string"
        ? (messaging as Record<string, any>).sender.username
        : undefined;
    const senderDisplayName =
      typeof (messaging as Record<string, any>).sender?.name === "string"
        ? (messaging as Record<string, any>).sender.name
        : undefined;
    const message = ((messaging as Record<string, any>).message || {}) as Record<string, unknown>;
    const messageText = extractDmMessageText(message);
    const messageId = typeof message.mid === "string" ? message.mid : "";

    if (!senderId || !messageText) {
      continue;
    }

    await processChannelConversationEvent(
      {
        channel,
        source: channel === "facebook" ? "facebook_dm" : "instagram_dm",
        externalUserId: senderId,
        externalMessageId: messageId || undefined,
        externalEventId: messageId || undefined,
        messageText,
        messageType: typeof message.type === "string" ? message.type : "text",
        isEcho: (message as { is_echo?: boolean }).is_echo === true,
        timestamp: (messaging as Record<string, any>).timestamp,
        displayName: senderDisplayName,
        username: senderUsername
      },
      {
        sendText: async (recipientId, outboundText, outboundContext) =>
          sendDirectMessage(channel, recipientId, outboundText, outboundContext)
      }
    );
  }
}

async function processMetaChangeEntry(channel: MetaChannel, entry: Record<string, unknown>) {
  for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
    const typedChange = change as Record<string, any>;
    const value = (typedChange.value || {}) as Record<string, any>;

    if (
      (channel === "instagram" && typedChange.field === "comments") ||
      (channel === "facebook" &&
        (typedChange.field === "feed" || typedChange.field === "comments") &&
        (value.item === "comment" || typeof value.comment_id === "string"))
    ) {
      const senderId = typeof value.from?.id === "string" ? value.from.id : "";
      const commentId =
        typeof value.comment_id === "string"
          ? value.comment_id
          : typeof value.id === "string"
            ? value.id
            : "";
      const commentText =
        typeof value.message === "string"
          ? value.message
          : typeof value.text === "string"
            ? value.text
            : "";
      const mediaId =
        typeof value.post_id === "string"
          ? value.post_id
          : typeof value.media?.id === "string"
            ? value.media.id
            : "";

      if (!senderId || !commentId || !commentText) {
        continue;
      }

      await processChannelConversationEvent(
        {
          channel,
          source: channel === "facebook" ? "facebook_comment" : "instagram_comment",
          externalUserId: senderId,
          externalMessageId: commentId,
          externalEventId: `${channel}_comment:${commentId}`,
          messageText: commentText,
          messageType: "text",
          displayName: typeof value.from?.name === "string" ? value.from.name : undefined,
          username:
            typeof value.from?.username === "string"
              ? value.from.username
              : undefined,
          commentContext: {
            commentId,
            mediaId,
            commentText,
            username:
              typeof value.from?.username === "string"
                ? value.from.username
                : undefined
          }
        },
        {
          sendText: async (recipientId, outboundText, outboundContext) =>
            sendDirectMessage(channel, recipientId, outboundText, outboundContext),
          sendPublicCommentReply: async (targetCommentId, outboundText, outboundContext) =>
            sendCommentReply(channel, targetCommentId, outboundText, outboundContext),
          sendDirectFromComment: async (recipientId, outboundText, outboundContext) => {
            const result = await sendDirectMessage(channel, recipientId, outboundText, outboundContext);
            return result.ok;
          }
        }
      );

      continue;
    }

    if (channel !== "instagram" || typedChange.field !== "messages") {
      continue;
    }

    for (const message of Array.isArray(value.messages) ? value.messages : []) {
      const typedMessage = message as Record<string, any>;
      const senderId = typeof typedMessage.from?.id === "string" ? typedMessage.from.id : "";
      const senderUsername =
        typeof typedMessage.from?.username === "string"
          ? typedMessage.from.username
          : undefined;
      const senderDisplayName =
        typeof typedMessage.from?.name === "string" ? typedMessage.from.name : undefined;
      const messageId = typeof typedMessage.mid === "string" ? typedMessage.mid : "";
      const messageText = extractDmMessageText(typedMessage);

      if (!senderId || !messageText) {
        continue;
      }

      await processChannelConversationEvent(
        {
          channel: "instagram",
          source: "instagram_dm",
          externalUserId: senderId,
          externalMessageId: messageId || undefined,
          externalEventId: messageId || undefined,
          messageText,
          messageType: typeof typedMessage.type === "string" ? typedMessage.type : "text",
          isEcho: typedMessage.is_echo === true,
          timestamp: typedMessage.timestamp,
          displayName: senderDisplayName,
          username: senderUsername
        },
        {
          sendText: async (recipientId, outboundText, outboundContext) =>
            sendDirectMessage("instagram", recipientId, outboundText, outboundContext)
        }
      );
    }
  }
}

export async function GET(request: NextRequest) {
  const config = resolveMetaWebhookConfig();

  if (!config.verifyTokenConfigured) {
    logEvent("META_VERIFY_TOKEN_MISSING", undefined, "error");
    return NextResponse.json(
      { error: "Webhook verification unavailable" },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verification = verifyMetaWebhookChallenge({
    mode,
    token,
    challenge,
    verifyToken: config.verifyToken
  });

  if (verification.ok) {
    logEvent("META_VERIFY_CHALLENGE_ACCEPTED", {
      challengeLength: verification.body.length,
      appSecretSource: config.appSecretSource
    });

    return new Response(verification.body, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  logEvent(
    "META_VERIFY_CHALLENGE_REJECTED",
    {
      hasMode: Boolean(mode),
      hasVerifyToken: Boolean(token),
      hasChallenge: Boolean(challenge)
    },
    "warn"
  );

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    await assertOperationalSchemaCompatibility("meta_webhook");

    const config = resolveMetaWebhookConfig();
    const rawBuffer = Buffer.from(await request.arrayBuffer());
    const signatureHeader = request.headers.get("x-hub-signature-256");
    const enforceSignature = shouldEnforceWebhookSignature("META_WEBHOOK_ENFORCE_SIGNATURE");
    const allowShadowAcceptance = shouldAllowShadowWebhookAcceptance(
      "META_WEBHOOK_ALLOW_SHADOW_SIGNATURE"
    );
    const signatureValidation = validateMetaWebhookSignature({
      rawBuffer,
      signatureHeader,
      config
    });
    const rawBodyBytes = rawBuffer.length;

    if (!signatureValidation.ok) {
      const diagnosticData = {
        note: "Meta webhook signature validation failed before payload processing.",
        reason: signatureValidation.reason,
        hasSignatureHeader: Boolean(signatureHeader),
        signaturePrefix:
          typeof signatureHeader === "string" && signatureHeader.length > 0
            ? signatureHeader.slice(0, 14)
            : null,
        expectedSignaturePrefix: signatureValidation.expectedSignaturePrefix,
        attemptedSources: signatureValidation.attemptedSources,
        appSecretSource: config.appSecretSource,
        rawBodyBytes,
        shadowMode: allowShadowAcceptance,
        enforceSignature
      };

      if (signatureValidation.reason === "app_secret_missing") {
        if (!allowShadowAcceptance) {
          logEvent("META_SIGNATURE_SECRET_MISSING", diagnosticData, "error");

          return NextResponse.json(
            { error: "Webhook signature secret unavailable" },
            { status: 503 }
          );
        }

        logEvent("META_SIGNATURE_SHADOW_MODE", diagnosticData, "warn");
      } else if (enforceSignature || !allowShadowAcceptance) {
        logEvent("META_SIGNATURE_INVALID_REJECTED", diagnosticData, "warn");

        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      } else {
        logEvent("META_SIGNATURE_SHADOW_MODE", diagnosticData, "warn");
      }
    } else {
      logEvent("META_SIGNATURE_VALIDATED", {
        matchedSecretSource: signatureValidation.matchedSource,
        appSecretSource: config.appSecretSource,
        rawBodyBytes
      });
    }

    if (!config.appSecretConfigured) {
      if (!allowShadowAcceptance) {
        return NextResponse.json(
          { error: "Webhook signature secret unavailable" },
          { status: 503 }
        );
      }
    }

    let data;
    try {
      data = JSON.parse(rawBuffer.toString("utf8"));
    } catch (parseError) {
      logEvent(
        "META_WEBHOOK_INVALID_JSON",
        {
          error: parseError instanceof Error ? parseError.message : String(parseError)
        },
        "warn"
      );

      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (data.object !== "instagram" && data.object !== "page") {
      logEvent("META_WEBHOOK_OBJECT_IGNORED", {
        object: typeof data.object === "string" ? data.object : null,
        rawBodyBytes
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const channel: MetaChannel = data.object === "page" ? "facebook" : "instagram";
    const payloadSummary = summarizeMetaWebhookPayload(data);

    logEvent("META_WEBHOOK_INBOUND_ACCEPTED", {
      channel,
      object: payloadSummary.object,
      entryCount: payloadSummary.entryCount,
      messagingCount: payloadSummary.messagingCount,
      changeCount: payloadSummary.changeCount,
      appSecretSource: config.appSecretSource
    });

    for (const entry of Array.isArray(data.entry) ? data.entry : []) {
      const typedEntry = entry as Record<string, unknown>;
      await processMetaMessagingEntry(channel, typedEntry);
      await processMetaChangeEntry(channel, typedEntry);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logEvent(
      "META_WEBHOOK_PROCESSING_ERROR",
      {
        error: errorMessage
      },
      "error"
    );

    return NextResponse.json(
      {
        error: "Failed to process Meta webhook",
        detail: process.env.CHANNEL_VALIDATION_EXPOSE_ERRORS === "true" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
