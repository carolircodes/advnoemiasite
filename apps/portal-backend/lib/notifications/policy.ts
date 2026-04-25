export type NotificationAudience = "client" | "lawyer" | "operations" | "executive";
export type NotificationPriority = "informative" | "important" | "urgent" | "critical";
export type NotificationChannel = "email" | "whatsapp" | "push" | "noemia";
export type NotificationEventKey =
  | "client.document.pending"
  | "client.document.available"
  | "client.appointment.reminder"
  | "client.appointment.updated"
  | "client.case.updated"
  | "client.payment.confirmed"
  | "client.portal.return"
  | "operations.intake.new"
  | "operations.intake.urgent"
  | "operations.handoff.human"
  | "operations.payment.confirmed";

export type NotificationPolicy = {
  eventKey: NotificationEventKey;
  audience: NotificationAudience;
  priority: NotificationPriority;
  activeChannelsNow: NotificationChannel[];
  futureChannels: NotificationChannel[];
  preferenceTitle: string;
  preferenceDescription: string;
  actionLabel: string;
  actionPath: string;
  cooldownMinutes: number;
  expiresAfterMinutes: number;
  allowQuietHoursBypass: boolean;
  summary: string;
  dontNotify: string[];
};

export type NotificationPreferenceSnapshot = {
  timezone: string;
  quietHoursStart: number;
  quietHoursEnd: number;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  eventOverrides: Record<string, unknown>;
};

export type NotificationReadiness = {
  pushPwaEnabled: boolean;
  pushPwaReason: string;
};

function hasPushPilotVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY;

  return (
    typeof publicKey === "string"
    && publicKey.trim().length > 0
    && typeof privateKey === "string"
    && privateKey.trim().length > 0
  );
}

function resolvePushPilotReadiness(): NotificationReadiness {
  const activationFlag = process.env.NOTIFICATIONS_PUSH_PILOT_ENABLED === "true";
  const vapidConfigured = hasPushPilotVapidConfig();

  if (!activationFlag) {
    return {
      pushPwaEnabled: false,
      pushPwaReason:
        "O piloto push continua desligado por flag e nao deve registrar service worker fora do cohort controlado."
    };
  }

  if (!vapidConfigured) {
    return {
      pushPwaEnabled: false,
      pushPwaReason:
        "O piloto push ainda nao pode enviar porque as chaves VAPID obrigatorias nao estao completas."
    };
  }

  return {
    pushPwaEnabled: true,
    pushPwaReason:
      "O piloto push esta pronto apenas para cohort pequeno, opt-in explicito e dois eventos de alto valor."
  };
}

const CURRENT_NOTIFICATION_READINESS: NotificationReadiness = {
  ...resolvePushPilotReadiness()
};

const DEFAULT_PREFERENCE_BY_AUDIENCE: Record<NotificationAudience, NotificationPreferenceSnapshot> = {
  client: {
    timezone: "America/Fortaleza",
    quietHoursStart: 21,
    quietHoursEnd: 8,
    emailEnabled: true,
    whatsappEnabled: true,
    pushEnabled: false,
    eventOverrides: {}
  },
  lawyer: {
    timezone: "America/Fortaleza",
    quietHoursStart: 22,
    quietHoursEnd: 7,
    emailEnabled: true,
    whatsappEnabled: true,
    pushEnabled: false,
    eventOverrides: {}
  },
  operations: {
    timezone: "America/Fortaleza",
    quietHoursStart: 22,
    quietHoursEnd: 7,
    emailEnabled: true,
    whatsappEnabled: true,
    pushEnabled: false,
    eventOverrides: {}
  },
  executive: {
    timezone: "America/Fortaleza",
    quietHoursStart: 22,
    quietHoursEnd: 7,
    emailEnabled: true,
    whatsappEnabled: false,
    pushEnabled: false,
    eventOverrides: {}
  }
};

