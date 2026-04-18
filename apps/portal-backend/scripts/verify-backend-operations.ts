import "dotenv/config";

import {
  buildBackendOperationsVerificationReport,
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

const profile = parseProfile(parseArgument("--policy="));
const runtimeMode = parseRuntimeMode(parseArgument("--runtime="));
const outputFormat = parseFormat(parseArgument("--format="));

const report = await buildBackendOperationsVerificationReport({
  profile,
  runtimeMode
});

process.stdout.write(renderBackendOperationsVerificationReport(report, outputFormat));

process.exitCode = report.deployAllowed ? 0 : 1;
