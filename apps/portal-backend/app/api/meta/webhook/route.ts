import { NextRequest, NextResponse } from "next/server";

import {
  computeHmacSha256Hex,
  shouldAllowShadowWebhookAcceptance,
  shouldEnforceWebhookSignature,
  timingSafeEqualText
} from "@/lib/http/webhook-security";
import { traceOperationalEvent } from "@/lib/observability/operational-trace";
import { assertOperationalSchemaCompatibility } from "@/lib/schema/compatibility";
import { processChannelConversationEvent } from "../../../../lib/services/channel-conversation-router";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN?.trim();
const APP_SECRET =
  process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim();
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

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
      channel: "instagram",
      pipelineId: typeof data?.pipelineId === "string" ? data.pipelineId : null,
      decisionState: typeof data?.decisionState === "string" ? data.decisionState : null,
      sendResult: typeof data?.sendResult === "string" ? data.sendResult : null,
      handoffState: typeof data?.handoffState === "string" ? data.handoffState : null
    },
    data ?? {}
  );
}

function verifySignature(rawBuffer: Buffer, signature: string) {
  if (!APP_SECRET || !signature) {
    return false;
  }

  const expectedSignature = `sha256=${computeHmacSha256Hex(APP_SECRET, rawBuffer)}`;

  return timingSafeEqualText(signature, expectedSignature);
}

async function sendInstagramMessage(recipientId: string, messageText: string) {
  try {
    if (!INSTAGRAM_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      logEvent(
        "INSTAGRAM_SEND_SKIPPED_MISSING_CONFIG",
        {
          recipientId,
          hasAccessToken: !!INSTAGRAM_ACCESS_TOKEN,
          hasPageId: !!FACEBOOK_PAGE_ID
        },
        "error"
      );
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId
          },
          message: {
            text: messageText
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logEvent(
        "INSTAGRAM_SEND_ERROR",
        {
          recipientId,
          status: response.status,
          errorText: errorText.slice(0, 500)
        },
        "error"
      );
      return false;
    }

    return true;
  } catch (error) {
    logEvent(
      "INSTAGRAM_SEND_EXCEPTION",
      {
        recipientId,
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
    return false;
  }
}

async function sendInstagramCommentReply(commentId: string, messageText: string) {
  try {
    if (!INSTAGRAM_ACCESS_TOKEN) {
      logEvent(
        "INSTAGRAM_COMMENT_REPLY_SKIPPED_MISSING_CONFIG",
        {
          commentId,
          hasAccessToken: !!INSTAGRAM_ACCESS_TOKEN
        },
        "error"
      );
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${commentId}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: messageText
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logEvent(
        "INSTAGRAM_COMMENT_REPLY_ERROR",
        {
          commentId,
          status: response.status,
          errorText: errorText.slice(0, 500)
        },
        "error"
      );
      return false;
    }

    return true;
  } catch (error) {
    logEvent(
      "INSTAGRAM_COMMENT_REPLY_EXCEPTION",
      {
        commentId,
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
    return false;
  }
}

function extractInstagramDmMessageText(message: Record<string, unknown>) {
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

export async function GET(request: NextRequest) {
  if (!VERIFY_TOKEN) {
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

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    await assertOperationalSchemaCompatibility("meta_webhook");

    const rawBuffer = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("x-hub-signature-256") || "";
    const signatureValid = APP_SECRET ? verifySignature(rawBuffer, signature) : false;
    const enforceSignature = shouldEnforceWebhookSignature("META_WEBHOOK_ENFORCE_SIGNATURE");
    const allowShadowAcceptance = shouldAllowShadowWebhookAcceptance(
      "META_WEBHOOK_ALLOW_SHADOW_SIGNATURE"
    );

    if (!APP_SECRET) {
      if (!allowShadowAcceptance) {
        logEvent(
          "META_SIGNATURE_SECRET_MISSING",
          {
            note: "META/Instagram webhook secret is required when signature enforcement is active."
          },
          "error"
        );

        return NextResponse.json(
          { error: "Webhook signature secret unavailable" },
          { status: 503 }
        );
      }

      logEvent(
        "META_SIGNATURE_SHADOW_MODE",
        {
          note: "Signature validation unavailable, but shadow mode was explicitly enabled.",
          shadowMode: true
        },
        "warn"
      );
    } else if (!signatureValid) {
      if (enforceSignature || !allowShadowAcceptance) {
        logEvent(
          "META_SIGNATURE_INVALID_REJECTED",
          {
            note: "Webhook rejected because the signature is invalid.",
            shadowMode: allowShadowAcceptance
          },
          "warn"
        );

        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }

      logEvent(
        "META_SIGNATURE_SHADOW_MODE",
        {
          note: "Webhook kept in explicit shadow validation mode.",
          shadowMode: true
        },
        "warn"
      );
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

    if (data.object !== "instagram") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    for (const entry of data.entry || []) {
      for (const messaging of entry.messaging || []) {
        const senderId =
          typeof messaging.sender?.id === "string" ? messaging.sender.id : "";
        const message = messaging.message || {};
        const messageText = extractInstagramDmMessageText(message);
        const messageId = typeof message.mid === "string" ? message.mid : "";

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
            messageType: typeof message.type === "string" ? message.type : "text",
            isEcho: message.is_echo === true,
            timestamp: messaging.timestamp
          },
          {
            sendText: sendInstagramMessage
          }
        );
      }

      for (const change of entry.changes || []) {
        if (change.field === "comments") {
          const comment = change.value || {};
          const senderId = typeof comment.from?.id === "string" ? comment.from.id : "";
          const commentId = typeof comment.id === "string" ? comment.id : "";
          const commentText = typeof comment.text === "string" ? comment.text : "";
          const mediaId = typeof comment.media?.id === "string" ? comment.media.id : "";

          if (!senderId || !commentId || !commentText) {
            continue;
          }

          await processChannelConversationEvent(
            {
              channel: "instagram",
              source: "instagram_comment",
              externalUserId: senderId,
              externalMessageId: commentId,
              externalEventId: `instagram_comment:${commentId}`,
              messageText: commentText,
              messageType: "text",
              commentContext: {
                commentId,
                mediaId,
                commentText,
                username:
                  typeof comment.from?.username === "string"
                    ? comment.from.username
                    : undefined
              }
            },
            {
              sendText: sendInstagramMessage,
              sendPublicCommentReply: sendInstagramCommentReply,
              sendDirectFromComment: sendInstagramMessage
            }
          );
        }

        if (change.field !== "messages") {
          continue;
        }

        for (const message of change.value?.messages || []) {
          const senderId = typeof message.from?.id === "string" ? message.from.id : "";
          const messageId = typeof message.mid === "string" ? message.mid : "";
          const messageText = extractInstagramDmMessageText(message);

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
              messageType: typeof message.type === "string" ? message.type : "text",
              isEcho: message.is_echo === true,
              timestamp: message.timestamp
            },
            {
              sendText: sendInstagramMessage
            }
          );
        }
      }
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
