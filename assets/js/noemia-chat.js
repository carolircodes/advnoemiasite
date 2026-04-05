// NoemIA Chat System - Premium Conversational AI
class NoemiaChat {
  constructor() {
    this.messages = [];
    this.isLoading = false;
    this.init();
  }

  init() {
    this.setupElements();
    this.setupEventListeners();
    this.addWelcomeMessage();
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
  }

  addWelcomeMessage() {
    const welcomeText = `Olá! Sou a NoemIA, assistente inteligente da Noêmia Paixão Advocacia.

Posso ajudar você a:
• Entender melhor seu caso
• Identificar documentos necessários
• Explicar próximos passos
• Direcionar para atendimento especializado

Como posso ajudar você agora?`;

    this.addMessage('ai', welcomeText);
    this.showQuickSuggestions();
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isLoading) return;

    this.addMessage('user', message);
    this.input.value = '';
    this.setLoading(true);

    try {
      const response = await this.callNoemiaAPI(message);
      this.addMessage('ai', response);
      this.showContextualSuggestions();
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
      this.addMessage('ai', response);
      this.showContextualSuggestions();
    } catch (error) {
      this.addErrorMessage();
    } finally {
      this.setLoading(false);
    }
  }

  async callNoemiaAPI(message) {
    try {
      const response = await fetch('/api/noemia/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: 'public_chat',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Mostrar sugestões contextuais se disponíveis
        if (data.suggestions && data.suggestions.length > 0) {
          setTimeout(() => {
            this.showContextualSuggestions(data.suggestions);
          }, 1000);
        }
        return data.answer;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.warn('NoemIA API error:', error);
      return this.getFallbackResponse(message);
    }
  }

  getFallbackResponse(message) {
    const responses = {
      'beneficio': 'Para análise de benefícios previdenciários, preciso entender: qual benefício você busca? (aposentadoria, auxílio-doença, etc). Já possui algum benefício negado?',
      'documento': 'Os documentos essenciais variam por área. Para previdenciário: RG, CPF, comprovantes de residência, carteira de trabalho e laudos médicos.',
      'desconto': 'Descontos indevidos exigem análise rápida. Preciso saber: qual tipo de desconto? (empréstimo, tarifa, plano). Onde ocorreu?',
      'default': 'Entendi sua dúvida. Para análise completa, sugiro iniciar triagem especializada. Posso te direcionar para atendimento humano.'
    };

    const lowerMessage = message.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }
    return responses.default;
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

    this.messagesArea.appendChild(messageDiv);
    this.scrollToBottom();
    this.messages.push({ sender, text, time });
  }

  showTypingIndicator() {
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
    const suggestions = [
      'Posso receber benefício?',
      'Quais documentos separar?',
      'Tive desconto indevido',
      'Entender meu caso'
    ];

    this.showSuggestions(suggestions);
  }

  showContextualSuggestions(suggestions = null) {
    const defaultSuggestions = [
      { text: 'Iniciar triagem', primary: true, action: 'triagem' },
      { text: 'Enviar documentos', action: 'documents' },
      { text: 'Falar com advogada', action: 'lawyer' }
    ];

    const suggestionsToShow = suggestions || defaultSuggestions;
    this.showSuggestions(suggestionsToShow, true);
  }

  showSuggestions(suggestions, contextual = false) {
    const existingSuggestions = this.messagesArea.querySelector('.noemia-suggestions');
    if (existingSuggestions) {
      existingSuggestions.remove();
    }

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'noemia-suggestions';

    suggestions.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = `noemia-suggestion-chip ${suggestion.primary ? 'primary' : ''}`;
      
      // Lida com string ou objeto
      if (typeof suggestion === 'string') {
        chip.textContent = suggestion;
        chip.addEventListener('click', () => this.sendQuickMessage(chip.textContent));
      } else {
        chip.textContent = suggestion.text;
        chip.addEventListener('click', () => {
          if (suggestion.action) {
            this.handleSuggestionAction(suggestion.action);
          } else {
            this.sendQuickMessage(chip.textContent);
          }
        });
      }
      
      suggestionsDiv.appendChild(chip);
    });

    this.messagesArea.appendChild(suggestionsDiv);
    this.scrollToBottom();
  }

  handleSuggestionAction(action) {
    switch (action) {
      case 'triagem':
        window.open('triagem.html?area=geral&origem=noemia-chat&pagina=noemia.html', '_blank');
        break;
      case 'documents':
        this.addMessage('ai', 'Para enviar documentos, inicie a triagem especializada. Lá você poderá anexar todos os arquivos necessários.');
        break;
      case 'lawyer':
        this.addMessage('ai', 'Vou te direcionar para atendimento com a Dra. Noêmia. Ela terá acesso ao nosso histórico de conversa.');
        setTimeout(() => {
          window.open('triagem.html?area=geral&origem=noemia-advogada&pagina=noemia.html', '_blank');
        }, 2000);
        break;
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
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

  addErrorMessage() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'noemia-error-message';
    errorDiv.textContent = 'Desculpe, tive um problema. Tente novamente ou inicie triagem especializada.';
    
    this.messagesArea.appendChild(errorDiv);
    this.scrollToBottom();
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  formatMessage(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  scrollToBottom() {
    this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
  }
}

// Initialize NoemIA when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NoemiaChat();
});
