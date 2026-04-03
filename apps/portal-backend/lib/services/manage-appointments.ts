import "server-only";

import {
  appointmentStatusLabels,
  appointmentTypeLabels,
  registerCaseAppointmentSchema
} from "@/lib/domain/portal";
import { queueCaseEventNotification } from "@/lib/notifications/outbox";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

async function createAppointmentEvent(input: {
  caseId: string;
  clientId: string;
  actorProfileId: string;
  clientProfileId: string;
  clientEmail: string;
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
      event_type: "new_appointment",
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

  let notificationId: string | null = null;

  try {
    if (input.shouldNotifyClient && input.clientEmail) {
      const notification = await queueCaseEventNotification({
        clientProfileId: input.clientProfileId,
        clientEmail: input.clientEmail,
        eventType: "new_appointment",
        title: input.title,
        publicSummary: input.publicSummary,
        relatedId: eventRecord.id
      });

      notificationId = notification.id;
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
    notificationId
  };
}

async function rollbackAppointmentArtifacts(appointmentId: string, eventId: string | null, notificationId: string | null) {
  const supabase = createAdminSupabaseClient();

  if (notificationId) {
    const { error: notificationError } = await supabase
      .from("notifications_outbox")
      .delete()
      .eq("id", notificationId);

    if (notificationError) {
      console.error("[agenda.rollback] Failed to rollback notification", {
        notificationId,
        message: notificationError.message
      });
    }
  }

  if (eventId) {
    const { error: eventError } = await supabase.from("case_events").delete().eq("id", eventId);

    if (eventError) {
      console.error("[agenda.rollback] Failed to rollback event", {
        eventId,
        message: eventError.message
      });
    }
  }

  const { error: appointmentError } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (appointmentError) {
    console.error("[agenda.rollback] Failed to rollback appointment", {
      appointmentId,
      message: appointmentError.message
    });
  }
}

export async function registerCaseAppointment(rawInput: unknown, actorProfileId: string) {
  const input = registerCaseAppointmentSchema.parse(rawInput);
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;
  const startsAt = new Date(input.startsAt).toISOString();

  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  const { data: appointmentRecord, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      case_id: caseRecord.id,
      client_id: clientRecord.id,
      title: input.title,
      appointment_type: input.appointmentType,
      starts_at: startsAt,
      notes: input.description || null,
      status: input.status,
      visible_to_client: visibleToClient,
      created_by: actorProfileId
    })
    .select("id,title,appointment_type,status,visible_to_client,starts_at")
    .single();

  if (appointmentError || !appointmentRecord) {
    throw new Error(appointmentError?.message || "Nao foi possivel registrar o compromisso.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    if (visibleToClient) {
      const publicSummary =
        input.description ||
        `${appointmentTypeLabels[input.appointmentType]} ${appointmentStatusLabels[input.status].toLowerCase()} para ${new Intl.DateTimeFormat(
          "pt-BR",
          { dateStyle: "medium", timeStyle: "short" }
        ).format(new Date(startsAt))}.`;

      const activity = await createAppointmentEvent({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        title: `${appointmentTypeLabels[input.appointmentType]}: ${input.title}`,
        description: input.description,
        publicSummary,
        startsAt,
        shouldNotifyClient,
        payload: {
          source: "agenda",
          appointmentId: appointmentRecord.id,
          appointmentType: input.appointmentType,
          status: input.status
        }
      });

      eventId = activity.eventId;
      notificationId = activity.notificationId;
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: actorProfileId,
      action: "appointments.create",
      entity_type: "appointments",
      entity_id: appointmentRecord.id,
      payload: {
        caseId: caseRecord.id,
        caseTitle: caseRecord.title,
        appointmentType: input.appointmentType,
        status: input.status,
        visibleToClient,
        startsAt,
        eventId,
        notificationId
      }
    });

    if (auditError) {
      throw new Error(
        `Nao foi possivel registrar a auditoria do compromisso: ${auditError.message}`
      );
    }
  } catch (error) {
    console.error("[agenda.create] Rolling back appointment after downstream failure", {
      caseId: caseRecord.id,
      appointmentId: appointmentRecord.id,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackAppointmentArtifacts(appointmentRecord.id, eventId, notificationId);
    throw error;
  }

  return {
    appointmentId: appointmentRecord.id,
    eventId,
    notificationId
  };
}

export async function listLatestAppointments(limit = 20) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id,case_id,client_id,title,appointment_type,status,visible_to_client,starts_at,created_at"
    )
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Nao foi possivel listar os compromissos: ${error.message}`);
  }

  return data || [];
}
