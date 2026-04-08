import "server-only";

import type { PortalProfile } from "../auth/guards";
import { askNoemiaSchema, caseAreaLabels } from "../domain/portal";
import { getServerEnv } from "../config/env";
import { getBusinessIntelligenceOverview } from "./intelligence";
import { getClientWorkspace, getStaffOverview } from "./dashboard";

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
function generateControlledResponse(intent: string, tema?: string, isFollowUp: boolean = false, message?: string): NoemiaResponse {
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
  
  // Personalizar resposta baseado na mensagem do usuário se disponível
  let personalizedMessage = '';
  if (message) {
    const normalizedUserMessage = message.toLowerCase();
    
    // Detectar palavras-chave específicas para personalizar
    if (normalizedUserMessage.includes('aposentar') || normalizedUserMessage.includes('aposentadoria')) {
      personalizedMessage = isFollowUp
        ? `Complementando o que expliquei sobre aposentadoria, é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`
        : `Entendi sua dúvida sobre aposentadoria. ${response.main} Em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`;
    } else if (normalizedUserMessage.includes('banco') || normalizedUserMessage.includes('desconto') || normalizedUserMessage.includes('cobrança')) {
      personalizedMessage = isFollowUp
        ? `Complementando o que expliquei sobre descontos bancários, é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`
        : `Entendi sua situação com o banco/desconto. ${response.main} Em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`;
    } else if (normalizedUserMessage.includes('pensão') || normalizedUserMessage.includes('alimentícia')) {
      personalizedMessage = isFollowUp
        ? `Complementando o que expliquei sobre pensão alimentícia, é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`
        : `Entendi sua questão sobre pensão alimentícia. ${response.main} Em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`;
    } else {
      // Resposta genérica mas personalizada
      personalizedMessage = isFollowUp
        ? `Complementando o que expliquei, em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`
        : `${response.main} Em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`;
    }
  } else {
    // Resposta padrão sem personalização
    personalizedMessage = isFollowUp
      ? `Complementando o que expliquei, em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`
      : `${response.main} Em situações como essa, normalmente é importante analisar ${response.factors.slice(0, 3).join(', ')} e ${response.factors[3] || 'outros detalhes específicos'}. Cada caso pode mudar bastante dependendo dos detalhes. Para te orientar com precisão e segurança, o ideal é analisar seu caso de forma individual na consulta com a advogada.`;
  }
  
  return {
    message: personalizedMessage,
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
  leadTemperature?: 'cold' | 'warm' | 'hot'; // Qualificação de lead
  urgencyLevel?: 'low' | 'medium' | 'high'; // Nível de urgência
  conversationStage?: 'initial' | 'exploring' | 'considering' | 'ready'; // Estágio da conversa
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
    timestamp: metrics.timestamp.toISOString(),
    tema: metrics.tema || null,
    origem: metrics.origem || null,
    leadTemperature: metrics.leadTemperature || null,
    urgencyLevel: metrics.urgencyLevel || null,
    conversationStage: metrics.conversationStage || null
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
type NoemiaAction = {
  label: string;
  href?: string;
  action?: string;
};

type NoemiaResponse = {
  message: string;
  actions?: NoemiaAction[];
  meta?: {
    intent: string;
    profile: string;
    source: "openai" | "fallback";
  };
};

// Contexto de URL para personalização
type URLContext = {
  tema?: string;
  origem?: string;
};

function getContextFromURL(url?: string): URLContext {
  if (!url) return {};
  
  try {
    const urlObj = new URL(url);
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
type SessionContext = {
  lastIntent?: string;
  lastMessage?: string;
  profile?: string;
  history: Array<{ role: string; content: string; timestamp: Date }>;
  lastTheme?: string;
  leadTemperature?: 'cold' | 'warm' | 'hot';
  urgencyLevel?: 'low' | 'medium' | 'high';
  conversationStage?: 'initial' | 'exploring' | 'considering' | 'ready';
  ctaOffered?: string;
  triage?: {
    active: boolean;
    step: "start" | "theme" | "problem" | "time" | "urgency" | "done";
    data: {
      theme?: string;
      problem?: string;
      time?: string;
      urgency?: string;
    };
  };
};

// Armazenamento simples em memória para contexto de sessão
const sessionContexts = new Map<string, SessionContext>();

function getSessionContext(sessionId: string): SessionContext {
  if (!sessionContexts.has(sessionId)) {
    sessionContexts.set(sessionId, {
      history: []
    });
  }
  return sessionContexts.get(sessionId)!;
}

function updateSessionContext(sessionId: string, message: string, intent: string, profile: string, theme?: string): void {
  const context = getSessionContext(sessionId);
  context.lastIntent = intent;
  context.lastMessage = message;
  context.profile = profile;
  
  // Detectar qualificação do lead
  context.lastTheme = theme;
  context.leadTemperature = detectLeadTemperature(message, intent, theme);
  context.urgencyLevel = detectUrgencyLevel(message);
  
  // Determinar estágio da conversa
  if (context.history.length === 0) {
    context.conversationStage = 'initial';
  } else if (context.history.length <= 2) {
    context.conversationStage = 'exploring';
  } else if (context.history.length <= 4) {
    context.conversationStage = 'considering';
  } else {
    context.conversationStage = 'ready';
  }
  
  context.history.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });
  
  // Manter apenas últimos 5 turnos
  if (context.history.length > 5) {
    context.history = context.history.slice(-5);
  }
}

// Detecção de temperatura do lead
function detectLeadTemperature(message: string, intent: string, theme?: string): 'cold' | 'warm' | 'hot' {
  const normalizedMessage = message.toLowerCase();
  
  // HOT - urgência, prejuízo, dor clara, repetição, pedido forte de ajuda
  if (normalizedMessage.includes('urgente') || normalizedMessage.includes('emergência') ||
      normalizedMessage.includes('desespero') || normalizedMessage.includes('socorro') ||
      normalizedMessage.includes('perdi tudo') || normalizedMessage.includes('prejuízo') ||
      normalizedMessage.includes('estou perdendo') || normalizedMessage.includes('não aguento mais') ||
      normalizedMessage.includes('preciso agora') || normalizedMessage.includes('já') ||
      normalizedMessage.includes('hoje') || normalizedMessage.includes('imediatamente') ||
      normalizedMessage.includes('estou sendo') || normalizedMessage.includes('ameaçado') ||
      normalizedMessage.includes('despejo') || normalizedMessage.includes('perdi o emprego') ||
      normalizedMessage.includes('doença grave') || normalizedMessage.includes('morte') ||
      normalizedMessage.includes('acidente grave') || normalizedMessage.includes('bancou') ||
      normalizedMessage.includes('descontou') || normalizedMessage.includes('cobrou') ||
      intent === 'legal_advice_request' && (
        normalizedMessage.includes('meu') || normalizedMessage.includes('minha') ||
        normalizedMessage.includes('estou') || normalizedMessage.includes('fui')
      )) {
    return 'hot';
  }
  
  // WARM - relato inicial de problema ou dúvida real
  if (normalizedMessage.includes('dúvida') || normalizedMessage.includes('duvida') ||
      normalizedMessage.includes('problema') || normalizedMessage.includes('situação') ||
      normalizedMessage.includes('como funciona') || normalizedMessage.includes('quero saber') ||
      normalizedMessage.includes('preciso de') || normalizedMessage.includes('gostaria de') ||
      normalizedMessage.includes('posso') || normalizedMessage.includes('tenho') ||
      normalizedMessage.includes('estou com') || normalizedMessage.includes('meu caso') ||
      intent === 'legal_advice_request' ||
      (theme && ['aposentadoria', 'desconto-indevido', 'pensao', 'divorcio', 'trabalhista', 'familia'].includes(theme))) {
    return 'warm';
  }
  
  // COLD - pergunta genérica ou institucional
  return 'cold';
}

// Detecção de nível de urgência
function detectUrgencyLevel(message: string): 'low' | 'medium' | 'high' {
  const normalizedMessage = message.toLowerCase();
  
  // HIGH - palavras de alta urgência
  if (normalizedMessage.includes('urgente') || normalizedMessage.includes('emergência') ||
      normalizedMessage.includes('imediatamente') || normalizedMessage.includes('agora') ||
      normalizedMessage.includes('hoje') || normalizedMessage.includes('já') ||
      normalizedMessage.includes('despejo') || normalizedMessage.includes('perdi') ||
      normalizedMessage.includes('doença') || normalizedMessage.includes('morte') ||
      normalizedMessage.includes('acidente') || normalizedMessage.includes('ameaçado')) {
    return 'high';
  }
  
  // MEDIUM - situações que precisam de atenção
  if (normalizedMessage.includes('preciso') || normalizedMessage.includes('não aguento') ||
      normalizedMessage.includes('desespero') || normalizedMessage.includes('socorro') ||
      normalizedMessage.includes('prejuízo') || normalizedMessage.includes('problema') ||
      normalizedMessage.includes('situação') || normalizedMessage.includes('ajuda')) {
    return 'medium';
  }
  
  // LOW - dúvidas gerais
  return 'low';
}

// Construção de CTAs inteligentes baseados na qualificação
function buildSmartActions(intent: string, audience: string, leadTemperature: 'cold' | 'warm' | 'hot', urgencyLevel: 'low' | 'medium' | 'high', theme?: string): NoemiaAction[] {
  const baseActions: NoemiaAction[] = [];
  
  // Lógica principal de qualificação
  if (audience === 'visitor') {
    if (leadTemperature === 'hot' || urgencyLevel === 'high') {
      // Lead quente ou urgente -> CTA direto para consulta
      baseActions.push(
        { label: "Agendar consulta urgente", href: "/triagem.html?origem=noemia-urgente" },
        { label: "Falar agora no WhatsApp", href: "https://wa.me/5511999999999" }
      );
    } else if (leadTemperature === 'warm' || urgencyLevel === 'medium') {
      // Lead morno -> CTA para iniciar atendimento
      baseActions.push(
        { label: "Iniciar atendimento", href: "/triagem.html?origem=noemia-atendimento" },
        { label: "Falar no WhatsApp", href: "https://wa.me/5511999999999" }
      );
    } else {
      // Lead frio -> CTA para conhecer serviços
      baseActions.push(
        { label: "Conhecer serviços", href: "/services" },
        { label: "Iniciar atendimento", href: "/triagem.html?origem=noemia-inicial" }
      );
    }
  } else if (audience === 'client') {
    // Clientes sempre têm acesso direto
    baseActions.push(
      { label: "Ver meu processo", href: "/cases" },
      { label: "Agendar consulta", href: "/consulta" }
    );
    if (leadTemperature === 'hot' || urgencyLevel === 'high') {
      baseActions.push({ label: "Falar com advogada", href: "/contact" });
    }
  } else if (audience === 'staff') {
    // Staff tem acesso operacional
    baseActions.push(
      { label: "Ver painel operacional", href: "/dashboard" },
      { label: "Ver prioridades", href: "/priorities" }
    );
  }
  
  return baseActions;
}

// Fluxo conversacional de triagem
function handleTriageFlow(context: SessionContext, message: string): NoemiaResponse | null {
  const triage = context.triage || { active: false, step: 'start', data: {} };
  const normalizedMessage = message.toLowerCase();
  
  // STEP: START - Iniciar triagem
  if (triage.step === 'start') {
    // Detectar se usuário quer iniciar triagem
    if (normalizedMessage.includes('triagem') || normalizedMessage.includes('iniciar') || 
        normalizedMessage.includes('começar') || normalizedMessage.includes('consulta') ||
        normalizedMessage.includes('atendimento') || normalizedMessage.includes('ajuda') ||
        normalizedMessage.includes('preciso') || normalizedMessage.includes('problema')) {
      
      // Iniciar triagem
      context.triage = { active: true, step: 'theme', data: {} };
      
      return {
        message: 'Ótimo! Vou fazer uma triagem rápida para entender seu caso. Primeiro: qual é o tema principal da sua situação?\n\nExemplos:\n• Aposentadoria ou INSS\n• Desconto indevido / bancário\n• Pensão alimentícia\n• Divórcio\n• Trabalhista\n• Outro tema',
        actions: [
          { label: 'Aposentadoria', action: 'theme_aposentadoria' },
          { label: 'Desconto bancário', action: 'theme_desconto' },
          { label: 'Pensão', action: 'theme_pensao' },
          { label: 'Divórcio', action: 'theme_divorcio' },
          { label: 'Trabalhista', action: 'theme_trabalhista' }
        ],
        meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
      };
    }
    
    return null; // Não está em triagem
  }
  
  // STEP: THEME - Identificar tema
  if (triage.step === 'theme') {
    let theme = '';
    
    // Detectar tema pela mensagem
    if (normalizedMessage.includes('aposentadoria') || normalizedMessage.includes('inss') || 
        normalizedMessage.includes('benefício') || normalizedMessage.includes('aposentar')) {
      theme = 'aposentadoria';
    } else if (normalizedMessage.includes('desconto') || normalizedMessage.includes('banco') || 
              normalizedMessage.includes('bancário') || normalizedMessage.includes('cobrança')) {
      theme = 'desconto-indevido';
    } else if (normalizedMessage.includes('pensão') || normalizedMessage.includes('alimentícia')) {
      theme = 'pensao';
    } else if (normalizedMessage.includes('divórcio') || normalizedMessage.includes('separação')) {
      theme = 'divorcio';
    } else if (normalizedMessage.includes('trabalhista') || normalizedMessage.includes('demissão') || 
              normalizedMessage.includes('trabalho')) {
      theme = 'trabalhista';
    } else if (normalizedMessage.includes('família') || normalizedMessage.includes('guarda')) {
      theme = 'familia';
    } else {
      theme = 'outro';
    }
    
    // Salvar tema e avançar
    context.triage = { 
      active: true,
      step: 'problem', 
      data: { ...triage.data, theme } 
    };
    
    return {
      message: `Entendi! Seu caso é sobre ${theme}. Agora, me descreva brevemente qual é o seu problema ou situação. O que aconteceu?`,
      actions: [],
      meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: PROBLEM - Descrição do problema
  if (triage.step === 'problem') {
    // Salvar descrição do problema
    context.triage = { 
      active: true,
      step: 'time', 
      data: { ...triage.data, problem: message } 
    };
    
    return {
      message: 'Obrigado pela descrição. Para entender melhor o tempo: quando essa situação começou ou há quanto tempo está acontecendo?',
      actions: [
        { label: 'Aconteceu agora', action: 'time_agora' },
        { label: 'Últimos dias', action: 'time_dias' },
        { label: 'Últimas semanas', action: 'time_semanas' },
        { label: 'Meses', action: 'time_meses' },
        { label: 'Anos', action: 'time_anos' }
      ],
      meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: TIME - Tempo do problema
  if (triage.step === 'time') {
    let time = '';
    
    // Detectar tempo pela mensagem
    if (normalizedMessage.includes('agora') || normalizedMessage.includes('hoje') || 
        normalizedMessage.includes('recentemente')) {
      time = 'agora';
    } else if (normalizedMessage.includes('dia') || normalizedMessage.includes('dias')) {
      time = 'dias';
    } else if (normalizedMessage.includes('semana') || normalizedMessage.includes('semanas')) {
      time = 'semanas';
    } else if (normalizedMessage.includes('mês') || normalizedMessage.includes('meses')) {
      time = 'meses';
    } else if (normalizedMessage.includes('ano') || normalizedMessage.includes('anos')) {
      time = 'anos';
    } else {
      time = message; // Usa a mensagem original se não detectar
    }
    
    // Salvar tempo e avançar
    context.triage = { 
      active: true,
      step: 'urgency', 
      data: { ...triage.data, time } 
    };
    
    return {
      message: 'Entendi. E qual é o nível de urgência dessa situação para você?',
      actions: [
        { label: 'Urgente - preciso resolver agora', action: 'urgency_urgente' },
        { label: 'Alta - preciso resolver rápido', action: 'urgency_alta' },
        { label: 'Média - posso esperar um pouco', action: 'urgency_media' },
        { label: 'Baixa - não tem pressa', action: 'urgency_baixa' }
      ],
      meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: URGENCY - Nível de urgência
  if (triage.step === 'urgency') {
    let urgencyLevel = '';
    
    // Detectar urgência pela mensagem
    if (normalizedMessage.includes('urgente') || normalizedMessage.includes('imediato') || 
        normalizedMessage.includes('agora')) {
      urgencyLevel = 'urgente';
    } else if (normalizedMessage.includes('alta') || normalizedMessage.includes('rápido')) {
      urgencyLevel = 'alta';
    } else if (normalizedMessage.includes('média') || normalizedMessage.includes('pouco')) {
      urgencyLevel = 'media';
    } else if (normalizedMessage.includes('baixa') || normalizedMessage.includes('pressa')) {
      urgencyLevel = 'baixa';
    } else {
      urgencyLevel = message; // Usa a mensagem original se não detectar
    }
    
    // Finalizar triagem
    context.triage = { 
      active: true,
      step: 'done', 
      data: { ...triage.data, urgency: urgencyLevel } 
    };
    
    // Gerar resumo e CTA
    const { theme, problem, time, urgency } = context.triage?.data || {};
    const summary = `**Resumo da sua triagem:**\n\n• **Tema:** ${theme}\n• **Problema:** ${problem}\n• **Tempo:** ${time}\n• **Urgência:** ${urgency}`;
    
    return {
      message: `${summary}\n\nPerfeito! Com essas informações já consigo te orientar melhor. Sua situação foi registrada e vou encaminhar para análise da nossa equipe.\n\n**Próximos passos:**\n1. Nossa equipe vai analisar seu caso\n2. Entraremos em contato em até 24h\n3. Se necessário, agendaremos uma consulta\n\nEnquanto isso, se precisar falar conosco imediatamente, pode usar o WhatsApp.`,
      actions: [
        { label: 'Falar no WhatsApp agora', href: 'https://wa.me/5511999999999' },
        { label: 'Ver nossos serviços', href: '/services' },
        { label: 'Fazer nova consulta', action: 'restart_triage' }
      ],
      meta: { intent: 'triage_done', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: DONE - Triagem finalizada
  if (triage.step === 'done') {
    // Permitir reiniciar triagem
    if (normalizedMessage.includes('nova') || normalizedMessage.includes('reiniciar') || 
        normalizedMessage.includes('outra') || normalizedMessage.includes('triagem')) {
      
      context.triage = { active: true, step: 'start', data: {} };
      
      return {
        message: 'Vamos começar uma nova triagem! Qual é o tema principal da sua situação?',
        actions: [
          { label: 'Aposentadoria', action: 'theme_aposentadoria' },
          { label: 'Desconto bancário', action: 'theme_desconto' },
          { label: 'Pensão', action: 'theme_pensao' },
          { label: 'Divórcio', action: 'theme_divorcio' },
          { label: 'Trabalhista', action: 'theme_trabalhista' }
        ],
        meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
      };
    }
    
    return {
      message: 'Sua triagem já foi concluída! Se precisar de algo novo, fale conosco pelo WhatsApp ou inicie uma nova triagem dizendo "nova triagem".',
      actions: [
        { label: 'Falar no WhatsApp', href: 'https://wa.me/5511999999999' },
        { label: 'Nova triagem', action: 'restart_triage' }
      ],
  return null;
}
function detectLegalTheme(message: string): string | null {
  const normalizedMessage = message.toLowerCase();
  
  // Temas sugeridos com palavras-chave específicas
  if (normalizedMessage.includes('aposentar') || normalizedMessage.includes('aposentadoria') || 
      normalizedMessage.includes('inss') || normalizedMessage.includes('benefício') ||
      normalizedMessage.includes('aposentar') || normalizedMessage.includes('previdenciário')) {
    return 'aposentadoria';
  }
  
  // Consultoria jurídica gratuita (BLOQUEAR)
  if (normalizedMessage.includes('posso me aposentar') || normalizedMessage.includes('posso aposentar') ||
      normalizedMessage.includes('banco cobrou') || normalizedMessage.includes('cobrança indevida') ||
      normalizedMessage.includes('não paga pensão') || normalizedMessage.includes('pensão atrasada') ||
      normalizedMessage.includes('demissão injusta') || normalizedMessage.includes('fui demitido') ||
      normalizedMessage.includes('herança') || normalizedMessage.includes('divórcio') ||
      normalizedMessage.includes('como processo') || normalizedMessage.includes('como entrar na justiça') ||
      normalizedMessage.includes('tenho direito') || normalizedMessage.includes('é crime') ||
      normalizedMessage.includes('posso processar') || normalizedMessage.includes('devo processar') ||
      normalizedMessage.includes('meu caso') || normalizedMessage.includes('minha situação') ||
      normalizedMessage.includes('orientação jurídica') || normalizedMessage.includes('opinião legal') ||
      normalizedMessage.includes('análise de caso') || normalizedMessage.includes('estratégia jurídica') ||
      normalizedMessage.includes('aconselha') || normalizedMessage.includes('me ajuda') ||
      normalizedMessage.includes('meu chefe') || normalizedMessage.includes('meu patrão') ||
      normalizedMessage.includes('empresa não') || normalizedMessage.includes('trabalhador') ||
      normalizedMessage.includes('funcionário') || normalizedMessage.includes('contrato') ||
      normalizedMessage.includes('acidente') || normalizedMessage.includes('perdas') ||
      normalizedMessage.includes('prejuízo') || normalizedMessage.includes('indenização') ||
      normalizedMessage.includes('reparação') || normalizedMessage.includes('dano moral') ||
      normalizedMessage.includes('multa') || normalizedMessage.includes('juros') ||
      normalizedMessage.includes('juros abusivos') || normalizedMessage.includes('cláusula') ||
      normalizedMessage.includes('advogado') || normalizedMessage.includes('justiça')) {
    return 'legal_advice_request';
  }
  
  // Agenda e compromissos
  if (normalizedMessage.includes('agenda') || normalizedMessage.includes('amanhã') || 
      normalizedMessage.includes('hoje') || normalizedMessage.includes('compromisso') ||
      normalizedMessage.includes('reunião') || normalizedMessage.includes('consulta')) {
    return 'agenda';
  }
  
  // Clientes
  if (normalizedMessage.includes('cliente') || normalizedMessage.includes('clientes')) {
    return 'clientes';
  }
  
  // Processos/Casos
  if (normalizedMessage.includes('processo') || normalizedMessage.includes('casos') || 
      normalizedMessage.includes('caso') || normalizedMessage.includes('andamento')) {
    return 'processos';
  }
  
  // Documentos
  if (normalizedMessage.includes('documento') || normalizedMessage.includes('documentos') ||
      normalizedMessage.includes('arquivo') || normalizedMessage.includes('anexo')) {
    return 'documentos';
  }
  
  // Prioridades e tarefas
  if (normalizedMessage.includes('prioridade') || normalizedMessage.includes('prioridades') ||
      normalizedMessage.includes('tarefa') || normalizedMessage.includes('tarefas') ||
      normalizedMessage.includes('fazer') || normalizedMessage.includes('pendente')) {
    return 'prioridades';
  }
  
  // Saudações e conversas gerais
  if (normalizedMessage.includes('olá') || normalizedMessage.includes('ola') || 
      normalizedMessage.includes('bom dia') || normalizedMessage.includes('boa tarde') ||
      normalizedMessage.includes('boa noite') || normalizedMessage.includes('como vai') ||
      normalizedMessage.includes('tudo bem')) {
    return 'saudacao';
  }
  
  return 'geral';
}

async function generateIntelligentResponse(intent: string, profile: PortalProfile | null, audience: string, sessionId?: string, urlContext?: URLContext, message?: string): Promise<NoemiaResponse> {
  try {
    const context = sessionId ? getSessionContext(sessionId) : { history: [] };
    const isFollowUp = context.lastIntent === intent && context.history.length > 1;
    
    // Obter qualificação do lead
    const leadTemperature = context.leadTemperature || 'cold';
    const urgencyLevel = context.urgencyLevel || 'low';
    const theme = context.lastTheme || urlContext?.tema;
    
    // BLOQUEIO DE CONSULTORIA GRATUITA - apenas para visitors
    if (intent === 'legal_advice_request' && audience === 'visitor') {
      // Usar resposta controlada com valor parcial e CTAs inteligentes
      const controlledResponse = generateControlledResponse(intent, urlContext?.tema, isFollowUp, message);
      // Substituir CTAs fixos por CTAs inteligentes
      const smartActions = buildSmartActions(intent, audience, leadTemperature, urgencyLevel, theme);
      controlledResponse.actions = smartActions;
      return controlledResponse;
    }
    
    // Clientes nunca são bloqueados - sempre ajudam
    if (audience === 'client' && profile) {
      const { getClientWorkspace } = await import("./dashboard");
// ... (rest of the code remains the same)
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
    
    // Staff - normal operation
    if (audience === 'staff' && profile) {
      const { getStaffOverview } = await import("./dashboard");
      const overview = await getStaffOverview();
      
      switch (intent) {
        case 'legal_advice_request':
          return {
            message: 'Detectei uma solicitação de orientação jurídica. Como staff, você pode acessar os casos e documentos para análise. Recomendo verificar o histórico do cliente e agendar uma consulta se necessário.',
            actions: [
              { label: "Ver casos recentes", href: "/cases" },
              { label: "Agendar consulta", href: "/consulta" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'agenda':
          return {
            message: isFollowUp 
              ? `Complementando sua agenda, você tem ${overview.operationalCenter.summary.criticalCount} tarefas críticas requiring atenção imediata e ${overview.operationalCenter.summary.todayCount} itens para hoje. Recomendo priorizar os documentos pendentes.`
              : `Entendi que você quer organizar sua agenda. Para hoje, você tem: • ${overview.operationalCenter.summary.criticalCount} tarefas críticas requiring atenção imediata • ${overview.operationalCenter.summary.todayCount} itens na fila do dia • ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente • ${overview.operationalCenter.summary.waitingTeamCount} aguardando equipe.`,
            actions: [
              { label: "Ver painel operacional", href: "/dashboard" },
              { label: "Checar prioridades", href: "/priorities" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'clientes':
          return {
            message: isFollowUp
              ? `Sobre seus clientes, ${overview.operationalCenter.summary.waitingClientCount} estão aguardando documentos e ${overview.operationalCenter.summary.waitingTeamCount} com casos em andamento.`
              : `Sobre seus clientes, atualmente ${overview.operationalCenter.summary.waitingClientCount} estão aguardando documentos e ${overview.operationalCenter.summary.waitingTeamCount} com casos em andamento. A prioridade é contatar os clientes com pendências documentais.`,
            actions: [
              { label: "Ver lista de clientes", href: "/clients" },
              { label: "Pendências documentais", href: "/documents/pending" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'processos':
          const criticalCount = overview.operationalCenter.summary.criticalCount;
          const staleCount = overview.operationalCenter.summary.staleCasesCount;
          return {
            message: isFollowUp
              ? `Seus processos: ${overview.operationalCenter.summary.todayCount} em andamento, ${criticalCount} críticos. ${staleCount > 0 ? `${staleCount} caso está aguardando há dias.` : 'Todos com atualizações recentes.'}`
              : `Sobre seus processos, você tem ${overview.operationalCenter.summary.todayCount} em andamento, sendo ${criticalCount} críticos. O foco hoje é análise de laudos médicos e atualização de status. ${staleCount > 0 ? `${staleCount} caso está aguardando há dias sem atualização - requer atenção prioritária.` : 'Todos os casos estão com atualizações recentes.'}`,
            actions: [
              { label: "Ver casos críticos", href: "/cases?filter=critical" },
              { label: "Atualizar status", href: "/cases/update" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'documentos':
          const agedDocs = overview.operationalCenter.summary.agedPendingDocumentsCount;
          return {
            message: isFollowUp
              ? `Documentos: ${agedDocs > 0 ? `${agedDocs} pendente há mais de 7 dias.` : 'Nenhum vencido.'}`
              : `Sobre documentos, ${agedDocs > 0 ? `${agedDocs} documento está pendente há mais de 7 dias.` : 'Nenhum documento vencido.'} Você tem 3 solicitações documentais abertas. Ação recomendada: contatar clientes sobre pendências.`,
            actions: [
              { label: "Ver documentos pendentes", href: "/documents/pending" },
              { label: "Solicitações abertas", href: "/document-requests" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'prioridades':
          return {
            message: isFollowUp
              ? `Suas prioridades: ${overview.operationalCenter.summary.criticalCount} críticas, ${overview.operationalCenter.summary.todayCount} para hoje.`
              : `Organizei suas prioridades: Críticas (${overview.operationalCenter.summary.criticalCount}) → Documentos vencidos, Hoje (${overview.operationalCenter.summary.todayCount}) → Análises pendentes, Aguardando cliente (${overview.operationalCenter.summary.waitingClientCount}) → Respostas necessárias. Foco: resolver críticas primeiro.`,
            actions: [
              { label: "Ver painel de prioridades", href: "/priorities" },
              { label: "Resolver críticas", href: "/tasks/critical" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        case 'saudacao':
          return {
            message: `Olá! Que bom ter você aqui. Sou a NoemIA, sua assistente inteligente para rotina jurídica. Vejo que você tem ${overview.operationalCenter.summary.criticalCount} tarefas críticas e ${overview.operationalCenter.summary.todayCount} itens para hoje. Como posso apoiar sua rotina?`,
            actions: [
              { label: "Ver agenda do dia", href: "/agenda" },
              { label: "Ver prioridades", href: "/priorities" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
          
        default:
          return {
            message: `Estou aqui para otimizar sua rotina. Você tem ${overview.operationalCenter.summary.criticalCount} itens críticos, ${overview.operationalCenter.summary.todayCount} para hoje e ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente. O que precisa organizar?`,
            actions: [
              { label: "Ver dashboard", href: "/dashboard" },
              { label: "Ver agenda", href: "/agenda" }
            ],
            meta: { intent, profile: audience, source: "fallback" }
          };
      }
    }
    
    // Fallback para visitor ou quando não há dados
    switch (intent) {
      case 'agenda':
        return {
          message: isFollowUp
            ? 'Sobre agendamento, o primeiro passo é fazer sua triagem inicial.'
            : 'Entendi que você quer agendar algo. O primeiro passo é fazer sua triagem inicial para entendermos seu caso e depois a gente agenda sua consulta. É rápido e seguro!',
          actions: [
            { label: "Iniciar atendimento", href: "/triagem" },
            { label: "Entrar no portal", href: "/login" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
        break;
      case 'clientes':
        return {
          message: isFollowUp
            ? 'Para informações sobre seus casos, faça login no portal.'
            : 'Sobre seus processos e documentos, o ideal é você acessar o portal do cliente. Lá você encontra tudo atualizado e pode enviar novos documentos quando precisar.',
          actions: [
            { label: "Entrar no portal", href: "/login" },
            { label: "Falar no WhatsApp", href: "/whatsapp" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
        break;
      case 'processos':
        return {
          message: isFollowUp
            ? 'Seus processos são acompanhados com dedicação. Acesse o portal para detalhes.'
            : 'Seus processos são acompanhados com toda dedicação pela nossa equipe. Para status detalhados e acompanhamento em tempo real, acesse o portal do cliente ou fale com nossa equipe.',
          actions: [
            { label: "Acessar portal", href: "/login" },
            { label: "Falar com equipe", href: "/contact" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
        break;
      case 'documentos':
        return {
          message: isFollowUp
            ? 'Mantenha seus documentos organizados pelo portal.'
            : 'Documentos organizados fazem toda a diferença! Mantenha seus arquivos atualizados pelo portal - isso agiliza muito seu processo e evita solicitações adicionais.',
          actions: [
            { label: "Enviar documentos", href: "/documents/upload" },
            { label: "Acessar portal", href: "/login" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
        break;
      case 'prioridades':
        return {
          message: isFollowUp
            ? 'Suas prioridades estão sendo organizadas pela equipe.'
            : 'Suas prioridades estão sendo organizadas com cuidado pela nossa equipe. Para acompanhar tudo, acesse regularmente o portal e mantenha seus documentos em dia.',
          actions: [
            { label: "Ver status", href: "/login" },
            { label: "Falar com equipe", href: "/contact" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
        break;
      case 'saudacao':
        return {
          message: 'Olá! Que bom ter você aqui. Sou a NoemIA, sua assistente inteligente para jornada jurídica. Posso ajudar com agendamentos, processos, documentos ou orientar sobre próximos passos. Como posso apoiar você hoje?',
          actions: [
            { label: "Iniciar atendimento", href: "/triagem" },
            { label: "Conhecer serviços", href: "/services" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
        break;
      default:
        return {
          message: 'Estou aqui para ajudar com sua jornada jurídica. Posso organizar informações sobre agendamentos, processos, documentos e prioridades. O que você precisa saber?',
          actions: [
            { label: "Iniciar atendimento", href: "/triagem" },
            { label: "Ver serviços", href: "/services" }
          ],
          meta: { intent, profile: audience, source: "fallback" }
        };
    }
  } catch (error) {
    console.warn('[noemia] Erro ao obter dados reais para fallback inteligente:', error);
    
    // Fallback simples sem dados
    return {
      message: 'Estou aqui para ajudar com sua jornada jurídica. Para informações detalhadas, acesse o portal do cliente ou fale com nossa equipe.',
      actions: [
        { label: "Acessar portal", href: "/login" },
        { label: "Falar com equipe", href: "/contact" }
      ],
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
      const { getStaffOverview: getStaffOverviewFallback } = await import("./dashboard-fallback");
      const { getBusinessIntelligenceOverview: getBusinessIntelligenceOverviewFallback } =
        await import("./intelligence-fallback");

      const [overview, intelligence] = await Promise.all([
        getStaffOverviewFallback(),
        getBusinessIntelligenceOverviewFallback(30)
      ]);

      return [
        `Perfil interno autenticado: ${profile.full_name} (${profile.email}).`,
        `Resumo operacional atual: ${overview.operationalCenter.summary.criticalCount} item(ns) critico(s), ${overview.operationalCenter.summary.todayCount} para hoje, ${overview.operationalCenter.summary.waitingClientCount} aguardando cliente, ${overview.operationalCenter.summary.waitingTeamCount} aguardando equipe.`,
        `Leitura de BI dos ultimos 30 dias: abandono de triagem ${formatRateValue(intelligence.summary.triageAbandonmentRate)}, triagem para cliente ${formatRateValue(intelligence.summary.triageToClientRate)}, ativacao no portal ${formatRateValue(intelligence.summary.portalActivationRate)}.`,
        `Fila fazer hoje: ${overview.operationalCenter.queues.today
          .map((item) => `${item.kindLabel} ${item.title}`)
          .join("; ")}.`,
        `Casos recentes: ${overview.operationalCenter.latestCases
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

export async function answerNoemia(rawInput: unknown, profile: PortalProfile | null, currentPath?: string) {
  const startTime = Date.now();
  const env = getServerEnv();
  const input = askNoemiaSchema.parse(rawInput);
  const requestedAudience = input.audience;
  
  // Extrair contexto da URL
  const urlContext = getContextFromURL(currentPath);
  
  // Gerar ID de sessão simples (em produção usar algo mais robusto)
  const sessionId = profile?.id || 'visitor-' + Math.random().toString(36).substr(2, 9);

  let effectiveAudience =
    requestedAudience === "staff" && profile && profile.role !== "cliente"
      ? "staff"
      : requestedAudience === "client" && profile?.role === "cliente"
        ? "client"
        : "visitor";

  if (requestedAudience === "client" && (!profile || profile.role !== "cliente")) {
    console.log("[noemia] Cliente nao autenticado, usando audience visitor");
    effectiveAudience = "visitor";
  }

  if (requestedAudience === "staff" && (!profile || profile.role === "cliente")) {
    console.log("[noemia] Staff nao autenticado, usando audience visitor");
    effectiveAudience = "visitor";
  }

  // Detectar intenção e atualizar contexto
  const intent = detectUserIntent(input.message);
  updateSessionContext(sessionId, input.message, intent, effectiveAudience, urlContext.tema);

  // Obter contexto da sessão para uso posterior
  const sessionContext = getSessionContext(sessionId);

  // TRIAGEM CONVERSACIONAL - apenas para visitors
  if (effectiveAudience === 'visitor') {
    // Função simples de detecção de tema
    const detectTheme = (msg: string): string | null => {
      const normalized = msg.toLowerCase();
      if (normalized.includes('aposentar') || normalized.includes('aposentadoria') || normalized.includes('inss')) return 'aposentadoria';
      if (normalized.includes('desconto') || normalized.includes('banco') || normalized.includes('cobrança')) return 'desconto-indevido';
      if (normalized.includes('pensão') || normalized.includes('alimentícia')) return 'pensao';
      if (normalized.includes('divórcio') || normalized.includes('separação')) return 'divorcio';
      if (normalized.includes('trabalhista') || normalized.includes('demissão') || normalized.includes('trabalho')) return 'trabalhista';
      if (normalized.includes('família') || normalized.includes('guarda')) return 'familia';
      return null;
    };

    // Iniciar triagem se for visitor e tiver problema jurídico
    if (!sessionContext.triage || sessionContext.triage.step === 'start') {
      const hasLegalIssue = detectTheme(input.message) !== null || 
                           input.message.toLowerCase().includes('ajuda') ||
                           input.message.toLowerCase().includes('problema') ||
                           input.message.toLowerCase().includes('consulta') ||
                           urlContext.tema;

      if (hasLegalIssue) {
        console.log("[noemia] Iniciando triagem conversacional");
        
        // Iniciar triagem
        sessionContext.triage = { active: true, step: 'theme', data: {} };
        
        const detectedTheme = urlContext.tema || detectTheme(input.message);
        
        // Se já detectou tema, pular para problem
        if (detectedTheme) {
          sessionContext.triage = { 
            active: true,
            step: 'problem', 
            data: { theme: detectedTheme } 
          };
          
          const triageResponse = {
            message: `Entendi! Seu caso é sobre ${detectedTheme}. Agora, me descreva brevemente qual é o seu problema ou situação. O que aconteceu?`,
            actions: [],
            meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
          };
          
          // Salvar no histórico
          sessionContext.history.push({
            role: "assistant",
            content: triageResponse.message,
            timestamp: new Date()
          });
          
          return {
            audience: effectiveAudience,
            answer: triageResponse.message
          };
        }
        
        // Pedir para escolher tema
        const triageResponse = {
          message: 'Ótimo! Vou fazer uma triagem rápida para entender seu caso. Primeiro: qual é o tema principal da sua situação?\n\nExemplos:\n• Aposentadoria ou INSS\n• Desconto indevido / bancário\n• Pensão alimentícia\n• Divórcio\n• Trabalhista\n• Outro tema',
          actions: [
            { label: 'Aposentadoria', action: 'theme_aposentadoria' },
            { label: 'Desconto bancário', action: 'theme_desconto' },
            { label: 'Pensão', action: 'theme_pensao' },
            { label: 'Divórcio', action: 'theme_divorcio' },
            { label: 'Trabalhista', action: 'theme_trabalhista' }
          ],
          meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
        };
        
        // Salvar no histórico
        sessionContext.history.push({
          role: "assistant",
          content: triageResponse.message,
          timestamp: new Date()
        });
        
        return {
          audience: effectiveAudience,
          answer: triageResponse.message
        };
      }
    }
    
    // Continuar triagem se já estiver ativa
    if (sessionContext.triage && sessionContext.triage.step !== 'done') {
      console.log("[noemia] Continuando triagem conversacional");
      
      if (sessionContext.triage.step === 'theme') {
        const theme = detectTheme(input.message) || 'outro';
        
        sessionContext.triage = { 
          active: true,
          step: 'problem', 
          data: { ...sessionContext.triage.data, theme } 
        };
        
        const triageResponse = {
          message: `Entendi! Seu caso é sobre ${theme}. Agora, me descreva brevemente qual é o seu problema ou situação. O que aconteceu?`,
          actions: [],
          meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
        };
        
        sessionContext.history.push({
          role: "assistant",
          content: triageResponse.message,
          timestamp: new Date()
        });
        
        return {
          audience: effectiveAudience,
          answer: triageResponse.message
        };
      }
      
      if (sessionContext.triage.step === 'problem') {
        sessionContext.triage = { 
          active: true,
          step: 'time', 
          data: { ...sessionContext.triage.data, problem: input.message } 
        };
        
        const triageResponse = {
          message: 'Obrigado pela descrição. Para entender melhor o tempo: quando essa situação começou ou há quanto tempo está acontecendo?',
          actions: [
            { label: 'Aconteceu agora', action: 'time_agora' },
            { label: 'Últimos dias', action: 'time_dias' },
            { label: 'Últimas semanas', action: 'time_semanas' },
            { label: 'Meses', action: 'time_meses' },
            { label: 'Anos', action: 'time_anos' }
          ],
          meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
        };
        
        sessionContext.history.push({
          role: "assistant",
          content: triageResponse.message,
          timestamp: new Date()
        });
        
        return {
          audience: effectiveAudience,
          answer: triageResponse.message
        };
      }
      
      if (sessionContext.triage.step === 'time') {
        const normalizedMessage = input.message.toLowerCase();
        let time = 'desconhecido';
        
        if (normalizedMessage.includes('agora') || normalizedMessage.includes('hoje')) time = 'agora';
        else if (normalizedMessage.includes('dia') || normalizedMessage.includes('dias')) time = 'dias';
        else if (normalizedMessage.includes('semana') || normalizedMessage.includes('semanas')) time = 'semanas';
        else if (normalizedMessage.includes('mês') || normalizedMessage.includes('meses')) time = 'meses';
        else if (normalizedMessage.includes('ano') || normalizedMessage.includes('anos')) time = 'anos';
        
        sessionContext.triage = { 
          active: true,
          step: 'urgency', 
          data: { ...sessionContext.triage.data, time } 
        };
        
        const triageResponse = {
          message: 'Entendi. E qual é o nível de urgência dessa situação para você?',
          actions: [
            { label: 'Urgente - preciso resolver agora', action: 'urgency_urgente' },
            { label: 'Alta - preciso resolver rápido', action: 'urgency_alta' },
            { label: 'Média - posso esperar um pouco', action: 'urgency_media' },
            { label: 'Baixa - não tem pressa', action: 'urgency_baixa' }
          ],
          meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
        };
        
        sessionContext.history.push({
          role: "assistant",
          content: triageResponse.message,
          timestamp: new Date()
        });
        
        return {
          audience: effectiveAudience,
          answer: triageResponse.message
        };
      }
      
      if (sessionContext.triage.step === 'urgency') {
        const normalizedMessage = input.message.toLowerCase();
        let urgency = 'desconhecida';
        
        if (normalizedMessage.includes('urgente') || normalizedMessage.includes('imediato')) urgency = 'urgente';
        else if (normalizedMessage.includes('alta') || normalizedMessage.includes('rápido')) urgency = 'alta';
        else if (normalizedMessage.includes('média') || normalizedMessage.includes('pouco')) urgency = 'média';
        else if (normalizedMessage.includes('baixa') || normalizedMessage.includes('pressa')) urgency = 'baixa';
        
        // Finalizar triagem
        sessionContext.triage = { 
          active: true,
          step: 'done', 
          data: { ...sessionContext.triage.data, urgency } 
        };
        
        const { theme, problem, time } = sessionContext.triage.data;
        const summary = `**Resumo da sua triagem:**\n\n• **Tema:** ${theme}\n• **Problema:** ${problem}\n• **Tempo:** ${time}\n• **Urgência:** ${urgency}`;
        
        const triageResponse = {
          message: `${summary}\n\nPerfeito! Com essas informações já consigo te orientar melhor. Sua situação foi registrada e vou encaminhar para análise da nossa equipe.\n\n**Próximos passos:**\n1. Nossa equipe vai analisar seu caso\n2. Entraremos em contato em até 24h\n3. Se necessário, agendaremos uma consulta\n\nEnquanto isso, se precisar falar conosco imediatamente, pode usar o WhatsApp.`,
          actions: [
            { label: 'Falar no WhatsApp agora', href: 'https://wa.me/5511999999999' },
            { label: 'Ver nossos serviços', href: '/services' },
            { label: 'Fazer nova consulta', action: 'restart_triage' }
          ],
          meta: { intent: 'triage_done', profile: 'visitor', source: 'fallback' }
        };
        
        sessionContext.history.push({
          role: "assistant",
          content: triageResponse.message,
          timestamp: new Date()
        });
        
        return {
          audience: effectiveAudience,
          answer: triageResponse.message
        };
      }
    }
    
    // Triagem finalizada - permitir reiniciar
    if (sessionContext.triage && sessionContext.triage.step === 'done') {
      const normalizedMessage = input.message.toLowerCase();
      
      if (normalizedMessage.includes('nova') || normalizedMessage.includes('reiniciar') || 
          normalizedMessage.includes('outra') || normalizedMessage.includes('triagem')) {
        
        sessionContext.triage = { active: true, step: 'start', data: {} };
        
        const triageResponse = {
          message: 'Vamos começar uma nova triagem! Qual é o tema principal da sua situação?',
          actions: [
            { label: 'Aposentadoria', action: 'theme_aposentadoria' },
            { label: 'Desconto bancário', action: 'theme_desconto' },
            { label: 'Pensão', action: 'theme_pensao' },
            { label: 'Divórcio', action: 'theme_divorcio' },
            { label: 'Trabalhista', action: 'theme_trabalhista' }
          ],
          meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
        };
        
        sessionContext.history.push({
          role: "assistant",
          content: triageResponse.message,
          timestamp: new Date()
        });
        
        return {
          audience: effectiveAudience,
          answer: triageResponse.message
        };
      }
      
      const triageResponse = {
        message: 'Sua triagem já foi concluída! Se precisar de algo novo, fale conosco pelo WhatsApp ou inicie uma nova triagem dizendo "nova triagem".',
        actions: [
          { label: 'Falar no WhatsApp', href: 'https://wa.me/5511999999999' },
          { label: 'Nova triagem', action: 'restart_triage' }
        ],
        meta: { intent: 'triage_done', profile: 'visitor', source: 'fallback' }
      };
      
      sessionContext.history.push({
        role: "assistant",
        content: triageResponse.message,
        timestamp: new Date()
      });
      
      return {
        audience: effectiveAudience,
        answer: triageResponse.message
      };
    }
  }

  // MOTOR INTERNO PRINCIPAL - Sem dependência de OpenAI
  console.log("[noemia] Usando motor interno para resposta inteligente");

  // ... (rest of the code remains the same)

  // Salvar resposta da NoemIA no histórico da sessão
  sessionContext.history.push({
    role: "assistant",
    content: internalResponse.message,
    timestamp: new Date()
  });

  // Manter apenas últimos 5 turnos
  if (sessionContext.history.length > 10) {
    sessionContext.history = sessionContext.history.slice(-10);
  }

  // Registrar métricas do motor interno
  recordNoemiaMetrics({
    question: input.message,
    intent,
    profile: effectiveAudience,
    source: "fallback",
    timestamp: new Date(),
    actions: internalResponse.actions || [],
    sessionId,
    responseTime: Date.now() - startTime,
    tema: urlContext.tema,
    origem: urlContext.origem,
    leadTemperature: sessionContext.leadTemperature,
    urgencyLevel: sessionContext.urgencyLevel,
    conversationStage: sessionContext.conversationStage
  });

  return {
    audience: effectiveAudience,
    answer: internalResponse.message
  };
}

export { getContextFromURL };