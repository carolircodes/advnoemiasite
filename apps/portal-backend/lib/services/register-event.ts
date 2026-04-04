import "server-only";

import { assertStaffActor } from "@/lib/auth/guards";
import { recordPortalEventSchema } from "@/lib/domain/portal";
import { queueCaseEventNotification } from "@/lib/notifications/outbox";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function resolveOccurredAt(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

export async function registerPortalEvent(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = recordPortalEventSchema.parse(rawInput);
  const supabase = createAdminSupabaseClient();
  const occurredAt = resolveOccurredAt(input.occurredAt);
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;
  const publicSummary = visibleToClient
    ? input.publicSummary || input.description || "Nova atualizacao registrada no portal."
    : null;

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id,client_id,title")
    .eq("id", input.caseId)
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Caso nao encontrado para registrar a atualizacao.");
  }

  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("id,profile_id")
    .eq("id", caseRecord.client_id)
    .single();

  if (clientError || !clientRecord) {
    throw new Error(clientError?.message || "Cliente nao encontrado para este caso.");
  }

  const { data: profileRecord, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", clientRecord.profile_id)
    .single();

  if (profileError || !profileRecord) {
    throw new Error(profileError?.message || "Perfil do cliente nao encontrado.");
  }

  const { data: eventRecord, error: eventError } = await supabase
    .from("case_events")
    .insert({
      case_id: caseRecord.id,
      client_id: clientRecord.id,
      event_type: input.eventType,
      title: input.title,
      description: input.description || null,
      public_summary: publicSummary,
      triggered_by: actorProfileId,
      visible_to_client: visibleToClient,
      should_notify_client: shouldNotifyClient,
      occurred_at: occurredAt,
      payload: {
        ...(input.payload || {}),
        source: input.payload?.source || "painel-advogada"
      }
    })
    .select("id")
    .single();

  if (eventError || !eventRecord) {
    throw new Error(eventError?.message || "Nao foi possivel registrar a atualizacao do caso.");
  }

  let notificationId: string | null = null;
  try {
    if (shouldNotifyClient && profileRecord.email) {
      const notificationSummary =
        publicSummary || "Nova atualizacao registrada no portal.";
      const notification = await queueCaseEventNotification({
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email,
        eventType: input.eventType,
        title: input.title,
        publicSummary: notificationSummary,
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
        caseTitle: caseRecord.title,
        visibleToClient,
        shouldNotifyClient,
        occurredAt,
        notificationId
      }
    });

    if (auditError) {
      throw new Error(
        `Nao foi possivel registrar a auditoria da atualizacao: ${auditError.message}`
      );
    }
  } catch (error) {
    console.error("[case-events.create] Rolling back case update after downstream failure", {
      caseId: caseRecord.id,
      eventId: eventRecord.id,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    if (notificationId) {
      const { error: deleteNotificationError } = await supabase
        .from("notifications_outbox")
        .delete()
        .eq("id", notificationId);

      if (deleteNotificationError) {
        console.error("[case-events.create] Failed to rollback notification", {
          eventId: eventRecord.id,
          notificationId,
          message: deleteNotificationError.message
        });
      }
    }

    const { error: deleteEventError } = await supabase
      .from("case_events")
      .delete()
      .eq("id", eventRecord.id);

    if (deleteEventError) {
      console.error("[case-events.create] Failed to rollback case update", {
        caseId: caseRecord.id,
        eventId: eventRecord.id,
        message: deleteEventError.message
      });
    }

    throw error;
  }

  return {
    eventId: eventRecord.id,
    notificationId
  };
}

export async function listLatestCaseEvents(limit = 8) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("case_events")
    .select(
      "id,case_id,event_type,title,occurred_at,visible_to_client,should_notify_client"
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Nao foi possivel listar as atualizacoes do portal: ${error.message}`);
  }

  return data || [];
}
