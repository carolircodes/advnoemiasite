import type {
  ClassifiedIntent,
  ConversationState,
  LeadTemperature,
  LegalTheme,
  NoemiaUserType
} from "./core-types.ts";

type LeadIntention = "perdido" | "desconfiado" | "pronto";

type ConversationContext = {
  userName?: string;
  detectedArea?: LegalTheme;
  problemSummary?: string;
  lastTopics?: string[];
  messageCount: number;
  leadIntention?: LeadIntention;
};

type LeadIntentionProfile = {
  type: LeadIntention;
  textLength: "curto" | "medio" | "longo";
  empathyLevel: "baixa" | "media" | "alta";
  conversationSpeed: "lenta" | "normal" | "rapida";
  insightIntensity: "suave" | "moderada" | "forte";
  skipQuestions: boolean;
  fastConversion: boolean;
};

export type ResponseComposerHelpers = {
  getSaudacao: () => string;
  detectLegalArea: (message: string) => LegalTheme;
  detectLeadIntention: (message: string) => LeadIntention;
  getLeadProfile: (leadIntention: LeadIntention) => LeadIntentionProfile;
  detectBuyingIntention: (message: string) => {
    shouldFastConvert: boolean;
    intentionType?: "preco" | "como_funciona" | "intencao_resolver" | "decisao_compra";
  };
  generateFastConversionMessage: (
    intentionType: "preco" | "como_funciona" | "intencao_resolver" | "decisao_compra"
  ) => string;
  generateClosingMessage: (context: ConversationContext, previousMessage: string) => string | null;
  shouldFastConversion: (leadProfile: LeadIntentionProfile) => boolean;
  shouldSkipQuestions: (leadProfile: LeadIntentionProfile) => boolean;
  getVariationWithoutRepetition: (variations: string[], context: string) => string;
  adaptMessageForLead: (
    message: string,
    leadProfile: LeadIntentionProfile,
    area: LegalTheme
  ) => string;
  addIntelligentEmpathy: (
    message: string,
    area: LegalTheme,
    context: ConversationContext
  ) => string;
  personalizeMessage: (message: string, context: ConversationContext) => string;
  adaptMessageTone: (message: string, area: LegalTheme) => string;
  shouldAdvanceToNextStage: (state: ConversationState) => boolean;
};

const MESSAGE_VARIATIONS = {
  abertura: [
    "Me conta melhor o que aconteceu no seu caso.",
    "Quero entender direitinho o que está acontecendo.",
    "Pode me explicar com mais detalhes a sua situação?",
    "Vamos entender melhor isso juntos.",
    "Me conta com calma o que está acontecendo no seu caso."
  ],
  investigacao: [
    "E o que aconteceu exatamente?",
    "Me conta mais detalhes sobre isso.",
    "Pode me explicar melhor o que rolou?"
  ],
  tempo: [
    "E quando começou essa situação?",
    "Há quanto tempo isso está acontecendo?",
    "Quando foi que isso começou?"
  ],
  tentativa: [
    "Você já tentou resolver isso de alguma forma?",
    "Já fez alguma tentativa de resolver isso?",
    "Já procurou alguma solução para isso?"
  ],
  negativa: [
    "Teve alguma negativa ou resposta oficial?",
    "Recebeu alguma resposta negativa?",
    "Alguém te deu uma resposta oficial sobre isso?"
  ],
  insight: [
    "Pelo que você descreveu, há sinais importantes que merecem uma análise mais cuidadosa.",
    "O que você me contou indica um contexto que pode ter sido mal avaliado.",
    "Sua situação tem elementos que pedem leitura mais criteriosa."
  ],
  direcionamento: [
    "O ideal agora é uma análise mais detalhada do seu caso.",
    "O próximo passo é aprofundar sua situação com mais cuidado.",
    "O melhor caminho agora é examinar seu caso com mais atenção."
  ],
  conversao: [
    "Se fizer sentido para você, eu posso organizar a próxima etapa agora.",
    "Posso te explicar como funciona e já encaminhar o agendamento.",
    "Se você quiser, eu sigo com você e deixo a próxima etapa bem alinhada."
  ]
};

