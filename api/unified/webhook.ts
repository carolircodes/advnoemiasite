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

// Função unificada para parse de mensagens (Instagram + WhatsApp)
function parsePlatformMessages(body: any): Array<{
  platform: Platform;
  platformUserId: string;
  platformMessageId: string;
  senderName?: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, any>;
}> {
  const events = [];

  logPlatformEvent('WEBHOOK_BODY_PARSED', 'unknown', {
    object: body.object,
    entryCount: body.entry?.length || 0,
    hasBody: !!body,
    bodyPreview: JSON.stringify(body).substring(0, 500)
  });

  try {
    // Instagram Graph API structure
    if (body.object === 'instagram' && body.entry) {
      logPlatformEvent('PLATFORM_DETECTED', 'instagram', { platform: 'instagram' });
      
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            if (messaging.message?.text) {
              events.push({
                platform: 'instagram' as Platform,
                platformUserId: messaging.sender.id,
                platformMessageId: messaging.message.mid,
                senderName: messaging.sender.name || null,
                text: messaging.message.text,
                timestamp: messaging.timestamp,
                metadata: {
                  recipient: messaging.recipient,
                  platform: 'instagram'
                }
              });
            }
          }
        }
      }
    }
    
    // WhatsApp Cloud API structure
    else if (body.object === 'whatsapp_business_account' && body.entry) {
      logPlatformEvent('PLATFORM_DETECTED', 'whatsapp', { platform: 'whatsapp' });
      
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                // Mensagem do usuário (tem campo 'from')
                if (message.type === 'text' && message.from) {
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
                }
              }
            }
          }
        }
      }
    }
    
    else {
      logPlatformEvent('UNKNOWN_PLATFORM', 'unknown', {
        object: body.object,
        hasEntry: !!body.entry,
        hasChanges: !!body.entry?.[0]?.changes
      });
    }

  } catch (error) {
    logPlatformEvent('PARSE_ERROR', 'unknown', {
      error: error instanceof Error ? error.message : 'unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
      body: JSON.stringify(body).substring(0, 1000)
    });
  }

  logPlatformEvent('MESSAGE_PARSED', 'unknown', {
    eventCount: events.length,
    platforms: events.map(e => e.platform),
    userIds: events.map(e => e.platformUserId)
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
          summary: 'Novo lead via webhook',
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
    logPlatformEvent('LEAD_CREATE_ERROR', platform, {
      platformUserId,
      error: error instanceof Error ? error.message : 'unknown'
    });
    throw error;
  }
}

// Handler principal do webhook unificado
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  // Detectar plataforma pelo token
  let platform: Platform = 'instagram';
  if (token === platformConfigs.whatsapp.verifyToken) {
    platform = 'whatsapp';
  }

  logPlatformEvent('WEBHOOK_VERIFICATION_ATTEMPT', platform, {
    mode,
    token: token === platformConfigs[platform].verifyToken ? 'VALID' : 'INVALID',
    tokenMatch: token === platformConfigs[platform].verifyToken,
    hasChallenge: !!challenge,
    detectedPlatform: platform
  });

  if (mode === "subscribe" && token === platformConfigs[platform].verifyToken) {
    logPlatformEvent('WEBHOOK_VERIFIED', platform, {
      mode,
      token,
      challenge,
      platform
    });
    return new Response(challenge);
  }

  logPlatformEvent('WEBHOOK_VERIFY_FAILED', platform, {
    mode,
    token,
    tokenMatch: token === platformConfigs[platform].verifyToken,
    expectedToken: platformConfigs[platform].verifyToken,
    detectedPlatform: platform
  });

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Detectar plataforma pelo objeto
    let detectedPlatform: Platform = 'instagram';
    if (body.object === 'whatsapp_business_account') {
      detectedPlatform = 'whatsapp';
    }

    logPlatformEvent('WEBHOOK_RECEIVED', detectedPlatform, {
      method: 'POST',
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent'),
      detectedPlatform,
      object: body.object
    });

    // Validar assinatura
    if (!validateSignature(request, detectedPlatform)) {
      logPlatformEvent('INVALID_SIGNATURE', detectedPlatform, {
        hasSignature: !!request.headers.get('x-hub-signature-256'),
        hasAppSecret: !!platformConfigs[detectedPlatform].appSecret,
        headers: Object.fromEntries(request.headers.entries())
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Parse mensagens da plataforma detectada
    const events = parsePlatformMessages(body);

    if (!events.length) {
      logPlatformEvent('NO_EVENTS_FOUND', detectedPlatform, {
        body: JSON.stringify(body).substring(0, 1000),
        detectedPlatform,
        object: body.object
      });
      return NextResponse.json({ received: true, events: [] });
    }

    const supabase = await createServerSupabaseClient();
    const processedEvents = [];

    for (const event of events) {
      try {
        logPlatformEvent('PROCESSING_EVENT', event.platform, {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          textLength: event.text.length,
          textPreview: event.text.substring(0, 100),
          senderName: event.senderName
        });

        // Processar mensagem
        const result = await processPlatformMessage(event);

        if (result.error && !result.response) {
          logPlatformEvent('PROCESSING_ERROR', event.platform, {
            platformUserId: event.platformUserId,
            platformMessageId: event.platformMessageId,
            error: result.error
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

        // Enviar resposta automática
        let messageSent = false;
        let sendError = '';
        
        if (result.response) {
          const sendResult = await sendPlatformResponse(
            event.platform,
            event.platformUserId,
            result.response
          );
          
          messageSent = sendResult.success;
          sendError = sendResult.error || '';
        }

        // Log do processamento completo
        logPlatformEvent('PROCESSING_COMPLETE', event.platform, {
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
        logPlatformEvent('EVENT_PROCESSING_ERROR', event.platform, {
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
    const errorCount = processedEvents.filter(r => r.error).length;
    const sentCount = processedEvents.filter(r => r.messageSent).length;

    logPlatformEvent('WEBHOOK_PROCESSING_COMPLETE', detectedPlatform, {
      totalEvents: events.length,
      successCount,
      errorCount,
      sentCount,
      detectedPlatform,
      results: processedEvents.map(r => ({
        platformUserId: r.platformUserId,
        platformMessageId: r.platformMessageId,
        hasError: !!(r as any).error,
        processed: r.processed,
        messageSent: r.messageSent,
        usedFallback: r.usedFallback,
        legalArea: r.legalArea
      }))
    });

    return NextResponse.json({
      received: true,
      platform: detectedPlatform,
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
    logPlatformEvent('FATAL_HANDLER_ERROR', 'unknown', {
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
