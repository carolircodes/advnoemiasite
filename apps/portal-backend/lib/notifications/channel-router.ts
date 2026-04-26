import "server-only";

import { sendNotificationEmail } from "./email-delivery.ts";
import { sendViaWhatsApp } from "./whatsapp-delivery.ts";

export type ChannelDeliveryInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Roteador central de canais de notificação.
 *
 * Canal "email": ativo - entrega via Resend ou SMTP conforme NOTIFICATIONS_PROVIDER.
 *
 * Canal "whatsapp": ativo - entrega via Meta WhatsApp Cloud API.
 *   Usa META_WHATSAPP_ACCESS_TOKEN e META_WHATSAPP_PHONE_NUMBER_ID.
 *   Verifica preferências do cliente antes de enviar.
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
      await sendViaWhatsApp(input);
      return;

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
