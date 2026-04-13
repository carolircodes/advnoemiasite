import type { SchedulingPreferences } from "./conversation-state";

export type PanelConversationStateProjection = {
  conversationStatus?: string | null;
  triageStage?: string | null;
  explanationStage?: string | null;
  consultationStage?: string | null;
  handoffReason?: string | null;
  readyForLawyer: boolean;
  aiActiveOnChannel: boolean;
  operationalHandoffRecorded: boolean;
  lawyerNotificationGenerated: boolean;
  humanFollowUpPending: boolean;
  followUpReady: boolean;
  schedulingPreferences?: SchedulingPreferences | null;
  reportSummary?: string | null;
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
      reportData.resumo_caso || summary.user_friendly_summary || triageData.report?.resumo_caso || null
  };
}
