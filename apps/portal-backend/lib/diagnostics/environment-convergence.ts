import { getAuthEnvDiagnostics, getNotificationEnv } from "../config/env.ts";
import {
  createNotificationWorkerDiagnosticsMetadata
} from "./notification-worker.ts";
import { buildPaymentReadinessSection } from "./payment-readiness.ts";
import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";

export const DURABLE_PROTECTION_EXPECTATIONS = {
  migrationName: "20260418120000_phase3_durable_abuse_controls.sql",
  requiredTables: ["request_rate_limits", "idempotency_keys"],
  requiredFunction: "claim_rate_limit_bucket",
  durableFlows: [
    "lead_create",
    "public_events",
    "public_triage",
    "noemia_chat",
    "payment_create",
    "payment_status"
  ]
} as const;

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

function buildDeploymentSection(appUrl: string | undefined): DiagnosticSection {
  const hostKind = resolveHostKind(appUrl);
  const appUrlConfigured = hasConfiguredValue(appUrl);

  if (!appUrlConfigured) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "deployment_app_url_missing",
      summary: "NEXT_PUBLIC_APP_URL ausente para o portal backend.",
      operatorAction:
        "Definir NEXT_PUBLIC_APP_URL com o host real do portal antes de validar autenticacao e callbacks.",
      verification: [
        "Confirmar que NEXT_PUBLIC_APP_URL existe no ambiente.",
        "Confirmar que o host usado no browser e o mesmo definido na variavel."
      ],
      details: {
        appUrlConfigured,
        appUrlHostKind: hostKind,
        portalHostAligned: false
      }
    });
  }

  if (hostKind === "portal") {
    return buildDiagnosticSection({
      status: "healthy",
      code: "deployment_portal_host_aligned",
      summary: "Host do portal alinhado ao backend protegido.",
      operatorAction:
        "Nenhuma acao imediata; usar este host como referencia para callbacks e validacoes manuais.",
      verification: [
        "Confirmar que o acesso de operador ocorre no host do portal.",
        "Confirmar que callbacks de auth e pagamento usam esse mesmo host."
      ],
      details: {
        appUrlConfigured,
        appUrlHostKind: hostKind,
        portalHostAligned: true
      }
    });
  }

  if (hostKind === "marketing" || hostKind === "invalid") {
    return buildDiagnosticSection({
      status: "hard_failure",
      code: "deployment_host_misaligned",
      summary: "Host do portal desalinhado; revisar NEXT_PUBLIC_APP_URL.",
      operatorAction:
        "Corrigir o host antes de promover o ambiente, porque callbacks e controles protegidos podem apontar para o dominio errado.",
      verification: [
        "Confirmar que NEXT_PUBLIC_APP_URL nao aponta para o apex de marketing.",
        "Confirmar que o valor e uma URL valida."
      ],
      details: {
        appUrlConfigured,
        appUrlHostKind: hostKind,
        portalHostAligned: false
      }
    });
  }

  return buildDiagnosticSection({
    status: "degraded",
    code: "deployment_custom_host",
    summary: "Host do portal usa configuracao customizada; validar alinhamento operacional.",
    operatorAction:
      "Confirmar manualmente que o host customizado pertence ao deployment protegido do portal.",
    verification: [
      "Comparar o host configurado com o deployment esperado.",
      "Executar a readiness protegida a partir desse host."
    ],
    details: {
      appUrlConfigured,
      appUrlHostKind: hostKind,
      portalHostAligned: false
    }
  });
}

