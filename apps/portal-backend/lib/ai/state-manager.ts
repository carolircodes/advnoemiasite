import type {
  ClassifiedIntent,
  ConversationState,
  LeadTemperature,
  LegalTheme
} from "./core-types";

type MessageClassification = {
  theme: LegalTheme;
  intent: ClassifiedIntent;
  leadTemperature: LeadTemperature;
};

function extractKeywords(message: string): string[] {
  const keywords =
    message
      .toLowerCase()
      .match(/\b(aposentadoria|inss|benefício|beneficio|banco|empréstimo|emprestimo|divórcio|divorcio|pensão|pensao|guarda|contrato|demissão|demissao|trabalhista)\b/g) || [];

  return [...new Set(keywords)];
}

function extractTimeInfo(message: string): { timeframe: string; isHappeningNow: boolean } {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("agora") || lowerMessage.includes("hoje") || lowerMessage.includes("está acontecendo") || lowerMessage.includes("esta acontecendo")) {
    return { timeframe: "agora", isHappeningNow: true };
  }

  if (lowerMessage.includes("ontem") || lowerMessage.includes("semana passada")) {
    return { timeframe: "recentemente", isHappeningNow: false };
  }

  if (lowerMessage.includes("mês") || lowerMessage.includes("mes") || lowerMessage.includes("meses")) {
    return { timeframe: "alguns meses", isHappeningNow: false };
  }

  if (lowerMessage.includes("ano") || lowerMessage.includes("anos")) {
    return { timeframe: "muito tempo", isHappeningNow: false };
  }

  return { timeframe: "não especificado", isHappeningNow: false };
}

function extractDocumentInfo(message: string): { hasDocuments: boolean; documentTypes: string[] } {
  const lowerMessage = message.toLowerCase();
  const documentTypes: string[] = [];

  if (lowerMessage.includes("contrato")) documentTypes.push("contrato");
  if (lowerMessage.includes("extrato") || lowerMessage.includes("demonstrativo")) documentTypes.push("extrato");
  if (lowerMessage.includes("holerite") || lowerMessage.includes("contracheque")) documentTypes.push("holerite");
  if (lowerMessage.includes("print") || lowerMessage.includes("printscreen")) documentTypes.push("prints");
  if (lowerMessage.includes("notificação") || lowerMessage.includes("notificacao") || lowerMessage.includes("carta")) documentTypes.push("notificação");
  if (lowerMessage.includes("decisão") || lowerMessage.includes("decisao") || lowerMessage.includes("sentença") || lowerMessage.includes("sentenca")) documentTypes.push("decisão judicial");

  const hasDocuments =
    lowerMessage.includes("sim") ||
    lowerMessage.includes("tenho") ||
    lowerMessage.includes("já") ||
    lowerMessage.includes("ja") ||
    documentTypes.length > 0;

  return { hasDocuments, documentTypes };
}

function extractUrgencyInfo(message: string): { level: "baixa" | "media" | "alta"; hasActiveDamage: boolean } {
  const lowerMessage = message.toLowerCase();
  const highUrgency = ["urgente", "imediato", "perdi", "estou sem", "bloqueou", "parou", "suspenderam", "corte"];
  const mediumUrgency = ["preciso", "quero", "prejudicado", "problema", "dificuldade", "difuldade"];
  const damageIndicators = ["perdendo dinheiro", "prejuízo", "prejuizo", "multa", "juros", "corte"];
  const hasActiveDamage = damageIndicators.some((indicator) => lowerMessage.includes(indicator));

  if (highUrgency.some((word) => lowerMessage.includes(word)) || hasActiveDamage) {
    return { level: "alta", hasActiveDamage };
  }

  if (mediumUrgency.some((word) => lowerMessage.includes(word))) {
    return { level: "media", hasActiveDamage };
  }

  return { level: "baixa", hasActiveDamage };
}

