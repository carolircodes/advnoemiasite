import { channelAutomationFeatures } from "../config/channel-automation-features.ts";
import { shouldEnforceWebhookSignature } from "../http/webhook-security.ts";
import { resolveMetaWebhookConfig } from "../meta/meta-webhook-config.ts";
import { getYouTubeReadinessReport } from "../youtube/youtube-config.ts";

export type OmnichannelChannel =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "telegram"
  | "youtube"
  | "tiktok";

export type OmnichannelMaturity =
  | "mature"
  | "partial"
  | "prepared"
  | "experimental";

export type OmnichannelAutomationMode =
  | "human_only"
  | "assisted_only"
  | "guarded_auto"
  | "full_auto_blocked";

export type OmnichannelReadinessStatus =
  | "healthy"
  | "degraded"
  | "missing_configuration"
  | "unauthorized"
  | "provider_error"
  | "optional_subsystem_gap";

export type OmnichannelCapability =
  | "receive_inbound"
  | "send_outbound"
  | "signed_webhook"
  | "initiate_conversation"
  | "public_comment"
  | "private_dm"
  | "media_support"
  | "read_status"
  | "thread_linking"
  | "human_handoff"
  | "assisted_automation"
  | "full_automation"
  | "dedup_idempotency"
  | "provider_retries"
  | "observability"
  | "token_refresh"
  | "structured_messages"
  | "campaign_attribution";

export type OmnichannelCapabilityState = {
  available: boolean;
  safeToAutomateToday: boolean;
  notes: string;
};

export type OmnichannelChannelDefinition = {
  channel: OmnichannelChannel;
  label: string;
  maturity: OmnichannelMaturity;
  strategicPriority: 1 | 2 | 3 | 4 | 5 | 6;
  sourceOfTruth: string;
  adapterSurface: string[];
  runtimeIncluded: boolean;
  automationMode: OmnichannelAutomationMode;
  handoffStrategy: string;
  safeAutomationScopeToday: string[];
  blockedAutomationScopeToday: string[];
  capabilities: Record<OmnichannelCapability, OmnichannelCapabilityState>;
};

export type OmnichannelReadinessItem = {
  channel: OmnichannelChannel;
  status: OmnichannelReadinessStatus;
  summary: string;
  automationMode: OmnichannelAutomationMode;
  missing: string[];
  verification: string[];
  details: Record<string, unknown>;
};

export type OmnichannelGovernanceReport = {
  generatedAt: string;
  strategicChannels: OmnichannelChannel[];
  futureChannels: OmnichannelChannel[];
  channels: OmnichannelReadinessItem[];
  status: OmnichannelReadinessStatus;
  counts: Record<OmnichannelReadinessStatus, number>;
};

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeTelegramUsername(value: string | undefined) {
  const normalized = (value || "@adv_noemia").trim();
  return normalized.startsWith("@") ? normalized : `@${normalized}`;
}

function capability(available: boolean, safeToAutomateToday: boolean, notes: string) {
  return {
    available,
    safeToAutomateToday,
    notes
  } satisfies OmnichannelCapabilityState;
}

