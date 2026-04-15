// NoemIA Unified System - Sistema unificado para todos os ambientes
class NoemiaUnified {
  constructor() {
    this.environment = this.detectEnvironment();
    this.apiEndpoint = this.getApiEndpoint();
    this.fallbackMode = false;
    this.init();
  }

  detectEnvironment() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('portal') || pathname.includes('/portal') || pathname.includes('/cliente') || pathname.includes('/internal')) {
      return 'portal';
    } else if (hostname === 'localhost' && pathname.includes('/noemia')) {
      return 'portal';
    } else {
      return 'public';
    }
  }

  getApiEndpoint() {
    if (this.environment === 'portal') {
      return '/api/noemia/chat';
    } else {
      return '/api/noemia/chat';
    }
  }

  init() {
    this.setupEventListeners();
    this.detectFallbackMode();
  }

  detectFallbackMode() {
    // Testar se a API está funcionando
    this.testApiConnection();
  }

  async testApiConnection() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          audience: 'visitor',
          history: []
        })
      });

      if (!response.ok) {
        this.fallbackMode = true;
        console.warn('[NoemIA] API não disponível, usando modo fallback');
      }
    } catch (error) {
      this.fallbackMode = true;
      console.warn('[NoemIA] Erro ao conectar com API, usando modo fallback:', error);
    }
  }

  getAudience() {
    // Detectar audience baseado no ambiente e contexto
    if (this.environment === 'portal') {
      // No portal, precisamos detectar se há usuário autenticado
      const profileData = this.getPortalProfile();
      if (profileData) {
        return profileData.role === 'cliente' ? 'client' : 
               profileData.role === 'advogada' || profileData.role === 'admin' ? 'staff' : 'visitor';
      }
    }
    return 'visitor';
  }

  getPortalProfile() {
    // Tentar obter dados do perfil do portal
    // Isso pode vir de variáveis globais, cookies, ou elementos na página
    try {
      // Verificar se há dados do perfil em algum lugar
      const profileElement = document.querySelector('[data-profile]');
      if (profileElement) {
        return JSON.parse(profileElement.dataset.profile);
      }
      
      // Verificar se há script com dados do perfil
      const profileScript = document.querySelector('#profile-data');
      if (profileScript) {
        return JSON.parse(profileScript.textContent);
      }
      
      // Verificar se há dados em window
      if (window.portalProfile) {
        return window.portalProfile;
      }
      
      // Verificar se há indicadores de usuário logado
      const userIndicator = document.querySelector('.user-name, .profile-name, [data-user-name]');
      if (userIndicator) {
        const userName = userIndicator.textContent || userIndicator.dataset.userName;
        if (userName) {
          // Inferir role baseado na página
          const pathname = window.location.pathname;
          const role = pathname.includes('/internal') || pathname.includes('/advogada') ? 'advogada' :
                      pathname.includes('/cliente') ? 'cliente' : 'visitor';
          return { full_name: userName, role, email: '' };
        }
      }
    } catch (error) {
      console.warn('[NoemIA] Erro ao detectar perfil do portal:', error);
    }
    return null;
  }

  async sendMessage(message, options = {}) {
    const audience = options.audience || this.getAudience();
    const history = options.history || [];
    const currentPath = window.location.pathname;

    if (this.fallbackMode) {
      return this.getFallbackResponse(message, audience);
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          audience,
          currentPath,
          history
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.ok && data.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        answer: data.answer,
        audience: data.audience || audience,
        suggestions: data.suggestions || []
      };

    } catch (error) {
      console.error('[NoemIA] Erro na API:', error);
      
      // Se falhar, ativar modo fallback e tentar novamente
      this.fallbackMode = true;
      return this.getFallbackResponse(message, audience, error.message);
    }
  }

  getFallbackResponse(message, audience, apiError = null) {
    const responses = {
      'visitor': {
        'beneficio': 'Para análise de benefícios previdenciários, é importante entender alguns pontos: qual tipo de benefício você busca (aposentadoria por idade, tempo de contribuição, auxílio-doença, etc)? Já possui algum benefício negado pelo INSS? Com base na sua situação, posso te orientar sobre os documentos essenciais e os próximos passos para uma análise mais completa.',
        'documento': 'Os documentos variam conforme a área do direito. Para casos previdenciários, geralmente precisamos de: RG, CPF, comprovantes de residência, carteira de trabalho com todas as páginas, laudos médicos (se aplicável), e decisões anteriores do INSS. Para consumeristas: contratos, faturas, comprovantes de pagamento e registros de ocorrência. Posso te ajudar a montar uma lista específica para o seu caso.',
        'desconto': 'Descontos indevidos exigem atenção rápida. Preciso entender melhor: o desconto ocorreu em conta bancária, folha de pagamento ou cartão de crédito? É um empréstimo que você não reconhece, uma tarifa abusiva ou outro tipo? Com essas informações, te orientarei sobre como proceder, quais provas reunir e se há necessidade de medida urgente.',
        'default': 'Entendi sua situação. Para te dar uma orientação mais precisa e personalizada, sugiro iniciar nossa triagem especializada. Lá você poderá detalhar melhor seu caso e eu conseguirei te direcionar para o melhor caminho jurídico, seja ele uma consulta, uma ação específica ou outro procedimento adequado ao seu perfil.'
      },
      'client': {
        'default': 'Posso ajudar você a entender melhor o que aparece no seu portal. Para analisar seu caso específico, preciso acessar seus dados. No momento, estou operando em modo limitado. Sugiro usar os recursos do portal ou falar diretamente com a equipe para obter informações personalizadas sobre seu caso.'
      },
      'staff': {
        'default': 'Para operação interna, preciso acesso aos dados operacionais do escritório. No momento, estou operando em modo limitado. Sugiro usar o painel operacional diretamente ou falar com a equipe de suporte técnico.'
      }
    };

    const lowerMessage = message.toLowerCase();
    let responseKey = 'default';

    if (audience === 'visitor') {
      if (lowerMessage.includes('benefício') || lowerMessage.includes('aposentadoria') || lowerMessage.includes('inss')) {
        responseKey = 'beneficio';
      } else if (lowerMessage.includes('documento') || lowerMessage.includes('arquivo') || lowerMessage.includes('comprovante')) {
        responseKey = 'documento';
      } else if (lowerMessage.includes('desconto') || lowerMessage.includes('cobrança') || lowerMessage.includes('indevido')) {
        responseKey = 'desconto';
      }
    }

    const response = responses[audience]?.[responseKey] || responses[audience]?.['default'] || responses['visitor']['default'];
    
    let fullResponse = response;
    
    if (apiError) {
      fullResponse += '\n\n*Nota: Estou operando em modo de backup devido a instabilidades técnicas. Para atendimento completo, sugiro contatar a equipe diretamente.*';
    }

    return {
      success: true,
      answer: fullResponse,
      audience,
      suggestions: this.getDefaultSuggestions(audience),
      fallbackMode: true
    };
  }

  getDefaultSuggestions(audience) {
    const suggestions = {
      'visitor': ['Iniciar triagem especializada', 'Ver áreas de atuação', 'Falar com a equipe'],
      'client': ['Ver meu painel', 'Enviar documentos', 'Agendar consulta'],
      'staff': ['Ver painel operacional', 'Analisar triagens', 'Ver casos recentes']
    };
    
    return suggestions[audience] || suggestions['visitor'];
  }

  setupEventListeners() {
    // Configurar listeners para formulários da NoemIA
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form');
      if (form && form.querySelector('textarea[name*="message"], textarea[name*="pergunta"]')) {
        this.handleFormSubmit(form, e);
      }
    });

    // Configurar listeners para botões de sugestão
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.prompt-chip, .suggestion-button, [data-suggestion]');
      if (button) {
        this.handleSuggestionClick(button, e);
      }
    });
  }

  async handleFormSubmit(form, event) {
    event.preventDefault();
    
    const textarea = form.querySelector('textarea[name*="message"], textarea[name*="pergunta"]');
    const message = textarea?.value?.trim();
    
    if (!message || message.length < 5) {
      this.showError('Escreva uma pergunta um pouco mais completa para eu conseguir ajudar.');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent;
    
    // Loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Consultando o atendente virtual...';
    }

    try {
      const response = await this.sendMessage(message);
      this.displayResponse(response, message);
      
      // Clear form
      if (textarea) {
        textarea.value = '';
      }
      
    } catch (error) {
      this.showError(error.message || 'Não consegui responder agora. Tente novamente em instantes.');
    } finally {
      // Restore button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  }

  handleSuggestionClick(button, event) {
    event.preventDefault();
    
    const suggestion = button.textContent?.trim() || button.dataset.suggestion;
    if (!suggestion) return;

    // Encontrar o formulário associado
    const form = button.closest('form') || document.querySelector('form');
    const textarea = form?.querySelector('textarea');
    
    if (textarea) {
      textarea.value = suggestion;
      textarea.focus();
      
      // Enviar automaticamente
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  }

  displayResponse(response, originalMessage) {
    // Encontrar o container de mensagens
    const messagesContainer = document.querySelector('.conversation-feed, .chat-messages, .messages-container');
    if (!messagesContainer) {
      console.warn('[NoemIA] Container de mensagens não encontrado');
      return;
    }

    // Adicionar mensagem do usuário
    this.addMessageToContainer(messagesContainer, 'user', originalMessage || response.message || 'Pergunta enviada');
    
    // Adicionar resposta da NoemIA
    this.addMessageToContainer(messagesContainer, 'assistant', response.answer);
    
    // Adicionar sugestões se houver
    if (response.suggestions && response.suggestions.length > 0) {
      this.addSuggestionsToContainer(messagesContainer, response.suggestions);
    }
  }

  addMessageToContainer(container, role, content) {
    const messageElement = document.createElement('article');
    messageElement.className = `chat-bubble ${role}`;
    messageElement.innerHTML = `
      <span>${role === 'assistant' ? 'Atendente virtual do escritorio' : 'Voce'}</span>
      <p>${content}</p>
    `;
    
    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
  }

  addSuggestionsToContainer(container, suggestions) {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'suggestions-container';
    
    suggestions.forEach(suggestion => {
      const button = document.createElement('button');
      button.className = 'prompt-chip suggestion-button';
      button.textContent = suggestion;
      button.dataset.suggestion = suggestion;
      suggestionsContainer.appendChild(button);
    });
    
    container.appendChild(suggestionsContainer);
  }

  showError(message) {
    // Encontrar onde mostrar o erro
    const errorContainer = document.querySelector('.error-notice, .error-container');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    } else {
      // Criar container de erro se não existir
      const messagesContainer = document.querySelector('.conversation-feed, .chat-messages, .messages-container');
      if (messagesContainer) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-notice';
        errorElement.textContent = message;
        messagesContainer.appendChild(errorElement);
      } else {
        alert(message); // Último recurso
      }
    }
  }

  // Método estático para uso global
  static getInstance() {
    if (!window.noemiaUnified) {
      window.noemiaUnified = new NoemiaUnified();
    }
    return window.noemiaUnified;
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  NoemiaUnified.getInstance();
});

// Funções globais para compatibilidade
window.sendNoemiaMessage = function(message, options) {
  return NoemiaUnified.getInstance().sendMessage(message, options);
};

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NoemiaUnified;
}
