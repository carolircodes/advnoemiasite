import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBackendOperationsVerificationReport,
  renderBackendReleaseEvidenceMarkdown,
  renderBackendReleaseManagerSummaryMarkdown
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

test("release evidence classifies manual follow-ups with owner, domain, and completion type", async () => {
  await withEnv(
    {
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      SUPABASE_SECRET_KEY: undefined
    },
    async () => {
      const report = await buildBackendOperationsVerificationReport({
        profile: "production",
        runtimeMode: "required"
      });

      const followUp = report.releaseEvidence.manualFollowUps.find(
        (item) => item.category === "durable"
      );

      assert.equal(followUp?.owner, "database_admin");
      assert.equal(followUp?.actionDomain, "database_admin");
      assert.equal(followUp?.completionType, "external_manual");
      assert.equal(followUp?.blocksRelease, true);
    }
  );
});

test("release evidence exposes durable proof support and secret rotation guidance without leaking values", async () => {
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
      const evidence = renderBackendReleaseEvidenceMarkdown(report);

      assert.equal(report.releaseEvidence.durableProof.requiredAccess, "supabase_admin");
      assert.equal(report.releaseEvidence.secretRotation.length >= 4, true);
      assert.equal(evidence.includes("internal-secret"), false);
      assert.equal(evidence.includes("mp-token"), false);
      assert.equal(evidence.includes("telegram-token"), false);
    }
  );
});

test("release manager summary stays concise and adapter-ready", async () => {
  await withEnv(
    {
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      SUPABASE_SECRET_KEY: undefined
    },
    async () => {
      const report = await buildBackendOperationsVerificationReport({
        profile: "production",
        runtimeMode: "required"
      });
      const summary = renderBackendReleaseManagerSummaryMarkdown(report);

      assert.equal(summary.includes("Backend Release Manager Summary"), true);
      assert.equal(summary.includes("owner="), true);
      assert.equal(summary.includes("domain="), true);
      assert.equal(summary.includes("internal-secret"), false);
    }
  );
});
