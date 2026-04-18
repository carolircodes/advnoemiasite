import test from "node:test";
import assert from "node:assert/strict";

import { buildEnvironmentConvergenceSections } from "../lib/diagnostics/environment-convergence.ts";
import { buildPaymentReadinessSection } from "../lib/diagnostics/payment-readiness.ts";
import { buildBackendReadinessReport } from "../lib/diagnostics/backend-readiness.ts";
import { combineDiagnosticStatuses } from "../lib/diagnostics/status.ts";

function withEnv(
  updates: Record<string, string | undefined>,
  callback: () => void | Promise<void>
) {
  const previousEntries = Object.entries(updates).map(([key]) => [key, process.env[key]] as const);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key, value] of previousEntries) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = callback();

    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(restore);
    }

    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("payment readiness reports degraded when signature enforcement is disabled", () => {
  return withEnv(
    {
      MERCADO_PAGO_ACCESS_TOKEN: "token",
      MERCADO_PAGO_WEBHOOK_SECRET: "secret",
      NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "public-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "service-secret",
      NEXT_PUBLIC_APP_URL: "https://portal.advnoemia.com.br",
      MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE: "false"
    },
    () => {
      const section = buildPaymentReadinessSection();

      assert.equal(section.status, "degraded");
      assert.equal(section.code, "payments_signature_not_enforced");
      assert.equal(section.details.signatureEnforced, false);
    }
  );
});

test("environment convergence reports missing internal perimeter secrets clearly", () => {
  return withEnv(
    {
      NEXT_PUBLIC_APP_URL: "https://portal.advnoemia.com.br",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
      SUPABASE_SECRET_KEY: "service-key",
      INTERNAL_API_SECRET: undefined,
      NOTIFICATIONS_WORKER_SECRET: undefined,
      CRON_SECRET: undefined
    },
    () => {
      const sections = buildEnvironmentConvergenceSections();

      assert.equal(sections.perimeter.status, "missing_configuration");
      assert.equal(sections.perimeter.code, "perimeter_internal_guards_missing");
      assert.equal(
        sections.perimeter.verification.includes("Confirmar INTERNAL_API_SECRET."),
        true
      );
    }
  );
});

test("diagnostic status combiner promotes fallback and hard failure consistently", () => {
  assert.equal(
    combineDiagnosticStatuses([{ status: "healthy" }, { status: "fallback" }]),
    "fallback"
  );
  assert.equal(
    combineDiagnosticStatuses([{ status: "fallback" }, { status: "hard_failure" }]),
    "hard_failure"
  );
});

test("backend readiness report exposes operator workflow without leaking secrets", async () => {
  await withEnv(
    {
      NEXT_PUBLIC_APP_URL: "https://portal.advnoemia.com.br",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
      SUPABASE_SECRET_KEY: "service-key",
      INTERNAL_API_SECRET: "internal-secret",
      NOTIFICATIONS_PROVIDER: "resend",
      RESEND_API_KEY: "resend-key",
      EMAIL_FROM: "noreply@advnoemia.com.br",
      NOTIFICATIONS_WORKER_SECRET: "worker-secret",
      CRON_SECRET: "cron-secret",
      MERCADO_PAGO_ACCESS_TOKEN: "mp-token",
      MERCADO_PAGO_WEBHOOK_SECRET: "mp-webhook",
      NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "mp-public",
      MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE: "true",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret"
    },
    async () => {
      const report = await buildBackendReadinessReport({
        getWorkerDiagnostics: async () => ({
          status: "healthy",
          code: "notifications_worker_ready",
          summary: "Worker de notificacoes pronto e fila observavel.",
          operatorAction: "Nenhuma acao imediata.",
          verification: ["Executar uma rodada protegida do worker."],
          details: {
            providerConfigured: true,
            queue: {
              ready: 0,
              retryableFailures: 0,
              processing: 0,
              staleProcessing: 0,
              terminalFailures: 0
            },
            retryPolicy: {
              maxAttempts: 5,
              staleProcessingMinutes: 15
            }
          }
        })
      });
      const serialized = JSON.stringify(report);

      assert.equal(report.schemaVersion, "phase5-2026-04-18");
      assert.equal(report.operator.protectedEndpoint, "/api/internal/readiness");
      assert.equal(Array.isArray(report.operator.quickstart), true);
      assert.equal(typeof report.sections.payments.operatorAction, "string");
      assert.equal(typeof report.sections.perimeter.code, "string");
      assert.equal(serialized.includes("internal-secret"), false);
      assert.equal(serialized.includes("worker-secret"), false);
      assert.equal(serialized.includes("mp-token"), false);
      assert.equal(serialized.includes("telegram-token"), false);
    }
  );
});
