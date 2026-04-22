import { shouldEnforceWebhookSignature } from "../http/webhook-security.ts";

export type BackendEnvProfile = "local" | "release" | "full_durable";

export type BackendEnvRequirementLevel =
  | "optional"
  | "local_required"
  | "production_required"
  | "durable_required"
  | "subsystem_specific";

export type BackendEnvRequirement = {
  id: string;
  subsystem:
    | "deployment"
    | "platform"
    | "perimeter"
    | "payments"
    | "notifications"
    | "telegram"
    | "youtube"
    | "durable";
  description: string;
  level: BackendEnvRequirementLevel;
  appliesTo: BackendEnvProfile[];
  missing: string[];
  satisfied: boolean;
};

export type BackendEnvCompletenessSnapshot = {
  schemaVersion: "phase6-2026-04-18";
  profiles: Record<
    BackendEnvProfile,
    {
      satisfied: boolean;
      missing: string[];
      optionalMissing: string[];
      missingRequiredCount: number;
    }
  >;
  subsystems: Record<
    BackendEnvRequirement["subsystem"],
    {
      satisfied: boolean;
      missing: string[];
      requirementLevels: BackendEnvRequirementLevel[];
    }
  >;
  requirements: BackendEnvRequirement[];
};

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAnyConfiguredValue(keys: string[]) {
  return keys.some((key) => hasConfiguredValue(process.env[key]));
}

function resolveNotificationsProvider() {
  return process.env.NOTIFICATIONS_PROVIDER?.trim() || (process.env.RESEND_API_KEY ? "resend" : "smtp");
}

function buildRequirement(input: Omit<BackendEnvRequirement, "satisfied"> & { satisfied: boolean }) {
  return input;
}

