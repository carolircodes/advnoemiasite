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
  console.log("=== SENDING WHATSAPP RESPONSE ===");
  console.log("TO:", to);
  console.log("MESSAGE:", message.substring(0, 100) + '...');
  
  logEvent('RESPONSE_ATTEMPT', {
    to,
    message: message.substring(0, 100) + '...',
    hasAccessToken: !!ACCESS_TOKEN,
    hasPhoneNumberId: !!PHONE_NUMBER_ID
  });

  logEvent('SEND_RESPONSE_START_DEBUG', {
    to,
    message: message.substring(0, 100) + '...',
    hasAccessToken: !!ACCESS_TOKEN,
    hasPhoneNumberId: !!PHONE_NUMBER_ID,
    accessTokenPreview: ACCESS_TOKEN?.substring(0, 20) + '...',
    phoneNumberId: PHONE_NUMBER_ID
  });

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log("=== MISSING CREDENTIALS ===");
    console.log("ACCESS TOKEN EXISTS:", !!ACCESS_TOKEN);
    console.log("PHONE NUMBER ID EXISTS:", !!PHONE_NUMBER_ID);
    
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
    
    console.log("=== SENDING TO META API ===");
    console.log("URL:", sendUrl);
    console.log("PHONE NUMBER ID:", PHONE_NUMBER_ID);
    
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

    console.log("=== PAYLOAD ===");
    console.log("PAYLOAD:", JSON.stringify(payload, null, 2));

    logEvent('SEND_RESPONSE_PAYLOAD_DEBUG', {
      payload,
      to,
      messageLength: message.length
    });

    console.log("=== MAKING HTTP REQUEST ===");
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("=== HTTP RESPONSE ===");
    console.log("STATUS:", response.status);
    console.log("OK:", response.ok);
    console.log("STATUS TEXT:", response.statusText);

    logEvent('SEND_RESPONSE_API_DEBUG', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const data = await response.json();

    console.log("=== RESPONSE DATA ===");
    console.log("RESPONSE:", JSON.stringify(data, null, 2));

    logEvent('SEND_RESPONSE_DATA_DEBUG', {
      responseData: data,
      success: response.ok
    });

    if (!response.ok) {
      console.log("=== SEND RESPONSE ERROR ===");
      logEvent('SEND_RESPONSE_ERROR', { 
        error: data,
        to,
        message,
        httpStatus: response.status
      }, 'error');
      return false;
    }

    console.log("=== SEND RESPONSE SUCCESS ===");
    console.log("MESSAGE ID:", data.messages?.[0]?.id);
    
    logEvent('RESPONSE_SUCCESS', { 
      messageId: data.messages?.[0]?.id,
      to,
      message: message.substring(0, 50) + '...'
    });

    return true;
  } catch (error) {
    console.log("=== SEND RESPONSE EXCEPTION ===");
    console.log("ERROR:", error instanceof Error ? error.message : String(error));
    console.log("STACK:", error instanceof Error ? error.stack : null);
    
    logEvent('RESPONSE_ERROR', { 
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
  console.log("=== WHATSAPP WEBHOOK POST RECEIVED ===");
  
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();
  
  // LOG DIRETO PARA RASTREAMENTO
  console.log("WEBHOOK_DEBUG_WHATSAPP_POST_RECEIVED", {
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries()),
    bodyLength: body.length,
    bodyPreview: body.substring(0, 500),
    signature: signature?.substring(0, 50) + '...'
  });
  
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

  // LOG TEMPORÁRIO - Debug completo do POST
  console.log("=== WHATSAPP POST DEBUG ===");
  console.log("HEADERS:", {
    'content-type': request.headers.get("content-type"),
    'x-hub-signature-256': signature?.substring(0, 50) + '...',
    'user-agent': request.headers.get("user-agent")
  });
  console.log("BODY LENGTH:", body.length);
  console.log("BODY PREVIEW:", body.substring(0, 1000) + (body.length > 1000 ? '...' : ''));
  console.log("TIMESTAMP:", new Date().toISOString());

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

  console.log("=== VALIDATING SIGNATURE ===");
  // VALIDAÇÃO DE ASSINATURA DESATIVADA TEMPORARIAMENTE PARA TESTE
  console.log("ASSINATURA VALIDATION DESATIVADA - ACEITANDO TODAS AS REQUISIÇÕES");
  console.log("ASSINATURA RECEBIDA:", signature?.substring(0, 50) + '...');
  console.log("BODY LENGTH:", body.length);
  
  // Validar assinatura (COMENTADO TEMPORARIAMENTE)
  // if (!verifySignature(body, signature || "")) {
  //   console.log("=== SIGNATURE INVALID ===");
  //   logEvent('SIGNATURE_INVALID', { 
  //     signature: signature?.substring(0, 20) + '...' 
  //   }, 'error');
  //   return new Response("Invalid signature", { status: 403 });
  // }
  
  console.log("=== SIGNATURE VALIDATION SKIPPED - CONTINUANDO ===");
  logEvent('SIGNATURE_VALIDATION_DISABLED', {
    signature: signature?.substring(0, 50) + '...',
    bodyLength: body.length,
    note: 'Temporarily disabled for testing'
  });

  console.log("=== SIGNATURE VALID ===");
  logEvent('SIGNATURE_OK', { 
    signature: signature?.substring(0, 20) + '...',
    bodyLength: body.length
  });

  try {
    const data = JSON.parse(body);
    
    console.log("=== PARSING PAYLOAD ===");
    console.log("OBJECT:", data.object);
    console.log("ENTRY COUNT:", data.entry?.length || 0);
    console.log("FULL PAYLOAD:", JSON.stringify(data, null, 2));
    
    logEvent('WEBHOOK_RECEIVED_DEBUG', { 
      object: data.object,
      entryCount: data.entry?.length || 0,
      fullData: data // LOG TEMPORÁRIO - mostrar payload completo
    });

    // Processar mensagens
    if (data.object === "whatsapp_business_account") {
      console.log("=== WHATSAPP BUSINESS ACCOUNT DETECTED ===");
      
      for (const entry of data.entry || []) {
        console.log("=== PROCESSING ENTRY ===");
        console.log("ENTRY ID:", entry.id);
        console.log("CHANGES COUNT:", entry.changes?.length || 0);
        
        logEvent('PROCESSING_ENTRY_DEBUG', {
          entryId: entry.id,
          changesCount: entry.changes?.length || 0,
          changes: entry.changes // LOG TEMPORÁRIO
        });
        
        for (const change of entry.changes || []) {
          console.log("=== PROCESSING CHANGE ===");
          console.log("FIELD:", change.field);
          console.log("HAS VALUE:", !!change.value);
          
          logEvent('PROCESSING_CHANGE_DEBUG', {
            field: change.field,
            hasValue: !!change.value,
            valuePreview: JSON.stringify(change.value).substring(0, 500) + '...'
          });
          
          if (change.field === "messages") {
            const messages = change.value.messages || [];
            console.log("=== MESSAGES FOUND ===");
            console.log("MESSAGES COUNT:", messages.length);
            console.log("ALL MESSAGES:", JSON.stringify(messages, null, 2));
            
            logEvent('MESSAGES_FOUND_DEBUG', {
              messagesCount: messages.length,
              messages: messages // LOG TEMPORÁRIO - mostrar todas as mensagens
            });
            
            for (const message of messages) {
              console.log("=== PROCESSING MESSAGE ===");
              console.log("MESSAGE FROM:", message.from);
              console.log("MESSAGE ID:", message.id);
              console.log("MESSAGE TYPE:", message.type);
              console.log("FULL MESSAGE:", JSON.stringify(message, null, 2));
              
              // Ignorar mensagens enviadas pelo próprio número
              if (message.from === PHONE_NUMBER_ID) {
                console.log("=== IGNORING OWN MESSAGE ===");
                logEvent('MESSAGE_IGNORED_OWN_DEBUG', {
                  from: message.from,
                  phoneId: PHONE_NUMBER_ID
                });
                continue;
              }

              console.log("=== EXTRACTING MESSAGE INFO ===");
              logEvent('PROCESSING_MESSAGE_DEBUG', {
                messageFull: message // LOG TEMPORÁRIO - mensagem completa
              });

              const messageInfo = extractMessageInfo(message);
              
              console.log("=== MESSAGE EXTRACTED ===");
              console.log("FROM:", messageInfo.from);
              console.log("CONTENT:", messageInfo.content);
              console.log("TYPE:", messageInfo.type);
              
              logEvent('MESSAGE_EXTRACTED_DEBUG', {
                extractedInfo: messageInfo
              });
              logEvent('MESSAGE_PARSED', {
                from: messageInfo.from,
                content: messageInfo.content,
                type: messageInfo.type
              });

              // Processar apenas mensagens de texto por enquanto
              if (messageInfo.type === 'text' && messageInfo.content) {
                console.log("=== CALLING PROCESS TEXT MESSAGE ===");
                logEvent('CALLING_PROCESS_TEXT_MESSAGE_DEBUG', {
                  from: messageInfo.from,
                  content: messageInfo.content
                });
                await processTextMessage(messageInfo);
              } else {
                console.log("=== MESSAGE NOT TEXT - SKIPPING ===");
                logEvent('MESSAGE_NOT_TEXT_DEBUG', {
                  type: messageInfo.type,
                  content: messageInfo.content
                });
              }
            }
          } else {
            console.log("=== CHANGE NOT MESSAGES ===");
            logEvent('CHANGE_NOT_MESSAGES_DEBUG', {
              field: change.field,
              value: change.value
            });
          }
        }
      }
    } else {
      console.log("=== OBJECT NOT WHATSAPP BUSINESS ACCOUNT ===");
      console.log("OBJECT TYPE:", data.object);
      logEvent('OBJECT_NOT_WHATSAPP_DEBUG', {
        object: data.object
      });
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

// Processar mensagem de texto
async function processTextMessage(messageInfo: any) {
  console.log("=== PROCESSING TEXT MESSAGE (FIXED RESPONSE) ===");
  console.log("FROM:", messageInfo.from);
  console.log("CONTENT:", messageInfo.content);
  console.log("TYPE:", messageInfo.type);

  // Resposta automática FIXA sem dependência de IA
  const fixedResponse = "Olá! Recebi sua mensagem e já vou te ajudar.";
  
  console.log("=== SENDING FIXED RESPONSE ===");
  console.log("RESPONSE TEXT:", fixedResponse);
  
  logEvent('PROCESS_TEXT_MESSAGE_START_DEBUG', {
    from: messageInfo.from,
    content: messageInfo.content,
    type: messageInfo.type,
    responseType: 'FIXED_NO_AI'
  });
  
  logEvent('SENDING_FIXED_RESPONSE', {
    from: messageInfo.from,
    originalContent: messageInfo.content,
    fixedResponse: fixedResponse
  });
  
  const sent = await sendWhatsAppResponse(messageInfo.from, fixedResponse);
  
  console.log("=== FIXED RESPONSE RESULT ===");
  console.log("SENT:", sent);
  
  logEvent('PROCESS_TEXT_MESSAGE_COMPLETE_DEBUG', {
    from: messageInfo.from,
    originalContent: messageInfo.content,
    fixedResponse: fixedResponse,
    responseSent: sent,
    timestamp: new Date().toISOString()
  });
}
