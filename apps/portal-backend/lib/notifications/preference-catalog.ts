import type { NotificationAudience, NotificationEventKey } from "./policy.ts";

export type NotificationPreferenceControl = {
  eventKey: NotificationEventKey;
  audience: NotificationAudience;
  title: string;
  description: string;
  benefit: string;
  defaultEnabled: boolean;
};

const CLIENT_NOTIFICATION_CONTROLS: NotificationPreferenceControl[] = [
  {
    eventKey: "client.appointment.reminder",
    audience: "client",
    title: "Lembrete de compromisso",
    description: "Aviso curto para voce se preparar sem correrias de ultima hora.",
    benefit: "Ajuda a retomar agenda e horario certo no celular.",
    defaultEnabled: true
  },
  {
    eventKey: "client.document.available",
    audience: "client",
    title: "Documento disponivel",
    description: "Quando a equipe liberar um arquivo importante no seu portal.",
    benefit: "Evita voltar ao portal sem novidade real.",
    defaultEnabled: true
  },
  {
    eventKey: "client.document.pending",
    audience: "client",
    title: "Documento pendente",
    description: "Quando o seu caso precisar de um envio para continuar avancando.",
    benefit: "Mostra o proximo passo com link direto para resolver.",
    defaultEnabled: true
  },
  {
    eventKey: "client.payment.confirmed",
    audience: "client",
    title: "Confirmacao de pagamento",
    description: "Quando o sistema reconhecer a etapa financeira e liberar a continuidade.",
    benefit: "Traz seguranca de que o fluxo seguiu sem limbo.",
    defaultEnabled: true
  },
  {
    eventKey: "client.portal.return",
    audience: "client",
    title: "Retorno ao portal",
    description: "Convite discreto para voltar quando houver valor nao consumido.",
    benefit: "Mantem retomada suave, sem pressao diaria.",
    defaultEnabled: true
  }
];

const INTERNAL_NOTIFICATION_CONTROLS: NotificationPreferenceControl[] = [
  {
    eventKey: "operations.handoff.human",
    audience: "operations",
    title: "Handoff humano",
    description: "Quando uma conversa realmente precisa entrar na fila humana.",
    benefit: "Evita perder retomadas sensiveis do atendimento.",
    defaultEnabled: true
  },
  {
    eventKey: "operations.intake.urgent",
    audience: "operations",
    title: "Intake urgente",
    description: "Sinal forte para triagens com urgencia real e baixa tolerancia a atraso.",
    benefit: "Protege o que nao pode esperar janela silenciosa longa.",
    defaultEnabled: true
  },
  {
    eventKey: "operations.intake.new",
    audience: "operations",
    title: "Nova triagem",
    description: "Entrada nova pronta para leitura e distribuicao operacional.",
    benefit: "Mantem a fila ativa sem virar ruido de bastidor.",
    defaultEnabled: true
  },
  {
    eventKey: "operations.payment.confirmed",
    audience: "operations",
    title: "Pagamento confirmado",
    description: "Quando a operacao pode seguir porque a etapa financeira foi validada.",
    benefit: "Destrava a proxima acao sem cobranca manual paralela.",
    defaultEnabled: true
  }
];

export function getClientNotificationControls() {
  return CLIENT_NOTIFICATION_CONTROLS;
}

export function getInternalNotificationControls() {
  return INTERNAL_NOTIFICATION_CONTROLS;
}

export function getNotificationControlsByAudience(audience: NotificationAudience) {
  if (audience === "client") {
    return CLIENT_NOTIFICATION_CONTROLS;
  }

  if (audience === "operations" || audience === "lawyer") {
    return INTERNAL_NOTIFICATION_CONTROLS;
  }

  return [];
}

export function getKnownNotificationPreferenceEventKeys() {
  return [
    ...CLIENT_NOTIFICATION_CONTROLS.map((item) => item.eventKey),
    ...INTERNAL_NOTIFICATION_CONTROLS.map((item) => item.eventKey)
  ];
}
