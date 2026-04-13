import "server-only";

import { recordProductEvent } from "./public-intake";
import type { SocialAcquisitionSnapshot } from "./social-acquisition";

export type CommercialFunnelStage =
  | "attention"
  | "entry"
  | "initial_conversation"
  | "triage_in_progress"
  | "triage_useful"
  | "consultation_intent_detected"
  | "consultation_suggested"
  | "consultation_accepted"
  | "scheduling_started"
  | "scheduling_completed"
  | "reminder_confirmation"
  | "attended"
  | "missed"
  | "reengagement"
  | "revenue_advanced"
  | "stalled"
  | "lost"
  | "paused";

export type CommercialLeadBucket = "cold" | "warm" | "hot";
export type ConsultationIntentLevel = "none" | "emerging" | "clear" | "accepted";
export type ConsultationInviteTiming = "too_early" | "appropriate" | "urgent_now";
export type ConsultationInviteState =
  | "not_ready"
  | "should_position_value"
  | "invite_now"
  | "awaiting_response"
  | "accepted";
export type SchedulingReadiness = "not_ready" | "partial" | "ready";
export type SchedulingStatus =
  | "not_started"
  | "interested"
  | "collecting_preferences"
  | "pending_confirmation"
  | "confirmed";
export type HumanHandoffMode =
  | "ia_only"
  | "ia_with_human_on_standby"
  | "human_ready"
  | "human_active";
export type PremiumFollowUpType =
  | "post_silence"
  | "post_useful_triage"
  | "post_consultation_invite"
  | "post_scheduling_started"
  | "pre_consultation_confirmation"
  | "no_show_reengagement"
  | "value_reassurance"
  | "human_follow_up";

export type CommercialFunnelSnapshot = {
  funnelStage: CommercialFunnelStage;
  stageLabel: string;
  leadBucket: CommercialLeadBucket;
  momentum: "low" | "moderate" | "strong";
  consultationIntentLevel: ConsultationIntentLevel;
  consultationInviteTiming: ConsultationInviteTiming;
  consultationInviteState: ConsultationInviteState;
  schedulingReadiness: SchedulingReadiness;
  schedulingStatus: SchedulingStatus;
  humanHandoffMode: HumanHandoffMode;
  shouldInviteConsultation: boolean;
  shouldHoldInvitation: boolean;
  shouldEscalateToHuman: boolean;
  humanHandoffReady: boolean;
  nextBestAction: string;
  nextBestActionDetail: string;
  operatorPriority: "monitor" | "important" | "priority";
  followUpType: PremiumFollowUpType;
  closeOpportunityState: "early" | "developing" | "active" | "advanced" | "won_or_handoff";
  consultationValueAngle: string;
  consultationInviteCopy: string;
  objectionsDetected: string[];
  hesitationSignals: string[];
  valueSignals: string[];
  urgencySignals: string[];
  summaryLine: string;
};