function buildChannelDefinitions(): OmnichannelChannelDefinition[] {
  return [
    {
      channel: "instagram",
      label: "Instagram",
      maturity: "partial",
      strategicPriority: 1,
      sourceOfTruth: "app/api/meta/webhook + lib/services/channel-conversation-router",
      adapterSurface: [
        "app/api/meta/webhook/route.ts",
        "lib/meta/instagram-service.ts",
        "lib/services/channel-conversation-router.ts"
      ],
      runtimeIncluded: true,
      automationMode: "guarded_auto",
      handoffStrategy: "Comentar com guarda, mover para DM quando permitido e travar para humano em sinais comerciais/sensiveis.",
      safeAutomationScopeToday: [
        "DM inbound/outbound via router unificado",
        "Resposta publica de comentario quando politica aprova",
        "Handoff comercial para WhatsApp/Inbox"
      ],
      blockedAutomationScopeToday: [
        "Campanhas antigas de comentario com servicos legados",
        "Automacao plena de DM a partir de qualquer comentario sem policy/handoff"
      ],
      capabilities: {
        receive_inbound: capability(true, true, "Webhook Meta processa DM e comentarios."),
        send_outbound: capability(true, true, "Direct e reply publico existem com telemetria."),
        signed_webhook: capability(true, true, "Assinatura Meta validada pelo config canonicamente resolvido."),
        initiate_conversation: capability(false, false, "Iniciacao fria depende das regras da plataforma e nao deve ser automatizada aqui."),
        public_comment: capability(true, true, "Seguro apenas com policy e guardrails de comentario."),
        private_dm: capability(true, true, "Seguro para continuidade e handoff, nao para prospeccao agressiva."),
        media_support: capability(true, false, "Conteudo nao textual cai em fallback controlado."),
        read_status: capability(false, false, "Nao ha leitura/status canonico equivalente ao WhatsApp."),
        thread_linking: capability(true, true, "Inbox e social acquisition vinculam comentario -> DM -> CRM."),
        human_handoff: capability(true, true, "Handoff governado no router/policy."),
        assisted_automation: capability(true, true, "NoemIA e politicas ja entram no fluxo principal."),
        full_automation: capability(true, false, "Nao liberar sem policy por campanha/superficie."),
        dedup_idempotency: capability(true, true, "Guard e persistence cobrem IDs, hash e retries."),
        provider_retries: capability(true, true, "Webhook duplicado tratado como realidade de producao."),
        observability: capability(true, true, "Webhook moderno usa operational trace; legados ainda sao inferiores."),
        token_refresh: capability(false, false, "Gestao de token longa duracao ainda depende do provider/dashboard."),
        structured_messages: capability(false, false, "Fluxo atual e majoritariamente texto."),
        campaign_attribution: capability(true, true, "Social acquisition e journey taxonomy conectam conteudo/origem.")
      }
    },
    {
      channel: "facebook",
      label: "Facebook / Messenger",
      maturity: "partial",
      strategicPriority: 2,
      sourceOfTruth: "app/api/meta/webhook + lib/services/channel-conversation-router",
      adapterSurface: [
        "app/api/meta/webhook/route.ts",
        "lib/meta/facebook-service.ts",
        "lib/services/channel-conversation-router.ts"
      ],
      runtimeIncluded: true,
      automationMode: "guarded_auto",
      handoffStrategy: "Messenger e comentario publico passam pelo router; automacao deve parar diante de intencao comercial/humano.",
      safeAutomationScopeToday: [
        "Messenger inbound/outbound no router",
        "Comentario publico com policy",
        "Encaminhamento para Inbox/WhatsApp"
      ],
      blockedAutomationScopeToday: [
        "Prospeccao fria",
        "Comentario -> DM automatico sem politica explicita"
      ],
      capabilities: {
        receive_inbound: capability(true, true, "Page/feed/comments e Messenger ja entram no webhook principal."),
        send_outbound: capability(true, true, "Reply publico e mensagem privada suportados."),
        signed_webhook: capability(true, true, "Assinatura Meta validada com prioridade adequada por objeto."),
        initiate_conversation: capability(false, false, "Nao seguro automatizar sem janela/permissao explicita."),
        public_comment: capability(true, true, "Seguro apenas em automacao guardada."),
        private_dm: capability(true, true, "Messenger suportado pelo adapter moderno."),
        media_support: capability(true, false, "Conteudo nao textual ainda converte para fallback textual."),
        read_status: capability(false, false, "Nao ha status canonicamente exposto como no WhatsApp."),
        thread_linking: capability(true, true, "Conversation linking existe via inbox e metadata social."),
        human_handoff: capability(true, true, "Policy e inbox absorvem handoff."),
        assisted_automation: capability(true, true, "Segura para triagem e continuidade."),
        full_automation: capability(true, false, "Nao liberar em comentario sem campanha/policy."),
        dedup_idempotency: capability(true, true, "IDs de comentario/MID + payload hash cobrem retries."),
        provider_retries: capability(true, true, "Eventos duplicados sao tratados como normais."),
        observability: capability(true, true, "Webhook moderno tem trace; codigo legado ainda existe fora da trilha principal."),
        token_refresh: capability(false, false, "Rotacao/refresh continua dependente do dashboard Meta."),
        structured_messages: capability(false, false, "Adapter atual esta centrado em texto."),
        campaign_attribution: capability(true, true, "Journey/social acquisition convergem com CRM.")
      }
    },
    {
      channel: "whatsapp",
      label: "WhatsApp",
      maturity: "mature",
      strategicPriority: 3,
      sourceOfTruth: "app/api/whatsapp/webhook + lib/services/channel-conversation-router",
      adapterSurface: [
        "app/api/whatsapp/webhook/route.ts",
        "lib/services/channel-conversation-router.ts",
        "lib/services/conversation-inbox.ts"
      ],
      runtimeIncluded: true,
      automationMode: "guarded_auto",
      handoffStrategy: "Canal principal de continuidade comercial; IA pode responder, mas handoff e pagamento devem ficar explicitamente rastreados.",
      safeAutomationScopeToday: [
        "Inbound/outbound textual",
        "Read receipts",
        "Typing indicator",
        "Status reconciliation",
        "Handoff comercial e pagamento"
      ],
      blockedAutomationScopeToday: [
        "Template outbound livre sem governance separada",
        "Automacao fora da janela/consentimento do provider"
      ],
      capabilities: {
        receive_inbound: capability(true, true, "Webhook ja e um dos fluxos mais maduros."),
        send_outbound: capability(true, true, "Outbound com resultado observado e status conciliado."),
        signed_webhook: capability(true, true, "HMAC e enforcement explicito de assinatura."),
        initiate_conversation: capability(false, false, "Depende de template/janela do provider."),
        public_comment: capability(false, false, "Nao se aplica."),
        private_dm: capability(true, true, "E o proprio canal privado principal."),
        media_support: capability(true, false, "Adapter atual trata melhor texto; outros tipos ainda simplificam."),
        read_status: capability(true, true, "Statuses sent/delivered/read/failed reconciliados."),
        thread_linking: capability(true, true, "Inbox + pipeline + payment ja convergem."),
        human_handoff: capability(true, true, "Handoff e lane comercial sao nativos do fluxo."),
        assisted_automation: capability(true, true, "Canal mais seguro para automacao assistida."),
        full_automation: capability(true, false, "Nao liberar sem templates/politicas fora do escopo atual."),
        dedup_idempotency: capability(true, true, "Message IDs + hash + persistence duravel."),
        provider_retries: capability(true, true, "Statuses e retries tem tratamento explicito."),
        observability: capability(true, true, "Operational trace bem distribuido no webhook."),
        token_refresh: capability(false, false, "Token/config ainda dependem de operacao no provider."),
        structured_messages: capability(false, false, "Nao ha camada canonica de templates estruturados nesta fase."),
        campaign_attribution: capability(true, true, "Conecta com comercial, origem e revenue.")
      }
    },
    {
      channel: "telegram",
      label: "Telegram",
      maturity: "partial",
      strategicPriority: 4,
      sourceOfTruth: "app/api/telegram/webhook + lib/services/telegram-conversation-service",
      adapterSurface: [
        "app/api/telegram/webhook/route.ts",
        "lib/services/telegram-conversation-service.ts",
        "lib/telegram/telegram-service.ts"
      ],
      runtimeIncluded: true,
      automationMode: "assisted_only",
      handoffStrategy: "Privado pode receber IA assistida; grupo precisa de policy mais conservadora e redirecionamento ao privado/humano.",
      safeAutomationScopeToday: [
        "Privado com IA assistida",
        "Grupo com capture de sinal e redirect controlado",
        "Handoff para humano com contexto persistido"
      ],
      blockedAutomationScopeToday: [
        "Automacao plena em grupo",
        "Resposta agressiva comunitaria sem acionamento explicito"
      ],
      capabilities: {
        receive_inbound: capability(true, true, "Webhook protegido e parser normalizado."),
        send_outbound: capability(true, true, "Private e group send suportados."),
        signed_webhook: capability(true, true, "Secret header/query ja protege a rota."),
        initiate_conversation: capability(false, false, "Nao seguro assumir outbound frio sem contexto."),
        public_comment: capability(false, false, "Nao se aplica; grupo e comunidade, nao comentario publico provider."),
        private_dm: capability(true, true, "Privado ja funciona com contexto persistido."),
        media_support: capability(false, false, "Normalizer atual foca texto/caption."),
        read_status: capability(false, false, "Nao ha reconciliacao equivalente exposta."),
        thread_linking: capability(true, true, "Sessions e inbox suportam telegram."),
        human_handoff: capability(true, true, "Handoff explicito em privado e sinais de grupo."),
        assisted_automation: capability(true, true, "Seguro no privado e em grupos apenas como triagem/sinal."),
        full_automation: capability(false, false, "Nao deve ser permitido hoje."),
        dedup_idempotency: capability(true, true, "Guard/persistence cobrem update/message ids e hash."),
        provider_retries: capability(true, true, "Reprocessamento nao deve gerar side effects duplicados."),
        observability: capability(false, false, "Fluxo ainda observa menos do que Meta/WhatsApp."),
        token_refresh: capability(false, false, "Nao se aplica no modelo atual."),
        structured_messages: capability(false, false, "Camada atual usa texto."),
        campaign_attribution: capability(false, false, "Ainda nao e um canal de campanha tao modelado quanto social/YouTube.")
      }
    },
    {
      channel: "youtube",
      label: "YouTube",
      maturity: "prepared",
      strategicPriority: 5,
      sourceOfTruth: "lib/services/youtube-orchestration + lib/youtube/youtube-config",
      adapterSurface: [
        "app/api/internal/youtube/route.ts",
        "lib/services/youtube-orchestration.ts",
        "lib/youtube/youtube-config.ts"
      ],
      runtimeIncluded: true,
      automationMode: "assisted_only",
      handoffStrategy: "Default seguro e ingestao + sugestao/revisao humana; active reply so com OAuth completo e policy.",
      safeAutomationScopeToday: [
        "Ingestao e roteamento para inbox/CRM",
        "Sugestao de reply",
        "Read-only observavel"
      ],
      blockedAutomationScopeToday: [
        "Active reply sem OAuth completo",
        "Automacao de comentario sem human review quando modo nao estiver pronto"
      ],
      capabilities: {
        receive_inbound: capability(true, true, "Comentarios/ativos ja entram por orquestracao interna."),
        send_outbound: capability(true, false, "Depende do modo operacional e OAuth completo."),
        signed_webhook: capability(false, false, "Nao ha webhook assinado canonicamente exposto hoje."),
        initiate_conversation: capability(false, false, "Nao se aplica no mesmo sentido de DM."),
        public_comment: capability(true, false, "Responder comentario so e seguro em suggestion/active com guardrails."),
        private_dm: capability(false, false, "Nao se aplica."),
        media_support: capability(true, true, "Video/short/commentarios ja sao diferenciados."),
        read_status: capability(false, false, "Nao ha status de leitura/outbound equivalente."),
        thread_linking: capability(true, true, "Inbox/CRM/journey taxonomy ja convergem."),
        human_handoff: capability(true, true, "Human review e primeiro-class no modelo."),
        assisted_automation: capability(true, true, "Canal preparado para IA assistida."),
        full_automation: capability(true, false, "Nao liberar sem modo active pronto e policy."),
        dedup_idempotency: capability(true, true, "Hash para comentario/retry ja existe."),
        provider_retries: capability(true, true, "Guardrails lidam com duplicate_comment_retry."),
        observability: capability(true, true, "Readiness explicito por modo e flags."),
        token_refresh: capability(true, false, "OAuth/refresh suportados, mas nem sempre completos no ambiente."),
        structured_messages: capability(false, false, "Nao ha reply estruturado canonicamente."),
        campaign_attribution: capability(true, true, "Taxonomy/origem/campaign family ja existem.")
      }
    },
    {
      channel: "tiktok",
      label: "TikTok",
      maturity: "experimental",
      strategicPriority: 6,
      sourceOfTruth: "Nenhum adapter ativo ainda; ativacao futura precisa seguir esta governanca.",
      adapterSurface: [],
      runtimeIncluded: false,
      automationMode: "human_only",
      handoffStrategy: "Nao ativar automacao ate existir adapter, readiness e policy equivalentes aos canais maduros.",
      safeAutomationScopeToday: [],
      blockedAutomationScopeToday: [
        "Qualquer webhook/outbound sem adapter governado",
        "Automacao de comentarios ou DM sem capacidade e policy explicitas"
      ],
      capabilities: {
        receive_inbound: capability(false, false, "Canal ainda nao esta integrado."),
        send_outbound: capability(false, false, "Canal ainda nao esta integrado."),
        signed_webhook: capability(false, false, "Nao ha perimetro implantado."),
        initiate_conversation: capability(false, false, "Nao suportado."),
        public_comment: capability(false, false, "Nao suportado."),
        private_dm: capability(false, false, "Nao suportado."),
        media_support: capability(false, false, "Nao suportado."),
        read_status: capability(false, false, "Nao suportado."),
        thread_linking: capability(false, false, "Nao suportado."),
        human_handoff: capability(false, false, "Nao suportado."),
        assisted_automation: capability(false, false, "Nao suportado."),
        full_automation: capability(false, false, "Nao suportado."),
        dedup_idempotency: capability(false, false, "Nao suportado."),
        provider_retries: capability(false, false, "Nao suportado."),
        observability: capability(false, false, "Nao suportado."),
        token_refresh: capability(false, false, "Nao suportado."),
        structured_messages: capability(false, false, "Nao suportado."),
        campaign_attribution: capability(false, false, "Nao suportado.")
      }
    }
  ];
}

