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

    console.log("INSTAGRAM_ABOUT_TO_SEND");
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

    console.log("INSTAGRAM_GRAPH_API_STATUS:", response.status);
    console.log("INSTAGRAM_GRAPH_API_RESPONSE:", responseText);

    if (!response.ok) {
      console.log("INSTAGRAM_RESPONSE_FAILED");
      logEvent(
        "INSTAGRAM_RESPONSE_FAILED",
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

    console.log("INSTAGRAM_RESPONSE_SENT");
    logEvent("INSTAGRAM_RESPONSE_SENT", {
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
  console.log("INSTAGRAM_POST_RECEIVED");

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(body, signature || "")) {
    console.log("INSTAGRAM_SIGNATURE_INVALID");
    logEvent(
      "INSTAGRAM_SIGNATURE_INVALID",
      {
        signature: signature ? `${signature.substring(0, 20)}...` : null,
      },
      "warn"
    );
  } else {
    console.log("INSTAGRAM_SIGNATURE_VALID");
  }

  try {
    const data = JSON.parse(body);

    // LOGS SEGUROS DA ESTRUTURA REAL
    console.log("ENTRY_COUNT:", data.entry?.length || 0);
    console.log("ENTRY_KEYS:", data.entry?.length > 0 ? Object.keys(data.entry[0] || {}) : []);
    console.log("FIRST_ENTRY_KEYS:", data.entry?.length > 0 ? Object.keys(data.entry[0] || {}) : []);

    if (data.entry?.length > 0) {
      const firstEntry = data.entry[0];
      const messagingCount = firstEntry.messaging?.length || 0;
      const changesCount = firstEntry.changes?.length || 0;

      console.log("MESSAGING_COUNT:", messagingCount);
      console.log("CHANGES_COUNT:", changesCount);

      if (changesCount > 0) {
        const firstChange = firstEntry.changes[0];
        console.log("CHANGE_FIELD:", firstChange.field);
        console.log("CHANGE_VALUE_KEYS:", Object.keys(firstChange.value || {}));
      }

      if (messagingCount > 0) {
        const firstMessaging = firstEntry.messaging[0];
        console.log("MESSAGE_KEYS:", Object.keys(firstMessaging || {}));
      }
    }

    // LOG RESUMIDO DO PRIMEIRO EVENTO
    if (data.entry?.length > 0) {
      const firstEntry = data.entry[0];
      const eventSummary = {
        object: data.object,
        entryKeys: Object.keys(firstEntry),
        hasMessaging: !!firstEntry.messaging,
        hasChanges: !!firstEntry.changes,
        changeField: firstEntry.changes?.[0]?.field,
        changeValueKeys: Object.keys(firstEntry.changes?.[0]?.value || {}),
        senderKeys: firstEntry.messaging?.[0]?.sender ? Object.keys(firstEntry.messaging[0].sender) : null,
        recipientKeys: firstEntry.messaging?.[0]?.recipient ? Object.keys(firstEntry.messaging[0].recipient) : null,
        messageKeys: firstEntry.messaging?.[0]?.message ? Object.keys(firstEntry.messaging[0].message) : null,
        hasText: !!(firstEntry.messaging?.[0]?.message?.text || firstEntry.changes?.[0]?.value?.messages?.[0]?.text),
        hasMid: !!(firstEntry.messaging?.[0]?.message?.mid || firstEntry.changes?.[0]?.value?.messages?.[0]?.mid)
      };
      console.log("EVENT_SUMMARY:", JSON.stringify(eventSummary, null, 2));
    }

    if (data.object === "instagram") {
      for (const entry of data.entry || []) {
        // Process entry.messaging format
        for (const messaging of entry.messaging || []) {
          console.log("INSTAGRAM_STRUCTURE_MATCHED: messaging");
          if (!messaging.message?.text) {
            console.log("EVENT_IGNORED_NO_MESSAGE: messaging structure without message.text");
            continue;
          }
          if (!messaging.sender?.id) {
            console.log("EVENT_IGNORED_MISSING_SENDER: messaging structure without sender.id");
            continue;
          }
          if (!messaging.message.text.trim()) {
            console.log("EVENT_IGNORED_NO_TEXT: messaging structure with empty text");
            continue;
          }

          console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: messaging");
          console.log("INSTAGRAM_SENDER_EXTRACTED:", messaging.sender.id);
          console.log("INSTAGRAM_TEXT_EXTRACTED:", messaging.message.text);

          await sendInstagramMessage(
            messaging.sender.id,
            "Olá! Recebi sua mensagem e já vou te ajudar."
          );
        }

        // Process entry.changes format
        for (const change of entry.changes || []) {
          console.log("INSTAGRAM_STRUCTURE_MATCHED: changes");
          if (change.field !== "messages") {
            console.log("EVENT_IGNORED_UNSUPPORTED_STRUCTURE: changes field not 'messages'", { field: change.field });
            continue;
          }

          console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: changes");
          const messages = change.value?.messages || [];

          for (const message of messages) {
            if (!message.text) {
              console.log("EVENT_IGNORED_NO_MESSAGE: changes message without text");
              continue;
            }
            if (!message.from?.id) {
              console.log("EVENT_IGNORED_MISSING_SENDER: changes message without from.id");
              continue;
            }
            if (!message.text.trim()) {
              console.log("EVENT_IGNORED_NO_TEXT: changes message with empty text");
              continue;
            }

            console.log("INSTAGRAM_SENDER_EXTRACTED:", message.from.id);
            console.log("INSTAGRAM_TEXT_EXTRACTED:", message.text);

            await sendInstagramMessage(
              message.from.id,
              "Olá! Recebi sua mensagem e já vou te ajudar."
            );
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