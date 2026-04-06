// Sistema unificado para processamento de múltiplas plataformas (Instagram + WhatsApp)

export type Platform = 'instagram' | 'whatsapp';

export interface PlatformMessage {
  id: string;
  platform: Platform;
  platformUserId: string;
  platformMessageId: string;
  senderName?: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PlatformConfig {
  platform: Platform;
  verifyToken: string;
  appSecret: string;
  accessToken: string;
  webhookUrl: string;
}

export interface LeadRecord {
  platform: Platform;
  platform_user_id: string;
  username: string | null;
  legal_area: 'previdenciario' | 'bancario' | 'familia' | 'geral';
  lead_status: 'frio' | 'curioso' | 'interessado' | 'quente' | 'pronto_para_agendar' | 'cliente_ativo' | 'sem_aderencia';
  funnel_stage: 'contato_inicial' | 'qualificacao' | 'triagem' | 'interesse' | 'agendamento' | 'cliente';
  urgency: 'baixa' | 'media' | 'alta';
  last_message: string;
  last_response: string;
  wants_human: boolean;
  should_schedule: boolean;
  summary: string;
  suggested_action: string;
  first_contact_at: string;
  last_contact_at: string;
  conversation_count: number;
  metadata?: Record<string, any>;
}

export interface ConversationRecord {
  platform: Platform;
  platform_user_id: string;
  username: string | null;
  event_type: 'message' | 'comment' | 'postback';
  message_id: string;
  user_text: string;
  ai_response: string;
  legal_area: string;
  lead_status: string;
  funnel_stage: string;
  urgency: string;
  wants_human: boolean;
  should_schedule: boolean;
  metadata?: Record<string, any>;
}

// Configurações das plataformas
export const platformConfigs: Record<Platform, PlatformConfig> = {
  instagram: {
    platform: 'instagram',
    verifyToken: process.env.META_VERIFY_TOKEN || 'noeminha_verify_2026',
    appSecret: process.env.META_APP_SECRET || 'noeminha_app_secret_2026',
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    webhookUrl: '/api/meta/webhook'
  },
  whatsapp: {
    platform: 'whatsapp',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'noeminha_whatsapp_verify_2026',
    appSecret: process.env.WHATSAPP_APP_SECRET || 'noeminha_whatsapp_secret_2026',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookUrl: '/api/whatsapp/webhook'
  }
};

// Áreas jurídicas com palavras-chave
export const legalAreas = [
  {
    name: 'previdenciario' as const,
    keywords: [
      'aposentadoria', 'aposentar', 'aposentado', 'inss', 'previdência', 'benefício', 'beneficio',
      'auxílio', 'auxilio', 'loas', 'bpc', 'incapacidade', 'perícia', 'pericia', 'revisão', 'revisao'
    ],
    landingPath: '/direito-previdenciario.html',
    systemPrompt: 'Você é a NoemIA, assistente virtual da Advogada Noemia. Atue com foco em direito previdenciário. Responda de forma acolhedora, clara, elegante e estratégica. Explique de forma simples, sem prometer resultado, sem afirmar tese definitiva, e sempre convide a pessoa para uma análise individual com a advogada.'
  },
  {
    name: 'bancario' as const,
    keywords: [
      'banco', 'empréstimo', 'emprestimo', 'juros', 'consignado', 'cobrança', 'cobranca',
      'fraude', 'desconto indevido', 'cartão', 'cartao', 'tarifa', 'financiamento',
      'negativação', 'negativacao', 'nome sujo'
    ],
    landingPath: '/direito-consumidor-bancario.html',
    systemPrompt: 'Você é a NoemIA, assistente virtual da Advogada Noemia. Atue com foco em direito bancário e consumidor. Responda com clareza, firmeza e acessibilidade. Ajude a pessoa a entender o problema, mas sem prometer ganho de causa. Direcione para análise com a advogada.'
  },
  {
    name: 'familia' as const,
    keywords: [
      'divórcio', 'divorcio', 'pensão', 'pensao', 'guarda', 'filhos', 'separação', 'separacao',
      'casamento', 'união estável', 'uniao estavel', 'visitas', 'alimentos', 'inventário', 'inventario'
    ],
    landingPath: '/direito-familia.html',
    systemPrompt: 'Você é a NoemIA, assistente virtual da Advogada Noemia. Atue com foco em direito de família. Responda com empatia, organização e linguagem humana. Evite qualquer tom frio. Não prometa resultado. Direcione com delicadeza para análise com a advogada.'
  }
];

// Funções utilitárias compartilhadas
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function detectLegalArea(text: string) {
  const lower = normalizeText(text);

  for (const area of legalAreas) {
    if (area.keywords.some((keyword) => lower.includes(normalizeText(keyword)))) {
      return area;
    }
  }

  return {
    name: 'geral' as const,
    keywords: [],
    landingPath: '/',
    systemPrompt: 'Você é a NoemIA, assistente virtual da Advogada Noemia. Responda de forma geral, profissional, acolhedora e estratégica. Não prometa resultado. Direcione para análise individual com a advogada.'
  };
}

export function classifyLead(text: string, area: string) {
  const lower = normalizeText(text);

  const urgentKeywords = [
    'urgente', 'hoje', 'prazo', 'amanhã', 'amanha', 'bloquearam', 'cortaram',
    'suspenderam', 'cancelaram', 'audiência', 'audiencia', 'perdi', 'negaram',
    'negado', 'indevido', 'descontando'
  ];

  const humanKeywords = [
    'quero falar com a advogada', 'quero falar com alguém', 'quero atendimento',
    'quero contratar', 'quero entrar com processo', 'honorários', 'honorarios',
    'valor da consulta', 'preço', 'preco', 'quanto custa', 'posso agendar',
    'agendar', 'consulta', 'atendimento', 'whatsapp'
  ];

  const scheduleKeywords = [
    'agendar', 'consulta', 'atendimento', 'horário', 'horario', 'marcar',
    'agenda', 'posso ir', 'quero contratar', 'quanto custa', 'valor'
  ];

  const noFitKeywords = [
    'curso', 'vaga', 'parceria comercial', 'publicidade', 'trabalho', 'emprego'
  ];

  const urgency = urgentKeywords.some((k) => lower.includes(k)) ? 'alta' : 'media';
  const wantsHuman = humanKeywords.some((k) => lower.includes(k));
  const shouldSchedule = scheduleKeywords.some((k) => lower.includes(k));

  if (noFitKeywords.some((k) => lower.includes(k))) {
    return {
      legalArea: area as any,
      leadStatus: 'sem_aderencia' as any,
      funnelStage: 'contato_inicial' as any,
      urgency: 'baixa' as any,
      wantsHuman: false,
      shouldSchedule: false,
      summary: 'Contato sem aderência clara aos serviços jurídicos prioritários.',
      suggestedAction: 'Responder cordialmente e direcionar apenas se houver aderência.'
    };
  }

  if (wantsHuman || shouldSchedule) {
    return {
      legalArea: area as any,
      leadStatus: 'pronto_para_agendar' as any,
      funnelStage: 'agendamento' as any,
      urgency,
      wantsHuman: true,
      shouldSchedule: true,
      summary: 'Lead com intenção clara de atendimento ou contratação.',
      suggestedAction: 'Transferir para humano e oferecer agendamento imediato.'
    };
  }

  if (
    lower.includes('me ajuda') ||
    lower.includes('preciso de ajuda') ||
    lower.includes('o que faço') ||
    lower.includes('tenho um problema') ||
    lower.includes('estou com problema')
  ) {
    return {
      legalArea: area as any,
      leadStatus: 'quente' as any,
      funnelStage: 'triagem' as any,
      urgency,
      wantsHuman: urgency === 'alta',
      shouldSchedule: urgency === 'alta',
      summary: 'Lead com dor concreta e boa chance de avançar para triagem.',
      suggestedAction: 'Acolher, explicar e conduzir para análise individual.'
    };
  }

  if (
    lower.includes('quero saber') ||
    lower.includes('como funciona') ||
    lower.includes('tenho dúvida') ||
    lower.includes('tenho duvida') ||
    lower.includes('gostaria de saber')
  ) {
    return {
      legalArea: area as any,
      leadStatus: 'interessado' as any,
      funnelStage: 'qualificacao' as any,
      urgency: 'media' as any,
      wantsHuman: false,
      shouldSchedule: false,
      summary: 'Lead interessado, ainda em fase de entendimento.',
      suggestedAction: 'Responder com clareza e abrir caminho para triagem.'
    };
  }

  return {
    legalArea: area as any,
    leadStatus: 'curioso' as any,
    funnelStage: 'contato_inicial' as any,
    urgency: 'baixa' as any,
    wantsHuman: false,
    shouldSchedule: false,
    summary: 'Lead inicial com intenção ainda superficial.',
    suggestedAction: 'Responder de forma útil e convidar para aprofundar.'
  };
}

export function nowIso() {
  return new Date().toISOString();
}
