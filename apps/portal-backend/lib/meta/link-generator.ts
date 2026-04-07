/**
 * Gerador de links contextuais para captação
 * Cria URLs com parâmetros de rastreio para triagem e NoemIA
 */

interface ContextLinkParams {
  tema?: string;
  origem: string;
  campanha?: string;
  video?: string;
  pagina?: string;
}

/**
 * Gera link contextual para triagem ou NoemIA
 */
export function generateContextLink(params: ContextLinkParams): string {
  const baseUrl = 'https://advnoemia.com.br';
  
  // Determinar página destino baseada no tema e origem
  let destination = 'triagem.html';
  
  // Se vier da NoemIA ou for análise inicial, direcionar para NoemIA
  if (params.origem === 'noemia' || params.origem === 'noemia-home') {
    destination = 'noemia.html';
  }
  
  // Construir parâmetros URL
  const urlParams = new URLSearchParams();
  
  if (params.tema) {
    urlParams.set('tema', params.tema);
  }
  
  if (params.origem && params.origem !== 'site') {
    urlParams.set('origem', params.origem);
  }
  
  if (params.campanha) {
    urlParams.set('campanha', params.campanha);
  }
  
  if (params.video) {
    urlParams.set('video', params.video);
  }
  
  if (params.pagina) {
    urlParams.set('pagina', params.pagina);
  }
  
  // Montar URL final
  const url = `${baseUrl}/${destination}`;
  return urlParams.toString() ? `${url}?${urlParams.toString()}` : url;
}

/**
 * Gera link específico para triagem
 */
export function generateTriageLink(params: ContextLinkParams): string {
  return generateContextLink({
    ...params,
    pagina: 'triagem.html'
  });
}

/**
 * Gera link específico para NoemIA
 */
export function generateNoemiaLink(params: ContextLinkParams): string {
  return generateContextLink({
    ...params,
    pagina: 'noemia.html'
  });
}

/**
 * Gera link para WhatsApp com mensagem pré-formatada
 */
export function generateWhatsAppLink(
  message: string,
  context?: Partial<ContextLinkParams>
): string {
  const phoneNumber = '5584996248241';
  
  // Adicionar contexto à mensagem se fornecido
  let contextualMessage = message;
  
  if (context) {
    const contextLines = [];
    
    if (context.tema) {
      contextLines.push(`*Tema:* ${context.tema}`);
    }
    
    if (context.origem && context.origem !== 'site') {
      contextLines.push(`*Origem:* ${context.origem}`);
    }
    
    if (context.campanha) {
      contextLines.push(`*Campanha:* ${context.campanha}`);
    }
    
    if (contextLines.length > 0) {
      contextualMessage += '\n\n' + contextLines.join('\n');
    }
  }
  
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(contextualMessage)}`;
}

/**
 * Cria links para diferentes plataformas sociais
 */
export function generateSocialLinks(theme: string, campaignId?: string) {
  const baseParams: ContextLinkParams = {
    tema: theme,
    origem: 'instagram',
    campanha: campaignId || 'organic'
  };
  
  return {
    instagram: {
      bio: generateTriageLink(baseParams),
      stories: generateTriageLink({ ...baseParams, campanha: `${baseParams.campanha}_stories` }),
      reels: generateTriageLink({ ...baseParams, campanha: `${baseParams.campanha}_reels` }),
      carousel: generateTriageLink({ ...baseParams, campanha: `${baseParams.campanha}_carousel` })
    },
    
    whatsapp: {
      direct: generateWhatsAppLink(
        `Olá! Vi seu conteúdo sobre ${theme} e preciso de orientação jurídica.`,
        baseParams
      )
    },
    
    facebook: {
      post: generateTriageLink({ ...baseParams, origem: 'facebook', campanha: `${baseParams.campanha}_post` }),
      ad: generateTriageLink({ ...baseParams, origem: 'facebook', campanha: `${baseParams.campanha}_ad` })
    }
  };
}

/**
 * Gera link com UTM parameters para rastreamento avançado
 */
export function generateUTMLink(
  destination: 'triagem' | 'noemia',
  utmParams: {
    source: string;
    medium: string;
    campaign: string;
    content?: string;
    term?: string;
  },
  customParams?: Record<string, string>
): string {
  const baseUrl = 'https://advnoemia.com.br';
  const page = destination === 'triagem' ? 'triagem.html' : 'noemia.html';
  
  const urlParams = new URLSearchParams();
  
  // Parâmetros UTM
  urlParams.set('utm_source', utmParams.source);
  urlParams.set('utm_medium', utmParams.medium);
  urlParams.set('utm_campaign', utmParams.campaign);
  
  if (utmParams.content) {
    urlParams.set('utm_content', utmParams.content);
  }
  
  if (utmParams.term) {
    urlParams.set('utm_term', utmParams.term);
  }
  
  // Parâmetros customizados
  if (customParams) {
    for (const [key, value] of Object.entries(customParams)) {
      urlParams.set(key, value);
    }
  }
  
  return `${baseUrl}/${page}?${urlParams.toString()}`;
}

/**
 * Cria QR Code link para materiais impressos
 */
export function generateQRLink(theme: string, materialType: 'flyer' | 'card' | 'banner'): string {
  return generateTriageLink({
    tema: theme,
    origem: 'qr_code',
    campanha: materialType,
    video: `qr_${Date.now()}`
  });
}

/**
 * Gera link para campanhas específicas
 */
export function generateCampaignLink(
  campaignName: string,
  theme?: string,
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'email' = 'instagram'
): string {
  return generateTriageLink({
    tema: theme,
    origem: platform,
    campanha: campaignName,
    video: campaignName
  });
}

/**
 * Valida e normaliza parâmetros de link
 */
export function normalizeLinkParams(params: Partial<ContextLinkParams>): ContextLinkParams {
  return {
    tema: params.tema?.toLowerCase().trim() || '',
    origem: params.origem?.toLowerCase().trim() || 'site',
    campanha: params.campanha?.toLowerCase().trim() || '',
    video: params.video?.toLowerCase().trim() || '',
    pagina: params.pagina?.toLowerCase().trim() || ''
  };
}
