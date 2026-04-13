import type { ConversationState } from "../ai/noemia-core";
import type { ConversationSession } from "./conversation-persistence";

export type ConversationPolicyState =
  | "ai_active"
  | "triage_in_progress"
  | "consultation_offer"
  | "scheduling_in_progress"
  | "consultation_ready"
  | "handed_off_to_lawyer"
  | "human_followup_pending"
  | "closed"
  | "archived";

export type ConversationPolicyTriageStage =
  | "not_started"
  | "collecting_context"
  | "area_identified"
  | "details_in_progress"
  | "urgency_assessed"
  | "completed";

export type ConversationPolicyConsultationStage =
  | "not_offered"
  | "offered"
  | "interest_detected"
  | "collecting_availability"
  | "availability_collected"
  | "ready_for_lawyer"
  | "scheduled_pending_confirmation"
  | "forwarded_to_lawyer";

export type ConversationPolicyHandoffStatus =
  | "ai_only"
  | "blocked_as_premature"
  | "allowed"
  | "completed";

export type ConversationPolicySummary = {
  state: ConversationPolicyState;
  triageStage: ConversationPolicyTriageStage;
  consultationStage: ConversationPolicyConsultationStage;
  handoffStatus: ConversationPolicyHandoffStatus;
  handoffAllowed: boolean;
  handoffBlocked: boolean;
  handoffReason: string | null;
  legitimateHandoff: boolean;
  sessionNeedsNormalization: boolean;
  normalizationReason: string | null;
  schedulingComplete: boolean;
  lawyerNotificationGenerated: boolean;
  readyForLawyer: boolean;
  nextBestAction:
    | "continue_triage"
    | "offer_consultation"
    | "collect_scheduling_preferences"
    | "finalize_consultation"
    | "handoff_to_lawyer"
    | "await_human_follow_up"
    | "close";
  metadata: Record<string, unknown>;
};

type PolicyInput = {
  channel: "instagram" | "whatsapp";
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

function hasSevereException(messageText: string, state: ConversationState | null) {
  const normalizedMessage = normalizeText(messageText);
  const mentionsSevereRisk =
    normalizedMessage.includes("prisao") ||
    normalizedMessage.includes("prisão") ||
    normalizedMessage.includes("violencia") ||
    normalizedMessage.includes("violência") ||
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

function inferConsultationStage(state: ConversationState | null): ConversationPolicyConsultationStage {
  if (!state) {
    return "not_offered";
  }

  const status = state.commercialStatus;
  const hasAvailability =
    Boolean(state.contactPreferences?.availability) ||
    Boolean(state.contactPreferences?.period) ||
    Boolean(state.contactPreferences?.urgency);

  if (status === "consultation_scheduled") {
    return "scheduled_pending_confirmation";
  }

  if (state.readyForHandoff && hasAvailability) {
    return "ready_for_lawyer";
  }

  if (hasAvailability) {
    return "availability_collected";
  }

  if (
    status === "consultation_proposed" ||
    state.recommendedAction === "schedule_consultation"
  ) {
    return state.commercialMomentDetected ? "collecting_availability" : "offered";
  }

  if (state.commercialMomentDetected) {
    return "interest_detected";
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
  const consultationStage = inferConsultationStage(input.conversationState);
  const manualHandoff = hasManualHandoffFlag(input.session);
  const severeException = hasSevereException(input.messageText, input.conversationState);
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
    consultationStage === "forwarded_to_lawyer" ||
    consultationStage === "scheduled_pending_confirmation" ||
    (readyForLawyer && input.session.handoff_to_human === true) ||
    severeException;

  const contaminatedHandoff =
    input.session.handoff_to_human === true &&
    !legitimateHandoff &&
    !manualHandoff;

  let state: ConversationPolicyState = "ai_active";
  let handoffStatus: ConversationPolicyHandoffStatus = "ai_only";
  let handoffAllowed = false;
  let handoffBlocked = false;
  let handoffReason: string | null = null;
  let nextBestAction: ConversationPolicySummary["nextBestAction"] = "continue_triage";

  if (legitimateHandoff && input.session.handoff_to_human === true) {
    state = "handed_off_to_lawyer";
    handoffStatus = "completed";
    handoffAllowed = true;
    handoffReason = manualHandoff
      ? "manual_handoff"
      : severeException
        ? "operational_exception"
        : "consultation_ready";
    nextBestAction = "await_human_follow_up";
  } else if (readyForLawyer) {
    state = "consultation_ready";
    handoffStatus = "allowed";
    handoffAllowed = true;
    handoffReason = severeException ? "operational_exception" : "consultation_ready";
    nextBestAction = "handoff_to_lawyer";
  } else if (consultationStage === "availability_collected" || consultationStage === "collecting_availability") {
    state = "scheduling_in_progress";
    handoffStatus = "blocked_as_premature";
    handoffBlocked = Boolean(input.session.handoff_to_human) || manualHandoff;
    handoffReason = handoffBlocked ? "scheduling_not_finished" : null;
    nextBestAction = schedulingComplete ? "finalize_consultation" : "collect_scheduling_preferences";
  } else if (
    consultationStage === "interest_detected" ||
    consultationStage === "offered"
  ) {
    state = "consultation_offer";
    handoffStatus = "blocked_as_premature";
    handoffBlocked = Boolean(input.session.handoff_to_human) || manualHandoff;
    handoffReason = handoffBlocked ? "consultation_not_ready" : null;
    nextBestAction = "offer_consultation";
  } else if (triageStage === "completed" || triageStage === "urgency_assessed" || triageStage === "details_in_progress") {
    state = "triage_in_progress";
    if (contaminatedHandoff) {
      handoffStatus = "blocked_as_premature";
      handoffBlocked = true;
      handoffReason = "residual_handoff_state";
    }
    nextBestAction = "continue_triage";
  }

  const metadata = {
    conversation_policy_state: state,
    triage_stage: triageStage,
    consultation_stage: consultationStage,
    handoff_status: handoffStatus,
    handoff_allowed: handoffAllowed,
    handoff_blocked: handoffBlocked,
    handoff_reason: handoffReason,
    legitimate_handoff: legitimateHandoff,
    scheduling_complete: schedulingComplete,
    lawyer_notification_generated: false,
    ready_for_lawyer: readyForLawyer,
    policy_updated_at: new Date().toISOString()
  };

  return {
    state,
    triageStage,
    consultationStage,
    handoffStatus,
    handoffAllowed,
    handoffBlocked,
    handoffReason,
    legitimateHandoff,
    sessionNeedsNormalization: contaminatedHandoff,
    normalizationReason: contaminatedHandoff ? "residual_handoff_state" : null,
    schedulingComplete,
    lawyerNotificationGenerated: false,
    readyForLawyer,
    nextBestAction,
    metadata
  };
}
