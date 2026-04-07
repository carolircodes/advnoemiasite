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
  if (!signature) return false;
  
  const expectedSignature = `sha256=${createHmac('sha256', APP_SECRET)
    .update(body, 'utf8')
    .digest('hex')}`;
  
  return signature === expectedSignature;
}

// Extrair informações da mensagem
function extractMessageInfo(message: any) {
  const info = {
    from: message.from || null,
    messageId: message.id || null,
    timestamp: message.timestamp || null,
    type: message.type || 'unknown',
    content: null,
    metadata: {}
  };

  switch (message.type) {
    case 'text':
      info.content = message.text?.body || null;
      break;
    case 'image':
      info.content = message.image?.caption || '[Imagem]';
      info.metadata = {
        mimeType: message.image?.mime_type,
        sha256: message.image?.sha256,
        id: message.image?.id
      };
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
  }

  return info;
}

// Enviar resposta via WhatsApp API
async function sendWhatsAppResponse(to: string, message: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    logEvent('SEND_RESPONSE_ERROR', { 
      error: 'WhatsApp API credentials not configured' 
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

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      logEvent('SEND_RESPONSE_ERROR', { 
        error: data,
        to,
        message 
      }, 'error');
      return false;
    }

    logEvent('SEND_RESPONSE_SUCCESS', { 
      messageId: data.messages?.[0]?.id,
      to,
      message 
    });

    return true;
  } catch (error) {
    logEvent('SEND_RESPONSE_EXCEPTION', { 
      error: error instanceof Error ? error.message : String(error),
      to,
      message 
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
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();

  // Validar assinatura
  if (!verifySignature(body, signature || "")) {
    logEvent('SIGNATURE_INVALID', { 
      signature: signature?.substring(0, 20) + '...' 
    }, 'error');
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    const data = JSON.parse(body);
    
    logEvent('WEBHOOK_RECEIVED', { 
      object: data.object,
      entryCount: data.entry?.length || 0 
    });

    // Processar mensagens
    if (data.object === "whatsapp_business_account") {
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const messages = change.value.messages || [];
            
            for (const message of messages) {
              // Ignorar mensagens enviadas pelo próprio número
              if (message.from === PHONE_NUMBER_ID) {
                continue;
              }

              const messageInfo = extractMessageInfo(message);
              
              logEvent('MESSAGE_RECEIVED', {
                ...messageInfo,
                rawMessage: message
              });

              // Processar apenas mensagens de texto por enquanto
              if (messageInfo.type === 'text' && messageInfo.content) {
                await processTextMessage(messageInfo);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      status: "received", 
      processed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logEvent('PROCESSING_ERROR', { 
      error: error instanceof Error ? error.message : String(error) 
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
  logEvent('PROCESSING_TEXT_MESSAGE', {
    from: messageInfo.from,
    content: messageInfo.content
  });

  // Gerar resposta inteligente com NoemIA
  const intelligentResponse = await generateIntelligentResponse(messageInfo.content, messageInfo.from);
  
  const sent = await sendWhatsAppResponse(messageInfo.from, intelligentResponse);
  
  logEvent('MESSAGE_PROCESSED', {
    from: messageInfo.from,
    originalContent: messageInfo.content,
    intelligentResponse: intelligentResponse.substring(0, 100) + '...',
    responseSent: sent,
    usedAI: intelligentResponse.includes('Dra. Noemia') || intelligentResponse.includes('assistente virtual')
  });
}
