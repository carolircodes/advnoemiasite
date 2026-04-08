import "server-only";

import { assertStaffActor } from "../auth/guards";
import {
  caseAreaLabels,
  caseStatusLabels,
  createCaseSchema,
  updateCaseDetailsSchema,
  updateCaseStatusSchema
} from "../domain/portal";
import { sendCaseUpdateNotification } from "../notifications/case-notifications";
import { createAdminSupabaseClient } from "../supabase/admin";
import { logger, logCaseUpdate } from "../logging/structured-logger";

type CaseRecord = {
  id: string;
  client_id: string;
  title: string;
  area: string;
  summary: string | null;
  status: string;
  priority: string | null;
  last_public_update_at: string | null;
  last_status_changed_at: string | null;
};

type ClientRecord = {
  id: string;
  profile_id: string;
};

type ProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
};

async function rollbackNotificationAndEvent(eventId: string | null, notificationId: string | null) {
  const supabase = createAdminSupabaseClient();

  if (notificationId) {
    const { error: notificationError } = await supabase
      .from("notifications_outbox")
      .delete()
      .eq("id", notificationId);

    if (notificationError) {
      console.error("[cases.rollback] Failed to rollback notification", {
        notificationId,
        message: notificationError.message
      });
    }
  }

  if (eventId) {
    const { error: eventError } = await supabase.from("case_events").delete().eq("id", eventId);

    if (eventError) {
      console.error("[cases.rollback] Failed to rollback event", {
        eventId,
        message: eventError.message
      });
    }
  }
}

async function resolveClientContext(clientId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("id,profile_id")
    .eq("id", clientId)
    .single();

  if (clientError || !clientRecord) {
    throw new Error(clientError?.message || "Cliente nao encontrado para esta operacao.");
  }

  const { data: profileRecord, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", clientRecord.profile_id)
    .single();

  if (profileError || !profileRecord) {
    throw new Error(profileError?.message || "Perfil do cliente nao encontrado.");
  }

  return {
    supabase,
    clientRecord: clientRecord as ClientRecord,
    profileRecord: profileRecord as ProfileRecord
  };
}

async function resolveCaseContext(caseId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select(
      "id,client_id,title,area,summary,status,priority,last_public_update_at,last_status_changed_at"
    )
    .eq("id", caseId)
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Caso nao encontrado para esta operacao.");
  }

  const { clientRecord, profileRecord } = await resolveClientContext(caseRecord.client_id);

  return {
    supabase,
    caseRecord: caseRecord as CaseRecord,
    clientRecord,
    profileRecord
  };
}

async function createVisibleCaseEvent(input: {
  caseId: string;
  clientId: string;
  actorProfileId: string;
  clientProfileId: string;
  clientEmail: string;
  clientName: string;
  eventType: "case_update" | "status_change";
  title: string;
  description: string;
  publicSummary: string;
  payload: Record<string, unknown>;
  shouldNotifyClient: boolean;
  shouldNotifyEmail?: boolean;
  shouldNotifyWhatsApp?: boolean;
  occurredAt: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: eventRecord, error: eventError } = await supabase
    .from("case_events")
    .insert({
      case_id: input.caseId,
      client_id: input.clientId,
      event_type: input.eventType,
      title: input.title,
      description: input.description || null,
      public_summary: input.publicSummary,
      triggered_by: input.actorProfileId,
      visible_to_client: true,
      should_notify_client: input.shouldNotifyClient,
      occurred_at: input.occurredAt,
      payload: input.payload
    })
    .select("id")
    .single();

  if (eventError || !eventRecord) {
    throw new Error(
      eventError?.message || "Nao foi possivel registrar a movimentacao visivel do caso."
    );
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
    if (input.shouldNotifyClient) {
      // Buscar nome do cliente se não fornecido
      let clientName = input.clientName;
      if (!clientName) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("profiles!inner(full_name)")
          .eq("id", input.clientId)
          .single();
        
        const profile = clientData?.profiles as any;
        clientName = profile?.full_name || "Cliente";
      }

      notificationResults = await sendCaseUpdateNotification({
        clientProfileId: input.clientProfileId,
        clientEmail: input.clientEmail,
        clientId: input.clientId,
        clientName,
        caseId: input.caseId,
        caseTitle: input.title,
        eventType: input.eventType,
        title: input.title,
        publicSummary: input.publicSummary,
        shouldNotifyEmail: input.shouldNotifyEmail !== false,
        shouldNotifyWhatsApp: input.shouldNotifyWhatsApp !== false,
        relatedId: eventRecord.id,
        previousStatus: input.payload?.previousStatus as string,
        newStatus: input.payload?.nextStatus as string
      });
    }
  } catch (error) {
    await logger.error(
      "cases",
      "notification_error",
      "Erro no envio de notificações do caso",
      error instanceof Error ? error : new Error(String(error)),
      {
        caseId: input.caseId,
        eventId: eventRecord.id,
        eventType: input.eventType
      },
      {
        userId: input.actorProfileId,
        clientId: input.clientId,
        caseId: input.caseId
      }
    );
  }

  // Log de sucesso com detalhes das notificações
  if (notificationResults.emailNotificationId || notificationResults.whatsappNotificationId) {
    const { error: successLogError } = await supabase.from("audit_logs").insert({
      actor_profile_id: input.actorProfileId,
      action: "case.notification.sent",
      entity_type: "case_events",
      entity_id: eventRecord.id,
      payload: {
        caseId: input.caseId,
        emailSent: !!notificationResults.emailNotificationId,
        whatsappSent: !!notificationResults.whatsappNotificationId,
        skipped: notificationResults.skipped,
        errors: notificationResults.errors,
        timestamp: new Date().toISOString()
      }
    });

    if (successLogError) {
      console.error("[cases.activity] Falha ao registrar sucesso de notificação:", successLogError);
    }
  }

  return {
    eventId: eventRecord.id,
    emailNotificationId: notificationResults.emailNotificationId,
    whatsappNotificationId: notificationResults.whatsappNotificationId,
    notificationSkipped: notificationResults.skipped,
    notificationErrors: notificationResults.errors
  };
}

