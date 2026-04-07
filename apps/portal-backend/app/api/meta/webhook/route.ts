import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminha_app_secret_2026";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

function logEvent(
  event: string,
  data?: unknown,
  level: "info" | "warn" | "error" = "info"
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      data: data ?? null,
    })
  );
}

function verifySignature(body: string, signature: string): boolean {
  if (!signature) return false;

  const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET)
    .update(body, "utf8")
    .digest("hex")}`;

  return signature === expectedSignature;
}

async function sendInstagramMessage(
  senderId: string,
  messageText: string
): Promise<boolean> {
  try {
    console.log("TOKEN_EXISTS:", !!INSTAGRAM_ACCESS_TOKEN);
    console.log("SENDER_ID_EXTRACTED:", senderId);
    console.log("MESSAGE_TEXT_EXTRACTED:", messageText);

    if (!INSTAGRAM_ACCESS_TOKEN) {
      logEvent("INSTAGRAM_TOKEN_MISSING", { senderId }, "error");
      return false;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    const payload = {
      recipient: { id: senderId },
      message: { text: messageText },
    };

    console.log("ABOUT_TO_SEND_INSTAGRAM_MESSAGE");
    console.log("GRAPH_API_URL:", apiUrl);
    console.log("GRAPH_API_PAYLOAD:", JSON.stringify(payload));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    console.log("GRAPH_API_STATUS:", response.status);
    console.log("GRAPH_API_RESPONSE_TEXT:", responseText);

    if (!response.ok) {
      logEvent(
        "INSTAGRAM_SEND_ERROR",
        {
          senderId,
          httpStatus: response.status,
          responseText,
          payload,
        },
        "error"
      );
      return false;
    }

    logEvent("INSTAGRAM_MESSAGE_SENT", {
      senderId,
      httpStatus: response.status,
      responseText,
    });

    return true;
  } catch (error) {
    logEvent(
      "INSTAGRAM_SEND_EXCEPTION",
      {
        senderId,
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  console.log("🔥 INSTAGRAM WEBHOOK POST RECEIVED");

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  console.log("=== VALIDATING META SIGNATURE ===");

  if (!verifySignature(body, signature || "")) {
    console.log("=== META SIGNATURE INVALID (IGNORED) ===");
    logEvent(
      "META_SIGNATURE_INVALID_BUT_IGNORED",
      {
        signature: signature ? `${signature.substring(0, 20)}...` : null,
      },
      "warn"
    );
  } else {
    console.log("=== META SIGNATURE VALID ===");
  }

  try {
    const data = JSON.parse(body);

    console.log("PAYLOAD_OBJECT:", data.object);
    console.log("ENTRY_RAW:", JSON.stringify(data.entry, null, 2));

    if (data.object === "instagram") {
      for (const entry of data.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message?.text && messaging.sender?.id) {
            await sendInstagramMessage(
              messaging.sender.id,
              "Olá! Recebi sua mensagem e já vou te ajudar."
            );
          }
        }

        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const messages = change.value?.messages || [];

            for (const message of messages) {
              if (message.text && message.from?.id) {
                await sendInstagramMessage(
                  message.from.id,
                  "Olá! Recebi sua mensagem e já vou te ajudar."
                );
              }
            }
          }
        }
      }
    }

    console.log("=== META WEBHOOK PROCESSED SUCCESSFULLY ===");
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logEvent(
      "META_WEBHOOK_ERROR",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );

    return NextResponse.json({ received: false }, { status: 400 });
  }
}