import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin";
import { readBooleanFlag } from "../http/webhook-security";
import { OFFICIAL_SCHEMA_GOVERNANCE } from "./official-schema";

type OperationalSurface =
  | "meta_webhook"
  | "whatsapp_webhook"
  | "channel_router"
  | "payment_runtime"
  | "public_intake"
  | "internal_panel"
  | "client_portal"
  | "internal_conversations"
  | "internal_telegram_distribution";

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

const REQUIRED_TABLES_BY_SURFACE: Record<OperationalSurface, string[]> = {
  meta_webhook: [
    "conversation_sessions",
    "processed_webhook_events",
    "noemia_triage_summaries"
  ],
  whatsapp_webhook: [
    "conversation_sessions",
    "processed_webhook_events",
    "noemia_triage_summaries"
  ],
  channel_router: [
    "conversation_sessions",
    "processed_webhook_events",
    "noemia_triage_summaries"
  ],
  payment_runtime: ["payments", "payment_events", "noemia_leads"],
  public_intake: ["intake_requests", "product_events"],
  internal_panel: [
    "case_events",
    "documents",
    "appointments",
    "appointment_history",
    "client_channels",
    "client_pipeline",
    "conversation_sessions",
    "noemia_triage_summaries",
    "noemia_leads",
    "acquisition_events",
    "payments",
    "payment_events",
    "follow_up_messages",
    "product_events"
  ],
  client_portal: [
    "case_events",
    "documents",
    "appointments",
    "document_requests"
  ],
  internal_conversations: [
    "conversation_sessions",
    "conversation_messages",
    "conversation_events",
    "conversation_notes",
    "noemia_triage_summaries"
  ],
  internal_telegram_distribution: ["telegram_channel_publications"]
};

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

function classifySchemaProbeError(error: { code?: string; message?: string } | null | undefined) {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";

  const missingRelation =
    code === "PGRST205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("could not find the table") && message.includes("public."));
  const missingColumn =
    code === "42703" ||
    ((message.includes("column") && message.includes("does not exist")) ||
      message.includes("could not find the '"));

  return {
    missingRelation,
    missingColumn
  };
}

async function fetchCompatibilityReport(): Promise<CompatibilityReport> {
  return fetchCompatibilityReportForSurface("internal_panel");
}

async function fetchCompatibilityReportForSurface(
  surface: OperationalSurface
): Promise<CompatibilityReport> {
  const supabase = createAdminSupabaseClient();
  const expectedEntries = Object.entries(OFFICIAL_SCHEMA_GOVERNANCE.requiredTables).filter(
    ([table]) => REQUIRED_TABLES_BY_SURFACE[surface].includes(table)
  );
  const missing: CompatibilityReport["missing"] = [];

  for (const [table, requiredColumns] of expectedEntries) {
    const missingColumns: string[] = [];

    for (const column of requiredColumns) {
      const { error } = await supabase.from(table).select(column).limit(1);

      if (!error) {
        continue;
      }

      const { missingRelation, missingColumn } = classifySchemaProbeError(error);

      if (missingRelation || missingColumn) {
        missingColumns.push(column);
        continue;
      }

      throw new Error(`Failed to inspect schema compatibility: ${error.message}`);
    }

    if (missingColumns.length > 0) {
      missing.push({
        table,
        columns: missingColumns
      });
    }
  }

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

export async function getSchemaCompatibilityReportForSurface(surface: OperationalSurface) {
  if (surface === "internal_panel") {
    return getOperationalSchemaCompatibilityReport();
  }

  return fetchCompatibilityReportForSurface(surface);
}

export async function assertOperationalSchemaCompatibility(surface: OperationalSurface) {
  const report = await getSchemaCompatibilityReportForSurface(surface);

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
