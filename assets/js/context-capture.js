/**
 * Camada de Contexto - Fase 1.5
 * Sistema unificado de captura e rastreio de contexto para captação jurídica premium
 */

(function() {
  'use strict';

  // Configuração global de contexto
  window.AdvContext = {
    // Captura contexto da URL atual
    capture: function(searchString = window.location.search) {
      const params = new URLSearchParams(searchString);
      
      return {
        tema: this.getParam(params, ['tema', 'theme', 'area'], '').toLowerCase().trim(),
        origem: this.getParam(params, ['origem', 'source', 'utm_source'], 'site').toLowerCase().trim(),
        campanha: this.getParam(params, ['campanha', 'campaign', 'utm_campaign'], '').toLowerCase().trim(),
        video: this.getParam(params, ['video', 'utm_content'], '').toLowerCase().trim(),
        pagina: this.getCurrentPage(),
        timestamp: Date.now(),
        sessionId: this.getSessionId()
      };
    },

    // Obtém parâmetro com múltiplos aliases
    getParam: function(params, aliases, defaultValue = '') {
      for (const alias of aliases) {
        const value = params.get(alias);
        if (value) return value;
      }
      return defaultValue;
    },

    // Identifica página atual
    getCurrentPage: function() {
      const path = window.location.pathname.replace(/\\/g, '/');
      
      // Mapeamento de páginas
      const pageMap = {
        '/': 'index.html',
        '/index.html': 'index.html',
        '/blog.html': 'blog.html',
        '/triagem.html': 'triagem.html',
        '/noemia.html': 'noemia.html',
        '/direito-previdenciario.html': 'direito-previdenciario.html',
        '/direito-consumidor-bancario.html': 'direito-consumidor-bancario.html',
        '/direito-familia.html': 'direito-familia.html',
        '/direito-civil.html': 'direito-civil.html'
      };

      // Verificar páginas de artigos
      if (path.includes('/artigos/')) {
        return path.split('/').pop() || 'artigo.html';
      }

      return pageMap[path] || path.replace(/^\//, '') || 'unknown.html';
    },

    // Gera ID de sessão persistente
    getSessionId: function() {
      const key = 'adv_session_id';
      let sessionId = sessionStorage.getItem(key);
      
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(key, sessionId);
      }
      
      return sessionId;
    },

    // Gera URL com contexto para triagem
    buildTriageUrl: function(context = {}) {
      const currentContext = this.capture();
      const mergedContext = { ...currentContext, ...context };
      
      const params = new URLSearchParams();
      
      if (mergedContext.tema) params.set('tema', mergedContext.tema);
      if (mergedContext.origem && mergedContext.origem !== 'site') params.set('origem', mergedContext.origem);
      if (mergedContext.campanha) params.set('campanha', mergedContext.campanha);
      if (mergedContext.video) params.set('video', mergedContext.video);
      
      const baseUrl = 'triagem.html';
      return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    },

    // Gera URL com contexto para NoemIA
    buildNoemiaUrl: function(context = {}) {
      const currentContext = this.capture();
      const mergedContext = { ...currentContext, ...context };
      
      const params = new URLSearchParams();
      
      if (mergedContext.tema) params.set('tema', mergedContext.tema);
      if (mergedContext.origem && mergedContext.origem !== 'site') params.set('origem', mergedContext.origem);
      if (mergedContext.campanha) params.set('campanha', mergedContext.campanha);
      if (mergedContext.video) params.set('video', mergedContext.video);
      
      const baseUrl = 'noemia.html';
      return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    },

    // Gera URL do WhatsApp com contexto
    buildWhatsAppUrl: function(message, context = {}) {
      const currentContext = this.capture();
      const mergedContext = { ...currentContext, ...context };
      
      // Constrói mensagem com contexto
      let contextualMessage = message;
      
      if (mergedContext.tema) {
        contextualMessage += `\n\n*Contexto:* ${mergedContext.tema}`;
      }
      
      if (mergedContext.origem && mergedContext.origem !== 'site') {
        contextualMessage += `\n*Origem:* ${mergedContext.origem}`;
      }
      
      if (mergedContext.pagina) {
        contextualMessage += `\n*Página:* ${mergedContext.pagina}`;
      }
      
      const phone = "5584996248241";
      return `https://wa.me/${phone}?text=${encodeURIComponent(contextualMessage)}`;
    },

    // Aplica contexto a links na página
    applyToLinks: function() {
      const context = this.capture();
      
      // Links para triagem
      document.querySelectorAll('a[href*="triagem.html"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('?')) {
          link.setAttribute('href', this.buildTriageUrl(context));
        }
      });

      // Links para NoemIA
      document.querySelectorAll('a[href*="noemia.html"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('?')) {
          link.setAttribute('href', this.buildNoemiaUrl(context));
        }
      });

      // Links WhatsApp genéricos
      document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('contexto')) {
          // Extrai mensagem existente se houver
          const currentMessage = this.extractWhatsAppMessage(href);
          const contextualUrl = this.buildWhatsAppUrl(currentMessage, context);
          link.setAttribute('href', contextualUrl);
        }
      });
    },

    // Extrai mensagem de URL WhatsApp existente
    extractWhatsAppMessage: function(url) {
      try {
        const urlObj = new URL(url);
        const message = urlObj.searchParams.get('text') || '';
        return message.replace(/\*\*Contexto:\*\*.*$/, '').trim(); // Remove contexto antigo
      } catch (e) {
        return 'Olá! Preciso de orientação jurídica.';
      }
    },

    // Tracking de eventos de conversão
    track: function(eventKey, payload = {}) {
      const context = this.capture();
      
      const eventData = {
        eventKey,
        eventGroup: 'conversion',
        timestamp: Date.now(),
        sessionId: context.sessionId,
        pagePath: context.pagina,
        context: context,
        payload: payload
      };

      // Envia para analytics (implementação futura)
      console.log('📊 Event Track:', eventData);
      
      // Dispara evento personalizado para outros scripts
      window.dispatchEvent(new CustomEvent('advContextTrack', {
        detail: eventData
      }));

      return eventData;
    },

    // Inicializa sistema de contexto
    init: function() {
      // Aplica contexto aos links existentes
      this.applyToLinks();

      // Tracking de entrada na página
      this.track('page_view', {
        entryPoint: window.location.search.includes('?') ? 'contextualized' : 'direct'
      });

      // Observer para links dinâmicos
      if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
          this.applyToLinks();
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      console.log('🎯 AdvContext initialized:', this.capture());
    }
  };

  // Inicializa quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AdvContext.init());
  } else {
    window.AdvContext.init();
  }

})();
