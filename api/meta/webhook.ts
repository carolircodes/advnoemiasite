import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import OpenAI from 'openai';

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'noeminha_verify_2026';
const APP_SECRET = process.env.META_APP_SECRET || '';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://advnoemia.com.br';
const WHATSAPP_URL = process.env.NOEMIA_WHATSAPP_URL || 'https://wa.me/5511999999999';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ENABLE_COMMENT_AUTOREPLY = process.env.ENABLE_COMMENT_AUTOREPLY === 'true';
const ENABLE_SIGNATURE_VALIDATION = process.env.ENABLE_SIGNATURE_VALIDATION !== 'false';

const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

type LeadStatus =
  | 'frio'
  | 'curioso'
  | 'interessado'
  | 'quente'
  | 'pronto_para_agendar'
  | 'cliente_ativo'
  | 'sem_aderencia';

type FunnelStage =
  | 'contato_inicial'
  | 'qualificacao'
  | 'triagem'
  | 'interesse'
  | 'agendamento'
  | 'cliente';

type LegalAreaName = 'previdenciario' | 'bancario' | 'familia' | 'geral';

interface LegalArea {
  name: LegalAreaName;
  keywords: string[];
  landingPath: string;
  systemPrompt: string;
}

interface MetaMessage {
  mid?: string;
  text?: string;
}

interface MetaMessaging {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: MetaMessage;
  postback?: {
    payload?: string;
    title?: string;
  };
}

interface MetaChangeValue {
  from?: { id?: string; username?: string };
  media?: { id?: string };
  text?: string;
  message?: string;
  id?: string;
  created_time?: number;
}

interface MetaEntry {
  id?: string;
  time?: number;
  messaging?: MetaMessaging[];
  changes?: Array<{
    field?: string;
    value?: MetaChangeValue;
  }>;
}

interface MetaWebhookBody {
  object?: string;
  entry?: MetaEntry[];
}

