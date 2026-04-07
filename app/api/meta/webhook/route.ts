import { NextRequest, NextResponse } from "next/server";

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";

// Função de log
function logEvent(event: string, data?: any) {
  console.log(`[${new Date().toISOString()}] META_WEBHOOK ${event}:`, data || '');
}

// Handler GET para verificação do webhook
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  logEvent('VERIFICATION_ATTEMPT', {
    mode,
    token: token === VERIFY_TOKEN ? 'VALID' : 'INVALID',
    tokenMatch: token === VERIFY_TOKEN,
    hasChallenge: !!challenge,
    verifyToken: VERIFY_TOKEN ? 'SET' : 'MISSING'
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logEvent('VERIFICATION_SUCCESS', {
      mode,
      token: 'VALID',
      challenge
    });
    
    // Retornar SOMENTE hub.challenge como texto puro
    return new Response(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      }
    });
  }

  logEvent('VERIFICATION_FAILED', {
    mode,
    token,
    tokenMatch: token === VERIFY_TOKEN,
    expectedToken: VERIFY_TOKEN,
    reason: mode !== 'subscribe' ? 'Invalid mode' : 'Invalid token'
  });

  return new Response("Forbidden", { 
    status: 403,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8'
    }
  });
}

// Handler POST para processamento de mensagens
export async function POST(request: NextRequest) {
  try {
    logEvent('POST_RECEIVED', {
      method: 'POST',
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent')
    });

    const body = await request.json();
    
    logEvent('BODY_PARSED', {
      object: body.object,
      entryCount: body.entry?.length || 0,
      hasBody: !!body,
      bodyPreview: JSON.stringify(body).substring(0, 500)
    });

    // Detectar plataforma
    let platform = 'unknown';
    if (body.object === 'instagram') {
      platform = 'instagram';
    } else if (body.object === 'whatsapp_business_account') {
      platform = 'whatsapp';
    }

    logEvent('PLATFORM_DETECTED', { platform, object: body.object });

    // Processar eventos
    const events = [];
    
    if (platform === 'instagram' && body.entry) {
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            if (messaging.message?.text) {
              events.push({
                type: 'message',
                platform: 'instagram',
                sender: messaging.sender.id,
                senderName: messaging.sender.name || null,
                text: messaging.message.text,
                messageId: messaging.message.mid,
                timestamp: messaging.timestamp
              });
            }
          }
        }
      }
    } else if (platform === 'whatsapp' && body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                if (message.type === 'text' && message.from) {
                  events.push({
                    type: 'message',
                    platform: 'whatsapp',
                    sender: message.from,
                    senderName: change.value.contacts?.[0]?.name?.formatted_name || null,
                    text: message.text?.body || '',
                    messageId: message.id,
                    timestamp: message.timestamp || Date.now()
                  });
                }
              }
            }
          }
        }
      }
    }

    logEvent('EVENTS_PARSED', {
      eventCount: events.length,
      platforms: [...new Set(events.map(e => e.platform))],
      senders: events.map(e => e.sender)
    });

    if (!events.length) {
      logEvent('NO_EVENTS_FOUND', { 
        object: body.object,
        body: JSON.stringify(body).substring(0, 1000)
      });
      return NextResponse.json({ received: true, events: [] });
    }

    // Processar cada evento
    const processedEvents = [];
    
    for (const event of events) {
      try {
        logEvent('PROCESSING_EVENT', {
          platform: event.platform,
          sender: event.sender,
          messageId: event.messageId,
          textLength: event.text.length,
          textPreview: event.text.substring(0, 100)
        });

        // Gerar resposta simples
        const responseText = `Olá! Recebi sua mensagem: "${event.text}". Em breve entrarei em contato!`;
        
        logEvent('RESPONSE_GENERATED', {
          platform: event.platform,
          sender: event.sender,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 100)
        });

        // TODO: Implementar envio real
        logEvent('SEND_ATTEMPT', {
          platform: event.platform,
          sender: event.sender,
          responseLength: responseText.length
        });

        const messageSent = true; // Simulado
        
        logEvent('SEND_SUCCESS', {
          platform: event.platform,
          sender: event.sender,
          messageSent
        });

        processedEvents.push({
          ...event,
          messageSent,
          processed: true,
          responseLength: responseText.length
        });

      } catch (eventError) {
        logEvent('EVENT_PROCESSING_ERROR', {
          platform: event.platform,
          sender: event.sender,
          messageId: event.messageId,
          error: eventError instanceof Error ? eventError.message : 'unknown'
        });

        processedEvents.push({
          ...event,
          error: true,
          processed: false
        });
      }
    }

    const successCount = processedEvents.filter(r => r.processed).length;
    const errorCount = processedEvents.filter(r => (r as any).error).length;
    const sentCount = processedEvents.filter(r => (r as any).messageSent).length;

    logEvent('PROCESSING_COMPLETE', {
      totalEvents: events.length,
      successCount,
      errorCount,
      sentCount
    });

    return NextResponse.json({
      received: true,
      processed: processedEvents.length,
      successCount,
      errorCount,
      sentCount,
      events: processedEvents
    });

  } catch (error) {
    logEvent('FATAL_ERROR', {
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined,
      method: 'POST',
      url: request.url
    });

    return NextResponse.json({
      error: 'internal_error',
      received: true
    }, { status: 500 });
  }
}
