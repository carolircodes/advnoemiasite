import "server-only";

import { OpenAI } from "openai";
import { createServerSupabaseClient } from "../supabase/server";
import { logger, logNoemia } from "../logging/structured-logger";
import { PortalProfile } from "../auth/guards";
import { getClientWorkspace } from "./dashboard";
import { caseAreaLabels, askNoemiaSchema } from "../domain/portal";
import { getStaffOverview } from "./dashboard";
import { getBusinessIntelligenceOverview } from "./intelligence";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatRateValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "sem base";
  }

  return `${value.toFixed(1)}%`;
}

// Sugestões dinâmicas por tema
function getThemeSuggestions(tema?: string): string[] {
  const suggestions: Record<string, string[]> = {
    'aposentadoria': [
      'Posso me aposentar?',
      'Quanto tempo falta?',
      'Quais documentos preciso?',
      'Como funciona o cálculo?'
    ],
    'desconto-indevido': [
      'Como parar o desconto?',
      'Posso recuperar o dinheiro?',
      'O banco pode fazer isso?',
      'Quais meus direitos?'
    ],
    'pensao': [
      'Meu marido não paga pensão',
      'Como calcular o valor?',
      'Como pedir revisão?',
      'O que fazer se não paga?'
    ],
    'divorcio': [
      'Como funciona o divórcio?',
      'Quanto tempo demora?',
      'Como dividir bens?',
      'E se tiver filhos?'
    ],
    'trabalhista': [
      'Fui demitido injustamente',
      'Como calcular as verbas?',
      'O que é aviso prévio?',
      'Posso processar?'
    ],
    'familia': [
      'Como funciona guarda?',
      'O que é pensão alimentícia?',
      'Como fazer guarda compartilhada?',
      'E se não concordarmos?'
    ]
  };
  
  return suggestions[tema || ''] || [
    'Olá! Bom dia',
    'Como agendar consulta?',
    'Quanto custa uma consulta?',
    'Quais áreas atendem?'
  ];
}

// Mensagem inicial contextual
function getInitialMessage(tema?: string): string {
  const messages: Record<string, string> = {
    'aposentadoria': 'Vi que você chegou por um conteúdo sobre aposentadoria. Posso te ajudar a entender os primeiros pontos, documentos necessários e o melhor próximo passo.',
    'desconto-indevido': 'Se a sua dúvida é sobre desconto indevido ou cobrança irregular, posso organizar sua situação inicial e te orientar sobre o caminho mais adequado.',
    'pensao': 'Sobre pensão alimentícia, posso te explicar como funciona, como calcular e quais são os seus direitos e deveres.',
    'divorcio': 'Sobre divórcio, posso te orientar sobre os tipos, procedimentos e o que precisa ser considerado para cada caso.',
    'trabalhista': 'Para questões trabalhistas, posso te explicar sobre direitos trabalhistas, verbas rescisórias e como proceder.',
    'familia': 'Em direito de família, posso te ajudar a entender sobre guarda, pensão, divórcio e outros procedimentos familiares.'
  };
  
  return messages[tema || ''] || 'Olá! Que bom ter você aqui. Sou a NoemIA, sua assistente inteligente para jornada jurídica. Posso ajudar com agendamentos, processos, documentos ou orientar sobre próximos passos.';
}

// Respostas com valor controlado para conversão
function generateControlledResponse(intent: string, tema?: string, isFollowUp: boolean = false): NoemiaResponse {
  const responses: Record<string, { main: string; factors: string[] }> = {
    'aposentadoria': {
      main: 'Sobre aposentadoria, é importante analisar vários fatores específicos do seu caso.',
      factors: ['tempo de contribuição', 'idade mínima', 'tipo de aposentadoria', 'valor do benefício']
    },
    'desconto-indevido': {
      main: 'Para descontos indevidos, é necessário verificar a origem e a legalidade da cobrança.',
      factors: ['origem do débito', 'contrato firmado', 'previsão legal', 'valor cobrado']
    },
    'pensao': {
      main: 'Em casos de pensão, são analisados os direitos e deveres das partes envolvidas.',
      factors: ['necessidade do alimentado', 'possibilidade do alimentante', 'proporcionalidade', 'capacidade financeira']
    },
    'divorcio': {
      main: 'O divórcio envolve várias etapas que precisam ser bem organizadas.',
      factors: ['tipo de divórcio', 'partilha de bens', 'guarda dos filhos', 'pensão alimentícia']
    },
    'trabalhista': {
      main: 'Questões trabalhistas exigem análise detalhada do contrato e das circunstâncias.',
      factors: ['motivo da demissão', 'tempo de serviço', 'verbas devidas', 'documentação']
    },
    'familia': {
      main: 'Direito de família requer cuidado especial com as relações pessoais envolvidas.',
      factors: ['interesse dos filhos', 'capacidade dos pais', 'condições financeiras', 'convivência familiar']
    }
  };
  
  const defaultResponse = {
    main: 'Para te ajudar corretamente, preciso entender melhor sua situação.',
    factors: ['detalhes do caso', 'documentação disponível', 'objetivo desejado', 'prazos importantes']
  };
  
  const response = responses[tema || ''] || responses[intent] || defaultResponse;
  
  const message = isFollowUp
    ? `Complementando o que expliquei, em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`
    : `${response.main} Em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`;
  
  return {
    message,
    actions: [
      { label: "Agendar consulta", href: "/triagem.html?origem=noemia-consulta" },
      { label: "Falar no WhatsApp", href: "https://wa.me/5511999999999" }
    ],
    meta: { intent, profile: 'visitor', source: 'fallback' }
  };
}

// Observabilidade e métricas da NoemIA
type NoemiaMetrics = {
  question: string;
  intent: string;
  profile: string;
  source: "openai" | "fallback";
  timestamp: Date;
  actions: NoemiaAction[];
  error?: string;
  sessionId?: string;
  responseTime?: number;
  tema?: string;  // Novo campo para tracking
  origem?: string; // Novo campo para tracking
};

// Armazenamento simples para métricas (em produção usar banco de dados)
const noemiaMetrics: NoemiaMetrics[] = [];

function recordNoemiaMetrics(metrics: NoemiaMetrics): void {
  noemiaMetrics.push(metrics);
  
  // Manter apenas últimos 1000 registros para não estourar memória
  if (noemiaMetrics.length > 1000) {
    noemiaMetrics.splice(0, 500); // Remove os 500 mais antigos
  }
  
  console.log('[noemia.metrics]', {
    intent: metrics.intent,
    profile: metrics.profile,
    source: metrics.source,
    actionsCount: metrics.actions.length,
    error: metrics.error || null,
    timestamp: metrics.timestamp.toISOString()
  });
}

function getNoemiaMetrics(): NoemiaMetrics[] {
  return noemiaMetrics;
}

