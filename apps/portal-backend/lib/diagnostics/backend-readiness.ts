import {
  summarizeBackendEnforcement,
  type BackendEnforcementProfile
} from "./backend-enforcement.ts";
import { getDurableProtectionStatus } from "../http/durable-abuse-protection.ts";
import {
  DURABLE_PROTECTION_EXPECTATIONS,
  buildEnvironmentConvergenceSections
} from "./environment-convergence.ts";
import { buildDatabaseSecurityReadinessSection } from "./database-security.ts";
import {
  combineDiagnosticStatuses,
  type DiagnosticSection
} from "./status.ts";
import { assessPushPilotReadiness } from "../notifications/push-pilot.ts";
import { buildChannelWebhookReadinessSection } from "./channel-readiness.ts";

export async function buildBackendReadinessReport(dependencies?: {
  enforcementProfile?: BackendEnforcementProfile;
  getWorkerDiagnostics?: () => Promise<{
    status: "healthy" | "degraded" | "missing_configuration" | "fallback" | "hard_failure";
    code: string;
    summary: string;
    operatorAction: string;
    verification: string[];
    details: Record<string, unknown>;
  }>;
}) {
  const durableProtection = await getDurableProtectionStatus();
  const worker =
    dependencies?.getWorkerDiagnostics ||
    (async () => {
      const module = await import("../services/process-notifications.ts");
      return module.inspectNotificationWorkerDiagnostics();
    });
  const workerDiagnostics = await worker();
  const pushPilot = await assessPushPilotReadiness();
  const envSections = buildEnvironmentConvergenceSections();

  const notifications = {
    ...envSections.notifications,
    status: workerDiagnostics.status,
    code: workerDiagnostics.code,
    summary: workerDiagnostics.summary,
    operatorAction: workerDiagnostics.operatorAction,
    verification: workerDiagnostics.verification,
    details: {
      provider: envSections.notifications.details.provider,
      cronSecretConfigured: envSections.notifications.details.cronSecretConfigured,
      workerSecretConfigured: envSections.notifications.details.workerSecretConfigured,
      providerConfigured: workerDiagnostics.details.providerConfigured,
      queue: workerDiagnostics.details.queue,
      retryPolicy: workerDiagnostics.details.retryPolicy,
      pushPilot
    }
  };

  const abuseProtection: DiagnosticSection = {
    status:
      durableProtection.runtime.mode === "memory-fallback"
        ? "fallback"
        : durableProtection.migrationApplied
          ? "healthy"
          : "degraded",
    code:
      durableProtection.runtime.mode === "memory-fallback"
        ? "durable_runtime_fallback_active"
        : durableProtection.migrationApplied
          ? "durable_runtime_ready"
          : "durable_runtime_partial",
    summary:
      durableProtection.runtime.mode === "memory-fallback"
        ? "Limiter duravel degradado para memoria; aplicar ou reconciliar a migracao em todos os ambientes."
        : durableProtection.migrationApplied
          ? "Protecao duravel ativa para rate limit e idempotencia."
          : "Protecao duravel parcialmente indisponivel; fallback seguro mantido.",
    operatorAction:
      durableProtection.runtime.mode === "memory-fallback"
        ? "Tratar o ambiente como nao convergido ate confirmar a migracao e as primitivas duraveis."
        : durableProtection.migrationApplied
          ? "Manter a verificacao protegida apos deploy e acompanhar novos eventos de fallback."
          : "Confirmar a aplicacao da migracao e a disponibilidade simultanea de rate limit e idempotencia.",
    verification: [
      `Confirmar migracao ${DURABLE_PROTECTION_EXPECTATIONS.migrationName}.`,
      `Confirmar funcao ${DURABLE_PROTECTION_EXPECTATIONS.requiredFunction}.`,
      "Confirmar se runtime.mode esta em durable ou memory-fallback.",
      "Conferir a cobertura por flow em abuseProtection.details.flows."
    ],
    details: durableProtection
  };

  const sections: Record<string, DiagnosticSection> = {
    deployment: envSections.deployment,
    platform: envSections.platform,
    perimeter: envSections.perimeter,
    abuseProtection,
    durableExpectations: envSections.durableExpectations,
    databaseSecurity: buildDatabaseSecurityReadinessSection(),
    channelReadiness: buildChannelWebhookReadinessSection(),
    environmentCompleteness: envSections.environmentCompleteness,
    payments: envSections.payments,
    notifications,
    telegram: envSections.telegram
  };

  const operatorAlerts = Object.entries(sections)
    .filter(([, section]) => section.status !== "healthy")
    .map(([key, section]) => ({
      subsystem: key,
      status: section.status,
      code: section.code,
      summary: section.summary,
      operatorAction: section.operatorAction
    }));

  const urgentActions = operatorAlerts
    .filter((item) => item.status === "hard_failure" || item.status === "fallback")
    .map((item) => `${item.subsystem}: ${item.operatorAction}`);

  if (urgentActions.length === 0 && operatorAlerts.length > 0) {
    urgentActions.push(...operatorAlerts.map((item) => `${item.subsystem}: ${item.operatorAction}`));
  }

  const enforcement = summarizeBackendEnforcement(sections, {
    profile: dependencies?.enforcementProfile || "production",
    runtimeVerification: {
      mode: "required",
      attempted: true,
      available: true,
      reason: null
    }
  });

  return {
    schemaVersion: "phase6-2026-04-18",
    status: combineDiagnosticStatuses(Object.values(sections)),
    checkedAt: new Date().toISOString(),
    sections,
    operator: {
      protectedEndpoint: "/api/internal/readiness",
      access: "x-internal-api-secret ou sessao staff autenticada",
      quickstart: [
        "Executar npm run operations:verify no workspace do backend.",
        "Consultar GET /api/internal/readiness com secret interno ou sessao staff.",
        "Comparar operatorAlerts, abuseProtection.details.runtime e notifications.details.queue apos o deploy."
      ],
      releaseSafety: {
        profile: dependencies?.enforcementProfile || "production",
        enforcementLevel: enforcement.enforcementLevel,
        deployAllowed: enforcement.deployAllowed,
        blockers: enforcement.blockers.map((item) => ({
          subsystem: item.subsystem,
          code: item.code,
          reason: item.enforcement.reason,
          operatorAction: item.operatorAction
        })),
        warnings: enforcement.warnings.map((item) => ({
          subsystem: item.subsystem,
          code: item.code,
          level: item.enforcement.level,
          reason: item.enforcement.reason
        }))
      },
      urgentActions,
      alerts: operatorAlerts
    }
  };
}
