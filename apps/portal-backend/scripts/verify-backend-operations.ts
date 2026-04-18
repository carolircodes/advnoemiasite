import "dotenv/config";

import { buildEnvironmentConvergenceSections, DURABLE_PROTECTION_EXPECTATIONS } from "../lib/diagnostics/environment-convergence.ts";
import { combineDiagnosticStatuses } from "../lib/diagnostics/status.ts";

function printSection(title: string, value: string) {
  process.stdout.write(`${title}: ${value}\n`);
}

function printList(title: string, items: string[]) {
  process.stdout.write(`${title}:\n`);

  for (const item of items) {
    process.stdout.write(`- ${item}\n`);
  }
}

const sections = buildEnvironmentConvergenceSections();
const overall = combineDiagnosticStatuses(Object.values(sections));
const alerts = Object.entries(sections).filter(([, section]) => section.status !== "healthy");

printSection("Backend operations verification", overall);
printSection(
  "Protected readiness",
  "GET /api/internal/readiness with x-internal-api-secret or staff session"
);
printSection(
  "Durable migration",
  DURABLE_PROTECTION_EXPECTATIONS.migrationName
);
printList(
  "Durable primitives",
  [
    ...DURABLE_PROTECTION_EXPECTATIONS.requiredTables.map((table) => `table ${table}`),
    `function ${DURABLE_PROTECTION_EXPECTATIONS.requiredFunction}`
  ]
);

for (const [name, section] of Object.entries(sections)) {
  process.stdout.write(`\n[${name}] ${section.status} :: ${section.code}\n`);
  process.stdout.write(`${section.summary}\n`);
  process.stdout.write(`Action: ${section.operatorAction}\n`);
  printList("Verify", section.verification);
}

if (alerts.length > 0) {
  printList(
    "\nOperator attention",
    alerts.map(([name, section]) => `${name}: ${section.operatorAction}`)
  );
} else {
  printSection("\nOperator attention", "No immediate actions from env convergence snapshot");
}
