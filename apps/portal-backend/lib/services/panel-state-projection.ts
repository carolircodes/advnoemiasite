import type { SchedulingPreferences } from "./conversation-state";

export type PanelConversationStateProjection = {
  conversationStatus?: string | null;
  triageStage?: string | null;
  explanationStage?: string | null;
  consultationStage?: string | null;
  executiveFunnelStage?: string | null;
  funnelMomentum?: string | null;
  leadTemperature?: string | null;
  priorityLevel?: string | null;
  conversionScore?: number | null;
  nextBestAction?: string | null;
  nextBestActionDetail?: string | null;
  handoffReason?: string | null;
  readyForLawyer: boolean;
  aiActiveOnChannel: boolean;
  operationalHandoffRecorded: boolean;
  lawyerNotificationGenerated: boolean;
  humanFollowUpPending: boolean;
  followUpReady: boolean;
  schedulingPreferences?: SchedulingPreferences | null;
  reportSummary?: string | null;
  entrySource?: string | null;
  entryType?: string | null;
  entryPoint?: string | null;
  discoveryMechanism?: string | null;
  sourceLabel?: string | null;
  campaignLabel?: string | null;
  topicLabel?: string | null;
  contentLabel?: string | null;
  contentType?: string | null;
  commercialContext?: string | null;
  intentSignal?: string | null;
  commercialFunnelStage?: string | null;
  commercialStageLabel?: string | null;
  consultationIntentLevel?: string | null;
  consultationInviteTiming?: string | null;
  consultationInviteState?: string | null;
  consultationInviteCopy?: string | null;
  consultationValueAngle?: string | null;
  schedulingReadiness?: string | null;
  schedulingStatus?: string | null;
  humanHandoffMode?: string | null;
  humanHandoffReady?: boolean;
  commercialFollowUpType?: string | null;
  operatorPriority?: string | null;
  closeOpportunityState?: string | null;
  objectionsDetected?: string[] | null;
  hesitationSignals?: string[] | null;
  valueSignals?: string[] | null;
  urgencySignals?: string[] | null;
  recommendedOperatorAction?: string | null;
  directTransitionStatus?: string | null;
  publicCommentDecision?: string | null;
  publicCommentSafety?: string | null;
  publicBrevityRule?: string | null;
};

export function projectPanelConversationState(summary: any): PanelConversationStateProjection | null {
  if (!summary) {
    return null;
  }

  const triageData = summary.triage_data || {};
  const reportData = summary.report_data || triageData.report || {};

  return {
    conversationStatus: summary.conversation_status || triageData.conversation_status || null,
    triageStage: triageData.triage_stage || null,
    explanationStage: summary.explanation_stage || triageData.explanation_stage || null,
    consultationStage: summary.consultation_stage || triageData.consultation_stage || null,
    executiveFunnelStage: reportData.executive_funnel_stage || null,
    funnelMomentum: reportData.funnel_momentum || null,
    leadTemperature: triageData.lead_temperature || reportData.lead_temperature || null,
    priorityLevel: triageData.priority_level || reportData.priority_level || null,
    conversionScore:
      typeof triageData.conversion_score === "number"
        ? triageData.conversion_score
        : typeof reportData.conversion_score === "number"
          ? reportData.conversion_score
          : null,
    nextBestAction: reportData.next_best_action || null,
    nextBestActionDetail: reportData.next_best_action_detail || null,
    handoffReason: summary.handoff_reason || triageData.handoff_policy?.reason || null,
    readyForLawyer:
      summary.conversation_status === "consultation_ready" ||
      summary.conversation_status === "lawyer_notified" ||
      summary.conversation_status === "handed_off_to_lawyer" ||
      summary.consultation_stage === "ready_for_lawyer" ||
      summary.consultation_stage === "scheduled_pending_confirmation" ||
      triageData.consultation_stage === "ready_for_lawyer",
    aiActiveOnChannel:
      summary.ai_active_on_channel !== false &&
      triageData.ai_activity?.channel_active !== false,
    operationalHandoffRecorded:
      summary.operational_handoff_recorded === true ||
      triageData.handoff_policy?.recorded === true,
    lawyerNotificationGenerated:
      summary.lawyer_notification_generated === true ||
      triageData.ai_activity?.lawyer_notification_generated === true,
    humanFollowUpPending:
      summary.human_followup_pending === true ||
      triageData.ai_activity?.human_followup_pending === true,
    followUpReady:
      summary.follow_up_ready === true || triageData.ai_activity?.follow_up_ready === true,
    schedulingPreferences: triageData.scheduling_preferences || null,
    reportSummary:
      reportData.resumo_caso || summary.user_friendly_summary || triageData.report?.resumo_caso || null,
    entrySource: reportData.entry_source || null,
    entryType: reportData.entry_type || null,
    entryPoint: reportData.entry_point || null,
    discoveryMechanism: reportData.discovery_mechanism || null,
    sourceLabel: reportData.source_label || null,
    campaignLabel: reportData.campaign_label || null,
    topicLabel: reportData.topic_label || null,
    contentLabel: reportData.content_label || null,
    contentType: reportData.content_type || null,
    commercialContext: reportData.commercial_context || null,
    intentSignal: reportData.intent_signal || null,
    commercialFunnelStage: reportData.commercial_funnel_stage || null,
    commercialStageLabel: reportData.commercial_stage_label || null,
    consultationIntentLevel: reportData.consultation_intent_level || null,
    consultationInviteTiming: reportData.consultation_invite_timing || null,
    consultationInviteState: reportData.consultation_invite_state || null,
    consultationInviteCopy: reportData.consultation_invite_copy || null,
    consultationValueAngle: reportData.consultation_value_angle || null,
    schedulingReadiness: reportData.scheduling_readiness || null,
    schedulingStatus: reportData.scheduling_status || null,
    humanHandoffMode: reportData.human_handoff_mode || null,
    humanHandoffReady: reportData.human_handoff_ready === true,
    commercialFollowUpType: reportData.commercial_follow_up_type || null,
    operatorPriority: reportData.operator_priority || null,
    closeOpportunityState: reportData.close_opportunity_state || null,
    objectionsDetected: Array.isArray(reportData.objections_detected)
      ? reportData.objections_detected
      : null,
    hesitationSignals: Array.isArray(reportData.hesitation_signals)
      ? reportData.hesitation_signals
      : null,
    valueSignals: Array.isArray(reportData.value_signals) ? reportData.value_signals : null,
    urgencySignals: Array.isArray(reportData.urgency_signals) ? reportData.urgency_signals : null,
    recommendedOperatorAction: reportData.recommended_operator_action || null,
    directTransitionStatus: reportData.direct_transition_status || null,
    publicCommentDecision: reportData.public_comment_decision || null,
    publicCommentSafety: reportData.public_comment_safety || null,
    publicBrevityRule: reportData.public_brevity_rule || null
  };
}
