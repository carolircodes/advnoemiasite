/**
 * Sistema de CTAs de Conversão - Fase 1.5
 * Gerenciamento estratégico de chamadas para ação focadas em consulta jurídica
 */

(function() {
  'use strict';

  window.AdvCTAs = {
    // Configuração de CTAs por contexto
    ctaConfig: {
      // CTA principal: sempre focado em consulta
      primary: {
        generic: {
          text: "Agendar consulta pelo WhatsApp",
          action: "whatsapp",
          priority: 1
        },
        contextual: {
          aposentadoria: "Agendar consulta previdenciária",
          bancario: "Resolver problema bancário agora",
          familia: "Agendar consulta de família",
          consumidor: "Resolver problema de consumo",
          civil: "Consultar sobre caso cível"
        }
      },

      // CTA secundário: análise com NoemIA
      secondary: {
        generic: {
          text: "Analisar caso com a NoemIA",
          action: "noemia",
          priority: 2
        },
        contextual: {
          aposentadoria: "Entender minha aposentadoria",
          bancario: "Analisar problema bancário",
          familia: "Orientação sobre direito de família",
          consumidor: "Analisar direito do consumidor",
          civil: "Consultar sobre direito civil"
        }
      },

      // CTA terciário: triagem estruturada
      tertiary: {
        generic: {
          text: "Organizar informações do caso",
          action: "triage",
          priority: 3
        },
        contextual: {
          aposentadoria: "Preparar triagem previdenciária",
          bancario: "Organizar caso bancário",
          familia: "Preparar triagem familiar",
          consumidor: "Organizar caso de consumo",
          civil: "Preparar triagem cível"
        }
      }
    },

    // Mapeamento de temas para áreas jurídicas
    themeMapping: {
      aposentadoria: 'previdenciario',
      inss: 'previdenciario',
      previdenciario: 'previdenciario',
      banco: 'bancario',
      bancario: 'bancario',
      emprestimo: 'bancario',
      desconto: 'bancario',
      familia: 'familia',
      divorcio: 'familia',
      pensao: 'familia',
      guarda: 'familia',
      consumidor: 'consumidor',
      negativacao: 'consumidor',
      contrato: 'civil',
      civil: 'civil'
    },

    // Obtém CTA contextualizado
    getCTA: function(type = 'primary', context = {}) {
      const currentContext = window.AdvContext?.capture() || {};
      const mergedContext = { ...currentContext, ...context };
      
      const config = this.ctaConfig[type];
      if (!config) return null;

      // Verifica se existe CTA contextual para o tema
      if (mergedContext.tema && config.contextual[mergedContext.tema]) {
        return {
          text: config.contextual[mergedContext.tema],
          action: config.generic.action,
          priority: config.generic.priority,
          contextual: true,
          theme: mergedContext.tema
        };
      }

      // Retorna CTA genérico
      return {
        text: config.generic.text,
        action: config.generic.action,
        priority: config.generic.priority,
        contextual: false
      };
    },

    // Gera URL de ação para CTA
    generateActionUrl: function(cta, context = {}) {
      const currentContext = window.AdvContext?.capture() || {};
      const mergedContext = { ...currentContext, ...context };

      switch (cta.action) {
        case 'whatsapp':
          const message = this.getWhatsAppMessage(cta, mergedContext);
          return window.AdvContext?.buildWhatsAppUrl(message, mergedContext) || '#';
          
        case 'noemia':
          return window.AdvContext?.buildNoemiaUrl(mergedContext) || 'noemia.html';
          
        case 'triage':
          return window.AdvContext?.buildTriageUrl(mergedContext) || 'triagem.html';
          
        default:
          return '#';
      }
    },

    // Mensagem personalizada para WhatsApp
    getWhatsAppMessage: function(cta, context) {
      const baseMessages = {
        aposentadoria: "Olá! Preciso de orientação sobre aposentadoria/benefício do INSS.",
        bancario: "Olá! Preciso resolver um problema bancário/empréstimo/desconto.",
        familia: "Olá! Preciso de orientação sobre direito de família/divórcio/pensão.",
        consumidor: "Olá! Preciso resolver um problema de consumo/cobrança/negativação.",
        civil: "Olá! Preciso de consulta sobre direito civil/contratos/obrigações."
      };

      const message = baseMessages[context.tema] || "Olá! Preciso agendar uma consulta jurídica.";
      
      // Adiciona contexto de origem se for relevante
      if (context.origem && context.origem !== 'site') {
        return `${message} Cheguei pelo ${context.origem}.`;
      }

      return message;
    },

    // Cria elemento HTML de CTA
    createCTAElement: function(type = 'primary', context = {}, className = 'btn') {
      const cta = this.getCTA(type, context);
      if (!cta) return null;

      const url = this.generateActionUrl(cta, context);
      
      const button = document.createElement('a');
      button.href = url;
      button.className = `${className} ${className}-${type}`;
      button.textContent = cta.text;
      
      // Adiciona atributos de rastreio
      button.setAttribute('data-cta-type', type);
      button.setAttribute('data-cta-action', cta.action);
      button.setAttribute('data-cta-priority', cta.priority);
      
      if (cta.contextual) {
        button.setAttribute('data-cta-theme', cta.theme);
      }

      // Tracking de clique
      button.addEventListener('click', (e) => {
        this.trackCTAClick(cta, context);
      });

      return button;
    },

    // Atualiza texto de elementos existentes
    updateExistingCTAs: function() {
      const context = window.AdvContext?.capture() || {};

      // Atualiza links genéricos do WhatsApp
      document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com"]').forEach(link => {
        if (!link.hasAttribute('data-cta-updated')) {
          const cta = this.getCTA('primary', context);
          if (cta) {
            link.textContent = cta.text;
            link.setAttribute('data-cta-updated', 'true');
          }
        }
      });

      // Atualiza botões primários genéricos
      document.querySelectorAll('.btn-primary').forEach(button => {
        if (!button.hasAttribute('data-cta-updated') && 
            (button.textContent.includes('Falar') || 
             button.textContent.includes('Contato') ||
             button.textContent.includes('WhatsApp'))) {
          const cta = this.getCTA('primary', context);
          if (cta) {
            button.textContent = cta.text;
            button.setAttribute('data-cta-updated', 'true');
          }
        }
      });
    },

    // Tracking de cliques em CTAs
    trackCTAClick: function(cta, context) {
      window.AdvContext?.track('cta_click', {
        ctaType: cta.action,
        ctaText: cta.text,
        contextual: cta.contextual,
        theme: cta.theme || context.tema,
        origin: context.origem,
        campaign: context.campanha
      });
    },

    // Gera HTML de bloco de CTAs para página
    generateCTABlock: function(context = {}) {
      const primary = this.getCTA('primary', context);
      const secondary = this.getCTA('secondary', context);
      const tertiary = this.getCTA('tertiary', context);

      return `
        <div class="cta-block" data-contextual="${primary.contextual}">
          <div class="cta-primary">
            ${this.createCTAElement('primary', context, 'btn btn-primary btn-lg').outerHTML}
          </div>
          ${secondary ? `
            <div class="cta-secondary">
              <p class="cta-intro">Prefere analisar seu caso primeiro?</p>
              ${this.createCTAElement('secondary', context, 'btn btn-secondary').outerHTML}
            </div>
          ` : ''}
          ${tertiary ? `
            <div class="cta-tertiary">
              <small class="cta-note">Ou organize suas informações antes:</small>
              ${this.createCTAElement('tertiary', context, 'btn btn-outline').outerHTML}
            </div>
          ` : ''}
        </div>
      `;
    },

    // Inicializa sistema de CTAs
    init: function() {
      // Atualiza CTAs existentes
      this.updateExistingCTAs();

      // Observer para elementos dinâmicos
      if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
          this.updateExistingCTAs();
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      console.log('🎯 AdvCTAs initialized');
    }
  };

  // Inicializa quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AdvCTAs.init());
  } else {
    window.AdvCTAs.init();
  }

})();