type BuildCommercialFunnelInput = {
  channel: string;
  messageText: string;
  leadStage: string;
  conversationState?: {
    conversionScore?: number;
    triageCompleteness?: number;
    leadTemperature?: string;
    priorityLevel?: string;
    recommendedAction?: string;
    commercialStatus?: string;
    commercialMomentDetected?: boolean;
    contactPreferences?: {
      channel?: string;
      period?: string;
      urgency?: string;
      availability?: string;
    };
    collectedData?: {
      nivel_urgencia?: string;
      prejuizo_ativo?: boolean;
      objetivo_cliente?: string;
    };
  } | null;
  conversationPolicy?: {
    state: string;
    triageStage: string;
    consultationStage: string;
    handoffAllowed: boolean;
    operationalHandoffRecorded: boolean;
    humanFollowUpPending: boolean;
    readyForLawyer: boolean;
    nextBestAction: string;
    schedulingComplete: boolean;
  } | null;
  acquisitionContext?: SocialAcquisitionSnapshot | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function detectSignals(messageText: string) {
  const normalized = normalizeText(messageText);

  const consultationIntentTerms = [
    "consulta",
    "agendar",
    "agendamento",
    "horario",
    "horario",
    "valor",
    "quanto custa",
    "quero resolver",
    "quero seguir",
    "quero atendimento",
    "quero falar com a advogada",
    "posso marcar"
  ];
  const hesitationTerms = [
    "preciso pensar",
    "vou pensar",
    "depois vejo",
    "tenho duvida",
    "tenho receio",
    "nao sei se",
    "nao tenho certeza",
    "talvez",
    "sera que vale"
  ];
  const objectionTerms = [
    "valor",
    "caro",
    "custa",
    "agora nao",
    "sem tempo",
    "nao posso",
    "nao tenho como"
  ];
  const valueTerms = [
    "faz sentido",
    "entendi",
    "quero resolver",
    "quero avancar",
    "isso ajuda",
    "melhor caminho",
    "quero marcar",
    "vamos seguir"
  ];
  const urgencyTerms = [
    "urgente",
    "hoje",
    "agora",
    "prazo",
    "bloqueio",
    "prejuizo",
    "desconto indevido",
    "ameaça",
    "violencia"
  ];

  return {
    consultationIntentSignals: consultationIntentTerms.filter((term) => normalized.includes(term)),
    hesitationSignals: hesitationTerms.filter((term) => normalized.includes(term)),
    objectionsDetected: objectionTerms.filter((term) => normalized.includes(term)),
    valueSignals: valueTerms.filter((term) => normalized.includes(term)),
    urgencySignals: urgencyTerms.filter((term) => normalized.includes(term))
  };
}

function inferLeadBucket(input: BuildCommercialFunnelInput, signals: ReturnType<typeof detectSignals>) {
  const explicit = normalizeText(input.conversationState?.leadTemperature);
  if (explicit === "hot" || explicit === "warm" || explicit === "cold") {
    return explicit as CommercialLeadBucket;
  }

  const score = typeof input.conversationState?.conversionScore === "number"
    ? input.conversationState.conversionScore
    : 0;

  if (
    input.conversationPolicy?.readyForLawyer ||
    signals.consultationIntentSignals.length >= 2 ||
    score >= 75
  ) {
    return "hot";
  }

  if (
    signals.consultationIntentSignals.length >= 1 ||
    signals.valueSignals.length >= 1 ||
    score >= 45
  ) {
    return "warm";
  }

  return "cold";
}

function inferConsultationIntentLevel(
  input: BuildCommercialFunnelInput,
  signals: ReturnType<typeof detectSignals>
): ConsultationIntentLevel {
  const stage = normalizeText(input.conversationPolicy?.consultationStage);

  if (
    stage === "scheduled_pending_confirmation" ||
    stage === "ready_for_lawyer" ||
    stage === "forwarded_to_lawyer"
  ) {
    return "accepted";
  }

  if (
    stage === "collecting_availability" ||
    stage === "availability_collected" ||
    signals.consultationIntentSignals.length >= 2
  ) {
    return "clear";
  }

  if (stage === "interest_detected" || stage === "offered" || signals.consultationIntentSignals.length >= 1) {
    return "emerging";
  }

  return "none";
}

function inferSchedulingStatus(input: BuildCommercialFunnelInput): SchedulingStatus {
  const stage = normalizeText(input.conversationPolicy?.consultationStage);
  const preferences = input.conversationState?.contactPreferences;
  const hasPreferences = Boolean(
    preferences?.availability || preferences?.period || preferences?.channel || preferences?.urgency
  );

  if (stage === "scheduled_pending_confirmation" || stage === "forwarded_to_lawyer") {
    return "confirmed";
  }

  if (stage === "ready_for_lawyer" || stage === "availability_collected") {
    return "pending_confirmation";
  }

  if (stage === "collecting_availability" || hasPreferences) {
    return "collecting_preferences";
  }

  if (stage === "interest_detected" || stage === "offered") {
    return "interested";
  }

  return "not_started";
}

function inferSchedulingReadiness(
  schedulingStatus: SchedulingStatus,
  input: BuildCommercialFunnelInput
): SchedulingReadiness {
  if (
    schedulingStatus === "pending_confirmation" ||
    schedulingStatus === "confirmed" ||
    input.conversationPolicy?.schedulingComplete
  ) {
    return "ready";
  }

  if (schedulingStatus === "collecting_preferences" || schedulingStatus === "interested") {
    return "partial";
  }

  return "not_ready";
}

function inferHumanHandoffMode(input: BuildCommercialFunnelInput): HumanHandoffMode {
  if (input.conversationPolicy?.operationalHandoffRecorded) {
    return "human_active";
  }

  if (input.conversationPolicy?.readyForLawyer || input.conversationPolicy?.handoffAllowed) {
    return "human_ready";
  }

  if (input.conversationPolicy?.humanFollowUpPending) {
    return "ia_with_human_on_standby";
  }

  return "ia_only";
}

function inferFunnelStage(
  input: BuildCommercialFunnelInput,
  consultationIntentLevel: ConsultationIntentLevel,
  schedulingStatus: SchedulingStatus
): CommercialFunnelStage {
  const state = normalizeText(input.conversationPolicy?.state);
  const triageCompleteness = typeof input.conversationState?.triageCompleteness === "number"
    ? input.conversationState.triageCompleteness
    : 0;

  if (state === "handed_off_to_lawyer") return "revenue_advanced";
  if (state === "lawyer_notified" || state === "consultation_ready") return "consultation_accepted";
  if (schedulingStatus === "confirmed") return "scheduling_completed";
  if (schedulingStatus === "pending_confirmation" || schedulingStatus === "collecting_preferences") {
    return "scheduling_started";
  }
  if (state === "consultation_offer" && consultationIntentLevel !== "none") {
    return "consultation_suggested";
  }
  if (consultationIntentLevel === "clear") return "consultation_intent_detected";
  if (triageCompleteness >= 65 || state === "explanation_in_progress") return "triage_useful";
  if (state === "triage_in_progress" || triageCompleteness >= 25) return "triage_in_progress";
  if (input.leadStage === "engaged" || state === "ai_active") return "initial_conversation";
  if (input.acquisitionContext) return "entry";
  return "attention";
}

function toStageLabel(stage: CommercialFunnelStage) {
  const labels: Record<CommercialFunnelStage, string> = {
    attention: "Atencao",
    entry: "Entrada",
    initial_conversation: "Conversa inicial",
    triage_in_progress: "Triagem em progresso",
    triage_useful: "Triagem util",
    consultation_intent_detected: "Intencao de consulta detectada",
    consultation_suggested: "Consulta sugerida",
    consultation_accepted: "Consulta aceita",
    scheduling_started: "Agendamento em andamento",
    scheduling_completed: "Agendamento concluido",
    reminder_confirmation: "Lembrete e confirmacao",
    attended: "Comparecimento",
    missed: "Ausencia",
    reengagement: "Reengajamento",
    revenue_advanced: "Avanco comercial real",
    stalled: "Travado",
    lost: "Perdido",
    paused: "Pausado"
  };

  return labels[stage];
}

function inferMomentum(
  stage: CommercialFunnelStage,
  leadBucket: CommercialLeadBucket,
  hesitationSignals: string[]
): "low" | "moderate" | "strong" {
  if (
    ["consultation_accepted", "scheduling_started", "scheduling_completed", "revenue_advanced"].includes(stage)
  ) {
    return "strong";
  }

  if (leadBucket === "hot" && hesitationSignals.length === 0) {
    return "strong";
  }

  if (leadBucket === "warm" || stage === "triage_useful" || stage === "consultation_suggested") {
    return "moderate";
  }

  return "low";
}

function inferInviteTiming(
  stage: CommercialFunnelStage,
  consultationIntentLevel: ConsultationIntentLevel,
  hesitationSignals: string[],
  objectionsDetected: string[]
): ConsultationInviteTiming {
  if (
    ["consultation_intent_detected", "consultation_suggested", "consultation_accepted", "scheduling_started"].includes(
      stage
    ) &&
    hesitationSignals.length === 0
  ) {
    return "urgent_now";
  }

  if (
    consultationIntentLevel !== "none" ||
    stage === "triage_useful" ||
    (stage === "triage_in_progress" && objectionsDetected.length === 0)
  ) {
    return "appropriate";
  }

  return "too_early";
}

function inferInviteState(
  consultationIntentLevel: ConsultationIntentLevel,
  inviteTiming: ConsultationInviteTiming,
  schedulingStatus: SchedulingStatus
): ConsultationInviteState {
  if (consultationIntentLevel === "accepted" || schedulingStatus === "confirmed") {
    return "accepted";
  }

  if (schedulingStatus === "interested" || schedulingStatus === "collecting_preferences") {
    return "awaiting_response";
  }

  if (inviteTiming === "urgent_now") {
    return "invite_now";
  }

  if (inviteTiming === "appropriate") {
    return "should_position_value";
  }

  return "not_ready";
}

function inferFollowUpType(
  stage: CommercialFunnelStage,
  handoffMode: HumanHandoffMode,
  schedulingStatus: SchedulingStatus,
  hesitationSignals: string[]
): PremiumFollowUpType {
  if (handoffMode === "human_active" || handoffMode === "human_ready") {
    return "human_follow_up";
  }

  if (stage === "scheduling_started" || schedulingStatus === "collecting_preferences") {
    return "post_scheduling_started";
  }

  if (stage === "consultation_suggested" || stage === "consultation_intent_detected") {
    return hesitationSignals.length > 0 ? "value_reassurance" : "post_consultation_invite";
  }

  if (stage === "triage_useful") {
    return "post_useful_triage";
  }

  return "post_silence";
}

function inferCloseOpportunityState(stage: CommercialFunnelStage): CommercialFunnelSnapshot["closeOpportunityState"] {
  if (stage === "revenue_advanced") return "won_or_handoff";
  if (["consultation_accepted", "scheduling_started", "scheduling_completed"].includes(stage)) {
    return "advanced";
  }
  if (["consultation_intent_detected", "consultation_suggested", "triage_useful"].includes(stage)) {
    return "active";
  }
  if (stage === "triage_in_progress" || stage === "initial_conversation") {
    return "developing";
  }
  return "early";
}

function buildConsultationValueAngle(
  input: BuildCommercialFunnelInput,
  objectionsDetected: string[],
  urgencySignals: string[]
) {
  if (urgencySignals.length > 0) {
    return "seguranca para decidir rapido sem improviso";
  }

  if (objectionsDetected.some((item) => item.includes("valor") || item.includes("custa"))) {
    return "clareza sobre o que vale a pena fazer antes de gastar energia no caminho errado";
  }

  if (normalizeText(input.acquisitionContext?.topic).includes("previd")) {
    return "leitura tecnica cuidadosa para evitar perder detalhe importante do caso";
  }

  return "orientacao individual com clareza, discricao e proximo passo bem definido";
}

function buildConsultationInviteCopy(args: {
  inviteState: ConsultationInviteState;
  schedulingStatus: SchedulingStatus;
  valueAngle: string;
  leadBucket: CommercialLeadBucket;
}) {
  if (args.inviteState === "accepted" || args.schedulingStatus === "confirmed") {
    return "A consulta ja entrou em fase de confirmacao, entao agora o foco e preservar contexto, alinhar horario e evitar no-show.";
  }

  if (args.schedulingStatus === "collecting_preferences") {
    return "Faz sentido avancarmos com a consulta e eu deixo isso organizado com o horario que funciona melhor para voce.";
  }

  if (args.inviteState === "invite_now") {
    return `Pelo que voce me contou, o proximo passo ideal e uma consulta com mais cuidado, porque ela traz ${args.valueAngle}. Se fizer sentido, eu ja organizo essa continuidade com voce.`;
  }

  if (args.inviteState === "should_position_value") {
    return `Seu caso ja mostra elementos que pedem uma analise mais cuidadosa. Quando avancamos para a consulta, conseguimos trazer ${args.valueAngle} sem atropelar o seu tempo.`;
  }

  return args.leadBucket === "cold"
    ? "Ainda e cedo para forcar convite. O melhor aqui e continuar acolhendo, organizar a triagem e reduzir inseguranca antes de propor consulta."
    : "Ainda falta consolidar contexto suficiente antes do convite. Vale aprofundar o essencial e so depois abrir a proxima etapa.";
}

function buildNextBestAction(snapshot: {
  stage: CommercialFunnelStage;
  inviteState: ConsultationInviteState;
  schedulingStatus: SchedulingStatus;
  handoffMode: HumanHandoffMode;
  objectionsDetected: string[];
  hesitationSignals: string[];
}) {
  if (snapshot.handoffMode === "human_active") {
    return {
      action: "await_human_follow_up",
      detail: "A equipe humana ja entrou no circuito. Agora o foco e nao perder contexto nem velocidade."
    };
  }

  if (snapshot.handoffMode === "human_ready") {
    return {
      action: "prepare_human_handoff",
      detail: "O caso ja esta pronto para maos humanas, com contexto suficiente para nao reabrir conversa do zero."
    };
  }

  if (snapshot.schedulingStatus === "collecting_preferences") {
    return {
      action: "finalize_scheduling",
      detail: "Feche horario, turno ou canal preferido e remova friccao antes que o lead esfrie."
    };
  }

  if (snapshot.inviteState === "invite_now") {
    return {
      action: "invite_consultation",
      detail: "A conversa ja sustenta um convite premium para consulta, com valor claro e sem pressao."
    };
  }

  if (snapshot.inviteState === "should_position_value") {
    return {
      action: "position_consultation_value",
      detail: "Antes de insistir em agenda, reforce por que a consulta faz sentido agora neste caso."
    };
  }

  if (snapshot.objectionsDetected.length > 0 || snapshot.hesitationSignals.length > 0) {
    return {
      action: "reduce_friction",
      detail: "Ha hesitacao ou objecao no ar. Vale responder com seguranca, clareza e um CTA leve."
    };
  }

  if (snapshot.stage === "triage_in_progress") {
    return {
      action: "continue_triage",
      detail: "Ainda precisamos de mais contexto para convidar no momento certo, sem parecer precoce."
    };
  }

  return {
    action: "maintain_conversation",
    detail: "Siga com condução curta, elegante e orientada a avancar a conversa sem barulho."
  };
}

export function buildCommercialFunnelSnapshot(
  input: BuildCommercialFunnelInput
): CommercialFunnelSnapshot {
  const signals = detectSignals(input.messageText);
  const leadBucket = inferLeadBucket(input, signals);
  const consultationIntentLevel = inferConsultationIntentLevel(input, signals);
  const schedulingStatus = inferSchedulingStatus(input);
  const schedulingReadiness = inferSchedulingReadiness(schedulingStatus, input);
  const handoffMode = inferHumanHandoffMode(input);
  const funnelStage = inferFunnelStage(input, consultationIntentLevel, schedulingStatus);
  const momentum = inferMomentum(funnelStage, leadBucket, signals.hesitationSignals);
  const consultationInviteTiming = inferInviteTiming(
    funnelStage,
    consultationIntentLevel,
    signals.hesitationSignals,
    signals.objectionsDetected
  );
  const consultationInviteState = inferInviteState(
    consultationIntentLevel,
    consultationInviteTiming,
    schedulingStatus
  );
  const shouldInviteConsultation =
    consultationInviteState === "invite_now" ||
    (consultationInviteState === "should_position_value" && leadBucket !== "cold");
  const shouldHoldInvitation = consultationInviteTiming === "too_early";
  const humanHandoffReady = handoffMode === "human_ready" || handoffMode === "human_active";
  const shouldEscalateToHuman =
    humanHandoffReady ||
    signals.urgencySignals.length >= 2 ||
    (signals.objectionsDetected.length > 0 && leadBucket === "hot");
  const valueAngle = buildConsultationValueAngle(input, signals.objectionsDetected, signals.urgencySignals);
  const consultationInviteCopy = buildConsultationInviteCopy({
    inviteState: consultationInviteState,
    schedulingStatus,
    valueAngle,
    leadBucket
  });
  const nextBest = buildNextBestAction({
    stage: funnelStage,
    inviteState: consultationInviteState,
    schedulingStatus,
    handoffMode,
    objectionsDetected: signals.objectionsDetected,
    hesitationSignals: signals.hesitationSignals
  });

  const operatorPriority: CommercialFunnelSnapshot["operatorPriority"] =
    humanHandoffReady || leadBucket === "hot" ? "priority" : leadBucket === "warm" ? "important" : "monitor";

  const followUpType = inferFollowUpType(
    funnelStage,
    handoffMode,
    schedulingStatus,
    signals.hesitationSignals
  );

  return {
    funnelStage,
    stageLabel: toStageLabel(funnelStage),
    leadBucket,
    momentum,
    consultationIntentLevel,
    consultationInviteTiming,
    consultationInviteState,
    schedulingReadiness,
    schedulingStatus,
    humanHandoffMode: handoffMode,
    shouldInviteConsultation,
    shouldHoldInvitation,
    shouldEscalateToHuman,
    humanHandoffReady,
    nextBestAction: nextBest.action,
    nextBestActionDetail: nextBest.detail,
    operatorPriority,
    followUpType,
    closeOpportunityState: inferCloseOpportunityState(funnelStage),
    consultationValueAngle: valueAngle,
    consultationInviteCopy,
    objectionsDetected: signals.objectionsDetected,
    hesitationSignals: signals.hesitationSignals,
    valueSignals: signals.valueSignals,
    urgencySignals: signals.urgencySignals,
    summaryLine: `${toStageLabel(funnelStage)} | lead ${leadBucket} | consulta ${consultationInviteState} | agenda ${schedulingStatus}`
  };
}

export function applyCommercialInviteRefinement(
  replyText: string,
  snapshot: CommercialFunnelSnapshot
) {
  const normalizedReply = normalizeText(replyText);

  if (snapshot.shouldHoldInvitation) {
    return replyText;
  }

  if (
    snapshot.shouldInviteConsultation &&
    !normalizedReply.includes("consulta") &&
    !normalizedReply.includes("agendar")
  ) {
    return `${replyText}\n\n${snapshot.consultationInviteCopy}`;
  }

  return replyText;
}

type TrackCommercialEventInput = {
  eventName: string;
  sessionId?: string | null;
  intakeRequestId?: string | null;
  acquisitionContext?: SocialAcquisitionSnapshot | null;
  snapshot: CommercialFunnelSnapshot;
  payload?: Record<string, unknown>;
};

export async function trackCommercialEvent(input: TrackCommercialEventInput) {
  try {
    return await recordProductEvent({
      eventKey: input.eventName,
      eventGroup: "revenue_funnel",
      sessionId: input.sessionId || undefined,
      intakeRequestId: input.intakeRequestId || undefined,
      payload: {
        funnelStage: input.snapshot.funnelStage,
        stageLabel: input.snapshot.stageLabel,
        leadBucket: input.snapshot.leadBucket,
        momentum: input.snapshot.momentum,
        consultationIntentLevel: input.snapshot.consultationIntentLevel,
        consultationInviteTiming: input.snapshot.consultationInviteTiming,
        consultationInviteState: input.snapshot.consultationInviteState,
        schedulingReadiness: input.snapshot.schedulingReadiness,
        schedulingStatus: input.snapshot.schedulingStatus,
        humanHandoffMode: input.snapshot.humanHandoffMode,
        humanHandoffReady: input.snapshot.humanHandoffReady,
        followUpType: input.snapshot.followUpType,
        operatorPriority: input.snapshot.operatorPriority,
        closeOpportunityState: input.snapshot.closeOpportunityState,
        source: input.acquisitionContext?.source || null,
        campaign: input.acquisitionContext?.campaign || null,
        topic: input.acquisitionContext?.topic || null,
        contentId: input.acquisitionContext?.contentId || null,
        contentType: input.acquisitionContext?.contentType || null,
        ...input.payload
      }
    });
  } catch (error) {
    console.error("[commercial-funnel] failed to track event", {
      eventName: input.eventName,
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