export function getOmnichannelCapabilityMatrix() {
  return buildChannelDefinitions();
}

export function getOmnichannelChannelDefinition(channel: OmnichannelChannel) {
  return buildChannelDefinitions().find((entry) => entry.channel === channel)!;
}

function evaluateMetaReadiness(channel: "instagram" | "facebook"): OmnichannelReadinessItem {
  const config = resolveMetaWebhookConfig();
  const missing: string[] = [];
  const hasVerifyToken = config.verifyTokenConfigured;
  const hasAppSecret = config.appSecretConfigured;
  const hasPageAccessToken = hasConfiguredValue(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
  const hasPageId = hasConfiguredValue(process.env.FACEBOOK_PAGE_ID);
  const hasWebhookEnforcement = shouldEnforceWebhookSignature("META_WEBHOOK_ENFORCE_SIGNATURE");

  if (!hasVerifyToken) {
    missing.push("META_VERIFY_TOKEN");
  }
  if (!hasAppSecret) {
    missing.push("META_APP_SECRET|INSTAGRAM_APP_SECRET|FACEBOOK_APP_SECRET");
  }
  if (!hasPageAccessToken) {
    missing.push("FACEBOOK_PAGE_ACCESS_TOKEN");
  }
  if (!hasPageId) {
    missing.push("FACEBOOK_PAGE_ID");
  }
  if (!hasWebhookEnforcement) {
    missing.push("META_WEBHOOK_ENFORCE_SIGNATURE=true");
  }

  const hasLegacyCampaignAutomation =
    channel === "instagram" &&
    (channelAutomationFeatures.instagramKeywordAutomation ||
      channelAutomationFeatures.instagramCommentCampaignAutomation ||
      channelAutomationFeatures.instagramLeadCapture);

  const status: OmnichannelReadinessStatus =
    missing.length > 0
      ? "missing_configuration"
      : hasLegacyCampaignAutomation
        ? "degraded"
        : "healthy";

  return {
    channel,
    status,
    automationMode: getOmnichannelChannelDefinition(channel).automationMode,
    summary:
      status === "healthy"
        ? `${channel} opera no webhook/router canonicos com assinatura e outbound configurados.`
        : status === "degraded"
          ? `${channel} esta funcional no fluxo principal, mas ainda convive com automacoes legadas/artesanais fora da trilha canonica.`
          : `${channel} ainda nao tem todos os segredos e controles necessarios para operar com governance plena.`,
    missing,
    verification: [
      "Validar GET/POST do webhook Meta com assinatura.",
      "Confirmar inbound DM/comentario roteando para inbox/router.",
      "Confirmar outbound sem erro de token.",
      "Evitar servicos legados de comentario como source of truth."
    ],
    details: {
      verifyTokenConfigured: hasVerifyToken,
      appSecretConfigured: hasAppSecret,
      appSecretSource: config.appSecretSource,
      pageAccessTokenConfigured: hasPageAccessToken,
      pageIdConfigured: hasPageId,
      signatureEnforced: hasWebhookEnforcement,
      legacyCampaignAutomationEnabled: hasLegacyCampaignAutomation
    }
  };
}

function evaluateWhatsAppReadiness(): OmnichannelReadinessItem {
  const hasVerifyToken = hasConfiguredValue(process.env.WHATSAPP_VERIFY_TOKEN);
  const hasAppSecret =
    hasConfiguredValue(process.env.WHATSAPP_APP_SECRET) ||
    hasConfiguredValue(process.env.META_APP_SECRET);
  const hasAccessToken =
    hasConfiguredValue(process.env.WHATSAPP_ACCESS_TOKEN) ||
    hasConfiguredValue(process.env.META_WHATSAPP_ACCESS_TOKEN);
  const hasPhoneNumberId =
    hasConfiguredValue(process.env.WHATSAPP_PHONE_NUMBER_ID) ||
    hasConfiguredValue(process.env.META_WHATSAPP_PHONE_NUMBER_ID);
  const signatureEnforced = shouldEnforceWebhookSignature("WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE");
  const missing: string[] = [];

  if (!hasVerifyToken) {
    missing.push("WHATSAPP_VERIFY_TOKEN");
  }
  if (!hasAppSecret) {
    missing.push("WHATSAPP_APP_SECRET|META_APP_SECRET");
  }
  if (!hasAccessToken) {
    missing.push("WHATSAPP_ACCESS_TOKEN|META_WHATSAPP_ACCESS_TOKEN");
  }
  if (!hasPhoneNumberId) {
    missing.push("WHATSAPP_PHONE_NUMBER_ID|META_WHATSAPP_PHONE_NUMBER_ID");
  }
  if (!signatureEnforced) {
    missing.push("WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE=true");
  }

  return {
    channel: "whatsapp",
    status: missing.length > 0 ? "missing_configuration" : "healthy",
    automationMode: getOmnichannelChannelDefinition("whatsapp").automationMode,
    summary:
      missing.length === 0
        ? "WhatsApp esta operacional com assinatura, outbound observado, status reconciliation e router canonico."
        : "WhatsApp ainda nao tem toda a configuracao minima para operar com garantias maduras.",
    missing,
    verification: [
      "Confirmar verify token do webhook.",
      "Confirmar assinatura e enforcement em producao.",
      "Confirmar status reconciliation no inbox.",
      "Confirmar create/payment e handoff comercial pelo canal."
    ],
    details: {
      verifyTokenConfigured: hasVerifyToken,
      appSecretConfigured: hasAppSecret,
      accessTokenConfigured: hasAccessToken,
      phoneNumberIdConfigured: hasPhoneNumberId,
      signatureEnforced
    }
  };
}

function evaluateTelegramReadiness(): OmnichannelReadinessItem {
  const channelUsername = normalizeTelegramUsername(process.env.TELEGRAM_CHANNEL_USERNAME);
  const channelUrl =
    process.env.TELEGRAM_CHANNEL_URL || `https://t.me/${channelUsername.replace(/^@/, "")}`;
  const hasWebhookSecret = hasConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET);
  const botConfigured = hasConfiguredValue(process.env.TELEGRAM_BOT_TOKEN);
  const missing: string[] = [];

  if (!botConfigured) {
    missing.push("TELEGRAM_BOT_TOKEN");
  }
  if (!hasWebhookSecret) {
    missing.push("TELEGRAM_WEBHOOK_SECRET");
  }

  return {
    channel: "telegram",
    status: missing.length > 0 ? "missing_configuration" : "degraded",
    automationMode: getOmnichannelChannelDefinition("telegram").automationMode,
    summary:
      missing.length > 0
        ? "Telegram ainda nao tem toda a configuracao de bot/webhook para operar."
        : "Telegram esta funcional, mas ainda opera fora do router canonico e com observabilidade inferior aos canais Meta/WhatsApp.",
    missing,
    verification: [
      "Confirmar webhook protegido com TELEGRAM_WEBHOOK_SECRET.",
      "Confirmar privado respondendo e grupo apenas sinalizando/redirecionando.",
      "Observar handoff e dedup em conversa persistida."
    ],
    details: {
      botConfigured,
      webhookSecretConfigured: hasWebhookSecret,
      channelUsername,
      channelUrl,
      readyForFutureGroup: true
    }
  };
}

