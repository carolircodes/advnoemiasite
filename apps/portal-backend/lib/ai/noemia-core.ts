/**
 * NOEMIA CORE - CÉREBRO CENTRALIZADO DA IA
 *
 * Única camada responsável por toda inteligência da NoemIA
 * Usado por: site, portal, WhatsApp, Instagram
 */

import OpenAI from "openai";
import { PortalProfile } from "../auth/guards";
import { askNoemiaSchema } from "../domain/portal";

type NoemiaChannel = "site" | "portal" | "whatsapp" | "instagram";
type NoemiaUserType = "visitor" | "client" | "staff" | "unknown";
type LegalTheme =
  | "previdenciario"
  | "bancario"
  | "familia"
  | "civil"
  | "geral";
type ClassifiedIntent =
  | "curiosity"
  | "lead_interest"
  | "support"
  | "appointment_interest";
type LeadTemperature = "cold" | "warm" | "hot";

type ConversationStep =
  | "acolhimento"
  | "identificacao_area"
  | "entendimento_situacao"
  | "identificacao_urgencia"
  | "conducao_proximo_passo"
  | "conversao";

interface ConversationState {
  currentStep: ConversationStep;
  collectedData: {
    area?: LegalTheme;
    situacao?: string;
    urgencia?: LeadTemperature;
    detalhes?: string[];
  };
  isHotLead: boolean;
}

interface NoemiaCoreInput {
  channel: NoemiaChannel;
  userType: NoemiaUserType;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: unknown;
  metadata?: Record<string, unknown>;
  profile?: PortalProfile | null;
  conversationState?: ConversationState;
}

interface NoemiaCoreOutput {
  reply: string;
  intent?: string;
  audience: string;
  source: "openai" | "fallback" | "triage";
  actions?: Array<{ type: string; label: string; url?: string }>;
  usedFallback: boolean;
  error?: string | null;
  metadata: {
    responseTime: number;
    detectedTheme?: string;
    channel: NoemiaChannel;
    openaiUsed?: boolean;
    classification?: {
      theme: LegalTheme;
      intent: ClassifiedIntent;
      leadTemperature: LeadTemperature;
    };
    conversationState?: ConversationState;
  };
}

interface CommentProcessingOutput {
  reply: string;
  shouldReplyPrivately: boolean;
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  };
  metadata: {
    responseTime: number;
    channel: string;
    openaiUsed: boolean;
  };
}

function getSaudacao(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function detectUserIntent(message: string): string {
  const lowerMessage = message.toLowerCase();

  const legalAdviceKeywords = [
    "o que fazer",
    "como faço",
    "posso fazer",
    "devo fazer",
    "meu caso",
    "minha situação",
    "meu problema",
    "minha dúvida",
    "quais meus direitos",
    "o que a lei diz",
    "é crime",
    "é ilegal",
    "quanto custa",
    "quanto cobra",
    "valor da consulta",
    "consulta grátis",
    "posso me aposentar",
    "banco cobrou",
    "não paga pensão",
    "demissão injusta",
    "herança",
    "divórcio",
    "trabalhista",
    "previdenciário",
    "bancário",
  ];

  if (legalAdviceKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return "legal_advice_request";
  }

  if (lowerMessage.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|eai|opa)/)) {
    return "greeting";
  }

  if (
    lowerMessage.includes("agenda") ||
    lowerMessage.includes("consulta") ||
    lowerMessage.includes("compromisso")
  ) {
    return "agenda_request";
  }

  if (
    lowerMessage.includes("processo") ||
    lowerMessage.includes("caso") ||
    lowerMessage.includes("andamento")
  ) {
    return "case_request";
  }

  if (
    lowerMessage.includes("documento") ||
    lowerMessage.includes("arquivo") ||
    lowerMessage.includes("enviar")
  ) {
    return "document_request";
  }

  return "general_inquiry";
}