export function buildBackendEnvRequirements(): BackendEnvRequirement[] {
  const notificationsProvider = resolveNotificationsProvider();

  return [
    buildRequirement({
      id: "deployment.app_url",
      subsystem: "deployment",
      description: "Host canonico do portal/backend.",
      level: "local_required",
      appliesTo: ["local", "release", "full_durable"],
      missing: ["NEXT_PUBLIC_APP_URL"],
      satisfied: hasConfiguredValue(process.env.NEXT_PUBLIC_APP_URL)
    }),
    buildRequirement({
      id: "platform.supabase_url",
      subsystem: "platform",
      description: "URL publica do projeto Supabase.",
      level: "local_required",
      appliesTo: ["local", "release", "full_durable"],
      missing: ["NEXT_PUBLIC_SUPABASE_URL"],
      satisfied: hasConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
    }),
    buildRequirement({
      id: "platform.supabase_public_key",
      subsystem: "platform",
      description: "Chave publica do Supabase para auth e app router.",
      level: "local_required",
      appliesTo: ["local", "release", "full_durable"],
      missing: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      satisfied: hasAnyConfiguredValue([
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      ])
    }),
    buildRequirement({
      id: "platform.supabase_secret_key",
      subsystem: "platform",
      description: "Chave administrativa usada pelos fluxos server-sensitive.",
      level: "local_required",
      appliesTo: ["local", "release", "full_durable"],
      missing: ["SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY"],
      satisfied: hasAnyConfiguredValue(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"])
    }),
    buildRequirement({
      id: "perimeter.internal_api_secret",
      subsystem: "perimeter",
      description: "Secret das rotas internas protegidas e readiness.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["INTERNAL_API_SECRET"],
      satisfied: hasConfiguredValue(process.env.INTERNAL_API_SECRET)
    }),
    buildRequirement({
      id: "perimeter.notifications_worker_secret",
      subsystem: "perimeter",
      description: "Secret do worker protegido de notificacoes.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["NOTIFICATIONS_WORKER_SECRET"],
      satisfied: hasConfiguredValue(process.env.NOTIFICATIONS_WORKER_SECRET)
    }),
    buildRequirement({
      id: "perimeter.cron_secret",
      subsystem: "perimeter",
      description: "Secret para execucoes cron protegidas.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["CRON_SECRET"],
      satisfied: hasConfiguredValue(process.env.CRON_SECRET)
    }),
    buildRequirement({
      id: "payments.access_token",
      subsystem: "payments",
      description: "Access token do Mercado Pago para create e reconciliacao.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["MERCADO_PAGO_ACCESS_TOKEN"],
      satisfied: hasConfiguredValue(process.env.MERCADO_PAGO_ACCESS_TOKEN)
    }),
    buildRequirement({
      id: "payments.webhook_secret",
      subsystem: "payments",
      description: "Secret de assinatura do webhook do Mercado Pago.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["MERCADO_PAGO_WEBHOOK_SECRET"],
      satisfied: hasConfiguredValue(process.env.MERCADO_PAGO_WEBHOOK_SECRET)
    }),
    buildRequirement({
      id: "payments.public_key",
      subsystem: "payments",
      description: "Chave publica do checkout do Mercado Pago.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY"],
      satisfied: hasConfiguredValue(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY)
    }),
    buildRequirement({
      id: "payments.signature_enforced",
      subsystem: "payments",
      description: "Webhook deve rodar com enforcement de assinatura.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE=true"],
      satisfied: shouldEnforceWebhookSignature("MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE")
    }),
    buildRequirement({
      id: "notifications.provider",
      subsystem: "notifications",
      description: "Provider de notificacoes explicitamente configurado.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["NOTIFICATIONS_PROVIDER"],
      satisfied: hasConfiguredValue(process.env.NOTIFICATIONS_PROVIDER) || hasConfiguredValue(process.env.RESEND_API_KEY)
    }),
    buildRequirement({
      id: "notifications.email_from",
      subsystem: "notifications",
      description: "Remetente valido para mensagens do portal.",
      level: "production_required",
      appliesTo: ["release"],
      missing: ["EMAIL_FROM"],
      satisfied: hasConfiguredValue(process.env.EMAIL_FROM)
    }),
    buildRequirement({
      id: "notifications.provider_credentials",
      subsystem: "notifications",
      description: "Credenciais minimas do provider ativo.",
      level: "production_required",
      appliesTo: ["release"],
      missing:
        notificationsProvider === "resend"
          ? ["RESEND_API_KEY"]
          : ["NOTIFICATIONS_SMTP_HOST", "NOTIFICATIONS_SMTP_PORT"],
      satisfied:
        notificationsProvider === "resend"
          ? hasConfiguredValue(process.env.RESEND_API_KEY)
          : hasConfiguredValue(process.env.NOTIFICATIONS_SMTP_HOST) &&
            hasConfiguredValue(process.env.NOTIFICATIONS_SMTP_PORT)
    }),
    buildRequirement({
      id: "telegram.bot_token",
      subsystem: "telegram",
      description: "Token do bot do Telegram quando o canal estiver habilitado.",
      level: "subsystem_specific",
      appliesTo: ["release"],
      missing: ["TELEGRAM_BOT_TOKEN"],
      satisfied: hasConfiguredValue(process.env.TELEGRAM_BOT_TOKEN)
    }),
    buildRequirement({
      id: "telegram.webhook_secret",
      subsystem: "telegram",
      description: "Secret do webhook protegido do Telegram.",
      level: "subsystem_specific",
      appliesTo: ["release"],
      missing: ["TELEGRAM_WEBHOOK_SECRET"],
      satisfied: hasConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET)
    }),
    buildRequirement({
      id: "youtube.channel_id",
      subsystem: "youtube",
      description: "Canal do YouTube monitorado pela operacao omnichannel.",
      level: "subsystem_specific",
      appliesTo: ["release"],
      missing: ["YOUTUBE_CHANNEL_ID"],
      satisfied: hasConfiguredValue(process.env.YOUTUBE_CHANNEL_ID)
    }),
    buildRequirement({
      id: "youtube.mode",
      subsystem: "youtube",
      description: "Modo operacional explicito do YouTube para rollout seguro.",
      level: "subsystem_specific",
      appliesTo: ["release"],
      missing: ["YOUTUBE_MODE"],
      satisfied: hasConfiguredValue(process.env.YOUTUBE_MODE)
    }),
    buildRequirement({
      id: "youtube.read_credentials",
      subsystem: "youtube",
      description: "Credencial minima para leitura de videos e comentarios.",
      level: "subsystem_specific",
      appliesTo: ["release"],
      missing: ["YOUTUBE_API_KEY|YOUTUBE_CLIENT_ID+YOUTUBE_CLIENT_SECRET"],
      satisfied:
        hasConfiguredValue(process.env.YOUTUBE_API_KEY) ||
        (hasConfiguredValue(process.env.YOUTUBE_CLIENT_ID) &&
          hasConfiguredValue(process.env.YOUTUBE_CLIENT_SECRET))
    }),
    buildRequirement({
      id: "youtube.oauth_active_reply",
      subsystem: "youtube",
      description: "OAuth completo para active reply quando o canal subir desse modo.",
      level: "subsystem_specific",
      appliesTo: ["release"],
      missing: [
        "YOUTUBE_CLIENT_ID",
        "YOUTUBE_CLIENT_SECRET",
        "YOUTUBE_REDIRECT_URI",
        "YOUTUBE_REFRESH_TOKEN",
        "YOUTUBE_OAUTH_STATE_SECRET|INTERNAL_API_SECRET"
      ],
      satisfied:
        hasConfiguredValue(process.env.YOUTUBE_CLIENT_ID) &&
        hasConfiguredValue(process.env.YOUTUBE_CLIENT_SECRET) &&
        hasConfiguredValue(process.env.YOUTUBE_REDIRECT_URI) &&
        hasConfiguredValue(process.env.YOUTUBE_REFRESH_TOKEN) &&
        (hasConfiguredValue(process.env.YOUTUBE_OAUTH_STATE_SECRET) ||
          hasConfiguredValue(process.env.INTERNAL_API_SECRET))
    }),
    buildRequirement({
      id: "durable.admin_access",
      subsystem: "durable",
      description: "Acesso administrativo minimo para confirmar a convergencia duravel.",
      level: "durable_required",
      appliesTo: ["full_durable"],
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY"],
      satisfied:
        hasConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        hasAnyConfiguredValue(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"])
    })
  ];
}

