import test from "node:test";
import assert from "node:assert/strict";

import { buildBackendEnvCompletenessSnapshot } from "../lib/config/backend-env-governance.ts";
import {
  buildBackendOperationsVerificationReport,
  renderBackendOperationsVerificationReport,
  summarizeBackendEnforcement
} from "../lib/diagnostics/backend-enforcement.ts";

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

test("environment completeness distinguishes release blockers from subsystem-specific gaps", () => {
  return withEnv(
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
      TELEGRAM_BOT_TOKEN: undefined,
      TELEGRAM_WEBHOOK_SECRET: undefined
    },
    () => {
      const snapshot = buildBackendEnvCompletenessSnapshot();

      assert.equal(snapshot.profiles.release.satisfied, true);
      assert.equal(snapshot.profiles.release.optionalMissing.includes("TELEGRAM_BOT_TOKEN"), true);
      assert.equal(snapshot.profiles.release.missing.includes("TELEGRAM_BOT_TOKEN"), false);
    }
  );
});

test("production enforcement blocks webhook signature downgrade while ci mode keeps it actionable", () => {
  const sections = {
    payments: {
      status: "degraded" as const,
      code: "payments_signature_not_enforced",
      summary: "Pagamento operacional sem enforcement de assinatura.",
      operatorAction: "Habilitar enforcement antes da promocao final.",
      verification: ["Confirmar MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE."],
      details: {}
    }
  };

  const production = summarizeBackendEnforcement(sections, {
    profile: "production",
    runtimeVerification: {
      mode: "required",
      attempted: true,
      available: true,
      reason: null
    }
  });
  const ci = summarizeBackendEnforcement(sections, {
    profile: "ci",
    runtimeVerification: {
      mode: "off",
      attempted: false,
      available: false,
      reason: "disabled_by_policy"
    }
  });

  assert.equal(production.deployAllowed, false);
  assert.equal(production.blockers[0]?.code, "payments_signature_not_enforced");
  assert.equal(ci.deployAllowed, true);
  assert.equal(ci.warnings[0]?.enforcement.level, "warning");
});

test("required production runtime verification blocks when durable runtime cannot be proved", async () => {
  await withEnv(
    {
      NEXT_PUBLIC_APP_URL: "https://portal.advnoemia.com.br",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SECRET_KEY: undefined
    },
    async () => {
      const report = await buildBackendOperationsVerificationReport({
        profile: "production",
        runtimeMode: "required"
      });

      assert.equal(report.deployAllowed, false);
      assert.equal(report.blockers.some((item) => item.code === "durable_runtime_verification_unavailable"), true);
    }
  );
});

test("operations verify json output stays machine-readable and non-sensitive", async () => {
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
      const report = await buildBackendOperationsVerificationReport({
        profile: "ci",
        runtimeMode: "off"
      });
      const rendered = renderBackendOperationsVerificationReport(report, "json");
      const parsed = JSON.parse(rendered);
      const serialized = JSON.stringify(parsed);

      assert.equal(parsed.schemaVersion, "phase6-2026-04-18");
      assert.equal(parsed.profile, "ci");
      assert.equal(typeof parsed.deployAllowed, "boolean");
      assert.equal(Array.isArray(parsed.sections), true);
      assert.equal(serialized.includes("internal-secret"), false);
      assert.equal(serialized.includes("worker-secret"), false);
      assert.equal(serialized.includes("mp-token"), false);
      assert.equal(serialized.includes("telegram-token"), false);
    }
  );
});