function detectLegalTheme(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  const themes: Record<string, string[]> = {
    aposentadoria: [
      "aposentadoria",
      "aposentar",
      "inss",
      "benefício",
      "beneficio",
      "auxílio",
      "auxilio",
    ],
    bancario: [
      "banco",
      "empréstimo",
      "emprestimo",
      "juros",
      "cobrança",
      "cobranca",
      "financiamento",
      "desconto",
    ],
    familia: [
      "divórcio",
      "divorcio",
      "pensão",
      "pensao",
      "guarda",
      "filhos",
      "casamento",
      "separação",
      "separacao",
    ],
    consumidor: [
      "compra",
      "produto",
      "serviço",
      "servico",
      "defeito",
      "troca",
      "reparo",
    ],
    trabalhista: [
      "trabalho",
      "demissão",
      "demissao",
      "rescisão",
      "rescisao",
      "verbas",
      "horas",
      "salário",
      "salario",
    ],
    previdenciario: [
      "previdenciário",
      "previdenciario",
      "previdência",
      "previdencia",
      "aposentadoria",
      "auxílio doença",
      "auxilio doença",
      "auxilio doenca",
    ],
  };

  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      return theme;
    }
  }

  return null;
}

function classifyMessage(message: string): {
  theme: LegalTheme;
  intent: ClassifiedIntent;
  leadTemperature: LeadTemperature;
} {
  const lowerMessage = message.toLowerCase();

  let theme: LegalTheme = "geral";

  const themeKeywords: Record<Exclude<LegalTheme, "geral">, string[]> = {
    previdenciario: [
      "aposentadoria",
      "aposentar",
      "inss",
      "benefício",
      "beneficio",
      "auxílio",
      "auxilio",
      "previdência",
      "previdencia",
      "previdenciário",
      "previdenciario",
      "autismo",
      "bpc",
      "loas",
    ],
    bancario: [
      "banco",
      "empréstimo",
      "emprestimo",
      "juros",
      "cobrança",
      "cobranca",
      "financiamento",
      "desconto",
      "cartão",
      "cartao",
      "conta",
    ],
    familia: [
      "divórcio",
      "divorcio",
      "pensão",
      "pensao",
      "guarda",
      "filhos",
      "casamento",
      "separação",
      "separacao",
      "herança",
      "heranca",
      "testamento",
    ],
    civil: [
      "contrato",
      "dano",
      "indenização",
      "indenizacao",
      "responsabilidade",
      "negócio",
      "negocio",
      "compra",
      "venda",
    ],
  };

  for (const [themeName, keywords] of Object.entries(themeKeywords) as Array<
    [Exclude<LegalTheme, "geral">, string[]]
  >) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      theme = themeName;
      break;
    }
  }

  let intent: ClassifiedIntent = "curiosity";

  const curiosityKeywords = [
    "o que é",
    "como funciona",
    "quanto tempo",
    "quais documentos",
    "posso",
    "tenho direito",
  ];
  const leadInterestKeywords = [
    "quero",
    "preciso",
    "meu caso",
    "minha situação",
    "minha situacao",
    "ajuda",
    "problema",
    "direito",
  ];
  const supportKeywords = [
    "status",
    "andamento",
    "processo",
    "consulta",
    "agendamento",
    "documento",
  ];
  const appointmentKeywords = [
    "agendar",
    "consulta",
    "horário",
    "horario",
    "marcar",
    "encontro",
    "falar com advogada",
  ];

  if (appointmentKeywords.some((k) => lowerMessage.includes(k))) {
    intent = "appointment_interest";
  } else if (supportKeywords.some((k) => lowerMessage.includes(k))) {
    intent = "support";
  } else if (leadInterestKeywords.some((k) => lowerMessage.includes(k))) {
    intent = "lead_interest";
  } else if (curiosityKeywords.some((k) => lowerMessage.includes(k))) {
    intent = "curiosity";
  }

  let leadTemperature: LeadTemperature = "cold";

  const hotKeywords = [
    "urgente",
    "perdi",
    "estou sendo",
    "preciso agora",
    "hoje",
    "imediatamente",
    "emergência",
    "emergencia",
  ];
  const warmKeywords = [
    "quero",
    "preciso",
    "meu caso",
    "minha situação",
    "minha situacao",
    "problema sério",
    "problema serio",
    "prejudicado",
  ];
  const urgencyIndicators = [
    "desconto indevido",
    "demissão injusta",
    "demissao injusta",
    "não paga pensão",
    "nao paga pensao",
    "perdi emprego",
    "ação executiva",
    "acao executiva",
  ];

  if (
    hotKeywords.some((k) => lowerMessage.includes(k)) ||
    urgencyIndicators.some((k) => lowerMessage.includes(k))
  ) {
    leadTemperature = "hot";
  } else if (warmKeywords.some((k) => lowerMessage.includes(k))) {
    leadTemperature = "warm";
  }

  return { theme, intent, leadTemperature };
}