function buildPlatformSection(): DiagnosticSection {
  const authDiagnostics = getAuthEnvDiagnostics();
  const publicAuthReady =
    authDiagnostics.appUrlConfigured &&
    authDiagnostics.supabaseUrlConfigured &&
    authDiagnostics.publicKeySource !== null;
  const adminAuthReady = authDiagnostics.adminKeySource !== null;

  if (publicAuthReady && adminAuthReady) {
    return buildDiagnosticSection({
      status: "healthy",
      code: "platform_auth_ready",
      summary: "Supabase publico e administrativo configurados.",
      operatorAction:
        "Nenhuma acao imediata; manter a validacao protegida apos cada deploy.",
      verification: [
        "Confirmar login staff e cliente.",
        "Confirmar que rotas internas continuam protegidas."
      ],
      details: authDiagnostics
    });
  }

  if (!publicAuthReady && !adminAuthReady) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "platform_auth_missing",
      summary: "Auth publico e administrativo incompletos.",
      operatorAction:
        "Preencher as variaveis de auth antes de considerar o ambiente utilizavel.",
      verification: [
        "Configurar NEXT_PUBLIC_SUPABASE_URL.",
        "Configurar chave publica do Supabase.",
        "Configurar chave administrativa do Supabase."
      ],
      details: authDiagnostics
    });
  }

  return buildDiagnosticSection({
    status: "degraded",
    code: "platform_auth_partial",
    summary: "Base auth parcialmente configurada; operacoes privilegiadas podem degradar.",
    operatorAction:
      "Fechar a lacuna entre auth publico e administrativo antes de ampliar validacoes ou promover o ambiente.",
    verification: [
      "Comparar missingForPublicAuth e missingForAdminAuth.",
      "Validar login e uma operacao administrativa real."
    ],
    details: authDiagnostics
  });
}

function buildPerimeterSection(): DiagnosticSection {
  const internalApiSecretConfigured = hasConfiguredValue(process.env.INTERNAL_API_SECRET);
  const workerMetadata = createNotificationWorkerDiagnosticsMetadata();

  if (
    internalApiSecretConfigured &&
    workerMetadata.workerSecretConfigured &&
    workerMetadata.cronSecretConfigured
  ) {
    return buildDiagnosticSection({
      status: "healthy",
      code: "perimeter_internal_guards_ready",
      summary: "Perimetro interno com secrets de diagnostico, cron e worker configurados.",
      operatorAction:
        "Usar apenas endpoints protegidos com secret ou sessao staff para operacao interna.",
      verification: [
        "Confirmar acesso protegido a /api/internal/readiness.",
        "Confirmar acesso protegido ao worker de notificacoes.",
        "Confirmar que chamadas sem secret/sessao falham."
      ],
      details: {
        internalApiSecretConfigured,
        workerSecretConfigured: workerMetadata.workerSecretConfigured,
        cronSecretConfigured: workerMetadata.cronSecretConfigured
      }
    });
  }

  return buildDiagnosticSection({
    status: "missing_configuration",
    code: "perimeter_internal_guards_missing",
    summary: "Perimetro interno sem todos os secrets operacionais exigidos.",
    operatorAction:
      "Preencher INTERNAL_API_SECRET, NOTIFICATIONS_WORKER_SECRET e CRON_SECRET antes de promover.",
    verification: [
      "Confirmar INTERNAL_API_SECRET.",
      "Confirmar NOTIFICATIONS_WORKER_SECRET.",
      "Confirmar CRON_SECRET."
    ],
    details: {
      internalApiSecretConfigured,
      workerSecretConfigured: workerMetadata.workerSecretConfigured,
      cronSecretConfigured: workerMetadata.cronSecretConfigured
    }
  });
}