function extractContactPreferences(message: string) {
  const lowerMessage = message.toLowerCase();
  let channel: "whatsapp" | "ligacao" | "consulta_online" | "email" | null = null;
  let period: "manha" | "tarde" | "noite" | "qualquer_horario" | null = null;
  let urgency: "hoje" | "esta_semana" | "proxima_semana" | "sem_urgencia" | null = null;

  if (lowerMessage.includes("whatsapp") || lowerMessage.includes("zap")) channel = "whatsapp";
  else if (lowerMessage.includes("ligação") || lowerMessage.includes("ligacao") || lowerMessage.includes("ligar") || lowerMessage.includes("telefone")) channel = "ligacao";
  else if (lowerMessage.includes("consulta online") || lowerMessage.includes("online") || lowerMessage.includes("video")) channel = "consulta_online";
  else if (lowerMessage.includes("email") || lowerMessage.includes("e-mail")) channel = "email";

  if (lowerMessage.includes("manhã") || lowerMessage.includes("manha")) period = "manha";
  else if (lowerMessage.includes("tarde")) period = "tarde";
  else if (lowerMessage.includes("noite")) period = "noite";
  else if (
    lowerMessage.includes("qualquer horário") ||
    lowerMessage.includes("qualquer horario") ||
    lowerMessage.includes("qualquer hora") ||
    lowerMessage.includes("flexível") ||
    lowerMessage.includes("flexivel")
  ) {
    period = "qualquer_horario";
  }

  if (lowerMessage.includes("hoje") || lowerMessage.includes("agora")) urgency = "hoje";
  else if (lowerMessage.includes("esta semana") || lowerMessage.includes("essa semana")) urgency = "esta_semana";
  else if (lowerMessage.includes("próxima semana") || lowerMessage.includes("proxima semana")) urgency = "proxima_semana";
  else if (
    lowerMessage.includes("sem urgência") ||
    lowerMessage.includes("sem urgencia") ||
    lowerMessage.includes("sem pressa") ||
    lowerMessage.includes("quando puder")
  ) {
    urgency = "sem_urgencia";
  }

  const availability = [channel ? `Canal: ${channel}` : "", period ? `Período: ${period}` : "", urgency ? `Urgência: ${urgency}` : ""]
    .filter(Boolean)
    .join(" | ");

  return { channel, period, urgency, availability };
}

export function calculateLeadScore(state: ConversationState, message: string) {
  const reasoning: string[] = [];
  let score = 0;
  const urgencyInfo = extractUrgencyInfo(message);

  if (urgencyInfo.level === "alta") {
    score += 50;
    reasoning.push("Urgência alta detectada (+50)");
  }

  if (urgencyInfo.hasActiveDamage) {
    score += 40;
    reasoning.push("Prejuízo ativo detectado (+40)");
  }

  if (state.collectedData.tem_documentos) {
    score += 30;
    reasoning.push("Já possui documentos (+30)");
  }

  if (state.collectedData.objetivo_cliente && state.collectedData.objetivo_cliente.length > 20) {
    score += 35;
    reasoning.push("Objetivo claro e bem definido (+35)");
  }

  if (urgencyInfo.level === "media") {
    score += 25;
    reasoning.push("Urgência média detectada (+25)");
  }

  if (state.collectedData.problema_principal && state.collectedData.problema_principal.length > 30) {
    score += 20;
    reasoning.push("Problema bem detalhado (+20)");
  }

  if (state.collectedData.area && state.collectedData.area !== "geral") {
    score += 25;
    reasoning.push("Área jurídica identificada (+25)");
  }

  if (message.length > 100) {
    score += 15;
    reasoning.push("Mensagem detalhada (+15)");
  }

  if (state.collectedData.timeframe) {
    score += 10;
    reasoning.push("Contexto temporal fornecido (+10)");
  }

  if (["quero", "preciso", "gostaria", "precisava", "queria", "posso", "consigo"].some((keyword) => message.toLowerCase().includes(keyword))) {
    score += 20;
    reasoning.push("Intenção de ação clara (+20)");
  }

  if ((state.triageCompleteness || 0) > 70) {
    score += 25;
    reasoning.push("Alta completude da triagem (+25)");
  }

  score = Math.min(100, Math.max(0, score));

  let temperature: "cold" | "warm" | "hot" = "cold";
  let priorityLevel: "low" | "medium" | "high" | "urgent" = "low";
  let recommendedAction: "continue_triage" | "schedule_consultation" | "human_handoff" | "send_info" = "continue_triage";
  let readyForHandoff = false;
  let commercialMomentDetected = false;

  if (score >= 70) {
    temperature = "hot";
    priorityLevel = "urgent";
    recommendedAction = "schedule_consultation";
    readyForHandoff = true;
    commercialMomentDetected = true;
    reasoning.push("Lead quente - pronto para conversão");
  } else if (score >= 45) {
    temperature = "warm";
    priorityLevel = "high";
    recommendedAction = "continue_triage";
    commercialMomentDetected = true;
    reasoning.push("Lead morno - potencial comercial");
  } else if (score >= 25) {
    temperature = "warm";
    priorityLevel = "medium";
    recommendedAction = "continue_triage";
    reasoning.push("Lead morno - requer qualificação");
  } else {
    reasoning.push("Lead frio - curiosidade inicial");
  }

  return {
    temperature,
    score,
    priorityLevel,
    recommendedAction,
    readyForHandoff,
    commercialMomentDetected,
    reasoning
  };
}

