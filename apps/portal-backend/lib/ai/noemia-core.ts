/**
 * NOEMIA CORE - CÉREBRO CENTRALIZADO DA IA
 *
 * Única camada responsável por toda inteligência da NoemIA
 * Usado por: site, portal, WhatsApp, Instagram
 */

import { OpenAI } from "openai";
import { clientContextService } from "../services/client-context";
import { triagePersistence, TriageData } from "../services/triage-persistence";
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
  | "acolhimento"           // Boas-vindas e quebra-gelo
  | "identificacao_area"     // Identificar área jurídica
  | "problema_principal"     // Entender o que aconteceu
  | "tempo_momento"          // Quando aconteceu / contexto temporal
  | "documentos_provas"      // Verificar existência de provas
  | "objetivo_cliente"       // O que o cliente quer alcançar
  | "avaliacao_urgencia"     // Classificar nível de urgência
  | "resumo_encaminhamento"  // Resumir e decidir próximo passo
  | "conversao";            // Momento de conversão

interface ConversationState {
  currentStep: ConversationStep;
  collectedData: {
    // Bloco A - Tema Principal
    area?: LegalTheme;
    
    // Bloco B - O Que Aconteceu
    problema_principal?: string;
    descricao_detalhada?: string;
    
    // Bloco C - Tempo / Momento
    timeframe?: string;
    acontecendo_agora?: boolean;
    
    // Bloco D - Documentos / Provas
    tem_documentos?: boolean;
    tipos_documentos?: string[];
    
    // Bloco E - Objetivo do Cliente
    objetivo_cliente?: string;
    resultado_esperado?: string;
    
    // Bloco F - Urgência
    nivel_urgencia?: 'baixa' | 'media' | 'alta';
    prejuizo_ativo?: boolean;
    
    // Metadados
    detalhes?: string[];
    palavras_chave?: string[];
  };
  isHotLead: boolean;
  needsHumanAttention: boolean;
  handoffReason?: string;
  triageCompleteness: number; // 0-100%
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
    needsHumanAttention: false,
    triageCompleteness: 0,
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
      palavras_chave: extractKeywords(message),
    },
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

    case "tempo_momento":
      const timeInfo = extractTimeInfo(message);
      newState.collectedData.timeframe = timeInfo.timeframe;
      newState.collectedData.acontecendo_agora = timeInfo.isHappeningNow;
      newState.currentStep = "documentos_provas";
      break;

    case "documentos_provas":
      const docInfo = extractDocumentInfo(message);
      newState.collectedData.tem_documentos = docInfo.hasDocuments;
      newState.collectedData.tipos_documentos = docInfo.documentTypes;
      newState.currentStep = "objetivo_cliente";
      break;

    case "objetivo_cliente":
      if (!newState.collectedData.objetivo_cliente) {
        newState.collectedData.objetivo_cliente = message;
        newState.currentStep = "avaliacao_urgencia";
      }
      break;

    case "avaliacao_urgencia":
      const urgencyInfo = extractUrgencyInfo(message);
      newState.collectedData.nivel_urgencia = urgencyInfo.level;
      newState.collectedData.prejuizo_ativo = urgencyInfo.hasActiveDamage;
      newState.isHotLead = urgencyInfo.level === 'alta' || urgencyInfo.hasActiveDamage;
      newState.currentStep = "resumo_encaminhamento";
      break;

    case "resumo_encaminhamento":
      // Calcular completude da triagem
      newState.triageCompleteness = calculateTriageCompleteness(newState.collectedData);
      
      // Decidir handoff
      const handoffDecision = evaluateHandoff(newState);
      newState.needsHumanAttention = handoffDecision.needsAttention;
      newState.handoffReason = handoffDecision.reason;
      
      newState.currentStep = newState.needsHumanAttention ? "conversao" : "conducao_proximo_passo";
      break;

    case "conducao_proximo_passo":
    case "conversao":
      newState.collectedData.detalhes?.push(message);
      break;
  }

  return newState;
}

