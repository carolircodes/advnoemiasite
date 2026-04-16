export type ConsultationReadiness =
  | "cold"
  | "clarifying"
  | "advanced_triage"
  | "almost_ready"
  | "ready_for_consultation"
  | "closing"
  | "blocked_by_objection"
  | "blocked_by_silence"
  | "blocked_by_missing_context";

export type ConversionStage =
  | "new_contact"
  | "in_welcome"
  | "in_triage"
  | "in_qualification"
  | "consultation_ready"
  | "proposal_in_motion"
  | "awaiting_decision"
  | "converted_to_consultation"
  | "cooled_down"
  | "lost"
  | "reactivable";

export type CommercialRecommendedAction =
  | "continue_clarifying"
  | "request_additional_information"
  | "request_documents"
  | "offer_consultation"
  | "reinforce_consultation_value"
  | "follow_up"
  | "reassign_owner"
  | "mark_waiting_client"
  | "mark_hot_opportunity"
  | "register_objection"
  | "reactivate_lead"
  | "move_to_closing";

export type BlockingReason =
  | "missing_context"
  | "missing_documents"
  | "objection_value"
  | "objection_viability"
  | "objection_insecurity"
  | "lead_silent"
  | "waiting_office"
  | "diffuse_interest"
  | "urgency_without_structure"
  | null;

export type ObjectionState =
  | "none"
  | "value"
  | "viability"
  | "insecurity"
  | "timing"
  | "silent";

export type OpportunityState = "monitor" | "warm" | "hot" | "closing";
export type ConsultationRecommendationState = "hold" | "prepare" | "recommend_now" | "closing";

export type CommercialConversionAssessment = {
  consultationReadiness: ConsultationReadiness;
  conversionStage: ConversionStage;
  recommendedAction: CommercialRecommendedAction;
  recommendedActionLabel: string;
  recommendedActionDetail: string;
  conversionSignal: string;
  blockingReason: BlockingReason;
  objectionState: ObjectionState;
  objectionHint: string | null;
  opportunityState: OpportunityState;
  consultationRecommendationState: ConsultationRecommendationState;
  consultationRecommendationReason: string | null;
  consultationSuggestedCopy: string | null;
  recommendedFollowUpWindow: string | null;
  advancementReason: string;
};

export type CommercialConversionInput = {
  pipelineId?: string | null;
  pipelineStage?: string | null;
  leadTemperature?: string | null;
  followUpStatus?: string | null;
  followUpState?: string | null;
  followUpReason?: string | null;
  waitingOn?: string | null;
  nextStep?: string | null;
  nextStepDueAt?: string | null;
  notes?: string | null;
  lastContactAt?: string | null;
  ownerProfileId?: string | null;
  latestSummary?: string | null;
  latestNote?: string | null;
  pendingDocumentsCount?: number | null;
  conversationState?: {
    reportSummary?: string | null;
    consultationStage?: string | null;
    consultationIntentLevel?: string | null;
    consultationInviteState?: string | null;
    consultationInviteTiming?: string | null;
    consultationInviteCopy?: string | null;
    consultationValueAngle?: string | null;
    schedulingStatus?: string | null;
    schedulingReadiness?: string | null;
    closeOpportunityState?: string | null;
    objectionsDetected?: string[] | null;
    hesitationSignals?: string[] | null;
    valueSignals?: string[] | null;
    urgencySignals?: string[] | null;
    conversionScore?: number | null;
    humanHandoffReady?: boolean | null;
  } | null;
};

