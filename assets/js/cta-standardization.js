// CTA Standardization System - Padronização de chamadas para ação
class CTAStandardization {
  constructor() {
    this.ctaTypes = {
      'conversa': {
        text: 'Falar com a NoemIA',
        icon: '💬',
        action: 'noemia',
        priority: 'primary',
        destination: 'noemia.html#painel-pergunta'
      },
      'qualificacao': {
        text: 'Iniciar triagem',
        icon: '📋',
        action: 'triagem',
        priority: 'primary',
        destination: 'triagem.html'
      },
      'contato-direto': {
        text: 'Falar com a especialista',
        icon: '💬',
        action: 'whatsapp',
        priority: 'primary',
        destination: 'whatsapp'
      },
      'cliente-existente': {
        text: 'Área do cliente',
        icon: '👤',
        action: 'portal',
        priority: 'secondary',
        destination: 'https://portal.advnoemia.com.br/portal/login'
      },
      'equipe-interna': {
        text: 'Acesso interno',
        icon: '🔐',
        action: 'internal',
        priority: 'secondary',
        destination: '/admin'
      },
      'conteudo': {
        text: 'Ler artigos',
        icon: '📚',
        action: 'blog',
        priority: 'secondary',
        destination: 'blog.html'
      },
      'documento': {
        text: 'Enviar documentos',
        icon: '📄',
        action: 'documents',
        priority: 'secondary',
        destination: 'triagem.html?step=documents'
      },
      'agendar': {
        text: 'Agendar consulta',
        icon: '📅',
        action: 'schedule',
        priority: 'primary',
        destination: 'triagem.html?step=schedule'
      }
    };

    this.contexts = {
      'home': {
        title: 'Início',
        primary: ['qualificacao', 'conversa'],
        secondary: ['cliente-existente', 'conteudo']
      },
      'noemia': {
        title: 'NoemIA',
        primary: ['conversa', 'qualificacao'],
        secondary: ['cliente-existente', 'contato-direto']
      },
      'triagem': {
        title: 'Triagem',
        primary: ['contato-direto', 'agendar'],
        secondary: ['documento', 'conversa']
      },
      'portal': {
        title: 'Portal',
        primary: ['documento', 'agendar'],
        secondary: ['contato-direto', 'conteudo']
      },
      'blog': {
        title: 'Blog',
        primary: ['qualificacao', 'conversa'],
        secondary: ['conteudo', 'cliente-existente']
      },
      'areas': {
        title: 'Áreas de atuação',
        primary: ['qualificacao'],
        secondary: ['conversa', 'conteudo']
      }
    };

    this.init();
  }

  init() {
    this.standardizeExistingCTAs();
    this.setupEventListeners();
    this.createCTAHelper();
  }

  // Padronizar CTAs existentes
  standardizeExistingCTAs() {
    // Encontrar todos os links e botões que parecem CTAs
    const potentialCTAs = document.querySelectorAll(`
      a[href*="triagem.html"],
      a[href*="noemia.html"],
      a[href*="portal"],
      a[href*="blog.html"],
      a[href*="whatsapp"],
      .btn-primary,
      .btn-secondary,
      .btn-noemia
    `);

    potentialCTAs.forEach(element => {
      this.standardizeCTA(element);
    });
  }

  // Padronizar CTA individual
  standardizeCTA(element) {
    const href = element.getAttribute('href') || '';
    const text = element.textContent.trim();
    const currentClasses = element.className;

    // Identificar tipo de CTA baseado no href e texto
    let ctaType = this.identifyCTAType(href, text);
    
    if (ctaType) {
      const config = this.ctaTypes[ctaType];
      
      // Adicionar classes padronizadas
      element.classList.add('cta-standardized', `cta-${ctaType}`, `cta-${config.priority}`);
      
      // Adicionar atributos para rastreamento
      element.setAttribute('data-cta-type', ctaType);
      element.setAttribute('data-cta-action', config.action);
      element.setAttribute('data-cta-priority', config.priority);
      
      // Adicionar ícone se não existir
      if (!element.querySelector('.cta-icon') && config.icon) {
        const icon = document.createElement('span');
        icon.className = 'cta-icon';
        icon.textContent = config.icon;
        icon.setAttribute('aria-hidden', 'true');
        
        if (element.querySelector('span')) {
          element.insertBefore(icon, element.firstChild);
        } else {
          element.prepend(icon);
        }
      }
      
      // Melhorar texto se for genérico
      if (this.isGenericText(text)) {
        element.textContent = config.text;
      }
    }
  }

  // Identificar tipo de CTA
  identifyCTAType(href, text) {
    const lowerText = text.toLowerCase();
    const lowerHref = href.toLowerCase();

    // Baseado no href
    if (lowerHref.includes('noemia.html')) return 'conversa';
    if (lowerHref.includes('triagem.html')) return 'qualificacao';
    if (lowerHref.includes('portal')) return 'cliente-existente';
    if (lowerHref.includes('blog.html')) return 'conteudo';
    if (lowerHref.includes('whatsapp') || lowerHref.includes('wa.me')) return 'contato-direto';

    // Baseado no texto
    if (lowerText.includes('noemia') || lowerText.includes('convers') || lowerText.includes('chat')) return 'conversa';
    if (lowerText.includes('triagem') || lowerText.includes('qualific') || lowerText.includes('iniciar')) return 'qualificacao';
    if (lowerText.includes('cliente') || lowerText.includes('portal') || lowerText.includes('já sou')) return 'cliente-existente';
    if (lowerText.includes('especialista') || lowerText.includes('whatsapp') || lowerText.includes('contato')) return 'contato-direto';
    if (lowerText.includes('artigo') || lowerText.includes('blog') || lowerText.includes('conteúdo')) return 'conteudo';
    if (lowerText.includes('documento') || lowerText.includes('enviar')) return 'documento';
    if (lowerText.includes('agendar') || lowerText.includes('consulta')) return 'agendar';

    return null;
  }

