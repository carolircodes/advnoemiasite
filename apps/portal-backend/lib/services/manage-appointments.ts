import "server-only";

import { assertStaffActor } from "../auth/guards";
import {
  appointmentChangeLabels,
  appointmentStatusLabels,
  appointmentTypeLabels,
  type AppointmentChangeType,
  registerCaseAppointmentSchema,
  updateCaseAppointmentSchema
} from "../domain/portal";
import { sendCaseUpdateNotification } from "../notifications/case-notifications";
import { createAdminSupabaseClient } from "../supabase/admin";
import { createServerSupabaseClient } from "../supabase/server";

type AppointmentState = {
  title: string;
  description: string;
  appointmentType: string;
  startsAt: string;
  status: string;
  visibleToClient: boolean;
};

type AppointmentContext = {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  appointmentRecord: {
    id: string;
    case_id: string;
    client_id: string;
    title: string;
    appointment_type: string;
    notes: string | null;
    status: string;
    visible_to_client: boolean;
    starts_at: string;
  };
  caseRecord: {
    id: string;
    client_id: string;
    title: string;
  };
  clientRecord: {
    id: string;
    profile_id: string;
  };
  profileRecord: {
    id: string;
    email: string | null;
    full_name: string | null;
  };
};

function formatAppointmentDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalizeAppointmentState(input: AppointmentState) {
  return {
    ...input,
    startsAt: new Date(input.startsAt).toISOString()
  };
}

function buildAppointmentState(input: {
  title: string;
  description?: string | null;
  appointmentType: string;
  startsAt: string;
  status: string;
  visibleToClient: boolean;
}): AppointmentState {
  return normalizeAppointmentState({
    title: input.title,
    description: input.description || "",
    appointmentType: input.appointmentType,
    startsAt: input.startsAt,
    status: input.status,
    visibleToClient: input.visibleToClient
  });
}

function listChangedFields(previousState: AppointmentState, currentState: AppointmentState) {
  const changedFields: string[] = [];

  if (previousState.title !== currentState.title) {
    changedFields.push("title");
  }

  if (previousState.description !== currentState.description) {
    changedFields.push("description");
  }

  if (previousState.appointmentType !== currentState.appointmentType) {
    changedFields.push("appointmentType");
  }

  if (previousState.startsAt !== currentState.startsAt) {
    changedFields.push("startsAt");
  }

  if (previousState.status !== currentState.status) {
    changedFields.push("status");
  }

  if (previousState.visibleToClient !== currentState.visibleToClient) {
    changedFields.push("visibleToClient");
  }

  return changedFields;
}

function resolveAppointmentChangeType(
  previousState: AppointmentState,
  currentState: AppointmentState
): AppointmentChangeType {
  if (currentState.status === "cancelled" && previousState.status !== "cancelled") {
    return "cancelled";
  }

  if (previousState.startsAt !== currentState.startsAt) {
    return "rescheduled";
  }

  return "updated";
}