type SyncAssessmentInput = CommercialConversionInput & {
  pipelineId: string;
  sessionId?: string | null;
  createEvent?: boolean;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function pushReason(reasons: string[], condition: unknown, reason: string) {
  if (condition) {
    reasons.push(reason);
  }
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function labelForRecommendedAction(action: CommercialRecommendedAction) {
  switch (action) {
    case "continue_clarifying":
      return "Continuar esclarecendo";
    case "request_additional_information":
      return "Pedir mais contexto";
    case "request_documents":
      return "Pedir documentos";
    case "offer_consultation":
      return "Sugerir consulta";
    case "reinforce_consultation_value":
      return "Reforcar valor da consulta";
    case "follow_up":
      return "Seguir em follow-up";
    case "reassign_owner":
      return "Ajustar owner";
    case "mark_waiting_client":
      return "Marcar aguardando cliente";
    case "mark_hot_opportunity":
      return "Marcar oportunidade quente";
    case "register_objection":
      return "Registrar objecao";
    case "reactivate_lead":
      return "Reativar lead";
    case "move_to_closing":
      return "Encaminhar para fechamento";
  }
}

function buildConsultationCopy(input: CommercialConversionInput, reasons: string[]) {
  const valueAngle =
    input.conversationState?.consultationValueAngle ||
    (input.pendingDocumentsCount && input.pendingDocumentsCount > 0
      ? "clareza sobre o que ainda precisa ser organizado antes do proximo passo"
      : "orientacao individual com mais criterio, contexto e seguranca");

  return `Pelo contexto que voce ja trouxe, faz sentido avancarmos para uma consulta. Ela ajuda a trazer ${valueAngle}. Se fizer sentido para voce, eu organizo o proximo passo com mais precisao.`;
}

export function evaluateCommercialConversion(
  input: CommercialConversionInput
): CommercialConversionAssessment {
  const pipelineStage = normalizeText(input.pipelineStage);
  const followUpState = normalizeText(input.followUpState);
  const followUpStatus = normalizeText(input.followUpStatus);
  const waitingOn = normalizeText(input.waitingOn);
  const consultationStage = normalizeText(input.conversationState?.consultationStage);
  const consultationIntentLevel = normalizeText(input.conversationState?.consultationIntentLevel);
  const consultationInviteState = normalizeText(input.conversationState?.consultationInviteState);
  const schedulingStatus = normalizeText(input.conversationState?.schedulingStatus);
  const leadTemperature = normalizeText(input.leadTemperature);
  const corpus = normalizeText(
    [
      input.latestSummary,
      input.latestNote,
      input.notes,
      input.nextStep,
      input.followUpReason,
      input.conversationState?.reportSummary
    ]
      .filter(Boolean)
      .join(" | ")
  );

  const objectionsDetected = input.conversationState?.objectionsDetected || [];
  const hesitationSignals = input.conversationState?.hesitationSignals || [];
  const urgencySignals = input.conversationState?.urgencySignals || [];
  const valueSignals = input.conversationState?.valueSignals || [];
  const conversionScore = input.conversationState?.conversionScore || 0;
  const pendingDocumentsCount = input.pendingDocumentsCount || 0;

  const askedForConsultation =
    consultationIntentLevel === "clear" ||
    consultationIntentLevel === "accepted" ||
    includesAny(corpus, [
      "consulta",
      "agendar",
      "agendamento",
      "valor",
      "quanto custa",
      "proximos passos",
      "próximos passos"
    ]);
  const askedForValue = includesAny(corpus, ["valor", "quanto custa", "preco", "preço", "caro"]);
  const missingDocuments =
    pendingDocumentsCount > 0 ||
    includesAny(corpus, ["documento", "documentos", "comprovante", "contrato", "laudo", "extrato"]);
  const promisedDocuments = includesAny(corpus, ["vou enviar", "mando depois", "envio depois", "separo os documentos"]);
  const contextRich =
    conversionScore >= 70 ||
    consultationStage === "ready_for_lawyer" ||
    consultationStage === "availability_collected" ||
    consultationStage === "scheduled_pending_confirmation" ||
    corpus.length >= 160 ||
    valueSignals.length >= 1;
  const contextPartial = contextRich || conversionScore >= 45 || corpus.length >= 80;
  const stillEarly =
    conversionScore < 30 &&
    !askedForConsultation &&
    true &&
    !missingDocuments &&
    valueSignals.length === 0;
  const strongUrgency =
    urgencySignals.length >= 1 ||
    includesAny(corpus, ["urgente", "prazo", "bloqueio", "amea", "violencia", "violência", "risco"]);
  const objectionValue =
    objectionsDetected.some((item) => normalizeText(item).includes("valor")) ||
    includesAny(corpus, ["caro", "valor", "quanto custa", "preco", "preço"]);
  const objectionViability =
    objectionsDetected.some((item) => normalizeText(item).includes("viab")) ||
    includesAny(corpus, ["sera que vale", "será que vale", "da certo", "dá certo", "viavel", "viável"]);
  const objectionInsecurity =
    objectionsDetected.some((item) => normalizeText(item).includes("inseg")) ||
    hesitationSignals.length > 0 ||
    includesAny(corpus, ["tenho receio", "tenho duvida", "tenho dúvida", "nao sei", "não sei", "insegur"]);
  const silentLead =
    followUpState === "overdue" ||
    followUpStatus === "overdue" ||
    includesAny(corpus, ["sumiu", "sem resposta", "nao respondeu", "não respondeu"]);
  const waitingOffice =
    waitingOn === "team" ||
    includesAny(corpus, ["aguardando retorno", "aguardando o escritorio", "aguardando o escritório"]);
  const diffuseInterest =
    !askedForConsultation &&
    !strongUrgency &&
    !contextPartial &&
    includesAny(corpus, ["queria entender", "talvez", "so queria saber", "só queria saber"]);

  const reasons: string[] = [];
  let blockingReason: BlockingReason = null;
  let objectionState: ObjectionState = "none";
  let consultationReadiness: ConsultationReadiness = "cold";
  let conversionStage: ConversionStage = "new_contact";
  let recommendedAction: CommercialRecommendedAction = "continue_clarifying";
  let recommendedActionDetail =
    "Ainda e cedo para consulta. O foco agora e ganhar clareza sem pressa e sem perder o tom premium.";
  let opportunityState: OpportunityState = leadTemperature === "hot" ? "hot" : leadTemperature === "warm" ? "warm" : "monitor";
  let consultationRecommendationState: ConsultationRecommendationState = "hold";
  let consultationRecommendationReason: string | null = null;
  let consultationSuggestedCopy: string | null = null;
  let recommendedFollowUpWindow: string | null = null;

  if (pipelineStage === "closed_lost") {
    consultationReadiness = "cold";
    conversionStage = "lost";
    recommendedAction = "reactivate_lead";
    recommendedActionDetail = "O lead foi marcado como perdido. So vale retomar se houver sinal novo e contexto melhor.";
    opportunityState = "monitor";
    consultationRecommendationState = "hold";
    blockingReason = "diffuse_interest";
    recommendedFollowUpWindow = "7 dias";
    pushReason(reasons, true, "Pipeline ja foi encerrado como perdido.");
  } else if (pipelineStage === "consultation_scheduled" || schedulingStatus === "confirmed") {
    consultationReadiness = "closing";
    conversionStage = "converted_to_consultation";
    recommendedAction = "move_to_closing";
    recommendedActionDetail = "A consulta ja esta em fase de confirmacao. Agora o objetivo e preservar contexto e evitar atrito.";
    opportunityState = "closing";
    consultationRecommendationState = "closing";
    consultationRecommendationReason = "Consulta ja aceita ou confirmada.";
    recommendedFollowUpWindow = "24h";
    pushReason(reasons, true, "Consulta ja entrou em fase de confirmacao.");
  } else if (pipelineStage === "proposal_sent" || pipelineStage === "contract_pending") {
    consultationReadiness = "closing";
    conversionStage = "awaiting_decision";
    recommendedAction = "move_to_closing";
    recommendedActionDetail = "A conversa ja saiu da triagem e entrou em decisao. O movimento agora e fechamento com elegancia.";
    opportunityState = "closing";
    consultationRecommendationState = "closing";
    consultationRecommendationReason = "Ha proposta ou contrato em curso.";
    recommendedFollowUpWindow = "48h";
    pushReason(reasons, true, "Lead ja esta em etapa de decisao comercial.");
  } else if (silentLead) {
    consultationReadiness = "blocked_by_silence";
    conversionStage = askedForConsultation || leadTemperature === "hot" ? "reactivable" : "cooled_down";
    recommendedAction = askedForConsultation || leadTemperature === "hot" ? "reactivate_lead" : "follow_up";
    recommendedActionDetail =
      "Existe sinal comercial anterior, mas o lead esfriou. Vale um follow-up elegante, curto e reativador.";
    blockingReason = "lead_silent";
    objectionState = "silent";
    opportunityState = askedForConsultation || leadTemperature === "hot" ? "warm" : "monitor";
    recommendedFollowUpWindow = "48h";
    pushReason(reasons, true, "Lead sem resposta apos follow-up ou janela combinada.");
  } else if ((objectionValue && !askedForConsultation) || objectionViability || objectionInsecurity) {
    consultationReadiness = "blocked_by_objection";
    conversionStage = "in_qualification";
    recommendedAction = objectionValue || objectionViability ? "reinforce_consultation_value" : "register_objection";
    recommendedActionDetail =
      objectionValue
        ? "Existe trava de valor. O ideal e reposicionar o valor da consulta sem parecer insistente."
        : objectionViability
          ? "Existe duvida sobre viabilidade. O proximo passo e responder com criterio antes de empurrar agenda."
          : "Existe inseguranca. Vale registrar a objecao e reduzir friccao antes de convidar.";
    blockingReason = objectionValue
      ? "objection_value"
      : objectionViability
        ? "objection_viability"
        : "objection_insecurity";
    objectionState = objectionValue ? "value" : objectionViability ? "viability" : "insecurity";
    opportunityState = askedForConsultation || leadTemperature === "hot" ? "warm" : "monitor";
    consultationRecommendationState = askedForConsultation && contextPartial ? "prepare" : "hold";
    consultationRecommendationReason =
      "Ha intencao comercial, mas a conversa ainda pede resposta para a principal objecao.";
    recommendedFollowUpWindow = "24h";
    pushReason(reasons, true, "Existe objecao ou hesitacao explicita na conversa.");
  } else if (missingDocuments && !promisedDocuments && (askedForConsultation || contextPartial)) {
    consultationReadiness = "blocked_by_missing_context";
    conversionStage = "in_qualification";
    recommendedAction = "request_documents";
    recommendedActionDetail =
      "O lead mostra avancar, mas ainda falta base documental para sustentar a recomendacao com seguranca.";
    blockingReason = "missing_documents";
    opportunityState = askedForConsultation || leadTemperature === "hot" ? "warm" : "monitor";
    consultationRecommendationState = "prepare";
    consultationRecommendationReason =
      "Ha sinais de prontidao, mas documentos essenciais ainda nao chegaram.";
    recommendedFollowUpWindow = "24h";
    pushReason(reasons, true, "Faltam documentos para sustentar o proximo passo.");
  } else if (stillEarly || !contextPartial || diffuseInterest) {
    consultationReadiness = stillEarly ? "cold" : contextPartial ? "clarifying" : "cold";
    conversionStage = contextPartial && !stillEarly ? "in_triage" : "new_contact";
    recommendedAction =
      contextPartial && !stillEarly ? "request_additional_information" : "continue_clarifying";
    recommendedActionDetail =
      "Ainda nao ha contexto suficiente para consulta. O melhor movimento e aprofundar o essencial sem precipitar convite.";
    blockingReason =
      stillEarly ? null : contextPartial ? "missing_context" : diffuseInterest ? "diffuse_interest" : null;
    opportunityState = leadTemperature === "warm" ? "warm" : "monitor";
    consultationRecommendationState = "hold";
    recommendedFollowUpWindow = "72h";
    pushReason(reasons, true, "Contexto ainda insuficiente para sugerir consulta com criterio.");
  } else if (
    consultationInviteState === "invite_now" ||
    consultationInviteState === "accepted" ||
    consultationStage === "ready_for_lawyer" ||
    askedForConsultation
  ) {
    consultationReadiness = contextRich ? "ready_for_consultation" : "almost_ready";
    conversionStage = contextRich ? "consultation_ready" : "in_qualification";
    recommendedAction = contextRich ? "offer_consultation" : "reinforce_consultation_value";
    recommendedActionDetail = contextRich
      ? "Os sinais ja sustentam uma sugestao de consulta elegante, com justificativa clara e sem parecer cedo demais."
      : "Ja ha intencao, mas ainda vale consolidar valor e contexto antes do convite final.";
    opportunityState = contextRich || leadTemperature === "hot" ? "hot" : "warm";
    consultationRecommendationState = contextRich ? "recommend_now" : "prepare";
    consultationRecommendationReason = contextRich
      ? "O lead trouxe contexto, mostrou intencao real e ja pede um proximo passo mais decisivo."
      : "O lead demonstra intencao, mas ainda falta amarrar alguns elementos antes do convite.";
    consultationSuggestedCopy =
      consultationRecommendationState === "recommend_now"
        ? buildConsultationCopy(input, reasons)
        : null;
    recommendedFollowUpWindow = contextRich ? "24h" : "48h";
    pushReason(reasons, true, "Ha sinais claros de intencao para consulta ou proximos passos.");
  } else if (contextRich || strongUrgency || consultationInviteState === "should_position_value") {
    consultationReadiness = strongUrgency || conversionScore >= 70 ? "almost_ready" : "advanced_triage";
    conversionStage = "in_qualification";
    recommendedAction = missingDocuments ? "request_documents" : "reinforce_consultation_value";
    recommendedActionDetail = missingDocuments
      ? "O caso ja aponta para avancar, mas ainda precisa de documento-chave para sair da triagem com mais seguranca."
      : "A conversa ja esta madura o bastante para posicionar o valor da consulta, sem empurrar demais.";
    opportunityState = strongUrgency || leadTemperature === "hot" ? "hot" : "warm";
    consultationRecommendationState = strongUrgency || conversionScore >= 70 ? "prepare" : "hold";
    consultationRecommendationReason =
      "Ha densidade comercial e sinais de urgencia, mas ainda cabe lapidar o movimento.";
    recommendedFollowUpWindow = strongUrgency ? "24h" : "48h";
    pushReason(reasons, true, "A triagem ja gerou contexto comercial aproveitavel.");
  } else {
    consultationReadiness = "advanced_triage";
    conversionStage = "in_triage";
    recommendedAction = waitingOffice ? "reassign_owner" : waitingOn === "client" ? "mark_waiting_client" : "continue_clarifying";
    recommendedActionDetail = waitingOffice
      ? "O lead esta aguardando retorno interno. Vale garantir owner claro para nao perder velocidade."
      : waitingOn === "client"
        ? "O proximo passo e manter disciplina de espera ativa, com follow-up no tempo certo."
        : "A conversa pede mais triagem antes de convite ou fechamento.";
    blockingReason = waitingOffice ? "waiting_office" : null;
    opportunityState = leadTemperature === "hot" ? "hot" : leadTemperature === "warm" ? "warm" : "monitor";
    consultationRecommendationState = "hold";
    recommendedFollowUpWindow = waitingOn === "client" ? "48h" : "72h";
    pushReason(reasons, true, "Conversa ainda em consolidacao comercial.");
  }

  if (recommendedAction === "offer_consultation" && !consultationSuggestedCopy) {
    consultationSuggestedCopy = buildConsultationCopy(input, reasons);
  }

  if (recommendedAction === "reassign_owner" && !input.ownerProfileId) {
    pushReason(reasons, true, "Ainda nao existe owner comercial definido.");
  }

  if (opportunityState === "hot" && consultationRecommendationState === "recommend_now") {
    pushReason(reasons, true, "Janela comercial forte para consulta.");
  }

  const objectionHint =
    objectionState === "value"
      ? "Reposicionar valor da consulta com foco em clareza e economia de desgaste."
      : objectionState === "viability"
        ? "Responder sobre viabilidade antes de pedir decisao."
        : objectionState === "insecurity"
          ? "Reduzir inseguranca e mostrar proximo passo com seguranca."
          : objectionState === "silent"
            ? "Retomar com follow-up curto, educado e reativador."
            : null;

  const conversionSignal = uniqueStrings([
    consultationReadiness.replaceAll("_", " "),
    consultationRecommendationState === "recommend_now" ? "consulta recomendada" : null,
    blockingReason ? blockingReason.replaceAll("_", " ") : null,
    opportunityState === "hot" ? "oportunidade quente" : null
  ]).join(" | ");

  return {
    consultationReadiness,
    conversionStage,
    recommendedAction,
    recommendedActionLabel: labelForRecommendedAction(recommendedAction),
    recommendedActionDetail,
    conversionSignal,
    blockingReason,
    objectionState,
    objectionHint,
    opportunityState,
    consultationRecommendationState,
    consultationRecommendationReason,
    consultationSuggestedCopy,
    recommendedFollowUpWindow,
    advancementReason: reasons.join(" "),
  };
}

class CommercialConversionService {
  async syncPipelineAssessment(input: SyncAssessmentInput) {
    const { createAdminSupabaseClient } = await import("../supabase/admin");
    const supabase = createAdminSupabaseClient();
    const assessment = evaluateCommercialConversion(input);
    const now = new Date().toISOString();

    const updatePayload = {
      consultation_readiness: assessment.consultationReadiness,
      conversion_stage: assessment.conversionStage,
      recommended_action: assessment.recommendedAction,
      recommended_action_detail: assessment.recommendedActionDetail,
      conversion_signal: assessment.conversionSignal,
      blocking_reason: assessment.blockingReason,
      objection_state: assessment.objectionState,
      objection_hint: assessment.objectionHint,
      opportunity_state: assessment.opportunityState,
      consultation_recommendation_state: assessment.consultationRecommendationState,
      consultation_recommendation_reason: assessment.consultationRecommendationReason,
      consultation_suggested_copy: assessment.consultationSuggestedCopy,
      recommended_follow_up_window: assessment.recommendedFollowUpWindow,
      advancement_reason: assessment.advancementReason,
      last_conversion_signal_at: now,
      updated_at: now
    };

    await supabase.from("client_pipeline").update(updatePayload).eq("id", input.pipelineId);

    if (input.sessionId && input.createEvent) {
      await supabase.from("conversation_events").insert({
        session_id: input.sessionId,
        event_type: "commercial_conversion_synced",
        actor_type: "system",
        event_data: {
          summary: `Leitura comercial sincronizada: ${assessment.consultationReadiness} / ${assessment.recommendedAction}.`,
          consultationReadiness: assessment.consultationReadiness,
          conversionStage: assessment.conversionStage,
          recommendedAction: assessment.recommendedAction,
          blockingReason: assessment.blockingReason,
          opportunityState: assessment.opportunityState
        }
      });
    }

    return assessment;
  }
}

export const commercialConversionService = new CommercialConversionService();