function generateConversionMessage(state: ConversationState): string {
  const score = state.conversionScore;
  const temperature = state.leadTemperature;
  const action = state.recommendedAction;

  if (temperature === "hot" && score >= 70) {
    if (action === "schedule_consultation") {
      return "Entendi o peso do seu caso. Pelo que voce me trouxe, faz sentido organizar uma consulta com a Dra. Noemia, para que a analise aconteca com profundidade e responsabilidade.\n\nPara eu deixar isso pronto sem perder o ritmo da conversa, qual dia ou turno costuma funcionar melhor para voce?";
    }

    if (action === "human_handoff") {
      return "Compreendo a urgência e a sensibilidade do que você está vivendo. Vou priorizar isso operacionalmente para a equipe da Dra. Noêmia sem perder o contexto da nossa conversa.\n\nEnquanto organizo esse encaminhamento, sigo com você por aqui para confirmar o essencial. Qual dia, turno ou faixa de horário tende a funcionar melhor para o atendimento?";
    }
  }

  if (temperature === "warm" && score >= 45) {
    return "Ja estou entendendo bem o seu cenario, e ele merece uma analise cuidadosa. Para evitar uma orientacao incompleta, o caminho mais responsavel e avancarmos para a consulta individual.\n\nSe fizer sentido para voce, eu organizo isso agora. Qual dia ou horario costuma ser melhor?";
  }

  if (temperature === "cold" && score >= 25) {
    return "Ja da para ver que existe uma situacao real que merece ser entendida melhor. Muitas vezes o que parece confuso no inicio fica mais claro com uma analise profissional responsavel.\n\nSe fizer sentido, posso organizar uma conversa inicial para entender melhor seu caso.";
  }

  return "Obrigada por compartilhar esses detalhes. Cada informacao me ajuda a entender melhor seu cenario.\n\nPara organizar uma orientacao inicial responsavel, preciso esclarecer poucos pontos essenciais da sua situacao. Podemos continuar?";
}

export function generateTriageResponse(
  state: ConversationState,
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  },
  previousMessage: string | undefined,
  helpers: ResponseComposerHelpers
): string {
  const shortResponses = ["sim", "não", "nao", "ainda não", "ainda nao", "quero", "ok", "entendi", "certo"];
  const isShortResponse = Boolean(
    previousMessage && shortResponses.some((value) => previousMessage.toLowerCase().trim() === value)
  );

  const detectedArea = helpers.detectLegalArea(previousMessage || "");
  const leadIntention = helpers.detectLeadIntention(previousMessage || "");
  const leadProfile = helpers.getLeadProfile(leadIntention);
  const context: ConversationContext = {
    userName: undefined,
    detectedArea: detectedArea !== "geral" ? detectedArea : classification.theme,
    problemSummary: undefined,
    lastTopics: [detectedArea],
    messageCount: 1,
    leadIntention
  };

  if (previousMessage) {
    const buyingIntention = helpers.detectBuyingIntention(previousMessage);
    if (buyingIntention.shouldFastConvert && buyingIntention.intentionType) {
      return helpers.generateFastConversionMessage(buyingIntention.intentionType);
    }

    const closingMessage = helpers.generateClosingMessage(context, previousMessage);
    if (closingMessage) {
      return closingMessage;
    }
  }

  if (helpers.shouldFastConversion(leadProfile) && state.conversionScore >= 40) {
    return generateConversionMessage(state);
  }

  if (helpers.shouldAdvanceToNextStage(state)) {
    return generateConversionMessage(state);
  }

  let baseMessage = "";

  switch (state.currentStep) {
    case "acolhimento":
      baseMessage = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, "abertura");
      break;
    case "identificacao_area":
      if (helpers.shouldSkipQuestions(leadProfile)) return generateConversionMessage(state);
      baseMessage = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.investigacao, "investigacao");
      break;
    case "tempo_momento":
      if (helpers.shouldSkipQuestions(leadProfile)) return generateConversionMessage(state);
      baseMessage = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.tempo, "tempo");
      break;
    case "documentos_provas":
      if (helpers.shouldSkipQuestions(leadProfile)) return generateConversionMessage(state);
      baseMessage = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.tentativa, "tentativa");
      break;
    case "objetivo_cliente":
      if (helpers.shouldSkipQuestions(leadProfile)) return generateConversionMessage(state);
      baseMessage = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.negativa, "negativa");
      break;
    case "avaliacao_urgencia":
      if (state.commercialMomentDetected && state.conversionScore >= 60) {
        return generateConversionMessage(state);
      }

      if (state.needsHumanAttention) {
        const insight = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.insight, "insight");
        const direcionamento = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.direcionamento, "direcionamento");
        const conversao = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.conversao, "conversao");
        return `${insight}\n\n${direcionamento}\n\n${conversao}`;
      }

      return `${helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.insight, "insight")}\n\n${helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.direcionamento, "direcionamento")}`;
    case "resumo_encaminhamento":
      return generateConversionMessage(state);
    default:
      baseMessage = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, "abertura");
      break;
  }

  if (!isShortResponse || isShortResponse) {
    baseMessage = helpers.adaptMessageForLead(baseMessage, leadProfile, context.detectedArea || "geral");
    baseMessage = helpers.addIntelligentEmpathy(baseMessage, context.detectedArea || "geral", context);
    baseMessage = helpers.personalizeMessage(baseMessage, context);
    baseMessage = helpers.adaptMessageTone(baseMessage, context.detectedArea || "geral");
  }

  return baseMessage;
}