// Funções auxiliares para extração de informações
function extractKeywords(message: string): string[] {
  const keywords = message.toLowerCase().match(/\b(aposentadoria|inss|benefício|banco|empréstimo|divórcio|pensão|guarda|contrato|demissão|trabalhista)\b/g) || [];
  return [...new Set(keywords)];
}

function extractTimeInfo(message: string): { timeframe: string; isHappeningNow: boolean } {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('agora') || lowerMessage.includes('hoje') || lowerMessage.includes('está acontecendo')) {
    return { timeframe: 'agora', isHappeningNow: true };
  }
  
  if (lowerMessage.includes('ontem') || lowerMessage.includes('semana passada')) {
    return { timeframe: 'recentemente', isHappeningNow: false };
  }
  
  if (lowerMessage.includes('mês') || lowerMessage.includes('meses')) {
    return { timeframe: 'alguns meses', isHappeningNow: false };
  }
  
  if (lowerMessage.includes('ano') || lowerMessage.includes('anos')) {
    return { timeframe: 'muito tempo', isHappeningNow: false };
  }
  
  return { timeframe: 'não especificado', isHappeningNow: false };
}

function extractDocumentInfo(message: string): { hasDocuments: boolean; documentTypes: string[] } {
  const lowerMessage = message.toLowerCase();
  const documentTypes: string[] = [];
  
  if (lowerMessage.includes('contrato')) documentTypes.push('contrato');
  if (lowerMessage.includes('extrato') || lowerMessage.includes('demonstrativo')) documentTypes.push('extrato');
  if (lowerMessage.includes('holerite') || lowerMessage.includes('contracheque')) documentTypes.push('holerite');
  if (lowerMessage.includes('print') || lowerMessage.includes('printscreen')) documentTypes.push('prints');
  if (lowerMessage.includes('notificação') || lowerMessage.includes('carta')) documentTypes.push('notificação');
  if (lowerMessage.includes('decisão') || lowerMessage.includes('sentença')) documentTypes.push('decisão judicial');
  
  const hasDocuments = lowerMessage.includes('sim') || lowerMessage.includes('tenho') || lowerMessage.includes('já') || documentTypes.length > 0;
  
  return { hasDocuments, documentTypes };
}

function extractUrgencyInfo(message: string): { level: 'baixa' | 'media' | 'alta'; hasActiveDamage: boolean } {
  const lowerMessage = message.toLowerCase();
  
  const highUrgency = ['urgente', 'imediato', 'perdi', 'estou sem', 'bloqueou', 'parou', 'suspenderam', 'corte'];
  const mediumUrgency = ['preciso', 'quero', 'prejudicado', 'problema', 'difuldade'];
  const damageIndicators = ['perdendo dinheiro', 'prejuízo', 'prejuizo', 'multa', 'juros', 'corte'];
  
  const hasActiveDamage = damageIndicators.some(indicator => lowerMessage.includes(indicator));
  
  if (highUrgency.some(word => lowerMessage.includes(word)) || hasActiveDamage) {
    return { level: 'alta', hasActiveDamage };
  }
  
  if (mediumUrgency.some(word => lowerMessage.includes(word))) {
    return { level: 'media', hasActiveDamage };
  }
  
  return { level: 'baixa', hasActiveDamage };
}

function calculateTriageCompleteness(data: ConversationState['collectedData']): number {
  const fields = [
    data.area,
    data.problema_principal,
    data.timeframe,
    data.tem_documentos !== undefined,
    data.objetivo_cliente,
    data.nivel_urgencia
  ];
  
  const completedFields = fields.filter(field => field !== undefined && field !== null).length;
  return Math.round((completedFields / fields.length) * 100);
}

