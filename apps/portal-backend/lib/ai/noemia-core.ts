/**
 * NOEMIA CORE - CÉREBRO CENTRALIZADO DA IA
 * 
 * Única camada responsável por toda inteligência da NoemIA
 * Usado por: site, portal, WhatsApp, Instagram
 */

import { OpenAI } from "openai";
import { PortalProfile } from "../auth/guards";
import { askNoemiaSchema } from "../domain/portal";

// Types
type NoemiaChannel = "site" | "portal" | "whatsapp" | "instagram";
type NoemiaUserType = "visitor" | "client" | "staff" | "unknown";

type ConversationStep = "acolhimento" | "identificacao_area" | "entendimento_situacao" | "identificacao_urgencia" | "conducao_proximo_passo" | "conversao";

interface ConversationState {
  currentStep: ConversationStep;
  collectedData: {
    area?: string;
    situacao?: string;
    urgencia?: string;
    detalhes?: string[];
  };
  isHotLead: boolean;
}

interface NoemiaCoreInput {
  channel: NoemiaChannel;
  userType: NoemiaUserType;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: any;
  metadata?: any;
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
    channel: string;
    openaiUsed?: boolean;
    classification?: {
      theme: "previdenciario" | "bancario" | "familia" | "civil" | "geral";
      intent: "curiosity" | "lead_interest" | "support" | "appointment_interest";
      leadTemperature: "cold" | "warm" | "hot";
    };
    conversationState?: ConversationState;
  };
}

// Funções auxiliares (movidas do noemia.ts)
function detectUserIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Detectar solicitações de consultoria gratuita
  const legalAdviceKeywords = [
    "o que fazer", "como faço", "posso fazer", "devo fazer",
    "meu caso", "minha situação", "meu problema", "minha dúvida",
    "quais meus direitos", "o que a lei diz", "é crime", "é ilegal",
    "quanto custa", "quanto cobra", "valor da consulta", "consulta grátis",
    "posso me aposentar", "banco cobrou", "não paga pensão", "demissão injusta",
    "herança", "divórcio", "trabalhista", "previdenciário", "bancário"
  ];
  
  if (legalAdviceKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return "legal_advice_request";
  }
  
  // Detectar saudações
  if (lowerMessage.match(/^(oi|olá|bom dia|boa tarde|boa noite|eai|opa)/)) {
    return "greeting";
  }
  
  // Detectar perguntas sobre agenda
  if (lowerMessage.includes("agenda") || lowerMessage.includes("consulta") || lowerMessage.includes("compromisso")) {
    return "agenda_request";
  }
  
  // Detectar perguntas sobre processos
  if (lowerMessage.includes("processo") || lowerMessage.includes("caso") || lowerMessage.includes("andamento")) {
    return "case_request";
  }
  
  // Detectar perguntas sobre documentos
  if (lowerMessage.includes("documento") || lowerMessage.includes("arquivo") || lowerMessage.includes("enviar")) {
    return "document_request";
  }
  
  return "general_inquiry";
}

function detectLegalTheme(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  const themes = {
    'aposentadoria': ['aposentadoria', 'aposentar', 'inss', 'benefício', 'auxílio'],
    'bancario': ['banco', 'empréstimo', 'juros', 'cobrança', 'financiamento', 'desconto'],
    'familia': ['divórcio', 'pensão', 'guarda', 'filhos', 'casamento', 'separação'],
    'consumidor': ['compra', 'produto', 'serviço', 'defeito', 'troca', 'reparo'],
    'trabalhista': ['trabalho', 'demissão', 'rescisão', 'verbas', 'horas', 'salário'],
    'previdenciario': ['previdenciário', 'previdência', 'aposentadoria', 'auxílio doença']
  };
  
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return theme;
    }
  }
  
  return null;
}

