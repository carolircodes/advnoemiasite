import { normalizeJourneyTaxonomy, type JourneyTaxonomy } from "../journey/taxonomy.ts";

export type ContextRoutingInput = {
  score: number;
  temperature?: string | null;
  readiness?: string | null;
  topic?: string | null;
  sourceChannel?: string | null;
  funnelStage?: string | null;
  preferredChannel?: string | null;
  appointmentInterest?: boolean | null;
  lifecycleStage?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ContextRoutingDecision = {
  ctaVariant: string;
  copyVariant: string;
  intakeMode: string;
  followUpTrack: string;
  responsibleLane: string;
  priorityChannel: string;
  suggestedContentTrack: string;
  recommendedAction: string;
  why: string[];
  taxonomy: JourneyTaxonomy;
};

export function buildContextRoutingDecision(
  input: ContextRoutingInput
): ContextRoutingDecision {
  const taxonomy = normalizeJourneyTaxonomy({
    metadata: input.metadata,
    defaults: {
      channel: (input.sourceChannel as JourneyTaxonomy["channel"]) || undefined,
      legalTopic: input.topic || undefined,
      funnelStage: (input.funnelStage as JourneyTaxonomy["funnelStage"]) || undefined,
      preferredChannel: input.preferredChannel || undefined
    }
  });
  const score = Number.isFinite(input.score) ? input.score : 0;
  const temperature = (input.temperature || "cold").toLowerCase();
  const readiness = (input.readiness || "explorando").toLowerCase();
  const why: string[] = [];

  let ctaVariant = "contextual_triage";
  let copyVariant = "authority_clarity";
  let intakeMode = "guided_triage";
  let followUpTrack = "nurture";
  let responsibleLane = "growth_ops";
  let priorityChannel = taxonomy.preferredChannel !== "unknown" ? taxonomy.preferredChannel : taxonomy.channel;
  let suggestedContentTrack = taxonomy.legalTopic !== "unknown" ? taxonomy.legalTopic : "cluster-geral";
  let recommendedAction = "keep_warming";

  if (score >= 75 || temperature === "urgent") {
    ctaVariant = "schedule_consultation";
    copyVariant = "decisive_legal_direction";
    intakeMode = "fast_track_intake";
    followUpTrack = "high_intent_recovery";
    responsibleLane = "commercial_priority";
    recommendedAction = "human_outreach_now";
    why.push("score alto ou urgencia elevada");
  } else if (score >= 50 || ["hot", "warm"].includes(temperature)) {
    ctaVariant = "case_diagnosis";
    copyVariant = "consultive_progression";
    intakeMode = "smart_triage";
    followUpTrack = "consultation_invite";
    responsibleLane = "commercial_queue";
    recommendedAction = "offer_consultation";
    why.push("temperatura comercial acima do frio");
  } else {
    why.push("lead ainda precisa de aquecimento");
  }

  if (readiness.includes("pronto") || readiness.includes("urgencia")) {
    ctaVariant = "schedule_consultation";
    followUpTrack = "appointment_completion";
    recommendedAction = "complete_scheduling";
    why.push("prontidao indica intencao de agenda");
  }

  if (input.appointmentInterest) {
    intakeMode = "appointment_first";
    followUpTrack = "appointment_completion";
    recommendedAction = "confirm_appointment_interest";
    why.push("lead ja declarou interesse em agenda");
  }

  if (taxonomy.channel === "instagram" || taxonomy.channel === "facebook") {
    priorityChannel = priorityChannel === "unknown" ? "whatsapp" : priorityChannel;
    suggestedContentTrack = `${suggestedContentTrack}-social`;
    why.push("entrada social pede passagem rapida para canal de continuidade");
  }

  if (taxonomy.contentStage === "decision" || taxonomy.funnelStage === "appointment") {
    copyVariant = "bottom_funnel_decision";
    why.push("consumo de fundo de funil detectado");
  }

  if (input.lifecycleStage && input.lifecycleStage.includes("portal")) {
    followUpTrack = "portal_activation";
    responsibleLane = "customer_success";
    recommendedAction = "activate_portal_and_documents";
    why.push("jornada ja entrou em etapa de portal/retencao");
  }

  return {
    ctaVariant,
    copyVariant,
    intakeMode,
    followUpTrack,
    responsibleLane,
    priorityChannel: priorityChannel === "unknown" ? "whatsapp" : priorityChannel,
    suggestedContentTrack,
    recommendedAction,
    why,
    taxonomy
  };
}