export function calculateTriageCompleteness(data: ConversationState["collectedData"]): number {
  const fields = [
    data.area,
    data.problema_principal,
    data.timeframe,
    data.tem_documentos !== undefined,
    data.objetivo_cliente,
    data.nivel_urgencia
  ];

  const completedFields = fields.filter((field) => field !== undefined && field !== null).length;
  return Math.round((completedFields / fields.length) * 100);
}

export function derivePolicyConversationTriageStage(
  state: ConversationState
): NonNullable<ConversationState["triageStage"]> {
  if (state.triageCompleteness >= 80) return "completed";
  if (state.collectedData.nivel_urgencia) return "urgency_assessed";
  if (state.collectedData.problema_principal || state.collectedData.timeframe || state.collectedData.tem_documentos !== undefined) {
    return "details_in_progress";
  }
  if (state.collectedData.area) return "area_identified";
  return "collecting_context";
}

export function deriveExplanationStage(
  state: ConversationState
): NonNullable<ConversationState["explanationStage"]> {
  if (state.consultationStage && state.consultationStage !== "not_offered") {
    return "consultation_positioned";
  }
  if (state.triageCompleteness >= 60) return "guidance_shared";
  if (state.collectedData.problema_principal) return "clarifying_questions";
  if (state.collectedData.area) return "understanding_case";
  return "not_started";
}

export function derivePolicyConsultationStage(
  state: ConversationState,
  consultationIntentDetected: boolean
): NonNullable<ConversationState["consultationStage"]> {
  const hasAvailability =
    Boolean(state.contactPreferences?.availability) ||
    Boolean(state.contactPreferences?.period) ||
    Boolean(state.contactPreferences?.urgency);

  if (state.commercialStatus === "consultation_scheduled") return "scheduled_pending_confirmation";
  if (state.triageCompleteness >= 70 && hasAvailability) return "ready_for_lawyer";
  if (hasAvailability) return "availability_collected";
  if (consultationIntentDetected) {
    return state.triageCompleteness >= 55 ? "collecting_availability" : "interest_detected";
  }
  if (state.commercialMomentDetected || state.recommendedAction === "schedule_consultation") {
    return "offered";
  }
  return "not_offered";
}

export function determineCommercialStatus(state: ConversationState): string {
  if (state.consultationStage === "scheduled_pending_confirmation") return "consultation_scheduled";
  if (state.consultationStage === "ready_for_lawyer" || state.readyForHandoff) return "qualified";
  if (
    state.consultationStage === "availability_collected" ||
    state.consultationStage === "collecting_availability" ||
    state.consultationStage === "interest_detected" ||
    state.consultationStage === "offered" ||
    state.commercialMomentDetected
  ) {
    return "consultation_proposed";
  }
  return "triage_in_progress";
}