export function generateFallbackResponse(
  intent: string,
  userType: NoemiaUserType,
  detectedTheme: string | undefined,
  helpers: Pick<
    ResponseComposerHelpers,
    | "getSaudacao"
    | "detectLegalArea"
    | "getVariationWithoutRepetition"
    | "addIntelligentEmpathy"
    | "personalizeMessage"
    | "adaptMessageTone"
  >
): string {
  void helpers.getSaudacao();
  void helpers.detectLegalArea("");

  const context: ConversationContext = {
    detectedArea: (detectedTheme as LegalTheme) || "geral",
    messageCount: 1
  };

  if (intent === "greeting" || intent === "agenda_request" || detectedTheme) {
    let message = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, "fallback_abertura");
    message = helpers.addIntelligentEmpathy(message, context.detectedArea || "geral", context);
    message = helpers.personalizeMessage(message, context);
    return helpers.adaptMessageTone(message, context.detectedArea || "geral");
  }

  if (intent === "case_request" && userType !== "visitor") {
    let message = `Entendi. Pequenos detalhes podem mudar tudo.\n\n${helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.investigacao, "fallback_investigacao")}`;
    message = helpers.addIntelligentEmpathy(message, context.detectedArea || "geral", context);
    message = helpers.personalizeMessage(message, context);
    return helpers.adaptMessageTone(message, context.detectedArea || "geral");
  }

  if (intent === "document_request" && userType !== "visitor") {
    let message = `Perfeito. Os documentos certos fazem diferença.\n\nMas me conta primeiro: ${helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, "fallback_abertura")}`;
    message = helpers.addIntelligentEmpathy(message, context.detectedArea || "geral", context);
    message = helpers.personalizeMessage(message, context);
    return helpers.adaptMessageTone(message, context.detectedArea || "geral");
  }

  let message = helpers.getVariationWithoutRepetition(MESSAGE_VARIATIONS.abertura, "fallback_abertura");
  message = helpers.addIntelligentEmpathy(message, context.detectedArea || "geral", context);
  message = helpers.personalizeMessage(message, context);
  return helpers.adaptMessageTone(message, context.detectedArea || "geral");
}

function getAreaNome(theme: LegalTheme): string {
  switch (theme) {
    case "previdenciario":
      return "previdenciária";
    case "bancario":
      return "bancária";
    case "familia":
      return "de família";
    case "civil":
      return "cível";
    default:
      return "jurídica";
  }
}

export function generateUserFriendlySummary(state: ConversationState): string {
  const data = state.collectedData;
  const parts: string[] = [];

  if (data.area) parts.push(`Área: ${getAreaNome(data.area)}`);
  if (data.problema_principal) {
    parts.push(
      `Situação: ${data.problema_principal.substring(0, 80)}${data.problema_principal.length > 80 ? "..." : ""}`
    );
  }
  if (data.timeframe && data.timeframe !== "não especificado") parts.push(`Quando: ${data.timeframe}`);
  if (data.tem_documentos) {
    parts.push(
      `Documentos: ${data.tipos_documentos && data.tipos_documentos.length > 0 ? data.tipos_documentos.join(", ") : "disponíveis"}`
    );
  }
  if (data.objetivo_cliente) {
    parts.push(
      `Objetivo: ${data.objetivo_cliente.substring(0, 60)}${data.objetivo_cliente.length > 60 ? "..." : ""}`
    );
  }
  if (data.nivel_urgencia && data.nivel_urgencia !== "baixa") parts.push(`Urgência: ${data.nivel_urgencia}`);

  return parts.join(" | ");
}

export function generateInternalSummary(state: ConversationState): string {
  const data = state.collectedData;
  return [
    "=== RESUMO DA TRIAGEM ===",
    `Área Jurídica: ${data.area || "não identificada"}`,
    `Problema Principal: ${data.problema_principal || "não informado"}`,
    `Timeframe: ${data.timeframe || "não informado"}`,
    `Acontecendo Agora: ${data.acontecendo_agora ? "Sim" : "Não"}`,
    `Tem Documentos: ${data.tem_documentos ? "Sim" : "Não"}`,
    `Tipos de Documentos: ${data.tipos_documentos?.join(", ") || "N/A"}`,
    `Objetivo do Cliente: ${data.objetivo_cliente || "não informado"}`,
    `Nível de Urgência: ${data.nivel_urgencia || "não avaliado"}`,
    `Prejuízo Ativo: ${data.prejuizo_ativo ? "Sim" : "Não"}`,
    `Completude da Triagem: ${state.triageCompleteness}%`,
    `Necessita Atenção Humana: ${state.needsHumanAttention ? "Sim" : "Não"}`,
    `Motivo: ${state.handoffReason || "N/A"}`,
    `Palavras-chave: ${data.palavras_chave?.join(", ") || "N/A"}`,
    "========================"
  ].join("\n");
}