const NOTIFICATION_POLICY_MATRIX: Record<NotificationEventKey, NotificationPolicy> = {
  "client.document.pending": {
    eventKey: "client.document.pending",
    audience: "client",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Documento pendente",
    preferenceDescription: "Quando o caso depende de um documento seu para seguir.",
    actionLabel: "Enviar documento",
    actionPath: "/documentos#solicitacoes-abertas",
    cooldownMinutes: 360,
    expiresAfterMinutes: 60 * 24 * 7,
    allowQuietHoursBypass: false,
    summary: "Pendencia documental com CTA direto para upload no portal.",
    dontNotify: ["Solicitacoes internas sem visibilidade ao cliente", "Eventos sem proxima acao clara"]
  },
  "client.document.available": {
    eventKey: "client.document.available",
    audience: "client",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Documento disponivel",
    preferenceDescription: "Quando um arquivo e liberado no portal para leitura.",
    actionLabel: "Abrir documento",
    actionPath: "/documentos",
    cooldownMinutes: 120,
    expiresAfterMinutes: 60 * 24 * 3,
    allowQuietHoursBypass: false,
    summary: "Documento liberado no portal com retorno elegante e contexto suficiente.",
    dontNotify: ["Atualizacoes internas do storage", "Reprocessamentos tecnicos sem impacto ao cliente"]
  },
  "client.appointment.reminder": {
    eventKey: "client.appointment.reminder",
    audience: "client",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Lembrete de compromisso",
    preferenceDescription: "Quando um horario relevante esta se aproximando.",
    actionLabel: "Ver agenda",
    actionPath: "/agenda",
    cooldownMinutes: 720,
    expiresAfterMinutes: 60 * 24,
    allowQuietHoursBypass: false,
    summary: "Lembrete curto de compromisso para retomada rapida na agenda.",
    dontNotify: ["Compromissos cancelados", "Movimentos sem data/hora definitiva"]
  },
  "client.appointment.updated": {
    eventKey: "client.appointment.updated",
    audience: "client",
    priority: "urgent",
    activeChannelsNow: ["email", "whatsapp"],
    futureChannels: ["push"],
    preferenceTitle: "Compromisso atualizado",
    preferenceDescription: "Quando a data muda de forma sensivel para o cliente.",
    actionLabel: "Confirmar horario",
    actionPath: "/agenda",
    cooldownMinutes: 90,
    expiresAfterMinutes: 60 * 24 * 2,
    allowQuietHoursBypass: true,
    summary: "Mudanca relevante de compromisso com baixa tolerancia a atraso.",
    dontNotify: ["Edicoes internas sem mudanca percebida pelo cliente"]
  },
  "client.case.updated": {
    eventKey: "client.case.updated",
    audience: "client",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Atualizacao publica do caso",
    preferenceDescription: "Quando existe contexto publico e proxima acao clara.",
    actionLabel: "Acompanhar caso",
    actionPath: "/cliente",
    cooldownMinutes: 180,
    expiresAfterMinutes: 60 * 24 * 5,
    allowQuietHoursBypass: false,
    summary: "Atualizacao publica do caso quando ha clareza e acao concreta.",
    dontNotify: ["Mudancas de bastidor", "Notas internas sem impacto ao cliente"]
  },
  "client.payment.confirmed": {
    eventKey: "client.payment.confirmed",
    audience: "client",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Pagamento confirmado",
    preferenceDescription: "Quando a etapa financeira e reconhecida e a jornada segue.",
    actionLabel: "Ver proximo passo",
    actionPath: "/pagamento/sucesso",
    cooldownMinutes: 1440,
    expiresAfterMinutes: 60 * 24 * 2,
    allowQuietHoursBypass: false,
    summary: "Confirmacao de pagamento com proxima orientacao clara.",
    dontNotify: ["Transicoes financeiras tecnicas sem conciliacao real"]
  },
  "client.portal.return": {
    eventKey: "client.portal.return",
    audience: "client",
    priority: "informative",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Retorno ao portal",
    preferenceDescription: "Lembrete suave apenas quando houver valor novo a retomar.",
    actionLabel: "Entrar no portal",
    actionPath: "/auth/login",
    cooldownMinutes: 1440,
    expiresAfterMinutes: 60 * 24 * 4,
    allowQuietHoursBypass: false,
    summary: "Retomada suave ao portal quando ha valor nao consumido.",
    dontNotify: ["Nudges diarios", "Pressao recorrente sem novo valor"]
  },
  "operations.intake.new": {
    eventKey: "operations.intake.new",
    audience: "operations",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Nova triagem",
    preferenceDescription: "Quando uma nova leitura operacional entra na fila.",
    actionLabel: "Abrir triagem",
    actionPath: "/internal/advogada#triagens-recebidas",
    cooldownMinutes: 30,
    expiresAfterMinutes: 60 * 12,
    allowQuietHoursBypass: false,
    summary: "Nova triagem interna com leitura executiva e CTA unico.",
    dontNotify: ["Leads frios sem dados minimos", "Duplicatas da mesma captura"]
  },
  "operations.intake.urgent": {
    eventKey: "operations.intake.urgent",
    audience: "operations",
    priority: "critical",
    activeChannelsNow: ["email", "whatsapp"],
    futureChannels: ["push"],
    preferenceTitle: "Intake urgente",
    preferenceDescription: "Quando a triagem tem urgencia real e pede resposta rapida.",
    actionLabel: "Assumir agora",
    actionPath: "/internal/advogada#triagens-recebidas",
    cooldownMinutes: 20,
    expiresAfterMinutes: 60 * 6,
    allowQuietHoursBypass: true,
    summary: "Triagem urgente exige sinal forte e sem atraso silencioso.",
    dontNotify: ["Casos ja assumidos", "Urgencia artificial sem lastro operacional"]
  },
  "operations.handoff.human": {
    eventKey: "operations.handoff.human",
    audience: "operations",
    priority: "urgent",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Handoff humano",
    preferenceDescription: "Quando a fila humana precisa assumir uma conversa sensivel.",
    actionLabel: "Abrir inbox",
    actionPath: "/internal/advogada/atendimento",
    cooldownMinutes: 45,
    expiresAfterMinutes: 60 * 8,
    allowQuietHoursBypass: true,
    summary: "Handoff humano legitimo para site/inbox com retomada contextual.",
    dontNotify: ["Pedidos prematuros de humano bloqueados pela policy", "Conversas sem sensibilidade real"]
  },
  "operations.payment.confirmed": {
    eventKey: "operations.payment.confirmed",
    audience: "operations",
    priority: "important",
    activeChannelsNow: ["email"],
    futureChannels: ["push"],
    preferenceTitle: "Pagamento confirmado",
    preferenceDescription: "Quando a operacao pode seguir porque o financeiro foi reconhecido.",
    actionLabel: "Ver operacional",
    actionPath: "/internal/advogada/operacional",
    cooldownMinutes: 120,
    expiresAfterMinutes: 60 * 24,
    allowQuietHoursBypass: false,
    summary: "Pagamento confirmado que desbloqueia proxima acao operacional.",
    dontNotify: ["Webhooks reprocessados sem mudanca de estado"]
  }
};