interface ProcessedEvent {
  type: 'message' | 'comment' | 'postback';
  sender: string;
  recipient: string;
  timestamp: number;
  text: string;
  messageId: string;
  senderName: string;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LeadAnalysis {
  legalArea: LegalAreaName;
  leadStatus: LeadStatus;
  funnelStage: FunnelStage;
  urgency: 'baixa' | 'media' | 'alta';
  wantsHuman: boolean;
  shouldSchedule: boolean;
  summary: string;
  suggestedAction: string;
}

interface LeadRecord {
  platform: 'instagram';
  platform_user_id: string;
  username: string | null;
  legal_area: LegalAreaName;
  lead_status: LeadStatus;
  funnel_stage: FunnelStage;
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
  metadata?: Record<string, Json>;
}

interface ConversationLogRecord {
  platform: 'instagram';
  platform_user_id: string;
  username: string | null;
  event_type: 'message' | 'comment' | 'postback';
  message_id: string;
  user_text: string;
  ai_response: string;
  legal_area: LegalAreaName;
  lead_status: LeadStatus;
  funnel_stage: FunnelStage;
  urgency: 'baixa' | 'media' | 'alta';
  wants_human: boolean;
  should_schedule: boolean;
  metadata?: Record<string, Json>;
}

const legalAreas: LegalArea[] = [
  {
    name: 'previdenciario',
    keywords: [
      'aposentadoria',
      'inss',
      'benefício',
      'beneficio',
      'auxílio',
      'auxilio',
      'loas',
      'bpc',
      'aposentar',
      'aposentado',
      'previdência',
      'previdencia',
      'incapacidade',
      'perícia',
      'pericia',
      'revisão',
      'revisao',
    ],
    landingPath: '/direito-previdenciario.html',
    systemPrompt:
      'Você é a NoemIA, assistente virtual da Advogada Noemia. Atue com foco em direito previdenciário. Responda de forma acolhedora, clara, elegante e estratégica. Explique de forma simples, sem prometer resultado, sem afirmar tese definitiva, e sempre convide a pessoa para uma análise individual com a advogada.',
  },
  {
    name: 'bancario',
    keywords: [
      'banco',
      'empréstimo',
      'emprestimo',
      'juros',
      'consignado',
      'cobrança',
      'cobranca',
      'fraude',
      'desconto indevido',
      'cartão',
      'cartao',
      'tarifa',
      'financiamento',
      'negativação',
      'negativacao',
      'nome sujo',
    ],
    landingPath: '/direito-consumidor-bancario.html',
    systemPrompt:
      'Você é a NoemIA, assistente virtual da Advogada Noemia. Atue com foco em direito bancário e consumidor. Responda com clareza, firmeza e acessibilidade. Ajude a pessoa a entender o problema, mas sem prometer ganho de causa. Direcione para análise com a advogada.',
  },
  {
    name: 'familia',
    keywords: [
      'divórcio',
      'divorcio',
      'pensão',
      'pensao',
      'guarda',
      'filhos',
      'separação',
      'separacao',
      'casamento',
      'união estável',
      'uniao estavel',
      'visitas',
      'alimentos',
      'inventário',
      'inventario',
    ],
    landingPath: '/direito-familia.html',
    systemPrompt:
      'Você é a NoemIA, assistente virtual da Advogada Noemia. Atue com foco em direito de família. Responda com empatia, organização e linguagem humana. Evite qualquer tom frio. Não prometa resultado. Direcione com delicadeza para análise com a advogada.',
  },
];

const generalSystemPrompt = `
Você é a NoemIA, assistente virtual da Advogada Noemia.

REGRAS:
- Fale em português do Brasil.
- Seja acolhedora, profissional, objetiva e elegante.
- Não prometa resultado.
- Não afirme conclusão jurídica fechada sem análise do caso.
- Não invente leis, prazos ou direitos.
- Não diga que a pessoa "ganhará" ou que "é causa certa".
- Explique de forma simples.
- Sempre conduza para análise com a advogada quando houver caso concreto.
- Se perceber urgência, sofrimento, risco financeiro alto, prazo ou intenção clara de contratar, priorize transferência para humano.
- Em respostas de Instagram, prefira mensagens curtas ou médias, com boa legibilidade.
- Quando adequado, encerre com CTA para WhatsApp ou site específico.
`;

const memoryStore = new Map<string, ConversationMessage[]>();
const leadStore = new Map<string, LeadRecord>();
const processedMessageIds = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

function getAreaLink(area: LegalAreaName) {
  const found = legalAreas.find((a) => a.name === area);
  return found ? `${PUBLIC_SITE_URL}${found.landingPath}` : PUBLIC_SITE_URL;
}

function detectLegalArea(text: string): LegalArea {
  const lower = normalizeText(text);

  for (const area of legalAreas) {
    if (area.keywords.some((keyword) => lower.includes(normalizeText(keyword)))) {
      return area;
    }
  }

  return {
    name: 'geral',
    keywords: [],
    landingPath: '/',
    systemPrompt:
      'Você é a NoemIA, assistente virtual da Advogada Noemia. Responda de forma geral, profissional, acolhedora e estratégica. Não prometa resultado. Direcione para análise individual com a advogada.',
  };
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function classifyLead(text: string, area: LegalAreaName): LeadAnalysis {
  const lower = normalizeText(text);

  const urgentKeywords = [
    'urgente',
    'hoje',
    'prazo',
    'amanhã',
    'amanha',
    'bloquearam',
    'cortaram',
    'suspenderam',
    'cancelaram',
    'audiência',
    'audiencia',
    'perdi',
    'negaram',
    'negado',
    'indevido',
    'descontando',
  ];

  const humanKeywords = [
    'quero falar com a advogada',
    'quero falar com alguém',
    'quero atendimento',
    'quero contratar',
    'quero entrar com processo',
    'honorários',
    'honorarios',
    'valor da consulta',
    'preço',
    'preco',
    'quanto custa',
    'posso agendar',
    'agendar',
    'consulta',
    'atendimento',
    'whatsapp',
  ];

  const scheduleKeywords = [
    'agendar',
    'consulta',
    'atendimento',
    'horário',
    'horario',
    'marcar',
    'agenda',
    'posso ir',
    'quero contratar',
    'quanto custa',
    'valor',
  ];

  const noFitKeywords = [
    'curso',
    'vaga',
    'parceria comercial',
    'publicidade',
    'trabalho',
    'emprego',
  ];

  const urgency = urgentKeywords.some((k) => lower.includes(k)) ? 'alta' : 'media';
  const wantsHuman = humanKeywords.some((k) => lower.includes(k));
  const shouldSchedule = scheduleKeywords.some((k) => lower.includes(k));

  if (noFitKeywords.some((k) => lower.includes(k))) {
    return {
      legalArea: area,
      leadStatus: 'sem_aderencia',
      funnelStage: 'contato_inicial',
      urgency: 'baixa',
      wantsHuman: false,
      shouldSchedule: false,
      summary: 'Contato sem aderência clara aos serviços jurídicos prioritários.',
      suggestedAction: 'Responder cordialmente e direcionar apenas se houver aderência.',
    };
  }

  if (wantsHuman || shouldSchedule) {
    return {
      legalArea: area,
      leadStatus: 'pronto_para_agendar',
      funnelStage: 'agendamento',
      urgency,
      wantsHuman: true,
      shouldSchedule: true,
      summary: 'Lead com intenção clara de atendimento ou contratação.',
      suggestedAction: 'Transferir para humano e oferecer agendamento imediato.',
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
      legalArea: area,
      leadStatus: 'quente',
      funnelStage: 'triagem',
      urgency,
      wantsHuman: urgency === 'alta',
      shouldSchedule: urgency === 'alta',
      summary: 'Lead com dor concreta e boa chance de avançar para triagem.',
      suggestedAction: 'Acolher, explicar e conduzir para análise individual.',
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
      legalArea: area,
      leadStatus: 'interessado',
      funnelStage: 'qualificacao',
      urgency: 'media',
      wantsHuman: false,
      shouldSchedule: false,
      summary: 'Lead interessado, ainda em fase de entendimento.',
      suggestedAction: 'Responder com clareza e abrir caminho para triagem.',
    };
  }

  return {
    legalArea: area,
    leadStatus: 'curioso',
    funnelStage: 'contato_inicial',
    urgency: 'baixa',
    wantsHuman: false,
    shouldSchedule: false,
    summary: 'Lead inicial com intenção ainda superficial.',
    suggestedAction: 'Responder de forma útil e convidar para aprofundar.',
  };
}

function buildSystemPrompt(area: LegalArea, analysis: LeadAnalysis) {
  const urgencyRule =
    analysis.urgency === 'alta'
      ? 'Há sinais de urgência. Priorize acolhimento e condução rápida para atendimento humano.'
      : 'Não há urgência extrema evidente. Responda com clareza e convide para aprofundar o caso.';

  const funnelRule =
    analysis.wantsHuman || analysis.shouldSchedule
      ? 'A pessoa demonstra intenção forte de atendimento. Direcione para WhatsApp e agendamento.'
      : 'A pessoa ainda pode precisar de qualificação. Faça uma resposta útil e depois convide para análise com a advogada.';

  return `
${generalSystemPrompt}

ÁREA PRINCIPAL:
${area.systemPrompt}

CONTEXTO DO LEAD:
- Área detectada: ${analysis.legalArea}
- Status do lead: ${analysis.leadStatus}
- Etapa do funil: ${analysis.funnelStage}
- Urgência: ${analysis.urgency}
- Quer humano: ${analysis.wantsHuman ? 'sim' : 'não'}
- Deve agendar: ${analysis.shouldSchedule ? 'sim' : 'não'}

DIRETRIZES ESPECIAIS:
- Responda em no máximo 900 caracteres.
- Use frases claras.
- Não faça resposta longa demais.
- Seja calorosa e firme.
- Dê uma orientação inicial útil, mas sem substituir análise jurídica individual.
- Sempre que fizer sentido, sugira o próximo passo.
- Evite excesso de emojis.
- Use no máximo 1 emoji, e só se ajudar.

${urgencyRule}
${funnelRule}
`;
}

function buildAssistantCTA(area: LegalAreaName, analysis: LeadAnalysis) {
  const areaLink = getAreaLink(area);

  if (analysis.wantsHuman || analysis.shouldSchedule) {
    return `\n\nSe você quiser, posso te direcionar agora para o atendimento da advogada:\nWhatsApp: ${WHATSAPP_URL}\nPágina: ${areaLink}`;
  }

  return `\n\nSe quiser, você também pode entender melhor por aqui:\n${areaLink}\nOu falar direto com a advogada: ${WHATSAPP_URL}`;
}

function getConversationMemory(userId: string): ConversationMessage[] {
  return memoryStore.get(userId) || [];
}

function pushConversationMemory(userId: string, messages: ConversationMessage[]) {
  const current = getConversationMemory(userId);
  const merged = [...current, ...messages].slice(-12);
  memoryStore.set(userId, merged);
}

function buildConversationMessages(
  userText: string,
  systemPrompt: string,
  memory: ConversationMessage[]
): ConversationMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...memory.filter((m) => m.role !== 'system'),
    { role: 'user', content: userText },
  ];
}

