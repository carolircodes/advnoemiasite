import { NextRequest, NextResponse } from "next/server";

import {
  resolveWhatsAppWebhookConfig,
  summarizeWhatsAppWebhookPayload,
  validateWhatsAppWebhookSignature,
  verifyWhatsAppWebhookChallenge
} from "@/lib/channels/whatsapp-webhook";
import {
  shouldAllowShadowWebhookAcceptance,
  shouldEnforceWebhookSignature,
  shouldExposeChannelValidationErrors
} from "@/lib/http/webhook-security";
import { traceOperationalEvent } from "@/lib/observability/operational-trace";
import { assertOperationalSchemaCompatibility } from "@/lib/schema/compatibility";
import { conversationInboxService } from "@/lib/services/conversation-inbox";
import { processChannelConversationEvent } from "../../../../lib/services/channel-conversation-router.ts";

type WhatsAppOutboundContext = {
  channel?: string;
  externalUserId?: string;
  eventId?: string;
  sessionId?: string | null;
  pipelineId?: string | null;
  messageType?: string | null;
  responseType?: string | null;
  responseLength?: number | null;
  reason?: string | null;
};

type WhatsAppSendResult = {
  ok: boolean;
  messageId?: string | null;
  error?: string | null;
};

type WhatsAppStatusWebhook = {
  id?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  timestamp?: string | number;
  recipient_id?: string;
  errors?: Array<{
    code?: number | string;
    title?: string;
  }>;
};

function logEvent(
  event: string,
  data?: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  traceOperationalEvent(
    level,
    event,
    {
      service: "whatsapp_webhook",
      action: event.toLowerCase(),
      eventId: typeof data?.eventId === "string" ? data.eventId : null,
      sessionId: typeof data?.sessionId === "string" ? data.sessionId : null,
      channel: "whatsapp",
      pipelineId: typeof data?.pipelineId === "string" ? data.pipelineId : null,
      decisionState: typeof data?.decisionState === "string" ? data.decisionState : null,
      sendResult: typeof data?.sendResult === "string" ? data.sendResult : null,
      handoffState: typeof data?.handoffState === "string" ? data.handoffState : null
    },
    data ?? {}
  );
}

function extractMessageInfo(message: Record<string, any>) {
  const type = typeof message.type === "string" ? message.type : "unknown";

  if (type === "text") {
    return {
      from: typeof message.from === "string" ? message.from : "",
      messageId: typeof message.id === "string" ? message.id : "",
      timestamp: message.timestamp,
      type,
      content: typeof message.text?.body === "string" ? message.text.body : ""
    };
  }

  return {
    from: typeof message.from === "string" ? message.from : "",
    messageId: typeof message.id === "string" ? message.id : "",
    timestamp: message.timestamp,
    type,
    content: `[${type}]`
  };
}

function buildWhatsAppContactNameMap(contacts: Array<Record<string, any>> | undefined) {
  const contactMap = new Map<string, string>();

  for (const contact of contacts || []) {
    const waId = typeof contact?.wa_id === "string" ? contact.wa_id : "";
    const profileName =
      typeof contact?.profile?.name === "string" ? contact.profile.name.trim() : "";

    if (waId && profileName) {
      contactMap.set(waId, profileName);
    }
  }

  return contactMap;
}

async function reconcileStatusUpdate(rawStatus: WhatsAppStatusWebhook) {
  if (!rawStatus.id || !rawStatus.status) {
    return;
  }

  const firstError = Array.isArray(rawStatus.errors) ? rawStatus.errors[0] : null;
  const result = await conversationInboxService.reconcileWhatsAppMessageStatus({
    externalMessageId: rawStatus.id,
    status: rawStatus.status,
    timestamp: rawStatus.timestamp,
    errorCode: firstError?.code || null,
    errorTitle: firstError?.title || null
  });

  logEvent("WHATSAPP_STATUS_RECONCILED", {
    eventId: rawStatus.id,
    externalUserId: rawStatus.recipient_id || null,
    sendResult: rawStatus.status,
    sessionId: result.ok ? result.sessionId || null : null,
    reason: result.ok ? "status_reconciled" : "status_not_mapped",
    errorCode: firstError?.code || null,
    errorTitle: firstError?.title || null
  });
}

async function markAsRead(messageId: string) {
  const config = resolveWhatsAppWebhookConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
      })
    });

    return response.ok;
  } catch (error) {
    logEvent(
      "WHATSAPP_MARK_AS_READ_ERROR",
      {
        messageId,
        error: error instanceof Error ? error.message : String(error)
      },
      "warn"
    );
    return false;
  }
}

