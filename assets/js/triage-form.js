/**
 * Sistema de Formulário de Triagem - Fase 1.5
 * Validação robusta, UX premium e integração com contexto
 */

(function() {
  'use strict';

  window.AdvTriageForm = {
    // Configuração de validação
    validation: {
      name: {
        required: true,
        minLength: 3,
        maxLength: 100,
        pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
        message: "Informe seu nome completo (mínimo 3 caracteres)"
      },
      phone: {
        required: true,
        pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
        cleanPattern: /^\d{10,11}$/,
        message: "Informe um telefone válido com DDD"
      },
      city: {
        required: true,
        minLength: 2,
        maxLength: 50,
        message: "Informe sua cidade"
      },
      problem_type: {
        required: true,
        message: "Selecione o tipo do seu caso"
      },
      description: {
        required: true,
        minLength: 20,
        maxLength: 2000,
        message: "Descreva seu caso em pelo menos 20 caracteres"
      },
      urgency: {
        required: true,
        message: "Selecione o nível de urgência"
      }
    },

    // Formata telefone automaticamente
    formatPhone: function(value) {
      const digits = value.replace(/\D/g, '');
      
      if (digits.length <= 2) {
        return digits;
      } else if (digits.length <= 7) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      } else if (digits.length <= 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      } else {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    },

    // Valida campo específico
    validateField: function(fieldName, value) {
      const rules = this.validation[fieldName];
      if (!rules) return { valid: true };

      const trimmedValue = value.trim();

      // Required
      if (rules.required && !trimmedValue) {
        return { valid: false, message: rules.message };
      }

      // Se não é required e está vazio, está válido
      if (!rules.required && !trimmedValue) {
        return { valid: true };
      }

      // Length
      if (rules.minLength && trimmedValue.length < rules.minLength) {
        return { valid: false, message: rules.message };
      }

      if (rules.maxLength && trimmedValue.length > rules.maxLength) {
        return { valid: false, message: rules.message };
      }

      // Pattern
      if (fieldName === 'phone') {
        const cleanDigits = value.replace(/\D/g, '');
        if (!rules.cleanPattern.test(cleanDigits)) {
          return { valid: false, message: rules.message };
        }
      } else if (rules.pattern && !rules.pattern.test(trimmedValue)) {
        return { valid: false, message: rules.message };
      }

      return { valid: true };
    },

    // Mostra erro de campo
    showFieldError: function(field, message) {
      const formGroup = field.closest('.form-group');
      const errorElement = formGroup.querySelector('.field-error');
      
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
      }

      formGroup.classList.add('has-error');
      field.classList.add('is-invalid');
    },

    // Limpa erro de campo
    clearFieldError: function(field) {
      const formGroup = field.closest('.form-group');
      const errorElement = formGroup.querySelector('.field-error');
      
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
      }

      formGroup.classList.remove('has-error');
      field.classList.remove('is-invalid');
      
      // Adiciona classe de valid se tiver valor
      if (field.value.trim()) {
        field.classList.add('is-valid');
      } else {
        field.classList.remove('is-valid');
      }
    },

    // Valida formulário completo
    validateForm: function(form) {
      const errors = [];
      const data = {};

      // Coleta e valida cada campo
      Object.keys(this.validation).forEach(fieldName => {
        const field = form.elements[fieldName];
        if (!field) return;

        const value = field.value || '';
        const validation = this.validateField(fieldName, value);

        data[fieldName] = value.trim();

        if (!validation.valid) {
          errors.push({
            field: fieldName,
            message: validation.message,
            element: field
          });
        }
      });

      return {
        valid: errors.length === 0,
        errors: errors,
        data: data
      };
    },

    // Coleta dados do formulário
    collectFormData: function(form) {
      const context = window.AdvContext?.capture() || {};
      
      return {
        name: form.elements.name?.value?.trim() || '',
        phone: form.elements.phone?.value?.trim() || '',
        city: form.elements.city?.value?.trim() || '',
        problem_type: form.elements.problem_type?.value?.trim() || '',
        description: form.elements.description?.value?.trim() || '',
        urgency: form.elements.urgency?.value?.trim() || '',
        area: form.elements.area?.value?.trim() || 'geral',
        source: form.elements.source?.value?.trim() || context.origem || 'site',
        page: form.elements.page?.value?.trim() || context.pagina || 'triagem.html',
        campaign: form.elements.campaign?.value?.trim() || context.campanha || '',
        video: form.elements.video?.value?.trim() || context.video || '',
        theme: context.tema || '',
        sessionId: context.sessionId || ''
      };
    },

    // Constrói mensagem para WhatsApp
    buildWhatsAppMessage: function(data) {
      const areaLabels = {
        previdenciario: 'Direito Previdenciário',
        bancario: 'Direito Bancário',
        consumidor: 'Direito do Consumidor',
        familia: 'Direito de Família',
        civil: 'Direito Civil',
        'consumidor-bancario': 'Direito do Consumidor e Bancário'
      };

      const urgencyLabels = {
        alta: 'Alta - existe prazo ou urgência',
        media: 'Média - preciso de orientação em breve',
        baixa: 'Baixa - consulta preventiva'
      };

      const areaLabel = areaLabels[data.problem_type] || data.problem_type;
      const urgencyLabel = urgencyLabels[data.urgency] || data.urgency;

      let message = `Olá! Preciso agendar uma consulta jurídica.\n\n`;
      message += `*Dados para contato:*\n`;
      message += `- Nome: ${data.name}\n`;
      message += `- Telefone: ${data.phone}\n`;
      message += `- Cidade: ${data.city}\n\n`;
      
      message += `*Sobre o caso:*\n`;
      message += `- Área: ${areaLabel}\n`;
      message += `- Urgência: ${urgencyLabel}\n`;
      message += `- Descrição: ${data.description}\n\n`;

      if (data.theme) {
        message += `*Contexto:* Cheguei por conteúdo sobre ${data.theme}\n`;
      }

      if (data.source && data.source !== 'site') {
        message += `*Origem:* ${data.source}\n`;
      }

      message += `\nGostaria de agendar uma consulta para análise deste caso.`;

      return message;
    },

    // Envia formulário para API
    submitForm: async function(form) {
      const validation = this.validateForm(form);
      
      if (!validation.valid) {
        // Mostra erros
        validation.errors.forEach(error => {
          this.showFieldError(error.element, error.message);
        });
        
        // Foca no primeiro campo com erro
        if (validation.errors.length > 0) {
          validation.errors[0].element.focus();
        }

        return { success: false, errors: validation.errors };
      }

      // Coleta dados
      const data = this.collectFormData(form);
      
      // Desabilita botão
      const submitButton = form.querySelector('#submitButton');
      const originalText = submitButton.textContent;
      
      submitButton.disabled = true;
      submitButton.textContent = 'Analisando seu caso...';
      submitButton.style.background = 'linear-gradient(90deg, #b58d49 0%, #8b6f3a 100%)';

      // Status
      const statusElement = form.querySelector('[data-triage-status]');
      if (statusElement) {
        statusElement.className = 'form-status is-loading';
        statusElement.textContent = '🔍 Analisando as informações do seu caso...';
      }

      try {
        // Tenta enviar para API
        const response = await fetch('/api/public/triage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-product-session-id': data.sessionId
          },
          body: JSON.stringify(data)
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok && result.ok) {
          // Sucesso - redireciona para WhatsApp
          this.redirectToWhatsApp(data, submitButton, statusElement);
          
          // Tracking
          window.AdvContext?.track('triage_submit_success', {
            problemType: data.problem_type,
            urgency: data.urgency,
            theme: data.theme,
            source: data.source
          });

          return { success: true, data: result };
        } else {
          // Falha na API - usa fallback
          console.warn('API falhou, usando fallback:', result);
          this.redirectToWhatsApp(data, submitButton, statusElement);
          
          // Tracking com fallback
          window.AdvContext?.track('triage_submit_fallback', {
            problemType: data.problem_type,
            urgency: data.urgency,
            theme: data.theme,
            source: data.source,
            apiError: true
          });

          return { success: true, fallback: true };
        }
      } catch (error) {
        console.error('Erro no envio:', error);
        
        // Fallback para WhatsApp mesmo com erro
        this.redirectToWhatsApp(data, submitButton, statusElement);
        
        // Tracking de erro
        window.AdvContext?.track('triage_submit_error', {
          problemType: data.problem_type,
          urgency: data.urgency,
          theme: data.theme,
          source: data.source,
          error: error.message
        });

        return { success: true, fallback: true, error: error.message };
      }
    },

    // Redireciona para WhatsApp
    redirectToWhatsApp: function(data, submitButton, statusElement) {
      if (statusElement) {
        statusElement.className = 'form-status is-success';
        statusElement.textContent = '✅ Análise concluída! Redirecionando para o WhatsApp...';
      }

      if (submitButton) {
        submitButton.textContent = 'Abrindo WhatsApp...';
        submitButton.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
      }

      const message = this.buildWhatsAppMessage(data);
      const whatsappUrl = `https://wa.me/5584996248241?text=${encodeURIComponent(message)}`;

      // Redireciona após 800ms
      setTimeout(() => {
        try {
          window.location.href = whatsappUrl;
        } catch (e) {
          window.open(whatsappUrl, '_blank');
        }
      }, 800);
    },

    // Configura formulário
    setupForm: function(form) {
      if (!form) return;

      // Formatação de telefone
      const phoneField = form.elements.phone;
      if (phoneField) {
        phoneField.addEventListener('input', (e) => {
          const formatted = this.formatPhone(e.target.value);
          e.target.value = formatted;
        });
      }

      // Validação em tempo real
      form.addEventListener('input', (e) => {
        const field = e.target;
        const fieldName = field.name;
        
        if (this.validation[fieldName]) {
          const validation = this.validateField(fieldName, field.value);
          
          if (validation.valid) {
            this.clearFieldError(field);
          } else {
            this.showFieldError(field, validation.message);
          }
        }
      });

      // Limpa erro ao focar
      form.addEventListener('focus', (e) => {
        const field = e.target;
        this.clearFieldError(field);
      }, true);

      // Submit do formulário
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitForm(form);
      });
    },

    // Inicializa sistema
    init: function() {
      const form = document.querySelector('#triageForm, [data-triage-form]');
      if (form) {
        this.setupForm(form);
        console.log('📋 AdvTriageForm initialized');
      }
    }
  };

  // Inicializa quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AdvTriageForm.init());
  } else {
    window.AdvTriageForm.init();
  }

})();
