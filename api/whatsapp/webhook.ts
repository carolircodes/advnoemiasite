import { NextRequest, NextResponse } from "next/server";
import { 
  processPlatformMessage, 
  sendPlatformResponse, 
  validateSignature, 
  logPlatformEvent,
  Platform,
  platformConfigs 
} from "@/lib/platforms/message-processor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/guards";

// Função de fallback crítico (quando tudo falha)
function getCriticalFallbackResponse(): string {
  const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://advnoemia.com.br';
  const WHATSAPP_URL = process.env.NOEMIA_WHATSAPP_URL || 'https://wa.me/5511999999999';
  
  return `Olá! Sou a NoemIA, assistente da Advogada Noemia.

Recebi sua mensagem e já estou encaminhando para análise. Para atendimento imediato, fale diretamente com a advogada:

📱 WhatsApp: ${WHATSAPP_URL}
🌐 Site: ${PUBLIC_SITE_URL}

Em breve entraremos em contato!`;
}

// Função para fazer parse de mensagens do WhatsApp
function parseWhatsAppMessage(body: any): Array<{
  platform: Platform;
  platformUserId: string;
  platformMessageId: string;
  senderName?: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, any>;
}> {
  const events = [];

  logPlatformEvent('WEBHOOK_BODY_PARSED', 'whatsapp', {
    object: body.object,
    entryCount: body.entry?.length || 0,
    hasBody: !!body,
    bodyPreview: JSON.stringify(body).substring(0, 500)
  });

  try {
    // WhatsApp Cloud API structure
    if (body.object === 'whatsapp_business_account' && body.entry) {
      logPlatformEvent('PLATFORM_DETECTED', 'whatsapp', { platform: 'whatsapp' });
      
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                // Mensagem do usuário (tem campo 'from')
                if (message.type === 'text' && message.from) {
                  logPlatformEvent('MESSAGE_EXTRACTED', 'whatsapp', {
                    messageId: message.id,
                    from: message.from,
                    text: message.text?.body || '',
                    contactName: change.value.contacts?.[0]?.name?.formatted_name
                  });

                  events.push({
                    platform: 'whatsapp' as Platform,
                    platformUserId: message.from,
                    platformMessageId: message.id,
                    senderName: change.value.contacts?.[0]?.name?.formatted_name || message.contact?.name?.formatted_name,
                    text: message.text?.body || '',
                    timestamp: message.timestamp || Date.now(),
                    metadata: {
                      phone_number_id: change.value.metadata?.phone_number_id,
                      display_phone_number: change.value.metadata?.display_phone_number,
                      contact_name: change.value.contacts?.[0]?.name?.formatted_name,
                      wa_id: change.value.contacts?.[0]?.wa_id,
                      platform: 'whatsapp'
                    }
                  });
                } else {
                  logPlatformEvent('MESSAGE_SKIPPED', 'whatsapp', {
                    messageId: message.id,
                    type: message.type,
                    hasFrom: !!message.from,
                    hasText: !!message.text?.body,
                    reason: message.type !== 'text' ? 'Not text message' : 'No from field'
                  });
                }
              }
            } else {
              logPlatformEvent('CHANGE_SKIPPED', 'whatsapp', {
                field: change.field,
                hasMessages: !!change.value?.messages,
                changeType: typeof change
              });
            }
          }
        } else {
          logPlatformEvent('ENTRY_SKIPPED', 'whatsapp', {
            entryId: entry.id,
            hasChanges: !!entry.changes,
            entryKeys: Object.keys(entry)
          });
        }
      }
    } else {
      logPlatformEvent('UNKNOWN_PLATFORM', 'whatsapp', {
        object: body.object,
        hasEntry: !!body.entry,
        expectedObject: 'whatsapp_business_account'
      });
    }
  } catch (error) {
    logPlatformEvent('PARSE_ERROR', 'whatsapp', {
      error: error instanceof Error ? error.message : 'unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
      body: JSON.stringify(body).substring(0, 1000)
    });
  }

  logPlatformEvent('MESSAGE_PARSED', 'whatsapp', {
    eventCount: events.length,
    userIds: events.map(e => e.platformUserId),
    messageIds: events.map(e => e.platformMessageId)
  });

  return events;
}

