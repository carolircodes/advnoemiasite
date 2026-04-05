// Campaign Tracking System - Preparação para Instagram e outras campanhas
class CampaignTracking {
  constructor() {
    this.sessionData = {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
      origem: '',
      assunto: '',
      landing_page: '',
      timestamp: null,
      session_id: this.generateSessionId()
    };
    this.init();
  }

  init() {
    this.captureUTMParameters();
    this.captureCustomParameters();
    this.storeSessionData();
    this.setupEventListeners();
    this.enhanceWhatsAppIntegration();
  }

  // Gerar ID único da sessão
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Capturar parâmetros UTM
  captureUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    this.sessionData.utm_source = urlParams.get('utm_source') || 'direct';
    this.sessionData.utm_medium = urlParams.get('utm_medium') || 'none';
    this.sessionData.utm_campaign = urlParams.get('utm_campaign') || '';
    this.sessionData.utm_content = urlParams.get('utm_content') || '';
    this.sessionData.utm_term = urlParams.get('utm_term') || '';
    
    // Se não há UTM, tentar identificar origem pelo referrer
    if (this.sessionData.utm_source === 'direct') {
      this.identifyReferrerSource();
    }
  }

  // Identificar origem pelo referrer
  identifyReferrerSource() {
    const referrer = document.referrer;
    
    if (referrer.includes('instagram.com')) {
      this.sessionData.utm_source = 'instagram';
      this.sessionData.utm_medium = 'social';
    } else if (referrer.includes('facebook.com')) {
      this.sessionData.utm_source = 'facebook';
      this.sessionData.utm_medium = 'social';
    } else if (referrer.includes('google.com')) {
      this.sessionData.utm_source = 'google';
      this.sessionData.utm_medium = 'organic';
    } else if (referrer.includes('linkedin.com')) {
      this.sessionData.utm_source = 'linkedin';
      this.sessionData.utm_medium = 'social';
    }
  }

  // Capturar parâmetros personalizados para campanhas
  captureCustomParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    this.sessionData.origem = urlParams.get('origem') || '';
    this.sessionData.assunto = urlParams.get('assunto') || '';
    this.sessionData.landing_page = window.location.pathname;
    this.sessionData.timestamp = new Date().toISOString();
  }

  // Armazenar dados da sessão
  storeSessionData() {
    sessionStorage.setItem('advnoemia_campaign_data', JSON.stringify(this.sessionData));
    
    // Também armazenar em localStorage para persistência maior
    if (!localStorage.getItem('advnoemia_first_visit')) {
      localStorage.setItem('advnoemia_first_visit', JSON.stringify(this.sessionData));
    }
  }

  // Recuperar dados da sessão
  getSessionData() {
    const sessionData = sessionStorage.getItem('advnoemia_campaign_data');
    return sessionData ? JSON.parse(sessionData) : this.sessionData;
  }

  // Configurar event listeners
  setupEventListeners() {
    // Modificar links de WhatsApp para incluir contexto da campanha
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href*="triagem.html"], a[href*="whatsapp"], a[data-whatsapp-context]');
      if (target) {
        this.enhanceLinkWithCampaignData(target);
      }
    });

    // Modificar formulários para incluir dados da campanha
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        this.enhanceFormWithCampaignData(form);
      }
    });
  }

  // Melhorar links com dados da campanha
  enhanceLinkWithCampaignData(link) {
    const href = link.getAttribute('href');
    const sessionData = this.getSessionData();
    
    if (href.includes('triagem.html')) {
      // Adicionar parâmetros da campanha ao link de triagem
      const url = new URL(href, window.location.origin);
      
      if (sessionData.utm_source && sessionData.utm_source !== 'direct') {
        url.searchParams.set('utm_source', sessionData.utm_source);
        url.searchParams.set('utm_medium', sessionData.utm_medium);
        url.searchParams.set('utm_campaign', sessionData.utm_campaign);
        url.searchParams.set('utm_content', sessionData.utm_content);
        url.searchParams.set('utm_term', sessionData.utm_term);
      }
      
      if (sessionData.origem) {
        url.searchParams.set('origem', sessionData.origem);
      }
      
      if (sessionData.assunto) {
        url.searchParams.set('assunto', sessionData.assunto);
      }
      
      url.searchParams.set('session_id', sessionData.session_id);
      
      link.setAttribute('href', url.toString());
    }
  }

  // Melhorar formulários com dados da campanha
  enhanceFormWithCampaignData(form) {
    const sessionData = this.getSessionData();
    
    // Adicionar campos ocultos com dados da campanha
    const campaignFields = [
      { name: 'utm_source', value: sessionData.utm_source },
      { name: 'utm_medium', value: sessionData.utm_medium },
      { name: 'utm_campaign', value: sessionData.utm_campaign },
      { name: 'utm_content', value: sessionData.utm_content },
      { name: 'utm_term', value: sessionData.utm_term },
      { name: 'origem', value: sessionData.origem },
      { name: 'assunto', value: sessionData.assunto },
      { name: 'session_id', value: sessionData.session_id },
      { name: 'landing_page', value: sessionData.landing_page },
      { name: 'timestamp', value: sessionData.timestamp }
    ];

    campaignFields.forEach(field => {
      if (field.value && !form.querySelector(`input[name="${field.name}"]`)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = field.name;
        input.value = field.value;
        form.appendChild(input);
      }
    });
  }

  // Melhorar integração com WhatsApp
  enhanceWhatsAppIntegration() {
    // Sobrescrever função global se existir
    if (window.whatsappIntegration) {
      const originalOpenWhatsApp = window.whatsappIntegration.openWhatsApp;
      
      window.whatsappIntegration.openWhatsApp = function(context, customData = {}) {
        const sessionData = window.campaignTracking.getSessionData();
        
        // Adicionar dados da campanha ao customData
        const enhancedData = {
          ...customData,
          utm_source: sessionData.utm_source,
          utm_medium: sessionData.utm_medium,
          utm_campaign: sessionData.utm_campaign,
          session_id: sessionData.session_id
        };
        
        return originalOpenWhatsApp.call(this, context, enhancedData);
      };
    }
  }

  // Gerar relatório da sessão (para debug/análise)
  getSessionReport() {
    const data = this.getSessionData();
    return {
      session_id: data.session_id,
      source: data.utm_source,
      medium: data.utm_medium,
      campaign: data.utm_campaign,
      content: data.utm_content,
      origem: data.origem,
      assunto: data.assunto,
      landing_page: data.landing_page,
      timestamp: data.timestamp,
      is_organic: data.utm_source === 'direct' || data.utm_source === 'google',
      is_social: ['instagram', 'facebook', 'linkedin'].includes(data.utm_source),
      is_paid: data.utm_medium === 'cpc' || data.utm_medium === 'paid'
    };
  }

  // Método estático para obter instância
  static getInstance() {
    if (!window.campaignTracking) {
      window.campaignTracking = new CampaignTracking();
    }
    return window.campaignTracking;
  }
}

// Funções globais para uso
window.getCampaignData = function() {
  return CampaignTracking.getInstance().getSessionData();
};

window.getCampaignReport = function() {
  return CampaignTracking.getInstance().getSessionReport();
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  CampaignTracking.getInstance();
  
  // Log para debug (remover em produção)
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
    console.log('Campaign Tracking initialized:', window.getCampaignReport());
  }
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CampaignTracking;
}
