import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildBackendOperationsVerificationReport,
  renderBackendIncidentEscalationSummaryMarkdown,
  renderBackendReleaseChannelSummaryMarkdown,
  renderBackendReleaseEvidenceMarkdown,
  renderBackendReleaseManagerSummaryMarkdown,
  type BackendEnforcementProfile,
  renderBackendOperationsVerificationReport,
  type BackendRuntimeVerificationMode
} from "../lib/diagnostics/backend-enforcement.ts";

function parseArgument(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function parseProfile(value: string | undefined): BackendEnforcementProfile {
  if (value === "ci" || value === "preview" || value === "production") {
    return value;
  }

  return "local";
}

function parseRuntimeMode(value: string | undefined): BackendRuntimeVerificationMode {
  if (value === "off" || value === "required") {
    return value;
  }

  return "auto";
}

function parseFormat(value: string | undefined) {
  return value === "json" ? "json" : "text";
}

function parseWriteDir(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

const profile = parseProfile(parseArgument("--policy="));
const runtimeMode = parseRuntimeMode(parseArgument("--runtime="));
const outputFormat = parseFormat(parseArgument("--format="));
const writeDir = parseWriteDir(parseArgument("--write-dir="));

const report = await buildBackendOperationsVerificationReport({
  profile,
  runtimeMode
});

if (writeDir) {
  const resolvedDir = path.resolve(process.cwd(), writeDir);
  const handoffDir = path.join(resolvedDir, "handoff");
  await mkdir(resolvedDir, { recursive: true });
  await mkdir(handoffDir, { recursive: true });
  await writeFile(
    path.join(resolvedDir, "backend-operations-report.json"),
    renderBackendOperationsVerificationReport(report, "json"),
    "utf8"
  );
  await writeFile(
    path.join(resolvedDir, "backend-operations-summary.txt"),
    renderBackendOperationsVerificationReport(report, "text"),
    "utf8"
  );
  await writeFile(
    path.join(resolvedDir, "backend-release-evidence.md"),
    renderBackendReleaseEvidenceMarkdown(report),
    "utf8"
  );
  await writeFile(
    path.join(resolvedDir, "backend-release-summary.json"),
    `${JSON.stringify(
      {
        schemaVersion: report.schemaVersion,
        artifactType: "backend-release-summary",
        generatedAt: report.releaseEvidence.generatedAt,
        summary: report.releaseEvidence.releaseManagerSummary
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    path.join(resolvedDir, "backend-release-summary.md"),
    renderBackendReleaseManagerSummaryMarkdown(report),
    "utf8"
  );
  await writeFile(
    path.join(handoffDir, "handoff-manifest.json"),
    `${JSON.stringify(report.releaseEvidence.releaseHandoff.artifactManifest, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(handoffDir, "release-channel-summary.json"),
    `${JSON.stringify(report.releaseEvidence.releaseHandoff.releaseChannel, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(handoffDir, "release-channel-summary.md"),
    renderBackendReleaseChannelSummaryMarkdown(report),
    "utf8"
  );
  await writeFile(
    path.join(handoffDir, "incident-escalation-summary.json"),
    `${JSON.stringify(report.releaseEvidence.releaseHandoff.incidentChannel, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(handoffDir, "incident-escalation-summary.md"),
    renderBackendIncidentEscalationSummaryMarkdown(report),
    "utf8"
  );
}

process.stdout.write(renderBackendOperationsVerificationReport(report, outputFormat));

process.exitCode = report.deployAllowed ? 0 : 1;