async function generateAIResponse(
  userText: string,
  area: LegalArea,
  analysis: LeadAnalysis,
  userId: string
) {
  if (!openai) {
    return fallbackResponse(area.name, analysis);
  }

  try {
    const memory = getConversationMemory(userId);
    const messages = buildConversationMessages(
      userText,
      buildSystemPrompt(area, analysis),
      memory
    );

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 300,
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() || fallbackResponse(area.name, analysis);

    const finalResponse = `${text}${buildAssistantCTA(area.name, analysis)}`;

    pushConversationMemory(userId, [
      { role: 'user', content: userText },
      { role: 'assistant', content: finalResponse },
    ]);

    return finalResponse;
  } catch (error) {
    logEvent('OPENAI_ERROR', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return fallbackResponse(area.name, analysis);
  }
}

function fallbackResponse(area: LegalAreaName, analysis: LeadAnalysis) {
  const areaLabel =
    area === 'previdenciario'
      ? 'direito previdenciário'
      : area === 'bancario'
      ? 'direito bancário'
      : area === 'familia'
      ? 'direito de família'
      : 'questão jurídica';

  if (analysis.wantsHuman || analysis.shouldSchedule) {
    return `Entendi. Seu caso parece exigir uma análise individual com mais cuidado. Posso te direcionar agora para o atendimento da advogada Noemia sobre ${areaLabel}.\n\nWhatsApp: ${WHATSAPP_URL}\nPágina: ${getAreaLink(area)}`;
  }

  return `Entendi sua mensagem. Posso te passar uma orientação inicial sobre ${areaLabel}, mas para uma análise segura do seu caso o ideal é falar diretamente com a advogada Noemia.\n\nWhatsApp: ${WHATSAPP_URL}\nPágina: ${getAreaLink(area)}`;
}

async function sendInstagramMessage(recipientId: string, messageText: string): Promise<boolean> {
  try {
    const response = await fetch('https://graph.facebook.com/v19.0/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logEvent('GRAPH_API_SEND_ERROR', {
        status: response.status,
        body: errorText,
      });
      return false;
    }

    return true;
  } catch (error) {
    logEvent('GRAPH_API_SEND_EXCEPTION', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}

function validateSignature(req: NextApiRequest) {
  if (!ENABLE_SIGNATURE_VALIDATION) return true;
  if (!APP_SECRET) return false;

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) return false;

  const [algorithm, signatureHash] = signature.split('=');
  if (algorithm !== 'sha256' || !signatureHash) return false;

  const body = JSON.stringify(req.body);
  const expectedHash = crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

function logEvent(eventType: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      ts: nowIso(),
      source: 'meta-webhook',
      eventType,
      ...data,
    })
  );
}