function collectMissingForProfile(
  requirements: BackendEnvRequirement[],
  profile: BackendEnvProfile,
  options?: {
    includeSubsystemSpecific?: boolean;
  }
) {
  return requirements
    .filter(
      (requirement) =>
        requirement.appliesTo.includes(profile) &&
        !requirement.satisfied &&
        (options?.includeSubsystemSpecific || requirement.level !== "subsystem_specific")
    )
    .flatMap((requirement) => requirement.missing);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort();
}

export function buildBackendEnvCompletenessSnapshot(): BackendEnvCompletenessSnapshot {
  const requirements = buildBackendEnvRequirements();
  const groupedSubsystems = requirements.reduce<
    BackendEnvCompletenessSnapshot["subsystems"]
  >(
    (accumulator, requirement) => {
      const existing = accumulator[requirement.subsystem];
      const missing = requirement.satisfied ? [] : requirement.missing;

      accumulator[requirement.subsystem] = {
        satisfied: existing.satisfied && requirement.satisfied,
        missing: uniqueValues([...existing.missing, ...missing]),
        requirementLevels: uniqueValues([
          ...existing.requirementLevels,
          requirement.level
        ]) as BackendEnvRequirementLevel[]
      };

      return accumulator;
    },
    {
      deployment: { satisfied: true, missing: [], requirementLevels: [] },
      platform: { satisfied: true, missing: [], requirementLevels: [] },
      perimeter: { satisfied: true, missing: [], requirementLevels: [] },
      payments: { satisfied: true, missing: [], requirementLevels: [] },
      notifications: { satisfied: true, missing: [], requirementLevels: [] },
      telegram: { satisfied: true, missing: [], requirementLevels: [] },
      youtube: { satisfied: true, missing: [], requirementLevels: [] },
      durable: { satisfied: true, missing: [], requirementLevels: [] }
    }
  );

  const localMissing = uniqueValues(collectMissingForProfile(requirements, "local"));
  const releaseMissing = uniqueValues(collectMissingForProfile(requirements, "release"));
  const releaseOptionalMissing = uniqueValues(
    requirements
      .filter(
        (requirement) =>
          requirement.appliesTo.includes("release") &&
          requirement.level === "subsystem_specific" &&
          !requirement.satisfied
      )
      .flatMap((requirement) => requirement.missing)
  );
  const durableMissing = uniqueValues(collectMissingForProfile(requirements, "full_durable"));

  return {
    schemaVersion: "phase6-2026-04-18",
    profiles: {
      local: {
        satisfied: localMissing.length === 0,
        missing: localMissing,
        optionalMissing: [],
        missingRequiredCount: localMissing.length
      },
      release: {
        satisfied: releaseMissing.length === 0,
        missing: releaseMissing,
        optionalMissing: releaseOptionalMissing,
        missingRequiredCount: releaseMissing.length
      },
      full_durable: {
        satisfied: durableMissing.length === 0,
        missing: durableMissing,
        optionalMissing: [],
        missingRequiredCount: durableMissing.length
      }
    },
    subsystems: groupedSubsystems,
    requirements
  };
}
