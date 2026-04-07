import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminha_app_secret_2026";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

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
  console.log("\n" + "=".repeat(80));
  console.log("🔍🔍🔍 INICIANDO ENVIO DE MENSAGEM INSTAGRAM 🔍🔍🔍");
  console.log("=".repeat(80));

  try {
    // 🔍 VERIFICAÇÃO DE TOKEN
    console.log("🔍 VERIFICANDO INSTAGRAM_ACCESS_TOKEN:");
    console.log("   - Token existe:", !!INSTAGRAM_ACCESS_TOKEN);
    console.log("   - Token length:", INSTAGRAM_ACCESS_TOKEN?.length || 0);
    console.log("   - Token prefix:", INSTAGRAM_ACCESS_TOKEN?.substring(0, 10) + "...");
    console.log("   - ENV vars:", Object.keys(process.env).filter(k => k.includes('INSTAGRAM')));

    console.log("🔍 VERIFICANDO INSTAGRAM_BUSINESS_ACCOUNT_ID:");
    console.log("   - Business Account ID existe:", !!INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log("   - Business Account ID:", INSTAGRAM_BUSINESS_ACCOUNT_ID || 'MISSING');

    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log("❌ INSTAGRAM_ACCESS_TOKEN não configurado");
      console.log("🔍 DIAGNÓSTICO: Variável de ambiente INSTAGRAM_ACCESS_TOKEN não encontrada");
      logEvent("INSTAGRAM_TOKEN_MISSING", { senderId }, "error");
      return false;
    }

    if (!INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      console.log("❌ INSTAGRAM_BUSINESS_ACCOUNT_ID não configurado");
      console.log("🔍 DIAGNÓSTICO: Variável de ambiente INSTAGRAM_BUSINESS_ACCOUNT_ID não encontrada");
      logEvent("INSTAGRAM_BUSINESS_ID_MISSING", { senderId }, "error");
      return false;
    }

    console.log("✅ Token válido, prosseguindo com envio...");

    // 🔍 DADOS DO ENVIO
    console.log("🔍 DADOS DO ENVIO:");
    console.log("   - Sender ID:", senderId);
    console.log("   - Message Text:", messageText);
    console.log("   - Message Length:", messageText.length);

    const apiUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    console.log("📡 ENDPOINT INSTAGRAM:", apiUrl);

    const payload = {
      recipient: { id: senderId },
      message: { text: messageText }
    };

    console.log("🔍 ENDPOINT E PAYLOAD:");
    console.log("   - URL:", apiUrl);
    console.log("   - Business Account ID:", INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log("   - Method: POST");
    console.log("   - Headers: Content-Type: application/json");
    console.log("   - Body:", JSON.stringify(payload, null, 2));

    console.log("🚀 EXECUTANDO FETCH PARA GRAPH API...");
    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("🔍 RESPOSTA HTTP RECEBIDA:");
    console.log("   - Status:", response.status);
    console.log("   - Status Text:", response.statusText);
    console.log("   - OK:", response.ok);
    console.log("   - Headers:", Object.fromEntries(response.headers.entries()));
    console.log("   - Duration:", duration + "ms");

    console.log("🔍 LENDO BODY DA RESPOSTA...");
    const responseText = await response.text();
    console.log("   - Response Text Length:", responseText.length);
    console.log("   - Response Text (raw):", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("✅ Response JSON parseado com sucesso");
    } catch (e) {
      responseData = { rawResponse: responseText };
      console.log("⚠️ Response não é JSON válido, usando raw response");
    }

    console.log("� DADOS COMPLETOS DA RESPOSTA:");
    console.log(JSON.stringify(responseData, null, 2));

    // 🔍 ANÁLISE DETALHADA DO ERRO
    if (!response.ok) {
      console.log("❌ ERRO DETECTADO NA GRAPH API:");
      console.log("   - HTTP Status:", response.status);
      console.log("   - Error Code:", responseData.error?.code);
      console.log("   - Error Type:", responseData.error?.type);
      console.log("   - Error Message:", responseData.error?.message);
      console.log("   - Error Subcode:", responseData.error?.error_subcode);
      console.log("   - FB Debug Info:", responseData.error?.error_data?.debug_info);

      // Diagnóstico específico
      if (response.status === 400) {
        console.log("🔍 DIAGNÓSTICO 400 - Bad Request:");
        if (responseData.error?.code === 100) {
          console.log("   - Causa: Parâmetro inválido ou faltando");
        } else if (responseData.error?.code === 190) {
          console.log("   - Causa: Token de acesso inválido ou expirado");
        } else if (responseData.error?.code === 200) {
          console.log("   - Causa: Permissões insuficientes");
        }
      } else if (response.status === 403) {
        console.log("🔍 DIAGNÓSTICO 403 - Forbidden:");
        console.log("   - Causa: App não tem permissão para esta operação");
      } else if (response.status === 500) {
        console.log("🔍 DIAGNÓSTICO 500 - Server Error:");
        console.log("   - Causa: Erro interno dos servidores Facebook");
      }

      logEvent("INSTAGRAM_SEND_ERROR", {
        senderId,
        endpoint: apiUrl,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        errorCode: responseData.error?.code,
        errorType: responseData.error?.type,
        errorMessage: responseData.error?.message,
        errorSubcode: responseData.error?.error_subcode,
        fullResponse: responseData,
        payload: payload,
        duration: duration
      }, "error");

      console.log("=".repeat(80) + "\n");
      return false;
    }

    // 🔍 SUCESSO
    console.log("✅ SUCESSO NO ENVIO!");
    console.log("   - Message ID:", responseData.message_id);
    console.log("   - Recipient ID:", responseData.recipient_id);
    console.log("   - Duration:", duration + "ms");

    logEvent("INSTAGRAM_MESSAGE_SENT", {
      senderId,
      messageId: responseData.message_id,
      recipientId: responseData.recipient_id,
      responseStatus: response.status,
      duration: duration
    });

    console.log("=".repeat(80) + "\n");
    return true;

  } catch (error) {
    console.log("💥 EXCEÇÃO CRÍTICA NO ENVIO:");
    console.log("   - Error:", error instanceof Error ? error.message : String(error));
    console.log("   - Stack:", error instanceof Error ? error.stack : 'No stack');
    console.log("   - Type:", typeof error);
    console.log("   - Sender ID:", senderId);

    logEvent("INSTAGRAM_SEND_EXCEPTION", {
      senderId,
      error: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      payload: {
        recipient: { id: senderId },
        message: { text: messageText }
      }
    }, "error");

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
            console.log("\n MENSAGEM DETECTADA (MESSAGING) ");
            console.log(" DADOS COMPLETS DA MENSAGEM:");
            console.log("   - Sender ID:", messaging.sender.id);
            console.log("   - Message Text:", messaging.message.text);
            console.log("   - Message ID:", messaging.message.mid);
            console.log("   - Timestamp:", messaging.timestamp);
            console.log("   - Sender Name:", messaging.sender.name || 'No name');
            console.log(" INICIANDO PROCESSAMENTO PARA RESPOSTA AUTOMÁTICA...\n");
            
            logEvent("INSTAGRAM_MESSAGING_MESSAGE_PARSED", {
              from: messaging.sender.id,
              messageId: messaging.message.mid,
              content: messaging.message.text,
              timestamp: messaging.timestamp,
              senderName: messaging.sender.name
            });

            const fixedResponse = "Olá! Recebi sua mensagem e já vou te ajudar.";
            
            console.log(" CHAMANDO sendInstagramMessage() para (messaging):", messaging.sender.id);
            const messageSent = await sendInstagramMessage(messaging.sender.id, fixedResponse);
            
            if (messageSent) {
              console.log(" RESPOSTA AUTOMÁTICA ENVIADA COM SUCESSO (messaging)");
              logEvent("INSTAGRAM_AUTO_REPLY_SUCCESS", {
                messageId: messaging.message.mid,
                senderId: messaging.sender.id,
                responseText: fixedResponse,
                source: "messaging"
              });
            } else {
              console.log(" FALHA AO ENVIAR RESPOSTA AUTOMÁTICA (messaging)");
              logEvent("INSTAGRAM_AUTO_REPLY_FAILED", {
                messageId: messaging.message.mid,
                senderId: messaging.sender.id,
                responseText: fixedResponse,
                source: "messaging"
              }, "error");
            }
          } else {
            console.log(" MENSAGEM MESSAGING INCOMPLETA:");
            console.log("   - Has text:", !!messaging.message?.text);
            console.log("   - Has sender.id:", !!messaging.sender?.id);
            console.log("   - Full messaging object:", JSON.stringify(messaging, null, 2));
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

              if (message.text && message.from?.id) {
                console.log("\n🎯🎯🎯 MENSAGEM DETECTADA (CHANGES) 🎯🎯🎯");
                console.log("🔍 DADOS COMPLETOS DA MENSAGEM:");
                console.log("   - From ID:", message.from.id);
                console.log("   - From Username:", message.from.username || 'No username');
                console.log("   - Message Text:", message.text);
                console.log("   - Message ID:", message.id);
                console.log("   - Timestamp:", message.timestamp);
                console.log("   - Message Type:", message.type);
                console.log("🎯 INICIANDO PROCESSAMENTO PARA RESPOSTA AUTOMÁTICA...\n");
                
                logEvent("INSTAGRAM_MESSAGE_PARSED", {
                  from: message.from.id,
                  messageId: message.id,
                  content: message.text,
                  timestamp: message.timestamp,
                  fromUsername: message.from.username,
                  messageType: message.type
                });

                const fixedResponse = "Olá! Recebi sua mensagem e já vou te ajudar.";
                
                console.log("📩 CHAMANDO sendInstagramMessage() para (changes):", message.from.id);
                const messageSent = await sendInstagramMessage(message.from.id, fixedResponse);
                
                if (messageSent) {
                  console.log("✅ RESPOSTA AUTOMÁTICA ENVIADA COM SUCESSO (changes)");
                  logEvent("INSTAGRAM_AUTO_REPLY_SUCCESS", {
                    messageId: message.id,
                    senderId: message.from.id,
                    responseText: fixedResponse,
                    source: "changes"
                  });
                } else {
                  console.log("❌ FALHA AO ENVIAR RESPOSTA AUTOMÁTICA (changes)");
                  logEvent("INSTAGRAM_AUTO_REPLY_FAILED", {
                    messageId: message.id,
                    senderId: message.from.id,
                    responseText: fixedResponse,
                    source: "changes"
                  }, "error");
                }
              } else {
                console.log("⚠️ MENSAGEM CHANGES INCOMPLETA:");
                console.log("   - Has text:", !!message.text);
                console.log("   - Has from.id:", !!message.from?.id);
                console.log("   - Full message object:", JSON.stringify(message, null, 2));
                logEvent("INSTAGRAM_INCOMPLETE_MESSAGE", {
                  messageId: message.id,
                  hasText: !!message.text,
                  hasFromId: !!message.from?.id,
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