function initializeConversationState(): ConversationState {
  return {
    currentStep: "acolhimento",
    collectedData: {},
    isHotLead: false,
  };
}

function updateConversationState(
  state: ConversationState,
  message: string,
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  }
): ConversationState {
  const newState: ConversationState = {
    ...state,
    collectedData: {
      ...state.collectedData,
      detalhes: [...(state.collectedData.detalhes ?? [])],
    },
  };

  switch (state.currentStep) {
    case "acolhimento":
      newState.currentStep = "identificacao_area";
      newState.collectedData.area = classification.theme;
      break;

    case "identificacao_area":
      newState.currentStep = "entendimento_situacao";
      newState.collectedData.situacao = message;
      break;

    case "entendimento_situacao":
      newState.currentStep = "identificacao_urgencia";
      newState.collectedData.urgencia = classification.leadTemperature;
      newState.isHotLead = classification.leadTemperature === "hot";
      break;

    case "identificacao_urgencia":
      newState.currentStep = newState.isHotLead
        ? "conversao"
        : "conducao_proximo_passo";
      break;

    case "conducao_proximo_passo":
      newState.collectedData.detalhes?.push(message);
      break;

    case "conversao":
      newState.currentStep = "conversao";
      break;
  }

  return newState;
}

function generateTriageResponse(
  state: ConversationState,
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  }
): string {
  const saudacao = getSaudacao();

  switch (state.currentStep) {
    case "acolhimento":
      return `${saudacao}! Eu sou a assistente virtual do escritório da Dra. Noêmia. Estou aqui para entender melhor seu caso, fazer essa triagem inicial e te orientar nos próximos passos.\n\nPode me contar, de forma simples, o que aconteceu?`;

    case "identificacao_area":
      return `Entendi. Obrigada por me contar isso.\n\nPelo que você descreveu, seu caso parece estar ligado à área ${classification.theme === "previdenciario" ? "previdenciária" : classification.theme === "bancario" ? "bancária" : classification.theme === "familia" ? "de família" : classification.theme === "civil" ? "cível" : "jurídica"}.\n\nPara eu te orientar melhor nessa triagem inicial, você consegue me explicar um pouco mais do que aconteceu?`;

    case "entendimento_situacao":
      return `Entendi. Já consegui ter uma noção melhor da sua situação.\n\nAgora, para eu te orientar com mais segurança, me conta uma coisa: isso está acontecendo há quanto tempo ou existe alguma urgência maior no seu caso neste momento?`;

    case "identificacao_urgencia":
      if (state.isHotLead) {
        return `Entendi. Pelo que você me contou, isso merece uma atenção mais rápida.\n\nO ideal agora é avançar para um atendimento com a Dra. Noêmia, para analisar seu caso com mais cuidado.\n\nVocê prefere seguir por atendimento online ou presencial?`;
      }

      return `Perfeito. Já estou entendendo melhor o seu cenário.\n\nExiste algum outro detalhe importante que você acha que eu preciso saber para te orientar melhor no próximo passo?`;

    case "conducao_proximo_passo":
      return `Obrigada por me contar isso.\n\nCom base no que você compartilhou até aqui, o próximo passo mais seguro é uma análise mais cuidadosa do seu caso.\n\nSe você quiser, eu posso te orientar sobre como seguir para atendimento com a Dra. Noêmia.`;

    case "conversao":
      return `Perfeito. O melhor próximo passo agora é seguir para atendimento com a Dra. Noêmia, para analisar sua situação com mais segurança.\n\nSe quiser, eu posso te orientar agora sobre a melhor forma de continuar esse atendimento.`;

    default:
      return `${saudacao}! Eu sou a assistente virtual do escritório da Dra. Noêmia. Estou aqui para entender seu caso e te orientar nos próximos passos.\n\nComo posso te ajudar hoje?`;
  }
}