// Classificação estruturada de assuntos
function classifyMessage(message: string): {
  theme: "previdenciario" | "bancario" | "familia" | "civil" | "geral";
  intent: "curiosity" | "lead_interest" | "support" | "appointment_interest";
  leadTemperature: "cold" | "warm" | "hot";
} {
  const lowerMessage = message.toLowerCase();
  
  // Detectar tema principal
  let theme: "previdenciario" | "bancario" | "familia" | "civil" | "geral" = "geral";
  
  const themeKeywords = {
    previdenciario: ['aposentadoria', 'aposentar', 'inss', 'benefício', 'auxílio', 'previdência', 'previdenciário'],
    bancario: ['banco', 'empréstimo', 'juros', 'cobrança', 'financiamento', 'desconto', 'cartão', 'conta'],
    familia: ['divórcio', 'pensão', 'guarda', 'filhos', 'casamento', 'separação', 'herança', 'testamento'],
    civil: ['contrato', 'dano', 'indenização', 'responsabilidade', 'negócio', 'compra', 'venda']
  };
  
  for (const [themeName, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      theme = themeName as any;
      break;
    }
  }
  
  // Detectar intenção
  let intent: "curiosity" | "lead_interest" | "support" | "appointment_interest" = "curiosity";
  
  const curiosityKeywords = ['o que é', 'como funciona', 'quanto tempo', 'quais documentos', 'posso'];
  const leadInterestKeywords = ['quero', 'preciso', 'meu caso', 'minha situação', 'ajuda', 'problema', 'direito'];
  const supportKeywords = ['status', 'andamento', 'processo', 'consulta', 'agendamento', 'documento'];
  const appointmentKeywords = ['agendar', 'consulta', 'horário', 'marcar', 'encontro', 'falar com advogada'];
  
  if (appointmentKeywords.some(k => lowerMessage.includes(k))) {
    intent = "appointment_interest";
  } else if (supportKeywords.some(k => lowerMessage.includes(k))) {
    intent = "support";
  } else if (leadInterestKeywords.some(k => lowerMessage.includes(k))) {
    intent = "lead_interest";
  } else if (curiosityKeywords.some(k => lowerMessage.includes(k))) {
    intent = "curiosity";
  }
  
  // Detectar temperatura do lead
  let leadTemperature: "cold" | "warm" | "hot" = "cold";
  
  const hotKeywords = ['urgente', 'perdi', 'estou sendo', 'preciso agora', 'hoje', 'imediatamente', 'emergência'];
  const warmKeywords = ['quero', 'preciso', 'meu caso', 'minha situação', 'problema sério', 'prejudicado'];
  const urgencyIndicators = ['desconto indevido', 'demissão injusta', 'não paga pensão', 'perdi emprego', 'ação executiva'];
  
  if (hotKeywords.some(k => lowerMessage.includes(k)) || urgencyIndicators.some(k => lowerMessage.includes(k))) {
    leadTemperature = "hot";
  } else if (warmKeywords.some(k => lowerMessage.includes(k))) {
    leadTemperature = "warm";
  } else {
    leadTemperature = "cold";
  }
  
  return { theme, intent, leadTemperature };
}

// Funções de triagem inteligente
function initializeConversationState(): ConversationState {
  return {
    currentStep: "acolhimento",
    collectedData: {},
    isHotLead: false
  };
}

function updateConversationState(state: ConversationState, message: string, classification: any): ConversationState {
  const newState = { ...state };
  
  // Atualizar dados coletados baseado no step atual
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
      newState.currentStep = newState.isHotLead ? "conversao" : "conducao_proximo_passo";
      break;
      
    case "conducao_proximo_passo":
      // Continuar coletando detalhes
      if (!newState.collectedData.detalhes) {
        newState.collectedData.detalhes = [];
      }
      newState.collectedData.detalhes.push(message);
      break;
      
    case "conversao":
      newState.currentStep = "conversao";
      break;
  }
  
  return newState;
}