function parseMetaEvents(body: MetaWebhookBody): ProcessedEvent[] {
  const events: ProcessedEvent[] = [];
  const entries = body.entry || [];

  for (const entry of entries) {
    for (const messaging of entry.messaging || []) {
      if (messaging.message?.text) {
        events.push({
          type: 'message',
          sender: messaging.sender?.id || '',
          recipient: messaging.recipient?.id || '',
          timestamp: messaging.timestamp || Date.now(),
          text: messaging.message.text || '',
          messageId: messaging.message.mid || '',
          senderName: '',
        });
      } else if (messaging.postback?.payload) {
        events.push({
          type: 'postback',
          sender: messaging.sender?.id || '',
          recipient: messaging.recipient?.id || '',
          timestamp: messaging.timestamp || Date.now(),
          text: messaging.postback.payload || '',
          messageId: `postback_${messaging.timestamp || Date.now()}`,
          senderName: '',
        });
      }
    }

    for (const change of entry.changes || []) {
      if (change.field === 'comments' && change.value) {
        events.push({
          type: 'comment',
          sender: change.value.from?.id || '',
          recipient: entry.id || '',
          timestamp: change.value.created_time || Date.now(),
          text: change.value.text || change.value.message || '',
          messageId: change.value.id || `comment_${Date.now()}`,
          senderName: change.value.from?.username || '',
        });
      }
    }
  }

  return events.filter((event) => !!event.sender && !!event.text);
}

