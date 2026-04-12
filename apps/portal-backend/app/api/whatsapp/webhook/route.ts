import { NextRequest, NextResponse } from "next/server";

import {
  computeHmacSha256Hex,
  shouldEnforceWebhookSignature,
  timingSafeEqualText
} from "@/lib/http/webhook-security";
import { processChannelConversationEvent } from "../../../../lib/services/channel-conversation-router";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
const APP_SECRET = process.env.WHATSAPP_APP_SECRET?.trim();
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

function logEvent(
  event: string,
  data?: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      data: data ?? null
    })
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

async function sendWhatsAppResponse(to: string, message: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    logEvent(
      "WHATSAPP_SEND_SKIPPED_MISSING_CONFIG",
      {
        to,
        hasAccessToken: !!ACCESS_TOKEN,
        hasPhoneNumberId: !!PHONE_NUMBER_ID
      },
      "error"
    );
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
      logEvent(
        "WHATSAPP_SEND_ERROR",
        {
          to,
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
      "WHATSAPP_SEND_EXCEPTION",
      {
        to,
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
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
  const signature = request.headers.get("x-hub-signature-256") || "";
  const body = await request.text();
  const enforceSignature = shouldEnforceWebhookSignature(
    "WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE"
  );

  if (!APP_SECRET) {
    if (enforceSignature) {
      logEvent(
        "WHATSAPP_SIGNATURE_SECRET_MISSING",
        {
          note: "WHATSAPP_APP_SECRET is required when signature enforcement is active."
        },
        "error"
      );

      return NextResponse.json(
        { error: "Webhook signature secret unavailable" },
        { status: 503 }
      );
    }

    logEvent(
      "WHATSAPP_SIGNATURE_VALIDATION_DISABLED",
      {
        note: "WHATSAPP_APP_SECRET is not configured. Signature validation is unavailable."
      },
      "warn"
    );
  } else if (!verifySignature(body, signature)) {
      if (enforceSignature) {
        logEvent(
          "WHATSAPP_SIGNATURE_INVALID_REJECTED",
          {
            note: "Webhook rejected because the signature is invalid."
          },
          "warn"
        );

        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }

      logEvent(
        "WHATSAPP_SIGNATURE_INVALID_BUT_ACCEPTED",
        {
          note: "Webhook kept in shadow validation mode to avoid operational interruption."
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
    logEvent(
      "WHATSAPP_WEBHOOK_PROCESSING_ERROR",
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );

    return NextResponse.json({ error: "Failed to process WhatsApp webhook" }, { status: 500 });
  }
}
