// NoemIA Chat System - Sistema unificado para todos os ambientes
class NoemiaChat {
  constructor() {
    this.environment = this.detectEnvironment();
    this.apiEndpoint = this.getApiEndpoint();
    this.fallbackMode = false;
    this.messages = [];
    this.isLoading = false;
    this.sessionId = this.getOrCreateSessionId();
    this.init();
  }

  detectEnvironment() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('portal') || pathname.includes('/portal') || pathname.includes('/cliente') || pathname.includes('/internal')) {
      return 'portal';
    } else if (hostname === 'localhost' && (pathname.includes('/noemia') || pathname.includes('/portal'))) {
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

  getOrCreateSessionId() {
    // Apenas para visitantes do site público
    if (this.environment !== 'public') {
      return null; // Portal usa profile.id
    }

    const storageKey = 'noemia_visitor_session_id';
    let sessionId = localStorage.getItem(storageKey);

    if (!sessionId) {
      // Gerar ID estável: visitor-UUID
      sessionId = 'visitor-' + this.generateUUID();
      localStorage.setItem(storageKey, sessionId);
      console.log('[NoemIA] Novo sessionId gerado:', sessionId);
    } else {
      console.log('[NoemIA] SessionId existente recuperado:', sessionId);
    }

    return sessionId;
  }

  generateUUID() {
    // Gerar UUID v4 simples
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  init() {
    this.setupElements();
    this.setupEventListeners();
    this.addWelcomeMessage();
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

  setupElements() {
    this.chatContainer = document.querySelector('.noemia-chat-container');
    this.messagesArea = document.querySelector('.noemia-chat-messages');
    this.inputArea = document.querySelector('.noemia-input-area');
    this.input = document.querySelector('.noemia-input');
    this.sendButton = document.querySelector('.noemia-send-button');
    this.quickActions = document.querySelectorAll('.noemia-quick-action');
  }

  setupEventListeners() {
    if (!this.sendButton || !this.input) return;

    // Send button
    this.sendButton.addEventListener('click', () => this.sendMessage());
    
    // Enter key to send
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Quick actions
    this.quickActions.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const question = button.textContent.trim();
        
        // Se for "Entender meu caso", preenche o campo
        if (question === 'Entender meu caso') {
          this.input.value = 'Quero entender melhor meu caso e saber qual próximo passo faz mais sentido.';
          this.input.focus();
          this.input.style.height = 'auto';
          this.input.style.height = (this.input.scrollHeight) + 'px';
        } else {
          this.sendQuickMessage(question);
        }
      });
    });

    // Configurar listeners para formulários da NoemIA (compatibilidade com portal)
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form');
      if (form && form.querySelector('textarea[name*="message"], textarea[name*="pergunta"]')) {
        this.handleFormSubmit(form, e);
      }
    });

    // Configurar listeners para botões de sugestão (compatibilidade com portal)
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.prompt-chip, .suggestion-button, [data-suggestion]');
      if (button) {
        this.handleSuggestionClick(button, e);
      }
    });
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isLoading) return;

    this.addMessage('user', message);
    this.input.value = '';
    this.setLoading(true);

    try {
      const response = await this.callNoemiaAPI(message);
      this.addMessage('ai', response.answer);
      this.showContextualSuggestions(response.suggestions);
    } catch (error) {
      this.addErrorMessage();
    } finally {
      this.setLoading(false);
    }
  }

  async sendQuickMessage(question) {
    if (this.isLoading) return;

    this.addMessage('user', question);
    this.setLoading(true);

    try {
      const response = await this.callNoemiaAPI(question);
      this.addMessage('ai', response.answer);
      this.showContextualSuggestions(response.suggestions);
    } catch (error) {
      this.addErrorMessage();
    } finally {
      this.setLoading(false);
    }
  }

  async callNoemiaAPI(message) {
    const audience = this.getAudience();
    const history = this.messages.slice(-8).map(msg => ({
      role: msg.sender === 'ai' ? 'assistant' : 'user',
      content: msg.text
    }));

    if (this.fallbackMode) {
      return this.getFallbackResponse(message, audience);
    }

    try {
      // Adaptar payload baseado no ambiente
      let payload, expectedResponseFormat;
      
      if (this.environment === 'portal') {
        // Formato do portal
        payload = {
          message: message,
          audience: audience,
          currentPath: window.location.pathname,
          history: history
        };
        expectedResponseFormat = 'portal';
      } else {
        // Formato público
        payload = {
          message: message,
          audience: audience,
          currentPath: window.location.pathname,
          history: history,
          sessionId: this.sessionId // Incluir sessionId estável para visitantes
        };
        expectedResponseFormat = 'public';
      }

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Adaptar resposta baseado no formato esperado
      if (expectedResponseFormat === 'portal') {
        if (!data.ok && data.error) {
          throw new Error(data.error);
        }
        
        return {
          answer: data.answer,
          audience: data.audience || audience,
          suggestions: data.suggestions || []
        };
      } else {
        // Formato público
        if (!data.success && data.error) {
          throw new Error(data.error);
        }
        
        return {
          answer: data.answer,
          audience: 'visitor',
          suggestions: data.suggestions || []
        };
      }

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
        'default': 'Posso ajudar você a entender melhor o que aparece no seu portal. Como cliente autenticado, você tem acesso a informações importantes do seu caso. Para análise completa do seu caso específico, sugiro usar os recursos do portal ou falar diretamente com a equipe responsável.'
      },
      'staff': {
        'default': 'Como perfil interno, posso ajudar na rotina operacional do escritório. Para operação completa, acesse o painel operacional para dados detalhados de filas, triagens e métricas.'
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
      fullResponse += '\n\n*Nota: Estou operando em modo de backup devido a instabilidades técnicas.*';
    }

    return {
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

  handleFormSubmit(form, event) {
    event.preventDefault();
    
    const textarea = form.querySelector('textarea[name*="message"], textarea[name*="pergunta"]');
    const message = textarea?.value?.trim();
    
    if (!message || message.length < 5) {
      this.showError('Escreva uma pergunta um pouco mais completa para eu conseguir ajudar.');
      return;
    }

    // Usar o sistema de mensagens existente
    this.input.value = message;
    this.sendMessage();
  }

  handleSuggestionClick(button, event) {
    event.preventDefault();
    
    const suggestion = button.textContent?.trim() || button.dataset.suggestion;
    if (!suggestion) return;

    // Encontrar o formulário associado ou usar o sistema atual
    if (this.input) {
      this.input.value = suggestion;
      this.input.focus();
      this.sendMessage();
    } else {
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
  }

  showError(message) {
    // Encontrar onde mostrar o erro
    const errorContainer = document.querySelector('.error-notice, .error-container');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    } else {
      // Criar container de erro se não existir
      if (this.messagesArea) {
        const errorElement = document.createElement('div');
        errorElement.className = 'noemia-error-message';
        errorElement.textContent = message;
        this.messagesArea.appendChild(errorElement);
      } else {
        alert(message); // Último recurso
      }
    }
  }

  addWelcomeMessage() {
    const audience = this.getAudience();
    const welcomeTexts = {
      'visitor': `Olá! Sou a NoemIA, assistente inteligente da Noêmia Paixão Advocacia.

Estou aqui para ajudar você a entender melhor sua situação jurídica com clareza e organização.

Posso te orientar sobre:
• Seus direitos e possibilidades em diferentes áreas do direito
• Quais documentos são importantes para o seu caso
• Os melhores próximos passos a seguir
• Como se preparar para um atendimento especializado

Por onde você gostaria de começar? Me conte um pouco sobre sua situação ou escolha uma das sugestões abaixo.`,
      'client': `Olá! Sou a NoemIA, assistente do portal.

Posso ajudar você a entender melhor o que aparece no seu portal:
• Status do seu caso
• Documentos pendentes
• Próximas datas
• Atualizações importantes

Pergunte sobre qualquer informação que você vê no seu portal.`,
      'staff': `Olá! Sou a NoemIA, assistente operacional.

Posso apoiar sua rotina com:
• Resumo de prioridades
• Análise de triagens
• Sugestões de próximos passos
• Dados operacionais

Como posso ajudar na operação hoje?`
    };

    const welcomeText = welcomeTexts[audience] || welcomeTexts['visitor'];
    this.addMessage('ai', welcomeText);
    this.showQuickSuggestions();
  }

  addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `noemia-chat-message ${sender}`;
    
    const time = new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    messageDiv.innerHTML = `
      <div class="noemia-avatar ${sender}">
        ${sender === 'ai' ? '🤖' : '👤'}
      </div>
      <div class="noemia-message-content">
        <div class="noemia-message-text">${this.formatMessage(text)}</div>
        <div class="noemia-message-time">${time}</div>
      </div>
    `;

    if (this.messagesArea) {
      this.messagesArea.appendChild(messageDiv);
      this.scrollToBottom();
    }
    
    this.messages.push({ sender, text, time });
  }

  showTypingIndicator() {
    if (!this.messagesArea) return null;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'noemia-typing-indicator';
    typingDiv.innerHTML = `
      <div class="noemia-typing-dot"></div>
      <div class="noemia-typing-dot"></div>
      <div class="noemia-typing-dot"></div>
    `;
    
    this.messagesArea.appendChild(typingDiv);
    this.scrollToBottom();
    return typingDiv;
  }

  removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  showQuickSuggestions() {
    const audience = this.getAudience();
    const suggestions = {
      'visitor': ['Posso receber benefício?', 'Quais documentos separar?', 'Tive desconto indevido', 'Entender meu caso'],
      'client': ['Explique o status atual do meu caso', 'Quais documentos estão pendentes?', 'Qual é a próxima data importante?'],
      'staff': ['Resuma as prioridades de hoje', 'Quais triagens precisam de atenção?', 'Mostre casos aguardando cliente']
    };

    const suggestionList = suggestions[audience] || suggestions['visitor'];
    this.showSuggestions(suggestionList);
  }

  showContextualSuggestions(suggestions = null) {
    const defaultSuggestions = {
      'visitor': ['Iniciar triagem', 'Enviar documentos', 'Falar com advogada'],
      'client': ['Ver meu painel', 'Enviar documentos', 'Agendar consulta'],
      'staff': ['Ver painel operacional', 'Analisar triagens', 'Ver casos recentes']
    };

    const audience = this.getAudience();
    const suggestionsToShow = suggestions || defaultSuggestions[audience] || defaultSuggestions['visitor'];
    this.showSuggestions(suggestionsToShow);
  }

  showSuggestions(suggestions) {
    if (!this.messagesArea) return;

    const existingSuggestions = this.messagesArea.querySelector('.noemia-suggestions');
    if (existingSuggestions) {
      existingSuggestions.remove();
    }

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'noemia-suggestions';

    suggestions.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'noemia-suggestion-chip';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        if (typeof suggestion === 'string') {
          this.sendQuickMessage(suggestion);
        }
      });
      
      suggestionsDiv.appendChild(chip);
    });

    this.messagesArea.appendChild(suggestionsDiv);
    this.scrollToBottom();
  }

  setLoading(loading) {
    this.isLoading = loading;
    
    if (this.sendButton) {
      this.sendButton.disabled = loading;
      
      if (loading) {
        this.sendButton.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span> Analisando...';
        this.sendButton.classList.add('loading');
        this.typingIndicator = this.showTypingIndicator();
      } else {
        this.sendButton.innerHTML = 'Enviar <span>→</span>';
        this.sendButton.classList.remove('loading');
        this.removeTypingIndicator(this.typingIndicator);
      }
    }
  }

  addErrorMessage() {
    const errorText = 'Desculpe, tive um problema. Tente novamente ou inicie triagem especializada.';
    
    if (this.messagesArea) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'noemia-error-message';
      errorDiv.textContent = errorText;
      
      this.messagesArea.appendChild(errorDiv);
      this.scrollToBottom();
      
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    } else {
      this.showError(errorText);
    }
  }

  formatMessage(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  scrollToBottom() {
    if (this.messagesArea) {
      this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }
  }
}

// Initialize NoemIA when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NoemiaChat();
});

// Funções globais para compatibilidade
window.sendNoemiaMessage = function(message, options) {
  const chat = new NoemiaChat();
  return chat.callNoemiaAPI(message);
};
