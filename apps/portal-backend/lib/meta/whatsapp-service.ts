/**
 * Serviço de integração com WhatsApp Cloud API
 * Envia mensagens e gerencia comunicação via WhatsApp Business
 */

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
  interactive?: {
    type: 'button' | 'list';
    body?: {
      text: string;
    };
    action?: any;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    status: string;
  }>;
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  options?: {
    previewUrl?: boolean;
    contextMessageId?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      throw new Error('Credenciais do WhatsApp não configuradas');
    }

    // Normalizar número de telefone
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Construir payload da mensagem
    const messagePayload: WhatsAppMessage = {
      to: normalizedPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    // Adicionar contexto se fornecido
    if (options?.contextMessageId) {
      (messagePayload as any).context = {
        message_id: options.contextMessageId
      };
    }

    // Enviar para API do WhatsApp
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          ...messagePayload
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data: WhatsAppResponse = await response.json();

    // Log de sucesso
    await logWhatsAppEvent('message_sent', {
      to: normalizedPhone,
      messageId: data.messages[0]?.id,
      messageLength: message.length
    });

    return {
      success: true,
      messageId: data.messages[0]?.id
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Log de erro
    await logWhatsAppEvent('message_error', {
      to: phoneNumber,
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Envia mensagem template do WhatsApp
 */
export async function sendWhatsAppTemplate(
  phoneNumber: string,
  templateName: string,
  templateData?: Record<string, string>,
  language: string = 'pt_BR'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      throw new Error('Credenciais do WhatsApp não configuradas');
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const messagePayload: WhatsAppMessage = {
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language }
      }
    };

    // Adicionar componentes se houver dados
    if (templateData) {
      messagePayload.template!.components = [{
        type: 'body',
        parameters: Object.entries(templateData).map(([key, value]) => ({
          type: 'text',
          text: value
        }))
      }];
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          ...messagePayload
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp Template Error: ${errorData.error?.message || response.statusText}`);
    }

    const data: WhatsAppResponse = await response.json();

    await logWhatsAppEvent('template_sent', {
      to: normalizedPhone,
      templateName,
      messageId: data.messages[0]?.id
    });

    return {
      success: true,
      messageId: data.messages[0]?.id
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    await logWhatsAppEvent('template_error', {
      to: phoneNumber,
      templateName,
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Envia mensagem interativa com botões
 */
export async function sendWhatsAppInteractive(
  phoneNumber: string,
  bodyText: string,
  buttons: Array<{ id: string; text: string }>,
  headerText?: string,
  footerText?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      throw new Error('Credenciais do WhatsApp não configuradas');
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const interactivePayload: any = {
      type: 'button',
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.text
          }
        }))
      }
    };

    if (headerText) {
      interactivePayload.header = {
        type: 'text',
        text: headerText
      };
    }

    if (footerText) {
      interactivePayload.footer = {
        text: footerText
      };
    }

    const messagePayload: WhatsAppMessage = {
      to: normalizedPhone,
      type: 'interactive',
      interactive: interactivePayload
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          ...messagePayload
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp Interactive Error: ${errorData.error?.message || response.statusText}`);
    }

    const data: WhatsAppResponse = await response.json();

    await logWhatsAppEvent('interactive_sent', {
      to: normalizedPhone,
      buttonCount: buttons.length,
      messageId: data.messages[0]?.id
    });

    return {
      success: true,
      messageId: data.messages[0]?.id
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    await logWhatsAppEvent('interactive_error', {
      to: phoneNumber,
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Verifica status de uma mensagem
 */
export async function getWhatsAppMessageStatus(
  messageId: string
): Promise<{ status: string; timestamp?: number; error?: string }> {
  try {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('Access Token não configurado');
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      status: data.messages?.[0]?.status || 'unknown',
      timestamp: data.messages?.[0]?.timestamp
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    await logWhatsAppEvent('status_check_error', {
      messageId,
      error: errorMessage
    });

    return {
      status: 'error',
      error: errorMessage
    };
  }
}

/**
 * Normaliza número de telefone para formato WhatsApp
 */
function normalizePhoneNumber(phone: string): string {
  // Remove caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove 55 do início se já existir
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove 0 do início do DDD
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Adiciona 55 no início
  return `55${cleaned}`;
}

/**
 * Log de eventos do WhatsApp
 */
async function logWhatsAppEvent(event: string, data: any) {
  // TODO: Implementar logging estruturado
  console.log(`📱 WhatsApp Event: ${event}`, {
    timestamp: Date.now(),
    ...data
  });
}

/**
 * Verifica se número é válido para WhatsApp
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Deve ter entre 10 e 13 dígitos (com código do país)
  if (cleaned.length < 10 || cleaned.length > 13) {
    return false;
  }
  
  // Deve começar com código do Brasil ou apenas DDD
  if (cleaned.startsWith('55')) {
    return cleaned.length === 13; // 55 + DDD + número
  } else {
    return cleaned.length >= 10 && cleaned.length <= 11; // DDD + número
  }
}

/**
 * Formata número para exibição
 */
export function formatPhoneNumberForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 13) {
    // Formato internacional: +55 (84) 99999-9999
    const ddd = cleaned.slice(2, 4);
    const firstPart = cleaned.slice(4, 9);
    const secondPart = cleaned.slice(9);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  } else if (cleaned.length === 11) {
    // Formato nacional: (84) 99999-9999
    const ddd = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 7);
    const secondPart = cleaned.slice(7);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  } else if (cleaned.length === 10) {
    // Formato sem 9: (84) 9999-9999
    const ddd = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 6);
    const secondPart = cleaned.slice(6);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  return phone; // Retorna original se não conseguir formatar
}
