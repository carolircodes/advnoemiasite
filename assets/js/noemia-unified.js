// NoemIA Unified System - Sistema unificado para todos os ambientes
class NoemiaUnified {
  constructor() {
    this.environment = this.detectEnvironment();
    this.apiEndpoint = this.getApiEndpoint();
    this.fallbackMode = false;
    this.currentGuidedStage = 'initial';
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
    this.setupGuidedFlows();
    this.setupEventListeners();
    this.detectFallbackMode();
    this.renderGuidedOptions(this.currentGuidedStage);
  }

  setupGuidedFlows() {
    this.guidedFlows = {
      initial: {
        pill: 'Etapa inicial',
        options: [
          { id: 'understand_case', label: 'Quero entender meu caso' },
          { id: 'documents', label: 'Quais documentos ajudam agora?' },
          { id: 'consultation', label: 'Ja faz sentido marcar consulta?' },
          { id: 'urgent', label: 'Meu caso parece urgente' },
          { id: 'banking', label: 'Tenho problema com banco' },
          { id: 'social_security', label: 'E questao previdenciaria' },
          { id: 'family', label: 'E questao de familia' },
          { id: 'other', label: 'Quero falar sobre outro assunto' }
        ]
      },
      clarify: {
        pill: 'Entendimento inicial',
        options: [
          { id: 'explain_more', label: 'Me explique melhor' },
          { id: 'documents', label: 'Quais documentos separar' },
          { id: 'describe_case', label: 'Quero descrever o que aconteceu' },
          { id: 'consultation', label: 'Quero avancar para consulta' },
          { id: 'back_initial', label: 'Mudar assunto' }
        ]
      },
      documents: {
        pill: 'Documentos e contexto',
        options: [
          { id: 'area_previdenciario', label: 'Caso previdenciario' },
          { id: 'area_bancario', label: 'Problema bancario' },
          { id: 'area_familia', label: 'Questao de familia' },
          { id: 'describe_case', label: 'Quero explicar meu caso' },
          { id: 'consultation', label: 'Ja quero seguir' }
        ]
      },
      urgency: {
        pill: 'Prioridade do caso',
        options: [
          { id: 'urgent_now', label: 'Existe prazo ou bloqueio agora' },
          { id: 'urgent_soon', label: 'Preciso de orientacao em breve' },
          { id: 'consultation', label: 'Quero avancar para consulta' },
          { id: 'describe_case', label: 'Vou explicar melhor' },
          { id: 'back_initial', label: 'Voltar' }
        ]
      },
      consultation: {
        pill: 'Avanco para consulta',
        options: [
          { id: 'open_triage', label: 'Abrir etapa final para consulta' },
          { id: 'describe_case', label: 'Antes vou explicar melhor' },
          { id: 'documents', label: 'Quais dados ajudam agora?' },
          { id: 'back_initial', label: 'Voltar' }
        ]
      }
    };
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

    document.addEventListener('click', (e) => {
      const button = e.target.closest('#openProgressiveTriage');
      if (button) {
        e.preventDefault();
        this.openProgressiveTriage();
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
    
    const guidedOption = button.dataset.guidedOption;
    if (guidedOption) {
      this.handleGuidedOption(guidedOption, button.textContent?.trim() || '');
      return;
    }

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

  handleGuidedOption(optionId, label) {
    const journeys = {
      understand_case: {
        answer: 'Posso te ajudar a entender o ponto principal do seu caso e mostrar o proximo passo mais sensato. Se voce me contar a area ou a situacao central, eu organizo isso com mais clareza.',
        nextStage: 'clarify'
      },
      explain_more: {
        answer: 'O melhor primeiro passo costuma ser entender tres pontos: qual area juridica envolve seu caso, se existe urgencia real e quais documentos ou fatos ja estao disponiveis. Com isso, o atendimento fica muito mais preciso.',
        nextStage: 'clarify'
      },
      documents: {
        answer: 'Os documentos ideais mudam conforme a area, mas normalmente ja ajudam nome completo, cidade, registros do que aconteceu, comprovantes, mensagens, extratos, contratos ou laudos. Posso te guiar por area para ficar mais objetivo.',
        nextStage: 'documents'
      },
      consultation: {
        answer: 'Se voce ja sente que precisa de orientacao mais profunda, faz sentido preparar a consulta. Antes disso, posso abrir a etapa final para voce deixar o contexto essencial do caso de forma organizada.',
        nextStage: 'consultation'
      },
      urgent: {
        answer: 'Quando ha prazo, bloqueio, corte de beneficio, negativacao, desconto indevido ativo ou conflito familiar sensivel, vale tratar como prioridade. Posso te ajudar a separar o que e urgente e o que deve ser reunido agora.',
        nextStage: 'urgency'
      },
      urgent_now: {
        answer: 'Se existe risco imediato, a melhor decisao e avancar para a etapa final de consulta e deixar o contexto essencial pronto agora. Assim o escritorio recebe seu caso mais bem organizado.',
        nextStage: 'consultation',
        action: 'open_triage'
      },
      urgent_soon: {
        answer: 'Se a urgencia e alta, mas nao imediata, ja vale reunir o contexto principal, documentos e objetivo do atendimento. Posso te conduzir por isso sem pressa desnecessaria.',
        nextStage: 'clarify'
      },
      banking: {
        answer: 'Em problema bancario, geralmente importa entender se houve desconto indevido, fraude, emprestimo nao reconhecido, negativacao, cobranca abusiva ou contrato mal executado. Se quiser, posso te conduzir para a etapa final ou ajudar a entender os documentos certos.',
        nextStage: 'clarify',
        area: 'bancario'
      },
      social_security: {
        answer: 'Em questao previdenciaria, normalmente ajuda saber se voce busca aposentadoria, revisao, beneficio negado, corte, BPC ou incapacidade. Com esse eixo definido, o escritorio recebe seu caso muito melhor organizado.',
        nextStage: 'clarify',
        area: 'previdenciario'
      },
      family: {
        answer: 'Em direito de familia, os pontos mais delicados costumam envolver guarda, pensao, convivencia, divorcio e urgencia emocional ou patrimonial. Posso te orientar sobre o que faz sentido reunir e quando a consulta entra como melhor proximo passo.',
        nextStage: 'clarify',
        area: 'familia'
      },
      other: {
        answer: 'Sem problema. O importante e comecar com clareza. Se quiser, descreva o que aconteceu com suas palavras ou me diga qual tipo de duvida quer resolver primeiro.',
        nextStage: 'clarify'
      },
      area_previdenciario: {
        answer: 'Para caso previdenciario, ja ajudam numero do beneficio se existir, carta do INSS, CNIS, laudos, carteira de trabalho e um resumo do que voce espera resolver.',
        nextStage: 'consultation',
        area: 'previdenciario'
      },
      area_bancario: {
        answer: 'Para caso bancario, extratos, contratos, comprovantes, prints, notificacoes e datas dos descontos ou cobrancas costumam acelerar bastante a analise inicial.',
        nextStage: 'consultation',
        area: 'bancario'
      },
      area_familia: {
        answer: 'Para questao de familia, normalmente ajudam documentos pessoais, registro da relacao familiar, historico objetivo da situacao e, quando houver, conversas ou comprovantes ligados ao conflito.',
        nextStage: 'consultation',
        area: 'familia'
      },
      describe_case: {
        answer: 'Perfeito. Escreva com suas palavras o que aconteceu, o que mais te preocupa agora e, se souber, qual area juridica envolve seu caso. Eu sigo a partir disso.',
        nextStage: 'clarify',
        action: 'focus_textarea'
      },
      open_triage: {
        answer: 'Abri a etapa final para consulta logo abaixo. Ela pede apenas o contexto essencial para que o atendimento humano receba seu caso com mais precisao.',
        nextStage: 'consultation',
        action: 'open_triage'
      },
      back_initial: {
        answer: 'Sem problema. Vou voltar para as opcoes iniciais para voce escolher outro caminho com tranquilidade.',
        nextStage: 'initial'
      }
    };

    const step = journeys[optionId];
    if (!step) {
      return;
    }

    const feed = document.querySelector('.conversation-feed');
    if (feed) {
      this.addMessageToContainer(feed, 'user', label || 'Quero seguir por este caminho');
      this.addMessageToContainer(feed, 'assistant', step.answer);
    }

    if (step.area) {
      this.applyGuidedArea(step.area);
    }

    if (step.action === 'focus_textarea') {
      this.focusTextarea();
    }

    if (step.action === 'open_triage') {
      this.openProgressiveTriage();
    }

    this.renderGuidedOptions(step.nextStage || 'initial');
  }

  renderGuidedOptions(stageId) {
    const stage = this.guidedFlows[stageId] || this.guidedFlows.initial;
    const container = document.querySelector('.prompt-chip-grid');
    const pill = document.getElementById('guidedProgressPill');

    this.currentGuidedStage = stageId;

    if (pill) {
      pill.textContent = stage.pill || 'Etapa inicial';
    }

    if (!container) {
      return;
    }

    container.innerHTML = '';
    stage.options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'prompt-chip';
      button.dataset.guidedOption = option.id;
      button.textContent = option.label;
      container.appendChild(button);
    });
  }

  applyGuidedArea(area) {
    const problemField = document.getElementById('leadProblemTypeHome');
    const areaField = document.querySelector('[data-triage-area-input]');

    if (problemField) {
      problemField.value = area;
    }

    if (areaField) {
      areaField.value = area;
    }
  }

  focusTextarea() {
    const textarea = document.getElementById('homeAssistantMessage');
    if (textarea) {
      textarea.focus();
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  openProgressiveTriage() {
    const triageShell = document.getElementById('triagem-home');
    const triagePanel = document.getElementById('triageProgressivePanel');

    if (triageShell) {
      triageShell.classList.remove('is-collapsed');
    }

    if (triagePanel) {
      triagePanel.hidden = false;
      triagePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