async function createAuditLog(input: {
  actorProfileId: string;
  action: string;
  entityId: string;
  payload: Record<string, unknown>;
}) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_profile_id: input.actorProfileId,
    action: input.action,
    entity_type: "cases",
    entity_id: input.entityId,
    payload: input.payload
  });

  if (error) {
    throw new Error(`Nao foi possivel registrar a auditoria do caso: ${error.message}`);
  }
}

async function restoreCase(caseId: string, payload: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("cases").update(payload).eq("id", caseId);

  if (error) {
    console.error("[cases.restore] Failed to restore case data", {
      caseId,
      payload,
      message: error.message
    });
  }
}

export async function createCaseForClient(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = createCaseSchema.parse(rawInput);
  const { supabase, clientRecord, profileRecord } = await resolveClientContext(input.clientId);
  const nowIso = new Date().toISOString();
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .insert({
      client_id: clientRecord.id,
      area: input.area,
      title: input.title,
      summary: input.summary || null,
      status: input.status,
      priority: input.priority,
      assigned_staff_id: actorProfileId,
      last_status_changed_at: nowIso,
      last_public_update_at: visibleToClient ? nowIso : null
    })
    .select("id,title,status")
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Nao foi possivel abrir o novo caso.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    if (visibleToClient) {
      const areaLabel = caseAreaLabels[input.area];
      const statusLabel = caseStatusLabels[input.status];
      const activity = await createVisibleCaseEvent({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        clientName: profileRecord.full_name || "Cliente",
        eventType: "case_update",
        title: `Novo caso aberto: ${input.title}`,
        description:
          input.summary ||
          `A equipe abriu um novo caso na area ${areaLabel} com status ${statusLabel.toLowerCase()}.`,
        publicSummary:
          input.summary ||
          `A equipe abriu um novo caso para o seu acompanhamento: ${input.title}.`,
        payload: {
          source: "painel-advogada",
          area: input.area,
          priority: input.priority,
          status: input.status
        },
        shouldNotifyClient,
        occurredAt: nowIso
      });

      eventId = activity.eventId;
      notificationId = activity.emailNotificationId || activity.whatsappNotificationId;
    }

    await logCaseUpdate(
      "cases.create",
      caseRecord.id,
      clientRecord.id,
      `Novo caso criado: "${input.title}" na área ${input.area}`,
      {
        area: input.area,
        priority: input.priority,
        status: input.status,
        shouldNotifyClient
      },
      actorProfileId
    );

    await createAuditLog({
      actorProfileId,
      action: "cases.create",
      entityId: caseRecord.id,
      payload: {
        clientId: clientRecord.id,
        area: input.area,
        status: input.status,
        priority: input.priority,
        visibleToClient,
        shouldNotifyClient,
        eventId,
        notificationId
      }
    });
  } catch (error) {
    console.error("[cases.create] Rolling back case after downstream failure", {
      caseId: caseRecord.id,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);

    const { error: deleteCaseError } = await supabase.from("cases").delete().eq("id", caseRecord.id);

    if (deleteCaseError) {
      console.error("[cases.create] Failed to rollback case", {
        caseId: caseRecord.id,
        message: deleteCaseError.message
      });
    }

    throw error;
  }

  return {
    caseId: caseRecord.id,
    eventId,
    notificationId
  };
}

