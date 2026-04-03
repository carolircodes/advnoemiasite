import "server-only";

import { recordPortalEventSchema } from "@/lib/domain/portal";
import { queueCaseEventNotification } from "@/lib/notifications/outbox";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function registerPortalEvent(rawInput: unknown, actorProfileId: string) {
  const input = recordPortalEventSchema.parse(rawInput);
  const supabase = createAdminSupabaseClient();

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id,client_id")
    .eq("id", input.caseId)
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Caso não encontrado para registrar o evento.");
  }

  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("id,profile_id")
    .eq("id", caseRecord.client_id)
    .single();

  if (clientError || !clientRecord) {
    throw new Error(clientError?.message || "Cliente não encontrado para este caso.");
  }

  const { data: profileRecord, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", clientRecord.profile_id)
    .single();

  if (profileError || !profileRecord) {
    throw new Error(profileError?.message || "Perfil do cliente não encontrado.");
  }

  const { data: eventRecord, error: eventError } = await supabase
    .from("case_events")
    .insert({
      case_id: caseRecord.id,
      client_id: clientRecord.id,
      event_type: input.eventType,
      title: input.title,
      description: input.description || null,
      public_summary: input.publicSummary || null,
      triggered_by: actorProfileId,
      should_notify_client: input.shouldNotifyClient,
      payload: input.payload || {}
    })
    .select("id")
    .single();

  if (eventError || !eventRecord) {
    throw new Error(eventError?.message || "Não foi possível registrar o evento do caso.");
  }

  let notificationId: string | null = null;

  if (input.shouldNotifyClient && profileRecord.email) {
    const notification = await queueCaseEventNotification({
      clientProfileId: profileRecord.id,
      clientEmail: profileRecord.email,
      eventType: input.eventType,
      title: input.title,
      publicSummary:
        input.publicSummary || "Há uma atualização disponível na sua área do cliente.",
      relatedId: eventRecord.id
    });

    notificationId = notification.id;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    action: "cases.event.create",
    entity_type: "case_events",
    entity_id: eventRecord.id,
    payload: {
      caseId: caseRecord.id,
      notificationId
    }
  });

  if (auditError) {
    throw new Error(`Não foi possível registrar a auditoria do evento: ${auditError.message}`);
  }

  return {
    eventId: eventRecord.id,
    notificationId
  };
}

export async function listLatestCaseEvents(limit = 8) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("case_events")
    .select("id,event_type,title,occurred_at,should_notify_client")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Não foi possível listar os eventos do portal: ${error.message}`);
  }

  return data || [];
}