function buildSystemPrompt(
  channel: NoemiaChannel,
  userType: NoemiaUserType,
  context?: unknown
): string {
  const basePrompt = [
    "Você é a assistente do escritório da Dra. Noêmia Paixão Advocacia.",
    "Seu nome é Noêmia (não use 'NoemIA' em público).",
    "Você é como uma recepcionista inteligente, humana e acolhedora do escritório.",
    "",
    "SUA PERSONALIDADE:",
    "- fale como uma pessoa real, educada e empática",
    "- seja natural, nunca pareça um robô ou chatbot",
    "- use linguagem simples e clara, evite juridiquês",
    "- demonstre que está ouvindo e entendendo de verdade",
    "- seja premium, mas acessível",
    "",
    "SEU PAPEL:",
    "- acolher a pessoa e entender o que está acontecendo",
    "- identificar a área jurídica provável do caso",
    "- fazer perguntas estratégicas uma de cada vez",
    "- conduzir naturalmente para uma análise profissional quando necessário",
    "- NUNCA dar consultoria completa gratuita",
    "",
    "COMO FALAR:",
    "- reconheça o que a pessoa disse antes de responder",
    "- use frases curtas e naturais",
    "- faça uma pergunta de cada vez quando precisar de mais informações",
    "- evite repetir as mesmas frases",
    "- não diga 'no momento este atendimento está habilitado apenas para mensagens escritas'",
    "",
    "O QUE NUNCA FAZER:",
    "- não invente fatos ou documentos",
    "- não prometa resultados ou direitos",
    "- não diga 'você tem direito' sem analisar",
    "- não repita 'posso ajudar' ou 'como posso ajudar'",
    "- não use respostas genéricas que não se conectam com o contexto",
    "- não se apresente como 'assistente virtual' ou 'inteligência artificial'",
    "",
    "FLUXO IDEAL:",
    "1. Acolha e reconheça o que foi dito",
    "2. Mostre que entendeu a situação específica",
    "3. Dê uma orientação inicial útil, mas limitada",
    "4. Faça uma pergunta estratégica para continuar",
    "",
    "SEMPRE termine com uma pergunta aberta ou direção clara, exceto se a pessoa já estiver encaminhada para consulta.",
  ];

  const channelPrompts: Record<NoemiaChannel, string[]> = {
    whatsapp: [
      "CANAL: WhatsApp",
      "- respostas curtas e fluidas",
      "- linguagem próxima, humana e profissional",
      "- pode usar emoji com moderação, quando ajudar a acolher",
    ],
    instagram: [
      "CANAL: Instagram",
      "- respostas naturais, leves e envolventes",
      "- linguagem acolhedora e mais calorosa",
      "- evitar cara de atendimento automático",
      "- SEMPRE se apresentar como 'atendente virtual do escritório Noêmia Paixão Advocacia'",
      "- NUNCA falar como se fosse a própria advogada",
      "- deixar claro que é assistente virtual que ajuda a organizar o atendimento",
    ],
    site: [
      "CANAL: Site",
      "- respostas um pouco mais completas e explicativas",
      "- manter clareza e sensação de atendimento personalizado",
    ],
    portal: [
      "CANAL: Portal",
      "- respostas mais objetivas e organizadas",
      "- foco em orientação e próximos passos",
    ],
  };

  const userPrompts: Record<NoemiaUserType, string[]> = {
    visitor: [
      "TIPO DE USUÁRIO: visitante",
      "- foco principal em triagem e condução",
      "- a pessoa pode estar insegura, perdida ou sem saber o que perguntar",
      "- ajude a organizar o raciocínio dela",
    ],
    client: [
      "TIPO DE USUÁRIO: cliente",
      "- responder com mais segurança operacional",
      "- ajudar com clareza, acompanhamento e próximos passos",
    ],
    staff: [
      "TIPO DE USUÁRIO: equipe",
      "- respostas diretas, organizadas e úteis operacionalmente",
    ],
    unknown: [
      "TIPO DE USUÁRIO: desconhecido",
      "- trate como visitante, com acolhimento e triagem",
    ],
  };

  const prompts = [
    ...basePrompt,
    "",
    ...channelPrompts[channel],
    "",
    ...userPrompts[userType],
  ];

  if (context) {
    prompts.push("", "CONTEXTO DISPONÍVEL:", JSON.stringify(context));
  }

  prompts.push(
    "",
    "EXEMPLO DE TOM BOM:",
    "Usuário: 'sou autista e quero saber se posso me aposentar'",
    "Resposta esperada: 'Entendi... obrigada por me contar isso. Dependendo da sua situação, pode existir sim um caminho, mas isso precisa ser analisado com cuidado. Para eu te orientar melhor nessa triagem inicial, você já recebe algum benefício hoje ou já teve algum pedido negado?'",
    "",
    "Responda sempre em português do Brasil."
  );

  return prompts.join("\n");
}

