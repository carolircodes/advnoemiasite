import { getAuthEnvDiagnostics, getNotificationEnv } from "../config/env.ts";
import { getDurableProtectionStatus } from "../http/durable-abuse-protection.ts";

type ReadinessLevel =
  | "healthy"
  | "degraded"
  | "missing_configuration"
  | "fallback"
  | "hard_failure";

type ReadinessSection = {
  status: ReadinessLevel;
  summary: string;
  details: Record<string, unknown>;
};

const STATUS_ORDER: ReadinessLevel[] = [
  "healthy",
  "degraded",
  "missing_configuration",
  "fallback",
  "hard_failure"
];

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveHostKind(value: string | undefined) {
  if (!hasConfiguredValue(value)) {
    return "missing";
  }

  try {
    const host = new URL(value as string).host.toLowerCase();

    if (host === "portal.advnoemia.com.br") {
      return "portal";
    }

    if (host === "advnoemia.com.br" || host === "www.advnoemia.com.br") {
      return "marketing";
    }

    return "custom";
  } catch {
    return "invalid";
  }
}

function combineStatuses(sections: ReadinessSection[]): ReadinessLevel {
  return sections.reduce<ReadinessLevel>((worst, section) => {
    return STATUS_ORDER.indexOf(section.status) > STATUS_ORDER.indexOf(worst)
      ? section.status
      : worst;
  }, "healthy");
}

function buildDeploymentSection(appUrl: string | undefined): ReadinessSection {
  const hostKind = resolveHostKind(appUrl);
  const appUrlConfigured = hasConfiguredValue(appUrl);

  if (!appUrlConfigured) {
    return {
      status: "missing_configuration",
      summary: "NEXT_PUBLIC_APP_URL ausente para o portal backend.",
      details: {
        appUrlConfigured,
        appUrlHostKind: hostKind,
        portalHostAligned: false
      }
    };
  }

  if (hostKind === "portal") {
    return {
      status: "healthy",
      summary: "Host do portal alinhado ao backend protegido.",
      details: {
        appUrlConfigured,
        appUrlHostKind: hostKind,
        portalHostAligned: true
      }
    };
  }

  if (hostKind === "marketing" || hostKind === "invalid") {
    return {
      status: "hard_failure",
      summary: "Host do portal desalinhado; revisar NEXT_PUBLIC_APP_URL.",
      details: {
        appUrlConfigured,
        appUrlHostKind: hostKind,
        portalHostAligned: false
      }
    };
  }

  return {
    status: "degraded",
    summary: "Host do portal usa configuracao customizada; validar alinhamento operacional.",
    details: {
      appUrlConfigured,
      appUrlHostKind: hostKind,
      portalHostAligned: false
    }
  };
}

function buildPaymentsSection(): ReadinessSection {
  const accessTokenConfigured = hasConfiguredValue(process.env.MERCADO_PAGO_ACCESS_TOKEN);
  const webhookSecretConfigured = hasConfiguredValue(process.env.MERCADO_PAGO_WEBHOOK_SECRET);

  if (accessTokenConfigured && webhookSecretConfigured) {
    return {
      status: "healthy",
      summary: "Pagamento pronto para create e webhook assinados.",
      details: {
        accessTokenConfigured,
        webhookSecretConfigured
      }
    };
  }

  if (!accessTokenConfigured && !webhookSecretConfigured) {
    return {
      status: "missing_configuration",
      summary: "Credenciais de pagamento ausentes.",
      details: {
        accessTokenConfigured,
        webhookSecretConfigured
      }
    };
  }

  return {
    status: "degraded",
    summary: "Pagamento parcialmente configurado; create e webhook nao estao completos.",
    details: {
      accessTokenConfigured,
      webhookSecretConfigured
    }
  };
}

