import "server-only";

import type { AnyCaseEventType } from "../domain/portal.ts";
import { caseEventTypeLabels } from "../domain/portal.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";

type QueueEmailInput = {
  eventType: string;
  recipientProfileId: string;
  recipientEmail: string;
  subject: string;
  templateKey: string;
  payload: Record<string, unknown>;
  relatedTable: string;
  relatedId?: string | null;
};

const templateKeyByEvent: Record<AnyCaseEventType, string> = {
  case_update: "case-update",
  new_document: "new-document",
  new_appointment: "new-appointment",
  appointment_updated: "appointment-updated",
  appointment_rescheduled: "appointment-rescheduled",
  appointment_cancelled: "appointment-cancelled",
  document_request: "document-request",
  status_change: "status-change"
};

export async function queueEmailNotification(input: QueueEmailInput) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notifications_outbox")
    .insert({
      event_type: input.eventType,
      channel: "email",
      recipient_profile_id: input.recipientProfileId,
      recipient_email: input.recipientEmail,
      subject: input.subject,
      template_key: input.templateKey,
      payload: input.payload,
      related_table: input.relatedTable,
      related_id: input.relatedId || null,
      status: "pending"
    })
    .select("id,status,template_key,recipient_email")
    .single();

  if (error) {
    throw new Error(`Nao foi possivel adicionar o e-mail a fila: ${error.message}`);
  }

  return data;
}

export async function listStaffEmailRecipients() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select(
      "profile_id,receives_notification_emails,profiles!inner(id,email,full_name,role,is_active)"
    )
    .eq("receives_notification_emails", true);

  if (error) {
    throw new Error(`Nao foi possivel carregar os destinatarios internos: ${error.message}`);
  }

  return (data || [])
    .map((item) => {
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      return {
        profileId: profile?.id || "",
        email: profile?.email || "",
        fullName: profile?.full_name || "Equipe",
        role: profile?.role || "",
        isActive: Boolean(profile?.is_active)
      };
    })
    .filter((item) => item.profileId && item.email && item.isActive);
}

export async function queueClientInviteTracking(input: {
  clientProfileId: string;
  clientEmail: string;
  fullName: string;
  caseAreaLabel: string;
  clientId: string;
}) {
  return queueEmailNotification({
    eventType: "client-invite",
    recipientProfileId: input.clientProfileId,
    recipientEmail: input.clientEmail,
    subject: "Convite para acessar sua area do cliente",
    templateKey: "client-invite",
    payload: {
      fullName: input.fullName,
      caseAreaLabel: input.caseAreaLabel
    },
    relatedTable: "clients",
    relatedId: input.clientId
  });
}

export async function queueCaseEventNotification(input: {
  clientProfileId: string;
  clientEmail: string;
  eventType: AnyCaseEventType;
  title: string;
  publicSummary: string;
  relatedId: string;
  /** Tier visual do cliente — controla o tema do e-mail. Derivado automaticamente se omitido. */
  clientTier?: string;
  /** Prioridade do caso — "urgente" promove o cliente para o tier vip. */
  casePriority?: string;
}) {
  return queueEmailNotification({
    eventType: input.eventType,
    recipientProfileId: input.clientProfileId,
    recipientEmail: input.clientEmail,
    subject: `${caseEventTypeLabels[input.eventType]}: ${input.title}`,
    templateKey: templateKeyByEvent[input.eventType],
    payload: {
      title: input.title,
      publicSummary: input.publicSummary,
      eventLabel: caseEventTypeLabels[input.eventType],
      ...(input.clientTier ? { clientTier: input.clientTier } : {}),
      ...(input.casePriority ? { casePriority: input.casePriority } : {})
    },
    relatedTable: "case_events",
    relatedId: input.relatedId
  });
}
