import test from "node:test";
import assert from "node:assert/strict";

import {
  requireInternalOperatorAccess,
  requireRouteSecretOrStaffAccess
} from "../lib/auth/api-authorization.ts";
import {
  getDurableProtectionStatus,
  resetDurableProtectionRuntimeState,
  consumeDurableRateLimit
} from "../lib/http/durable-abuse-protection.ts";
import { buildBackendReadinessReport } from "../lib/diagnostics/backend-readiness.ts";
import { getNotificationWorkerDiagnostics } from "../lib/diagnostics/notification-worker.ts";

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

test("internal operator access returns 401 for missing secret and no staff session", async () => {
  await withEnv({ INTERNAL_API_SECRET: "expected-secret" }, async () => {
    const access = await requireInternalOperatorAccess({
      request: new Request("https://portal.advnoemia.com.br/api/internal/acquisition"),
      service: "internal_acquisition",
      action: "read",
      resolveStaffAccess: async () => ({
        ok: false,
        status: 401,
        error: "Faca login para acessar a API interna."
      })
    });

    assert.equal(access.ok, false);
    if (!access.ok) {
      assert.equal(access.status, 401);
    }
  });
});

test("internal operator access returns 403 for authenticated non-staff profiles", async () => {
  await withEnv({ INTERNAL_API_SECRET: "expected-secret" }, async () => {
    const access = await requireInternalOperatorAccess({
      request: new Request("https://portal.advnoemia.com.br/api/internal/performance"),
      service: "internal_performance",
      action: "read",
      resolveStaffAccess: async () => ({
        ok: false,
        status: 403,
        error: "Apenas perfis internos autorizados podem acessar esta API."
      })
    });

    assert.equal(access.ok, false);
    if (!access.ok) {
      assert.equal(access.status, 403);
    }
  });
});

test("internal operator access accepts both staff fallback and internal secret", async () => {
  const viaStaff = await requireInternalOperatorAccess({
    request: new Request("https://portal.advnoemia.com.br/api/internal/email-preview"),
    service: "internal_email_preview",
    action: "read",
    resolveStaffAccess: async () => ({
      ok: true,
      profile: {
        id: "staff-4",
        email: "staff@example.com",
        full_name: "Equipe Interna",
        phone: null,
        role: "admin",
        is_active: true,
        invited_at: null,
        first_login_completed_at: null
      }
    })
  });

  assert.equal(viaStaff.ok, true);
  assert.equal(viaStaff.actor, "staff");

  await withEnv({ INTERNAL_API_SECRET: "expected-secret" }, async () => {
    const viaSecret = await requireInternalOperatorAccess({
      request: new Request("https://portal.advnoemia.com.br/api/internal/email-preview", {
        headers: { "x-internal-api-secret": "expected-secret" }
      }),
      service: "internal_email_preview",
      action: "read"
    });

    const access = await requireRouteSecretOrStaffAccess({
      request: new Request("https://portal.advnoemia.com.br/api/internal/email-preview", {
        headers: { "x-internal-api-secret": "expected-secret" }
      }),
      service: "internal_email_preview",
      action: "read",
      expectedSecret: "expected-secret",
      secretName: "INTERNAL_API_SECRET",
      errorMessage: "internal_route_requires_operator_access",
      headerNames: ["x-internal-api-secret"]
    });

    assert.equal(viaSecret.ok, true);
    assert.equal(viaSecret.actor, "internal-secret");
    assert.equal(access.ok, true);
    assert.equal(access.actor, "internal-secret");
  });
});

