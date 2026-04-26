import { resolveWhatsAppWebhookConfig } from "../channels/whatsapp-webhook.ts";
import { resolveMetaWebhookConfig } from "../meta/meta-webhook-config.ts";
import { shouldEnforceWebhookSignature } from "../http/webhook-security.ts";
import { buildPaymentReadinessSection } from "./payment-readiness.ts";
import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";

export type ChannelWebhookReadinessStatus =
  | "not_configured"
  | "missing_configuration"
  | "degraded"
  | "pilot_ready"
  | "production_ready"
  | "manual_check_required"
  | "action_required"
  | "blocked";

export type ChannelWebhookReadinessItem = {
  channel: string;
  status: ChannelWebhookReadinessStatus;
  pilotReady: boolean;
  productionReady: boolean;
  missing: string[];
  manualChecks: string[];
  summary: string;
};

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function configured(flagName: string) {
  return shouldEnforceWebhookSignature(flagName);
}

function coreWebhookStatus(args: {
  channel: string;
  missing: string[];
  signatureEnforced: boolean;
  manualChecks: string[];
  readySummary: string;
}): ChannelWebhookReadinessItem {
  const missing = args.signatureEnforced
    ? args.missing
    : [...args.missing, "signature_enforcement"];

  if (missing.length > 0) {
    return {
      channel: args.channel,
      status: "action_required",
      pilotReady: false,
      productionReady: false,
      missing,
      manualChecks: args.manualChecks,
      summary: "Canal core ainda nao fecha assinatura/secret/configuracao minima."
    };
  }

  return {
    channel: args.channel,
    status: args.manualChecks.length > 0 ? "manual_check_required" : "production_ready",
    pilotReady: true,
    productionReady: args.manualChecks.length === 0,
    missing: [],
    manualChecks: args.manualChecks,
    summary:
      args.manualChecks.length > 0
        ? "Configuracao local parece suficiente, mas depende de validacao externa/manual do provider."
        : args.readySummary
  };
}

function buildMetaItems(): ChannelWebhookReadinessItem[] {
  const config = resolveMetaWebhookConfig();
  const missingBase = [
    !config.verifyTokenConfigured ? "META_VERIFY_TOKEN" : null,
    !config.appSecretConfigured ? "META_APP_SECRET|INSTAGRAM_APP_SECRET|FACEBOOK_APP_SECRET" : null,
    !hasConfiguredValue(process.env.FACEBOOK_PAGE_ACCESS_TOKEN)
      ? "FACEBOOK_PAGE_ACCESS_TOKEN"
      : null,
    !hasConfiguredValue(process.env.INSTAGRAM_ACCESS_TOKEN) &&
    !hasConfiguredValue(process.env.INSTAGRAM_PAGE_ACCESS_TOKEN)
      ? "INSTAGRAM_ACCESS_TOKEN|INSTAGRAM_PAGE_ACCESS_TOKEN"
      : null
  ].filter(Boolean) as string[];
  const item = coreWebhookStatus({
    channel: "meta",
    missing: missingBase,
    signatureEnforced: configured("META_WEBHOOK_ENFORCE_SIGNATURE"),
    manualChecks: [
      "Validar X-Hub-Signature-256 no dashboard da Meta.",
      "Confirmar assinatura e subscriptions para page e instagram.",
      "Validar evento real controlado sem resposta automatica agressiva."
    ],
    readySummary: "Meta/Instagram/Facebook com webhook e assinatura prontos para producao."
  });

  return [
    item,
    {
      ...item,
      channel: "instagram"
    },
    {
      ...item,
      channel: "facebook_messenger"
    }
  ];
}

function buildWhatsAppItem(): ChannelWebhookReadinessItem {
  const config = resolveWhatsAppWebhookConfig();

  return coreWebhookStatus({
    channel: "whatsapp",
    missing: [
      !config.verifyTokenConfigured ? "WHATSAPP_VERIFY_TOKEN" : null,
      !config.appSecretConfigured ? "WHATSAPP_APP_SECRET|META_APP_SECRET" : null,
      !config.accessTokenConfigured ? "WHATSAPP_ACCESS_TOKEN|META_WHATSAPP_ACCESS_TOKEN" : null,
      !config.phoneNumberIdConfigured
        ? "WHATSAPP_PHONE_NUMBER_ID|META_WHATSAPP_PHONE_NUMBER_ID"
        : null
    ].filter(Boolean) as string[],
    signatureEnforced: configured("WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE"),
    manualChecks: [
      "Validar verify challenge no painel da Meta.",
      "Enviar payload de teste controlado e confirmar deduplicacao no banco.",
      "Confirmar que outbound real esta limitado a piloto."
    ],
    readySummary: "WhatsApp Cloud API com webhook e assinatura prontos para producao."
  });
}