function buildAppointmentLifecycleMeta(input: {
  changeType: AppointmentChangeType;
  currentState: AppointmentState;
  previousState: AppointmentState | null;
  changedFields: string[];
}) {
  const typeLabel =
    appointmentTypeLabels[
      input.currentState.appointmentType as keyof typeof appointmentTypeLabels
    ] || input.currentState.appointmentType;
  const statusLabel =
    appointmentStatusLabels[
      input.currentState.status as keyof typeof appointmentStatusLabels
    ] || input.currentState.status;

  if (input.changeType === "created") {
    return {
      eventType: "new_appointment" as const,
      eventTitle: `${typeLabel}: ${input.currentState.title}`,
      publicSummary:
        input.currentState.description ||
        `${typeLabel} ${statusLabel.toLowerCase()} para ${formatAppointmentDateTime(
          input.currentState.startsAt
        )}.`
    };
  }

  if (input.changeType === "rescheduled") {
    const previousDate = input.previousState
      ? formatAppointmentDateTime(input.previousState.startsAt)
      : "";

    return {
      eventType: "appointment_rescheduled" as const,
      eventTitle: `Compromisso reagendado: ${input.currentState.title}`,
      publicSummary:
        `Seu compromisso foi reagendado para ${formatAppointmentDateTime(
          input.currentState.startsAt
        )}.` + (previousDate ? ` Data anterior: ${previousDate}.` : "")
    };
  }

  if (input.changeType === "cancelled") {
    const previousDate = input.previousState
      ? formatAppointmentDateTime(input.previousState.startsAt)
      : formatAppointmentDateTime(input.currentState.startsAt);

    return {
      eventType: "appointment_cancelled" as const,
      eventTitle: `Compromisso cancelado: ${input.currentState.title}`,
      publicSummary: `O compromisso previsto para ${previousDate} foi cancelado pela equipe.`
    };
  }

  const relevantChanges = input.changedFields.map((field) => {
    switch (field) {
      case "title":
        return "titulo";
      case "description":
        return "descricao";
      case "appointmentType":
        return "tipo";
      case "status":
        return "status";
      case "visibleToClient":
        return "visibilidade";
      default:
        return field;
    }
  });

  return {
    eventType: "appointment_updated" as const,
    eventTitle: `Compromisso atualizado: ${input.currentState.title}`,
    publicSummary:
      `A equipe atualizou este compromisso no portal.` +
      (relevantChanges.length
        ? ` Campos alterados: ${relevantChanges.join(", ")}.`
        : "") +
      ` Status atual: ${statusLabel}.`
  };
}

async function resolveCaseContext(caseId: string) {
  const supabase = createAdminSupabaseClient();

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id,client_id,title")
    .eq("id", caseId)
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Caso nao encontrado para esta operacao.");
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

  return {
    supabase,
    caseRecord,
    clientRecord,
    profileRecord
  };
}

async function resolveAppointmentContext(appointmentId: string): Promise<AppointmentContext> {
  const supabase = createAdminSupabaseClient();

  const { data: appointmentRecord, error: appointmentError } = await supabase
    .from("appointments")
    .select(
      "id,case_id,client_id,title,appointment_type,notes,status,visible_to_client,starts_at"
    )
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointmentRecord) {
    throw new Error(
      appointmentError?.message || "Compromisso nao encontrado para esta operacao."
    );
  }

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id,client_id,title")
    .eq("id", appointmentRecord.case_id)
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Caso nao encontrado para este compromisso.");
  }

  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("id,profile_id")
    .eq("id", appointmentRecord.client_id)
    .single();

  if (clientError || !clientRecord) {
    throw new Error(clientError?.message || "Cliente nao encontrado para este compromisso.");
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
    appointmentRecord,
    caseRecord,
    clientRecord,
    profileRecord
  };
}

async function createAppointmentEvent(input: {
  caseId: string;
  clientId: string;
  actorProfileId: string;
  clientProfileId: string;
  clientEmail: string;
  clientName?: string;
  eventType: any;
  title: string;
  description: string;
  publicSummary: string;
  startsAt: string;
  shouldNotifyClient: boolean;
  payload: Record<string, unknown>;
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
      occurred_at: input.startsAt,
      payload: input.payload
    })
    .select("id")
    .single();

  if (eventError || !eventRecord) {
    throw new Error(
      eventError?.message || "Nao foi possivel registrar o evento da agenda no portal."
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
    if (input.shouldNotifyClient && input.clientEmail) {
      // Usar novo fluxo unificado de notificações
      notificationResults = await sendCaseUpdateNotification({
        clientProfileId: input.clientProfileId,
        clientEmail: input.clientEmail,
        clientId: input.clientId,
        clientName: input.clientName || "Cliente",
        caseId: input.caseId,
        caseTitle: input.title,
        eventType: input.eventType,
        title: input.title,
        publicSummary: input.publicSummary,
        shouldNotifyEmail: true,
        shouldNotifyWhatsApp: true,
        relatedId: eventRecord.id
      });
    }
  } catch (error) {
    const { error: rollbackEventError } = await supabase
      .from("case_events")
      .delete()
      .eq("id", eventRecord.id);

    if (rollbackEventError) {
      console.error("[agenda.activity] Failed to rollback case event", {
        eventId: eventRecord.id,
        message: rollbackEventError.message
      });
    }

    throw error;
  }

  return {
    eventId: eventRecord.id,
    emailNotificationId: notificationResults.emailNotificationId,
    whatsappNotificationId: notificationResults.whatsappNotificationId,
    notificationSkipped: notificationResults.skipped,
    notificationErrors: notificationResults.errors
  };
}

