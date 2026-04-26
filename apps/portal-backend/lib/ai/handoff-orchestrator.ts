import type { ConversationState } from "./core-types.ts";
import { determineCommercialStatus } from "./state-manager.ts";

export function evaluatePolicyHandoff(
  state: ConversationState,
  normalizedMessage: string
): { needsAttention: boolean; readyForHandoff: boolean; reason: string } {
  const severeOperationalException =
    (state.collectedData.nivel_urgencia === "alta" &&
      state.collectedData.prejuizo_ativo === true &&
      (normalizedMessage.includes("agora") ||
        normalizedMessage.includes("urgente") ||
        normalizedMessage.includes("imediato"))) ||
    normalizedMessage.includes("prisao") ||
    normalizedMessage.includes("prisão") ||
    normalizedMessage.includes("violencia") ||
    normalizedMessage.includes("violência") ||
    normalizedMessage.includes("medida protetiva");

  if (severeOperationalException) {
    return {
      needsAttention: true,
      readyForHandoff: true,
      reason: "Excecao_operacional_com_urgencia_real"
    };
  }

  if (
    state.consultationStage === "ready_for_lawyer" ||
    state.consultationStage === "scheduled_pending_confirmation"
  ) {
    return {
      needsAttention: true,
      readyForHandoff: true,
      reason: "Consulta_pronta_para_advogada"
    };
  }

  return {
    needsAttention: false,
    readyForHandoff: false,
    reason: ""
  };
}

export function shouldAdvanceToNextStage(state: ConversationState): boolean {
  if (state.commercialMomentDetected && state.conversionScore >= 70) return true;
  if (state.triageCompleteness >= 80) return true;
  if (state.readyForHandoff) return true;
  if (
    state.recommendedAction === "schedule_consultation" ||
    state.recommendedAction === "human_handoff"
  ) {
    return true;
  }
  return false;
}

export function generateHandoffPackage(state: ConversationState, lastMessage: string) {
  const data = state.collectedData;

  return {
    sessionId: state.sessionId || "unknown",
    areaOfLaw: data.area || "não identificada",
    issueSummary: data.problema_principal || "não informado",
    urgencyLevel: data.nivel_urgencia || "baixa",
    hasDocuments: data.tem_documentos || false,
    clientGoal: data.objetivo_cliente || "não informado",
    triageCompleteness: state.triageCompleteness,
    leadTemperature: state.leadTemperature,
    conversionScore: state.conversionScore,
    priorityLevel: state.priorityLevel,
    recommendedAction: state.recommendedAction,
    handoffReason: state.handoffReason || "Pronto para análise humana",
    lastUserMessage: lastMessage,
    internalSummary: [
      `Área: ${data.area || "não identificada"}`,
      `Problema: ${data.problema_principal || "não informado"}`,
      `Urgência: ${data.nivel_urgencia || "não avaliada"}`,
      `Objetivo: ${data.objetivo_cliente || "não informado"}`,
      `Triagem: ${state.triageCompleteness}%`
    ].join(" | "),
    commercialStatus: determineCommercialStatus(state),
    timestamp: new Date().toISOString()
  };
}