function getLocalHour(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  return Number.parseInt(hour || "0", 10);
}

function isWithinQuietHours(hour: number, quietHoursStart: number, quietHoursEnd: number) {
  if (quietHoursStart === quietHoursEnd) {
    return false;
  }

  if (quietHoursStart < quietHoursEnd) {
    return hour >= quietHoursStart && hour < quietHoursEnd;
  }

  return hour >= quietHoursStart || hour < quietHoursEnd;
}

function findNextAllowedDate(date: Date, preference: NotificationPreferenceSnapshot) {
  let candidate = new Date(date.getTime());

  for (let step = 0; step < 96; step += 1) {
    const localHour = getLocalHour(candidate, preference.timezone);
    if (!isWithinQuietHours(localHour, preference.quietHoursStart, preference.quietHoursEnd)) {
      return candidate;
    }
    candidate = new Date(candidate.getTime() + 30 * 60_000);
  }

  return candidate;
}

export function getNotificationReadiness() {
  return resolvePushPilotReadiness();
}

export function getNotificationPolicyMatrix() {
  return Object.values(NOTIFICATION_POLICY_MATRIX);
}

export function getNotificationPolicy(eventKey: NotificationEventKey) {
  return NOTIFICATION_POLICY_MATRIX[eventKey];
}

export function getDefaultPreferenceForAudience(audience: NotificationAudience) {
  return DEFAULT_PREFERENCE_BY_AUDIENCE[audience];
}

export function resolveNotificationEventPreference(
  eventKey: NotificationEventKey,
  preference: NotificationPreferenceSnapshot
) {
  const override = preference.eventOverrides[eventKey];

  if (typeof override === "boolean") {
    return {
      enabled: override,
      reason: override ? "event_preference_enabled" : "event_preference_disabled"
    };
  }

  return {
    enabled: true,
    reason: "event_preference_default"
  };
}

export function getNotificationAudienceMatrix() {
  return {
    client: getNotificationPolicyMatrix().filter((item) => item.audience === "client"),
    lawyer: getNotificationPolicyMatrix().filter((item) => item.audience === "lawyer"),
    operations: getNotificationPolicyMatrix().filter((item) => item.audience === "operations"),
    executive: getNotificationPolicyMatrix().filter((item) => item.audience === "executive")
  };
}

export function resolveNotificationChannelAvailability(
  channel: NotificationChannel,
  preference: NotificationPreferenceSnapshot
) {
  switch (channel) {
    case "email":
      return {
        eligible: preference.emailEnabled,
        reason: preference.emailEnabled ? "channel_enabled" : "email_preference_disabled"
      };
    case "whatsapp":
      return {
        eligible: preference.whatsappEnabled,
        reason: preference.whatsappEnabled ? "channel_enabled" : "whatsapp_preference_disabled"
      };
    case "push":
      return {
        eligible: preference.pushEnabled && CURRENT_NOTIFICATION_READINESS.pushPwaEnabled,
        reason:
          preference.pushEnabled && resolvePushPilotReadiness().pushPwaEnabled
            ? "channel_enabled"
            : !resolvePushPilotReadiness().pushPwaEnabled
              ? "push_not_ready"
              : "push_preference_disabled"
      };
    default:
      return {
        eligible: true,
        reason: "channel_enabled"
      };
  }
}

export function resolveNotificationAvailability(args: {
  now?: Date;
  policy: NotificationPolicy;
  preference: NotificationPreferenceSnapshot;
}) {
  const now = args.now || new Date();
  if (args.policy.allowQuietHoursBypass) {
    return {
      availableAt: now.toISOString(),
      deferred: false,
      reason: "eligible_now"
    };
  }

  const localHour = getLocalHour(now, args.preference.timezone);
  if (
    !isWithinQuietHours(
      localHour,
      args.preference.quietHoursStart,
      args.preference.quietHoursEnd
    )
  ) {
    return {
      availableAt: now.toISOString(),
      deferred: false,
      reason: "eligible_now"
    };
  }

  const nextAllowed = findNextAllowedDate(now, args.preference);
  return {
    availableAt: nextAllowed.toISOString(),
    deferred: true,
    reason: "deferred_quiet_hours"
  };
}