test("durable protection status reports flow coverage and fallback state without leaking raw errors", async () => {
  resetDurableProtectionRuntimeState();

  await consumeDurableRateLimit(
    {
      bucket: "payment-create",
      key: "phase4-client",
      limit: 1,
      windowMs: 60_000
    },
    {
      async claimRateLimitBucket() {
        throw new Error('relation "request_rate_limits" does not exist');
      },
      async insertIdempotencyRecord() {
        throw new Error("not-used");
      },
      async getIdempotencyRecord() {
        return null;
      },
      async updateIdempotencyRecord() {
        return null;
      },
      async getDurableStatus() {
        return {
          provider: "supabase-postgres" as const,
          available: false,
          rateLimits: false,
          idempotency: false
        };
      }
    }
  );

  const status = await getDurableProtectionStatus({
    async claimRateLimitBucket() {
      throw new Error("not-used");
    },
    async insertIdempotencyRecord() {
      throw new Error("not-used");
    },
    async getIdempotencyRecord() {
      return null;
    },
    async updateIdempotencyRecord() {
      return null;
    },
    async getDurableStatus() {
      return {
        provider: "supabase-postgres" as const,
        available: false,
        rateLimits: false,
        idempotency: false
      };
    }
  });

  assert.equal(status.runtime.mode, "memory-fallback");
  assert.equal(status.runtime.lastFallbackReason, "migration_missing_or_unapplied");
  assert.equal(status.flows.some((flow) => flow.flow === "payment_create"), true);
  assert.equal("error" in status, false);
});

test("notification worker diagnostics surface stale processing and terminal failures", async () => {
  return withEnv(
    {
      NOTIFICATIONS_PROVIDER: "resend",
      RESEND_API_KEY: "resend-key",
      EMAIL_FROM: "noreply@advnoemia.com.br",
      NOTIFICATIONS_WORKER_SECRET: "worker-secret",
      CRON_SECRET: "cron-secret"
    },
    async () => {
      const adapter = {
        countByStatus: async (
          status: "pending" | "failed" | "processing",
          options: {
            terminalOnly?: boolean;
            staleBefore?: string;
            availableBefore?: string;
          } = {}
        ) => {
          if (status === "pending") return 3;
          if (status === "processing" && options.staleBefore) return 1;
          if (status === "processing") return 2;
          if (status === "failed" && options.terminalOnly) return 2;
          if (status === "failed") return 4;
          return 0;
        }
      };

      const diagnostics = await getNotificationWorkerDiagnostics(adapter);

      assert.equal(diagnostics.status, "degraded");
      assert.deepEqual(diagnostics.details.queue, {
        ready: 3,
        retryableFailures: 4,
        processing: 2,
        staleProcessing: 1,
        terminalFailures: 2
      });
    }
  );
});

test("backend readiness report keeps a stable protected shape and excludes secret values", async () => {
  resetDurableProtectionRuntimeState();

  await withEnv(
    {
      NEXT_PUBLIC_APP_URL: "https://portal.advnoemia.com.br",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
      SUPABASE_SECRET_KEY: "service-key",
      NOTIFICATIONS_PROVIDER: "resend",
      RESEND_API_KEY: "resend-key",
      EMAIL_FROM: "noreply@advnoemia.com.br",
      NOTIFICATIONS_WORKER_SECRET: "worker-secret",
      CRON_SECRET: "cron-secret",
      INTERNAL_API_SECRET: "internal-secret",
      MERCADO_PAGO_ACCESS_TOKEN: "mp-token",
      MERCADO_PAGO_WEBHOOK_SECRET: "mp-webhook",
      TELEGRAM_BOT_TOKEN: "telegram-bot",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret"
    },
    async () => {
      const report = await buildBackendReadinessReport({
        getWorkerDiagnostics: async () => ({
          status: "healthy",
          summary: "Worker de notificacoes pronto e fila observavel.",
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

      assert.equal(typeof report.status, "string");
      assert.equal(report.sections.deployment.status, "healthy");
      assert.equal(report.sections.abuseProtection.details.provider, "supabase-postgres");
      assert.equal(serialized.includes("worker-secret"), false);
      assert.equal(serialized.includes("internal-secret"), false);
      assert.equal(serialized.includes("mp-token"), false);
      assert.equal(serialized.includes("telegram-bot"), false);
    }
  );
});