function buildTelegramSection(): ReadinessSection {
  const botTokenConfigured = hasConfiguredValue(process.env.TELEGRAM_BOT_TOKEN);
  const webhookSecretConfigured = hasConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET);

  if (botTokenConfigured && webhookSecretConfigured) {
    return {
      status: "healthy",
      summary: "Telegram protegido e pronto para operacao.",
      details: {
        botTokenConfigured,
        webhookSecretConfigured
      }
    };
  }

  if (!botTokenConfigured && !webhookSecretConfigured) {
    return {
      status: "missing_configuration",
      summary: "Telegram ainda nao esta configurado.",
      details: {
        botTokenConfigured,
        webhookSecretConfigured
      }
    };
  }

  return {
    status: "degraded",
    summary: "Telegram parcialmente configurado; revisar token e secret do webhook.",
    details: {
      botTokenConfigured,
      webhookSecretConfigured
    }
  };
}

function buildPlatformSection(): ReadinessSection {
  const authDiagnostics = getAuthEnvDiagnostics();
  const publicAuthReady =
    authDiagnostics.appUrlConfigured &&
    authDiagnostics.supabaseUrlConfigured &&
    authDiagnostics.publicKeySource !== null;
  const adminAuthReady = authDiagnostics.adminKeySource !== null;

  if (publicAuthReady && adminAuthReady) {
    return {
      status: "healthy",
      summary: "Supabase publico e administrativo configurados.",
      details: authDiagnostics
    };
  }

  if (!publicAuthReady && !adminAuthReady) {
    return {
      status: "missing_configuration",
      summary: "Auth publico e administrativo incompletos.",
      details: authDiagnostics
    };
  }

  return {
    status: "degraded",
    summary: "Base auth parcialmente configurada; operacoes privilegiadas podem degradar.",
    details: authDiagnostics
  };
}

export async function buildBackendReadinessReport(dependencies?: {
  getWorkerDiagnostics?: () => Promise<{
    status: "healthy" | "degraded" | "missing_configuration" | "fallback" | "hard_failure";
    summary: string;
    details: Record<string, unknown>;
  }>;
}) {
  const notificationEnv = getNotificationEnv();
  const durableProtection = await getDurableProtectionStatus();
  const worker =
    dependencies?.getWorkerDiagnostics ||
    (async () => {
      const module = await import("../services/process-notifications.ts");
      return module.inspectNotificationWorkerDiagnostics();
    });
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    undefined;
  const workerDiagnostics = await worker();

  const deployment = buildDeploymentSection(appUrl);
  const platform = buildPlatformSection();
  const payments = buildPaymentsSection();
  const telegram = buildTelegramSection();

  const notifications: ReadinessSection = {
    status: workerDiagnostics.status,
    summary: workerDiagnostics.summary,
    details: {
      provider: notificationEnv.provider,
      cronSecretConfigured: hasConfiguredValue(process.env.CRON_SECRET),
      workerSecretConfigured: hasConfiguredValue(process.env.NOTIFICATIONS_WORKER_SECRET),
      providerConfigured: workerDiagnostics.details.providerConfigured,
      queue: workerDiagnostics.details.queue,
      retryPolicy: workerDiagnostics.details.retryPolicy
    }
  };

  const abuseProtection: ReadinessSection = {
    status:
      durableProtection.runtime.mode === "memory-fallback"
        ? "fallback"
        : durableProtection.migrationApplied
          ? "healthy"
          : "degraded",
    summary:
      durableProtection.runtime.mode === "memory-fallback"
        ? "Limiter duravel degradado para memoria; aplicar ou reconciliar a migracao em todos os ambientes."
        : durableProtection.migrationApplied
          ? "Protecao duravel ativa para rate limit e idempotencia."
          : "Protecao duravel parcialmente indisponivel; fallback seguro mantido.",
    details: durableProtection
  };

  const sections = {
    deployment,
    platform,
    abuseProtection,
    payments,
    notifications,
    telegram
  };

  return {
    status: combineStatuses(Object.values(sections)),
    checkedAt: new Date().toISOString(),
    sections
  };
}