export function determineConversationStatus(
  state: ConversationState
): NonNullable<ConversationState["conversationStatus"]> {
  if (state.operationalHandoffRecorded && state.consultationStage === "scheduled_pending_confirmation") {
    return "handed_off_to_lawyer";
  }
  if (state.operationalHandoffRecorded || state.lawyerNotificationGenerated) return "lawyer_notified";
  if (state.consultationStage === "ready_for_lawyer") return "consultation_ready";
  if (state.consultationStage === "availability_collected") return "scheduling_preference_captured";
  if (state.consultationStage === "collecting_availability") return "scheduling_in_progress";
  if (state.consultationStage === "interest_detected" || state.consultationStage === "offered") {
    return "consultation_offer";
  }
  if (state.explanationStage === "guidance_shared" || state.explanationStage === "consultation_positioned") {
    return "explanation_in_progress";
  }
  if (state.triageStage === "not_started") return "ai_active";
  return "triage_in_progress";
}

export function initializeConversationState(): ConversationState {
  return {
    currentStep: "acolhimento",
    collectedData: {},
    isHotLead: false,
    needsHumanAttention: false,
    triageCompleteness: 0,
    leadTemperature: "cold",
    conversionScore: 0,
    priorityLevel: "low",
    recommendedAction: "continue_triage",
    readyForHandoff: false,
    commercialMomentDetected: false,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    handoffReason: undefined,
    conversationStatus: "ai_active",
    triageStage: "not_started",
    explanationStage: "not_started",
    consultationStage: "not_offered",
    lawyerNotificationGenerated: false,
    lawyerNotificationState: "not_notified",
    contactPreferences: undefined,
    commercialStatus: undefined,
    aiActiveOnChannel: true,
    operationalHandoffRecorded: false,
    humanFollowUpPending: false,
    followUpReady: false,
    handoffReasonCode: undefined,
    handoffPackage: undefined
  };
}

