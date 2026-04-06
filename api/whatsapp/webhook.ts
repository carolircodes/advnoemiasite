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

  try {
    // WhatsApp Cloud API structure
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                // CORREÇÃO: Mensagens do usuário não têm 'direction' property
                // Verificar se a mensagem é do usuário (tem campo 'from')
                if (message.type === 'text' && message.from) {
                  events.push({
                    platform: 'whatsapp' as Platform,
                    platformUserId: message.from, // CORREÇÃO: Extrair corretamente do campo 'from'
                    platformMessageId: message.id,
                    senderName: change.value.contacts?.[0]?.name?.formatted_name || message.contact?.name?.formatted_name,
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
      }
    }
  } catch (error) {
    console.error('Error parsing WhatsApp message:', error);
  }

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
  const config = platformConfigs.whatsapp;
  const mode = request.query["hub.mode"] as string;
  const token = request.query["hub.verify_token"] as string;
  const challenge = request.query["hub.challenge"] as string;

  if (mode === "subscribe" && token === config.verifyToken) {
    logPlatformEvent('WEBHOOK_VERIFIED', 'whatsapp', { mode, token, challenge });
    return new Response(challenge);
  }

  logPlatformEvent('WEBHOOK_VERIFY_FAILED', 'whatsapp', { mode, token });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    // Validar assinatura
    if (!validateSignature(request, 'whatsapp')) {
      logPlatformEvent('INVALID_SIGNATURE', 'whatsapp', {
        headers: request.headers,
        bodyPreview: JSON.stringify(request.body).substring(0, 200)
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = await request.json();
    const events = parseWhatsAppMessage(body);

    if (!events.length) {
      logPlatformEvent('NO_EVENTS_FOUND', 'whatsapp', { body });
      return NextResponse.json({ received: true, events: [] });
    }

    const supabase = await createServerSupabaseClient();
    const processedEvents = [];

    for (const event of events) {
      try {
        // Processar mensagem
        const result = await processPlatformMessage(event);

        if (result.error && !result.response) {
          logPlatformEvent('PROCESSING_ERROR', 'whatsapp', {
            platformUserId: event.platformUserId,
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

        // Enviar resposta automática com fallback robusto
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

        // Log do processamento
        logPlatformEvent('MESSAGE_PROCESSED', 'whatsapp', {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          existing,
          leadId,
          messageSent,
          textLength: event.text.length,
          responseLength: result.response?.length || 0,
          usedFallback: result.usedFallback || false,
          fallbackReason: result.fallbackReason || '',
          sendError
        });

        processedEvents.push({
          ...event,
          existing,
          leadId,
          messageSent,
          processed: true
        } as any);

      } catch (eventError) {
        logPlatformEvent('EVENT_PROCESSING_ERROR', 'whatsapp', {
          platformUserId: event.platformUserId,
          platformMessageId: event.platformMessageId,
          error: eventError instanceof Error ? eventError.message : 'unknown'
        });

        processedEvents.push({
          ...event,
          error: true,
          processed: false
        });
      }
    }

    return NextResponse.json({
      received: true,
      processed: processedEvents.length,
      events: processedEvents,
      summary: {
        total: events.length,
        processed: processedEvents.filter(e => e.processed).length,
        withResponse: processedEvents.filter(e => e.messageSent).length
      }
    });

  } catch (error) {
    logPlatformEvent('FATAL_HANDLER_ERROR', 'whatsapp', {
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'internal_error',
      received: true
    }, { status: 500 });
  }
}