async function recordAppointmentHistory(input: {
  appointmentId: string;
  caseId: string;
  clientId: string;
  changeType: AppointmentChangeType;
  currentState: AppointmentState;
  previousState: AppointmentState | null;
  changedFields: string[];
  actorProfileId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: historyRecord, error: historyError } = await supabase
    .from("appointment_history")
    .insert({
      appointment_id: input.appointmentId,
      case_id: input.caseId,
      client_id: input.clientId,
      change_type: input.changeType,
      title: input.currentState.title,
      description: input.currentState.description || null,
      appointment_type: input.currentState.appointmentType,
      starts_at: input.currentState.startsAt,
      status: input.currentState.status,
      visible_to_client: input.currentState.visibleToClient,
      changed_fields: input.changedFields,
      previous_state: input.previousState || {},
      current_state: input.currentState,
      changed_by: input.actorProfileId
    })
    .select("id")
    .single();

  if (historyError || !historyRecord) {
    throw new Error(
      historyError?.message || "Nao foi possivel registrar o historico do compromisso."
    );
  }

  return historyRecord.id;
}

async function rollbackAppointmentArtifacts(input: {
  appointmentId?: string | null;
  eventId?: string | null;
  notificationId?: string | null;
  historyId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();

  if (input.notificationId) {
    const { error: notificationError } = await supabase
      .from("notifications_outbox")
      .delete()
      .eq("id", input.notificationId);

    if (notificationError) {
      console.error("[agenda.rollback] Failed to rollback notification", {
        notificationId: input.notificationId,
        message: notificationError.message
      });
    }
  }

  if (input.eventId) {
    const { error: eventError } = await supabase
      .from("case_events")
      .delete()
      .eq("id", input.eventId);

    if (eventError) {
      console.error("[agenda.rollback] Failed to rollback event", {
        eventId: input.eventId,
        message: eventError.message
      });
    }
  }

  if (input.historyId) {
    const { error: historyError } = await supabase
      .from("appointment_history")
      .delete()
      .eq("id", input.historyId);

    if (historyError) {
      console.error("[agenda.rollback] Failed to rollback appointment history", {
        historyId: input.historyId,
        message: historyError.message
      });
    }
  }

  if (input.appointmentId) {
    const { error: appointmentError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", input.appointmentId);

    if (appointmentError) {
      console.error("[agenda.rollback] Failed to rollback appointment", {
        appointmentId: input.appointmentId,
        message: appointmentError.message
      });
    }
  }
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
    entity_type: "appointments",
    entity_id: input.entityId,
    payload: input.payload
  });

  if (error) {
    throw new Error(`Nao foi possivel registrar a auditoria do compromisso: ${error.message}`);
  }
}

async function createVisibleAppointmentActivity(input: {
  changeType: AppointmentChangeType;
  currentState: AppointmentState;
  previousState: AppointmentState | null;
  changedFields: string[];
  appointmentId: string;
  caseId: string;
  clientId: string;
  actorProfileId: string;
  clientProfileId: string;
  clientEmail: string;
  shouldNotifyClient: boolean;
}) {
  const lifecycleMeta = buildAppointmentLifecycleMeta({
    changeType: input.changeType,
    currentState: input.currentState,
    previousState: input.previousState,
    changedFields: input.changedFields
  });

  return createAppointmentEvent({
    caseId: input.caseId,
    clientId: input.clientId,
    actorProfileId: input.actorProfileId,
    clientProfileId: input.clientProfileId,
    clientEmail: input.clientEmail,
    eventType: lifecycleMeta.eventType,
    title: lifecycleMeta.eventTitle,
    description: input.currentState.description,
    publicSummary: lifecycleMeta.publicSummary,
    startsAt: input.currentState.startsAt,
    shouldNotifyClient: input.shouldNotifyClient,
    payload: {
      source: "agenda",
      appointmentId: input.appointmentId,
      appointmentChangeType: input.changeType,
      changedFields: input.changedFields,
      previousStartsAt: input.previousState?.startsAt || null,
      appointmentType: input.currentState.appointmentType,
      status: input.currentState.status
    }
  });
}

