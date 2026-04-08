import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { answerNoemia } from "../../../../lib/services/noemia";

// Configurações
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "noeminha_whatsapp_secret_2026";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Função de log estruturado
function logEvent(event: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: data || null
  };
  
  console.log(JSON.stringify(logEntry));
}

// Validar assinatura HMAC-SHA256
function verifySignature(body: string, signature: string): boolean {
  if (!signature) {
    logEvent('SIGNATURE_MISSING', { 
      hasAppSecret: !!APP_SECRET,
      appSecretLength: APP_SECRET?.length || 0
    }, 'error');
    return false;
  }
  
  const expectedSignature = `sha256=${createHmac('sha256', APP_SECRET)
    .update(body, 'utf8')
    .digest('hex')}`;
  
  const isValid = signature === expectedSignature;
  
  logEvent('SIGNATURE_VALIDATION_DEBUG', {
    received: signature?.substring(0, 50) + '...',
    expected: expectedSignature?.substring(0, 50) + '...',
    isValid,
    appSecretSet: !!APP_SECRET,
    appSecretLength: APP_SECRET?.length || 0,
    bodyLength: body.length
  });
  
  return isValid;
}

// Extrair informações da mensagem
function extractMessageInfo(message: any) {
  logEvent('EXTRACT_MESSAGE_START_DEBUG', {
    messageKeys: Object.keys(message),
    messageFull: message
  });

  const info = {
    from: message.from || null,
    messageId: message.id || null,
    timestamp: message.timestamp || null,
    type: message.type || 'unknown',
    content: null as string | null,
    metadata: {}
  };

  logEvent('EXTRACT_MESSAGE_BASIC_DEBUG', {
    from: info.from,
    messageId: info.messageId,
    timestamp: info.timestamp,
    type: info.type
  });

  switch (message.type) {
    case 'text':
      info.content = message.text?.body || null;
      logEvent('EXTRACT_TEXT_DEBUG', {
        textBody: message.text?.body,
        extractedContent: info.content
      });
      break;
    case 'image':
      info.content = message.image?.caption || '[Imagem]';
      info.metadata = {
        mimeType: message.image?.mime_type,
        sha256: message.image?.sha256,
        id: message.image?.id
      };
      logEvent('EXTRACT_IMAGE_DEBUG', {
        caption: message.image?.caption,
        metadata: info.metadata
      });
      break;
    case 'audio':
      info.content = '[Áudio]';
      info.metadata = {
        mimeType: message.audio?.mime_type,
        sha256: message.audio?.sha256,
        id: message.audio?.id
      };
      break;
    case 'document':
      info.content = message.document?.caption || '[Documento]';
      info.metadata = {
        filename: message.document?.filename,
        mimeType: message.document?.mime_type,
        sha256: message.document?.sha256,
        id: message.document?.id
      };
      break;
    case 'location':
      info.content = '[Localização]';
      info.metadata = {
        latitude: message.location?.latitude,
        longitude: message.location?.longitude,
        name: message.location?.name,
        address: message.location?.address
      };
      break;
    case 'contact':
      info.content = '[Contato]';
      info.metadata = {
        contacts: message.contacts
      };
      break;
    default:
      info.content = `[${message.type}]`;
      logEvent('EXTRACT_UNKNOWN_TYPE_DEBUG', {
        type: message.type,
        message: message
      });
  }

  logEvent('EXTRACT_MESSAGE_FINAL_DEBUG', {
    finalInfo: info
  });

  return info;
}

// Enviar resposta via WhatsApp API
async function sendWhatsAppResponse(to: string, message: string) {
  logEvent('WHATSAPP_GRAPH_API_STATUS', {
    to,
    messageLength: message.length,
    hasAccessToken: !!ACCESS_TOKEN,
    hasPhoneNumberId: !!PHONE_NUMBER_ID
  });

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    logEvent('WHATSAPP_CREDENTIALS_MISSING', {
      hasAccessToken: !!ACCESS_TOKEN,
      hasPhoneNumberId: !!PHONE_NUMBER_ID
    }, 'error');
    return false;
  }

  try {
    const sendUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: message
      }
    };

    logEvent('WHATSAPP_GRAPH_API_CALL', {
      url: sendUrl,
      to,
      payloadSize: JSON.stringify(payload).length
    });

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    logEvent('WHATSAPP_GRAPH_API_RESPONSE', {
      httpStatus: response.status,
      httpOk: response.ok,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      logEvent('WHATSAPP_GRAPH_API_ERROR', {
        httpStatus: response.status,
        metaError: data.error?.message,
        errorCode: data.error?.code,
        to
      }, 'error');
      return false;
    }

    logEvent('WHATSAPP_GRAPH_API_SUCCESS', {
      messageId: data.messages?.[0]?.id,
      to,
      httpStatus: response.status
    });

    return true;
  } catch (error) {
    logEvent('WHATSAPP_GRAPH_API_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
      to
    }, 'error');
    return false;
  }
}

