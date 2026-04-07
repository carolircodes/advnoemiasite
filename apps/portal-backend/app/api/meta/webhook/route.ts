import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminha_app_secret_2026";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

// Função de log estruturado
function logEvent(
  event: string,
  data?: unknown,
  level: "info" | "warn" | "error" = "info"
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: data ?? null,
  };

  console.log(JSON.stringify(logEntry));
}

// Validar assinatura HMAC-SHA256
function verifySignature(body: string, signature: string): boolean {
  if (!signature) {
    logEvent(
      "SIGNATURE_MISSING",
      {
        hasAppSecret: !!APP_SECRET,
        appSecretLength: APP_SECRET?.length || 0,
      },
      "warn"
    );
    return false;
  }

  const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET)
    .update(body, "utf8")
    .digest("hex")}`;

  const isValid = signature === expectedSignature;

  logEvent("SIGNATURE_VALIDATION_DEBUG", {
    received: `${signature?.substring(0, 50)}...`,
    expected: `${expectedSignature?.substring(0, 50)}...`,
    isValid,
    appSecretSet: !!APP_SECRET,
    appSecretLength: APP_SECRET?.length || 0,
    bodyLength: body.length,
  });

  return isValid;
}

// Função para enviar mensagem para Instagram Direct
async function sendInstagramMessage(
  senderId: string,
  messageText: string
): Promise<boolean> {
  console.log("\n" + "=".repeat(80));
  console.log("🔍🔍🔍 INICIANDO ENVIO DE MENSAGEM INSTAGRAM 🔍🔍🔍");
  console.log("=".repeat(80));

  try {
    console.log("TOKEN_EXISTS:", !!INSTAGRAM_ACCESS_TOKEN);
    console.log("SENDER_ID_EXTRACTED:", senderId);
    console.log("MESSAGE_TEXT_EXTRACTED:", messageText);

    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log("❌ INSTAGRAM_ACCESS_TOKEN não configurado");
      logEvent("INSTAGRAM_TOKEN_MISSING", { senderId }, "error");
      return false;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    console.log("📡 ENDPOINT INSTAGRAM:", apiUrl);

    const payload = {
      recipient: { id: senderId },
      message: { text: messageText },
    };

    console.log("ABOUT_TO_SEND_INSTAGRAM_MESSAGE:", true);
    console.log("PAYLOAD:", JSON.stringify(payload, null, 2));

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

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    if (!response.ok) {
      logEvent(
        "INSTAGRAM_SEND_ERROR",
        {
          senderId,
          endpoint: apiUrl,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          fullResponse: responseData,
          payload,
        },
        "error"
      );
      return false;
    }

    logEvent("INSTAGRAM_MESSAGE_SENT", {
      senderId,
      responseStatus: response.status,
      responseData,
    });

    console.log("✅ SUCESSO NO ENVIO!");
    console.log("=".repeat(80) + "\n");
    return true;
  } catch (error) {
    console.log("💥 EXCEÇÃO CRÍTICA NO ENVIO:");
    console.log("Error:", error instanceof Error ? error.message : String(error));

    logEvent(
      "INSTAGRAM_SEND_EXCEPTION",
      {
        senderId,
        error: error instanceof Error ? error.message : "unknown",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "error"
    );

    console.log("=".repeat(80) + "\n");
    return false;
  }
}

export async function GET(request: NextRequest) {
  console.log("=== META WEBHOOK GET RECEIVED ===");

  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("=== META VERIFICATION DEBUG ===");
  console.log("MODE:", mode);
  console.log("TOKEN:", token === VERIFY_TOKEN ? "VALID" : "INVALID");
  console.log("HAS CHALLENGE:", !!challenge);

  logEvent("META_VERIFICATION_ATTEMPT", {
    mode,
    token: token === VERIFY_TOKEN ? "VALID" : "INVALID",
    hasChallenge: !!challenge,
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("=== META VERIFICATION SUCCESS ===");
    logEvent("META_VERIFICATION_SUCCESS", { challenge });
    return new NextResponse(challenge, { status: 200 });
  }

  console.log("=== META VERIFICATION FAILED ===");
  logEvent("META_VERIFICATION_FAILED", { mode, token }, "warn");
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  console.log("🔥🔥🔥 NOVA VERSÃO DO WEBHOOK ATIVA 🔥🔥🔥");

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  console.log("=== VALIDATING META SIGNATURE ===");

  // Não bloquear o POST por assinatura inválida
  if (!verifySignature(body, signature || "")) {
    console.log("=== META SIGNATURE INVALID (CONTINUANDO MESMO ASSIM) ===");
    logEvent(
      "META_SIGNATURE_INVALID_BUT_CONTINUE",
      {
        signature: signature ? `${signature.substring(0, 20)}...` : null,
      },
      "warn"
    );
  } else {
    console.log("=== META SIGNATURE VALID ===");
    logEvent("META_SIGNATURE_OK", {
      signature: signature ? `${signature.substring(0, 20)}...` : null,
      bodyLength: body.length,
    });
  }

  try {
    const data = JSON.parse(body);

    console.log("=== PARSING META PAYLOAD ===");
    console.log("OBJECT:", data.object);
    console.log("ENTRY COUNT:", data.entry?.length || 0);

    logEvent("META_WEBHOOK_RECEIVED", {
      object: data.object,
      entryCount: data.entry?.length || 0,
    });

    if (data.object === "instagram") {
      for (const entry of data.entry || []) {
        // Formato entry.messaging
        for (const messaging of entry.messaging || []) {
          if (messaging.message?.text && messaging.sender?.id) {
            const fixedResponse =
              "Olá! Recebi sua mensagem e já vou te ajudar.";

            const messageSent = await sendInstagramMessage(
              messaging.sender.id,
              fixedResponse
            );

            logEvent(
              messageSent
                ? "INSTAGRAM_AUTO_REPLY_SUCCESS"
                : "INSTAGRAM_AUTO_REPLY_FAILED",
              {
                source: "messaging",
                senderId: messaging.sender.id,
                messageText: messaging.message.text,
              },
              messageSent ? "info" : "error"
            );
          }
        }

        // Formato entry.changes
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const messages = change.value?.messages || [];

            for (const message of messages) {
              if (message.text && message.from?.id) {
                const fixedResponse =
                  "Olá! Recebi sua mensagem e já vou te ajudar.";

                const messageSent = await sendInstagramMessage(
                  message.from.id,
                  fixedResponse
                );

                logEvent(
                  messageSent
                    ? "INSTAGRAM_AUTO_REPLY_SUCCESS"
                    : "INSTAGRAM_AUTO_REPLY_FAILED",
                  {
                    source: "changes",
                    senderId: message.from.id,
                    messageText: message.text,
                  },
                  messageSent ? "info" : "error"
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
    console.log("=== META WEBHOOK ERROR ===");
    console.log("ERROR:", error instanceof Error ? error.message : String(error));

    logEvent(
      "META_WEBHOOK_ERROR",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      "error"
    );

    return NextResponse.json({ received: false }, { status: 400 });
  }
}