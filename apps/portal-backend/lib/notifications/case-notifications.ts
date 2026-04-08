import "server-only";

import { queueEmailNotification, queueCaseEventNotification } from "./outbox";
import { getClientWhatsAppPhone, clientWantsWhatsAppNotifications, buildCaseUpdateWhatsAppMessage, buildStatusChangeWhatsAppMessage } from "./whatsapp-delivery";
import { generateClientMessage, ClientMessageTemplates } from "./client-message-templates";
import { createAdminSupabaseClient } from "../supabase/admin";

export interface CaseNotificationInput {
  clientProfileId: string;
  clientEmail: string;
  clientId: string;
  clientName: string;
  caseId: string;
  caseTitle: string;
  eventType: "case_update" | "status_change" | "new_document" | "document_request" | "new_appointment" | "appointment_updated";
  title: string;
  publicSummary: string;
  internalNote?: string;
  previousStatus?: string;
  newStatus?: string;
  shouldNotifyEmail?: boolean;
  shouldNotifyWhatsApp?: boolean;
  relatedId?: string;
}

/**
 * Envia notificação de atualização de caso por múltiplos canais
 */
export async function sendCaseUpdateNotification(input: CaseNotificationInput): Promise<{
  emailNotificationId?: string;
  whatsappNotificationId?: string;
  skipped: string[];
  errors: string[];
}> {
  const results = {
    emailNotificationId: undefined as string | undefined,
    whatsappNotificationId: undefined as string | undefined,
    skipped: [] as string[],
    errors: [] as string[]
  };

  try {
    // Gerar mensagem profissional usando templates
    let professionalMessage = input.publicSummary;
    let professionalSubject = input.title;
    
    try {
      // Usar template profissional baseado no tipo de evento
      const template = generateClientMessage(
        input.eventType,
        input.clientName,
        input.caseTitle,
        input.publicSummary,
        {
          newStatus: input.newStatus,
          previousStatus: input.previousStatus
        }
      );
      
      // Para email, usar formato completo
      professionalMessage = ClientMessageTemplates.formatEmail(template);
      professionalSubject = ClientMessageTemplates.formatSubject(input.title);
      
    } catch (templateError) {
      // Fallback para mensagem original se template falhar
      console.warn("[CaseNotifications] Falha ao gerar template profissional:", templateError);
      professionalMessage = input.publicSummary;
      professionalSubject = input.title;
    }

    // 1. Notificação por Email (sempre envia, é o canal principal)
    if (input.shouldNotifyEmail !== false) {
      try {
        const emailNotification = await queueCaseEventNotification({
          clientProfileId: input.clientProfileId,
          clientEmail: input.clientEmail,
          eventType: input.eventType,
          title: professionalSubject,
          publicSummary: professionalMessage,
          relatedId: input.relatedId || input.caseId
        });
        results.emailNotificationId = emailNotification.id;
      } catch (error) {
        results.errors.push(`Email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    } else {
      results.skipped.push("Email (desabilitado)");
    }

    // 2. Notificação por WhatsApp (só se cliente quiser)
    if (input.shouldNotifyWhatsApp !== false) {
      const wantsWhatsApp = await clientWantsWhatsAppNotifications(input.clientId);
      
      if (wantsWhatsApp) {
        const whatsappPhone = await getClientWhatsAppPhone(input.clientId);
        
        if (whatsappPhone) {
          try {
            // Usar template profissional para WhatsApp (formato compacto)
            let whatsappMessage: string;
            
            try {
              // Reutilizar template já gerado, mas formatado para WhatsApp
              const template = generateClientMessage(
                input.eventType,
                input.clientName,
                input.caseTitle,
                input.publicSummary,
                {
                  newStatus: input.newStatus,
                  previousStatus: input.previousStatus
                }
              );
              
              whatsappMessage = ClientMessageTemplates.formatWhatsApp(template);
            } catch (templateError) {
              // Fallback para as funções existentes
              console.warn("[CaseNotifications] Falha ao gerar template WhatsApp:", templateError);
              
              if (input.eventType === "status_change") {
                whatsappMessage = buildStatusChangeWhatsAppMessage(
                  input.caseTitle,
                  input.newStatus || input.title,
                  input.clientName
                );
              } else {
                whatsappMessage = buildCaseUpdateWhatsAppMessage(
                  input.caseTitle,
                  input.publicSummary,
                  input.clientName
                );
              }
            }

            // Enviar notificação WhatsApp via outbox
            const whatsappNotification = await queueWhatsAppNotification({
              clientProfileId: input.clientProfileId,
              clientPhone: whatsappPhone,
              eventType: input.eventType,
              title: input.title,
              message: whatsappMessage,
              relatedId: input.relatedId || input.caseId
            });
            
            results.whatsappNotificationId = whatsappNotification.id;
          } catch (error) {
            results.errors.push(`WhatsApp: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        } else {
          results.skipped.push("WhatsApp (cliente sem telefone cadastrado)");
        }
      } else {
        results.skipped.push("WhatsApp (cliente não quer receber)");
      }
    } else {
      results.skipped.push("WhatsApp (desabilitado)");
    }

    // 3. Log de resultado
    await logCaseNotificationResult(input, results);

    return results;
  } catch (error) {
    console.error("[CaseNotifications] Erro geral no envio:", error);
    results.errors.push(`Geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return results;
  }
}

/**
 * Adiciona notificação WhatsApp na fila
 */
async function queueWhatsAppNotification(input: {
  clientProfileId: string;
  clientPhone: string;
  eventType: string;
  title: string;
  message: string;
  relatedId: string;
}) {
  const supabase = createAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from("notifications_outbox")
    .insert({
      event_type: input.eventType,
      channel: "whatsapp",
      recipient_profile_id: input.clientProfileId,
      recipient_email: input.clientPhone, // WhatsApp usa phone como "email" para compatibilidade
      subject: input.title,
      template_key: "case-update", // Template genérico para caso
      payload: {
        phone: input.clientPhone,
        message: input.message,
        eventType: input.eventType
      },
      related_table: "case_events",
      related_id: input.relatedId,
      status: "pending"
    })
    .select("id,status,template_key")
    .single();

  if (error) {
    throw new Error(`Não foi possível adicionar notificação WhatsApp à fila: ${error.message}`);
  }

  return data;
}

/**
 * Registra log de envio de notificações de caso
 */
async function logCaseNotificationResult(
  input: CaseNotificationInput,
  results: {
    emailNotificationId?: string;
    whatsappNotificationId?: string;
    skipped: string[];
    errors: string[];
  }
) {
  const supabase = createAdminSupabaseClient();
  
  try {
    await supabase.from("audit_logs").insert({
      actor_profile_id: null, // Sistema automatizado
      action: "case.notification.dispatch",
      entity_type: "cases",
      entity_id: input.caseId,
      payload: {
        clientId: input.clientId,
        caseTitle: input.caseTitle,
        eventType: input.eventType,
        emailSent: !!results.emailNotificationId,
        whatsappSent: !!results.whatsappNotificationId,
        skipped: results.skipped,
        errors: results.errors,
        timestamp: new Date().toISOString()
      }
    });
  } catch (logError) {
    console.warn("[CaseNotifications] Falha ao registrar log:", logError);
  }
}

/**
 * Verifica status das notificações de um caso
 */
export async function getCaseNotificationStatus(caseId: string): Promise<{
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  details: Array<{
    id: string;
    channel: string;
    status: string;
    sent_at?: string;
    error_message?: string;
  }>;
}> {
  const supabase = createAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from("notifications_outbox")
    .select("id,channel,status,sent_at,error_message,created_at")
    .eq("related_table", "case_events")
    .eq("related_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar status das notificações: ${error.message}`);
  }

  const notifications = data || [];
  
  return {
    pending: notifications.filter(n => n.status === 'pending').length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    skipped: notifications.filter(n => n.status === 'skipped').length,
    details: notifications.map(n => ({
      id: n.id,
      channel: n.channel,
      status: n.status,
      sent_at: n.sent_at,
      error_message: n.error_message
    }))
  };
}
