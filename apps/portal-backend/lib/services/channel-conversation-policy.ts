import type { ConversationState } from "../ai/noemia-core";
import type { ConversationSession } from "./conversation-persistence";
import {
  extractStoredConversationSignals,
  hasCompleteSchedulingPreferences,
  hasSchedulingSignal,
  inferExplanationStage,
  type ConversationPolicyConsultationStage,
  type ConversationPolicyExplanationStage,
  type ConversationPolicyHandoffStatus,
  type ConversationPolicyState,
  type ConversationPolicyTriageStage
} from "./conversation-state";

export type ConversationPolicySummary = {
  state: ConversationPolicyState;
  triageStage: ConversationPolicyTriageStage;
  explanationStage: ConversationPolicyExplanationStage;
  consultationStage: ConversationPolicyConsultationStage;
  handoffStatus: ConversationPolicyHandoffStatus;
  handoffAllowed: boolean;
  handoffBlocked: boolean;
  handoffReason: string | null;
  handoffReasonCode: string | null;
  legitimateHandoff: boolean;
  sessionNeedsNormalization: boolean;
  normalizationReason: string | null;
  schedulingComplete: boolean;
  lawyerNotificationGenerated: boolean;
  readyForLawyer: boolean;
  aiShouldRespond: boolean;
  aiActiveOnChannel: boolean;
  operationalHandoffRecorded: boolean;
  humanFollowUpPending: boolean;
  followUpReady: boolean;
  nextBestAction:
    | "continue_triage"
    | "continue_explanation"
    | "offer_consultation"
    | "collect_scheduling_preferences"
    | "finalize_consultation"
    | "handoff_to_lawyer"
    | "await_human_follow_up"
    | "close";
  metadata: Record<string, unknown>;
};

