import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export interface AcquisitionData {
  source?: string;
  campaign?: string;
  topic?: string;
  content_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface LeadAcquisitionContext {
  source: string;
  campaign?: string;
  topic?: string;
  content_id?: string;
  acquisition_metadata: Record<string, any>;
  acquisition_tags: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface AcquisitionEvent {
  lead_id: string;
  event_type: 'lead_created' | 'first_message_sent' | 'qualified' | 'scheduled' | 'converted';
  metadata?: Record<string, any>;
}

// Fontes válidas
const VALID_SOURCES = ['instagram', 'whatsapp', 'site', 'ads', 'organic', 'referral'] as const;
const VALID_TOPICS = ['previdenciario', 'bancario', 'familia', 'civil', 'trabalhista', 'consumidor'] as const;

// Função para extrair e validar parâmetros de URL
export function extractAcquisitionParams(searchParams: URLSearchParams | string): AcquisitionData {
  let params: URLSearchParams;
  
  if (typeof searchParams === 'string') {
    params = new URLSearchParams(searchParams);
  } else {
    params = searchParams;
  }

  const data: AcquisitionData = {};

  // Extrair parâmetros diretos
  const source = sanitizeInput(params.get('source'));
  if (source && VALID_SOURCES.includes(source as any)) {
    data.source = source;
  }

  const campaign = sanitizeInput(params.get('campaign'));
  if (campaign) {
    data.campaign = campaign;
  }

  const topic = sanitizeInput(params.get('topic'));
  if (topic && VALID_TOPICS.includes(topic as any)) {
    data.topic = topic;
  }

  const contentId = sanitizeInput(params.get('content_id'));
  if (contentId) {
    data.content_id = contentId;
  }

  // Extrair parâmetros UTM
  const utmSource = sanitizeInput(params.get('utm_source'));
  if (utmSource) {
    data.utm_source = utmSource;
  }

  const utmMedium = sanitizeInput(params.get('utm_medium'));
  if (utmMedium) {
    data.utm_medium = utmMedium;
  }

  const utmCampaign = sanitizeInput(params.get('utm_campaign'));
  if (utmCampaign) {
    data.utm_campaign = utmCampaign;
  }

  const utmTerm = sanitizeInput(params.get('utm_term'));
  if (utmTerm) {
    data.utm_term = utmTerm;
  }

  const utmContent = sanitizeInput(params.get('utm_content'));
  if (utmContent) {
    data.utm_content = utmContent;
  }

  // Log para debug
  console.log('ACQUISITION_TRACKING: Parâmetros extraídos:', data);

  return data;
}

// Função para sanitizar inputs
function sanitizeInput(input: string | null): string | null {
  if (!input) return null;
  
  // Remover caracteres perigosos
  const sanitized = input
    .replace(/[<>]/g, '') // Remover tags HTML
    .replace(/['"]/g, '') // Remover aspas
    .replace(/javascript:/gi, '') // Remover protocolos perigosos
    .replace(/on\w+=/gi, '') // Remover event handlers
    .trim()
    .substring(0, 255); // Limitar tamanho

  return sanitized || null;
}

// Função para inferir origem baseada em headers e contexto
export function inferSourceFromContext(headers: Headers, userAgent?: string): string {
  // Verificar User-Agent para inferir origem
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('instagram')) return 'instagram';
    if (ua.includes('whatsapp')) return 'whatsapp';
    if (ua.includes('facebook')) return 'instagram';
  }

  // Verificar referer
  const referer = headers.get('referer');
  if (referer) {
    const ref = referer.toLowerCase();
    
    if (ref.includes('instagram.com')) return 'instagram';
    if (ref.includes('wa.me') || ref.includes('web.whatsapp')) return 'whatsapp';
    if (ref.includes('facebook.com')) return 'instagram';
    if (ref.includes('google.com')) return 'ads';
    if (ref.includes('linkedin.com')) return 'ads';
  }

  return 'organic'; // Default
}

// Função para criar contexto de aquisição
export function createAcquisitionContext(
  acquisitionData: AcquisitionData,
  inferredSource?: string
): LeadAcquisitionContext {
  const source = acquisitionData.source || inferredSource || 'organic';
  
  // Criar metadados
  const acquisition_metadata: Record<string, any> = {
    detected_at: new Date().toISOString(),
    inferred_source: inferredSource,
    has_utm_params: !!(acquisitionData.utm_source || acquisitionData.utm_campaign),
    ...acquisitionData
  };

  // Criar tags automáticas
  const acquisition_tags: string[] = [`origem_${source}`];
  
  if (acquisitionData.topic) {
    acquisition_tags.push(`tema_${acquisitionData.topic}`);
  }
  
  if (acquisitionData.campaign) {
    acquisition_tags.push(`campanha_${acquisitionData.campaign}`);
  }

  if (acquisitionData.utm_source) {
    acquisition_tags.push(`utm_${acquisitionData.utm_source}`);
  }

  return {
    source,
    campaign: acquisitionData.campaign,
    topic: acquisitionData.topic,
    content_id: acquisitionData.content_id,
    acquisition_metadata,
    acquisition_tags,
    utm_source: acquisitionData.utm_source,
    utm_medium: acquisitionData.utm_medium,
    utm_campaign: acquisitionData.utm_campaign,
    utm_term: acquisitionData.utm_term,
    utm_content: acquisitionData.utm_content
  };
}

// Função para atualizar lead com dados de aquisição
export async function updateLeadWithAcquisitionData(
  leadId: string,
  acquisitionContext: LeadAcquisitionContext
): Promise<void> {
  try {
    const { error } = await supabase
      .from('noemia_leads')
      .update({
        source: acquisitionContext.source,
        campaign: acquisitionContext.campaign,
        topic: acquisitionContext.topic,
        content_id: acquisitionContext.content_id,
        acquisition_metadata: acquisitionContext.acquisition_metadata,
        acquisition_tags: acquisitionContext.acquisition_tags,
        utm_source: acquisitionContext.utm_source,
        utm_medium: acquisitionContext.utm_medium,
        utm_campaign: acquisitionContext.utm_campaign,
        utm_term: acquisitionContext.utm_term,
        utm_content: acquisitionContext.utm_content,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('ACQUISITION_TRACKING: Erro ao atualizar lead:', error);
      throw error;
    }

    console.log('ACQUISITION_TRACKING: Lead atualizado com sucesso:', {
      leadId,
      source: acquisitionContext.source,
      topic: acquisitionContext.topic,
      campaign: acquisitionContext.campaign
    });

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Falha ao atualizar lead com dados de aquisição:', error);
    throw error;
  }
}

// Função para registrar eventos de aquisição
export async function logAcquisitionEvent(event: AcquisitionEvent): Promise<void> {
  try {
    // Buscar dados atuais do lead para incluir nos eventos
    const { data: lead, error: leadError } = await supabase
      .from('noemia_leads')
      .select('source, campaign, topic, content_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content')
      .eq('id', event.lead_id)
      .single();

    if (leadError) {
      console.error('ACQUISITION_TRACKING: Erro ao buscar lead para evento:', leadError);
      return;
    }

    const { error } = await supabase
      .from('acquisition_events')
      .insert({
        lead_id: event.lead_id,
        event_type: event.event_type,
        source: lead?.source,
        campaign: lead?.campaign,
        topic: lead?.topic,
        content_id: lead?.content_id,
        utm_source: lead?.utm_source,
        utm_medium: lead?.utm_medium,
        utm_campaign: lead?.utm_campaign,
        utm_term: lead?.utm_term,
        utm_content: lead?.utm_content,
        metadata: event.metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('ACQUISITION_TRACKING: Erro ao registrar evento:', error);
      throw error;
    }

    console.log('ACQUISITION_TRACKING: Evento registrado com sucesso:', {
      leadId: event.lead_id,
      eventType: event.event_type,
      source: lead?.source
    });

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Falha ao registrar evento de aquisição:', error);
    throw error;
  }
}

// Função para gerar contexto para a IA
export function generateAIContext(acquisitionContext: LeadAcquisitionContext): string {
  const contextParts: string[] = [];

  // Adicionar informação de origem
  if (acquisitionContext.source) {
    const sourceNames: Record<string, string> = {
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      site: 'site',
      ads: 'anúncio',
      organic: 'busca orgânica',
      referral: 'indicação'
    };
    
    contextParts.push(`Este lead veio do ${sourceNames[acquisitionContext.source] || acquisitionContext.source}`);
  }

  // Adicionar informação de campanha
  if (acquisitionContext.campaign) {
    contextParts.push(`campanha "${acquisitionContext.campaign}"`);
  }

  // Adicionar informação de tema
  if (acquisitionContext.topic) {
    const topicNames: Record<string, string> = {
      previdenciario: 'previdenciário',
      bancario: 'bancário',
      familia: 'família',
      civil: 'cível',
      trabalhista: 'trabalhista',
      consumidor: 'consumidor'
    };
    
    contextParts.push(`interesse em área ${topicNames[acquisitionContext.topic] || acquisitionContext.topic}`);
  }

  // Adicionar informação de conteúdo específico
  if (acquisitionContext.content_id) {
    contextParts.push(`conteúdo específico ${acquisitionContext.content_id}`);
  }

  return contextParts.length > 0 
    ? `Contexto de aquisição: ${contextParts.join(', ')}.`
    : '';
}

// Função para adaptar linguagem baseada no tema
export function adaptLanguageForTopic(topic: string | undefined): string {
  if (!topic) return '';

  const adaptations: Record<string, string> = {
    previdenciario: 'Foque em perguntas sobre INSS, aposentadoria, benefícios e tempo de contribuição.',
    bancario: 'Foque em perguntas sobre empréstimos, juros, cobranças e direitos do consumidor bancário.',
    familia: 'Foque em perguntas sobre divórcio, pensão alimentícia, guarda e sucessão.',
    civil: 'Foque em perguntas sobre contratos, responsabilidade civil e danos morais.',
    trabalhista: 'Foque em perguntas sobre demissão, verbas rescisórias e direitos trabalhistas.',
    consumidor: 'Foque em perguntas sobre produtos defeituosos, serviços e proteção ao consumidor.'
  };

  return adaptations[topic] || '';
}

// Função para obter insights de aquisição
export async function getAcquisitionInsights(
  startDate?: string,
  endDate?: string
) {
  try {
    let query = supabase
      .from('acquisition_events')
      .select(`
        event_type,
        source,
        topic,
        campaign,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('ACQUISITION_TRACKING: Erro ao buscar insights:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Falha ao buscar insights:', error);
    return null;
  }
}
