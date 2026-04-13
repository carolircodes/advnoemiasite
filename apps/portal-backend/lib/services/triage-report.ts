import type { SchedulingPreferences } from "./conversation-state";

type BuildTriageReportInput = {
  channel: string;
  source?: string;
  sessionId: string;
  pipelineId?: string | null;
  messageText: string;
  detectedTheme: string;
  leadStage: string;
  nextBestAction?: string | null;
  handoffReason?: string | null;
  handoffReasonCode?: string | null;
  conversationState?: {
    collectedData?: object;
    leadTemperature?: string;
    priorityLevel?: string;
    triageCompleteness?: number;
    explanationStage?: string;
    conversationStatus?: string;
    consultationStage?: string;
    aiActiveOnChannel?: boolean;
    lawyerNotificationGenerated?: boolean;
    humanFollowUpPending?: boolean;
    followUpReady?: boolean;
  } | null;
  conversationPolicy?: {
    state: string;
    triageStage: string;
    explanationStage: string;
    consultationStage: string;
    handoffStatus: string;
    handoffAllowed: boolean;
    handoffBlocked: boolean;
    handoffReason: string | null;
    schedulingComplete: boolean;
    readyForLawyer: boolean;
    aiActiveOnChannel?: boolean;
    operationalHandoffRecorded?: boolean;
    lawyerNotificationGenerated?: boolean;
    humanFollowUpPending?: boolean;
    followUpReady?: boolean;
  } | null;
  schedulingPreferences?: SchedulingPreferences | null;
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function listUrgencySignals(collectedData: Record<string, unknown>) {
  const signals: string[] = [];

  if (typeof collectedData.nivel_urgencia === "string" && collectedData.nivel_urgencia !== "baixa") {
    signals.push(`Urgencia ${collectedData.nivel_urgencia}`);
  }

  if (collectedData.prejuizo_ativo === true) {
    signals.push("Prejuizo ativo informado");
  }

  return signals;
}

export function buildTriageReport(input: BuildTriageReportInput) {
  const collectedData = (input.conversationState?.collectedData || {}) as Record<string, unknown>;
  const problemaPrincipal =
    asString(collectedData.problema_principal) ||
    asString(collectedData.descricao_detalhada) ||
    input.messageText;
  const timeline = asString(collectedData.timeframe);
  const documentTypes = asStringArray(collectedData.tipos_documentos);
  const keywords = asStringArray(collectedData.palavras_chave);
  const schedulingPreferences = input.schedulingPreferences || {};
  const availabilityParts = [
    schedulingPreferences.availability,
    schedulingPreferences.period ? `turno ${schedulingPreferences.period}` : "",
    schedulingPreferences.urgency ? `urgencia ${schedulingPreferences.urgency}` : "",
    schedulingPreferences.channel ? `contato por ${schedulingPreferences.channel}` : ""
  ].filter(Boolean);

  return {
    resumo_caso: problemaPrincipal || "Caso ainda em organizacao inicial pela NoemIA.",
    area_juridica: asString(collectedData.area) || input.detectedTheme || "geral",
    fatos_principais: [
      problemaPrincipal,
      timeline ? `Cronologia inicial: ${timeline}` : "",
      asString(collectedData.objetivo_cliente)
        ? `Objetivo principal: ${asString(collectedData.objetivo_cliente)}`
        : "",
      collectedData.tem_documentos === true
        ? "Cliente informou possuir documentos."
        : collectedData.tem_documentos === false
          ? "Cliente ainda nao tem documentos separados."
          : ""
    ].filter(Boolean),
    problema_central: problemaPrincipal || "A definir na triagem",
    cronologia: timeline || "Cronologia ainda em coleta",
    sinais_urgencia: listUrgencySignals(collectedData),
    documentos_mencionados: documentTypes,
    documentos_pendentes:
      collectedData.tem_documentos === false ? ["Documentos ainda nao enviados"] : [],
    respostas_relevantes: keywords,
    status_consulta:
      input.conversationPolicy?.consultationStage ||
      input.conversationState?.consultationStage ||
      "not_offered",
    interesse_temperatura:
      input.conversationState?.leadTemperature || input.leadStage || "initial",
    preferencias_agendamento: availabilityParts.join(" | "),
    canal_origem: input.channel,
    sessao_relacionada: input.sessionId,
    pipeline_id: input.pipelineId || null,
    next_best_action: input.nextBestAction || "",
    observacoes_uteis: [
      input.handoffReason ? `Motivo operacional: ${input.handoffReason}` : "",
      input.handoffReasonCode ? `Codigo do motivo: ${input.handoffReasonCode}` : "",
      input.conversationPolicy?.state ? `Estado conversacional: ${input.conversationPolicy.state}` : "",
      input.conversationPolicy?.explanationStage
        ? `Explicacao: ${input.conversationPolicy.explanationStage}`
        : "",
      input.conversationPolicy?.triageStage ? `Triagem: ${input.conversationPolicy.triageStage}` : "",
      input.conversationPolicy?.schedulingComplete ? "Disponibilidade suficiente coletada" : "",
      input.conversationPolicy?.readyForLawyer ? "Consulta pronta para acao operacional" : "",
      input.conversationPolicy?.aiActiveOnChannel === false ||
      input.conversationState?.aiActiveOnChannel === false
        ? "Atencao: IA marcada como inativa"
        : "IA permanece ativa no canal",
      input.conversationPolicy?.operationalHandoffRecorded ? "Encaminhamento operacional ja registrado" : "",
      input.conversationPolicy?.humanFollowUpPending ? "Follow-up humano pendente" : ""
    ].filter(Boolean),
    prioridade_operacional: input.conversationState?.priorityLevel || "",
    completude_triagem: input.conversationState?.triageCompleteness || 0,
    lawyer_notification_generated: Boolean(
      input.conversationPolicy?.lawyerNotificationGenerated ||
        input.conversationState?.lawyerNotificationGenerated
    ),
    ai_active_on_channel:
      input.conversationPolicy?.aiActiveOnChannel !== false &&
      input.conversationState?.aiActiveOnChannel !== false,
    follow_up_ready: Boolean(
      input.conversationPolicy?.followUpReady || input.conversationState?.followUpReady
    )
  };
}

export function buildInternalTriageSummary(input: BuildTriageReportInput) {
  const collectedData = (input.conversationState?.collectedData || {}) as Record<string, unknown>;
  return [
    `Canal: ${input.channel}`,
    `Origem: ${input.source || "desconhecida"}`,
    `Tema: ${input.detectedTheme}`,
    `LeadStage: ${input.leadStage}`,
    `Estado: ${input.conversationPolicy?.state || input.conversationState?.conversationStatus || "ai_active"}`,
    `Explicacao: ${input.conversationPolicy?.explanationStage || input.conversationState?.explanationStage || "not_started"}`,
    `Consulta: ${input.conversationPolicy?.consultationStage || input.conversationState?.consultationStage || "not_offered"}`,
    `Triagem: ${input.conversationPolicy?.triageStage || "not_started"}`,
    `Disponibilidade: ${input.schedulingPreferences?.availability || "nao coletada"}`,
    `Problema: ${asString(collectedData.problema_principal) || input.messageText}`,
    `Handoff: ${input.handoffReason || "nao acionado"}`,
    `IA ativa: ${
      input.conversationPolicy?.aiActiveOnChannel !== false &&
      input.conversationState?.aiActiveOnChannel !== false
        ? "sim"
        : "nao"
    }`
  ].join(" | ");
}

export function buildUserFacingTriageSummary(input: BuildTriageReportInput) {
  const report = buildTriageReport(input);

  return [
    `Tema ${report.area_juridica}`,
    `estado ${input.conversationPolicy?.state || input.leadStage}`,
    `explicacao ${input.conversationPolicy?.explanationStage || "not_started"}`,
    `consulta ${report.status_consulta}`,
    report.preferencias_agendamento ? `agenda ${report.preferencias_agendamento}` : "",
    report.lawyer_notification_generated ? "advogada notificada" : "",
    report.ai_active_on_channel ? "IA segue ativa" : ""
  ]
    .filter(Boolean)
    .join("; ");
}
