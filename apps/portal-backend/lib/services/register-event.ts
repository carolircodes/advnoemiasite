import "server-only";

import { assertStaffActor } from "../auth/guards.ts";
import { recordPortalEventSchema } from "../domain/portal.ts";
import { sendCaseUpdateNotification } from "../notifications/case-notifications.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";
import { createServerSupabaseClient } from "../supabase/server.ts";

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

  let notificationResults: {
    emailNotificationId?: string;
    whatsappNotificationId?: string;
    skipped: string[];
    errors: string[];
  } = {
    skipped: [],
    errors: []
  };

  try {
    if (shouldNotifyClient && profileRecord.email) {
      // Usar novo fluxo unificado de notificações
      notificationResults = await sendCaseUpdateNotification({
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email,
        clientId: clientRecord.id,
        clientName: profileRecord.full_name || "Cliente",
        caseId: caseRecord.id,
        caseTitle: input.title,
        eventType: input.eventType,
        title: input.title,
        publicSummary: publicSummary || "Nova atualização registrada no portal.",
        shouldNotifyEmail: true,
        shouldNotifyWhatsApp: true,
        relatedId: eventRecord.id
      });
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
        emailSent: !!notificationResults.emailNotificationId,
        whatsappSent: !!notificationResults.whatsappNotificationId,
        skipped: notificationResults.skipped,
        errors: notificationResults.errors
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
      emailNotificationId: notificationResults.emailNotificationId,
      whatsappNotificationId: notificationResults.whatsappNotificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    // Rollback de notificações (email e WhatsApp)
    if (notificationResults.emailNotificationId) {
      const { error: deleteEmailError } = await supabase
        .from("notifications_outbox")
        .delete()
        .eq("id", notificationResults.emailNotificationId);

      if (deleteEmailError) {
        console.error("[case-events.create] Failed to rollback email notification", {
          eventId: eventRecord.id,
          notificationId: notificationResults.emailNotificationId,
          message: deleteEmailError.message
        });
      }
    }

    if (notificationResults.whatsappNotificationId) {
      const { error: deleteWhatsAppError } = await supabase
        .from("notifications_outbox")
        .delete()
        .eq("id", notificationResults.whatsappNotificationId);

      if (deleteWhatsAppError) {
        console.error("[case-events.create] Failed to rollback WhatsApp notification", {
          eventId: eventRecord.id,
          notificationId: notificationResults.whatsappNotificationId,
          message: deleteWhatsAppError.message
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
    emailNotificationId: notificationResults.emailNotificationId,
    whatsappNotificationId: notificationResults.whatsappNotificationId,
    skipped: notificationResults.skipped,
    errors: notificationResults.errors
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