// Função para buscar ou atualizar lead existente
async function findOrCreateLead(
  platform: Platform,
  platformUserId: string,
  username: string | null,
  supabase: any
): Promise<{ existing: boolean; leadId: string }> {
  try {
    // Buscar lead existente por platform + platform_user_id
    const { data: existingLead } = await supabase
      .from("noemia_leads")
      .select("id, conversation_count")
      .eq("platform", platform)
      .eq("platform_user_id", platformUserId)
      .maybeSingle();

    if (existingLead) {
      // Atualizar lead existente
      await supabase
        .from("noemia_leads")
        .update({
          username,
          conversation_count: existingLead.conversation_count + 1,
          last_contact_at: new Date().toISOString()
        })
        .eq("id", existingLead.id);

      return { existing: true, leadId: existingLead.id };
    } else {
      // Criar novo lead
      const { data: newLead } = await supabase
        .from("noemia_leads")
        .insert({
          platform,
          platform_user_id: platformUserId,
          username,
          legal_area: 'geral',
          lead_status: 'curioso',
          funnel_stage: 'contato_inicial',
          urgency: 'baixa',
          last_message: '',
          last_response: '',
          wants_human: false,
          should_schedule: false,
          summary: 'Novo lead via WhatsApp',
          suggested_action: 'Aguardar primeira interação para qualificar',
          first_contact_at: new Date().toISOString(),
          last_contact_at: new Date().toISOString(),
          conversation_count: 1
        })
        .select("id")
        .single();

      return { existing: false, leadId: newLead.id };
    }
  } catch (error) {
    console.error('Error in findOrCreateLead:', error);
    throw error;
  }
}

