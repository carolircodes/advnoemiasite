import "server-only";

import type { PortalEventType } from "@/lib/domain/portal";
import { portalEventTypeLabels } from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

const templateKeyByEvent: Record<PortalEventType, string> = {
  case_update: "case-update",
  new_document: "new-document",
  new_appointment: "new-appointment",
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
    throw new Error(`Não foi possível adicionar o e-mail à fila: ${error.message}`);
  }

  return data;
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
    subject: "Convite para acessar sua área do cliente",
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
  eventType: PortalEventType;
  title: string;
  publicSummary: string;
  relatedId: string;
}) {
  return queueEmailNotification({
    eventType: input.eventType,
    recipientProfileId: input.clientProfileId,
    recipientEmail: input.clientEmail,
    subject: `${portalEventTypeLabels[input.eventType]}: ${input.title}`,
    templateKey: templateKeyByEvent[input.eventType],
    payload: {
      title: input.title,
      publicSummary: input.publicSummary,
      eventLabel: portalEventTypeLabels[input.eventType]
    },
    relatedTable: "case_events",
    relatedId: input.relatedId
  });
}