// Handler GET para verificação do webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  logEvent('VERIFICATION_ATTEMPT', {
    mode,
    token: token === VERIFY_TOKEN ? 'VALID' : 'INVALID',
    hasChallenge: !!challenge
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logEvent('VERIFICATION_SUCCESS', { challenge });
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  logEvent('VERIFICATION_FAILED', { mode, token });
  return new Response("Forbidden", { status: 403 });
}

// Handler POST para processamento de mensagens
export async function POST(request: NextRequest) {
  logEvent('WHATSAPP_POST_RECEIVED', {
    timestamp: new Date().toISOString()
  });
  
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();
  
  // Validar assinatura em modo sombra (não bloqueia, apenas registra)
  const signatureValid = verifySignature(body, signature || "");
  if (!signatureValid) {
    logEvent('WHATSAPP_SIGNATURE_INVALID', {
      signaturePresent: !!signature,
      bodyLength: body.length
    }, 'warn');
  } else {
    logEvent('WHATSAPP_SIGNATURE_VALID', {
      bodyLength: body.length
    });
  }

  try {
    const data = JSON.parse(body);
    logEvent('WHATSAPP_PAYLOAD_PARSED', {
      object: data.object,
      entryCount: data.entry?.length || 0
    });

    // Processar mensagens
    if (data.object === "whatsapp_business_account") {
      logEvent('WHATSAPP_BUSINESS_ACCOUNT_DETECTED');
      
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const messages = change.value.messages || [];
            logEvent('WHATSAPP_MESSAGES_FOUND', {
              count: messages.length
            });
            
            for (const message of messages) {
              // Ignorar mensagens enviadas pelo próprio número
              if (message.from === PHONE_NUMBER_ID) {
                logEvent('WHATSAPP_OWN_MESSAGE_IGNORED', {
                  from: message.from,
                  phoneId: PHONE_NUMBER_ID
                });
                continue;
              }

              logEvent('WHATSAPP_MESSAGE_TYPE', {
                type: message.type,
                from: message.from
              });

              const messageInfo = extractMessageInfo(message);
              
              logEvent('WHATSAPP_SENDER_EXTRACTED', {
                from: messageInfo.from,
                messageId: messageInfo.messageId
              });

              if (messageInfo.type === 'text' && messageInfo.content) {
                logEvent('WHATSAPP_TEXT_EXTRACTED', {
                  from: messageInfo.from,
                  content: messageInfo.content,
                  length: messageInfo.content?.length || 0
                });
                
                await processTextMessage(messageInfo);
              } else {
                logEvent('WHATSAPP_NON_TEXT_SKIPPED', {
                  type: messageInfo.type,
                  from: messageInfo.from
                });
              }
            }
          }
        }
      }
    } else {
      logEvent('WHATSAPP_INVALID_OBJECT', {
        object: data.object
      }, 'warn');
    }

    console.log("=== WEBHOOK PROCESSED SUCCESSFULLY ===");
    return NextResponse.json({ 
      status: "received", 
      processed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log("=== PROCESSING ERROR ===");
    console.log("ERROR:", error instanceof Error ? error.message : String(error));
    console.log("STACK:", error instanceof Error ? error.stack : null);
    
    logEvent('PROCESSING_ERROR_DEBUG', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      body: body.substring(0, 1000)
    }, 'error');
    
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Processar mensagem de texto usando lógica centralizada da NoemIA
async function processTextMessage(messageInfo: any) {
  try {
    logEvent('WHATSAPP_CALLING_NOEMIA', {
      from: messageInfo.from,
      message: messageInfo.content
    });

    // Usar a lógica centralizada da NoemIA
    const response = await answerNoemia({
      message: messageInfo.content,
      audience: "visitor",
      history: []
    }, null);

    logEvent('WHATSAPP_NOEMIA_RESPONSE', {
      from: messageInfo.from,
      responseLength: response.answer?.length || 0,
      audience: response.audience
    });
    
    const sent = await sendWhatsAppResponse(messageInfo.from, response.answer || "Desculpe, não consegui processar sua mensagem no momento. Tente novamente.");
    
    if (sent) {
      logEvent('WHATSAPP_RESPONSE_SENT', {
        from: messageInfo.from,
        responseLength: response.answer?.length || 0
      });
    } else {
      logEvent('WHATSAPP_RESPONSE_FAILED', {
        from: messageInfo.from,
        responseLength: response.answer?.length || 0
      }, 'error');
    }
  } catch (error) {
    logEvent('WHATSAPP_NOEMIA_ERROR', {
      from: messageInfo.from,
      error: error instanceof Error ? error.message : String(error)
    }, 'error');

    // Fallback para mensagem fixa em caso de erro
    const fallbackResponse = "Oi! Vi que você enviou uma mensagem. Vou te explicar de forma simples o que pode estar acontecendo no seu caso. Muitas pessoas passam por isso sem saber que podem ter um direito não reconhecido. Se você quiser, posso entender melhor sua situação.";
    
    const sent = await sendWhatsAppResponse(messageInfo.from, fallbackResponse);
    
    if (sent) {
      logEvent('WHATSAPP_FALLBACK_SENT', {
        from: messageInfo.from,
        responseLength: fallbackResponse.length
      });
    }
  }
}
