import type { ConversationSession } from "./conversation-persistence";

export type ConversationPolicyState =
  | "ai_active"
  | "triage_in_progress"
  | "explanation_in_progress"
  | "consultation_offer"
  | "scheduling_in_progress"
  | "scheduling_preference_captured"
  | "consultation_ready"
  | "lawyer_notified"
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

export type ConversationPolicyExplanationStage =
  | "not_started"
  | "understanding_case"
  | "clarifying_questions"
  | "guidance_shared"
  | "consultation_positioned";

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

export type LawyerNotificationState = "not_notified" | "ready_to_notify" | "notified";

export type SchedulingPreferences = {
  channel?: string;
  period?: string;
  urgency?: string;
  availability?: string;
};

export type ConversationStateLike = {
  currentStep?: string;
  collectedData?: object;
  triageCompleteness?: number;
  conversationStatus?: string;
  triageStage?: string;
  explanationStage?: string;
  consultationStage?: string;
  lawyerNotificationGenerated?: boolean;
  lawyerNotificationState?: string;
  aiActiveOnChannel?: boolean;
  operationalHandoffRecorded?: boolean;
  humanFollowUpPending?: boolean;
  followUpReady?: boolean;
  handoffReason?: string;
  handoffReasonCode?: string;
  contactPreferences?: SchedulingPreferences;
  commercialMomentDetected?: boolean;
} | null;

export type StoredConversationSignals = {
  conversationStatus?: string | null;
  triageStage?: string | null;
  explanationStage?: string | null;
  consultationStage?: string | null;
  lawyerNotificationGenerated: boolean;
  lawyerNotificationState: LawyerNotificationState;
  aiActiveOnChannel: boolean;
  operationalHandoffRecorded: boolean;
  humanFollowUpPending: boolean;
  followUpReady: boolean;
  handoffReasonCode?: string | null;
  handoffReason?: string | null;
  schedulingPreferences?: SchedulingPreferences | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function coerceBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asSchedulingPreferences(value: unknown): SchedulingPreferences | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as SchedulingPreferences;
  return {
    channel: typeof candidate.channel === "string" ? candidate.channel : undefined,
    period: typeof candidate.period === "string" ? candidate.period : undefined,
    urgency: typeof candidate.urgency === "string" ? candidate.urgency : undefined,
    availability: typeof candidate.availability === "string" ? candidate.availability : undefined
  };
}

export function hasSchedulingSignal(preferences?: SchedulingPreferences | null) {
  return Boolean(
    preferences?.availability ||
      preferences?.period ||
      preferences?.urgency ||
      preferences?.channel
  );
}

export function hasCompleteSchedulingPreferences(preferences?: SchedulingPreferences | null) {
  if (!preferences) {
    return false;
  }

  const availability = normalizeText(preferences.availability);
  return Boolean(
    availability ||
      (normalizeText(preferences.period) && normalizeText(preferences.channel)) ||
      (normalizeText(preferences.period) && normalizeText(preferences.urgency))
  );
}

export function inferExplanationStage(
  conversationState: ConversationStateLike,
  messageText?: string
): ConversationPolicyExplanationStage {
  const explicitStage = normalizeText(conversationState?.explanationStage);

  if (
    explicitStage === "understanding_case" ||
    explicitStage === "clarifying_questions" ||
    explicitStage === "guidance_shared" ||
    explicitStage === "consultation_positioned"
  ) {
    return explicitStage;
  }

  const collectedData = (conversationState?.collectedData || {}) as Record<string, unknown>;
  const hasArea = typeof collectedData.area === "string" && collectedData.area.trim().length > 0;
  const hasProblem =
    typeof collectedData.problema_principal === "string" &&
    collectedData.problema_principal.trim().length > 0;
  const completeness = typeof conversationState?.triageCompleteness === "number"
    ? conversationState.triageCompleteness
    : 0;
  const normalizedMessage = normalizeText(messageText);
  const asksHowItWorks =
    normalizedMessage.includes("como funciona") ||
    normalizedMessage.includes("valor") ||
    normalizedMessage.includes("consulta") ||
    normalizedMessage.includes("explica") ||
    normalizedMessage.includes("duvida");

  if (conversationState?.consultationStage && conversationState.consultationStage !== "not_offered") {
    return "consultation_positioned";
  }

  if (completeness >= 60 || asksHowItWorks) {
    return "guidance_shared";
  }

  if (hasProblem) {
    return "clarifying_questions";
  }

  if (hasArea) {
    return "understanding_case";
  }

  return "not_started";
}

export function extractStoredConversationSignals(
  session: ConversationSession,
  conversationState: ConversationStateLike
): StoredConversationSignals {
  const metadata = session.metadata || {};
  const schedulingPreferences =
    asSchedulingPreferences(conversationState?.contactPreferences) ||
    asSchedulingPreferences(metadata.scheduling_preferences) ||
    asSchedulingPreferences(metadata.contact_preferences);

  const lawyerNotificationGenerated =
    coerceBoolean(conversationState?.lawyerNotificationGenerated) ||
    coerceBoolean(metadata.lawyer_notification_generated) ||
    typeof metadata.lawyer_handoff_triggered_at === "string";

  const operationalHandoffRecorded =
    coerceBoolean(conversationState?.operationalHandoffRecorded) ||
    coerceBoolean(metadata.operational_handoff_recorded) ||
    coerceBoolean(metadata.lawyer_handoff_triggered) ||
    session.handoff_to_human === true;

  const aiActiveOnChannel =
    conversationState?.aiActiveOnChannel === false
      ? false
      : metadata.ai_active_on_channel === false
        ? false
        : true;

  const followUpReady =
    coerceBoolean(conversationState?.followUpReady) ||
    coerceBoolean(metadata.follow_up_ready) ||
    hasSchedulingSignal(schedulingPreferences);

  const humanFollowUpPending =
    coerceBoolean(conversationState?.humanFollowUpPending) ||
    coerceBoolean(metadata.human_followup_pending) ||
    operationalHandoffRecorded;

  const lawyerNotificationStateRaw =
    normalizeText(conversationState?.lawyerNotificationState) ||
    normalizeText(metadata.lawyer_notification_state);

  const lawyerNotificationState: LawyerNotificationState =
    lawyerNotificationStateRaw === "notified"
      ? "notified"
      : lawyerNotificationGenerated
        ? "notified"
        : lawyerNotificationStateRaw === "ready_to_notify"
          ? "ready_to_notify"
          : "not_notified";

  return {
    conversationStatus:
      (conversationState?.conversationStatus as string | undefined) ||
      (metadata.conversation_policy_state as string | undefined) ||
      (metadata.conversation_status as string | undefined) ||
      null,
    triageStage:
      (conversationState?.triageStage as string | undefined) ||
      (metadata.triage_stage as string | undefined) ||
      null,
    explanationStage:
      (conversationState?.explanationStage as string | undefined) ||
      (metadata.explanation_stage as string | undefined) ||
      null,
    consultationStage:
      (conversationState?.consultationStage as string | undefined) ||
      (metadata.consultation_stage as string | undefined) ||
      null,
    lawyerNotificationGenerated,
    lawyerNotificationState,
    aiActiveOnChannel,
    operationalHandoffRecorded,
    humanFollowUpPending,
    followUpReady,
    handoffReasonCode:
      (conversationState?.handoffReasonCode as string | undefined) ||
      (metadata.handoff_reason_code as string | undefined) ||
      null,
    handoffReason:
      (conversationState?.handoffReason as string | undefined) ||
      (metadata.last_handoff_reason as string | undefined) ||
      null,
    schedulingPreferences
  };
}