function generateTriageResponse(state: ConversationState, message: string, classification: any): string {
  const saudacao = getSaudacao();
  
  switch (state.currentStep) {
    case "acolhimento":
      return `${saudacao}! Entendi... obrigada por me contar isso \nSou a assistente virtual do escritório da Dra. Noêmia. Para começar nossa triagem, me conte um pouco sobre o que está acontecendo.`;
      
    case "identificacao_area":
      return `Entendi... parece que seu caso está relacionado à área de ${state.collectedData.area || 'direito geral'}.\nEssa é uma área importante e precisa ser analisada com cuidado.\nPara eu entender melhor sua situação específica, você poderia me dar mais detalhes sobre o que aconteceu?`;
      
    case "entendimento_situacao":
      return `Certo... estou compreendendo sua situação.\n${state.collectedData.area === 'previdenciario' ? 'No direito previdenciário, existem diferentes caminhos...' : state.collectedData.area === 'bancario' ? 'Em questões bancárias, podemos ter várias abordagens...' : 'Em casos como o seu, precisamos analisar os detalhes...'}\nPara eu te ajudar melhor, qual é o nível de urgência dessa situação para você?`;
      
    case "identificacao_urgencia":
      if (state.isHotLead) {
        return `Entendi... percebo que isso é urgente e está te causando preocupação \nSituações como essa precisam de atenção imediata da Dra. Noêmia.\nPara te atender com a prioridade necessária, posso agendar uma consulta emergencial para hoje ou amanhã. Você prefere atendimento online ou presencial?`;
      } else {
        return `Entendi... anotei a importância disso para você.\nVamos continuar com a triagem para entender todos os aspectos do seu caso.\nAlém do que você já me contou, existe algum outro detalhe relevante que eu deva saber?`;
      }
      
    case "conducao_proximo_passo":
      return `Obrigada por esse detalhe adicional... estou montando um quadro completo da sua situação.\n${state.isHotLead ? 'Pelo que você me descreveu, realmente precisa de atenção especializada. Posso te conectar diretamente com a Dra. Noêmia para uma consulta prioritária?' : 'Com base no que você compartilhou, o próximo passo seria uma análise mais aprofundada. Você gostaria de agendar uma consulta para discutirmos seu caso detalhadamente?'}`;
      
    case "conversao":
      return `Perfeito! Vou te conectar agora com a equipe da Dra. Noêmia.\nSua consulta será priorizada e você receberá uma ligação em até 30 minutos para confirmar o horário.\nEnquanto aguardam, tenha à mão seus documentos básicos (RG, CPF, comprovante de residência).`;
      
    default:
      return `${saudacao}! Sou a assistente virtual do escritório da Dra. Noêmia. Como posso te ajudar hoje? `;
  }
}