export function updateConversationState(
  state: ConversationState,
  message: string,
  classification: MessageClassification,
  evaluatePolicyHandoff: (
    currentState: ConversationState,
    normalizedMessage: string
  ) => { needsAttention: boolean; readyForHandoff: boolean; reason: string }
): ConversationState {
  const lowerMessage = message.toLowerCase();
  const newState: ConversationState = {
    ...state,
    collectedData: {
      ...state.collectedData,
      detalhes: [...(state.collectedData.detalhes ?? [])],
      palavras_chave: extractKeywords(message)
    }
  };

  switch (state.currentStep) {
    case "acolhimento":
      newState.currentStep = "identificacao_area";
      newState.collectedData.area = classification.theme;
      break;
    case "identificacao_area":
      if (!newState.collectedData.problema_principal) {
        newState.collectedData.problema_principal = message;
        newState.currentStep = "tempo_momento";
      }
      break;
    case "tempo_momento": {
      const timeInfo = extractTimeInfo(message);
      newState.collectedData.timeframe = timeInfo.timeframe;
      newState.collectedData.acontecendo_agora = timeInfo.isHappeningNow;
      newState.currentStep = "documentos_provas";
      break;
    }
    case "documentos_provas": {
      const docInfo = extractDocumentInfo(message);
      newState.collectedData.tem_documentos = docInfo.hasDocuments;
      newState.collectedData.tipos_documentos = docInfo.documentTypes;
      newState.currentStep = "objetivo_cliente";
      break;
    }
    case "objetivo_cliente":
      if (!newState.collectedData.objetivo_cliente) {
        newState.collectedData.objetivo_cliente = message;
        newState.currentStep = "avaliacao_urgencia";
      }
      break;
    case "avaliacao_urgencia": {
      const urgencyInfo = extractUrgencyInfo(message);
      newState.collectedData.nivel_urgencia = urgencyInfo.level;
      newState.collectedData.prejuizo_ativo = urgencyInfo.hasActiveDamage;
      newState.isHotLead = urgencyInfo.level === "alta" || urgencyInfo.hasActiveDamage;
      newState.currentStep = "resumo_encaminhamento";
      break;
    }
    case "resumo_encaminhamento":
      newState.currentStep = "resumo_encaminhamento";
      break;
  }

  newState.triageCompleteness = calculateTriageCompleteness(newState.collectedData);

  const leadScoreResult = calculateLeadScore(newState, message);
  newState.leadTemperature = leadScoreResult.temperature;
  newState.conversionScore = leadScoreResult.score;
  newState.priorityLevel = leadScoreResult.priorityLevel;
  newState.recommendedAction = leadScoreResult.recommendedAction;
  newState.commercialMomentDetected = leadScoreResult.commercialMomentDetected;
  newState.isHotLead =
    leadScoreResult.temperature === "hot" ||
    newState.collectedData.nivel_urgencia === "alta" ||
    newState.collectedData.prejuizo_ativo === true;

  const extractedPreferences = extractContactPreferences(message);
  const hasNewPreferences =
    extractedPreferences.channel ||
    extractedPreferences.period ||
    extractedPreferences.urgency ||
    extractedPreferences.availability;

  if (hasNewPreferences) {
    newState.contactPreferences = {
      channel: extractedPreferences.channel ?? newState.contactPreferences?.channel ?? "whatsapp",
      period: extractedPreferences.period ?? newState.contactPreferences?.period ?? "qualquer_horario",
      urgency: extractedPreferences.urgency ?? newState.contactPreferences?.urgency ?? "sem_urgencia",
      availability:
        extractedPreferences.availability ||
        newState.contactPreferences?.availability ||
        message.trim()
    };
  }

  const consultationIntentDetected =
    classification.intent === "appointment_interest" ||
    lowerMessage.includes("consulta") ||
    lowerMessage.includes("agendar") ||
    lowerMessage.includes("horario") ||
    lowerMessage.includes("horário") ||
    lowerMessage.includes("manha") ||
    lowerMessage.includes("manhã") ||
    lowerMessage.includes("tarde") ||
    lowerMessage.includes("noite");

  newState.triageStage = derivePolicyConversationTriageStage(newState);
  newState.consultationStage = derivePolicyConsultationStage(newState, consultationIntentDetected);
  newState.explanationStage = deriveExplanationStage(newState);
  newState.commercialStatus = determineCommercialStatus(newState) as ConversationState["commercialStatus"];
  newState.conversationStatus = determineConversationStatus(newState);

  const policyHandoffDecision = evaluatePolicyHandoff(newState, lowerMessage);
  newState.needsHumanAttention = policyHandoffDecision.needsAttention;
  newState.readyForHandoff = policyHandoffDecision.readyForHandoff;
  newState.handoffReason = policyHandoffDecision.reason || undefined;
  newState.handoffReasonCode = policyHandoffDecision.readyForHandoff
    ? policyHandoffDecision.reason === "Excecao_operacional_com_urgencia_real"
      ? "operational_exception"
      : "consultation_ready"
    : undefined;
  newState.aiActiveOnChannel = true;
  newState.operationalHandoffRecorded = newState.operationalHandoffRecorded || false;
  newState.followUpReady =
    Boolean(newState.contactPreferences?.availability) ||
    newState.consultationStage === "ready_for_lawyer" ||
    newState.consultationStage === "scheduled_pending_confirmation";
  newState.humanFollowUpPending =
    newState.operationalHandoffRecorded ||
    newState.consultationStage === "ready_for_lawyer" ||
    newState.consultationStage === "scheduled_pending_confirmation";
  newState.lawyerNotificationState = newState.operationalHandoffRecorded
    ? "notified"
    : newState.readyForHandoff
      ? "ready_to_notify"
      : "not_notified";

  return newState;
}
