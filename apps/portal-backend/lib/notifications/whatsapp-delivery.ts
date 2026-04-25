import "server-only";

import { sendWhatsAppMessage, isValidWhatsAppNumber } from "../meta/whatsapp-service";
import { createAdminSupabaseClient } from "../supabase/admin";
import { logWhatsApp } from "../logging/structured-logger";

export type WhatsAppDeliveryInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Envia notificação por WhatsApp usando o serviço existente
 */
export async function sendViaWhatsApp(input: WhatsAppDeliveryInput): Promise<void> {
  try {
    // Validar número de telefone
    if (!isValidWhatsAppNumber(input.to)) {
      throw new Error(`Número de WhatsApp inválido: ${input.to}`);
    }

    // Extrair mensagem do texto (ignorar HTML)
    const message = input.text || input.html.replace(/<[^>]*>/g, '').trim();
    
    if (!message) {
      throw new Error('Mensagem vazia para envio via WhatsApp');
    }

    // Enviar mensagem usando o serviço existente
    const result = await sendWhatsAppMessage(input.to, message);
    
    if (!result.success) {
      throw new Error(`Falha no envio WhatsApp: ${result.error}`);
    }

    await logWhatsApp(
      "message_sent",
      input.to,
      `Mensagem enviada com sucesso: ${message.substring(0, 50)}...`,
      {
        messageId: result.messageId,
        messageLength: message.length
      }
    );

  } catch (error) {
    await logWhatsApp(
      "message_error",
      input.to,
      "Erro no envio de mensagem WhatsApp",
      {
        error: error instanceof Error ? error.message : String(error),
        messageLength: input.text?.length || 0
      },
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Busca telefone do cliente no banco de dados
 */
export async function getClientWhatsAppPhone(clientId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from("clients")
    .select("phone,whatsapp_phone")
    .eq("id", clientId)
    .single();

  if (error) {
    console.error("[WhatsApp] Erro ao buscar telefone do cliente:", error);
    return null;
  }

  // Priorizar WhatsApp phone, senão usar phone geral
  const phone = data?.whatsapp_phone || data?.phone;
  
  if (!phone) {
    return null;
  }

  return phone;
}

/**
 * Verifica se cliente quer receber notificações por WhatsApp
 */
export async function clientWantsWhatsAppNotifications(clientId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from("clients")
    .select("whatsapp_notifications, notification_preferences")
    .eq("id", clientId)
    .single();

  if (error) {
    console.error("[WhatsApp] Erro ao verificar preferências:", error);
    return false;
  }

  // Verificar preferência explícita ou usar padrão
  const preferences = data?.notification_preferences || {};
  const whatsappEnabled = data?.whatsapp_notifications ?? preferences?.whatsapp ?? true;
  
  return Boolean(whatsappEnabled);
}

/**
 * Constrói mensagem de atualização de caso para WhatsApp
 */
export function buildCaseUpdateWhatsAppMessage(
  caseTitle: string,
  publicSummary: string,
  clientName: string
): string {
  const message = `Olá, ${clientName}! 

Passando para informar que houve uma atualização no seu atendimento: "${caseTitle}".

${publicSummary}

O próximo passo previsto é acompanhar o andamento pelo portal. Se precisar, nossa equipe segue à disposição.

Atenciosamente,
Escritório Noemia`;

  return message;
}

/**
 * Constrói mensagem de mudança de status para WhatsApp
 */
export function buildStatusChangeWhatsAppMessage(
  caseTitle: string,
  newStatus: string,
  clientName: string
): string {
  const message = `Olá, ${clientName}!

Boa notícia! O status do seu caso "${caseTitle}" foi atualizado para: ${newStatus}.

Você pode acompanhar todos os detalhes e próximos passos pelo seu portal do cliente.

Qualquer dúvida, estamos à disposição!

Atenciosamente,
Escritório Noemia`;

  return message;
}