function evaluateYouTubeReadiness(): OmnichannelReadinessItem {
  const report = getYouTubeReadinessReport();
  const missing = report.modeReadiness.missing;
  const status: OmnichannelReadinessStatus =
    report.operationMode === "active" && !report.modeReadiness.satisfied
      ? "missing_configuration"
      : report.operationMode === "read_only" || report.operationMode === "suggestion"
        ? report.modeReadiness.satisfied
          ? "healthy"
          : "optional_subsystem_gap"
        : report.modeReadiness.satisfied
          ? "healthy"
          : "degraded";

  return {
    channel: "youtube",
    status,
    automationMode: getOmnichannelChannelDefinition("youtube").automationMode,
    summary:
      status === "healthy"
        ? `YouTube esta operando em modo ${report.operationMode} com guardrails explicitados.`
        : status === "optional_subsystem_gap"
          ? `YouTube ainda nao fecha todas as credenciais para ${report.operationMode}, mas o canal pode seguir em modo seguro e observado.`
          : `YouTube precisa fechar credenciais/modo antes de ampliar automacao.`,
    missing,
    verification: [
      "Confirmar operationMode e readyModes no endpoint interno.",
      "Confirmar ingestao/roteamento para inbox e CRM.",
      "Nao liberar active reply sem OAuth completo e human review quando exigido."
    ],
    details: report
  };
}