function buildNotificationsSection(): DiagnosticSection {
  let notificationEnv;

  try {
    notificationEnv = getNotificationEnv();
  } catch {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "notifications_env_unreadable",
      summary: "Nao foi possivel resolver o ambiente de notificacoes porque faltam variaveis base do backend.",
      operatorAction:
        "Preencher NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL e as variaveis do provedor antes de tratar a fila como convergida.",
      verification: [
        "Confirmar NEXT_PUBLIC_APP_URL.",
        "Confirmar NEXT_PUBLIC_SUPABASE_URL.",
        "Confirmar o provedor e os secrets do worker."
      ],
      details: {
        provider: process.env.NOTIFICATIONS_PROVIDER?.trim() || null,
        providerConfigured: false,
        workerSecretConfigured: hasConfiguredValue(process.env.NOTIFICATIONS_WORKER_SECRET),
        cronSecretConfigured: hasConfiguredValue(process.env.CRON_SECRET)
      }
    });
  }

  const metadata = createNotificationWorkerDiagnosticsMetadata();

  if (
    metadata.providerConfigured &&
    metadata.workerSecretConfigured &&
    metadata.cronSecretConfigured
  ) {
    return buildDiagnosticSection({
      status: "healthy",
      code: "notifications_env_ready",
      summary: "Worker e provedor de notificacoes configurados.",
      operatorAction:
        "Executar uma rodada protegida do worker apos deploy e observar a fila.",
      verification: [
        "Confirmar provider configurado.",
        "Confirmar secret do worker e secret do cron.",
        "Executar o processamento protegido da fila."
      ],
      details: {
        provider: notificationEnv.provider,
        ...metadata
      }
    });
  }

  return buildDiagnosticSection({
    status: "missing_configuration",
    code: "notifications_env_missing",
    summary: "Fila de notificacoes sem todas as dependencias operacionais configuradas.",
    operatorAction:
      "Completar provider e secrets antes de tratar a fila como operacionalmente convergida.",
    verification: [
      "Confirmar provedor SMTP/Resend.",
      "Confirmar EMAIL_FROM.",
      "Confirmar NOTIFICATIONS_WORKER_SECRET e CRON_SECRET."
    ],
    details: {
      provider: notificationEnv.provider,
      ...metadata
    }
  });
}

function buildTelegramSection(): DiagnosticSection {
  const botTokenConfigured = hasConfiguredValue(process.env.TELEGRAM_BOT_TOKEN);
  const webhookSecretConfigured = hasConfiguredValue(process.env.TELEGRAM_WEBHOOK_SECRET);

  if (botTokenConfigured && webhookSecretConfigured) {
    return buildDiagnosticSection({
      status: "healthy",
      code: "telegram_ready",
      summary: "Telegram protegido e pronto para operacao.",
      operatorAction:
        "Validar webhook e distribuicao protegida apenas apos cada mudanca relevante de ambiente.",
      verification: [
        "Confirmar TELEGRAM_BOT_TOKEN.",
        "Confirmar TELEGRAM_WEBHOOK_SECRET."
      ],
      details: {
        botTokenConfigured,
        webhookSecretConfigured
      }
    });
  }

  if (!botTokenConfigured && !webhookSecretConfigured) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "telegram_missing",
      summary: "Telegram ainda nao esta configurado.",
      operatorAction:
        "Preencher token e secret antes de depender do canal em producao.",
      verification: [
        "Configurar TELEGRAM_BOT_TOKEN.",
        "Configurar TELEGRAM_WEBHOOK_SECRET."
      ],
      details: {
        botTokenConfigured,
        webhookSecretConfigured
      }
    });
  }

  return buildDiagnosticSection({
    status: "degraded",
    code: "telegram_partial",
    summary: "Telegram parcialmente configurado; revisar token e secret do webhook.",
    operatorAction:
      "Completar a configuracao antes de assumir que o canal esta protegido e funcional.",
    verification: [
      "Comparar token e secret configurados.",
      "Validar o webhook protegido do Telegram."
    ],
    details: {
      botTokenConfigured,
      webhookSecretConfigured
    }
  });
}

function buildDurableExpectationsSection(): DiagnosticSection {
  return buildDiagnosticSection({
    status: "healthy",
    code: "durable_expectations_documented",
    summary: "As dependencias esperadas da protecao duravel estao explicitadas para verificacao operacional.",
    operatorAction:
      "Cruzar estas expectativas com o readiness protegido para confirmar convergencia de ambiente.",
    verification: [
      `Confirmar migracao ${DURABLE_PROTECTION_EXPECTATIONS.migrationName}.`,
      "Confirmar tabelas request_rate_limits e idempotency_keys.",
      "Confirmar funcao claim_rate_limit_bucket."
    ],
    details: DURABLE_PROTECTION_EXPECTATIONS
  });
}

export function buildEnvironmentConvergenceSections() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    undefined;

  return {
    deployment: buildDeploymentSection(appUrl),
    platform: buildPlatformSection(),
    perimeter: buildPerimeterSection(),
    payments: buildPaymentReadinessSection(),
    notifications: buildNotificationsSection(),
    telegram: buildTelegramSection(),
    durableExpectations: buildDurableExpectationsSection()
  };
}