type PolicyInput = {
  channel: "instagram" | "facebook" | "whatsapp";
  session: ConversationSession;
  conversationState: ConversationState | null;
  messageText: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasManualHandoffFlag(session: ConversationSession) {
  return (
    session.metadata?.manual_handoff_requested === true ||
    session.metadata?.lawyer_handoff_triggered === true ||
    typeof session.metadata?.lawyer_handoff_triggered_at === "string"
  );
}

function detectExplicitLawyerRequest(messageText: string) {
  const normalizedMessage = normalizeText(messageText);
  return (
    normalizedMessage.includes("falar com a advogada") ||
    normalizedMessage.includes("quero falar com a advogada") ||
    normalizedMessage.includes("passa para a advogada") ||
    normalizedMessage.includes("quero atendimento humano") ||
    normalizedMessage.includes("quero falar com humano") ||
    normalizedMessage.includes("quero falar com alguem")
  );
}

function hasSevereException(messageText: string, state: ConversationState | null) {
  const normalizedMessage = normalizeText(messageText);
  const mentionsSevereRisk =
    normalizedMessage.includes("prisao") ||
    normalizedMessage.includes("violencia") ||
    normalizedMessage.includes("ameaça") ||
    normalizedMessage.includes("ameaça") ||
    normalizedMessage.includes("medida protetiva");

  const extremeUrgency =
    state?.collectedData.nivel_urgencia === "alta" &&
    state?.collectedData.prejuizo_ativo === true &&
    (normalizedMessage.includes("agora") ||
      normalizedMessage.includes("urgente") ||
      normalizedMessage.includes("imediato"));

  return mentionsSevereRisk || extremeUrgency;
}

function inferTriageStage(state: ConversationState | null): ConversationPolicyTriageStage {
  if (!state) {
    return "not_started";
  }

  if (state.triageCompleteness >= 80) {
    return "completed";
  }

  if (state.collectedData.nivel_urgencia) {
    return "urgency_assessed";
  }

  if (
    state.collectedData.problema_principal ||
    state.collectedData.timeframe ||
    state.collectedData.tem_documentos !== undefined
  ) {
    return "details_in_progress";
  }

  if (state.collectedData.area) {
    return "area_identified";
  }

  return "collecting_context";
}

function inferConsultationStage(
  state: ConversationState | null,
  messageText: string
): ConversationPolicyConsultationStage {
  if (!state) {
    return "not_offered";
  }

  const explicitStage = normalizeText(state.consultationStage);
  if (
    explicitStage === "offered" ||
    explicitStage === "interest_detected" ||
    explicitStage === "collecting_availability" ||
    explicitStage === "availability_collected" ||
    explicitStage === "ready_for_lawyer" ||
    explicitStage === "scheduled_pending_confirmation" ||
    explicitStage === "forwarded_to_lawyer"
  ) {
    return explicitStage;
  }

  const normalizedMessage = normalizeText(messageText);
  const asksToSchedule =
    normalizedMessage.includes("consulta") ||
    normalizedMessage.includes("agendar") ||
    normalizedMessage.includes("horario") ||
    normalizedMessage.includes("horário") ||
    normalizedMessage.includes("manha") ||
    normalizedMessage.includes("manhã") ||
    normalizedMessage.includes("tarde") ||
    normalizedMessage.includes("noite");

  const hasAvailability = hasSchedulingSignal(state.contactPreferences);

  if (state.commercialStatus === "consultation_scheduled") {
    return "scheduled_pending_confirmation";
  }

  if (hasCompleteSchedulingPreferences(state.contactPreferences) && state.triageCompleteness >= 70) {
    return "ready_for_lawyer";
  }

  if (hasAvailability) {
    return "availability_collected";
  }

  if (asksToSchedule) {
    return state.triageCompleteness >= 55 ? "collecting_availability" : "interest_detected";
  }

  if (state.commercialMomentDetected || state.recommendedAction === "schedule_consultation") {
    return "offered";
  }

  return "not_offered";
}

export function extractConversationStateFromSession(
  session: ConversationSession
): ConversationState | null {
  const rawState = session.metadata?.conversation_state;

  if (!rawState || typeof rawState !== "object") {
    return null;
  }

  return rawState as ConversationState;
}

export function evaluateConversationPolicy(input: PolicyInput): ConversationPolicySummary {
  const triageStage = inferTriageStage(input.conversationState);
  const explanationStage = inferExplanationStage(input.conversationState, input.messageText);
  const consultationStage = inferConsultationStage(input.conversationState, input.messageText);
  const storedSignals = extractStoredConversationSignals(input.session, input.conversationState);
  const manualHandoff = hasManualHandoffFlag(input.session);
  const severeException = hasSevereException(input.messageText, input.conversationState);
  const explicitLawyerRequest = detectExplicitLawyerRequest(input.messageText);

  const schedulingComplete =
    consultationStage === "availability_collected" ||
    consultationStage === "ready_for_lawyer" ||
    consultationStage === "scheduled_pending_confirmation" ||
    consultationStage === "forwarded_to_lawyer";
  const readyForLawyer =
    consultationStage === "ready_for_lawyer" ||
    consultationStage === "scheduled_pending_confirmation" ||
    consultationStage === "forwarded_to_lawyer";

  const legitimateHandoff =
    manualHandoff ||
    severeException ||
    consultationStage === "forwarded_to_lawyer" ||
    consultationStage === "scheduled_pending_confirmation" ||
    storedSignals.lawyerNotificationGenerated ||
    (readyForLawyer && input.session.handoff_to_human === true);

  const contaminatedHandoff =
    input.session.handoff_to_human === true &&
    !legitimateHandoff &&
    !manualHandoff;
  const aiStateContaminated =
    storedSignals.aiActiveOnChannel === false &&
    !["closed", "archived"].includes(normalizeText(storedSignals.conversationStatus));
  const sessionNeedsNormalization = contaminatedHandoff || aiStateContaminated;

  let state: ConversationPolicyState = "ai_active";
  let handoffStatus: ConversationPolicyHandoffStatus = "ai_only";
  let handoffAllowed = false;
  let handoffBlocked = false;
  let handoffReason: string | null = null;
  let handoffReasonCode: string | null = null;
  let nextBestAction: ConversationPolicySummary["nextBestAction"] = "continue_triage";
  let operationalHandoffRecorded = storedSignals.operationalHandoffRecorded;
  let lawyerNotificationGenerated = storedSignals.lawyerNotificationGenerated;
  let humanFollowUpPending = storedSignals.humanFollowUpPending;
  let followUpReady = storedSignals.followUpReady || schedulingComplete;

  if (legitimateHandoff && (input.session.handoff_to_human || storedSignals.lawyerNotificationGenerated)) {
    state =
      consultationStage === "scheduled_pending_confirmation" ||
      consultationStage === "forwarded_to_lawyer"
        ? "handed_off_to_lawyer"
        : "lawyer_notified";
    handoffStatus = "completed";
    handoffAllowed = true;
    operationalHandoffRecorded = true;
    lawyerNotificationGenerated = true;
    humanFollowUpPending = true;
    handoffReason =
      storedSignals.handoffReason ||
      (manualHandoff
        ? "Acionamento manual da equipe"
        : severeException
          ? "Excecao operacional legitima"
          : "Consulta pronta e registrada para a advogada");
    handoffReasonCode =
      storedSignals.handoffReasonCode ||
      (manualHandoff ? "manual_handoff" : severeException ? "operational_exception" : "consultation_ready");
    nextBestAction = "await_human_follow_up";
  } else if (readyForLawyer) {
    state = "consultation_ready";
    handoffStatus = "allowed";
    handoffAllowed = true;
    humanFollowUpPending = true;
    handoffReason = severeException
      ? "Excecao operacional legitima"
      : "Consulta pronta para notificacao operacional";
    handoffReasonCode = severeException ? "operational_exception" : "consultation_ready";
    nextBestAction = "handoff_to_lawyer";
  } else if (consultationStage === "availability_collected") {
    state = "scheduling_preference_captured";
    handoffStatus = explicitLawyerRequest ? "blocked_as_premature" : "ai_only";
    handoffBlocked = explicitLawyerRequest || contaminatedHandoff;
    handoffReason = handoffBlocked
      ? "Ainda falta consolidar a consulta antes do encaminhamento operacional"
      : null;
    handoffReasonCode = handoffBlocked ? "consultation_needs_confirmation" : null;
    nextBestAction = "finalize_consultation";
  } else if (consultationStage === "collecting_availability") {
    state = "scheduling_in_progress";
    handoffStatus = explicitLawyerRequest || contaminatedHandoff ? "blocked_as_premature" : "ai_only";
    handoffBlocked = explicitLawyerRequest || contaminatedHandoff;
    handoffReason = handoffBlocked
      ? "A NoemIA ainda precisa coletar dia e horario antes de acionar a advogada"
      : null;
    handoffReasonCode = handoffBlocked ? "scheduling_not_finished" : null;
    nextBestAction = "collect_scheduling_preferences";
  } else if (consultationStage === "interest_detected" || consultationStage === "offered") {
    state = "consultation_offer";
    handoffStatus = explicitLawyerRequest || contaminatedHandoff ? "blocked_as_premature" : "ai_only";
    handoffBlocked = explicitLawyerRequest || contaminatedHandoff;
    handoffReason = handoffBlocked
      ? "A NoemIA ainda precisa organizar a triagem e a consulta antes do encaminhamento humano"
      : null;
    handoffReasonCode = handoffBlocked ? "triage_and_scheduling_required_first" : null;
    nextBestAction = "offer_consultation";
  } else if (
    explanationStage === "guidance_shared" ||
    explanationStage === "consultation_positioned"
  ) {
    state = "explanation_in_progress";
    handoffStatus = contaminatedHandoff ? "blocked_as_premature" : "ai_only";
    handoffBlocked = contaminatedHandoff;
    handoffReason = contaminatedHandoff ? "Sessao contaminada por handoff residual" : null;
    handoffReasonCode = contaminatedHandoff ? "residual_handoff_state" : null;
    nextBestAction = "continue_explanation";
  } else if (triageStage !== "not_started") {
    state = "triage_in_progress";
    handoffStatus = contaminatedHandoff ? "blocked_as_premature" : "ai_only";
    handoffBlocked = contaminatedHandoff;
    handoffReason = contaminatedHandoff ? "Sessao contaminada por handoff residual" : null;
    handoffReasonCode = contaminatedHandoff ? "residual_handoff_state" : null;
    nextBestAction = "continue_triage";
  }

  if (!handoffReason && explicitLawyerRequest && !handoffAllowed) {
    handoffBlocked = true;
    handoffStatus = "blocked_as_premature";
    handoffReason =
      "Mesmo com pedido para falar com a advogada, a NoemIA ainda precisa organizar triagem e consulta";
    handoffReasonCode = "lawyer_request_requires_structuring";
  }

  const aiShouldRespond = !["closed", "archived"].includes(state);
  const aiActiveOnChannel = aiShouldRespond;

  const metadata = {
    conversation_policy_state: state,
    triage_stage: triageStage,
    explanation_stage: explanationStage,
    consultation_stage: consultationStage,
    handoff_status: handoffStatus,
    handoff_allowed: handoffAllowed,
    handoff_blocked: handoffBlocked,
    handoff_reason: handoffReason,
    handoff_reason_code: handoffReasonCode,
    legitimate_handoff: legitimateHandoff,
    scheduling_complete: schedulingComplete,
    lawyer_notification_generated: lawyerNotificationGenerated,
    ready_for_lawyer: readyForLawyer,
    ai_active_on_channel: aiActiveOnChannel,
    operational_handoff_recorded: operationalHandoffRecorded,
    human_followup_pending: humanFollowUpPending,
    follow_up_ready: followUpReady,
    policy_updated_at: new Date().toISOString()
  };

  return {
    state,
    triageStage,
    explanationStage,
    consultationStage,
    handoffStatus,
    handoffAllowed,
    handoffBlocked,
    handoffReason,
    handoffReasonCode,
    legitimateHandoff,
    sessionNeedsNormalization,
    normalizationReason: contaminatedHandoff
      ? "residual_handoff_state"
      : aiStateContaminated
        ? "ai_channel_must_remain_active"
        : null,
    schedulingComplete,
    lawyerNotificationGenerated,
    readyForLawyer,
    aiShouldRespond,
    aiActiveOnChannel,
    operationalHandoffRecorded,
    humanFollowUpPending,
    followUpReady,
    nextBestAction,
    metadata
  };
}
