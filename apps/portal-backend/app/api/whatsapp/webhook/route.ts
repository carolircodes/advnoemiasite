import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

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
  logEvent('SEND_RESPONSE_START_DEBUG', {
    to,
    message: message.substring(0, 100) + '...',
    hasAccessToken: !!ACCESS_TOKEN,
    hasPhoneNumberId: !!PHONE_NUMBER_ID,
    accessTokenPreview: ACCESS_TOKEN?.substring(0, 20) + '...',
    phoneNumberId: PHONE_NUMBER_ID
  });

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    logEvent('SEND_RESPONSE_CREDS_ERROR', { 
      error: 'WhatsApp API credentials not configured',
      hasAccessToken: !!ACCESS_TOKEN,
      hasPhoneNumberId: !!PHONE_NUMBER_ID,
      allEnvs: {
        WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
        WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
        WHATSAPP_APP_SECRET: !!process.env.WHATSAPP_APP_SECRET,
        NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL
      }
    }, 'error');
    return false;
  }

  try {
    const sendUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    
    logEvent('SEND_RESPONSE_URL_DEBUG', {
      url: sendUrl,
      phoneNumberId: PHONE_NUMBER_ID
    });
    
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: message
      }
    };

    logEvent('SEND_RESPONSE_PAYLOAD_DEBUG', {
      payload,
      to,
      messageLength: message.length
    });

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    logEvent('SEND_RESPONSE_API_DEBUG', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const data = await response.json();

    logEvent('SEND_RESPONSE_DATA_DEBUG', {
      responseData: data,
      success: response.ok
    });

    if (!response.ok) {
      logEvent('SEND_RESPONSE_ERROR', { 
        error: data,
        to,
        message,
        httpStatus: response.status
      }, 'error');
      return false;
    }

    logEvent('SEND_RESPONSE_SUCCESS', { 
      messageId: data.messages?.[0]?.id,
      to,
      message: message.substring(0, 50) + '...'
    });

    return true;
  } catch (error) {
    logEvent('SEND_RESPONSE_EXCEPTION', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      to,
      message: message.substring(0, 50) + '...'
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
  // Log de ambiente para debug
  logEvent('ENVIRONMENT_DEBUG', {
    WHATSAPP_VERIFY_TOKEN: !!VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: !!APP_SECRET,
    WHATSAPP_ACCESS_TOKEN: !!ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: !!PHONE_NUMBER_ID,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    ALL_ENVS: {
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'MISSING',
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ? 'SET' : 'MISSING',
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'MISSING',
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'SET' : 'MISSING',
      META_APP_SECRET: process.env.META_APP_SECRET ? 'SET' : 'MISSING',
      META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ? 'SET' : 'MISSING'
    }
  });

  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();

  // LOG TEMPORÁRIO - Debug completo do POST
  logEvent('POST_RECEIVED_DEBUG', {
    headers: {
      'content-type': request.headers.get("content-type"),
      'x-hub-signature-256': signature?.substring(0, 50) + '...',
      'user-agent': request.headers.get("user-agent")
    },
    bodyLength: body.length,
    bodyPreview: body.substring(0, 500) + (body.length > 500 ? '...' : ''),
    timestamp: new Date().toISOString()
  });

  // Validar assinatura
  if (!verifySignature(body, signature || "")) {
    logEvent('SIGNATURE_INVALID', { 
      signature: signature?.substring(0, 20) + '...' 
    }, 'error');
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    const data = JSON.parse(body);
    
    logEvent('WEBHOOK_RECEIVED_DEBUG', { 
      object: data.object,
      entryCount: data.entry?.length || 0,
      fullData: data // LOG TEMPORÁRIO - mostrar payload completo
    });

    // Processar mensagens
    if (data.object === "whatsapp_business_account") {
      for (const entry of data.entry || []) {
        logEvent('PROCESSING_ENTRY_DEBUG', {
          entryId: entry.id,
          changesCount: entry.changes?.length || 0,
          changes: entry.changes // LOG TEMPORÁRIO
        });
        
        for (const change of entry.changes || []) {
          logEvent('PROCESSING_CHANGE_DEBUG', {
            field: change.field,
            hasValue: !!change.value,
            valuePreview: JSON.stringify(change.value).substring(0, 500) + '...'
          });
          
          if (change.field === "messages") {
            const messages = change.value.messages || [];
            logEvent('MESSAGES_FOUND_DEBUG', {
              messagesCount: messages.length,
              messages: messages // LOG TEMPORÁRIO - mostrar todas as mensagens
            });
            
            for (const message of messages) {
              // Ignorar mensagens enviadas pelo próprio número
              if (message.from === PHONE_NUMBER_ID) {
                logEvent('MESSAGE_IGNORED_OWN_DEBUG', {
                  from: message.from,
                  phoneId: PHONE_NUMBER_ID
                });
                continue;
              }

              logEvent('PROCESSING_MESSAGE_DEBUG', {
                messageFull: message // LOG TEMPORÁRIO - mensagem completa
              });

              const messageInfo = extractMessageInfo(message);
              
              logEvent('MESSAGE_EXTRACTED_DEBUG', {
                extractedInfo: messageInfo
              });

              // Processar apenas mensagens de texto por enquanto
              if (messageInfo.type === 'text' && messageInfo.content) {
                logEvent('CALLING_PROCESS_TEXT_MESSAGE_DEBUG', {
                  from: messageInfo.from,
                  content: messageInfo.content
                });
                await processTextMessage(messageInfo);
              } else {
                logEvent('MESSAGE_NOT_TEXT_DEBUG', {
                  type: messageInfo.type,
                  content: messageInfo.content
                });
              }
            }
          } else {
            logEvent('CHANGE_NOT_MESSAGES_DEBUG', {
              field: change.field,
              value: change.value
            });
          }
        }
      }
    } else {
      logEvent('OBJECT_NOT_WHATSAPP_DEBUG', {
        object: data.object
      });
    }

    return NextResponse.json({ 
      status: "received", 
      processed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
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

// Gerar resposta inteligente com NoemIA
async function generateIntelligentResponse(userMessage: string, phoneNumber: string): Promise<string> {
  try {
    // Tentar resposta com NoemIA primeiro
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/noemia/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Webhook/1.0'
      },
      body: JSON.stringify({
        message: userMessage,
        context: {
          platform: 'whatsapp',
          phoneNumber: phoneNumber,
          source: 'webhook'
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiResponse = data.response || data.message;
      
      if (aiResponse) {
        logEvent('NOEMIA_RESPONSE_SUCCESS', {
          phoneNumber,
          originalMessage: userMessage,
          aiResponse: aiResponse.substring(0, 100) + '...'
        });
        return aiResponse;
      }
    }
  } catch (error) {
    logEvent('NOEMIA_RESPONSE_ERROR', {
      phoneNumber,
      error: error instanceof Error ? error.message : String(error)
    }, 'warn');
  }
  
  // Fallback inteligente baseado em contexto
  const message = userMessage.toLowerCase().trim();
  
  // Detecção de intenções jurídicas
  if (message.includes('aposentar') || message.includes('inss') || message.includes('benefício')) {
    return `Entendo sua dúvida sobre aposentadoria/benefícios! 📋\n\nA Dra. Noemia Rosa é especialista em Direito Previdenciário e pode ajudar você a:\n\n✅ Analisar seu direito à aposentadoria\n✅ Revisar benefícios negados\n✅ Auxiliar em pedidos administrativos\n\n📞 Agende sua consulta: (85) 99999-9999\n🌐 Saiba mais: advnoemia.com.br/previdenciario`;
  }
  
  if (message.includes('banco') || message.includes('empreéstimo') || message.includes('cobrança')) {
    return `Problemas com banco? 🏦\n\nA Dra. Noemia Rosa atua em Direito Bancário para te ajudar com:\n\n✅ Negociação de dívidas\n✅ Revisão de contratos\n✅ Combate a cobranças abusivas\n✅ Cancelamento de serviços\n\n📞 Fale conosco: (85) 99999-9999\n🌐 Saiba mais: advnoemia.com.br/bancario`;
  }
  
  if (message.includes('divórcio') || message.includes('pensão') || message.includes('guarda')) {
    return `Questões de família? 👨‍👩‍👧‍👦\n\nA Dra. Noemia Rosa oferece acompanhamento em Direito de Família:\n\n✅ Divórcio consensual e litigioso\n✅ Guarda de menores\n✅ Pensão alimentícia\n✅ Partilha de bens\n\n📞 Agende sua consulta: (85) 99999-9999\n🌐 Saiba mais: advnoemia.com.br/familia`;
  }
  
  // Resposta padrão com CTAs
  return `Olá! Sou o assistente virtual da Advnoemia 🤖\n\nComo posso ajudar você hoje?\n\n🔹 Aposentadorias e benefícios\n🔹 Direito bancário\n🔹 Direito de família\n\n📞 Para consulta: (85) 99999-9999\n🌐 Site: advnoemia.com.br`;
}

// Processar mensagem de texto
async function processTextMessage(messageInfo: any) {
  logEvent('PROCESS_TEXT_MESSAGE_START_DEBUG', {
    from: messageInfo.from,
    content: messageInfo.content,
    type: messageInfo.type
  });

  // Resposta automática simples para teste
  const simpleResponse = "Olá! Recebi sua mensagem e já vou te ajudar. 🤖\n\nEste é um teste automático do sistema.";
  
  logEvent('PROCESS_TEXT_MESSAGE_RESPONSE_DEBUG', {
    from: messageInfo.from,
    originalContent: messageInfo.content,
    simpleResponse: simpleResponse
  });
  
  const sent = await sendWhatsAppResponse(messageInfo.from, simpleResponse);
  
  logEvent('PROCESS_TEXT_MESSAGE_COMPLETE_DEBUG', {
    from: messageInfo.from,
    originalContent: messageInfo.content,
    simpleResponse: simpleResponse,
    responseSent: sent,
    timestamp: new Date().toISOString()
  });
}
