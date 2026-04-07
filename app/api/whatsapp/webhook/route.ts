import { NextRequest, NextResponse } from "next/server";

// Função de log simples para debug
function logEvent(event: string, data?: any) {
  console.log(`[${new Date().toISOString()}] WHATSAPP_WEBHOOK ${event}:`, data || '');
}

// Handler GET para verificação do webhook WhatsApp
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  logEvent('VERIFICATION_ATTEMPT', {
    mode,
    token: token === process.env.WHATSAPP_VERIFY_TOKEN ? 'VALID' : 'INVALID',
    tokenMatch: token === process.env.WHATSAPP_VERIFY_TOKEN,
    hasChallenge: !!challenge,
    url: request.url,
    userAgent: request.headers.get('user-agent')
  });

  // Validar usando WHATSAPP_VERIFY_TOKEN
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logEvent('VERIFICATION_SUCCESS', {
      mode,
      token: 'VALID',
      challenge,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'MISSING'
    });
    
    // Retornar o challenge como texto puro com status 200
    // EXATAMENTE como a Meta exige
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
    tokenMatch: token === process.env.WHATSAPP_VERIFY_TOKEN,
    expectedToken: process.env.WHATSAPP_VERIFY_TOKEN,
    hasChallenge: !!challenge,
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

    // Verificar se é webhook do WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      logEvent('INVALID_OBJECT', { object: body.object });
      return NextResponse.json({ error: 'Invalid object' }, { status: 400 });
    }

    // Processar mensagens
    const events = [];
    
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages' && change.value?.messages) {
          for (const message of change.value.messages) {
            // Mensagem do usuário (tem campo 'from')
            if (message.type === 'text' && message.from) {
              logEvent('MESSAGE_EXTRACTED', {
                messageId: message.id,
                from: message.from,
                text: message.text?.body || '',
                contactName: change.value.contacts?.[0]?.name?.formatted_name
              });

              events.push({
                platform: 'whatsapp',
                platformUserId: message.from,
                platformMessageId: message.id,
                senderName: change.value.contacts?.[0]?.name?.formatted_name,
                text: message.text?.body || '',
                timestamp: message.timestamp || Date.now(),
                metadata: {
                  phone_number_id: change.value.metadata?.phone_number_id,
                  display_phone_number: change.value.metadata?.display_phone_number,
                  contact_name: change.value.contacts?.[0]?.name?.formatted_name,
                  wa_id: change.value.contacts?.[0]?.wa_id
                }
              });
            }
          }
        }
      }
    }

    logEvent('EVENTS_PARSED', {
      eventCount: events.length,
      userIds: events.map(e => e.platformUserId),
      messageIds: events.map(e => e.platformMessageId)
    });

    if (!events.length) {
      logEvent('NO_EVENTS_FOUND', { 
        body: JSON.stringify(body).substring(0, 1000)
      });
      return NextResponse.json({ received: true, events: [] });
    }

    // Processar cada evento
    const processedEvents = [];
    
    for (const event of events) {
      try {
        logEvent('PROCESSING_EVENT', {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          textLength: event.text.length,
          textPreview: event.text.substring(0, 100),
          senderName: event.senderName
        });

        // Gerar resposta simples por enquanto
        const responseText = `Olá! Recebi sua mensagem: "${event.text}". Em breve entrarei em contato!`;
        
        logEvent('RESPONSE_GENERATED', {
          platformUserId: event.platformUserId,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 100)
        });

        // TODO: Implementar envio real para WhatsApp API
        logEvent('SEND_ATTEMPT', {
          platformUserId: event.platformUserId,
          responseLength: responseText.length
        });

        const messageSent = true; // Simulado por enquanto
        
        logEvent('SEND_SUCCESS', {
          platformUserId: event.platformUserId,
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
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          error: eventError instanceof Error ? eventError.message : 'unknown',
          errorStack: eventError instanceof Error ? eventError.stack : undefined
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
      events: processedEvents,
      summary: {
        total: events.length,
        processed: successCount,
        sent: sentCount,
        errors: errorCount
      }
    });

  } catch (error) {
    logEvent('FATAL_ERROR', {
      error: error instanceof Error ? error.message : 'unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
      method: 'POST',
      url: request.url
    });

    return NextResponse.json({
      error: 'internal_error',
      received: true
    }, { status: 500 });
  }
}