// Handler principal do webhook
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  logPlatformEvent('WEBHOOK_VERIFICATION_ATTEMPT', 'whatsapp', {
    mode,
    token: token === process.env.WHATSAPP_VERIFY_TOKEN ? 'VALID' : 'INVALID',
    tokenMatch: token === process.env.WHATSAPP_VERIFY_TOKEN,
    hasChallenge: !!challenge,
    url: request.url,
    userAgent: request.headers.get('user-agent')
  });

  // Validar usando WHATSAPP_VERIFY_TOKEN
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logPlatformEvent('WEBHOOK_VERIFICATION_SUCCESS', 'whatsapp', {
      mode,
      token: 'VALID',
      challenge,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'MISSING'
    });
    
    // Retornar o challenge como texto puro com status 200
    return new Response(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  logPlatformEvent('WEBHOOK_VERIFICATION_FAILED', 'whatsapp', {
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
      'Content-Type': 'text/plain'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    logPlatformEvent('WEBHOOK_RECEIVED', 'whatsapp', {
      method: 'POST',
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent')
    });

    // Validar assinatura
    if (!validateSignature(request, 'whatsapp')) {
      logPlatformEvent('INVALID_SIGNATURE', 'whatsapp', {
        headers: request.headers,
        bodyPreview: JSON.stringify(request.body).substring(0, 200)
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = await request.json();
    
    logPlatformEvent('WEBHOOK_BODY_PARSED', 'whatsapp', {
      object: body.object,
      entryCount: body.entry?.length || 0,
      hasBody: !!body,
      bodyPreview: JSON.stringify(body).substring(0, 500)
    });

    const events = parseWhatsAppMessage(body);

    if (!events.length) {
      logPlatformEvent('NO_EVENTS_FOUND', 'whatsapp', { 
        body: JSON.stringify(body).substring(0, 1000),
        object: body.object,
        hasEntry: !!body.entry
      });
      return NextResponse.json({ received: true, events: [] });
    }

    logPlatformEvent('EVENTS_PARSED', 'whatsapp', {
      eventCount: events.length,
      userIds: events.map(e => e.platformUserId),
      messageIds: events.map(e => e.platformMessageId),
      platforms: events.map(e => e.platform)
    });

    const supabase = await createServerSupabaseClient();
    const processedEvents = [];

    for (const event of events) {
      try {
        logPlatformEvent('PROCESSING_EVENT', 'whatsapp', {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          textLength: event.text.length,
          textPreview: event.text.substring(0, 100),
          senderName: event.senderName
        });

        // Processar mensagem
        const result = await processPlatformMessage(event);

        logPlatformEvent('PROCESSING_RESULT', 'whatsapp', {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          hasError: !!result.error,
          hasResponse: !!result.response,
          usedFallback: result.usedFallback,
          fallbackReason: result.fallbackReason,
          legalArea: result.lead?.legal_area,
          leadStatus: result.lead?.lead_status
        });

        if (result.error && !result.response) {
          logPlatformEvent('PROCESSING_ERROR', 'whatsapp', {
            platformUserId: event.platformUserId,
            platformMessageId: event.platformMessageId,
            error: result.error
          });
          
          // Mesmo com erro, tentar enviar fallback crítico
          const criticalResponse = getCriticalFallbackResponse();
          const sendResult = await sendPlatformResponse(
            'whatsapp',
            event.platformUserId,
            criticalResponse
          );
          
          processedEvents.push({
            ...event,
            error: true,
            processed: false,
            messageSent: sendResult.success,
            usedFallback: true,
            fallbackReason: 'CRITICAL_ERROR'
          });
          continue;
        }

        // Buscar ou criar lead
        const { existing, leadId } = await findOrCreateLead(
          event.platform,
          event.platformUserId,
          event.senderName || null,
          supabase
        );

        // Atualizar lead com dados processados
        if (result.lead) {
          const leadUpdate = {
            ...result.lead,
            conversation_count: existing ? result.lead.conversation_count : 1
          };

          await supabase
            .from("noemia_leads")
            .update(leadUpdate)
            .eq("id", leadId);
        }

        // Salvar conversa
        if (result.conversation) {
          await supabase
            .from("noemia_conversations")
            .insert({
              ...result.conversation,
              created_at: new Date().toISOString()
            });
        }

        // Enviar resposta automática com fallback robusto
        let messageSent = false;
        let sendError = '';
        
        if (result.response) {
          logPlatformEvent('WHATSAPP_SEND_ATTEMPT', 'whatsapp', {
            platformUserId: event.platformUserId,
            platformMessageId: event.platformMessageId,
            responseLength: result.response.length,
            responsePreview: result.response.substring(0, 100),
            usedFallback: result.usedFallback
          });

          const sendResult = await sendPlatformResponse(
            event.platform,
            event.platformUserId,
            result.response
          );
          
          messageSent = sendResult.success;
          sendError = sendResult.error || '';
          
          // Se falhou o envio, tentar enviar fallback crítico
          if (!messageSent && result.response) {
            logPlatformEvent('SEND_FALLBACK_ATTEMPT', 'whatsapp', {
              platformUserId: event.platformUserId,
              originalError: sendError,
              platformMessageId: event.platformMessageId,
              error: sendResult.error,
              responseLength: result.response.length
            });
          }
        }

        // Log do processamento completo
        logPlatformEvent('PROCESSING_COMPLETE', 'whatsapp', {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          existing,
          leadId,
          messageSent,
          textLength: event.text.length,
          responseLength: result.response?.length || 0,
          usedFallback: result.usedFallback || false,
          fallbackReason: result.fallbackReason || '',
          sendError,
          legalArea: result.lead?.legal_area || 'unknown',
          leadStatus: result.lead?.lead_status || 'unknown'
        });

        processedEvents.push({
          ...event,
          existing,
          leadId,
          messageSent,
          processed: true,
          usedFallback: result.usedFallback,
          fallbackReason: result.fallbackReason,
          legalArea: result.lead?.legal_area
        });

      } catch (eventError) {
        logPlatformEvent('EVENT_PROCESSING_ERROR', 'whatsapp', {
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

    logPlatformEvent('WEBHOOK_PROCESSING_COMPLETE', 'whatsapp', {
      totalEvents: events.length,
      successCount,
      errorCount,
      sentCount,
      results: processedEvents.map(r => ({
        platformUserId: r.platformUserId,
        platformMessageId: r.platformMessageId,
        hasError: !!(r as any).error,
        processed: r.processed,
        messageSent: (r as any).messageSent,
        usedFallback: (r as any).usedFallback,
        legalArea: (r as any).legalArea
      }))
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
    logPlatformEvent('FATAL_HANDLER_ERROR', 'whatsapp', {
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