function getSaudacao(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function buildSystemPrompt(channel: string, userType: string, context?: string): string {
  const basePrompt = [
    "Você é Noemia, assistente inteligente do escritório Noêmia Paixão Advocacia.",
    "Sua missão: acolher, qualificar e conduzir conversas com alta conversão para consulta.",
    "",
    "PRINCÍPIOS FUNDAMENTAIS:",
    "- Tom: acolhedor, profissional, claro, confiável",
    "- Linguagem: simples, sem juridiquês excessivo",
    "- Compromisso: nunca prometer resultados, nunca inventar fatos",
    "- Foco: entender problema, qualificar lead, manter conversa viva",
    "- Objetivo: estimular análise com a advogada",
    "",
    "OBJETIVOS DA RESPOSTA:",
    "1. Entender o problema real do usuário",
    "2. Qualificar o lead (interesse, urgência, viabilidade)",
    "3. Manter a conversa engajada e produtiva",
    "4. Conduzir naturalmente para próximo passo útil",
    "5. Adaptar linguagem ao canal e perfil",
    "",
    "BLOQUEIOS DE SEGURANÇA:",
    "- NUNCA dar consultoria jurídica definitiva",
    "- NUNCA prometer resultados ou valores",
    "- NUNCA afirmar que o caso tem mérito sem análise",
    "- SEMPRE sugerir consulta para avaliação real",
    "",
    "CONVERSÃO ESTRATÉGICA:",
    "- Identificar palavras-chave de urgência/dano",
    "- Reconhecer quando o usuário está pronto para avançar",
    "- Oferecer caminho claro para consulta (WhatsApp, site, telefone)",
    "- Criar senso de oportunidade e cuidado",
    "",
    "ADAPTAÇÃO POR CANAL:"
  ];

  // Adaptação por canal
  const channelPrompts = {
    whatsapp: [
      "WHATSAPP - Respostas curtas, diretas, conversacionais",
      "- Use emojis moderadamente (legal, acolhedor)",
      "- Frases curtas e parágrafos curtos",
      "- CTAs claros: 'Fale com a advogada no WhatsApp'",
      "- Tom próximo mas profissional"
    ],
    instagram: [
      "INSTAGRAM - Respostas amigáveis, joviais, visuais",
      "- Linguagem mais descontraída mas séria",
      "- Use emojis estratégicos (legal, acolhedor)",
      "- Menos formal, mais pessoal",
      "- CTAs: 'Agende sua consulta pelo link na bio!'"
    ],
    site: [
      "SITE - Respostas completas, educativas, persuasivas",
      "- Linguagem mais elaborada e educativa",
      "- Explique conceitos simplesmente",
      "- CTAs: 'Agende sua consulta online'",
      "- Construa autoridade e confiança"
    ],
    portal: [
      "PORTAL - Respostas técnicas, operacionais, precisas",
      "- Foco em informações do caso atual",
      "- Próximos passos claros",
      "- CTAs: 'Ver detalhes no portal', 'Falar com equipe'",
      "- Tom mais formal e direto"
    ]
  };

  // Adaptação por tipo de usuário
  const userPrompts = {
    visitor: [
      "VISITOR - Foco em triagem e conversão",
      "- Acolha o problema com empatia",
      "- Explique processos de forma simples",
      "- Qualifique a urgência e o impacto",
      "- Conduza para consulta com urgência quando apropriado",
      "- Crie senso de cuidado e solução"
    ],
    client: [
      "CLIENT - Foco em serviço e acompanhamento",
      "- Forneça informações sobre o caso atual",
      "- Explique próximos passos claramente",
      "- Mantenha calma e confiança",
      "- CTAs: 'Ver detalhes no portal', 'Falar com equipe'"
    ],
    staff: [
      "STAFF - Foco em operação e métricas",
      "- Forneça dados operacionais precisos",
      "- Responda de forma objetiva",
      "- Foque em eficiência e produtividade",
      "- Sem necessidade de conversão"
    ]
  };

  const getChannelPrompts = (ch: string) => {
    switch (ch) {
      case 'whatsapp': return channelPrompts.whatsapp;
      case 'instagram': return channelPrompts.instagram;
      case 'site': return channelPrompts.site;
      case 'portal': return channelPrompts.portal;
      default: return channelPrompts.site;
    }
  };

  const getUserPrompts = (ut: string) => {
    switch (ut) {
      case 'visitor': return userPrompts.visitor;
      case 'client': return userPrompts.client;
      case 'staff': return userPrompts.staff;
      case 'unknown': return userPrompts.visitor;
      default: return userPrompts.visitor;
    }
  };

  const prompts = [
    ...basePrompt,
    ...getChannelPrompts(channel),
    ...getUserPrompts(userType)
  ];

  if (context) {
    prompts.push("", "CONTEXTO DISPONÍVEL:", context);
  }

  prompts.push(
    "",
    "ESTRUTURA IDEAL DA RESPOSTA:",
    "1. Acolhimento/Reconhecimento",
    "2. Compreensão do problema", 
    "3. Informação útil (sem consultoria)",
    "4. Próximo passo claro",
    "5. CTA estratégico",
    "",
    "Responda de forma natural, humana e estratégica."
  );

  return prompts.join('\n');
}

// Chamada OpenAI centralizada
async function callOpenAI(
  message: string,
  systemPrompt: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    if (!apiKey) {
      return { success: false, error: 'API key not configured' };
    }
    
    const openai = new OpenAI({ apiKey });
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    const responseText = response.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      return { success: false, error: 'Empty response' };
    }
    
    return { success: true, response: responseText };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

// Fallback inteligente centralizado
function generateFallbackResponse(
  intent: string,
  userType: string,
  channel: string,
  detectedTheme?: string
): string {
  const fallbacks = {
    legal_advice_request: userType === 'visitor' 
      ? "Entendi sua situação. Para te orientar com precisão e segurança jurídica, é necessário analisar seu caso em detalhes. Agende uma consulta com a advogada para receber orientação adequada."
      : "Vou analisar sua solicitação. Para te ajudar com precisão, preciso entender melhor os detalhes do seu caso.",
    
    greeting: `Olá! Sou a NoemIA, assistente do escritório Noêmia Paixão Advocacia. Como posso te ajudar hoje?`,
    
    agenda_request: "Sua agenda está sendo atualizada. Para informações detalhadas, acesse o portal ou fale com a equipe.",
    
    case_request: "Para informações sobre seu processo, acesse o portal do cliente ou entre em contato diretamente com o escritório.",
    
    document_request: "Para enviar documentos, use o portal do cliente ou WhatsApp. Se precisar de ajuda, entre em contato com a equipe.",
    
    general_inquiry: detectedTheme 
      ? `Vi seu interesse em ${detectedTheme}. Para te ajudar melhor, preparei uma análise inicial. Agende uma consulta para discutir seu caso detalhadamente.`
      : "Posso ajudar com diversas áreas do direito. Para te orientar melhor, me diga qual é sua situação ou agende uma consulta."
  };
  
  switch (intent) {
    case 'legal_advice_request':
      return fallbacks.legal_advice_request;
    case 'greeting':
      return fallbacks.greeting;
    case 'agenda_request':
      return fallbacks.agenda_request;
    case 'case_request':
      return fallbacks.case_request;
    case 'document_request':
      return fallbacks.document_request;
    default:
      return fallbacks.general_inquiry;
  }
}

// Função principal do Noemia Core
export async function processNoemiaCore(input: NoemiaCoreInput): Promise<NoemiaCoreOutput> {
  const startTime = Date.now();
  
  // Classificação estruturada
  const classification = classifyMessage(input.message);
  
  // Obter ou inicializar estado da conversação
  const conversationState = input.conversationState || initializeConversationState();
  const newConversationState = updateConversationState(conversationState, input.message, classification);
  
  // Log padronizado com classificação e estado
  console.log(`NOEMIA_CORE_START: ${input.channel} | ${input.userType} | ${classification.theme} | ${classification.intent} | ${classification.leadTemperature}`);
  console.log(`NOEMIA_CORE_STEP: ${conversationState.currentStep} -> ${newConversationState.currentStep}`);
  console.log(`NOEMIA_CORE_MESSAGE: ${input.message.substring(0, 100)}...`);
  
  try {
    // Detectar intenções e tema (mantido para compatibilidade)
    const intent = detectUserIntent(input.message);
    const detectedTheme = detectLegalTheme(input.message);
    
    // Determinar audiência efetiva
    let effectiveAudience = input.userType;
    if (input.userType === 'client' && !input.profile) {
      effectiveAudience = 'visitor';
    }
    if (input.userType === 'staff' && (!input.profile || input.profile.role === 'cliente')) {
      effectiveAudience = 'visitor';
    }
    
    // Bloquear consultoria gratuita para visitors
    const shouldBlockLegalAdvice = intent === 'legal_advice_request' && effectiveAudience === 'visitor';
    
    if (shouldBlockLegalAdvice) {
      const fallbackResponse = generateFallbackResponse(intent, effectiveAudience, input.channel, detectedTheme || undefined);
      return {
        reply: fallbackResponse,
        intent,
        audience: effectiveAudience,
        source: 'triage',
        usedFallback: true,
        error: null,
        metadata: {
          responseTime: Date.now() - startTime,
          detectedTheme: detectedTheme || undefined,
          channel: input.channel,
          openaiUsed: false,
          classification,
          conversationState: newConversationState
        }
      };
    }
    
    // Tentar OpenAI primeiro
    const systemPrompt = buildSystemPrompt(input.channel, effectiveAudience, input.context);
    
    console.log(`NOEMIA_CORE_OPENAI_ATTEMPT: ${input.channel} | ${effectiveAudience}`);
    
    const openaiResult = await callOpenAI(input.message, systemPrompt);
    
    if (openaiResult.success && openaiResult.response) {
      console.log(`NOEMIA_CORE_OPENAI_SUCCESS: ${input.channel}`);
      
      return {
        reply: openaiResult.response,
        intent,
        audience: effectiveAudience,
        source: 'openai',
        usedFallback: false,
        error: null,
        metadata: {
          responseTime: Date.now() - startTime,
          detectedTheme: detectedTheme || undefined,
          channel: input.channel,
          openaiUsed: true,
          classification,
          conversationState: newConversationState
        }
      };
    }
    
    // Fallback se OpenAI falhar - usar triagem inteligente
    console.log(`NOEMIA_CORE_FALLBACK: ${input.channel} | ${openaiResult.error}`);
    
    const triageResponse = generateTriageResponse(newConversationState, input.message, classification);
    
    return {
      reply: triageResponse,
      intent,
      audience: effectiveAudience,
      source: 'fallback',
      usedFallback: true,
      error: openaiResult.error || null,
      metadata: {
        responseTime: Date.now() - startTime,
        detectedTheme: detectedTheme || undefined,
        channel: input.channel,
        openaiUsed: false,
        classification,
        conversationState: newConversationState
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.log(`NOEMIA_CORE_ERROR: ${input.channel} | ${errorMessage}`);
    
    // Fallback de emergência
    const emergencyResponse = "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente ou entre em contato direto com o escritório.";
    
    return {
      reply: emergencyResponse,
      audience: input.userType,
      source: 'fallback',
      usedFallback: true,
      error: errorMessage,
      metadata: {
        responseTime: Date.now() - startTime,
        detectedTheme: detectLegalTheme(input.message) || undefined,
        channel: input.channel,
        openaiUsed: false,
export async function processComment(
  commentText: string,
  platform: 'instagram' | 'facebook',
  commentId: string,
  userId: string
): Promise<{
  reply: string;
  shouldReplyPrivately: boolean;
  classification: {
    theme: "previdenciario" | "bancario" | "familia" | "civil" | "geral";
    intent: "curiosity" | "lead_interest" | "support" | "appointment_interest";
    leadTemperature: "cold" | "warm" | "hot";
  };
  metadata: {
    responseTime: number;
    channel: string;
    openaiUsed: boolean;
  };
}> {
  const startTime = Date.now();
  
  console.log(`NOEMIA_COMMENT_START: ${platform} | ${commentId} | ${userId}`);
  console.log(`NOEMIA_COMMENT_TEXT: ${commentText.substring(0, 100)}...`);
  
  // Classificar o comentário
  const classification = classifyMessage(commentText);
  
  // Determinar se deve responder privadamente
  const shouldReplyPrivately = 
    classification.intent === 'lead_interest' || 
    classification.leadTemperature === 'warm' || 
    classification.leadTemperature === 'hot';
  
  try {
    // Gerar resposta curta e estratégica para comentários
    const systemPrompt = [
      "Você é Noemia, assistente do escritório Noêmia Paixão Advocacia.",
      "Responda a um comentário em rede social de forma curta, estratégica e profissional.",
      "",
      "REGRAS PARA RESPOSTA DE COMENTÁRIO:",
      "- Máximo 2-3 frases curtas",
      "- Tom acolhedor mas profissional",
      "- Nunca dê consultoria jurídica em público",
      "- Sempre conduza para conversa privada ou consulta",
      "- Use 1-2 emojis no máximo (legal, acolhedor)",
      "",
      "ESTRATÉGIA:",
      "1. Reconheça o comentário com empatia",
      "2. Ofereça ajuda de forma geral",
      "3. Conduza para conversa privada (DM/WhatsApp)",
      "",
      "EXEMPLOS:",
      "- 'Olá! Vi seu comentário sobre aposentadoria. Posso te ajudar a entender melhor. Mande uma DM!'",
      "- 'Entendo sua situação com o banco. Vamos conversar em privado para te orientar. Mande mensagem!'",
      "- 'Ótima pergunta! Para te ajudar melhor, me chama no direct que explico os detalhes.'",
      "",
      "Responda de forma natural, curta e estratégica."
    ].join('\n');
    
    const openaiResult = await callOpenAI(commentText, systemPrompt);
    
    if (openaiResult.success && openaiResult.response) {
      console.log(`NOEMIA_COMMENT_SUCCESS: ${platform} | ${shouldReplyPrivately ? 'PRIVATE_REPLY' : 'PUBLIC_REPLY'}`);
      
      return {
        reply: openaiResult.response,
        shouldReplyPrivately,
        classification,
        metadata: {
          responseTime: Date.now() - startTime,
          channel: `${platform}_comment`,
          openaiUsed: true
        }
      };
    }
    
    // Fallback se OpenAI falhar
    console.log(`NOEMIA_COMMENT_FALLBACK: ${platform} | ${openaiResult.error}`);
    
    const fallbackReply = generateCommentFallback(classification, platform);
    
    return {
      reply: fallbackReply,
      shouldReplyPrivately,
      classification,
      metadata: {
        responseTime: Date.now() - startTime,
        channel: `${platform}_comment`,
        openaiUsed: false
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.log(`NOEMIA_COMMENT_ERROR: ${platform} | ${errorMessage}`);
    
    // Fallback de emergência
    const emergencyReply = "Olá! Vi seu comentário. Para te ajudar melhor, me chama no direct que conversamos!";
    
    return {
      reply: emergencyReply,
      shouldReplyPrivately: true,
      classification,
      metadata: {
        responseTime: Date.now() - startTime,
        channel: `${platform}_comment`,
        openaiUsed: false
      }
    };
  }
}

// Fallback para comentários
function generateCommentFallback(
  classification: {
    theme: "previdenciario" | "bancario" | "familia" | "civil" | "geral";
    intent: "curiosity" | "lead_interest" | "support" | "appointment_interest";
    leadTemperature: "cold" | "warm" | "hot";
  },
  platform: 'instagram' | 'facebook'
): string {
  const responses: Record<string, string> = {
    previdenciario: "Olá! Vi seu comentário sobre aposentadoria. Posso te ajudar a entender melhor. Mande uma DM! ",
    bancario: "Entendo sua situação com o banco. Vamos conversar em privado para te orientar. Mande mensagem!",
    familia: "Olá! Vi seu comentário sobre direito de família. Posso te ajudar. Me chama no direct!",
    civil: "Ótima pergunta! Para te ajudar melhor, me chama no direct que explico os detalhes.",
    geral: "Olá! Vi seu comentário. Para te ajudar, me chama no direct que conversamos!"
  };
  
  return responses[classification.theme] || responses.geral;
}

// Função de conveniência para compatibilidade com interface atual
export async function answerNoemia(
  rawInput: any,
  profile: PortalProfile | null,
  sessionId?: string,
  urlContext?: any
) {
  // Converter para novo formato
  const input = askNoemiaSchema.parse(rawInput);
  
  const coreInput: NoemiaCoreInput = {
    channel: 'portal', // padrão para compatibilidade
    userType: input.audience,
    message: input.message,
    history: [], // TODO: implementar se necessário
    context: urlContext,
    metadata: { sessionId, urlContext },
    profile
  };
  
  const result = await processNoemiaCore(coreInput);
  
  // Manter compatibilidade com formato atual
  return {
    audience: result.audience,
    answer: result.reply,
    message: result.reply,
    actions: result.actions || [],
    meta: {
      intent: result.intent,
      profile: result.audience,
      source: result.source
    }
  };
}