export async function updateCaseDetails(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = updateCaseDetailsSchema.parse(rawInput);
  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  const previousState = {
    area: caseRecord.area,
    title: caseRecord.title,
    summary: caseRecord.summary || "",
    priority: caseRecord.priority || "normal",
    lastPublicUpdateAt: caseRecord.last_public_update_at
  };
  const currentState = {
    area: input.area,
    title: input.title,
    summary: input.summary || "",
    priority: input.priority
  };
  const changedFields = [
    previousState.area !== currentState.area ? "area" : null,
    previousState.title !== currentState.title ? "title" : null,
    previousState.summary !== currentState.summary ? "summary" : null,
    previousState.priority !== currentState.priority ? "priority" : null
  ].filter(Boolean) as string[];

  if (!changedFields.length) {
    throw new Error("Nenhuma alteracao foi informada para este caso.");
  }

  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;
  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      area: input.area,
      title: input.title,
      summary: input.summary || null,
      priority: input.priority,
      last_public_update_at: visibleToClient ? nowIso : caseRecord.last_public_update_at
    })
    .eq("id", caseRecord.id);

  if (updateError) {
    throw new Error(updateError.message || "Nao foi possivel salvar as alteracoes do caso.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    if (visibleToClient) {
      const activity = await createVisibleCaseEvent({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        clientName: profileRecord.full_name || "Cliente",
        eventType: "case_update",
        title: `Caso atualizado: ${input.title}`,
        description:
          input.changeSummary ||
          `A equipe atualizou as informacoes do caso. Campos alterados: ${changedFields.join(", ")}.`,
        publicSummary:
          input.changeSummary ||
          `A equipe atualizou informacoes importantes do seu caso ${input.title}.`,
        payload: {
          source: "painel-advogada",
          changedFields,
          previousState,
          currentState
        },
        shouldNotifyClient,
        occurredAt: nowIso
      });

      eventId = activity.eventId;
      notificationId = activity.emailNotificationId || activity.whatsappNotificationId;
    }

    await createAuditLog({
      actorProfileId,
      action: "cases.update",
      entityId: caseRecord.id,
      payload: {
        changedFields,
        previousState,
        currentState,
        visibleToClient,
        shouldNotifyClient,
        eventId,
        notificationId
      }
    });
  } catch (error) {
    console.error("[cases.update] Rolling back case edit after downstream failure", {
      caseId: caseRecord.id,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);
    await restoreCase(caseRecord.id, {
      area: previousState.area,
      title: previousState.title,
      summary: previousState.summary || null,
      priority: previousState.priority,
      last_public_update_at: previousState.lastPublicUpdateAt
    });
    throw error;
  }

  return {
    caseId: caseRecord.id,
    changedFields,
    eventId,
    notificationId
  };
}

export async function updateCaseStatus(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = updateCaseStatusSchema.parse(rawInput);
  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  if (caseRecord.status === input.status) {
    throw new Error("O caso ja esta com este status.");
  }

  const previousStatus = caseRecord.status;
  const previousStatusChangedAt = caseRecord.last_status_changed_at;
  const previousPublicUpdateAt = caseRecord.last_public_update_at;
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;
  const nowIso = new Date().toISOString();
  const nextStatusLabel =
    caseStatusLabels[input.status as keyof typeof caseStatusLabels] || input.status;
  const previousStatusLabel =
    caseStatusLabels[previousStatus as keyof typeof caseStatusLabels] || previousStatus;

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      status: input.status,
      last_status_changed_at: nowIso,
      last_public_update_at: visibleToClient ? nowIso : caseRecord.last_public_update_at
    })
    .eq("id", caseRecord.id);

  if (updateError) {
    throw new Error(updateError.message || "Nao foi possivel atualizar o status do caso.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    const description =
      input.internalNote ||
      `Status alterado de ${previousStatusLabel} para ${nextStatusLabel} pela equipe.`;
    const publicSummary = visibleToClient
      ? input.internalNote || `O status do seu caso foi atualizado para ${nextStatusLabel}.`
      : "";

    if (visibleToClient) {
      const activity = await createVisibleCaseEvent({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        clientName: profileRecord.full_name || "Cliente",
        eventType: "status_change",
        title: `Status do caso atualizado: ${nextStatusLabel}`,
        description,
        publicSummary,
        payload: {
          source: "painel-advogada",
          previousStatus,
          nextStatus: input.status
        },
        shouldNotifyClient,
        occurredAt: nowIso
      });

      eventId = activity.eventId;
      notificationId = activity.emailNotificationId || activity.whatsappNotificationId;
    }

    await createAuditLog({
      actorProfileId,
      action: "cases.status.update",
      entityId: caseRecord.id,
      payload: {
        previousStatus,
        nextStatus: input.status,
        visibleToClient,
        shouldNotifyClient,
        internalNote: input.internalNote || null,
        eventId,
        notificationId
      }
    });
  } catch (error) {
    console.error("[cases.status] Rolling back case status update", {
      caseId: caseRecord.id,
      previousStatus,
      nextStatus: input.status,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);
    await restoreCase(caseRecord.id, {
      status: previousStatus,
      last_status_changed_at: previousStatusChangedAt,
      last_public_update_at: previousPublicUpdateAt
    });
    throw error;
  }

  return {
    caseId: caseRecord.id,
    previousStatus,
    nextStatus: input.status,
    eventId,
    notificationId
  };
}