async function callOpenAI(
  message: string,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5";

    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY não configurada" };
    }

    const openai = new OpenAI({ apiKey });

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemPrompt }];

    for (const item of history.slice(-8)) {
      messages.push({
        role: item.role,
        content: item.content,
      });
    }

    messages.push({ role: "user", content: message });

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = response.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return { success: false, error: "Resposta vazia da OpenAI" };
    }

    return { success: true, response: responseText };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

function generateFallbackResponse(
  intent: string,
  userType: NoemiaUserType,
  detectedTheme?: string
): string {
  const saudacao = getSaudacao();

  if (intent === "greeting") {
    return `${saudacao}! Eu sou a assistente virtual do escritório da Dra. Noêmia. Estou aqui para entender melhor seu caso e te orientar nos próximos passos.\n\nPode me contar, de forma simples, o que aconteceu?`;
  }

  if (intent === "agenda_request") {
    return `Claro. Posso te orientar sobre o próximo passo para atendimento com a Dra. Noêmia.\n\nVocê está querendo agendar uma consulta ou entender primeiro melhor a sua situação?`;
  }

  if (intent === "case_request" && userType !== "visitor") {
    return `Entendi. Posso te ajudar com o acompanhamento.\n\nVocê quer saber sobre andamento, documentos ou próximo passo do seu caso?`;
  }

  if (intent === "document_request" && userType !== "visitor") {
    return `Perfeito. Posso te orientar com isso.\n\nVocê quer enviar documentos novos ou entender quais documentos são necessários?`;
  }

  if (detectedTheme) {
    return `Entendi. Seu relato parece estar relacionado a ${detectedTheme}.\n\nPara eu te orientar melhor nessa triagem inicial, me conta um pouco mais do que aconteceu no seu caso.`;
  }

  return `${saudacao}! Eu sou a assistente virtual do escritório da Dra. Noêmia. Estou aqui para entender seu caso e te orientar nos próximos passos.\n\nMe conta, de forma simples, o que aconteceu?`;
}

