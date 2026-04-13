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

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
const APP_SECRET =
  process.env.WHATSAPP_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim();
const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
  process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
const APP_SECRET_SOURCE = process.env.WHATSAPP_APP_SECRET?.trim()
  ? "WHATSAPP_APP_SECRET"
  : process.env.META_APP_SECRET?.trim()
    ? "META_APP_SECRET"
    : null;
const ACCESS_TOKEN_SOURCE = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  ? "WHATSAPP_ACCESS_TOKEN"
  : process.env.META_WHATSAPP_ACCESS_TOKEN?.trim()
    ? "META_WHATSAPP_ACCESS_TOKEN"
    : null;
const PHONE_NUMBER_ID_SOURCE = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  ? "WHATSAPP_PHONE_NUMBER_ID"
  : process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim()
    ? "META_WHATSAPP_PHONE_NUMBER_ID"
    : null;

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

function verifySignature(body: string, signature: string) {
  if (!signature || !APP_SECRET) {
    return false;
  }

  const expectedSignature = `sha256=${computeHmacSha256Hex(APP_SECRET, body)}`;

  return timingSafeEqualText(signature, expectedSignature);
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

async function markAsRead(messageId: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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
) {
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

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
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
      hasAccessToken: !!ACCESS_TOKEN,
      hasPhoneNumberId: !!PHONE_NUMBER_ID,
      accessTokenSource: ACCESS_TOKEN_SOURCE,
      phoneNumberIdSource: PHONE_NUMBER_ID_SOURCE
    }, "error");
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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
        errorText: errorText.slice(0, 500)
      }, "error");
      return false;
    }

    const responseBody = await response.json().catch(() => null);

    logEvent("WHATSAPP_OUTBOUND_SEND_SUCCESS", {
      channel: context?.channel || "whatsapp",
      externalUserId: context?.externalUserId || to,
      eventId: context?.eventId || null,
      sessionId: context?.sessionId || null,
      pipelineId: context?.pipelineId || null,
      messageType: context?.messageType || "text",
      responseType: context?.responseType || "text",
      responseLength: context?.responseLength ?? message.length,
      outboundMessageId:
        Array.isArray((responseBody as any)?.messages) &&
        typeof (responseBody as any).messages[0]?.id === "string"
          ? (responseBody as any).messages[0].id
          : null,
      reason: context?.reason || null,
      status: response.status
    });

    return true;
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
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!VERIFY_TOKEN) {
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

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge || "", {
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
  const enforceSignature = shouldEnforceWebhookSignature(
    "WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE"
  );
  const allowShadowAcceptance = shouldAllowShadowWebhookAcceptance(
    "WHATSAPP_WEBHOOK_ALLOW_SHADOW_SIGNATURE"
  );

  if (!APP_SECRET) {
    if (!allowShadowAcceptance) {
      logEvent(
        "WHATSAPP_SIGNATURE_SECRET_MISSING",
        {
          note: "WHATSAPP_APP_SECRET or META_APP_SECRET is required when signature enforcement is active.",
          enforceSignature,
          appSecretSource: APP_SECRET_SOURCE
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
        appSecretSource: APP_SECRET_SOURCE
      },
      "warn"
    );
  } else if (!verifySignature(body, signature)) {
      if (enforceSignature || !allowShadowAcceptance) {
        logEvent(
          "WHATSAPP_SIGNATURE_INVALID_REJECTED",
          {
            note: "Webhook rejected because the signature is invalid.",
            enforceSignature,
            shadowMode: allowShadowAcceptance,
            appSecretSource: APP_SECRET_SOURCE
          },
          "warn"
        );

        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }

      logEvent(
        "WHATSAPP_SIGNATURE_SHADOW_MODE",
        {
          note: "Webhook kept in explicit shadow validation mode.",
          enforceSignature,
          shadowMode: true,
          appSecretSource: APP_SECRET_SOURCE
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

    for (const entry of data.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") {
          continue;
        }

        for (const rawMessage of change.value?.messages || []) {
          const message = extractMessageInfo(rawMessage);

          if (!message.from || message.from === PHONE_NUMBER_ID) {
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
              timestamp: message.timestamp
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
        detail: process.env.CHANNEL_VALIDATION_EXPOSE_ERRORS === "true" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