async function sendTypingIndicator(to: string) {
  const config = resolveWhatsAppWebhookConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        typing_indicator: {
          type: "text"
        }
      })
    });

    return response.ok;
  } catch (error) {
    logEvent(
      "WHATSAPP_TYPING_ERROR",
      {
        to,
        error: error instanceof Error ? error.message : String(error)
      },
      "warn"
    );
    return false;
  }
}

async function sendWhatsAppResponse(
  to: string,
  message: string,
  context?: WhatsAppOutboundContext
): Promise<WhatsAppSendResult> {
  const config = resolveWhatsAppWebhookConfig();

  logEvent("WHATSAPP_OUTBOUND_SEND_START", {
    channel: context?.channel || "whatsapp",
    externalUserId: context?.externalUserId || to,
    eventId: context?.eventId || null,
    sessionId: context?.sessionId || null,
    pipelineId: context?.pipelineId || null,
    messageType: context?.messageType || "text",
    responseType: context?.responseType || "text",
    responseLength: context?.responseLength ?? message.length,
    reason: context?.reason || null
  });

  if (!config.accessToken || !config.phoneNumberId) {
    logEvent("WHATSAPP_OUTBOUND_SEND_ERROR", {
      channel: context?.channel || "whatsapp",
      externalUserId: context?.externalUserId || to,
      eventId: context?.eventId || null,
      sessionId: context?.sessionId || null,
      pipelineId: context?.pipelineId || null,
      messageType: context?.messageType || "text",
      responseType: context?.responseType || "text",
      responseLength: context?.responseLength ?? message.length,
      reason: "missing_config",
      hasAccessToken: config.accessTokenConfigured,
      hasPhoneNumberId: config.phoneNumberIdConfigured,
      accessTokenSource: config.accessTokenSource,
      phoneNumberIdSource: config.phoneNumberIdSource
    }, "error");
    return {
      ok: false,
      messageId: null,
      error: "missing_config"
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorBody: Record<string, any> | null = null;

      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = null;
      }

      logEvent("WHATSAPP_OUTBOUND_SEND_ERROR", {
        channel: context?.channel || "whatsapp",
        externalUserId: context?.externalUserId || to,
        eventId: context?.eventId || null,
        sessionId: context?.sessionId || null,
        pipelineId: context?.pipelineId || null,
        messageType: context?.messageType || "text",
        responseType: context?.responseType || "text",
        responseLength: context?.responseLength ?? message.length,
        reason: context?.reason || "api_error",
        errorStatus: response.status,
        errorCode: errorBody?.error?.code || null,
        errorSubcode: errorBody?.error?.error_subcode || null,
        providerErrorShape: errorBody?.error ? "graph_error" : "unstructured"
      }, "error");
      return {
        ok: false,
        messageId: null,
        error:
          typeof errorBody?.error?.message === "string"
            ? errorBody.error.message
            : `api_error_${response.status}`
      };
    }

    const responseBody = await response.json().catch(() => null);
    const outboundMessageId =
      Array.isArray((responseBody as any)?.messages) &&
      typeof (responseBody as any).messages[0]?.id === "string"
        ? (responseBody as any).messages[0].id
        : null;

    logEvent("WHATSAPP_OUTBOUND_SEND_SUCCESS", {
      channel: context?.channel || "whatsapp",
      externalUserId: context?.externalUserId || to,
      eventId: context?.eventId || null,
      sessionId: context?.sessionId || null,
      pipelineId: context?.pipelineId || null,
      messageType: context?.messageType || "text",
      responseType: context?.responseType || "text",
      responseLength: context?.responseLength ?? message.length,
      outboundMessageId,
      reason: context?.reason || null,
      status: response.status
    });

    return {
      ok: true,
      messageId: outboundMessageId,
      error: null
    };
  } catch (error) {
    logEvent("WHATSAPP_OUTBOUND_SEND_ERROR", {
      channel: context?.channel || "whatsapp",
      externalUserId: context?.externalUserId || to,
      eventId: context?.eventId || null,
      sessionId: context?.sessionId || null,
      pipelineId: context?.pipelineId || null,
      messageType: context?.messageType || "text",
      responseType: context?.responseType || "text",
      responseLength: context?.responseLength ?? message.length,
      reason: context?.reason || "exception",
      errorStatus: null,
      errorCode: null,
      error: error instanceof Error ? error.message : String(error)
    }, "error");
    return {
      ok: false,
      messageId: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function GET(request: NextRequest) {
  const config = resolveWhatsAppWebhookConfig();

  if (!config.verifyTokenConfigured) {
    logEvent("WHATSAPP_VERIFY_TOKEN_MISSING", undefined, "error");
    return NextResponse.json(
      { error: "Webhook verification unavailable" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verification = verifyWhatsAppWebhookChallenge({
    mode,
    token,
    challenge,
    verifyToken: config.verifyToken
  });

  if (verification.ok) {
    return new Response(verification.body, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  await assertOperationalSchemaCompatibility("whatsapp_webhook");

  const signature = request.headers.get("x-hub-signature-256") || "";
  const body = await request.text();
  const config = resolveWhatsAppWebhookConfig();
  const enforceSignature = shouldEnforceWebhookSignature(
    "WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE"
  );
  const allowShadowAcceptance = shouldAllowShadowWebhookAcceptance(
    "WHATSAPP_WEBHOOK_ALLOW_SHADOW_SIGNATURE"
  );

  const signatureValidation = validateWhatsAppWebhookSignature({
    body,
    signatureHeader: signature,
    appSecret: config.appSecret
  });

  if (!signatureValidation.ok && signatureValidation.code === "app_secret_missing") {
    if (!allowShadowAcceptance) {
      logEvent(
        "WHATSAPP_SIGNATURE_SECRET_MISSING",
        {
          note: "WHATSAPP_APP_SECRET or META_APP_SECRET is required when signature enforcement is active.",
          enforceSignature,
          appSecretSource: config.appSecretSource
        },
        "error"
      );

      return NextResponse.json(
        { error: "Webhook signature secret unavailable" },
        { status: 503 }
      );
    }

    logEvent(
      "WHATSAPP_SIGNATURE_SHADOW_MODE",
      {
        note: "Signature validation unavailable, but shadow mode was explicitly enabled.",
        enforceSignature,
        shadowMode: true,
        appSecretSource: config.appSecretSource
      },
      "warn"
    );
  } else if (!signatureValidation.ok) {
      if (enforceSignature || !allowShadowAcceptance) {
        logEvent(
          "WHATSAPP_SIGNATURE_INVALID_REJECTED",
          {
            note: "Webhook rejected because the signature is invalid.",
            reason: signatureValidation.code,
            enforceSignature,
            shadowMode: allowShadowAcceptance,
            appSecretSource: config.appSecretSource
          },
          "warn"
        );

        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }

      logEvent(
        "WHATSAPP_SIGNATURE_SHADOW_MODE",
        {
          note: "Webhook kept in explicit shadow validation mode.",
          reason: signatureValidation.code,
          enforceSignature,
          shadowMode: true,
          appSecretSource: config.appSecretSource
        },
        "warn"
      );
  }

  try {
    let data;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      logEvent(
        "WHATSAPP_WEBHOOK_INVALID_JSON",
        {
          error: parseError instanceof Error ? parseError.message : String(parseError)
        },
        "warn"
      );

      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (data.object !== "whatsapp_business_account") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const payloadSummary = summarizeWhatsAppWebhookPayload(data);
    logEvent("WHATSAPP_WEBHOOK_INBOUND_SUMMARY", {
      object: payloadSummary.object,
      entryCount: payloadSummary.entryCount,
      messageCount: payloadSummary.messageCount,
      statusCount: payloadSummary.statusCount,
      unknownChangeCount: payloadSummary.unknownChangeCount,
      appSecretSource: config.appSecretSource
    });

    for (const entry of data.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") {
          continue;
        }

        const contactNameMap = buildWhatsAppContactNameMap(change.value?.contacts);

        for (const rawStatus of change.value?.statuses || []) {
          await reconcileStatusUpdate(rawStatus as WhatsAppStatusWebhook);
        }

        for (const rawMessage of change.value?.messages || []) {
          const message = extractMessageInfo(rawMessage);

          if (!message.from || message.from === config.phoneNumberId) {
            continue;
          }

          logEvent("WHATSAPP_INBOUND_ACCEPTED", {
            channel: "whatsapp",
            externalUserId: message.from,
            eventId: message.messageId || null,
            sessionId: null,
            pipelineId: null,
            messageType: message.type,
            responseType: null,
            responseLength: null,
            reason: null
          });

          await processChannelConversationEvent(
            {
              channel: "whatsapp",
              source: "whatsapp_inbound",
              externalUserId: message.from,
              externalMessageId: message.messageId || undefined,
              externalEventId: message.messageId || undefined,
              messageText: message.content,
              messageType: message.type,
              timestamp: message.timestamp,
              displayName: contactNameMap.get(message.from)
            },
            {
              sendText: sendWhatsAppResponse,
              markAsRead,
              sendTypingIndicator
            }
          );
        }
      }
    }

    return NextResponse.json(
      {
        status: "received",
        processed: true
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logEvent(
      "WHATSAPP_WEBHOOK_PROCESSING_ERROR",
      {
        error: errorMessage
      },
      "error"
    );

    return NextResponse.json(
      {
        error: "Failed to process WhatsApp webhook",
        detail: shouldExposeChannelValidationErrors() ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
