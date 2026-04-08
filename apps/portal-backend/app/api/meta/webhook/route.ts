import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { answerNoemia } from "../../../../lib/services/noemia";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminia_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminia_app_secret_2026";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const PALAVRA_CHAVE_INSTAGRAM = "palavra";

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
  // LOGS DE DIAGNÓSTICO SEGURO E DETALHADO
  console.log("=== SIGNATURE_VALIDATION_DEBUG ===");
  console.log("ENV_VAR_USED: META_APP_SECRET");
  console.log("SIGNATURE_HEADER_PRESENT:", !!signature);
  console.log("SIGNATURE_HEADER_PREFIX:", signature ? signature.substring(0, 20) : null);
  console.log("META_APP_SECRET_PRESENT:", !!APP_SECRET);
  console.log("META_APP_SECRET_LENGTH:", APP_SECRET?.length || 0);
  console.log("RAW_BODY_LENGTH:", body.length);
  
  // Log do nome exato da variável sendo usada
  console.log("APP_SECRET_VAR_NAME: META_APP_SECRET");
  
  // Verificar se há valores alternativos ou fallbacks
  const altSecret1 = process.env.META_APP_SECRET;
  const altSecret2 = process.env.APP_SECRET;
  const altSecret3 = process.env.INSTAGRAM_APP_SECRET;
  
  console.log("ALT_META_APP_SECRET_PRESENT:", !!altSecret1);
  console.log("ALT_APP_SECRET_PRESENT:", !!altSecret2);
  console.log("ALT_INSTAGRAM_APP_SECRET_PRESENT:", !!altSecret3);
  
  // Hash do body para diagnóstico (sem expor conteúdo)
  const bodyHash = createHmac("sha256", "debug").update(body, "utf8").digest("hex").substring(0, 16);
  console.log("RAW_BODY_HASH_SHA256:", bodyHash);
  
  if (!signature) {
    console.log("SIGNATURE_DIAGNOSIS: No signature header found");
    return false;
  }

  // Verificar se o body está intacto (antes de qualquer parse)
  console.log("BODY_IS_STRING:", typeof body === 'string');
  console.log("BODY_HAS_CONTENT:", body.length > 0);
  
  // Calcular assinatura esperada
  const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET)
    .update(body, "utf8")
    .digest("hex")}`;
    
  console.log("EXPECTED_SIGNATURE_PREFIX:", expectedSignature.substring(0, 20));
  console.log("RECEIVED_SIGNATURE_PREFIX:", signature.substring(0, 20));
  console.log("SIGNATURE_MATCH:", signature === expectedSignature);
  
  // Log adicional para diagnóstico
  if (signature !== expectedSignature) {
    console.log("SIGNATURE_DIAGNOSIS: Signature mismatch - possible causes:");
    console.log("1. META_APP_SECRET incorrect in Vercel env vars");
    console.log("2. Body mutated before signature calculation");
    console.log("3. Different app configured in Meta Developers");
    console.log("4. Encoding issue with body text");
    
    // Tentar com secrets alternativos se existirem
    if (altSecret2 && altSecret2 !== APP_SECRET) {
      const altSignature = `sha256=${createHmac("sha256", altSecret2)
        .update(body, "utf8")
        .digest("hex")}`;
      console.log("ALT_APP_SECRET_MATCH:", signature === altSignature);
    }
    
    if (altSecret3 && altSecret3 !== APP_SECRET) {
      const altSignature = `sha256=${createHmac("sha256", altSecret3)
        .update(body, "utf8")
        .digest("hex")}`;
      console.log("ALT_INSTAGRAM_APP_SECRET_MATCH:", signature === altSignature);
    }
  } else {
    console.log("SIGNATURE_DIAGNOSIS: Signature valid");
  }

  return signature === expectedSignature;
}

async function sendInstagramMessage(
  senderId: string,
  messageText: string
): Promise<boolean> {
  try {
    // VALIDAÇÃO DAS VARIÁVEIS CRÍTICAS
    console.log("INSTAGRAM_BUSINESS_ACCOUNT_ID_PRESENT:", !!INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log("INSTAGRAM_BUSINESS_ACCOUNT_ID_LENGTH:", INSTAGRAM_BUSINESS_ACCOUNT_ID?.length || 0);
    console.log("INSTAGRAM_ACCESS_TOKEN_PRESENT:", !!INSTAGRAM_ACCESS_TOKEN);
    console.log("INSTAGRAM_ACCESS_TOKEN_LENGTH:", INSTAGRAM_ACCESS_TOKEN?.length || 0);
    console.log("INSTAGRAM_SENDER_ID_EXTRACTED:", senderId);
    console.log("INSTAGRAM_MESSAGE_TEXT_EXTRACTED:", messageText);

    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log("INSTAGRAM_SEND_MESSAGE_FAILED: ACCESS_TOKEN missing");
      logEvent("INSTAGRAM_SEND_MESSAGE_FAILED", { 
        reason: "ACCESS_TOKEN_MISSING", 
        senderId 
      }, "error");
      return false;
    }

    // ENDPOINT CORRETO - usa /me/messages para Instagram Direct
    const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    // PAYLOAD OTIMIZADO - estrutura correta para Instagram
    const payload = {
      recipient: { 
        id: senderId 
      },
      message: { 
        text: messageText 
      },
      messaging_type: "RESPONSE"
    };

    console.log("INSTAGRAM_GRAPH_API_URL:", apiUrl);
    console.log("INSTAGRAM_GRAPH_API_PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    console.log("INSTAGRAM_GRAPH_API_STATUS:", response.status);
    console.log("INSTAGRAM_GRAPH_API_RESPONSE_BODY:", responseText);

    if (!response.ok) {
      console.log("INSTAGRAM_SEND_MESSAGE_FAILED: API error");
      logEvent(
        "INSTAGRAM_SEND_MESSAGE_FAILED",
        {
          reason: "API_ERROR",
          senderId,
          httpStatus: response.status,
          responseBody: responseText,
          requestPayload: payload,
        },
        "error"
      );
      return false;
    }

    console.log("INSTAGRAM_SEND_MESSAGE_SUCCESS: Message sent successfully");
    logEvent("INSTAGRAM_SEND_MESSAGE_SUCCESS", {
      senderId,
      httpStatus: response.status,
      responseBody: responseText,
    });

    return true;
  } catch (error) {
    console.log("INSTAGRAM_SEND_MESSAGE_FAILED: Exception occurred");
    logEvent(
      "INSTAGRAM_SEND_MESSAGE_FAILED",
      {
        reason: "EXCEPTION",
        senderId,
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );
    return false;
  }
}

// Processar mensagem usando lógica centralizada da NoemIA
// Função de proteção global para entradas não suportadas no Instagram
async function handleUnsupportedInstagramMessage(senderId: string, messageType: string): Promise<boolean> {
  const unsupportedMessage = "No momento, este atendimento está habilitado apenas para mensagens escritas. Pode me contar por texto, de forma simples, o que aconteceu no seu caso?";
  
  logEvent("UNSUPPORTED_MESSAGE_HANDLED", {
    platform: "instagram",
    sender: senderId,
    messageType,
    response: unsupportedMessage
  });

  return await sendInstagramMessage(senderId, unsupportedMessage);
}

async function processMessageWithNoemia(senderId: string, messageText: string) {
  try {
    console.log('=== INSTAGRAM_MESSAGE_RECEIVED ===');
    console.log('SENDER_ID:', senderId);
    console.log('MESSAGE:', messageText);
    console.log('LENGTH:', messageText.length);
    
    logEvent("INSTAGRAM_CALLING_NOEMIA", {
      senderId,
      messageLength: messageText.length
    });

    // Verificar se OpenAI está configurada
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const openAIModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    console.log('INSTAGRAM_OPENAI_ELIGIBLE: true');
    console.log('INSTAGRAM_OPENAI_KEY_EXISTS:', hasOpenAIKey);
    console.log('INSTAGRAM_OPENAI_MODEL:', openAIModel);

    // Usar a lógica centralizada da NoemIA
    const response = await answerNoemia({
      message: messageText,
      audience: "visitor",
      history: []
    }, null);

    console.log('INSTAGRAM_NOEMIA_RESPONSE_RECEIVED');
    console.log('RESPONSE_LENGTH:', response.answer?.length || 0);
    console.log('RESPONSE_SOURCE:', response.meta?.source || 'unknown');
    
    logEvent("INSTAGRAM_NOEMIA_RESPONSE", {
      senderId,
      responseLength: response.answer?.length || 0,
      audience: response.audience,
      source: response.meta?.source
    });

    // Log específico baseado na fonte
    if (response.meta?.source === 'openai') {
      console.log('INSTAGRAM_OPENAI_SUCCESS: OpenAI responded successfully');
    } else if (response.meta?.source === 'fallback') {
      console.log('INSTAGRAM_FALLBACK_USED: Fallback was used');
    } else {
      console.log('INSTAGRAM_SOURCE_UNKNOWN: Unknown response source');
    }

    console.log('=== INSTAGRAM_SEND_ATTEMPT ===');
    const sent = await sendInstagramMessage(senderId, response.answer || "Desculpe, não consegui processar sua mensagem no momento. Tente novamente.");
    
    if (sent) {
      console.log('INSTAGRAM_SEND_SUCCESS: Message sent successfully');
      logEvent("INSTAGRAM_RESPONSE_SENT", {
        senderId,
        responseLength: response.answer?.length || 0
      });
    } else {
      console.log('INSTAGRAM_SEND_FAILED: Failed to send message');
      logEvent("INSTAGRAM_RESPONSE_FAILED", {
        senderId,
        responseLength: response.answer?.length || 0
      }, "error");
    }
  } catch (error) {
    console.log('INSTAGRAM_NOEMIA_ERROR: Error in processMessageWithNoemia');
    console.log('ERROR:', error instanceof Error ? error.message : String(error));
    
    logEvent("INSTAGRAM_NOEMIA_ERROR", {
      senderId,
      error: error instanceof Error ? error.message : String(error)
    }, "error");

    // Fallback para mensagem fixa em caso de erro
    const fallbackResponse = "Oi! Vi que você enviou uma mensagem. Vou te explicar de forma simples o que pode estar acontecendo no seu caso. Muitas pessoas passam por isso sem saber que podem ter um direito não reconhecido. Se você quiser, posso entender melhor sua situação.";
    
    console.log('=== INSTAGRAM_FALLBACK_ATTEMPT ===');
    const sent = await sendInstagramMessage(senderId, fallbackResponse);
    
    if (sent) {
      console.log('INSTAGRAM_FALLBACK_SENT: Fallback message sent');
      logEvent("INSTAGRAM_FALLBACK_SENT", {
        senderId,
        responseLength: fallbackResponse.length
      });
    }
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
  console.log("INSTAGRAM_WEBHOOK_POST_RECEIVED");

  // VALIDAÇÃO DAS VARIÁVEIS DE AMBIENTE
  console.log("META_APP_SECRET_PRESENT:", !!APP_SECRET);
  console.log("META_APP_SECRET_LENGTH:", APP_SECRET?.length || 0);
  console.log("META_VERIFY_TOKEN_PRESENT:", !!VERIFY_TOKEN);
  console.log("META_VERIFY_TOKEN_LENGTH:", VERIFY_TOKEN?.length || 0);

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  
  console.log("INSTAGRAM_SIGNATURE_HEADER_RECEIVED:", signature ? "[PRESENT]" : "[MISSING]");
  console.log("INSTAGRAM_SIGNATURE_HEADER_VALUE:", signature ? `${signature.substring(0, 20)}...` : "[MISSING]");
  
  const isValid = verifySignature(body, signature || "");
  
  console.log("INSTAGRAM_SIGNATURE_VALIDATION_RESULT:", isValid ? "VALID" : "INVALID");
  
  if (!isValid) {
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
          if (!messaging.sender?.id) {
            console.log("EVENT_IGNORED_MISSING_SENDER: messaging structure without sender.id");
            continue;
          }

          // Verificar se é mensagem de texto
          if (!messaging.message?.text) {
            console.log("EVENT_IGNORED_NO_MESSAGE: messaging structure without message.text");
            // Enviar mensagem de proteção para conteúdo não suportado
            await handleUnsupportedInstagramMessage(messaging.sender.id, messaging.message?.type || 'unknown');
            continue;
          }

          if (!messaging.message.text.trim()) {
            console.log("EVENT_IGNORED_NO_TEXT: messaging structure with empty text");
            continue;
          }

          console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: messaging");
          console.log("INSTAGRAM_SENDER_EXTRACTED:", messaging.sender.id);
          console.log("INSTAGRAM_TEXT_EXTRACTED:", messaging.message.text);

          await processMessageWithNoemia(messaging.sender.id, messaging.message.text);
        }

        // Process entry.changes format
        for (const change of entry.changes || []) {
          console.log("INSTAGRAM_STRUCTURE_MATCHED: changes");
          
          // Processar comentários
          if (change.field === "comments") {
            console.log("INSTAGRAM_COMMENT_STRUCTURE_DETECTED: comments");
            
            const comment = change.value;
            if (!comment || !comment.from || !comment.id || !comment.text) {
              console.log("EVENT_IGNORED_INCOMPLETE_COMMENT: missing required fields");
              continue;
            }

            console.log("INSTAGRAM_COMMENT_RECEIVED:");
            console.log("  - COMMENT_ID:", comment.id);
            console.log("  - USER_ID:", comment.from.id);
            console.log("  - USERNAME:", comment.from.username || "N/A");
            console.log("  - COMMENT_TEXT:", comment.text);
            console.log("  - POST_ID:", comment.media?.id || "N/A");

            // Detectar palavra-chave (case-insensitive)
            const commentTextLower = comment.text.toLowerCase();
            const keywordDetected = commentTextLower.includes(PALAVRA_CHAVE_INSTAGRAM.toLowerCase());
            
            console.log("INSTAGRAM_KEYWORD_DETECTION:");
            console.log("  - KEYWORD:", PALAVRA_CHAVE_INSTAGRAM);
            console.log("  - DETECTED:", keywordDetected);
            console.log("  - COMMENT_TEXT_LOWER:", commentTextLower);

            if (keywordDetected) {
              console.log("INSTAGRAM_KEYWORD_MATCHED: sending private reply");
              
              await processMessageWithNoemia(comment.from.id, comment.text);

              const replySent = true; // Se chegou aqui, o processamento foi iniciado

              if (replySent) {
                console.log("INSTAGRAM_PRIVATE_REPLY_SUCCESS: Comment triggered DM sent");
                logEvent("INSTAGRAM_PRIVATE_REPLY_SUCCESS", {
                  commentId: comment.id,
                  userId: comment.from.id,
                  username: comment.from.username,
                  postId: comment.media?.id,
                  keyword: PALAVRA_CHAVE_INSTAGRAM,
                  commentText: comment.text
                });
              } else {
                console.log("INSTAGRAM_PRIVATE_REPLY_FAILED: Could not send DM to commenter");
                logEvent("INSTAGRAM_PRIVATE_REPLY_FAILED", {
                  commentId: comment.id,
                  userId: comment.from.id,
                  username: comment.from.username,
                  postId: comment.media?.id,
                  keyword: PALAVRA_CHAVE_INSTAGRAM,
                  commentText: comment.text
                }, "error");
              }
            } else {
              console.log("INSTAGRAM_KEYWORD_NOT_MATCHED: no action taken");
              logEvent("INSTAGRAM_KEYWORD_NOT_MATCHED", {
                commentId: comment.id,
                userId: comment.from.id,
                username: comment.from.username,
                postId: comment.media?.id,
                keyword: PALAVRA_CHAVE_INSTAGRAM,
                commentText: comment.text
              });
            }
          }
          
          // Processar mensagens (código existente)
          if (change.field !== "messages" && change.field !== "comments") {
            console.log("EVENT_IGNORED_UNSUPPORTED_STRUCTURE: changes field not 'messages' or 'comments'", { field: change.field });
            continue;
          }

          console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: changes");
          const messages = change.value?.messages || [];

          for (const message of messages) {
            if (!message.from?.id) {
              console.log("EVENT_IGNORED_MISSING_SENDER: changes message without from.id");
              continue;
            }

            // Verificar se é mensagem de texto
            if (!message.text) {
              console.log("EVENT_IGNORED_NO_MESSAGE: changes message without text");
              // Enviar mensagem de proteção para conteúdo não suportado
              await handleUnsupportedInstagramMessage(message.from.id, message.type || 'unknown');
              continue;
            }

            if (!message.text.trim()) {
              console.log("EVENT_IGNORED_NO_TEXT: changes message with empty text");
              continue;
            }

            console.log("INSTAGRAM_SENDER_EXTRACTED:", message.from.id);
            console.log("INSTAGRAM_TEXT_EXTRACTED:", message.text);

            await processMessageWithNoemia(message.from.id, message.text);
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