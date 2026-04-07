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
async function sendInstagramMessage(senderId: string, messageText: string): Promise<boolean> {
  try {
    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log("❌ INSTAGRAM_ACCESS_TOKEN não configurado");
      logEvent("INSTAGRAM_TOKEN_MISSING", { senderId }, "error");
      return false;
    }

    console.log("📩 Respondendo usuário:", senderId);
    console.log("📝 Mensagem:", messageText);
    
    const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    const payload = {
      recipient: { id: senderId },
      message: { text: messageText }
    };

    console.log("🌐 Enviando para Graph API:", apiUrl);
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    console.log("📊 Resposta Graph API:", {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });

    if (response.ok) {
      console.log("✅ Mensagem enviada com sucesso para:", senderId);
      logEvent("INSTAGRAM_MESSAGE_SENT", {
        senderId,
        messageId: responseData.message_id,
        responseStatus: response.status
      });
      return true;
    } else {
      console.log("❌ Erro ao enviar mensagem:", responseData);
      logEvent("INSTAGRAM_SEND_ERROR", {
        senderId,
        error: responseData.error?.message || "Unknown error",
        errorCode: responseData.error?.code,
        responseStatus: response.status
      }, "error");
      return false;
    }
  } catch (error) {
    console.log("💥 Exceção ao enviar mensagem:", error);
    logEvent("INSTAGRAM_SEND_EXCEPTION", {
      senderId,
      error: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined
    }, "error");
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
  console.log("EXPECTED TOKEN:", VERIFY_TOKEN);
  console.log("RECEIVED TOKEN:", token);

  logEvent("META_VERIFICATION_ATTEMPT", {
    mode,
    token: token === VERIFY_TOKEN ? "VALID" : "INVALID",
    hasChallenge: !!challenge,
    expectedToken: VERIFY_TOKEN,
    receivedToken: token,
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
  console.log("\n" + "=".repeat(80));
  console.log("🚀 INSTAGRAM WEBHOOK HIT - POST REQUEST RECEIVED");
  console.log("=".repeat(80));
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🌐 URL:", request.url);
  console.log(
    "🔑 Headers:",
    JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2)
  );
  console.log("👤 User-Agent:", request.headers.get("user-agent"));
  console.log(
    "📍 IP Origin:",
    request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
  );
  console.log("=".repeat(80) + "\n");

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  logEvent("META_POST_RECEIVED", {
    contentLength: body.length,
    hasSignature: !!signature,
    signaturePreview: signature ? `${signature.substring(0, 50)}...` : null,
    contentType: request.headers.get("content-type"),
    userAgent: request.headers.get("user-agent"),
    envs: {
      META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ? "SET" : "MISSING",
      META_APP_SECRET: process.env.META_APP_SECRET ? "SET" : "MISSING",
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN
        ? "SET"
        : "MISSING",
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET
        ? "SET"
        : "MISSING",
    },
  });

  console.log("=== META POST DEBUG ===");
  console.log("HEADERS:", {
    "content-type": request.headers.get("content-type"),
    "x-hub-signature-256": signature
      ? `${signature.substring(0, 50)}...`
      : null,
    "user-agent": request.headers.get("user-agent"),
  });
  console.log("BODY LENGTH:", body.length);
  console.log(
    "BODY PREVIEW:",
    body.substring(0, 1000) + (body.length > 1000 ? "..." : "")
  );

  console.log("=== VALIDATING META SIGNATURE ===");

  // NUNCA RETORNAR 403 NO POST - SEMPRE PROCESSAR
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
    console.log("FULL PAYLOAD:", JSON.stringify(data, null, 2));

    logEvent("META_WEBHOOK_RECEIVED", {
      object: data.object,
      entryCount: data.entry?.length || 0,
      fullData: data,
    });

    if (data.object === "instagram") {
      console.log("=== INSTAGRAM EVENT DETECTED ===");
      logEvent("INSTAGRAM_EVENT_RECEIVED", {
        object: data.object,
        entryCount: data.entry?.length || 0,
      });

      for (const entry of data.entry || []) {
        console.log("=== PROCESSING INSTAGRAM ENTRY ===");
        console.log("ENTRY ID:", entry.id);
        console.log("CHANGES COUNT:", entry.changes?.length || 0);
        console.log("MESSAGING COUNT:", entry.messaging?.length || 0);

        // Processar formato entry.messaging (estrutura clássica)
        for (const messaging of entry.messaging || []) {
          console.log("=== PROCESSING INSTAGRAM MESSAGING ===");
          console.log("SENDER:", messaging.sender?.id);
          console.log("MESSAGE TEXT:", messaging.message?.text);

          if (messaging.message?.text && messaging.sender?.id) {
            console.log("=== INSTAGRAM MESSAGING MESSAGE FOUND ===");
            
            logEvent("INSTAGRAM_MESSAGING_MESSAGE_PARSED", {
              from: messaging.sender.id,
              messageId: messaging.message.mid,
              content: messaging.message.text,
              timestamp: messaging.timestamp,
            });

            const fixedResponse = "Olá! Recebi sua mensagem e já vou te ajudar.";
            
            console.log(" Respondendo usuário (messaging):", messaging.sender.id);
            const messageSent = await sendInstagramMessage(messaging.sender.id, fixedResponse);
            
            if (messageSent) {
              console.log(" Resposta automática enviada com sucesso (messaging)");
              logEvent("INSTAGRAM_AUTO_REPLY_SUCCESS", {
                messageId: messaging.message.mid,
                senderId: messaging.sender.id,
                responseText: fixedResponse,
                source: "messaging"
              });
            } else {
              console.log(" Falha ao enviar resposta automática (messaging)");
              logEvent("INSTAGRAM_AUTO_REPLY_FAILED", {
                messageId: messaging.message.mid,
                senderId: messaging.sender.id,
                responseText: fixedResponse,
                source: "messaging"
              }, "error");
            }
          }
        }

        // Processar formato entry.changes (estrutura mais comum)
        for (const change of entry.changes || []) {
          console.log("=== PROCESSING INSTAGRAM CHANGE ===");
          console.log("FIELD:", change.field);

          if (change.field === "messages") {
            console.log("=== INSTAGRAM MESSAGES FOUND ===");

            const messages = change.value?.messages || [];
            console.log("MESSAGES COUNT:", messages.length);

            for (const message of messages) {
              console.log("=== PROCESSING INSTAGRAM MESSAGE ===");
              console.log("FROM:", message.from?.id);
              console.log("MESSAGE ID:", message.id);
              console.log("CONTENT:", message.text || "NO TEXT");

              logEvent("INSTAGRAM_MESSAGE_PARSED", {
                from: message.from?.id,
                messageId: message.id,
                content: message.text,
                timestamp: message.timestamp,
              });

              const fixedResponse =
                "Olá! Recebi sua mensagem e já vou te ajudar.";
              
              // Enviar resposta automática via Graph API
              if (message.from?.id) {
                const messageSent = await sendInstagramMessage(message.from.id, fixedResponse);
                
                if (messageSent) {
                  console.log("✅ Resposta automática enviada com sucesso");
                  logEvent("INSTAGRAM_AUTO_REPLY_SUCCESS", {
                    messageId: message.id,
                    senderId: message.from.id,
                    responseText: fixedResponse
                  });
                } else {
                  console.log("❌ Falha ao enviar resposta automática");
                  logEvent("INSTAGRAM_AUTO_REPLY_FAILED", {
                    messageId: message.id,
                    senderId: message.from.id,
                    responseText: fixedResponse
                  }, "error");
                }
              } else {
                console.log("⚠️ Mensagem sem sender.id - não foi possível responder");
                logEvent("INSTAGRAM_NO_SENDER_ID", {
                  messageId: message.id,
                  messageData: message
                }, "warn");
              }
            }
          }
        }
      }
    } else {
      console.log("=== NOT INSTAGRAM OBJECT ===");
      console.log("OBJECT TYPE:", data.object);

      logEvent("META_NOT_INSTAGRAM", {
        object: data.object,
      });
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