export async function processNoemiaCore(
  input: NoemiaCoreInput
): Promise<NoemiaCoreOutput> {
  const startTime = Date.now();

  const classification = classifyMessage(input.message);
  const currentConversationState =
    input.conversationState || initializeConversationState();
  const newConversationState = updateConversationState(
    currentConversationState,
    input.message,
    classification
  );

  console.log(
    `NOEMIA_CORE_START: ${input.channel} | ${input.userType} | ${classification.theme} | ${classification.intent} | ${classification.leadTemperature}`
  );
  console.log(
    `NOEMIA_CORE_STEP: ${currentConversationState.currentStep} -> ${newConversationState.currentStep}`
  );
  console.log(
    `NOEMIA_CORE_MESSAGE: ${input.message.substring(0, 100)}...`
  );

  try {
    const intent = detectUserIntent(input.message);
    const detectedTheme = detectLegalTheme(input.message);

    let effectiveAudience: NoemiaUserType = input.userType;

    if (input.userType === "client" && !input.profile) {
      effectiveAudience = "visitor";
    }

    if (
      input.userType === "staff" &&
      (!input.profile || input.profile.role === "cliente")
    ) {
      effectiveAudience = "visitor";
    }

    const systemPrompt = buildSystemPrompt(
      input.channel,
      effectiveAudience,
      input.context
    );

    console.log(
      `NOEMIA_CORE_OPENAI_ATTEMPT: ${input.channel} | ${effectiveAudience}`
    );

    const openaiResult = await callOpenAI(
      input.message,
      systemPrompt,
      input.history ?? []
    );

    if (openaiResult.success && openaiResult.response) {
      console.log(`NOEMIA_CORE_OPENAI_SUCCESS: ${input.channel}`);

      return {
        reply: openaiResult.response,
        intent,
        audience: effectiveAudience,
        source: "openai",
        usedFallback: false,
        error: null,
        metadata: {
          responseTime: Date.now() - startTime,
          detectedTheme: detectedTheme || undefined,
          channel: input.channel,
          openaiUsed: true,
          classification,
          conversationState: newConversationState,
        },
      };
    }

    console.log(
      `NOEMIA_CORE_FALLBACK: ${input.channel} | ${openaiResult.error}`
    );

    const fallbackReply =
      effectiveAudience === "visitor"
        ? generateTriageResponse(newConversationState, classification)
        : generateFallbackResponse(
            intent,
            effectiveAudience,
            detectedTheme || undefined
          );

    return {
      reply: fallbackReply,
      intent,
      audience: effectiveAudience,
      source: effectiveAudience === "visitor" ? "triage" : "fallback",
      usedFallback: true,
      error: openaiResult.error || null,
      metadata: {
        responseTime: Date.now() - startTime,
        detectedTheme: detectedTheme || undefined,
        channel: input.channel,
        openaiUsed: false,
        classification,
        conversationState: newConversationState,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.log(`NOEMIA_CORE_ERROR: ${input.channel} | ${errorMessage}`);

    const emergencyResponse =
      "Desculpe, tive uma instabilidade aqui agora. Mas posso continuar te ajudando por aqui. Me conta novamente, de forma simples, o que aconteceu no seu caso.";

    return {
      reply: emergencyResponse,
      audience: input.userType,
      source: "fallback",
      usedFallback: true,
      error: errorMessage,
      metadata: {
        responseTime: Date.now() - startTime,
        detectedTheme: detectLegalTheme(input.message) || undefined,
        channel: input.channel,
        openaiUsed: false,
        classification,
        conversationState: newConversationState,
      },
    };
  }
}

export async function processComment(
  commentText: string,
  platform: "instagram" | "facebook",
  commentId: string,
  userId: string
): Promise<CommentProcessingOutput> {
  const startTime = Date.now();

  console.log(`NOEMIA_COMMENT_START: ${platform} | ${commentId} | ${userId}`);
  console.log(`NOEMIA_COMMENT_TEXT: ${commentText.substring(0, 100)}...`);

  const classification = classifyMessage(commentText);

  const shouldReplyPrivately =
    classification.intent === "lead_interest" ||
    classification.leadTemperature === "warm" ||
    classification.leadTemperature === "hot";

  try {
    const systemPrompt = [
      "Você é a assistente virtual do escritório da Dra. Noêmia.",
      "Está respondendo a um comentário em rede social.",
      "",
      "OBJETIVO:",
      "- gerar conexão",
      "- trazer uma percepção útil ou curiosa",
      "- incentivar a pessoa a continuar a conversa no direct",
      "",
      "REGRAS:",
      "- resposta curta, envolvente e natural",
      "- não dê consultoria jurídica em público",
      "- evite frase fria como 'como posso ajudar?'",
      "- no máximo 3 frases curtas",
      "- pode usar emoji com moderação",
      "",
      "ESTRUTURA IDEAL:",
      "1. reconhecer o comentário",
      "2. trazer uma micro-revelação",
      "3. convidar para continuar em privado",
    ].join("\n");

    const openaiResult = await callOpenAI(commentText, systemPrompt);

    if (openaiResult.success && openaiResult.response) {
      console.log(
        `NOEMIA_COMMENT_SUCCESS: ${platform} | ${
          shouldReplyPrivately ? "PRIVATE_REPLY" : "PUBLIC_REPLY"
        }`
      );

      return {
        reply: openaiResult.response,
        shouldReplyPrivately,
        classification,
        metadata: {
          responseTime: Date.now() - startTime,
          channel: `${platform}_comment`,
          openaiUsed: true,
        },
      };
    }

    console.log(`NOEMIA_COMMENT_FALLBACK: ${platform} | ${openaiResult.error}`);

    const fallbackReply = generateCommentFallback(classification);

    return {
      reply: fallbackReply,
      shouldReplyPrivately,
      classification,
      metadata: {
        responseTime: Date.now() - startTime,
        channel: `${platform}_comment`,
        openaiUsed: false,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.log(`NOEMIA_COMMENT_ERROR: ${platform} | ${errorMessage}`);

    return {
      reply:
        "Oi! Vi seu comentário 💬 Tem alguns detalhes importantes sobre isso que muita gente não sabe. Me chama no direct que eu te explico melhor.",
      shouldReplyPrivately: true,
      classification,
      metadata: {
        responseTime: Date.now() - startTime,
        channel: `${platform}_comment`,
        openaiUsed: false,
      },
    };
  }
}

function generateCommentFallback(classification: {
  theme: LegalTheme;
  intent: ClassifiedIntent;
  leadTemperature: LeadTemperature;
}): string {
  const responses: Record<LegalTheme, string> = {
    previdenciario:
      "Oi! Vi seu comentário 💬 Dependendo da situação, pode existir um caminho que muita gente nem imagina. Me chama no direct que eu te explico melhor.",
    bancario:
      "Oi! Vi seu comentário 💬 Em casos bancários, às vezes existem detalhes importantes que passam despercebidos. Me chama no direct que eu te explico melhor.",
    familia:
      "Oi! Vi seu comentário 💬 Em questões de família, alguns detalhes mudam tudo. Me chama no direct que eu te explico melhor.",
    civil:
      "Oi! Vi seu comentário 💬 Dependendo do que aconteceu, pode existir um caminho importante no seu caso. Me chama no direct que eu te explico melhor.",
    geral:
      "Oi! Vi seu comentário 💬 Tem alguns pontos importantes sobre isso que podem fazer diferença. Me chama no direct que eu te explico melhor.",
  };

  return responses[classification.theme];
}

export async function answerNoemia(
  rawInput: unknown,
  profile: PortalProfile | null,
  sessionId?: string,
  urlContext?: unknown
) {
  const input = askNoemiaSchema.parse(rawInput) as {
    audience: NoemiaUserType;
    message: string;
  };

  const coreInput: NoemiaCoreInput = {
    channel: "portal",
    userType: input.audience,
    message: input.message,
    history: [],
    context: urlContext,
    metadata: { sessionId, urlContext },
    profile,
  };

  const result = await processNoemiaCore(coreInput);

  return {
    audience: result.audience,
    answer: result.reply,
    message: result.reply,
    actions: result.actions || [],
    meta: {
      intent: result.intent,
      profile: result.audience,
      source: result.source,
    },
  };
}