import "server-only";

import { generateClientMessage, ClientMessageTemplates } from "./client-message-templates";
import { queueGovernedNotification } from "./governed-outbox";
import type { NotificationEventKey } from "./policy";
import { isPushPilotCandidate } from "./push-pilot";
import {
  buildCaseUpdateWhatsAppMessage,
  buildStatusChangeWhatsAppMessage,
  clientWantsWhatsAppNotifications,
  getClientWhatsAppPhone
} from "./whatsapp-delivery";
import { createAdminSupabaseClient } from "../supabase/admin";

export interface CaseNotificationInput {
  clientProfileId: string;
  clientEmail: string;
  clientId: string;
  clientName: string;
  caseId: string;
  caseTitle: string;
  eventType:
    | "case_update"
    | "status_change"
    | "new_document"
    | "document_request"
    | "new_appointment"
    | "appointment_updated"
    | "appointment_rescheduled"
    | "appointment_cancelled";
  title: string;
  publicSummary: string;
  internalNote?: string;
  previousStatus?: string;
  newStatus?: string;
  shouldNotifyEmail?: boolean;
  shouldNotifyWhatsApp?: boolean;
  relatedId?: string;
}

function resolveCaseNotificationEventKey(input: CaseNotificationInput): NotificationEventKey {
  switch (input.eventType) {
    case "document_request":
      return "client.document.pending";
    case "new_document":
      return "client.document.available";
    case "new_appointment":
    case "appointment_updated":
    case "appointment_rescheduled":
    case "appointment_cancelled":
      return "client.appointment.updated";
    case "status_change":
    case "case_update":
    default:
      return "client.case.updated";
  }
}

function resolveCaseNotificationTemplateKey(input: CaseNotificationInput) {
  switch (input.eventType) {
    case "document_request":
      return "document-request";
    case "new_document":
      return "new-document";
    case "new_appointment":
      return "new-appointment";
    case "appointment_updated":
      return "appointment-updated";
    case "appointment_rescheduled":
      return "appointment-rescheduled";
    case "appointment_cancelled":
      return "appointment-cancelled";
    case "status_change":
      return "status-change";
    default:
      return "case-update";
  }
}

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
    let professionalMessage = input.publicSummary;
    let professionalSubject = input.title;

    try {
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

      professionalMessage = ClientMessageTemplates.formatEmail(template);
      professionalSubject = ClientMessageTemplates.formatSubject(input.title);
    } catch (templateError) {
      console.warn("[CaseNotifications] Falha ao gerar template profissional:", templateError);
    }

    const eventKey = resolveCaseNotificationEventKey(input);

    if (input.shouldNotifyEmail !== false) {
      try {
        const emailNotification = await queueGovernedNotification({
          eventKey,
          channel: "email",
          recipientProfileId: input.clientProfileId,
          recipientAddress: input.clientEmail,
          subject: professionalSubject,
          templateKey: resolveCaseNotificationTemplateKey(input),
          payload: {
            title: professionalSubject,
            publicSummary: professionalMessage
          },
          relatedTable: "case_events",
          relatedId: input.relatedId || input.caseId,
          decisionContext: {
            source: "case_notification",
            caseId: input.caseId,
            clientId: input.clientId,
            originalEventType: input.eventType
          }
        });
        results.emailNotificationId = emailNotification.id;

        if (isPushPilotCandidate(eventKey)) {
          try {
            await queueGovernedNotification({
              eventKey,
              channel: "push",
              recipientProfileId: input.clientProfileId,
              recipientAddress: input.clientEmail,
              subject:
                eventKey === "client.document.available"
                  ? "Documento importante liberado no portal"
                  : professionalSubject,
              templateKey: resolveCaseNotificationTemplateKey(input),
              payload: {
                title: professionalSubject,
                publicSummary: professionalMessage,
                pushBody:
                  eventKey === "client.document.available"
                    ? "Seu portal recebeu um novo documento. Abra para ler com contexto e tranquilidade."
                    : professionalMessage
              },
              relatedTable: "case_events",
              relatedId: input.relatedId || input.caseId,
              decisionContext: {
                source: "case_notification",
                caseId: input.caseId,
                clientId: input.clientId,
                originalEventType: input.eventType,
                pilotChannel: "push"
              }
            });
          } catch (pushError) {
            console.warn("[CaseNotifications] Falha ao enfileirar piloto push:", pushError);
          }
        }
      } catch (error) {
        results.errors.push(`Email: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      }
    } else {
      results.skipped.push("Email (desabilitado)");
    }

    if (input.shouldNotifyWhatsApp !== false) {
      const wantsWhatsApp = await clientWantsWhatsAppNotifications(input.clientId);

      if (wantsWhatsApp) {
        const whatsappPhone = await getClientWhatsAppPhone(input.clientId);

        if (whatsappPhone) {
          try {
            let whatsappMessage: string;

            try {
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
              console.warn("[CaseNotifications] Falha ao gerar template WhatsApp:", templateError);
              whatsappMessage =
                input.eventType === "status_change"
                  ? buildStatusChangeWhatsAppMessage(
                      input.caseTitle,
                      input.newStatus || input.title,
                      input.clientName
                    )
                  : buildCaseUpdateWhatsAppMessage(
                      input.caseTitle,
                      input.publicSummary,
                      input.clientName
                    );
            }

            const whatsappNotification = await queueGovernedNotification({
              eventKey,
              channel: "whatsapp",
              recipientProfileId: input.clientProfileId,
              recipientAddress: whatsappPhone,
              subject: input.title,
              templateKey: "case-update",
              payload: {
                phone: whatsappPhone,
                message: whatsappMessage
              },
              relatedTable: "case_events",
              relatedId: input.relatedId || input.caseId,
              decisionContext: {
                source: "case_notification",
                caseId: input.caseId,
                deliveryChannel: "whatsapp"
              }
            });

            results.whatsappNotificationId = whatsappNotification.id;
          } catch (error) {
            results.errors.push(
              `WhatsApp: ${error instanceof Error ? error.message : "Erro desconhecido"}`
            );
          }
        } else {
          results.skipped.push("WhatsApp (cliente sem telefone cadastrado)");
        }
      } else {
        results.skipped.push("WhatsApp (cliente nao quer receber)");
      }
    } else {
      results.skipped.push("WhatsApp (desabilitado)");
    }

    await logCaseNotificationResult(input, results);
    return results;
  } catch (error) {
    console.error("[CaseNotifications] Erro geral no envio:", error);
    results.errors.push(`Geral: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    return results;
  }
}

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
      actor_profile_id: null,
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
    throw new Error(`Erro ao buscar status das notificacoes: ${error.message}`);
  }

  const notifications = data || [];

  return {
    pending: notifications.filter((item) => item.status === "pending").length,
    sent: notifications.filter((item) => item.status === "sent").length,
    failed: notifications.filter((item) => item.status === "failed").length,
    skipped: notifications.filter((item) => item.status === "skipped").length,
    details: notifications.map((item) => ({
      id: item.id,
      channel: item.channel,
      status: item.status,
      sent_at: item.sent_at,
      error_message: item.error_message
    }))
  };
}