function buildTelegramItem(): ChannelWebhookReadinessItem {
  const missing = [
    !hasConfiguredValue(process.env.TELEGRAM_BOT_TOKEN) ? "TELEGRAM_BOT_TOKEN" : null,
    !hasConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET)
      ? "TELEGRAM_WEBHOOK_SECRET"
      : null
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return {
      channel: "telegram",
      status: "action_required",
      pilotReady: false,
      productionReady: false,
      missing,
      manualChecks: ["Configurar webhook com secret no Bot API sem disparar mensagens reais."],
      summary: "Telegram nao esta pronto sem bot token e secret do webhook."
    };
  }

  return {
    channel: "telegram",
    status: "manual_check_required",
    pilotReady: true,
    productionReady: false,
    missing: [],
    manualChecks: [
      "Confirmar secret-token no dashboard/comando setWebhook.",
      "Executar payload local e evento controlado antes de producao plena."
    ],
    summary: "Telegram esta protegido por secret, mas ainda depende de validacao externa."
  };
}

function buildMercadoPagoItem(): ChannelWebhookReadinessItem {
  const section = buildPaymentReadinessSection();
  const details = section.details as Record<string, any>;
  const missing = [
    !details.accessTokenConfigured ? "MERCADO_PAGO_ACCESS_TOKEN" : null,
    !details.webhookSecretConfigured ? "MERCADO_PAGO_WEBHOOK_SECRET" : null,
    !details.signatureEnforced ? "MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE" : null
  ].filter(Boolean) as string[];

  if (missing.length > 0 || section.status !== "healthy") {
    return {
      channel: "mercado_pago",
      status: "action_required",
      pilotReady: false,
      productionReady: false,
      missing,
      manualChecks: [
        "Validar webhook assinado com payload de sandbox/controlado.",
        "Confirmar idempotencia em payment_events apos aplicar migrations pendentes."
      ],
      summary: section.summary
    };
  }

  return {
    channel: "mercado_pago",
    status: "manual_check_required",
    pilotReady: true,
    productionReady: false,
    missing: [],
    manualChecks: [
      "Confirmar assinatura real no painel do Mercado Pago.",
      "Confirmar conciliacao com pagamento sandbox sem acionar producao real."
    ],
    summary: "Mercado Pago esta configurado para piloto, pendente de validacao externa."
  };
}

function buildNotificationsItems(): ChannelWebhookReadinessItem[] {
  const cronMissing = !hasConfiguredValue(process.env.CRON_SECRET);
  const workerMissing = !hasConfiguredValue(process.env.NOTIFICATIONS_WORKER_SECRET);
  const provider = process.env.NOTIFICATIONS_PROVIDER?.trim() || "smtp";
  const emailMissing = !hasConfiguredValue(process.env.EMAIL_FROM);
  const providerMissing =
    provider === "resend"
      ? !hasConfiguredValue(process.env.RESEND_API_KEY)
      : !hasConfiguredValue(process.env.NOTIFICATIONS_SMTP_HOST) ||
        !hasConfiguredValue(process.env.NOTIFICATIONS_SMTP_PORT);

  return [
    {
      channel: "email_notifications",
      status: emailMissing || providerMissing ? "action_required" : "pilot_ready",
      pilotReady: !emailMissing && !providerMissing,
      productionReady: false,
      missing: [
        emailMissing ? "EMAIL_FROM" : null,
        providerMissing
          ? provider === "resend"
            ? "RESEND_API_KEY"
            : "NOTIFICATIONS_SMTP_HOST|NOTIFICATIONS_SMTP_PORT"
          : null
      ].filter(Boolean) as string[],
      manualChecks: [
        "Validar provider de email em ambiente controlado.",
        "Confirmar template, remetente e opt-out antes de producao ampla."
      ],
      summary:
        emailMissing || providerMissing
          ? "Notificacoes por email ainda sem provider/remetente minimo."
          : "Notificacoes por email prontas para piloto controlado."
    },
    {
      channel: "notifications_cron",
      status: cronMissing ? "action_required" : "pilot_ready",
      pilotReady: !cronMissing,
      productionReady: false,
      missing: cronMissing ? ["CRON_SECRET"] : [],
      manualChecks: ["Confirmar Vercel Cron e chamada sem secret rejeitada."],
      summary: cronMissing
        ? "Cron de notificacoes nao esta protegido por secret."
        : "Cron de notificacoes esta protegido para piloto."
    },
    {
      channel: "notifications_worker",
      status: workerMissing ? "action_required" : "pilot_ready",
      pilotReady: !workerMissing,
      productionReady: false,
      missing: workerMissing ? ["NOTIFICATIONS_WORKER_SECRET"] : [],
      manualChecks: ["Confirmar worker com secret valido e rejeicao sem secret."],
      summary: workerMissing
        ? "Worker de notificacoes nao esta protegido por secret."
        : "Worker de notificacoes esta protegido para piloto."
    }
  ];
}

