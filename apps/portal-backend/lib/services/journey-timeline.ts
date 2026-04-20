import "server-only";

import { createServerSupabaseClient } from "../supabase/server";
import { normalizeJourneyTaxonomy } from "../journey/taxonomy";
import {
  presentOperationalChannelLabel,
  presentOperationalSourceLabel
} from "../channels/channel-presentation";

export type JourneyTimelineItem = {
  id: string;
  occurredAt: string;
  kicker: string;
  title: string;
  detail: string;
  meta: string[];
  tone: "success" | "warning" | "muted" | "accent";
  actionHref?: string;
  actionLabel?: string;
};

type IntakeRecord = {
  id: string;
  status: string;
  lead_score: number | null;
  lead_temperature: string | null;
  readiness_level: string | null;
  metadata: Record<string, unknown> | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type PipelineRecord = {
  id: string;
  client_id: string;
  stage: string | null;
  source_channel: string | null;
  recommended_action: string | null;
  consultation_readiness: string | null;
  scheduling_state: string | null;
  closing_state: string | null;
  next_follow_up_at: string | null;
  last_contact_at: string | null;
  updated_at?: string | null;
};

type ProductEventRecord = {
  id: string;
  event_key: string;
  payload: Record<string, unknown> | null;
  page_path: string | null;
  occurred_at: string;
};

type FollowUpRecord = {
  id: string;
  channel: string | null;
  message_type: string | null;
  status: string | null;
  scheduled_for: string | null;
  created_at: string;
};

type SessionRecord = {
  id: string;
  channel: string | null;
  thread_status: string | null;
  waiting_for: string | null;
  current_intent: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
};

type AppointmentRecord = {
  id: string;
  status: string;
  starts_at: string;
  created_at: string;
};

function formatEnum(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapEventTone(eventKey: string) {
  if (
    [
      "lead_created",
      "lead_qualified",
      "appointment_started",
      "consultation_confirmed",
      "payment_approved"
    ].includes(eventKey)
  ) {
    return "success" as const;
  }

  if (["triage_started", "cta_start_triage_clicked", "cta_whatsapp_clicked"].includes(eventKey)) {
    return "accent" as const;
  }

  return "muted" as const;
}

export async function buildClientJourneyTimeline(input: {
  clientId: string;
  intakeRequestId?: string | null;
}): Promise<JourneyTimelineItem[]> {
  const supabase = await createServerSupabaseClient();
  const intakeRequestId = input.intakeRequestId || null;

  const [
    intakeResult,
    pipelineResult,
    eventResult,
    followUpResult,
    sessionResult,
    appointmentResult
  ] = await Promise.all([
    intakeRequestId
      ? supabase
          .from("intake_requests")
          .select("id,status,lead_score,lead_temperature,readiness_level,metadata,submitted_at,reviewed_at")
          .eq("id", intakeRequestId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("client_pipeline")
      .select("id,client_id,stage,source_channel,recommended_action,consultation_readiness,scheduling_state,closing_state,next_follow_up_at,last_contact_at,updated_at")
      .eq("client_id", input.clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    intakeRequestId
      ? supabase
          .from("product_events")
          .select("id,event_key,payload,page_path,occurred_at")
          .eq("intake_request_id", intakeRequestId)
          .order("occurred_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("follow_up_messages")
      .select("id,channel,message_type,status,scheduled_for,created_at")
      .eq("client_id", input.clientId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("conversation_sessions")
      .select("id,channel,thread_status,waiting_for,current_intent,last_message_at,last_message_preview,created_at")
      .eq("client_id", input.clientId)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("appointments")
      .select("id,status,starts_at,created_at")
      .eq("client_id", input.clientId)
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  if (intakeResult.error) {
    throw new Error(intakeResult.error.message);
  }
  if (pipelineResult.error) {
    throw new Error(pipelineResult.error.message);
  }
  if (eventResult.error) {
    throw new Error(eventResult.error.message);
  }
  if (followUpResult.error) {
    throw new Error(followUpResult.error.message);
  }
  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }
  if (appointmentResult.error) {
    throw new Error(appointmentResult.error.message);
  }

  const intake = (intakeResult.data || null) as IntakeRecord | null;
  const pipeline = (pipelineResult.data || null) as PipelineRecord | null;
  const events = (eventResult.data || []) as ProductEventRecord[];
  const followUps = (followUpResult.data || []) as FollowUpRecord[];
  const sessions = (sessionResult.data || []) as SessionRecord[];
  const appointments = (appointmentResult.data || []) as AppointmentRecord[];

  const items: JourneyTimelineItem[] = [];

  if (intake) {
    const taxonomy = normalizeJourneyTaxonomy({ metadata: intake.metadata, pipeline });

    items.push({
      id: `intake-${intake.id}`,
      occurredAt: intake.submitted_at,
      kicker: "Entrada",
      title: "Lead entrou na operacao",
      detail: `Origem ${presentOperationalChannelLabel(taxonomy.channel, "Canal nao identificado")} com tema ${formatEnum(
        taxonomy.legalTopic,
        "Unknown"
      )}.`,
      meta: [
        `Score ${intake.lead_score || 0}`,
        formatEnum(intake.lead_temperature, "Cold"),
        formatEnum(intake.readiness_level, "Sem prontidao")
      ],
      tone: "accent"
    });

    if (intake.reviewed_at) {
      items.push({
        id: `intake-reviewed-${intake.id}`,
        occurredAt: intake.reviewed_at,
        kicker: "Triagem",
        title: "Triagem revisada pelo time",
        detail: `Status ${formatEnum(intake.status, "Em leitura")} com base no contexto de entrada preservado.`,
        meta: [formatEnum(intake.status, "Novo")],
        tone: intake.status === "converted" ? "success" : "muted"
      });
    }
  }

  for (const event of events) {
    const taxonomy = normalizeJourneyTaxonomy({ event: event.payload, metadata: intake?.metadata, pipeline });
    const detailParts = [
      taxonomy.primaryTouch !== "unknown"
        ? presentOperationalSourceLabel(taxonomy.primaryTouch, formatEnum(taxonomy.primaryTouch, "Unknown"))
        : taxonomy.channel !== "unknown"
          ? presentOperationalChannelLabel(taxonomy.channel, "Unknown")
          : "",
      taxonomy.legalTopic !== "unknown" ? formatEnum(taxonomy.legalTopic, "Unknown") : "",
      event.page_path || ""
    ].filter(Boolean);

    items.push({
      id: `event-${event.id}`,
      occurredAt: event.occurred_at,
      kicker: "Touch",
      title: formatEnum(event.event_key, event.event_key),
      detail: detailParts.join(" - ") || "Evento de jornada registrado no stack publico.",
      meta: [
        taxonomy.primaryTouch !== "unknown" ? `Touch ${formatEnum(taxonomy.primaryTouch, "Unknown")}` : "",
        taxonomy.campaign !== "organic" ? `Campanha ${formatEnum(taxonomy.campaign, taxonomy.campaign)}` : ""
      ].filter(Boolean),
      tone: mapEventTone(event.event_key)
    });
  }

  if (pipeline) {
    items.push({
      id: `pipeline-${pipeline.id}`,
      occurredAt: pipeline.updated_at || pipeline.last_contact_at || new Date().toISOString(),
      kicker: "Roteamento",
      title: formatEnum(pipeline.recommended_action, "Acao operacional definida"),
      detail: `Stage ${formatEnum(pipeline.stage, "Unknown")} com leitura ${formatEnum(
        pipeline.consultation_readiness,
        "Sem leitura"
      )}.`,
      meta: [
        formatEnum(pipeline.source_channel, "Canal desconhecido"),
        formatEnum(pipeline.scheduling_state, "Sem agenda"),
        formatEnum(pipeline.closing_state, "Sem fechamento")
      ],
      tone: pipeline.closing_state === "won" ? "success" : "warning"
    });

    if (pipeline.next_follow_up_at) {
      items.push({
        id: `pipeline-followup-${pipeline.id}`,
        occurredAt: pipeline.next_follow_up_at,
        kicker: "Retomada",
        title: "Nova retomada prevista",
        detail: "A continuidade comercial ficou registrada com janela explicita de follow-up.",
        meta: [formatEnum(pipeline.consultation_readiness, "Leitura atual")],
        tone: "warning"
      });
    }
  }

  for (const session of sessions) {
    items.push({
      id: `session-${session.id}`,
      occurredAt: session.last_message_at || session.created_at,
      kicker: "Inbox",
      title: `Conversa ${formatEnum(session.thread_status, "ativa")}`,
      detail:
        session.last_message_preview ||
        `Canal ${presentOperationalChannelLabel(session.channel, "Unknown")} em fluxo ${formatEnum(
          session.waiting_for,
          "none"
        )}.`,
      meta: [
        presentOperationalChannelLabel(session.channel, "Unknown"),
        formatEnum(session.current_intent, "Sem intencao mapeada"),
        formatEnum(session.waiting_for, "none")
      ],
      tone: session.waiting_for === "human" ? "warning" : "muted"
    });
  }

  for (const followUp of followUps) {
    items.push({
      id: `followup-${followUp.id}`,
      occurredAt: followUp.scheduled_for || followUp.created_at,
      kicker: "Follow-up",
      title: formatEnum(followUp.message_type, "Contato programado"),
      detail: `Canal ${presentOperationalChannelLabel(followUp.channel, "Unknown")} com status ${formatEnum(
        followUp.status,
        "Unknown"
      )}.`,
      meta: [
        formatEnum(followUp.status, "unknown"),
        presentOperationalChannelLabel(followUp.channel, "Unknown")
      ],
      tone:
        followUp.status === "replied" || followUp.status === "sent"
          ? "success"
          : followUp.status === "failed"
            ? "warning"
            : "muted"
    });
  }

  for (const appointment of appointments) {
    items.push({
      id: `appointment-${appointment.id}`,
      occurredAt: appointment.starts_at,
      kicker: "Agenda",
      title: `Consulta ${formatEnum(appointment.status, "agendada")}`,
      detail: "A jornada avancou para agenda formal com historico pronto para auditoria.",
      meta: [formatEnum(appointment.status, "Unknown")],
      tone: appointment.status === "completed" ? "success" : "accent"
    });
  }

  return items
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 14);
}
