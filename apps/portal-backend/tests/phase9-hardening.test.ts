import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBackendOperationsVerificationReport,
  renderBackendIncidentEscalationSummaryMarkdown,
  renderBackendReleaseChannelSummaryMarkdown
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

test("release handoff stays schema-versioned and classifies manual follow-ups for external channels", async () => {
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

      assert.equal(report.schemaVersion, "phase9-2026-04-18");
      assert.equal(report.releaseEvidence.releaseHandoff.schemaVersion, "phase9-handoff-2026-04-18");
      assert.equal(report.releaseEvidence.releaseHandoff.artifactSetVersion, "phase9-release-handoff-v1");
      assert.equal(report.releaseEvidence.releaseHandoff.releaseChannel.manualFollowUps.length > 0, true);
      assert.equal(
        report.releaseEvidence.releaseHandoff.artifactManifest.recommendedReleaseArtifact,
        "handoff/release-channel-summary.md"
      );
    }
  );
});

test("incident and release handoff summaries remain adapter-ready and non-sensitive", async () => {
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
      const releaseChannel = renderBackendReleaseChannelSummaryMarkdown(report);
      const incidentSummary = renderBackendIncidentEscalationSummaryMarkdown(report);
      const serialized = JSON.stringify(report.releaseEvidence.releaseHandoff);

      assert.equal(releaseChannel.includes("Backend Release Channel Summary"), true);
      assert.equal(incidentSummary.includes("Backend Incident Escalation Summary"), true);
      assert.equal(releaseChannel.includes("internal-secret"), false);
      assert.equal(incidentSummary.includes("telegram-token"), false);
      assert.equal(serialized.includes("mp-token"), false);
    }
  );
});

test("secret rotation guidance and durable proof expose explicit proof boundaries", async () => {
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
      const metaRotation = report.releaseEvidence.secretRotation.find(
        (item) => item.subsystem === "meta"
      );
      const durableFollowUp = report.releaseEvidence.manualFollowUps.find(
        (item) => item.category === "durable"
      );

      assert.equal(metaRotation?.completionType, "external_manual");
      assert.equal(metaRotation?.proofRequired.length > 0, true);
      assert.equal(metaRotation?.postRotationSteps.length > 0, true);
      assert.equal(durableFollowUp?.proofBoundary, "external_manual");
      assert.equal(durableFollowUp?.proofRequired.includes("durableRuntime.status = healthy."), true);
    }
  );
});