async function updateAppointmentRecord(input: {
  appointmentId: string;
  currentState: AppointmentState;
}) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      title: input.currentState.title,
      appointment_type: input.currentState.appointmentType,
      notes: input.currentState.description || null,
      starts_at: input.currentState.startsAt,
      status: input.currentState.status,
      visible_to_client: input.currentState.visibleToClient
    })
    .eq("id", input.appointmentId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Nao foi possivel atualizar o compromisso.");
  }
}

export async function registerCaseAppointment(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = registerCaseAppointmentSchema.parse(rawInput);
  const currentState = buildAppointmentState({
    title: input.title,
    description: input.description,
    appointmentType: input.appointmentType,
    startsAt: input.startsAt,
    status: input.status,
    visibleToClient: input.visibleToClient
  });
  const shouldNotifyClient = currentState.visibleToClient && input.shouldNotifyClient;
  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  const { data: appointmentRecord, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      case_id: caseRecord.id,
      client_id: clientRecord.id,
      title: currentState.title,
      appointment_type: currentState.appointmentType,
      starts_at: currentState.startsAt,
      notes: currentState.description || null,
      status: currentState.status,
      visible_to_client: currentState.visibleToClient,
      created_by: actorProfileId
    })
    .select("id")
    .single();

  if (appointmentError || !appointmentRecord) {
    throw new Error(appointmentError?.message || "Nao foi possivel registrar o compromisso.");
  }

  let historyId: string | null = null;
  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    historyId = await recordAppointmentHistory({
      appointmentId: appointmentRecord.id,
      caseId: caseRecord.id,
      clientId: clientRecord.id,
      changeType: "created",
      currentState,
      previousState: null,
      changedFields: [
        "title",
        "description",
        "appointmentType",
        "startsAt",
        "status",
        "visibleToClient"
      ],
      actorProfileId
    });

    if (currentState.visibleToClient) {
      const activity = await createVisibleAppointmentActivity({
        changeType: "created",
        currentState,
        previousState: null,
        changedFields: [
          "title",
          "description",
          "appointmentType",
          "startsAt",
          "status",
          "visibleToClient"
        ],
        appointmentId: appointmentRecord.id,
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        shouldNotifyClient
      });

      eventId = activity.eventId;
      notificationId = activity.emailNotificationId || activity.whatsappNotificationId;
    }

    await createAuditLog({
      actorProfileId,
      action: "appointments.create",
      entityId: appointmentRecord.id,
      payload: {
        caseId: caseRecord.id,
        caseTitle: caseRecord.title,
        changeType: "created",
        changedFields: [
          "title",
          "description",
          "appointmentType",
          "startsAt",
          "status",
          "visibleToClient"
        ],
        eventId,
        notificationId
      }
    });
  } catch (error) {
    console.error("[agenda.create] Rolling back appointment after downstream failure", {
      caseId: caseRecord.id,
      appointmentId: appointmentRecord.id,
      historyId,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackAppointmentArtifacts({
      appointmentId: appointmentRecord.id,
      historyId,
      eventId,
      notificationId
    });
    throw error;
  }

  return {
    appointmentId: appointmentRecord.id,
    historyId,
    eventId,
    notificationId
  };
}

export async function updateCaseAppointment(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = updateCaseAppointmentSchema.parse(rawInput);
  const context = await resolveAppointmentContext(input.appointmentId);
  const previousState = buildAppointmentState({
    title: context.appointmentRecord.title,
    description: context.appointmentRecord.notes,
    appointmentType: context.appointmentRecord.appointment_type,
    startsAt: context.appointmentRecord.starts_at,
    status: context.appointmentRecord.status,
    visibleToClient: context.appointmentRecord.visible_to_client
  });
  const currentState = buildAppointmentState({
    title: input.title,
    description: input.description,
    appointmentType: input.appointmentType,
    startsAt: input.startsAt,
    status: input.status,
    visibleToClient: input.visibleToClient
  });
  const changedFields = listChangedFields(previousState, currentState);

  if (!changedFields.length) {
    throw new Error("Nenhuma alteracao foi informada para este compromisso.");
  }

  const changeType = resolveAppointmentChangeType(previousState, currentState);
  const shouldNotifyClient = currentState.visibleToClient && input.shouldNotifyClient;

  await updateAppointmentRecord({
    appointmentId: context.appointmentRecord.id,
    currentState
  });

  let historyId: string | null = null;
  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    historyId = await recordAppointmentHistory({
      appointmentId: context.appointmentRecord.id,
      caseId: context.caseRecord.id,
      clientId: context.clientRecord.id,
      changeType,
      currentState,
      previousState,
      changedFields,
      actorProfileId
    });

    if (currentState.visibleToClient) {
      const activity = await createVisibleAppointmentActivity({
        changeType,
        currentState,
        previousState,
        changedFields,
        appointmentId: context.appointmentRecord.id,
        caseId: context.caseRecord.id,
        clientId: context.clientRecord.id,
        actorProfileId,
        clientProfileId: context.profileRecord.id,
        clientEmail: context.profileRecord.email || "",
        shouldNotifyClient
      });

      eventId = activity.eventId;
      notificationId = activity.emailNotificationId || activity.whatsappNotificationId;
    }

    await createAuditLog({
      actorProfileId,
      action: `appointments.${changeType}`,
      entityId: context.appointmentRecord.id,
      payload: {
        caseId: context.caseRecord.id,
        caseTitle: context.caseRecord.title,
        changeType,
        changedFields,
        previousState,
        currentState,
        eventId,
        notificationId
      }
    });
  } catch (error) {
    console.error("[agenda.update] Rolling back appointment after downstream failure", {
      appointmentId: context.appointmentRecord.id,
      historyId,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await updateAppointmentRecord({
      appointmentId: context.appointmentRecord.id,
      currentState: previousState
    });

    await rollbackAppointmentArtifacts({
      historyId,
      eventId,
      notificationId
    });

    throw error;
  }

  return {
    appointmentId: context.appointmentRecord.id,
    changeType,
    historyId,
    eventId,
    notificationId
  };
}

export async function cancelCaseAppointment(rawInput: unknown, actorProfileId: string) {
  const input = { appointmentId: String(rawInput) };
  const context = await resolveAppointmentContext(input.appointmentId);

  return updateCaseAppointment(
    {
      appointmentId: input.appointmentId,
      title: context.appointmentRecord.title,
      appointmentType: context.appointmentRecord.appointment_type,
      description: context.appointmentRecord.notes || "",
      startsAt: context.appointmentRecord.starts_at,
      status: "cancelled",
      shouldNotifyClient: false,
      payload: {}
    },
    actorProfileId
  );
}

export async function listLatestAppointments(limit = 20) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id,case_id,client_id,title,appointment_type,status,visible_to_client,starts_at,notes,created_at,updated_at"
    )
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Nao foi possivel listar os compromissos: ${error.message}`);
  }

  return data || [];
}

export async function listLatestAppointmentHistory(limit = 20) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("appointment_history")
    .select(
      "id,appointment_id,case_id,client_id,change_type,title,appointment_type,status,visible_to_client,starts_at,changed_fields,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Nao foi possivel listar o historico da agenda: ${error.message}`);
  }

  return data || [];
}
