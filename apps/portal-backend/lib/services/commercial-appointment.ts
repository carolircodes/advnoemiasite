import "server-only";

import { createCaseForClient } from "./manage-cases";
import {
  registerCaseAppointment,
  updateCaseAppointment
} from "./manage-appointments";
import {
  evaluateFormalAppointmentRule,
  type ConsultationAppointmentState
} from "./commercial-appointment-rule";

type SyncFormalConsultationInput = {
  pipelineId: string;
  actorProfileId?: string | null;
  sessionId?: string | null;
  source:
    | "operational_manual"
    | "payment_webhook"
    | "payment_create"
    | "thread_context"
    | "system_sync";
  createEvent?: boolean;
};

type FormalConsultationResult = {
  caseId: string | null;
  appointmentId: string | null;
  appointmentState: ConsultationAppointmentState;
  consultationConfirmedAt: string | null;
  consultationPreconfirmedAt: string | null;
  confirmationSource: string | null;
  action:
    | "none"
    | "preconfirmed"
    | "created_case"
    | "created_appointment"
    | "confirmed_existing_appointment";
  reason: string;
};

type PipelineRow = {
  id: string;
  client_id: string;
  stage: string;
  area_interest: string | null;
  notes: string | null;
  summary: string | null;
  owner_profile_id: string | null;
  consultation_offer_state: string | null;
  scheduling_state: string | null;
  schedule_confirmed_at: string | null;
  desired_schedule_window: string | null;
  lead_schedule_preference: string | null;
  payment_state: string | null;
  payment_reference: string | null;
  payment_approved_at: string | null;
  payment_failed_at: string | null;
  payment_expired_at: string | null;
  payment_abandoned_at: string | null;
  consultation_confirmed_at: string | null;
  consultation_case_id: string | null;
  consultation_appointment_id: string | null;
  appointment_state: ConsultationAppointmentState | null;
  consultation_preconfirmed_at: string | null;
  appointment_created_at: string | null;
  appointment_confirmed_at: string | null;
  consultation_confirmation_source: string | null;
  consultation_offer_amount: number | null;
  clients: {
    id: string;
    full_name: string | null;
    phone: string | null;
    profile_id: string | null;
  } | null;
};

function mapAreaInterestToCaseArea(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized.includes("previd")) {
    return "previdenciario" as const;
  }

  if (
    normalized.includes("consum") ||
    normalized.includes("banc") ||
    normalized.includes("financ")
  ) {
    return "consumidor_bancario" as const;
  }

  if (normalized.includes("famil")) {
    return "familia" as const;
  }

  return "civil" as const;
}

function buildCaseTitle(clientName: string | null | undefined) {
  const safeName = (clientName || "lead").trim();
  return `Consulta comercial - ${safeName}`.slice(0, 160);
}

function buildAppointmentTitle(clientName: string | null | undefined) {
  const safeName = (clientName || "cliente").trim();
  return `Consulta inicial - ${safeName}`.slice(0, 160);
}

function buildCaseSummary(pipeline: PipelineRow) {
  const lines = [
    pipeline.summary,
    pipeline.notes,
    pipeline.desired_schedule_window
      ? `Janela combinada: ${pipeline.desired_schedule_window}.`
      : null,
    pipeline.lead_schedule_preference
      ? `Preferencia do lead: ${pipeline.lead_schedule_preference}.`
      : null,
    typeof pipeline.consultation_offer_amount === "number"
      ? `Valor de consulta registrado: R$ ${pipeline.consultation_offer_amount
          .toFixed(2)
          .replace(".", ",")}.`
      : null
  ].filter((value): value is string => Boolean(value && value.trim()));

  return lines.join("\n").slice(0, 2000);
}