function shouldAutoReplyComment(text: string) {
  const normalized = normalizeText(text);

  const triggers = [
    'aposentadoria',
    'inss',
    'beneficio',
    'benefício',
    'divorcio',
    'divórcio',
    'pensao',
    'pensão',
    'emprestimo',
    'empréstimo',
    'juros',
    'quero',
    'me chama',
    'info',
    'informacoes',
    'informações',
  ];

  return triggers.some((trigger) => normalized.includes(normalizeText(trigger)));
}

async function fetchSupabase<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: Record<string, Json> | Record<string, Json>[]
): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      logEvent('SUPABASE_ERROR', { path, method, status: response.status, body: text });
      return null;
    }

    if (method === 'PATCH') return null;
    const json = (await response.json()) as T;
    return json;
  } catch (error) {
    logEvent('SUPABASE_EXCEPTION', {
      path,
      method,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}

async function upsertLead(
  userId: string,
  username: string | null,
  analysis: LeadAnalysis,
  userText: string,
  aiResponse: string
) {
  const existing = leadStore.get(userId);
  const now = nowIso();

  const nextRecord: LeadRecord = {
    platform: 'instagram',
    platform_user_id: userId,
    username,
    legal_area: analysis.legalArea,
    lead_status: analysis.leadStatus,
    funnel_stage: analysis.funnelStage,
    urgency: analysis.urgency,
    last_message: userText,
    last_response: aiResponse,
    wants_human: analysis.wantsHuman,
    should_schedule: analysis.shouldSchedule,
    summary: analysis.summary,
    suggested_action: analysis.suggestedAction,
    first_contact_at: existing?.first_contact_at || now,
    last_contact_at: now,
    conversation_count: (existing?.conversation_count || 0) + 1,
    metadata: {
      source: 'instagram_dm',
    },
  };

  leadStore.set(userId, nextRecord);

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const existingRows = await fetchSupabase<Array<{ id: string; conversation_count: number }>>(
      `noemia_leads?platform=eq.instagram&platform_user_id=eq.${encodeURIComponent(userId)}&select=id,conversation_count`,
      'GET'
    );

    if (existingRows && existingRows.length > 0) {
      const id = existingRows[0].id;
      await fetchSupabase(`noemia_leads?id=eq.${id}`, 'PATCH', {
        username,
        legal_area: nextRecord.legal_area,
        lead_status: nextRecord.lead_status,
        funnel_stage: nextRecord.funnel_stage,
        urgency: nextRecord.urgency,
        last_message: nextRecord.last_message,
        last_response: nextRecord.last_response,
        wants_human: nextRecord.wants_human,
        should_schedule: nextRecord.should_schedule,
        summary: nextRecord.summary,
        suggested_action: nextRecord.suggested_action,
        last_contact_at: nextRecord.last_contact_at,
        conversation_count: nextRecord.conversation_count,
        metadata: nextRecord.metadata || {},
      });
    } else {
      await fetchSupabase('noemia_leads', 'POST', nextRecord as unknown as Record<string, Json>);
    }
  }

  return nextRecord;
}

async function insertConversationLog(record: ConversationLogRecord) {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    await fetchSupabase(
      'noemia_conversations',
      'POST',
      record as unknown as Record<string, Json>
    );
  }
}

