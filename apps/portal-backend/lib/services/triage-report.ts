import type { SchedulingPreferences } from "./conversation-state.ts";
import type { CommercialFunnelSnapshot } from "./commercial-funnel.ts";
import type { SocialAcquisitionSnapshot } from "./social-acquisition.ts";

type PublicCommentPolicySnapshot = {
  decision: string;
  safetyDecision: string;
  brevityRule: string;
  operatorAction: string;
  directTransitionStatus: string;
};

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
    conversionScore?: number;
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
  acquisitionContext?: SocialAcquisitionSnapshot | null;
  commercialSnapshot?: CommercialFunnelSnapshot | null;
  publicCommentPolicy?: PublicCommentPolicySnapshot | null;
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

function inferExecutiveFunnelStage(input: BuildTriageReportInput) {
  const consultationStage =
    input.conversationPolicy?.consultationStage || input.conversationState?.consultationStage || "not_offered";
  const conversationStatus =
    input.conversationPolicy?.state || input.conversationState?.conversationStatus || "ai_active";
  const completeness = input.conversationState?.triageCompleteness || 0;

  if (consultationStage === "scheduled_pending_confirmation") return "consulta_agendada";
  if (consultationStage === "ready_for_lawyer" || conversationStatus === "consultation_ready") {
    return "pronto_para_contato_humano";
  }
  if (
    consultationStage === "availability_collected" ||
    consultationStage === "collecting_availability" ||
    consultationStage === "interest_detected" ||
    consultationStage === "offered"
  ) {
    return "intencao_de_consulta";
  }
  if (completeness >= 45) return "triagem_em_avanco";
  return "entrada_em_conversa";
}

function inferFunnelMomentum(input: BuildTriageReportInput) {
  const leadTemperature = input.conversationState?.leadTemperature || "";
  const completeness = input.conversationState?.triageCompleteness || 0;
  const consultationStage =
    input.conversationPolicy?.consultationStage || input.conversationState?.consultationStage || "not_offered";

  if (consultationStage === "scheduled_pending_confirmation" || consultationStage === "ready_for_lawyer") {
    return "forte";
  }
  if (leadTemperature === "hot" || completeness >= 70) {
    return "forte";
  }
  if (leadTemperature === "warm" || completeness >= 40) {
    return "moderado";
  }
  return "inicial";
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
  const executiveFunnelStage = inferExecutiveFunnelStage(input);
  const funnelMomentum = inferFunnelMomentum(input);
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
    entry_source: input.acquisitionContext?.source || input.source || input.channel,
    entry_type: input.acquisitionContext?.entryType || input.source || input.channel,
    entry_point: input.acquisitionContext?.entryPoint || input.channel,
    discovery_mechanism: input.acquisitionContext?.discoveryMechanism || "unknown",
    source_label: input.acquisitionContext?.sourceLabel || input.source || input.channel,
    campaign: input.acquisitionContext?.campaign || "",
    campaign_label: input.acquisitionContext?.campaignLabel || "",
    topic_label: input.acquisitionContext?.topicLabel || input.detectedTheme,
    content_id: input.acquisitionContext?.contentId || "",
    content_label: input.acquisitionContext?.contentLabel || "",
    content_type: input.acquisitionContext?.contentType || "",
    content_origin_label: input.acquisitionContext?.contentOriginLabel || "",
    commercial_context: input.acquisitionContext?.commercialContext || "",
    intent_signal: input.acquisitionContext?.intentSignal || "",
    commercial_funnel_stage: input.commercialSnapshot?.funnelStage || executiveFunnelStage,
    commercial_stage_label: input.commercialSnapshot?.stageLabel || "",
    consultation_intent_level: input.commercialSnapshot?.consultationIntentLevel || "",
    consultation_invite_timing: input.commercialSnapshot?.consultationInviteTiming || "",
    consultation_invite_state: input.commercialSnapshot?.consultationInviteState || "",
    consultation_invite_copy: input.commercialSnapshot?.consultationInviteCopy || "",
    consultation_value_angle: input.commercialSnapshot?.consultationValueAngle || "",
    scheduling_readiness: input.commercialSnapshot?.schedulingReadiness || "",
    scheduling_status: input.commercialSnapshot?.schedulingStatus || "",
    human_handoff_mode: input.commercialSnapshot?.humanHandoffMode || "",
    human_handoff_ready: input.commercialSnapshot?.humanHandoffReady || false,
    commercial_follow_up_type: input.commercialSnapshot?.followUpType || "",
    operator_priority: input.commercialSnapshot?.operatorPriority || "",
    close_opportunity_state: input.commercialSnapshot?.closeOpportunityState || "",
    next_best_action_detail: input.commercialSnapshot?.nextBestActionDetail || "",
    objections_detected: input.commercialSnapshot?.objectionsDetected || [],
    hesitation_signals: input.commercialSnapshot?.hesitationSignals || [],
    value_signals: input.commercialSnapshot?.valueSignals || [],
    urgency_signals: input.commercialSnapshot?.urgencySignals || [],
    recommended_operator_action:
      input.publicCommentPolicy?.operatorAction ||
      input.commercialSnapshot?.nextBestActionDetail ||
      input.acquisitionContext?.recommendedOperatorAction ||
      input.nextBestAction ||
      "",
    direct_transition_status:
      input.publicCommentPolicy?.directTransitionStatus ||
      input.acquisitionContext?.directTransitionStatus ||
      "",
    public_comment_decision: input.publicCommentPolicy?.decision || "",
    public_comment_safety: input.publicCommentPolicy?.safetyDecision || "",
    public_brevity_rule: input.publicCommentPolicy?.brevityRule || "",
    sessao_relacionada: input.sessionId,
    pipeline_id: input.pipelineId || null,
    next_best_action: input.nextBestAction || "",
    executive_funnel_stage: executiveFunnelStage,
    funnel_momentum: funnelMomentum,
    lead_temperature: input.conversationState?.leadTemperature || "",
    conversion_score: input.conversationState?.conversionScore || 0,
    priority_level: input.conversationState?.priorityLevel || "",
    observacoes_uteis: [
      input.handoffReason ? `Motivo operacional: ${input.handoffReason}` : "",
      input.handoffReasonCode ? `Codigo do motivo: ${input.handoffReasonCode}` : "",
      input.conversationPolicy?.state ? `Estado conversacional: ${input.conversationPolicy.state}` : "",
      input.conversationPolicy?.explanationStage
        ? `Explicacao: ${input.conversationPolicy.explanationStage}`
        : "",
      input.conversationPolicy?.triageStage ? `Triagem: ${input.conversationPolicy.triageStage}` : "",
      input.commercialSnapshot?.summaryLine ? `Comercial: ${input.commercialSnapshot.summaryLine}` : "",
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
    `Funil: ${inferExecutiveFunnelStage(input)}`,
    input.commercialSnapshot?.funnelStage ? `Comercial: ${input.commercialSnapshot.funnelStage}` : "",
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
    report.source_label ? `origem ${report.source_label}` : "",
    `estado ${input.conversationPolicy?.state || input.leadStage}`,
    `explicacao ${input.conversationPolicy?.explanationStage || "not_started"}`,
    `consulta ${report.status_consulta}`,
    `funil ${report.executive_funnel_stage}`,
    report.commercial_stage_label ? `comercial ${report.commercial_stage_label}` : "",
    report.preferencias_agendamento ? `agenda ${report.preferencias_agendamento}` : "",
    report.lawyer_notification_generated ? "advogada notificada" : "",
    report.ai_active_on_channel ? "IA segue ativa" : ""
  ]
    .filter(Boolean)
    .join("; ");
}
