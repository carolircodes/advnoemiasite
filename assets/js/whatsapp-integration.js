// WhatsApp Integration Helper - Sistema centralizado para links do WhatsApp
class WhatsAppIntegration {
  constructor() {
    this.phoneNumber = '5584996248241';
    this.baseUrl = 'https://wa.me/';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.captureUTMParameters();
  }

  // Capturar parâmetros UTM da URL
  captureUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    this.utmParams = {
      source: urlParams.get('utm_source') || 'site',
      medium: urlParams.get('utm_medium') || 'organic',
      campaign: urlParams.get('utm_campaign') || '',
      content: urlParams.get('utm_content') || '',
      term: urlParams.get('utm_term') || ''
    };
  }

  // Gerar mensagem baseada no contexto
  generateMessage(context, customData = {}) {
    const messages = {
      'noemia-chat': `Olá, vim pela NoemIA e quero falar com a advogada sobre meu caso. Já conversei com a assistente e preciso de atendimento especializado.`,
      'noemia-hero': `Olá, vim pelo site pela NoemIA e quero entender melhor meu caso com a advogada.`,
      'noemia-home': `Olá, vim pela área da NoemIA no site e quero falar com a especialista sobre meu caso.`,
      'triagem': `Olá, preenchi a triagem no site e quero continuar meu atendimento. Meu caso é sobre ${customData.area || 'direito em geral'}.`,
      'home': `Olá, vim pelo site e quero orientação sobre documentos e próximos passos para meu caso.`,
      'home-areas': `Olá, vim pela área de ${customData.area || 'atuação'} do site e quero falar com a especialista.`,
      'home-processo': `Olá, vim pela seção "como funciona" do site e quero iniciar meu atendimento.`,
      'home-conteudo': `Olá, vim pelo conteúdo do site e quero entender melhor meu caso.`,
      'home-direcionamento': `Olá, vim pelo site e preciso saber qual é o melhor caminho para meu atendimento.`,
      'noemia-footer': `Olá, vim pelo footer do site da NoemIA e quero falar com a especialista.`,
      'noemia-flutuante': `Olá, vim pelo botão flutuante do site e quero falar com a especialista.`,
      'noemia-previdenciario': `Olá, vim pela NoemIA e quero falar sobre um caso de Direito Previdenciário.`,
      'noemia-consumidor': `Olá, vim pela NoemIA e quero falar sobre um caso de Direito do Consumidor e Bancário.`,
      'noemia-familia': `Olá, vim pela NoemIA e quero falar sobre um caso de Direito de Família.`,
      'noemia-civil': `Olá, vim pela NoemIA e quero falar sobre um caso de Direito Civil.`,
      'noemia-cta': `Olá, vim pela NoemIA e quero dar o próximo passo com mais clareza em meu caso.`,
      'noemia-advogada': `Olá, vim pela NoemIA e quero falar diretamente com a Dra. Noêmia sobre meu caso.`,
      'portal': `Olá, sou cliente do portal e preciso de ajuda com meu caso.`,
      'instagram': `Olá, vim pelo Instagram e quero falar com a advogada sobre meu caso.`,
      'default': `Olá, vim pelo site e quero falar com a advogada sobre meu caso.`
    };

    let message = messages[context] || messages['default'];
    
    // Adicionar dados personalizados
    if (customData.nome) {
      message = `Olá, meu nome é ${customData.nome}. ${message}`;
    }
    
    if (customData.urgencia) {
      message += ` Minha situação é ${customData.urgencia}.`;
    }

    // Adicionar parâmetros UTM para rastreamento
    if (this.utmParams.source !== 'site' || this.utmParams.campaign) {
      const utmString = Object.entries(this.utmParams)
        .filter(([key, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      message += ` (Origem: ${utmString})`;
    }

    return message;
  }

  // Criar link do WhatsApp
  createWhatsAppLink(context, customData = {}) {
    const message = this.generateMessage(context, customData);
    const encodedMessage = encodeURIComponent(message);
    return `${this.baseUrl}${this.phoneNumber}?text=${encodedMessage}`;
  }

  // Abrir WhatsApp
  openWhatsApp(context, customData = {}) {
    const link = this.createWhatsAppLink(context, customData);
    window.open(link, '_blank');
  }

  // Configurar event listeners para links existentes
  setupEventListeners() {
    // Links com data-whatsapp-context
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-whatsapp-context]');
      if (target) {
        e.preventDefault();
        const context = target.dataset.whatsappContext;
        const customData = target.dataset.whatsappData ? JSON.parse(target.dataset.whatsappData) : {};
        this.openWhatsApp(context, customData);
      }
    });

    // Botões flutuantes
    const floatingButtons = document.querySelectorAll('.floating-contact[href*="triagem.html"]');
    floatingButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.openWhatsApp('home');
      });
    });
  }

  // Método estático para uso global
  static getInstance() {
    if (!window.whatsappIntegration) {
      window.whatsappIntegration = new WhatsAppIntegration();
    }
    return window.whatsappIntegration;
  }
}

// Funções globais para facilitar uso
window.openWhatsApp = function(context, customData = {}) {
  WhatsAppIntegration.getInstance().openWhatsApp(context, customData);
};

window.createWhatsAppLink = function(context, customData = {}) {
  return WhatsAppIntegration.getInstance().createWhatsAppLink(context, customData);
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  WhatsAppIntegration.getInstance();
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WhatsAppIntegration;
}