function evaluateHandoff(state: ConversationState): { needsAttention: boolean; reason: string } {
  // Critérios para handoff humano
  if (state.isHotLead) {
    return { needsAttention: true, reason: 'Lead quente detectado - atenção prioritária' };
  }
  
  if (state.collectedData.nivel_urgencia === 'alta') {
    return { needsAttention: true, reason: 'Alta urgência identificada' };
  }
  
  if (state.collectedData.prejuizo_ativo) {
    return { needsAttention: true, reason: 'Prejuízo ativo em andamento' };
  }
  
  if (state.triageCompleteness >= 80) {
    return { needsAttention: true, reason: 'Triagem completa - pronto para análise humana' };
  }
  
  if (state.collectedData.area === 'previdenciario' && state.collectedData.tem_documentos) {
    return { needsAttention: true, reason: 'Caso previdenciário com documentos - análise recomendada' };
  }
  
  return { needsAttention: false, reason: 'Continuar triagem automatizada' };
}

function generateTriageResponse(
  state: ConversationState,
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  },
  previousMessage?: string
): string {
  // Detectar respostas curtas para continuidade
  const shortResponses = ["sim", "não", "ainda não", "quero", "ok", "entendi", "certo"];
  const isShortResponse = previousMessage && shortResponses.some(sr => 
    previousMessage.toLowerCase().trim() === sr
  );

  switch (state.currentStep) {
    case "acolhimento":
      return `Faz sentido você ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar.\n\nFaço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia e estou aqui para te ajudar a organizar isso.\n\nMe conta rapidinho o que aconteceu no seu caso.`;

    case "identificacao_area":
      if (isShortResponse) {
        return `Perfeito, isso já ajuda a entender melhor sua situação. Muitas pessoas estão exatamente nesse momento de dúvida antes de dar entrada.\n\nPelo que você descreveu, seu caso parece estar na área ${getAreaNome(classification.theme)}.\n\nAgora me conta: isso que você mencionou aconteceu há quanto tempo?`;
      }
      return `Olha... o interessante é que cada área tem detalhes que pouca gente conhecem.\n\nPelo que você descreveu, seu caso parece estar na área ${getAreaNome(classification.theme)}.\n\nIsso aconteceu há quanto tempo?`;

    case "tempo_momento":
      if (isShortResponse) {
        return `Entendi... Faz sentido você se sentir assim. O momento certo de agir faz toda a diferença.\n\nVocê já tem algum documento ou prova sobre isso? Contratos, extratos, prints, notificações?`;
      }
      return `Entendi... O momento certo de agir faz toda a diferença.\n\nVocê já tem algum documento ou prova sobre isso?`;

    case "documentos_provas":
      if (isShortResponse) {
        return `Perfeito... Já estou entendendo melhor seu cenário.\n\nO que você espera conseguir com essa análise jurídica? Qual seria o resultado ideal para você?`;
      }
      return `Perfeito... Já estou entendendo melhor seu cenário.\n\nO que você espera conseguir com essa análise jurídica? Qual seria o resultado ideal?`;

    case "objetivo_cliente":
      if (isShortResponse) {
        return `Obrigada por compartilhar isso comigo. Isso já me ajuda a ter uma visão mais clara.\n\nEssa situação está te causando algum prejuízo ou dificuldade agora? Ou é mais preventivo?`;
      }
      return `Obrigada por compartilhar isso comigo. Isso já me ajuda a ter uma visão mais clara.\n\nEssa situação está te causando algum prejuízo ou dificuldade agora?`;

    case "avaliacao_urgencia":
      if (state.needsHumanAttention) {
        if (isShortResponse) {
          return `Pelo que você me contou, isso realmente precisa de atenção ${state.collectedData.nivel_urgencia === 'alta' ? 'rápida' : 'especializada'}.\n\nO que poucos entendem é que agir agora pode mudar completamente o resultado.\n\nVou organizar tudo para a Dra. Noêmia analisar seu caso. Você prefere agendar uma consulta online ou falar primeiro por WhatsApp?`;
        }
        return `Pelo que você me contou, isso realmente precisa de atenção ${state.collectedData.nivel_urgencia === 'alta' ? 'rápida' : 'especializada'}.\n\nO que poucos entendem é que agir agora pode mudar completamente o resultado.\n\nVou organizar tudo para a Dra. Noêmia analisar seu caso. Você prefere agendar uma consulta online ou falar primeiro por WhatsApp?`;
      }

      if (isShortResponse) {
        return `Perfeito... Já estou entendendo melhor seu cenário.\n\nVocê já pensou em como seria ter uma análise profissional do seu caso? Às vezes o que parece complicado tem solução mais simples do que imaginamos.`;
      }
      return `Perfeito... Já estou entendendo melhor seu cenário.\n\nVocê já pensou em como seria ter uma análise profissional do seu caso?`;

    case "resumo_encaminhamento":
      const summary = generateInternalSummary(state);
      if (state.needsHumanAttention) {
        return `Ótimo! Já organizei tudo o que você me contou.\n\n${generateUserFriendlySummary(state)}\n\nO melhor próximo passo agora é uma análise cuidadosa com a Dra. Noêmia. Geralmente a solução pode ser mais simples do que parece.\n\nVocê prefere agendar online ou falar primeiro por WhatsApp?`;
      }
      
      return `Entendi... Já estou organizando suas informações.\n\n${generateUserFriendlySummary(state)}\n\nPara te dar a melhor orientação possível, preciso mais alguns detalhes. Podemos continuar conversando ou você prefere já agendar uma análise com a Dra. Noêmia?`;

    case "conducao_proximo_passo":
    case "conversao":
      if (isShortResponse) {
        return `Perfeito! Isso mostra que você está no caminho certo para resolver isso.\n\nO melhor próximo passo agora é uma análise cuidadosa com a Dra. Noêmia. Geralmente a solução pode ser mais simples do que parece. Você prefere agendar online ou falar primeiro por WhatsApp?`;
      }
      return `Perfeito. O melhor próximo passo agora é uma análise cuidadosa com a Dra. Noêmia.\n\nGeralmente a solução pode ser mais simples do que parece.\n\nVocê prefere agendar online ou falar primeiro por WhatsApp?`;

    default:
      return `Faz sentido você ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar.\n\nFaço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia.\n\nMe conta rapidinho o que aconteceu?`;
  }
}

