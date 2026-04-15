import { AcquisitionData } from './acquisition-service';

export interface TrackingLinkParams {
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

export interface LinkGenerationOptions {
  baseUrl?: string;
  path?: string;
  fallbackParams?: TrackingLinkParams;
}

// Configuração padrão
const DEFAULT_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://advnoemia.com.br',
  path: '/#atendimento'
};

function shouldLogTrackingLinks() {
  return process.env.TRACKING_DEBUG_LOGS === '1';
}

/**
 * Gera URL de tracking completa para a NoemIA
 */
export function generateTrackingLink(params: TrackingLinkParams, options: LinkGenerationOptions = {}): string {
  const config = { ...DEFAULT_CONFIG, ...options };
  const url = new URL(config.path, config.baseUrl);

  // Adicionar parâmetros de tracking
  if (params.source) {
    url.searchParams.set('source', params.source);
  }

  if (params.campaign) {
    url.searchParams.set('campaign', params.campaign);
  }

  if (params.topic) {
    url.searchParams.set('topic', params.topic);
  }

  if (params.content_id) {
    url.searchParams.set('content_id', params.content_id);
  }

  // Adicionar parâmetros UTM
  if (params.utm_source) {
    url.searchParams.set('utm_source', params.utm_source);
  }

  if (params.utm_medium) {
    url.searchParams.set('utm_medium', params.utm_medium);
  }

  if (params.utm_campaign) {
    url.searchParams.set('utm_campaign', params.utm_campaign);
  }

  if (params.utm_term) {
    url.searchParams.set('utm_term', params.utm_term);
  }

  if (params.utm_content) {
    url.searchParams.set('utm_content', params.utm_content);
  }

  // Adicionar parâmetros de fallback se fornecidos
  if (options.fallbackParams) {
    Object.entries(options.fallbackParams).forEach(([key, value]) => {
      if (value && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });
  }

  const finalUrl = url.toString();

  if (shouldLogTrackingLinks()) {
    console.log('LINK_GENERATED: Link gerado com tracking:', {
      url: finalUrl,
      params,
      config
    });
  }

  return finalUrl;
}

/**
 * Gera link para Instagram bio
 */
export function generateInstagramBioLink(campaign?: string): string {
  return generateTrackingLink({
    source: 'instagram',
    campaign: campaign || 'bio_principal',
    topic: 'geral'
  });
}

/**
 * Gera link para conteúdo específico (vídeo, reel, etc.)
 */
export function generateContentLink(
  contentType: 'video' | 'reel' | 'post' | 'story',
  contentId: string,
  topic?: string,
  campaign?: string
): string {
  return generateTrackingLink({
    source: 'instagram',
    campaign: campaign || `${contentType}_${contentId}`,
    topic: topic || 'geral',
    content_id: `${contentType}_${contentId}`
  });
}

/**
 * Gera link para WhatsApp com tracking
 */
export function generateWhatsAppLink(
  message?: string,
  campaign?: string,
  topic?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://advnoemia.com.br';
  
  // Para WhatsApp, usamos o link direto do WhatsApp com parâmetros UTM
  const whatsappNumber = process.env.WHATSAPP_BUSINESS_NUMBER || '5511999999999';
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  
  const trackingParams: TrackingLinkParams = {
    source: 'whatsapp',
    campaign: campaign || 'whatsapp_direct',
    topic: topic,
    utm_source: 'whatsapp',
    utm_medium: 'social',
    utm_campaign: campaign || 'whatsapp_direct'
  };

  if (message) {
    const queryString = new URLSearchParams(
      Object.entries(trackingParams).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null) {
          acc[k] = String(v);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    return `${whatsappUrl}?text=${encodeURIComponent(message)}&${queryString}`;
  }

  return generateTrackingLink(trackingParams, {
    baseUrl: whatsappUrl,
    path: ''
  });
}

/**
 * Gera link para campanhas de anúncios
 */
export function generateAdLink(
  campaign: string,
  topic?: string,
  adGroup?: string,
  creative?: string
): string {
  return generateTrackingLink({
    source: 'ads',
    campaign,
    topic,
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: campaign,
    utm_term: adGroup,
    utm_content: creative
  });
}

/**
 * Gera link para site principal
 */
export function generateSiteLink(campaign?: string): string {
  return generateTrackingLink({
    source: 'site',
    campaign: campaign || 'homepage_main',
    topic: 'geral',
    utm_source: 'direct',
    utm_medium: 'none',
    utm_campaign: campaign || 'homepage_main'
  });
}

/**
 * Gera link para conteúdo de blog/artigos
 */
export function generateContentPageLink(
  contentType: 'blog' | 'article' | 'guide',
  slug: string,
  topic?: string
): string {
  return generateTrackingLink({
    source: 'site',
    campaign: `content_${contentType}`,
    topic,
    content_id: `${contentType}_${slug}`,
    utm_source: 'direct',
    utm_medium: 'content',
    utm_campaign: `content_${contentType}`
  });
}

/**
 * Valida parâmetros de tracking
 */
export function validateTrackingParams(params: Partial<TrackingLinkParams>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validar source
  if (params.source) {
    const validSources = ['instagram', 'whatsapp', 'site', 'ads', 'organic', 'referral'];
    if (!validSources.includes(params.source)) {
      errors.push(`Source inválido: ${params.source}. Válidos: ${validSources.join(', ')}`);
    }
  }

  // Validar topic
  if (params.topic) {
    const validTopics = ['previdenciario', 'bancario', 'familia', 'civil', 'trabalhista', 'consumidor', 'geral'];
    if (!validTopics.includes(params.topic)) {
      errors.push(`Topic inválido: ${params.topic}. Válidos: ${validTopics.join(', ')}`);
    }
  }

  // Validar tamanho dos campos
  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'string' && value.length > 255) {
      errors.push(`Campo ${key} muito longo (máximo 255 caracteres)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extrai parâmetros de tracking de uma URL existente
 */
export function extractTrackingParams(url: string): Partial<TrackingLinkParams> {
  try {
    const urlObj = new URL(url);
    const params: Partial<TrackingLinkParams> = {};

    const source = urlObj.searchParams.get('source');
    if (source) params.source = source;

    const campaign = urlObj.searchParams.get('campaign');
    if (campaign) params.campaign = campaign;

    const topic = urlObj.searchParams.get('topic');
    if (topic) params.topic = topic;

    const contentId = urlObj.searchParams.get('content_id');
    if (contentId) params.content_id = contentId;

    // Parâmetros UTM
    const utmSource = urlObj.searchParams.get('utm_source');
    if (utmSource) params.utm_source = utmSource;

    const utmMedium = urlObj.searchParams.get('utm_medium');
    if (utmMedium) params.utm_medium = utmMedium;

    const utmCampaign = urlObj.searchParams.get('utm_campaign');
    if (utmCampaign) params.utm_campaign = utmCampaign;

    const utmTerm = urlObj.searchParams.get('utm_term');
    if (utmTerm) params.utm_term = utmTerm;

    const utmContent = urlObj.searchParams.get('utm_content');
    if (utmContent) params.utm_content = utmContent;

    return params;
  } catch (error) {
    console.error('Erro ao extrair parâmetros de tracking:', error);
    return {};
  }
}

/**
 * Gera QR Code para tracking (futuro uso)
 */
export function generateQRCodeData(params: TrackingLinkParams): {
  url: string;
  qrData: string;
} {
  const url = generateTrackingLink(params);
  
  return {
    url,
    qrData: JSON.stringify({
      url,
      params,
      generated_at: new Date().toISOString()
    })
  };
}