function getNoemiaMetricsSummary() {
  const total = noemiaMetrics.length;
  const openaiCount = noemiaMetrics.filter(m => m.source === 'openai').length;
  const fallbackCount = noemiaMetrics.filter(m => m.source === 'fallback').length;
  
  const intentCounts = noemiaMetrics.reduce((acc, m) => {
    acc[m.intent] = (acc[m.intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const profileCounts = noemiaMetrics.reduce((acc, m) => {
    acc[m.profile] = (acc[m.profile] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total,
    sources: { openai: openaiCount, fallback: fallbackCount },
    intents: intentCounts,
    profiles: profileCounts,
    fallbackRate: total > 0 ? (fallbackCount / total * 100).toFixed(1) + '%' : '0%'
  };
}

// Tipos para resposta estruturada da NoemIA
export type NoemiaAction = {
  label: string;
  href?: string;
  action?: string;
};

export type NoemiaResponse = {
  message: string;
  answer?: string;
  audience?: string;
  actions?: NoemiaAction[];
  meta?: {
    intent: string;
    profile: string;
    source: string;
  };
};

// Contexto de URL para personalização
export type URLContext = {
  tema?: string;
  origem?: string;
};

export function getContextFromURL(url?: string): URLContext {
  if (!url) return {};
  
  try {
    const urlObj = url.startsWith("http") ? new URL(url) : new URL(url, "https://advnoemia.com.br");
    const params = new URLSearchParams(urlObj.search);
    
    return {
      tema: params.get('tema') || undefined,
      origem: params.get('origem') || undefined
    };
  } catch {
    return {};
  }
}

// Contexto de sessão para memória curta
type TriageStep = "start" | "theme" | "problem" | "time" | "urgency" | "done";

export type SessionContext = {
  lastIntent?: string;
  lastMessage?: string;
  profile?: string;
  lastTheme?: string | null;
  history: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>;
  triage?: {
    active: boolean;
    step: TriageStep;
    data: {
      theme?: string;
      problem?: string;
      time?: string;
      urgency?: string;
    };
  };
  lead?: {
    temperature: "cold" | "warm" | "hot";
    urgency: "low" | "medium" | "high";
  };
  leadSummary?: {
    theme?: string;
    problem?: string;
    time?: string;
    urgency?: string;
    temperature?: "cold" | "warm" | "hot";
    urgencyLevel?: "low" | "medium" | "high";
    priority?: "normal" | "high";
    needsHumanAttention?: boolean;
    handoffReason?: string;
  };
};

// Armazenamento simples em memória para contexto de sessão
const sessionContexts = new Map<string, SessionContext>();

export function getSessionContext(sessionId: string): SessionContext {
  if (!sessionContexts.has(sessionId)) {
    sessionContexts.set(sessionId, {
      history: [],
      triage: {
        active: false,
        step: "start",
        data: {}
      }
    });
  }

  const context = sessionContexts.get(sessionId)!;
  if (!context.triage) {
    context.triage = {
      active: false,
      step: "start",
      data: {}
    };
  }

  return context;
}

function trimSessionHistory(context: SessionContext, maxItems: number = 10): void {
  if (context.history.length > maxItems) {
    context.history = context.history.slice(-maxItems);
  }
}

export function updateSessionContext(sessionId: string, message: string, intent: string, profile: string, theme?: string | null): void {
  const context = getSessionContext(sessionId);
  context.lastIntent = intent;
  context.lastMessage = message;
  context.profile = profile;
  context.lastTheme = theme ?? context.lastTheme ?? null;
  
  // LEAD SCORING - detectar e salvar temperatura/urgência
  const temperature = detectLeadTemperature(message);
  const urgency = detectUrgencyLevel(message);
  context.lead = {
    temperature,
    urgency
  };
  
  // HANDOFF INTELIGENTE - construir e salvar resumo do lead
  context.leadSummary = buildLeadSummary(sessionId);
  
  context.history.push({
    role: "user",
    content: message,
    timestamp: new Date()
  });

  trimSessionHistory(context);
}

function addAssistantMessageToSession(sessionId: string, message: string): void {
  const context = getSessionContext(sessionId);
  context.history.push({
    role: "assistant",
    content: message,
    timestamp: new Date()
  });

  trimSessionHistory(context);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectLegalTheme(message: string): string | null {
  const normalizedMessage = normalizeText(message);

  if (/(aposent|inss|beneficio|loas|bpc|auxilio)/.test(normalizedMessage)) {
    return "aposentadoria";
  }

  if (/(desconto|cobranca|cobranca indevida|banco|emprestimo|juros|cartao|debito)/.test(normalizedMessage)) {
    return "desconto-indevido";
  }

  if (/(pensao|alimento|alimenticia)/.test(normalizedMessage)) {
    return "pensao";
  }

  if (/(divorcio|separacao|partilha)/.test(normalizedMessage)) {
    return "divorcio";
  }

  if (/(guarda|familia|filho|filha|visita)/.test(normalizedMessage)) {
    return "familia";
  }

  if (/(demissao|demit|trabalhista|patrao|empresa|verba|fgts|rescis)/.test(normalizedMessage)) {
    return "trabalhista";
  }

  return null;
}

function looksLikeLegalHelpRequest(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  return /(aposent|beneficio|inss|banco|desconto|pensao|divorcio|guarda|familia|trabalhista|demissao|processo|direito|problema|caso|ajuda|orientacao)/.test(normalizedMessage);
}

function extractRelativeTime(message: string): string | null {
  const normalizedMessage = normalizeText(message);
  if (/(hoje|ontem|agora)/.test(normalizedMessage)) return "recentemente";
  if (/(semana|semanas)/.test(normalizedMessage)) return "há algumas semanas";
  if (/(mes|meses)/.test(normalizedMessage)) return "há alguns meses";
  if (/(ano|anos)/.test(normalizedMessage)) return "há mais tempo";
  return null;
}

function inferUrgency(message: string): string | null {
  const normalizedMessage = normalizeText(message);
  if (/(urgente|prejuizo|bloque|desconto|nao paga|negado|parou|atrasado|dificuldade)/.test(normalizedMessage)) {
    return "sim";
  }
  return null;
}

// LEAD SCORING - DETECTAR TEMPERATURA DO LEAD
function detectLeadTemperature(message: string): "cold" | "warm" | "hot" {
  const normalizedMessage = normalizeText(message);
  
  // HOT: dor + urgência + prejuízo claro
  if (/(urgente|prejuizo|bloque|desconto|nao paga|negado|parou|atrasado|dificuldade|perdi|perdendo|estou sem|nao consigo|preciso urgentemente|socorro|ajuda urgente)/.test(normalizedMessage) &&
      /(meses|anos|semanas|tempo|há muito)/.test(normalizedMessage)) {
    return "hot";
  }
  
  // WARM: problema descrito mas sem urgência clara
  if (/(problema|situacao|caso|questao|dificuldade|duvida|tenho|estou com|preciso|gostaria)/.test(normalizedMessage) &&
      /(aposent|desconto|pensao|divorcio|trabalhista|familia|banco|inss)/.test(normalizedMessage)) {
    return "warm";
  }
  
  // COLD: pergunta genérica ou informativa
  return "cold";
}

// DETECTAR NÍVEL DE URGENCIA
function detectUrgencyLevel(message: string): "low" | "medium" | "high" {
  const normalizedMessage = normalizeText(message);
  
  // HIGH: urgência clara + prejuízo
  if (/(urgente|preciso urgentemente|socorro|ajuda urgente|bloque|perdi|estou sem|nao consigo|imediato|agora|hoje)/.test(normalizedMessage) ||
      /(prejuizo|prejuízo|perdendo dinheiro|multa|juros altos|corte|suspensao)/.test(normalizedMessage)) {
    return "high";
  }
  
  // MEDIUM: problema sem urgência clara
  if (/(problema|situacao|caso|questao|dificuldade|preciso|gostaria|meses|semanas)/.test(normalizedMessage)) {
    return "medium";
  }
  
  // LOW: dúvida inicial
  return "low";
}

// CONSTRUIR CTA INTELIGENTE BASEADO EM TEMPERATURA E URGENCIA
function buildSmartCTA(temperature: "cold" | "warm" | "hot", urgency: "low" | "medium" | "high"): NoemiaAction[] {
  // COLD: linguagem leve, CTA suave
  if (temperature === "cold") {
    return [
      { label: "Conhecer serviços", href: "/services" },
      { label: "Iniciar atendimento", href: "/triagem" }
    ];
  }
  
  // WARM: orientação + direção, CTA médio
  if (temperature === "warm") {
    return [
      { label: "Iniciar triagem", href: "/triagem" },
      { label: "Falar no WhatsApp", href: "https://wa.me/5511999999999" }
    ];
  }
  
  // HOT: linguagem firme, senso de urgência, CTA direto
  if (temperature === "hot" || urgency === "high") {
    return [
      { label: "Agendar consulta urgente", href: "/triagem.html?origem=urgente" },
      { label: "WhatsApp urgente", href: "https://wa.me/5511999999999" },
      { label: "Falar com advogada", href: "/contact" }
    ];
  }
  
  // Default
  return [
    { label: "Iniciar atendimento", href: "/triagem" }
  ];
}

// ADAPTAR MENSAGEM BASEADO EM TEMPERATURA E URGENCIA
function adaptMessageByLeadTemperature(baseMessage: string, temperature: "cold" | "warm" | "hot", urgency: "low" | "medium" | "high"): string {
  // COLD: linguagem leve
  if (temperature === "cold") {
    return baseMessage + " Se tiver alguma dúvida específica, é só me contar!";
  }
  
  // WARM: orientação + direção
  if (temperature === "warm") {
    return baseMessage + " Vamos organizar seu caso para te dar a melhor orientação possível.";
  }
  
  // HOT: linguagem firme, senso de urgência
  if (temperature === "hot" || urgency === "high") {
    return baseMessage + " Sua situação requer atenção imediata. Vamos resolver isso agora mesmo.";
  }
  
  return baseMessage;
}

// HANDOFF INTELIGENTE - DETECTAR NECESSIDADE DE ATENÇÃO HUMANA
function detectHumanHandoffNeed(temperature: "cold" | "warm" | "hot", urgencyLevel: "low" | "medium" | "high", theme?: string): {
  needsHumanAttention: boolean;
  priority: "normal" | "high";
  handoffReason: string;
} {
  // HOT + HIGH => atenção prioritária imediata
  if (temperature === "hot" && urgencyLevel === "high") {
    return {
      needsHumanAttention: true,
      priority: "high",
      handoffReason: "Lead quente com alta urgência - situação crítica detectada"
    };
  }
  
  // WARM + HIGH => atenção prioritária
  if (temperature === "warm" && urgencyLevel === "high") {
    return {
      needsHumanAttention: true,
      priority: "high",
      handoffReason: "Lead morno com alta urgência - requer atenção humana"
    };
  }
  
  // HOT + MEDIUM => atenção prioritária
  if (temperature === "hot" && urgencyLevel === "medium") {
    return {
      needsHumanAttention: true,
      priority: "high",
      handoffReason: "Lead quente com urgência média - potencial crítico"
    };
  }
  
  // TEMAS ESPECÍFICOS CRÍTICOS
  if (theme && ["desconto-indevido", "trabalhista"].includes(theme) && urgencyLevel !== "low") {
    return {
      needsHumanAttention: true,
      priority: "high",
      handoffReason: `Tema crítico (${theme}) com urgência detectada`
    };
  }
  
  // COLD => atendimento normal
  return {
    needsHumanAttention: false,
    priority: "normal",
    handoffReason: "Lead frio - tratamento padrão automatizado"
  };
}

// CONSTRUIR RESUMO ESTRUTURADO DO LEAD
function buildLeadSummary(sessionId: string): SessionContext["leadSummary"] {
  const context = getSessionContext(sessionId);
  const triageData = context.triage?.data || {};
  const leadData = context.lead || { temperature: "cold", urgency: "low" };
  
  const summary: SessionContext["leadSummary"] = {
    theme: triageData.theme || context.lastTheme || undefined,
    problem: triageData.problem || undefined,
    time: triageData.time || undefined,
    urgency: triageData.urgency || undefined,
    temperature: leadData.temperature,
    urgencyLevel: leadData.urgency,
    priority: "normal",
    needsHumanAttention: false,
    handoffReason: ""
  };
  
  // Detectar necessidade de handoff
  const handoffDetection = detectHumanHandoffNeed(summary.temperature || "cold", summary.urgencyLevel || "low", summary.theme);
  summary.priority = handoffDetection.priority;
  summary.needsHumanAttention = handoffDetection.needsHumanAttention;
  summary.handoffReason = handoffDetection.handoffReason;
  
  return summary;
}

// ADAPTAR RESPOSTA PARA LEADS PRIORITÁRIOS
function adaptPriorityResponse(baseMessage: string, priority: "normal" | "high"): string {
  if (priority === "high") {
    return "Pelo que você me contou, sua situação merece atenção prioritária. " + baseMessage + " O melhor próximo passo agora é falar com a equipe para organizar seu atendimento com mais agilidade.";
  }
  
  return baseMessage;
}

// CONSTRUIR CTA PRIORITÁRIO
function buildPriorityCTA(priority: "normal" | "high"): NoemiaAction[] {
  if (priority === "high") {
    return [
      { label: "Atendimento prioritário", href: "/triagem.html?origem=prioritario" },
      { label: "WhatsApp urgente", href: "https://wa.me/5511999999999" },
      { label: "Falar com advogada", href: "/contact" }
    ];
  }
  
  // CTA normal (usa smartCTA existente)
  return [
    { label: "Iniciar atendimento", href: "/triagem" }
  ];
}

function buildVisitorThemeResponse(theme: string | null, isFollowUp: boolean, context?: SessionContext): NoemiaResponse | null {
  const temperature = context?.lead?.temperature || "cold";
  const urgency = context?.lead?.urgency || "low";
  const priority = context?.leadSummary?.priority || "normal";
  const smartCTA = priority === "high" ? buildPriorityCTA(priority) : buildSmartCTA(temperature, urgency);
  
  switch (theme) {
    case "aposentadoria":
      const baseMessageAposentadoria = isFollowUp
        ? "Sobre aposentadoria, preciso entender: você já tentou solicitar o benefício? Foi negado? Ainda não começou o processo?"
        : "Sobre aposentadoria, posso te orientar melhor. Você já tentou solicitar o benefício ou ainda está planejando? O INSS negou algum pedido?";
      
      return {
        message: adaptPriorityResponse(adaptMessageByLeadTemperature(baseMessageAposentadoria, temperature, urgency), priority),
        actions: smartCTA,
        meta: { intent: "theme_aposentadoria", profile: "visitor", source: "fallback" }
      };
      
    case "desconto-indevido":
      const baseMessageDesconto = isFollowUp
        ? "Sobre desconto indevido, preciso saber: qual banco está fazendo o desconto? É empréstimo, tarifa ou outro tipo de cobrança?"
        : "Entendi sobre desconto indevido. Qual banco está fazendo essa cobrança? Você reconhece o valor ou parece ser algo que não contratou?";
      
      return {
        message: adaptPriorityResponse(adaptMessageByLeadTemperature(baseMessageDesconto, temperature, urgency), priority),
        actions: smartCTA,
        meta: { intent: "theme_desconto_indevido", profile: "visitor", source: "fallback" }
      };
      
    case "pensao":
      const baseMessagePensao = isFollowUp
        ? "Sobre pensão alimentícia, me diga: você precisa receber ou está sendo cobrado? Já tem acordo judicial?"
        : "Sobre pensão alimentícia, você precisa receber valores ou está sendo cobrado para pagar? Já existe algum processo ou acordo?";
      
      return {
        message: adaptPriorityResponse(adaptMessageByLeadTemperature(baseMessagePensao, temperature, urgency), priority),
        actions: smartCTA,
        meta: { intent: "theme_pensao", profile: "visitor", source: "fallback" }
      };
      
    case "divorcio":
      const baseMessageDivorcio = isFollowUp
        ? "Sobre divórcio, preciso entender: vocês estão de acordo sobre tudo ou tem disputas? Têm filhos menores?"
        : "Sobre divórcio, vocês estão se separando de acordo ou tem disputas? Têm filhos menores ou bens para dividir?";
      
      return {
        message: adaptPriorityResponse(adaptMessageByLeadTemperature(baseMessageDivorcio, temperature, urgency), priority),
        actions: smartCTA,
        meta: { intent: "theme_divorcio", profile: "visitor", source: "fallback" }
      };
      
    case "familia":
      const baseMessageFamilia = isFollowUp
        ? "Em direito de família, me diga mais: é sobre guarda de filhos, partilha de bens ou outra situação familiar?"
        : "Em questões de família, posso ajudar com guarda, pensão, divórcio ou partilha. Qual é a sua situação específica?";
      
      return {
        message: adaptPriorityResponse(adaptMessageByLeadTemperature(baseMessageFamilia, temperature, urgency), priority),
        actions: smartCTA,
        meta: { intent: "theme_familia", profile: "visitor", source: "fallback" }
      };
      
    case "trabalhista":
      const baseMessageTrabalhista = isFollowUp
        ? "Sobre questão trabalhista, preciso saber: você foi demitido? Tem verbas pendentes? Problema com contrato?"
        : "Sobre direito trabalhista, você foi demitido, tem verbas não recebidas ou outro problema no trabalho? Me conta o que aconteceu.";
      
      return {
        message: adaptPriorityResponse(adaptMessageByLeadTemperature(baseMessageTrabalhista, temperature, urgency), priority),
        actions: smartCTA,
        meta: { intent: "theme_trabalhista", profile: "visitor", source: "fallback" }
      };
      
    default:
      return null;
  }
}

function ensureVisitorTriage(sessionId: string): SessionContext["triage"] {
  const context = getSessionContext(sessionId);
  if (!context.triage) {
    context.triage = { active: true, step: "start", data: {} };
  }
  return context.triage;
}

function handleTriageFlow(sessionId: string, message: string, audience: string, urlContext?: URLContext): NoemiaResponse | null {
  if (audience !== "visitor") return null;

  const context = getSessionContext(sessionId);
  const triage = context.triage ?? {
    active: false,
    step: "start",
    data: {}
  };
  const normalizedMessage = normalizeText(message);
  const detectedTheme = detectLegalTheme(message) || urlContext?.tema || context.lastTheme || undefined;
  const detectedTime = extractRelativeTime(message);
  const detectedUrgency = inferUrgency(message);

  const shouldStart = triage.active || Boolean(urlContext?.tema) || looksLikeLegalHelpRequest(message);
  if (!shouldStart) {
    return null;
  }

  triage.active = true;

  if (!triage.data.theme && detectedTheme) {
    triage.data.theme = detectedTheme;
    triage.step = "problem";
  } else if (triage.step === "start") {
    triage.step = detectedTheme ? "problem" : "theme";
  }

  if (triage.step === "theme") {
    if (!triage.data.theme && detectedTheme) {
      triage.data.theme = detectedTheme;
      triage.step = "problem";
    } else if (triage.data.theme) {
      triage.step = "problem";
    } else if (context.history.filter((item) => item.role === "user").length <= 1) {
      return {
        message: "Oi! Vou entender melhor sua situação para te orientar com mais precisão. Seu caso é sobre aposentadoria, banco/desconto indevido, família, trabalhista ou outra situação?",
        actions: [
          { label: "Aposentadoria" },
          { label: "Banco / desconto" },
          { label: "Família" }
        ],
        meta: { intent: "triage_theme", profile: "visitor", source: "fallback" }
      };
    }
  }

  if (triage.step === "problem") {
    if (!triage.data.problem) {
      const shortAnswer = normalizedMessage.split(/\s+/).length <= 3;
      const seemsOnlyTheme = detectedTheme && shortAnswer;
      if (!seemsOnlyTheme) {
        triage.data.problem = message;
      }
    }

    if (!triage.data.problem) {
      return {
        message: triage.data.theme
          ? `Entendi. Seu caso é sobre ${triage.data.theme.replace(/-/g, " ")}. O que exatamente está acontecendo?`
          : "Entendi. O que exatamente está acontecendo no seu caso?",
        actions: [
          { label: "Falar no WhatsApp", href: "https://wa.me/5511999999999" }
        ],
        meta: { intent: "triage_problem", profile: "visitor", source: "fallback" }
      };
    }

    triage.step = detectedTime ? "urgency" : "time";
    if (detectedTime && !triage.data.time) triage.data.time = detectedTime;
  }

  if (triage.step === "time") {
    if (!triage.data.time && detectedTime) {
      triage.data.time = detectedTime;
      triage.step = detectedUrgency ? "done" : "urgency";
    } else if (!triage.data.time && context.history.filter((item) => item.role === "user").length >= 2) {
      triage.data.time = message;
      triage.step = detectedUrgency ? "done" : "urgency";
    }

    if (!triage.data.time) {
      return {
        message: "Entendi. Isso começou há quanto tempo?",
        actions: [],
        meta: { intent: "triage_time", profile: "visitor", source: "fallback" }
      };
    }
  }

  if (triage.step === "urgency") {
    if (!triage.data.urgency && detectedUrgency) {
      triage.data.urgency = detectedUrgency;
      triage.step = "done";
    } else if (!triage.data.urgency && context.history.filter((item) => item.role === "user").length >= 3) {
      triage.data.urgency = message;
      triage.step = "done";
    }

    if (!triage.data.urgency) {
      return {
        message: "Isso está te causando algum prejuízo ou dificuldade hoje?",
        actions: [],
        meta: { intent: "triage_urgency", profile: "visitor", source: "fallback" }
      };
    }
  }

  triage.step = "done";
  triage.active = false;

  const themeLabel = triage.data.theme ? triage.data.theme.replace(/-/g, " ") : "seu caso";
  const closing = triage.data.urgency && normalizeText(triage.data.urgency).includes("sim")
    ? `Pelo que você me explicou sobre ${themeLabel}, isso pode estar te trazendo impacto direto e merece uma análise mais cuidadosa.`
    : `Pelo que você me explicou sobre ${themeLabel}, pode existir um caminho importante, mas isso depende de uma análise mais individual.`;

  return {
    message: `${closing} O melhor próximo passo agora é organizar seu atendimento com a advogada para analisar os detalhes com segurança.`,
    actions: [
      { label: "Iniciar atendimento", href: "/triagem" },
      { label: "Agendar consulta", href: "/triagem.html?origem=noemia-consulta" },
      { label: "Falar no WhatsApp", href: "https://wa.me/5511999999999" }
    ],
    meta: { intent: "triage_done", profile: "visitor", source: "fallback" }
  };
}

function detectUserIntent(message: string): string {
  const normalizedMessage = normalizeText(message);
  const theme = detectLegalTheme(message);

  // Detectar solicitações de orientação jurídica mais amplas
  if (/(o que fazer|o que eu faco|tenho direito|posso processar|devo processar|orientacao juridica|analise de caso|estrategia juridica|justica|advogado|como funciona|qual o prazo|o que e|me ajuda|preciso de ajuda|duvida|problema|situacao|caso|resolver|entrar na justica)/.test(normalizedMessage)) {
    return "legal_advice_request";
  }

  if (theme) {
    return "legal_advice_request";
  }

  if (/(agenda|amanha|hoje|compromisso|reuniao|consulta|agendar)/.test(normalizedMessage)) {
    return "agenda";
  }

  if (/(cliente|clientes)/.test(normalizedMessage)) {
    return "clientes";
  }

  if (/(processo|casos|caso|andamento)/.test(normalizedMessage)) {
    return "processos";
  }

  if (/(documento|documentos|arquivo|anexo)/.test(normalizedMessage)) {
    return "documentos";
  }

  if (/(prioridade|prioridades|tarefa|tarefas|pendente)/.test(normalizedMessage)) {
    return "prioridades";
  }

  if (/(ola|olá|bom dia|boa tarde|boa noite|como vai|tudo bem)/.test(normalizedMessage)) {
    return "saudacao";
  }

  return "geral";
}

async function generateIntelligentResponse(intent: string, userMessage: string, profile: PortalProfile | null, audience: string, sessionId?: string, urlContext?: URLContext): Promise<NoemiaResponse> {
  try {
    const context = sessionId ? getSessionContext(sessionId) : { history: [] } as SessionContext;
    const isFollowUp = context.lastIntent === intent && context.history.length > 1;
    const detectedTheme = detectLegalTheme(userMessage) || urlContext?.tema || context.lastTheme || null;
    
    // Evitar repetição: detectar se usuário está repetindo mesma pergunta
    const lastUserMessage = context.history[context.history.length - 1]?.content || "";
    const isRepeating = normalizeText(lastUserMessage) === normalizeText(userMessage);
    if (isRepeating && intent === "geral") {
      return {
        message: "Vamos organizar melhor sua dúvida! Posso ajudar com agendamentos, processos, documentos ou orientar sobre próximos passos. O que você precisa especificamente?",
        actions: [
          { label: "Iniciar atendimento", href: "/triagem" },
          { label: "Ver serviços", href: "/services" }
        ],
        meta: { intent: "avoid_repetition", profile: audience, source: "fallback" }
      };
    }
    
    // BLOQUEIO DE CONSULTORIA GRATUITA - apenas para visitors
    if (intent === 'legal_advice_request' && audience === 'visitor') {
      // Usar resposta controlada com valor parcial
      const controlledResponse = generateControlledResponse(intent, detectedTheme || undefined, isFollowUp);
      return controlledResponse;
    }
    
    // Clientes nunca são bloqueados - sempre ajudam
    if (audience === 'client' && profile) {
      const workspace = await getClientWorkspace(profile);
      
      switch (intent) {
        case 'legal_advice_request':
          return {
            message: `Olá, ${profile.full_name}! Como cliente nosso, você tem direito a orientação completa. Para te ajudar melhor com sua situação específica, recomendo agendar uma consulta para analisarmos seu caso em detalhes. Você pode acessar seus documentos e processos pelo portal.`,
            actions: [
              { label: "Ver meu processo", href: "/cases" },
              { label: "Agendar consulta", href: "/consulta" },
              { label: "Falar com advogada", href: "/contact" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
        
        case 'agenda':
          const upcomingAppointments = workspace.appointments.filter(
            (apt: any) => new Date(apt.starts_at) >= new Date() && apt.status !== 'cancelled'
          ).length;
          const mainCase = workspace.cases[0];
          return {
            message: isFollowUp
              ? `Sua agenda: ${upcomingAppointments} consulta(s) próxima(s). Status: "${mainCase?.statusLabel || 'Em andamento'}".`
              : `Sobre sua agenda, organizei para você: • ${upcomingAppointments} consulta(s) próxima(s) • Status do seu caso: "${mainCase?.statusLabel || 'Em andamento'}" • ${workspace.documentRequests.filter((req: any) => req.status === 'pending').length} documento(s) pendente(s). Mantenha seus documentos em dia para agilizar tudo!`,
            actions: [
              { label: "Ver agenda completa", href: "/agenda" },
              { label: "Enviar documentos", href: "/documents/upload" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'processos':
          const caseInfo = workspace.cases[0];
          const caseArea = caseInfo?.area || 'Jurídica';
          return {
            message: isFollowUp
              ? `Seu processo está "${caseInfo?.statusLabel || 'Em andamento'}" na área ${caseArea}.`
              : `Sobre seu processo, ele está "${caseInfo?.statusLabel || 'Em andamento'}" na área ${caseArea}. ${workspace.documentRequests.length > 0 ? `Para continuar, aguardamos ${workspace.documentRequests.length} documento(s).` : 'Todos os documentos estão em ordem.'} Você pode enviar tudo pelo portal.`,
            actions: [
              { label: "Acompanhar processo", href: "/cases" },
              { label: "Enviar documentos", href: "/documents/upload" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'documentos':
          const receivedDocs = workspace.documents.filter((doc: any) => doc.status === 'recebido').length;
          const pendingDocs = workspace.documents.filter((doc: any) => doc.status === 'pendente').length;
          return {
            message: isFollowUp
              ? `Documentos: ${receivedDocs} recebidos, ${pendingDocs} pendentes.`
              : `Sobre seus documentos, você tem ${receivedDocs} recebido(s) e ${pendingDocs} pendente(s). ${pendingDocs > 0 ? 'Envie os pendentes pelo portal para agilizar seu processo.' : 'Ótimo! Seus documentos estão em dia.'}`,
            actions: [
              { label: "Ver meus documentos", href: "/documents" },
              { label: "Enviar novo documento", href: "/documents/upload" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'saudacao':
          // Se tiver tema, usar mensagem contextual
          if (urlContext?.tema) {
            return {
              message: getInitialMessage(urlContext.tema),
              actions: [
                { label: "Agendar consulta", href: "/triagem.html?origem=noemia-consulta" },
                { label: "Ver meus processos", href: "/cases" }
              ],
              meta: { intent, profile: audience, source: "fallback" }
            };
          }
          
          return {
            message: `Olá, ${profile.full_name}! Que bom ter você aqui. Sou a NoemIA e estou aqui para ajudar com sua jornada jurídica. Vejo que seu cadastro está "${workspace.clientRecord.status}" com ${workspace.cases.length} processo(s) em andamento. Como posso apoiar você hoje?`,
            actions: [
              { label: "Ver meu processo", href: "/cases" },
              { label: "Ver agenda", href: "/agenda" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        default:
          return {
            message: `Seu cadastro está "${workspace.clientRecord.status}" com ${workspace.cases.length} processo(s) em andamento. Para informações detalhadas, você pode acessar o portal ou posso ajudar com algo específico.`,
            actions: [
              { label: "Ver meu painel", href: "/dashboard" },
              { label: "Ver processos", href: "/cases" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
      }
    }
    
    // Staff - operação com dados reais do banco
    if (audience === 'staff' && profile) {
      const overview = await getStaffOverview();
      
      // Dados operacionais reais
      const criticalItems = overview.operationalCenter.queues.today.filter(item => item.severity === 'critical').slice(0, 3);
      const awaitingClientItems = overview.operationalCenter.queues.awaitingClient.slice(0, 3);
      const topCases = overview.latestCases.slice(0, 3);
      const pendingDocs = overview.latestDocumentRequests.filter(doc => doc.status === 'pending').slice(0, 3);
      const overdueDocs = overview.operationalCenter.summary.agedPendingDocumentsCount;
      
      switch (intent) {
        case 'legal_advice_request':
          return {
            message: `Vejo que você precisa de orientação jurídica. Tenho ${overview.latestCases.length} casos ativos no sistema. Os casos mais recentes são: ${topCases.map(c => c.title).slice(0, 2).join(' e ')}. Recomendo revisar o histórico completo do cliente antes de fornecer orientação.`,
            actions: [
              { label: "Ver casos recentes", href: "/internal/casos" },
              { label: "Ver detalhes dos casos", href: "/internal/casos?filter=recent" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'agenda':
          const todayItems = overview.operationalCenter.queues.today.slice(0, 5);
          const todaySummary = todayItems.length > 0 
            ? todayItems.map(item => `${item.kindLabel}: ${item.title}`).join('; ')
            : 'Nenhum item para hoje';
          
          return {
            message: isFollowUp 
              ? `Sua agenda operacional: ${overview.operationalCenter.summary.criticalCount} tarefas críticas e ${overview.operationalCenter.summary.todayCount} itens para hoje. Principais itens: ${todaySummary}`
              : `Sua agenda de hoje está organizada com ${overview.operationalCenter.summary.criticalCount} tarefas críticas e ${overview.operationalCenter.summary.todayCount} itens no total. Principais pendências: ${todaySummary}. ${overview.operationalCenter.summary.waitingClientCount > 0 ? `Além disso, ${overview.operationalCenter.summary.waitingClientCount} clientes estão aguardando seu retorno.` : ''}`,
            actions: [
              { label: "Ver painel operacional", href: "/internal" },
              { label: "Ver itens críticos", href: "/internal?filter=critical" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'clientes':
          const clientsAwaiting = awaitingClientItems.map(item => `${item.title} (${item.timingLabel})`).join('; ');
          const urgentClients = overview.latestClients.filter(c => c.statusLabel === 'Aguardando documentos').slice(0, 3);
          
          return {
            message: isFollowUp
              ? `Situação dos clientes: ${overview.operationalCenter.summary.waitingClientCount} aguardando documentos e ${overview.operationalCenter.summary.waitingTeamCount} com casos em andamento. Pendências principais: ${clientsAwaiting || 'Nenhuma pendência crítica'}`
              : `Tenho ${overview.latestClients.length} clientes no sistema. Destaque para: ${overview.operationalCenter.summary.waitingClientCount} aguardando documentos${overview.operationalCenter.summary.waitingTeamCount > 0 ? ` e ${overview.operationalCenter.summary.waitingTeamCount} com casos em andamento` : ''}. Pendências urgentes: ${clientsAwaiting || 'Nenhuma pendência crítica'}. ${urgentClients.length > 0 ? `Clientes precisando de atenção: ${urgentClients.map(c => c.fullName).join(', ')}.` : ''}`,
            actions: [
              { label: "Ver todos os clientes", href: "/internal/clientes" },
              { label: "Pendências documentais", href: "/internal/documentos" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'processos':
          const criticalCases = criticalItems.map(item => `${item.title} (${item.stateLabel})`).join('; ');
          const staleCasesInfo = overview.operationalCenter.summary.staleCasesCount;
          
          return {
            message: isFollowUp
              ? `Status dos processos: ${overview.latestCases.length} casos ativos, ${overview.operationalCenter.summary.criticalCount} críticos. ${staleCasesInfo > 0 ? `${staleCasesInfo} caso(s) sem atualização recente.` : 'Todos com atualizações recentes.'}`
              : `Tenho ${overview.latestCases.length} processos em andamento. Situação atual: ${overview.operationalCenter.summary.criticalCount} críticos e ${staleCasesInfo > 0 ? `${staleCasesInfo} caso(s) parado(s) há dias - precisa atenção` : 'todos com movimentação recente'}. Casos críticos: ${criticalCases || 'Nenhum caso crítico no momento'}. Próximos passos: atualizar status dos casos parados e contatar clientes com pendências.`,
            actions: [
              { label: "Ver casos críticos", href: "/internal/casos?filter=critical" },
              { label: "Atualizar andamento", href: "/internal/casos" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'documentos':
          const pendingDocsList = pendingDocs.map(doc => `${doc.title} (${doc.statusLabel})`).join('; ');
          
          return {
            message: isFollowUp
              ? `Documentos: ${overdueDocs > 0 ? `${overdueDocs} vencido(s) há mais de 7 dias` : 'Nenhum documento vencido'}. Pendências atuais: ${pendingDocsList || 'Nenhuma pendência'}`
              : `Situação documental: ${overview.latestDocumentRequests.length} solicitações, ${pendingDocs.length} pendentes${overdueDocs > 0 ? ` e ${overdueDocs} vencida(s) há mais de 7 dias` : ''}. Pendências principais: ${pendingDocsList || 'Nenhuma pendência crítica'}. Ação recomendada: contatar clientes sobre documentos pendentes para não travar os casos.`,
            actions: [
              { label: "Ver documentos pendentes", href: "/internal/documentos?filter=pending" },
              { label: "Solicitar documentos", href: "/internal/documentos/solicitar" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'prioridades':
          const prioritySummary = criticalItems.map(item => `${item.severity.toUpperCase()}: ${item.title} (${item.timingLabel})`).join('; ');
          const nextActions = [
            ...(criticalItems.length > 0 ? ['Resolver itens críticos'] : []),
            ...(overview.operationalCenter.summary.waitingClientCount > 0 ? ['Contatar clientes aguardando'] : []),
            ...(overdueDocs > 0 ? ['Regularizar documentos vencidos'] : []),
            'Atualizar andamento dos casos'
          ].slice(0, 4);
          
          return {
            message: isFollowUp
              ? `Prioridades atualizadas: ${overview.operationalCenter.summary.criticalCount} críticas, ${overview.operationalCenter.summary.todayCount} para hoje.`
              : `Organizei suas prioridades operacionais: ${overview.operationalCenter.summary.criticalCount} tarefas críticas precisam atenção imediata. Principais prioridades: ${prioritySummary || 'Nenhuma prioridade crítica'}. Próximas ações recomendadas: ${nextActions.join(', ')}.`,
            actions: [
              { label: "Ver painel de prioridades", href: "/internal" },
              { label: "Resolver críticas", href: "/internal?filter=critical" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'saudacao':
          const operationalSummary = [
            `${overview.operationalCenter.summary.criticalCount} tarefas críticas`,
            `${overview.operationalCenter.summary.todayCount} itens para hoje`,
            `${overview.latestCases.length} casos ativos`,
            `${overview.latestClients.length} clientes`
          ].join(', ');
          
          return {
            message: `Olá! Sou a NoemIA, sua assistente operacional. Tenho tudo organizado para você: ${operationalSummary}. ${criticalItems.length > 0 ? `As prioridades de hoje são: ${criticalItems.slice(0, 2).map(item => item.title).join(' e ')}.` : 'Nenhuma prioridade crítica no momento.'} Como posso otimizar sua rotina hoje?`,
            actions: [
              { label: "Ver dashboard completo", href: "/internal" },
              { label: "Ver prioridades do dia", href: "/internal?filter=today" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        default:
          return {
            message: `Sua operação está com ${overview.operationalCenter.summary.criticalCount} itens críticos, ${overview.operationalCenter.summary.todayCount} tarefas para hoje e ${overview.operationalCenter.summary.waitingClientCount} clientes aguardando. Posso ajudar com: agenda, clientes específicos, processos, documentos ou prioridades. O que precisa organizar?`,
            actions: [
              { label: "Ver dashboard operacional", href: "/internal" },
              { label: "Ver casos recentes", href: "/internal/casos" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
      }
    }
    
    // Visitor: respostas temáticas antes do fallback genérico
    if (audience === "visitor") {
      const themeResponse = buildVisitorThemeResponse(detectedTheme, isFollowUp, context);
      if (themeResponse) {
        return themeResponse;
      }
    }

    // Fallback para visitor ou quando não há dados
    const temperature = context?.lead?.temperature || "cold";
    const urgency = context?.lead?.urgency || "low";
    const smartCTA = buildSmartCTA(temperature, urgency);
    
    switch (intent) {
      case 'agenda':
        const baseMessageAgenda = isFollowUp
          ? 'Sobre agendamento, o primeiro passo é fazer sua triagem inicial.'
          : 'Entendi que você quer agendar algo. O primeiro passo é fazer sua triagem inicial para entendermos seu caso e depois a gente agenda sua consulta. É rápido e seguro!';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessageAgenda, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
        
      case 'clientes':
        const baseMessageClientes = isFollowUp
          ? 'Para informações sobre seus casos, faça login no portal.'
          : 'Sobre seus processos e documentos, o ideal é você acessar o portal do cliente. Lá você encontra tudo atualizado e pode enviar novos documentos quando precisar.';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessageClientes, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
      case 'processos':
        const baseMessageProcessos = isFollowUp
          ? 'Seus processos são acompanhados com dedicação. Acesse o portal para detalhes.'
          : 'Seus processos são acompanhados com toda dedicação pela nossa equipe. Para status detalhados e acompanhamento em tempo real, acesse o portal do cliente ou fale com nossa equipe.';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessageProcessos, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
        
      case 'documentos':
        const baseMessageDocumentos = isFollowUp
          ? 'Mantenha seus documentos organizados pelo portal.'
          : 'Documentos organizados fazem toda a diferença! Mantenha seus arquivos atualizados pelo portal - isso agiliza muito seu processo e evita solicitações adicionais.';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessageDocumentos, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
        
      case 'prioridades':
        const baseMessagePrioridades = isFollowUp
          ? 'Suas prioridades estão sendo organizadas pela equipe.'
          : 'Suas prioridades estão sendo organizadas com cuidado pela nossa equipe. Para acompanhar tudo, acesse regularmente o portal e mantenha seus documentos em dia.';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessagePrioridades, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
        
      case 'saudacao':
        const baseMessageSaudacao = isFollowUp
          ? 'Olá novamente! Estou aqui para ajudar. Quer conversar sobre seu caso ou precisa de algo específico?'
          : 'Olá! Sou a NoemIA, sua assistente jurídica. Posso te ajudar com casos de aposentadoria, descontos bancários, família, trabalhista ou agendar uma consulta. Como posso te ajudar hoje?';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessageSaudacao, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
        
      default:
        const baseMessageDefault = isFollowUp
          ? 'Vamos direto ao ponto! Posso te ajudar com: aposentadoria/INSS, descontos bancários, pensão alimentícia, divórcio, questões trabalhistas ou agendar consulta. Qual é o seu caso?'
          : 'Sou especialista em ajudar com casos jurídicos. Posso te orientar sobre: aposentadoria/INSS, descontos indevidos, pensão, divórcio, direito trabalhista ou agendar uma consulta. Me conte sua situação!';
        
        return {
          message: adaptMessageByLeadTemperature(baseMessageDefault, temperature, urgency),
          actions: smartCTA,
          meta: { intent, profile: audience, source: "fallback" }
        };
    }
  } catch (error) {
    console.warn('[noemia] Erro ao obter dados reais para fallback inteligente:', error);
    
    // Fallback simples sem dados - usando lead scoring
    const fallbackTemperature = sessionId ? getSessionContext(sessionId)?.lead?.temperature || "cold" : "cold";
    const fallbackUrgency = sessionId ? getSessionContext(sessionId)?.lead?.urgency || "low" : "low";
    const fallbackCTA = buildSmartCTA(fallbackTemperature, fallbackUrgency);
    
    const fallbackMessage = adaptMessageByLeadTemperature(
      'Estou aqui para ajudar com sua jornada jurídica. Para informações detalhadas, acesse o portal do cliente ou fale com nossa equipe.',
      fallbackTemperature,
      fallbackUrgency
    );
    
    return {
      message: fallbackMessage,
      actions: fallbackCTA,
      meta: { intent, profile: audience, source: "fallback" }
    };
  }
}

function getOpenAIFriendlyMessage(errorDetails: any): string {
  try {
    const errorObj = typeof errorDetails === 'string' ? JSON.parse(errorDetails) : errorDetails;
    const errorCode = errorObj?.error?.code;
    const errorMessage = errorObj?.error?.message || '';

    // Erros de quota/billing
    if (errorCode === 'insufficient_quota' || errorMessage.includes('quota') || errorMessage.includes('billing')) {
      return "A NoemIA está temporariamente indisponível para respostas inteligentes no momento. Tente novamente em instantes.";
    }

    // Erros de rate limit
    if (errorCode === 'rate_limit_exceeded' || errorMessage.includes('rate limit')) {
      return "A NoemIA está processando muitas solicitações agora. Aguarde alguns instantes e tente novamente.";
    }

    // Erros de API indisponível
    if (errorCode === 'api_error' || errorMessage.includes('unavailable') || errorMessage.includes('timeout')) {
      return "A NoemIA está temporariamente indisponível. Nossa equipe técnica foi acionada para normalizar o serviço.";
    }

    // Erros de modelo
    if (errorCode === 'model_not_found' || errorMessage.includes('model')) {
      return "A NoemIA está em atualização. Tente novamente em alguns instantes.";
    }

    // Erro de chave inválida
    if (errorCode === 'invalid_api_key' || errorMessage.includes('api key')) {
      return "A NoemIA está em modo de configuração. Tente novamente em instantes ou contate o suporte.";
    }

    // Erro genérico
    return "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes.";
  } catch {
    // Se não conseguir parsear o erro, retorna mensagem genérica
    return "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes.";
  }
}

function extractResponseText(payload: any) {
  // Para API chat/completions
  if (payload?.choices?.[0]?.message?.content) {
    return payload.choices[0].message.content.trim();
  }

  // Para API responses (legado)
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const contentParts =
    payload?.output?.flatMap((item: any) =>
      (item?.content || []).flatMap((content: any) => {
        if (typeof content?.text === "string") {
          return [content.text];
        }

        if (typeof content?.text?.value === "string") {
          return [content.text.value];
        }

        return [];
      })
    ) || [];

  return compactText(contentParts.join("\n\n"));
}

function buildPublicContext() {
  return [
    "Contexto institucional:",
    "- O escritorio atua com atendimento juridico organizado e portal seguro.",
    "- A jornada principal e: site institucional -> triagem -> analise interna -> cadastro interno -> convite -> portal do cliente.",
    "- Areas principais: Direito Previdenciario, Consumidor Bancario, Familia e Civil.",
    "- O portal do cliente concentra status do caso, documentos, agenda e atualizacoes.",
    "- O acesso ao portal nao e aberto publicamente; ele e liberado pela equipe depois do cadastro do atendimento.",
    "- Se a pergunta exigir analise do caso, oriente a pessoa a preencher a triagem inicial.",
    "- Nao invente prazos, promessas de resultado ou estrategia juridica personalizada sem contexto do escritorio."
  ].join("\n");
}

async function buildClientContext(profile: PortalProfile) {
  try {
    const workspace = await getClientWorkspace(profile);
    const mainCase = workspace.cases[0] || null;
    const openRequests = workspace.documentRequests.filter((item) => item.status === "pending");
    const upcomingAppointments = workspace.appointments
      .filter(
        (appointment) =>
          new Date(appointment.starts_at) >= new Date() &&
          appointment.status !== "cancelled" &&
          appointment.status !== "completed"
      )
      .slice(0, 4);
    const latestEvents = workspace.events.slice(0, 5);

    return [
      `Cliente autenticado: ${profile.full_name} (${profile.email}).`,
      `Status do cadastro: ${workspace.clientRecord.status}.`,
      mainCase
        ? `Caso principal: ${mainCase.title} | area: ${
            caseAreaLabels[mainCase.area as keyof typeof caseAreaLabels] || mainCase.area
          } | status: ${mainCase.statusLabel}.`
        : "Ainda nao ha caso principal visivel no portal.",
      `Documentos disponiveis: ${
        workspace.documents.filter((item) => item.status === "recebido" || item.status === "revisado")
          .length
      }.`,
      `Documentos pendentes: ${
        workspace.documents.filter((item) => item.status === "pendente" || item.status === "solicitado")
          .length
      }.`,
      `Solicitacoes documentais abertas: ${openRequests.length}.`,
      upcomingAppointments.length
        ? `Proximos compromissos: ${upcomingAppointments
            .map((item) => `${item.title} em ${item.starts_at} (${item.statusLabel})`)
            .join("; ")}.`
        : "Nao ha compromissos futuros visiveis no momento.",
      latestEvents.length
        ? `Ultimas atualizacoes visiveis: ${latestEvents
            .map((item) => `${item.title}: ${item.public_summary || item.eventLabel}`)
            .join("; ")}.`
        : "Ainda nao ha atualizacoes visiveis registradas no portal."
    ].join("\n");
  } catch (error) {
    console.warn("[NoemIA] Erro ao buscar contexto do cliente, usando fallback:", error);

    const { getClientWorkspace: getClientWorkspaceFallback } = await import("./dashboard-fallback");
    const workspace = await getClientWorkspaceFallback(profile);

    return [
      `Cliente autenticado: ${profile.full_name} (${profile.email}).`,
      `Status do cadastro: ${workspace.clientRecord.status}.`,
      `Caso principal: ${workspace.cases[0]?.title || "Ainda nao ha caso principal visivel no portal."}`,
      `Documentos disponiveis: ${workspace.documents.filter((d: any) => d.status === "recebido").length}.`,
      `Documentos pendentes: ${workspace.documents.filter((d: any) => d.status === "pendente").length}.`,
      `Solicitacoes documentais abertas: ${workspace.documentRequests.length}.`,
      `Proximos compromissos: ${workspace.appointments.length}.`,
      `Ultimas atualizacoes: ${workspace.events.length}.`
    ].join("\n");
  }
}

async function buildStaffContext(profile: PortalProfile) {
  try {
    const [overview, intelligence] = await Promise.all([
      getStaffOverview(),
      getBusinessIntelligenceOverview(30)
    ]);

    const topToday = overview.operationalCenter.queues.today.slice(0, 5);
    const topAwaitingClient = overview.operationalCenter.queues.awaitingClient.slice(0, 4);
    const topAwaitingTeam = overview.operationalCenter.queues.awaitingTeam.slice(0, 4);
    const recentCompleted = overview.operationalCenter.queues.recentlyCompleted.slice(0, 4);
    const caseHighlights = overview.latestCases.slice(0, 4);

    return [
      `Perfil interno autenticado: ${profile.full_name} (${profile.email}).`,
      `Resumo operacional atual: ${overview.operationalCenter.summary.criticalCount} item(ns) critico(s), ${overview.operationalCenter.summary.todayCount} para hoje, ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente, ${overview.operationalCenter.summary.waitingTeamCount} aguardando equipe.`,
      `Leitura de BI dos ultimos 30 dias: abandono de triagem ${formatRateValue(intelligence.summary.triageAbandonmentRate)}, triagem para cliente ${formatRateValue(intelligence.summary.triageToClientRate)}, ativacao no portal ${formatRateValue(intelligence.summary.portalActivationRate)}.`,
      `Sinais operacionais extras: ${overview.operationalCenter.summary.agedPendingDocumentsCount} pendencia(s) documental(is) envelhecida(s), ${overview.operationalCenter.summary.inviteStalledCount} convite(s) travado(s) e ${overview.operationalCenter.summary.staleCasesCount} caso(s) sem atualizacao recente.`,
      topToday.length
        ? `Fila fazer hoje: ${topToday
            .map((item) => `${item.kindLabel} ${item.title} (${item.timingLabel})`)
            .join("; ")}.`
        : "Fila fazer hoje sem itens abertos no momento.",
      topAwaitingClient.length
        ? `Fila aguardando cliente: ${topAwaitingClient
            .map((item) => `${item.title} (${item.timingLabel})`)
            .join("; ")}.`
        : "Nao ha fila aguardando cliente com destaque agora.",
      topAwaitingTeam.length
        ? `Fila aguardando equipe: ${topAwaitingTeam
            .map((item) => `${item.title} (${item.timingLabel})`)
            .join("; ")}.`
        : "Nao ha fila aguardando equipe com destaque agora.",
      caseHighlights.length
        ? `Casos recentes: ${caseHighlights
            .map(
              (item) =>
                `${item.title} | cliente ${item.clientName} | status ${item.statusLabel} | prioridade ${item.priorityLabel}`
            )
            .join("; ")}.`
        : "Nao ha casos recentes visiveis para resumir.",
      recentCompleted.length
        ? `Concluidos recentemente: ${recentCompleted
            .map((item) => `${item.kindLabel} ${item.title}`)
            .join("; ")}.`
        : "Nao ha itens concluidos recentemente em destaque."
    ].join("\n");
  } catch (error) {
    console.warn("[NoemIA] Erro ao buscar contexto do staff, usando fallback:", error);

    try {
      const [overview, intelligence] = await Promise.all([
        getStaffOverview(),
        getBusinessIntelligenceOverview(30)
      ]);

      return [
        `Perfil interno autenticado: ${profile.full_name} (${profile.email}).`,
        `Resumo operacional atual: ${overview.operationalCenter.summary.criticalCount} item(ns) critico(s), ${overview.operationalCenter.summary.todayCount} para hoje, ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente, ${overview.operationalCenter.summary.waitingTeamCount} aguardando equipe.`,
        `Leitura de BI dos ultimos 30 dias: abandono de triagem ${formatRateValue(intelligence.summary.triageAbandonmentRate)}, triagem para cliente ${formatRateValue(intelligence.summary.triageToClientRate)}, ativacao no portal ${formatRateValue(intelligence.summary.portalActivationRate)}.`,
        `Fila fazer hoje: ${overview.operationalCenter.queues.today
          .map((item) => `${item.kindLabel} ${item.title}`)
          .join("; ")}.`,
        `Casos recentes: ${overview.latestCases
          .map((item) => `${item.title} | ${item.clientName}`)
          .join("; ")}.`
      ].join("\n");
    } catch (fallbackError) {
      console.error("[NoemIA] Erro ate no fallback do staff:", fallbackError);
      return `Perfil interno autenticado: ${profile.full_name} (${profile.email}). Sistema operacional em modo limitado. Use o painel principal para operacao completa.`;
    }
  }
}

function buildSystemInstructions(mode: "visitor" | "client" | "staff", contextText: string) {
  return [
    "Voce e Noemia, assistente do portal juridico.",
    "Responda em portugues do Brasil, com tom claro, humano e objetivo.",
    "Nao invente fatos, prazos, movimentacoes, documentos ou acessos que nao estejam no contexto recebido.",
    "Explique o status e o funcionamento do portal com linguagem simples.",
    "Se a pergunta exigir analise juridica profunda, estrategia, probabilidade de ganho ou decisao tecnica do caso, reconheca o limite e oriente falar com a equipe responsavel.",
    mode === "staff"
      ? "Para a advogada, priorize utilidade operacional: resuma sinais, destaque urgencia, sugira proximo passo interno e, se pedido, rascunhe um texto-base curto para retorno ao cliente."
      : "",
    mode === "client"
      ? "Voce pode usar apenas o contexto do proprio cliente autenticado. Nunca fale de outros clientes."
      : mode === "staff"
        ? "Voce pode usar o contexto operacional interno do escritorio para ajudar na rotina da equipe, sem expor dados fora do que ja esta no contexto."
        : "Para visitantes, responda apenas sobre o fluxo de atendimento, triagem, portal e duvidas iniciais.",
    mode === "staff"
      ? "Quando a pergunta pedir priorizacao, organize a resposta em: o que tratar primeiro, por que isso importa e proximo passo sugerido."
      : "",
    mode === "staff"
      ? "Quando a pergunta pedir mensagem ao cliente, deixe claro que e um rascunho base e nao um envio automatico."
      : "",
    "Sempre que fizer sentido, indique o proximo passo mais pratico.",
    "",
    "Contexto disponivel:",
    contextText
  ]
    .filter(Boolean)
    .join("\n");
}

export async function answerNoemia(
  rawInput: unknown,
  profile: PortalProfile | null,
  sessionId?: string,
  urlContext?: URLContext
): Promise<NoemiaResponse> {
  const startTime = Date.now();
  let response: NoemiaResponse;

  const input = askNoemiaSchema.parse(rawInput);
  const requestedAudience = input.audience;
  const currentPath = ""; // TODO: Obter do request
  const parsedUrlContext = getContextFromURL(currentPath);

  let effectiveAudience: "visitor" | "client" | "staff" =
    requestedAudience === "staff" && profile && profile.role !== "cliente"
      ? "staff"
      : requestedAudience === "client" && profile?.role === "cliente"
        ? "client"
        : "visitor";

  if (requestedAudience === "client" && (!profile || profile.role !== "cliente")) {
    effectiveAudience = "visitor";
  }

  if (requestedAudience === "staff" && (!profile || profile.role === "cliente")) {
    effectiveAudience = "visitor";
  }

  const finalSessionId = input.sessionId || profile?.id || `visitor-${Buffer.from((currentPath || "site") + input.message).toString("base64").slice(0, 16)}`;
  const detectedTheme = detectLegalTheme(input.message) || (urlContext || parsedUrlContext).tema || null;
  const intent = detectUserIntent(input.message);

  updateSessionContext(finalSessionId, input.message, intent, effectiveAudience, detectedTheme);

  const triageResponse = handleTriageFlow(finalSessionId, input.message, effectiveAudience, urlContext || parsedUrlContext);
  if (triageResponse) {
    addAssistantMessageToSession(finalSessionId, triageResponse.message);
    recordNoemiaMetrics({
      question: input.message,
      intent: triageResponse.meta?.intent || intent,
      profile: effectiveAudience,
      source: "fallback",
      timestamp: new Date(),
      actions: triageResponse.actions || [],
      sessionId: finalSessionId,
      responseTime: Date.now() - startTime,
      tema: detectedTheme || undefined,
      origem: (urlContext || parsedUrlContext).origem
    });

    return {
      audience: effectiveAudience,
      answer: triageResponse.message,
      message: triageResponse.message
    };
  }

  const internalResponse = await generateIntelligentResponse(
    intent,
    input.message,
    profile,
    effectiveAudience,
    finalSessionId,
    urlContext || parsedUrlContext
  );

  addAssistantMessageToSession(finalSessionId, internalResponse.message);

  recordNoemiaMetrics({
    question: input.message,
    intent,
    profile: effectiveAudience,
    source: "fallback",
    timestamp: new Date(),
    actions: internalResponse.actions || [],
    sessionId: finalSessionId,
    responseTime: Date.now() - startTime,
    tema: detectedTheme || undefined,
    origem: (urlContext || parsedUrlContext).origem
  });

  // Log estruturado da resposta
  await logNoemia(
    "response_generated",
    profile?.id || "visitor",
    `Resposta gerada para ${effectiveAudience}: ${intent}`,
    {
      intent,
      audience: effectiveAudience,
      responseTime: Date.now() - startTime,
      messageLength: internalResponse.message.length,
      sessionId: finalSessionId,
      detectedTheme,
      urlContext: urlContext || parsedUrlContext
    }
  );

  return {
    audience: effectiveAudience,
    answer: internalResponse.message,
    message: internalResponse.message
  };
}

// Função para retornar todos os leads coletados pela NoemIA
export function getAllLeads() {
  const leads: Array<{
    sessionId: string;
    summary: any;
    lastMessage: string;
    priority: string;
    temperature: string;
    urgency: string;
    theme?: string;
    timestamp: Date;
  }> = [];

  // Percorrer todos os sessionContexts
  for (const [sessionId, context] of sessionContexts.entries()) {
    // Ignorar sessões sem leadSummary
    if (!context.leadSummary) {
      continue;
    }

    // Extrair timestamp da última interação
    const lastInteraction = context.history[context.history.length - 1];
    const timestamp = lastInteraction?.timestamp || new Date();

    // Montar objeto do lead
    const lead = {
      sessionId,
      summary: context.leadSummary,
      lastMessage: context.lastMessage || '',
      priority: context.leadSummary.priority || 'normal',
      temperature: context.lead?.temperature || 'cold',
      urgency: context.lead?.urgency || 'low',
      theme: context.leadSummary.theme || context.lastTheme || undefined,
      timestamp
    };

    leads.push(lead);
  }

  // Ordenar: priority high primeiro, depois por timestamp mais recente
  leads.sort((a, b) => {
    // Primeiro ordenar por priority (high antes de normal)
    if (a.priority === 'high' && b.priority !== 'high') {
      return -1;
    }
    if (a.priority !== 'high' && b.priority === 'high') {
      return 1;
    }
    
    // Depois ordenar por timestamp (mais recente primeiro)
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return leads;
}