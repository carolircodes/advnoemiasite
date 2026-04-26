import test from "node:test";
import assert from "node:assert/strict";

import {
  auditDatabaseSecurityMigrations,
  buildDatabaseSecurityReadinessSection
} from "../lib/diagnostics/database-security.ts";
import { summarizeBackendEnforcement } from "../lib/diagnostics/backend-enforcement.ts";

test("phase 2 database audit covers critical RLS surfaces in local migrations", () => {
  const audit = auditDatabaseSecurityMigrations();

  assert.equal(audit.latestDatabaseSecurityMigrationPresent, true);
  assert.equal(audit.criticalMissingRls.length, 0);
  assert.equal(audit.criticalMissingPolicies.length, 0);
  assert.equal(audit.storage.caseDocumentsBucketDeclared, true);
  assert.equal(audit.storage.caseDocumentsBucketPrivate, true);
  assert.equal(audit.serviceRoleOnlyTables.includes("public.processed_webhook_events"), true);
  assert.equal(audit.staffOnlyTables.includes("public.conversation_messages"), true);
  assert.equal(audit.clientScopedTables.includes("public.documents"), true);
});

test("phase 2 database readiness requires manual storage and applied-migration proof", () => {
  const section = buildDatabaseSecurityReadinessSection();

  assert.equal(section.code, "database_manual_check_required");
  assert.equal(section.status, "degraded");
  assert.equal(Array.isArray(section.details.nonTimestampedMigrations), true);
  assert.equal(
    (section.details.storage as { manualCheckRequired: boolean }).manualCheckRequired,
    true
  );
});

test("phase 2 database readiness becomes action-required in production enforcement", () => {
  const section = buildDatabaseSecurityReadinessSection();
  const enforcement = summarizeBackendEnforcement(
    {
      databaseSecurity: section
    },
    {
      profile: "production",
      runtimeVerification: {
        mode: "required",
        attempted: true,
        available: true,
        reason: null
      }
    }
  );

  assert.equal(enforcement.deployAllowed, true);
  assert.equal(enforcement.warnings[0]?.enforcement.level, "action_required");
  assert.equal(enforcement.warnings[0]?.subsystem, "databaseSecurity");
});
