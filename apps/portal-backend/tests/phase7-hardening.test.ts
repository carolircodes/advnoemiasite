import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBackendOperationsVerificationReport,
  renderBackendOperationsVerificationReport,
  renderBackendReleaseEvidenceMarkdown
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

test("release evidence marks production runtime proof as manual follow-up when durable proof is unavailable", async () => {
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

      assert.equal(report.releaseEvidence.releaseDecision, "blocked");
      assert.equal(report.releaseEvidence.runtimeProofSatisfied, false);
      assert.equal(report.releaseEvidence.durableConvergence, "unverified");
      assert.equal(
        report.releaseEvidence.manualFollowUps.some((item) => item.category === "durable"),
        true
      );
    }
  );
});

test("release evidence markdown stays operator-readable and non-sensitive", async () => {
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
      const markdown = renderBackendReleaseEvidenceMarkdown(report);

      assert.equal(markdown.includes("Backend Release Evidence"), true);
      assert.equal(markdown.includes("internal-secret"), false);
      assert.equal(markdown.includes("worker-secret"), false);
      assert.equal(markdown.includes("mp-token"), false);
      assert.equal(markdown.includes("telegram-token"), false);
    }
  );
});

test("operations verification json exposes release evidence for downstream automation", async () => {
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
      TELEGRAM_BOT_TOKEN: undefined,
      TELEGRAM_WEBHOOK_SECRET: undefined
    },
    async () => {
      const report = await buildBackendOperationsVerificationReport({
        profile: "production",
        runtimeMode: "off"
      });
      const parsed = JSON.parse(renderBackendOperationsVerificationReport(report, "json"));

      assert.equal(parsed.schemaVersion, "phase8-2026-04-18");
      assert.equal(typeof parsed.releaseEvidence.blockerCount, "number");
      assert.equal(Array.isArray(parsed.releaseEvidence.manualFollowUps), true);
      assert.equal(Array.isArray(parsed.releaseEvidence.alertSummary.immediate), true);
      assert.equal(typeof parsed.releaseEvidence.releaseManagerSummary.headline, "string");
      assert.equal(JSON.stringify(parsed).includes("internal-secret"), false);
    }
  );
});
