/**
 * Salvar dados da triagem no banco de dados
 */
import { triagePersistence, TriageData } from "../services/triage-persistence";
import {
  buildInternalTriageSummary,
  buildTriageReport,
  buildUserFacingTriageSummary
} from "../services/triage-report";
import type { ConversationState, NoemiaCoreInput } from "./core-types";

export async function saveTriageData(
  input: NoemiaCoreInput,
  conversationState: ConversationState,
  classification: {
    theme: string;
    intent: string;
    leadTemperature: string;
  }
): Promise<void> {
  if (conversationState.triageCompleteness < 20) {
    return;
  }

  const report = buildTriageReport({
    channel: input.channel,
    sessionId: (input.metadata?.sessionId as string) || conversationState.sessionId || "unknown",
    pipelineId:
      typeof input.metadata?.pipelineId === "string" ? input.metadata.pipelineId : null,
    messageText: input.message,
    detectedTheme: classification.theme,
    leadStage: conversationState.commercialStatus || "triage_in_progress",
    nextBestAction: conversationState.recommendedAction,
    handoffReason: conversationState.handoffReason || null,
    handoffReasonCode: conversationState.handoffReasonCode || null,
    conversationState,
    schedulingPreferences: conversationState.contactPreferences
  });

  const triageData: TriageData = {
    area: conversationState.collectedData.area,
    problema_principal: conversationState.collectedData.problema_principal,
    timeframe: conversationState.collectedData.timeframe,
    acontecendo_agora: conversationState.collectedData.acontecendo_agora,
    tem_documentos: conversationState.collectedData.tem_documentos,
    tipos_documentos: conversationState.collectedData.tipos_documentos,
    objetivo_cliente: conversationState.collectedData.objetivo_cliente,
    nivel_urgencia: conversationState.collectedData.nivel_urgencia,
    prejuizo_ativo: conversationState.collectedData.prejuizo_ativo,
    palavras_chave: conversationState.collectedData.palavras_chave,
    completude: conversationState.triageCompleteness,
    lead_temperature: conversationState.leadTemperature,
    priority_level: conversationState.priorityLevel,
    conversion_score: conversationState.conversionScore,
    commercial_status: conversationState.commercialStatus,
    conversation_status: conversationState.conversationStatus,
    triage_stage: conversationState.triageStage,
    explanation_stage: conversationState.explanationStage,
    consultation_stage: conversationState.consultationStage,
    scheduling_preferences: conversationState.contactPreferences,
    ai_activity: {
      channel_active: conversationState.aiActiveOnChannel,
      operational_handoff_recorded: conversationState.operationalHandoffRecorded,
      human_followup_pending: conversationState.humanFollowUpPending,
      follow_up_ready: conversationState.followUpReady,
      lawyer_notification_generated: conversationState.lawyerNotificationGenerated
    },
    handoff_policy: {
      status: conversationState.readyForHandoff ? "allowed" : "blocked_as_premature",
      allowed: conversationState.readyForHandoff,
      blocked: !conversationState.readyForHandoff && conversationState.needsHumanAttention,
      reason: conversationState.handoffReason || null,
      reason_code: conversationState.handoffReasonCode || null,
      legitimate: conversationState.readyForHandoff,
      recorded: conversationState.operationalHandoffRecorded
    },
    report
  };

  const userId =
    (input.metadata?.userId as string) ||
    (input.context as any)?.userId ||
    (input.conversationState as any)?.userId ||
    "unknown";

  await triagePersistence.saveTriageData(
    ((input.metadata?.sessionId as string) || conversationState.sessionId || "unknown"),
    triageData,
    {
      channel: input.channel,
      userId,
      isHotLead: conversationState.isHotLead,
      needsHumanAttention: conversationState.needsHumanAttention,
      handoffReason: conversationState.handoffReason,
      internalSummary: buildInternalTriageSummary({
        channel: input.channel,
        sessionId: conversationState.sessionId,
        pipelineId:
          typeof input.metadata?.pipelineId === "string" ? input.metadata.pipelineId : null,
        source: typeof input.metadata?.source === "string" ? input.metadata.source : undefined,
        messageText: input.message,
        detectedTheme: classification.theme,
        leadStage: conversationState.commercialStatus || "triage_in_progress",
        nextBestAction: conversationState.recommendedAction,
        handoffReason: conversationState.handoffReason || null,
        handoffReasonCode: conversationState.handoffReasonCode || null,
        conversationState,
        schedulingPreferences: conversationState.contactPreferences
      }),
      userFriendlySummary: buildUserFacingTriageSummary({
        channel: input.channel,
        sessionId: conversationState.sessionId,
        pipelineId:
          typeof input.metadata?.pipelineId === "string" ? input.metadata.pipelineId : null,
        messageText: input.message,
        detectedTheme: classification.theme,
        leadStage: conversationState.commercialStatus || "triage_in_progress",
        nextBestAction: conversationState.recommendedAction,
        handoffReason: conversationState.handoffReason || null,
        handoffReasonCode: conversationState.handoffReasonCode || null,
        conversationState,
        schedulingPreferences: conversationState.contactPreferences
      }),
      conversationStatus: conversationState.conversationStatus,
      explanationStage: conversationState.explanationStage,
      consultationStage: conversationState.consultationStage,
      reportData: triageData.report,
      lawyerNotificationGenerated: conversationState.lawyerNotificationGenerated,
      aiActiveOnChannel: conversationState.aiActiveOnChannel,
      operationalHandoffRecorded: conversationState.operationalHandoffRecorded,
      humanFollowUpPending: conversationState.humanFollowUpPending,
      followUpReady: conversationState.followUpReady
    }
  );
}