class CommercialAppointmentService {
  async syncFormalConsultation(
    input: SyncFormalConsultationInput
  ): Promise<FormalConsultationResult | null> {
    const { createAdminSupabaseClient } = await import("../supabase/admin");
    const supabase = createAdminSupabaseClient();

    const { data: pipeline } = await supabase
      .from("client_pipeline")
      .select(
        `
        id,
        client_id,
        stage,
        area_interest,
        notes,
        summary,
        owner_profile_id,
        consultation_offer_state,
        scheduling_state,
        schedule_confirmed_at,
        desired_schedule_window,
        lead_schedule_preference,
        payment_state,
        payment_reference,
        payment_approved_at,
        payment_failed_at,
        payment_expired_at,
        payment_abandoned_at,
        consultation_confirmed_at,
        consultation_case_id,
        consultation_appointment_id,
        appointment_state,
        consultation_preconfirmed_at,
        appointment_created_at,
        appointment_confirmed_at,
        consultation_confirmation_source,
        consultation_offer_amount,
        clients!inner (
          id,
          full_name,
          phone,
          profile_id
        )
      `
      )
      .eq("id", input.pipelineId)
      .maybeSingle();

    const pipelineRow = (pipeline as PipelineRow | null) || null;

    if (!pipelineRow?.id || !pipelineRow.clients?.id) {
      return null;
    }

    const now = new Date().toISOString();
    const ownerProfileId = input.actorProfileId || pipelineRow.owner_profile_id;
    const rule = evaluateFormalAppointmentRule({
      ownerProfileId,
      schedulingState: pipelineRow.scheduling_state,
      scheduleConfirmedAt: pipelineRow.schedule_confirmed_at,
      paymentState: pipelineRow.payment_state,
      paymentApprovedAt: pipelineRow.payment_approved_at
    });
    const scheduleAt = pipelineRow.schedule_confirmed_at;
    const currentAppointmentState =
      pipelineRow.appointment_state || ("not_created" as ConsultationAppointmentState);
    const formalizerProfileId = ownerProfileId as string;

    if (rule.appointmentState === "not_created") {
      return {
        caseId: pipelineRow.consultation_case_id,
        appointmentId: pipelineRow.consultation_appointment_id,
        appointmentState: currentAppointmentState,
        consultationConfirmedAt: pipelineRow.consultation_confirmed_at,
        consultationPreconfirmedAt: pipelineRow.consultation_preconfirmed_at,
        confirmationSource: pipelineRow.consultation_confirmation_source,
        action: "none",
        reason: rule.reason
      };
    }

    if (!rule.shouldCreateAppointment) {
      const patch = {
        appointment_state: "preconfirmed",
        consultation_preconfirmed_at: pipelineRow.consultation_preconfirmed_at || now,
        consultation_confirmation_source: input.source,
        updated_at: now
      };

      await supabase.from("client_pipeline").update(patch).eq("id", pipelineRow.id);

      if (input.sessionId && input.createEvent) {
        await supabase.from("conversation_events").insert({
          session_id: input.sessionId,
          event_type: "commercial_appointment_preconfirmed",
          actor_type: "system",
          event_data: {
            pipelineId: pipelineRow.id,
            paymentState: pipelineRow.payment_state,
            schedulingState: pipelineRow.scheduling_state,
            summary:
              "Consulta preconfirmada: horario alinhado, mas ainda aguardando quitacao para appointment formal."
          }
        });
      }

      return {
        caseId: pipelineRow.consultation_case_id,
        appointmentId: pipelineRow.consultation_appointment_id,
        appointmentState: "preconfirmed",
        consultationConfirmedAt: pipelineRow.consultation_confirmed_at,
        consultationPreconfirmedAt: patch.consultation_preconfirmed_at,
        confirmationSource: input.source,
        action: "preconfirmed",
        reason: rule.reason
      };
    }

    let caseId = pipelineRow.consultation_case_id;
    let action: FormalConsultationResult["action"] = "none";
    const confirmedScheduleAt = scheduleAt as string;

    if (!caseId) {
      const createdCase = await createCaseForClient(
        {
          clientId: pipelineRow.client_id,
          area: mapAreaInterestToCaseArea(pipelineRow.area_interest),
          title: buildCaseTitle(pipelineRow.clients.full_name),
          summary: buildCaseSummary(pipelineRow),
          priority:
            ((pipelineRow.stage || "").trim().toLowerCase() === "qualified_for_consultation")
              ? "alta"
              : "normal",
          status: "triagem",
          visibleToClient: false,
          shouldNotifyClient: false
        },
        formalizerProfileId
      );

      caseId = createdCase.caseId;
      action = "created_case";
    }

    let appointmentId = pipelineRow.consultation_appointment_id;

    if (!appointmentId) {
      const createdAppointment = await registerCaseAppointment(
        {
          caseId: caseId as string,
          title: buildAppointmentTitle(pipelineRow.clients.full_name),
          appointmentType: "reuniao",
          description: buildCaseSummary(pipelineRow),
          startsAt: confirmedScheduleAt,
          status: "confirmed",
          visibleToClient: false,
          shouldNotifyClient: false
        },
        formalizerProfileId
      );

      appointmentId = createdAppointment.appointmentId;
      action = action === "created_case" ? "created_appointment" : "created_appointment";
    } else {
      const { data: existingAppointment } = await supabase
        .from("appointments")
        .select("id,title,appointment_type,notes,starts_at,status,visible_to_client")
        .eq("id", appointmentId)
        .maybeSingle();

      if (existingAppointment?.id) {
        await updateCaseAppointment(
          {
            appointmentId: existingAppointment.id,
            title: existingAppointment.title || buildAppointmentTitle(pipelineRow.clients.full_name),
            appointmentType: existingAppointment.appointment_type || "reuniao",
            description: existingAppointment.notes || buildCaseSummary(pipelineRow),
            startsAt: confirmedScheduleAt,
            status: "confirmed",
            visibleToClient: false,
            shouldNotifyClient: false
          },
          formalizerProfileId
        );

        action = "confirmed_existing_appointment";
      } else {
        const recreatedAppointment = await registerCaseAppointment(
          {
            caseId: caseId as string,
            title: buildAppointmentTitle(pipelineRow.clients.full_name),
            appointmentType: "reuniao",
            description: buildCaseSummary(pipelineRow),
            startsAt: confirmedScheduleAt,
            status: "confirmed",
            visibleToClient: false,
            shouldNotifyClient: false
          },
          formalizerProfileId
        );

        appointmentId = recreatedAppointment.appointmentId;
        action = "created_appointment";
      }
    }

    const confirmationAt = pipelineRow.consultation_confirmed_at || now;
    const patch = {
      stage: "consultation_scheduled",
      consultation_case_id: caseId,
      consultation_appointment_id: appointmentId,
      appointment_state: "confirmed",
      consultation_preconfirmed_at: pipelineRow.consultation_preconfirmed_at || now,
      appointment_created_at: pipelineRow.appointment_created_at || now,
      appointment_confirmed_at: now,
      consultation_confirmed_at: confirmationAt,
      consultation_confirmation_source: input.source,
      consultation_scheduled_at: scheduleAt,
      consultation_offer_state: "confirmed",
      scheduling_state: "confirmed",
      payment_state: "approved",
      follow_up_status: "completed",
      follow_up_state: "completed",
      waiting_on: "none",
      updated_at: now
    };

    await supabase.from("client_pipeline").update(patch).eq("id", pipelineRow.id);

    const eventSessionId = input.sessionId || null;
    if (eventSessionId && input.createEvent) {
      await supabase.from("conversation_events").insert({
        session_id: eventSessionId,
        event_type: "commercial_appointment_confirmed",
        actor_type: "system",
        event_data: {
          pipelineId: pipelineRow.id,
          caseId,
          appointmentId,
          paymentReference: pipelineRow.payment_reference,
          source: input.source,
          summary:
            "Consulta formalizada com appointment confirmado e conciliado com o pagamento."
        }
      });
    }

    return {
      caseId,
      appointmentId,
      appointmentState: "confirmed",
      consultationConfirmedAt: confirmationAt,
      consultationPreconfirmedAt: patch.consultation_preconfirmed_at,
      confirmationSource: input.source,
      action,
      reason:
        "Pagamento aprovado e horario confirmado foram conciliados com case e appointment formais."
    };
  }
}

export const commercialAppointmentService = new CommercialAppointmentService();