function evaluateTikTokReadiness(): OmnichannelReadinessItem {
  return {
    channel: "tiktok",
    status: "optional_subsystem_gap",
    automationMode: getOmnichannelChannelDefinition("tiktok").automationMode,
    summary:
      "TikTok ainda nao possui adapter/readiness canonicos; manter como gap opcional explicitado, nao como canal parcialmente saudavel.",
    missing: [
      "TIKTOK_WEBHOOK_SECRET",
      "TIKTOK_ACCESS_TOKEN",
      "adapter canonico",
      "readiness por canal"
    ],
    verification: [
      "Definir matriz de capabilities antes de qualquer automacao.",
      "Exigir assinatura, dedup, observabilidade e policy equivalentes aos canais maduros."
    ],
    details: {
      runtimeIncluded: false,
      activationPlan: [
        "Criar adapter canonico",
        "Adicionar contract inbound/outbound",
        "Fechar dedup/idempotencia",
        "Adicionar readiness e observabilidade"
      ]
    }
  };
}

export function getOmnichannelReadinessItems(): OmnichannelReadinessItem[] {
  return [
    evaluateMetaReadiness("instagram"),
    evaluateMetaReadiness("facebook"),
    evaluateWhatsAppReadiness(),
    evaluateTelegramReadiness(),
    evaluateYouTubeReadiness(),
    evaluateTikTokReadiness()
  ];
}

function combineStatuses(items: OmnichannelReadinessItem[]): OmnichannelReadinessStatus {
  const order: OmnichannelReadinessStatus[] = [
    "healthy",
    "optional_subsystem_gap",
    "degraded",
    "missing_configuration",
    "unauthorized",
    "provider_error"
  ];

  return items.reduce<OmnichannelReadinessStatus>((worst, item) => {
    return order.indexOf(item.status) > order.indexOf(worst) ? item.status : worst;
  }, "healthy");
}

export function getOmnichannelGovernanceReport(): OmnichannelGovernanceReport {
  const channels = getOmnichannelReadinessItems();
  const counts = channels.reduce<Record<OmnichannelReadinessStatus, number>>(
    (accumulator, item) => {
      accumulator[item.status] += 1;
      return accumulator;
    },
    {
      healthy: 0,
      degraded: 0,
      missing_configuration: 0,
      unauthorized: 0,
      provider_error: 0,
      optional_subsystem_gap: 0
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    strategicChannels: ["instagram", "facebook", "whatsapp", "telegram"],
    futureChannels: ["youtube", "tiktok"],
    channels,
    status: combineStatuses(channels.filter((item) => item.channel !== "tiktok")),
    counts
  };
}