function generateUserFriendlySummary(state: ConversationState): string {
  const data = state.collectedData;
  const parts: string[] = [];
  
  if (data.area) parts.push(`Área: ${getAreaNome(data.area)}`);
  if (data.problema_principal) parts.push(`Situação: ${data.problema_principal.substring(0, 80)}${data.problema_principal.length > 80 ? '...' : ''}`);
  if (data.timeframe && data.timeframe !== 'não especificado') parts.push(`Quando: ${data.timeframe}`);
  if (data.tem_documentos) parts.push(`Documentos: ${data.tipos_documentos.length > 0 ? data.tipos_documentos.join(', ') : 'disponíveis'}`);
  if (data.objetivo_cliente) parts.push(`Objetivo: ${data.objetivo_cliente.substring(0, 60)}${data.objetivo_cliente.length > 60 ? '...' : ''}`);
  if (data.nivel_urgencia && data.nivel_urgencia !== 'baixa') parts.push(`Urgência: ${data.nivel_urgencia}`);
  
  return parts.join(' | ');
}

function generateInternalSummary(state: ConversationState): string {
  const data = state.collectedData;
  return `
=== RESUMO DA TRIAGEM ===
Área Jurídica: ${data.area || 'não identificada'}
Problema Principal: ${data.problema_principal || 'não informado'}
Timeframe: ${data.timeframe || 'não informado'}
Acontecendo Agora: ${data.acontecendo_agora ? 'Sim' : 'Não'}
Tem Documentos: ${data.tem_documentos ? 'Sim' : 'Não'}
Tipos de Documentos: ${data.tipos_documentos?.join(', ') || 'N/A'}
Objetivo do Cliente: ${data.objetivo_cliente || 'não informado'}
Nível de Urgência: ${data.nivel_urgencia || 'não avaliado'}
Prejuízo Ativo: ${data.prejuizo_ativo ? 'Sim' : 'Não'}
Completude da Triagem: ${state.triageCompleteness}%
Necessita Atenção Humana: ${state.needsHumanAttention ? 'Sim' : 'Não'}
Motivo: ${state.handoffReason || 'N/A'}
Palavras-chave: ${data.palavras_chave?.join(', ') || 'N/A'}
========================
  `.trim();
}