function isDuplicateMessage(messageId: string) {
  if (!messageId) return false;
  if (processedMessageIds.has(messageId)) return true;
  processedMessageIds.add(messageId);

  if (processedMessageIds.size > 5000) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }

  return false;
}

function buildCommentReplyText(area: LegalAreaName) {
  if (area === 'previdenciario') {
    return 'Te enviei uma mensagem no direct com as orientações iniciais sobre esse tema.';
  }
  if (area === 'bancario') {
    return 'Te chamei no direct com as orientações iniciais sobre essa situação.';
  }
  if (area === 'familia') {
    return 'Te enviei uma mensagem no direct com uma orientação inicial.';
  }
  return 'Te enviei uma mensagem no direct com mais informações.';
}

async function processMessageEvent(event: ProcessedEvent) {
  const area = detectLegalArea(event.text);
  const analysis = classifyLead(event.text, area.name);
  const responseText = await generateAIResponse(event.text, area, analysis, event.sender);
  const sent = await sendInstagramMessage(event.sender, responseText);

  await upsertLead(event.sender, event.senderName || null, analysis, event.text, responseText);

  await insertConversationLog({
    platform: 'instagram',
    platform_user_id: event.sender,
    username: event.senderName || null,
    event_type: event.type,
    message_id: event.messageId,
    user_text: event.text,
    ai_response: responseText,
    legal_area: analysis.legalArea,
    lead_status: analysis.leadStatus,
    funnel_stage: analysis.funnelStage,
    urgency: analysis.urgency,
    wants_human: analysis.wantsHuman,
    should_schedule: analysis.shouldSchedule,
    metadata: {
      sent,
      summary: analysis.summary,
      suggested_action: analysis.suggestedAction,
    },
  });

  logEvent('MESSAGE_PROCESSED', {
    sender: event.sender,
    area: analysis.legalArea,
    leadStatus: analysis.leadStatus,
    funnelStage: analysis.funnelStage,
    urgency: analysis.urgency,
    wantsHuman: analysis.wantsHuman,
    shouldSchedule: analysis.shouldSchedule,
    sent,
  });

  return {
    ...event,
    area: analysis.legalArea,
    leadStatus: analysis.leadStatus,
    funnelStage: analysis.funnelStage,
    urgency: analysis.urgency,
    wantsHuman: analysis.wantsHuman,
    shouldSchedule: analysis.shouldSchedule,
    sent,
  };
}