export function buildChannelWebhookReadinessItems(): ChannelWebhookReadinessItem[] {
  return [
    ...buildMetaItems(),
    buildWhatsAppItem(),
    buildTelegramItem(),
    buildMercadoPagoItem(),
    ...buildNotificationsItems(),
    {
      channel: "youtube",
      status: "not_configured",
      pilotReady: false,
      productionReady: false,
      missing: ["YOUTUBE_CHANNEL_ID", "YOUTUBE_API_KEY"],
      manualChecks: ["Manter YouTube como futuro; nao ativar automacao nesta fase."],
      summary: "YouTube permanece fora do piloto core."
    },
    {
      channel: "tiktok",
      status: "not_configured",
      pilotReady: false,
      productionReady: false,
      missing: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      manualChecks: ["Manter TikTok como futuro; nao ativar automacao nesta fase."],
      summary: "TikTok permanece fora do piloto core."
    }
  ];
}

export function buildChannelWebhookReadinessSection(): DiagnosticSection {
  const items = buildChannelWebhookReadinessItems();
  const coreChannels = new Set([
    "meta",
    "instagram",
    "facebook_messenger",
    "whatsapp",
    "telegram",
    "mercado_pago",
    "email_notifications",
    "notifications_cron",
    "notifications_worker"
  ]);
  const coreItems = items.filter((item) => coreChannels.has(item.channel));
  const actionRequired = coreItems.filter((item) =>
    item.status === "action_required" || item.status === "blocked"
  );
  const manualChecks = coreItems.filter((item) => item.status === "manual_check_required");

  if (actionRequired.length > 0) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "channel_readiness_action_required",
      summary: "Canais core ainda exigem configuracao/assinatura/secret antes de piloto real.",
      operatorAction:
        "Fechar os itens action_required por canal e validar manualmente os providers antes de disparar trafego.",
      verification: [
        "Conferir details.channels no JSON de operations:verify.",
        "Confirmar assinatura enforced em Meta, WhatsApp e Mercado Pago.",
        "Confirmar secrets de Telegram, cron e worker."
      ],
      details: {
        channels: items,
        actionRequired: actionRequired.map((item) => item.channel),
        manualCheckRequired: manualChecks.map((item) => item.channel)
      }
    });
  }

  return buildDiagnosticSection({
    status: manualChecks.length > 0 ? "degraded" : "healthy",
    code:
      manualChecks.length > 0
        ? "channel_readiness_manual_check_required"
        : "channel_readiness_ready",
    summary:
      manualChecks.length > 0
        ? "Canais core fecham configuracao automatica, mas ainda dependem de validacao externa controlada."
        : "Canais core estao prontos pela verificacao automatica atual.",
    operatorAction:
      manualChecks.length > 0
        ? "Executar os testes manuais controlados em dashboards/providers sem ativar automacao ampla."
        : "Manter este diagnostico como gate antes de cada rollout.",
    verification: [
      "Conferir details.channels no JSON de operations:verify.",
      "Registrar evidencias dos testes manuais por canal.",
      "Reexecutar readiness depois de qualquer rotacao de secret."
    ],
    details: {
      channels: items,
      actionRequired: [],
      manualCheckRequired: manualChecks.map((item) => item.channel)
    }
  });
}