  // Verificar se texto é genérico
  isGenericText(text) {
    const genericTexts = [
      'clique aqui',
      'saiba mais',
      'continue',
      'próximo',
      'enviar',
      'submit',
      'cadastrar'
    ];
    
    return genericTexts.some(generic => 
      text.toLowerCase().includes(generic)
    );
  }

  // Configurar event listeners
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const ctaElement = e.target.closest('.cta-standardized');
      if (ctaElement) {
        this.handleCTAClick(ctaElement, e);
      }
    });
  }

  // Lidar com clique em CTA
  handleCTAClick(element, event) {
    const ctaType = element.getAttribute('data-cta-type');
    const action = element.getAttribute('data-cta-action');
    const config = this.ctaTypes[ctaType];

    if (!config) return;

    // Rastreamento
    this.trackCTAClick(ctaType, action, element);

    // Ações especiais baseadas no tipo
    switch (action) {
      case 'whatsapp':
        event.preventDefault();
        const context = this.getContextFromPage();
        window.openWhatsApp(context);
        break;
        
      case 'noemia':
        // Scroll suave para a seção da NoemIA se estiver na mesma página
        if (config.destination.includes('#')) {
          const targetId = config.destination.split('#')[1];
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            event.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        break;
        
      case 'documents':
        // Adicionar contexto de documentos
        event.preventDefault();
        window.location.href = config.destination + '&origem=' + this.getContextFromPage();
        break;
    }
  }

  // Obter contexto da página atual
  getContextFromPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'home';
    
    // Tentar mapear para contextos conhecidos
    if (page.includes('noemia')) return 'noemia';
    if (page.includes('triagem')) return 'triagem';
    if (page.includes('portal')) return 'portal';
    if (page.includes('blog')) return 'blog';
    if (path.includes('direito-')) return 'areas';
    
    return 'home';
  }

  // Rastrear clique em CTA
  trackCTAClick(ctaType, action, element) {
    // Aqui você pode integrar com Google Analytics, Facebook Pixel, etc.
    const trackingData = {
      event: 'cta_click',
      cta_type: ctaType,
      cta_action: action,
      page: this.getContextFromPage(),
      element_text: element.textContent.trim(),
      timestamp: new Date().toISOString()
    };

    // Enviar para analytics (exemplo)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'cta_click', {
        cta_type: ctaType,
        cta_action: action,
        page: this.getContextFromPage()
      });
    }

    // Log para debug
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
      console.log('CTA Click tracked:', trackingData);
    }
  }

  // Criar helper para gerar CTAs programaticamente
  createCTAHelper() {
    window.generateCTA = function(type, options = {}) {
      const ctaSystem = CTAStandardization.getInstance();
      return ctaSystem.generateCTA(type, options);
    };

    window.generateCTAGroup = function(context, options = {}) {
      const ctaSystem = CTAStandardization.getInstance();
      return ctaSystem.generateCTAGroup(context, options);
    };
  }

  // Gerar CTA individual
  generateCTA(type, options = {}) {
    const config = this.ctaTypes[type];
    if (!config) return null;

    const button = document.createElement('a');
    button.href = config.destination;
    button.className = `cta-standardized cta-${type} cta-${config.priority}`;
    button.setAttribute('data-cta-type', type);
    button.setAttribute('data-cta-action', config.action);
    button.setAttribute('data-cta-priority', config.priority);

    if (options.customText) {
      button.textContent = options.customText;
    } else {
      button.innerHTML = `<span class="cta-icon">${config.icon}</span> ${config.text}`;
    }

    if (options.className) {
      button.className += ' ' + options.className;
    }

    if (options.id) {
      button.id = options.id;
    }

    return button;
  }

  // Gerar grupo de CTAs para um contexto
  generateCTAGroup(context, options = {}) {
    const contextConfig = this.contexts[context];
    if (!contextConfig) return null;

    const container = document.createElement('div');
    container.className = 'cta-group';
    container.setAttribute('data-cta-context', context);

    // CTAs primários
    const primaryContainer = document.createElement('div');
    primaryContainer.className = 'cta-group-primary';
    
    contextConfig.primary.forEach(type => {
      const cta = this.generateCTA(type, options.primary);
      if (cta) primaryContainer.appendChild(cta);
    });

    // CTAs secundários
    const secondaryContainer = document.createElement('div');
    secondaryContainer.className = 'cta-group-secondary';
    
    contextConfig.secondary.forEach(type => {
      const cta = this.generateCTA(type, options.secondary);
      if (cta) secondaryContainer.appendChild(cta);
    });

    container.appendChild(primaryContainer);
    container.appendChild(secondaryContainer);

    return container;
  }

  // Método estático para obter instância
  static getInstance() {
    if (!window.ctaStandardization) {
      window.ctaStandardization = new CTAStandardization();
    }
    return window.ctaStandardization;
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  CTAStandardization.getInstance();
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CTAStandardization;
}