async function processCommentEvent(event: ProcessedEvent) {
  if (!ENABLE_COMMENT_AUTOREPLY) {
    return { ...event, ignored: true, reason: 'comment_autoreply_disabled' };
  }

  if (!shouldAutoReplyComment(event.text)) {
    return { ...event, ignored: true, reason: 'no_trigger' };
  }

  const area = detectLegalArea(event.text);
  const analysis = classifyLead(event.text, area.name);

  const dmText = `Oi! Vi seu comentário e já te adianto uma orientação inicial sobre esse tema. ${buildAssistantCTA(
    area.name,
    analysis
  )}`;

  const sent = await sendInstagramMessage(event.sender, dmText);

  await upsertLead(event.sender, event.senderName || null, analysis, `[COMENTÁRIO] ${event.text}`, dmText);

  await insertConversationLog({
    platform: 'instagram',
    platform_user_id: event.sender,
    username: event.senderName || null,
    event_type: 'comment',
    message_id: event.messageId,
    user_text: event.text,
    ai_response: dmText,
    legal_area: analysis.legalArea,
    lead_status: analysis.leadStatus,
    funnel_stage: analysis.funnelStage,
    urgency: analysis.urgency,
    wants_human: analysis.wantsHuman,
    should_schedule: analysis.shouldSchedule,
    metadata: {
      sent,
      trigger: true,
      publicReplySuggestion: buildCommentReplyText(area.name),
    },
  });

  logEvent('COMMENT_TRIGGERED_DM', {
    sender: event.sender,
    area: analysis.legalArea,
    sent,
  });

  return {
    ...event,
    area: analysis.legalArea,
    leadStatus: analysis.leadStatus,
    funnelStage: analysis.funnelStage,
    urgency: analysis.urgency,
    sent,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logEvent('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    }

    logEvent('WEBHOOK_VERIFY_FAILED', {
      mode,
      tokenMatch: token === VERIFY_TOKEN,
    });

    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  if (!INSTAGRAM_ACCESS_TOKEN) {
    logEvent('CONFIG_ERROR', { missing: 'INSTAGRAM_ACCESS_TOKEN' });
    return res.status(500).json({ error: 'INSTAGRAM_ACCESS_TOKEN missing' });
  }

  if (ENABLE_SIGNATURE_VALIDATION && !validateSignature(req)) {
    logEvent('INVALID_SIGNATURE');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  try {
    const body = req.body as MetaWebhookBody;
    const events = parseMetaEvents(body);

    if (!events.length) {
      logEvent('NO_EVENTS');
      return res.status(200).json({ received: true, events: [] });
    }

    const results: unknown[] = [];

    for (const event of events) {
      if (isDuplicateMessage(event.messageId)) {
        logEvent('DUPLICATE_MESSAGE_SKIPPED', { messageId: event.messageId });
        continue;
      }

      try {
        if (event.type === 'message') {
          results.push(await processMessageEvent(event));
        } else if (event.type === 'comment') {
          results.push(await processCommentEvent(event));
        } else if (event.type === 'postback') {
          const area = detectLegalArea(event.text);
          const analysis = classifyLead(event.text, area.name);

          await upsertLead(event.sender, event.senderName || null, analysis, `[POSTBACK] ${event.text}`, '');

          results.push({
            ...event,
            area: analysis.legalArea,
            leadStatus: analysis.leadStatus,
            funnelStage: analysis.funnelStage,
            urgency: analysis.urgency,
            info: 'postback registrado',
          });
        }
      } catch (eventError) {
        logEvent('EVENT_PROCESSING_ERROR', {
          messageId: event.messageId,
          error: eventError instanceof Error ? eventError.message : 'unknown',
        });

        results.push({
          ...event,
          error: true,
        });
      }
    }

    return res.status(200).json({
      received: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    logEvent('FATAL_HANDLER_ERROR', {
      error: error instanceof Error ? error.message : 'unknown',
    });

    return res.status(500).json({
      error: 'internal_error',
      received: true,
    });
  }
}