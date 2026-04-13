import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin";
import { readBooleanFlag } from "../http/webhook-security";
import { OFFICIAL_SCHEMA_GOVERNANCE } from "./official-schema";

type OperationalSurface =
  | "meta_webhook"
  | "whatsapp_webhook"
  | "channel_router"
  | "public_intake"
  | "internal_panel";

type CompatibilityReport = {
  ok: boolean;
  schemaVersion: string;
  missing: Array<{
    table: string;
    columns: string[];
  }>;
};

let cachedCompatibilityReport: CompatibilityReport | null = null;
let compatibilityCheckPromise: Promise<CompatibilityReport> | null = null;

export function getOfficialSchemaVersion() {
  return OFFICIAL_SCHEMA_GOVERNANCE.schemaVersion;
}

export function isLegacySchemaFallbackAllowed() {
  return readBooleanFlag("NOEMIA_ALLOW_LEGACY_SCHEMA_FALLBACK", false);
}

export function shouldEnforceOperationalSchemaCompatibility() {
  return readBooleanFlag(
    "NOEMIA_ENFORCE_SCHEMA_COMPATIBILITY",
    process.env.NODE_ENV === "production"
  );
}

async function fetchCompatibilityReport(): Promise<CompatibilityReport> {
  const supabase = createAdminSupabaseClient();
  const expectedEntries = Object.entries(OFFICIAL_SCHEMA_GOVERNANCE.requiredTables);
  const tableNames = expectedEntries.map(([table]) => table);

  const { data, error } = await supabase
    .schema("information_schema")
    .from("columns")
    .select("table_name,column_name")
    .eq("table_schema", "public")
    .in("table_name", tableNames);

  if (error) {
    throw new Error(`Failed to inspect schema compatibility: ${error.message}`);
  }

  const actualColumnsByTable = new Map<string, Set<string>>();
  for (const row of data || []) {
    const tableName = String((row as { table_name?: unknown }).table_name || "");
    const columnName = String((row as { column_name?: unknown }).column_name || "");

    if (!actualColumnsByTable.has(tableName)) {
      actualColumnsByTable.set(tableName, new Set());
    }

    actualColumnsByTable.get(tableName)?.add(columnName);
  }

  const missing = expectedEntries
    .map(([table, requiredColumns]) => {
      const existingColumns = actualColumnsByTable.get(table) || new Set<string>();
      const missingColumns = requiredColumns.filter((column) => !existingColumns.has(column));

      return {
        table,
        columns: missingColumns
      };
    })
    .filter((entry) => entry.columns.length > 0);

  return {
    ok: missing.length === 0,
    schemaVersion: OFFICIAL_SCHEMA_GOVERNANCE.schemaVersion,
    missing
  };
}

export async function getOperationalSchemaCompatibilityReport() {
  if (cachedCompatibilityReport) {
    return cachedCompatibilityReport;
  }

  if (!compatibilityCheckPromise) {
    compatibilityCheckPromise = fetchCompatibilityReport()
      .then((report) => {
        cachedCompatibilityReport = report;
        return report;
      })
      .finally(() => {
        compatibilityCheckPromise = null;
      });
  }

  return compatibilityCheckPromise;
}

export async function assertOperationalSchemaCompatibility(surface: OperationalSurface) {
  const report = await getOperationalSchemaCompatibilityReport();

  if (report.ok) {
    return report;
  }

  const message =
    `Operational schema incompatibility detected on ${surface}. ` +
    `Expected schema version ${report.schemaVersion}, missing: ` +
    report.missing.map((entry) => `${entry.table}(${entry.columns.join(",")})`).join("; ");

  if (shouldEnforceOperationalSchemaCompatibility()) {
    throw new Error(message);
  }

  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "SCHEMA_COMPATIBILITY_DEGRADED",
      data: {
        surface,
        schemaVersion: report.schemaVersion,
        missing: report.missing
      }
    })
  );

  return report;
}