function getAreaNome(theme: LegalTheme): string {
  switch (theme) {
    case "previdenciario": return "previdenciária";
    case "bancario": return "bancária";
    case "familia": return "de família";
    case "civil": return "cível";
    default: return "jurídica";
  }
}

function buildSystemPrompt(
  channel: NoemiaChannel,
  userType: NoemiaUserType,
  context?: unknown
): string {
  const basePrompt = [
    "Você é a equipe de atendimento do escritório Noêmia Paixão Advocacia.",
    "Faço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia.",
    "Você é a recepcionista inteligente e acolhedora do escritório, especialista em triagem jurídica.",
    "",
    "SUA PERSONALIDADE - ATENDIMENTO ELITE:",
    "- fale como uma pessoa real, educada, empática e elegante",
    "- seja natural, nunca pareça um robô ou chatbot",
    "- use linguagem simples, clara e acolhedora, evite juridiquês",
    "- demonstre que está ouvindo e entendendo de verdade",
    "- seja premium, humana e acessível",
    "- tom: humano, acolhedor, elegante, claro, seguro, levemente persuasivo",
    "",
    "SEU PAPEL - TRIAGEM E CONVERSÃO:",
    "- acolher brevemente e conduzir a conversa naturalmente",
    "- identificar de forma natural: área do direito, situação concreta, urgência, estágio do problema",
    "- fazer perguntas estratégicas uma de cada vez (triagem conversacional)",
    "- priorizar: benefício/aposentadoria/INSS, problema bancário/negativação, família/separação/guarda, civil/contrato/dano",
    "- gerar valor percebido sem dar consultoria completa",
    "- SEMPRE buscar avanço da conversa e conduzir para próximo passo",
    "- NUNCA se apresentar como advogada",
    "- apresentar-se como equipe de atendimento/recepção do escritório",
    "",
    "DIRETRIZES DE CONVERSÃO:",
    "- Após entender minimamente o caso, gere valor com frases como:",
    "- 'Dependendo da situação, pode existir um direito que ainda não foi reconhecido.'",
    "- 'Isso acontece com mais pessoas do que parece.'",
    "- 'Em muitos casos, o problema não é falta de direito, e sim falta de orientação correta.'",
    "- Quando houver interesse real, conduza para continuação da triagem ou atendimento da equipe",
    "",
    "COMO FALAR - ESTRATÉGIA ELITE:",
    "- NUNCA responder de forma fria, seca ou genérica",
    "- NUNCA usar respostas passivas: 'estou aqui para ajudar', 'como posso ajudar?', 'o que você deseja?'",
    "- SEMPRE inclua um insight leve que gere curiosidade",
    "- USE inícios acolhedores: 'Faz sentido você ter essa dúvida', 'Entendo sua preocupação'",
    "- FAÇA UMA PERGUNTA POR VEZ - nunca múltiplas perguntas técnicas",
    "- NÃO entregue explicação completa - crie valor percebido",
    "- reconheça o que a pessoa disse antes de responder",
    "- use frases curtas, naturais e estratégicas",
    "",
    "TRIAGEM CONVERSACIONAL:",
    "- Não parecer formulário - seja natural e fluida",
    "- Perguntas curtas, naturais e estratégicas",
    "- Classifique internamente sem expor ao usuário",
    "- Se responder de forma curta ('não', 'sim', 'quero'), retome o contexto e continue conduzindo",
    "",
    "EXEMPLOS DE INSIGHTS LEVES:",
    "- 'Muita gente nessa situação acaba deixando de investigar possibilidades justamente por achar que não se encaixa...'",
    "- 'O interessante é que a maioria das pessoas não sabe que existem diferentes caminhos para isso...'",
    "- 'Geralmente o que mais surpreende é que a solução pode ser mais simples do que parece...'",
    "- 'O que poucos entendem é que o momento certo de agir faz toda a diferença...'",
    "- 'Dependendo da situação, pode existir um direito que ainda não foi reconhecido.'",
    "- 'Isso acontece com mais pessoas do que parece.'",
    "- 'Em muitos casos, o problema não é falta de direito, e sim falta de orientação correta.'",
    "",
    "EXEMPLOS DE PERGUNTAS ESTRATÉGICAS:",
    "- 'Isso que você mencionou aconteceu há quanto tempo?'",
    "- 'Você já passou por alguma situação parecida antes?'",
    "- 'O que mais te preocupa nessa história toda?'",
    "- 'Você já recebeu algum benefício ou tem algum processo sobre isso?'",
    "- 'Isso está acontecendo agora ou já faz algum tempo?'",
    "",
    "RESPOSTAS ESPECIAIS:",
    "- Para 'oi': 'Olá! Que bom que você chegou por aqui. Faço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia. Me conta rapidinho o que está acontecendo...'",
    "- Para 'boa tarde': 'Boa tarde! Estou aqui para te ajudar. Faço parte da equipe do escritório Noêmia Paixão Advocacia. O que está acontecendo no seu caso?'",
    "- Para 'você é advogada?': 'Faço parte da equipe de atendimento do escritório, aqui para te organizar tudo. A Dra. Noêmia é nossa advogada especialista. Me conta o que aconteceu no seu caso?'",
    "- Para 'quero saber se tenho direito': 'Faz sentido você querer entender seus direitos. Dependendo da situação, pode existir algo que ainda não foi reconhecido. Quero entender melhor seu caso para te orientar com precisão.'",
    "- Para respostas curtas ('não', 'sim', 'quero'): retome contexto + continue conduzindo",
    "",
    "O QUE NUNCA FAZER:",
    "- não invente fatos ou documentos",
    "- não prometa resultados ou direitos",
    "- não diga 'você tem direito' sem analisar",
    "- não repita 'posso ajudar' ou 'como posso ajudar'",
    "- não use respostas genéricas que não se conectam com o contexto",
    "- não se apresente como 'assistente virtual' ou 'inteligência artificial'",
    "- não use linguagem corporativa ou formal demais",
    "- não faça múltiplas perguntas técnicas na mesma mensagem",
    "- não se apresente como advogada",
    "",
    "FLUXO IDEAL - ATENDIMENTO ELITE:",
    "1. Acolha brevemente com reconhecimento natural",
    "2. Adicione um insight leve que gera curiosidade",
    "3. Mostre que entendeu a situação específica",
    "4. Dê uma orientação inicial útil, mas limitada",
    "5. Faça UMA pergunta estratégica natural para continuar",
    "6. SEMPRE termine com pergunta aberta ou direção clara",
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
      "- reconhecer que já existe vínculo com o escritório",
      "- evitar abordagem de prospecção",
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
    return `Olá! Que bom que você chegou por aqui. Faço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia.\n\nFaz sentido você ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar.\n\nMe conta rapidinho o que está acontecendo...`;
  }

  if (intent === "agenda_request") {
    return `Claro... Cada caso tem o melhor momento para agir.\n\nVocê quer agendar agora ou entender melhor sua situação primeiro?`;
  }

  if (intent === "case_request" && userType !== "visitor") {
    return `Entendi... Pequenos detalhes podem mudar tudo.\n\nVocê quer saber sobre andamento, documentos ou próximo passo?`;
  }

  if (intent === "document_request" && userType !== "visitor") {
    return `Perfeito... Os documentos certos fazem toda a diferença.\n\nVocê precisa enviar algo agora ou quer saber o que é necessário?`;
  }

  if (detectedTheme) {
    return `Olha... cada área tem detalhes que pouca gente conhece.\n\nSeu caso parece estar relacionado a ${detectedTheme}.\n\nO que mais te preocupa nessa história?`;
  }

  return `Faz sentido você ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar.\n\nFaço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia.\n\nMe conta rapidinho o que aconteceu?`;
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
    // Fase 4.2 - Buscar contexto do cliente
    let clientContext = null;
    let enrichedContext = input.context;

    if (input.channel === 'whatsapp' || input.channel === 'instagram') {
      try {
        // Tentar obter clientId do metadata ou context
        const clientId = (input.metadata?.clientId as string) || 
                        (input.context as any)?.clientId ||
                        (input.conversationState as any)?.clientId;

        const sessionId = (input.metadata?.sessionId as string) ||
                        (input.context as any)?.sessionId;

        clientContext = await clientContextService.getClientContextForAI({
          clientId,
          sessionId,
          channel: input.channel
        });

        if (clientContext) {
          console.log('AI_CONTEXT_ENRICHED', {
            clientId: clientContext.client.id,
            isClient: clientContext.client.is_client,
            pipelineStage: clientContext.pipeline?.stage,
            leadTemperature: clientContext.pipeline?.lead_temperature
          });

          // Formatar contexto para a IA
          const formattedContext = clientContextService.formatContextForAI(clientContext);
          
          // Enriquecer o contexto existente
          enrichedContext = {
            ...(input.context ? (input.context as Record<string, unknown>) : {}),
            clientContext: formattedContext
          } as any;
        }
      } catch (contextError) {
        console.error('CLIENT_CONTEXT_ENRICHMENT_ERROR', contextError);
        // Continuar sem contexto enriquecido
      }
    }

    const intent = detectUserIntent(input.message);
    const detectedTheme = detectLegalTheme(input.message);

    let effectiveAudience: NoemiaUserType = input.userType;

    if (input.userType === "client" && !input.profile) {
      effectiveAudience = "visitor";
    }

    if (input.userType === "staff" && (!input.profile || input.profile.role === "cliente")) {
      effectiveAudience = "visitor";
    }

    // Ajustar audience baseado no contexto do cliente
    if (clientContext && clientContext.client.is_client) {
      effectiveAudience = "client";
    }

    const systemPrompt = buildSystemPrompt(
      input.channel,
      effectiveAudience,
      enrichedContext
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

      // Fase 4.5 - Atualizar pipeline automaticamente após interação
      if (clientContext && (input.channel === 'whatsapp' || input.channel === 'instagram')) {
        try {
          await clientContextService.updatePipelineFromInteraction(
            clientContext.client.id,
            {
              messageText: input.message,
              currentIntent: intent,
              caseArea: detectedTheme || undefined,
              leadTemperature: classification.leadTemperature
            }
          );
        } catch (pipelineError) {
          console.error('PIPELINE_AUTO_UPDATE_ERROR', pipelineError);
          // Não quebrar o fluxo se a atualização do pipeline falhar
        }
      }

      // Fase 4.6 - Salvar dados da triagem se houver estado de conversação
      if (newConversationState && input.channel !== 'portal') {
        try {
          await saveTriageData(input, newConversationState, classification);
        } catch (triageError) {
          console.error('TRIAGE_SAVE_ERROR', triageError);
          // Não quebrar o fluxo se o salvamento da triagem falhar
        }
      }

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
        ? generateTriageResponse(newConversationState, classification, input.message)
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