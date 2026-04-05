import "server-only";

import { sendNotificationEmail } from "@/lib/notifications/email-delivery";

export type ChannelDeliveryInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Roteador central de canais de notificação.
 *
 * Canal "email": ativo — entrega via Resend ou SMTP conforme NOTIFICATIONS_PROVIDER.
 *
 * Canal "whatsapp": preparado para integração futura.
 *   Providers suportados: Z-API, Twilio, 360Dialog.
 *   Para ativar: defina WHATSAPP_PROVIDER e as credenciais no painel do Vercel,
 *   implemente sendViaWhatsapp() em lib/notifications/whatsapp-delivery.ts e
 *   adicione a migração para aceitar channel='whatsapp' na tabela notifications_outbox.
 *
 * Canal "noemia": preparado para integração futura.
 *   Permitirá que a NoemIA envie mensagens contextuais diretamente ao cliente
 *   com base no histórico do caso, sem intervenção manual da advogada.
 *   Para ativar: implemente sendViaNoemiaChannel() e vincule ao contexto do caso.
 */
export async function routeNotificationByChannel(
  channel: string,
  input: ChannelDeliveryInput
): Promise<void> {
  switch (channel) {
    case "email":
      await sendNotificationEmail(input);
      return;

    case "whatsapp":
      throw new Error(
        "Canal WhatsApp ainda nao configurado. " +
          "Defina WHATSAPP_PROVIDER e implemente lib/notifications/whatsapp-delivery.ts."
      );

    case "noemia":
      throw new Error(
        "Canal NoemIA ainda nao configurado. " +
          "Implemente lib/notifications/noemia-delivery.ts para envio de mensagens contextuais via IA."
      );

    default:
      throw new Error(
        `Canal desconhecido: "${channel}". Canais suportados: email, whatsapp, noemia.`
      );
  }
}
