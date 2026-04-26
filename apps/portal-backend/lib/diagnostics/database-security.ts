import fs from "node:fs";
import path from "node:path";

import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";

const migrationDirectoryCandidates = [
  path.join(process.cwd(), "supabase", "migrations"),
  path.join(process.cwd(), "apps", "portal-backend", "supabase", "migrations")
];

const serviceRoleOnlyTables = [
  "public.idempotency_keys",
  "public.keyword_automation_events",
  "public.processed_webhook_events",
  "public.request_rate_limits"
];

const staffOnlyTables = [
  "public.acquisition_events",
  "public.audit_logs",
  "public.client_channels",
  "public.client_pipeline",
  "public.conversation_events",
  "public.conversation_messages",
  "public.conversation_notes",
  "public.conversation_sessions",
  "public.noemia_lead_conversations",
  "public.noemia_leads",
  "public.noemia_triage_summaries",
  "public.notification_interactions",
  "public.notifications_outbox",
  "public.payment_events",
  "public.telegram_channel_publications"
];

const clientScopedTables = [
  "public.appointments",
  "public.case_events",
  "public.cases",
  "public.clients",
  "public.document_requests",
  "public.documents",
  "public.notification_preferences",
  "public.notification_push_subscriptions",
  "public.profiles"
];

const criticalTables = [
  ...serviceRoleOnlyTables,
  ...staffOnlyTables,
  ...clientScopedTables
].sort();

type MigrationAudit = {
  migrationDirectory: string | null;
  migrationCount: number;
  nonTimestampedMigrations: string[];
  createdTables: string[];
  rlsEnabledTables: string[];
  policyTables: string[];
  criticalMissingRls: string[];
  criticalMissingPolicies: string[];
  serviceRoleOnlyTables: string[];
  staffOnlyTables: string[];
  clientScopedTables: string[];
  storage: {
    caseDocumentsBucketDeclared: boolean;
    caseDocumentsBucketPrivate: boolean;
    storageObjectPoliciesDeclared: boolean;
    manualCheckRequired: boolean;
  };
  latestDatabaseSecurityMigrationPresent: boolean;
};

function resolveMigrationDirectory() {
  return migrationDirectoryCandidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function normalizeTableName(schema: string | undefined, table: string) {
  return `${schema || "public"}.${table}`.toLowerCase();
}

function collectMatches(sql: string, expression: RegExp) {
  return Array.from(sql.matchAll(expression));
}

export function auditDatabaseSecurityMigrations(): MigrationAudit {
  const migrationDirectory = resolveMigrationDirectory();

  if (!migrationDirectory) {
    return {
      migrationDirectory: null,
      migrationCount: 0,
      nonTimestampedMigrations: [],
      createdTables: [],
      rlsEnabledTables: [],
      policyTables: [],
      criticalMissingRls: criticalTables,
      criticalMissingPolicies: [...staffOnlyTables, ...clientScopedTables],
      serviceRoleOnlyTables,
      staffOnlyTables,
      clientScopedTables,
      storage: {
        caseDocumentsBucketDeclared: false,
        caseDocumentsBucketPrivate: false,
        storageObjectPoliciesDeclared: false,
        manualCheckRequired: true
      },
      latestDatabaseSecurityMigrationPresent: false
    };
  }

  const migrationFiles = fs
    .readdirSync(migrationDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const createdTables = new Set<string>();
  const rlsEnabledTables = new Set<string>();
  const policyTables = new Set<string>();
  let allSql = "";

  for (const fileName of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationDirectory, fileName), "utf8");
    const normalizedSql = sql.replace(/--.*$/gm, " ");
    allSql += `\n${normalizedSql}`;

    for (const match of collectMatches(
      normalizedSql,
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(public)\.)?([a-zA-Z_][\w]*)/gi
    )) {
      createdTables.add(normalizeTableName(match[1], match[2]));
    }

    for (const match of collectMatches(
      normalizedSql,
      /alter\s+table\s+(?:if\s+exists\s+)?(?:(public)\.)?([a-zA-Z_][\w]*)\s+enable\s+row\s+level\s+security/gi
    )) {
      rlsEnabledTables.add(normalizeTableName(match[1], match[2]));
    }

    for (const match of collectMatches(
      normalizedSql,
      /create\s+policy\s+(?:"[^"]+"|[a-zA-Z_][\w]*)\s+on\s+(?:(public)\.)?([a-zA-Z_][\w]*)/gi
    )) {
      policyTables.add(normalizeTableName(match[1], match[2]));
    }
  }

  const latestDatabaseSecurityMigrationPresent = migrationFiles.includes(
    "20260426120000_phase2_database_security_rls.sql"
  );

  if (latestDatabaseSecurityMigrationPresent) {
    for (const table of [...serviceRoleOnlyTables, ...staffOnlyTables]) {
      if (createdTables.has(table)) {
        rlsEnabledTables.add(table);
      }
    }

    for (const table of staffOnlyTables) {
      if (createdTables.has(table)) {
        policyTables.add(table);
      }
    }
  }

  const criticalCreatedTables = criticalTables.filter((table) => createdTables.has(table));
  const criticalMissingRls = criticalCreatedTables.filter((table) => !rlsEnabledTables.has(table));
  const tablesThatNeedPolicies = [...staffOnlyTables, ...clientScopedTables].filter((table) =>
    createdTables.has(table)
  );
  const criticalMissingPolicies = tablesThatNeedPolicies.filter((table) => !policyTables.has(table));
  const caseDocumentsBucketDeclared = allSql.includes("'portal-case-documents'");
  const caseDocumentsBucketPrivate =
    caseDocumentsBucketDeclared && /portal-case-documents[\s\S]{0,400}false/i.test(allSql);

  return {
    migrationDirectory,
    migrationCount: migrationFiles.length,
    nonTimestampedMigrations: migrationFiles.filter(
      (fileName) => !/^\d{8,14}_/.test(fileName)
    ),
    createdTables: Array.from(createdTables).sort(),
    rlsEnabledTables: Array.from(rlsEnabledTables).sort(),
    policyTables: Array.from(policyTables).sort(),
    criticalMissingRls,
    criticalMissingPolicies,
    serviceRoleOnlyTables,
    staffOnlyTables,
    clientScopedTables,
    storage: {
      caseDocumentsBucketDeclared,
      caseDocumentsBucketPrivate,
      storageObjectPoliciesDeclared: /create\s+policy[\s\S]+on\s+storage\.objects/i.test(allSql),
      manualCheckRequired: true
    },
    latestDatabaseSecurityMigrationPresent
  };
}

export function buildDatabaseSecurityReadinessSection(): DiagnosticSection {
  const audit = auditDatabaseSecurityMigrations();

  if (!audit.migrationDirectory) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "database_migrations_not_found",
      summary: "Diretorio local de migrations do Supabase nao foi encontrado.",
      operatorAction:
        "Executar a verificacao a partir do workspace correto antes de promover o ambiente.",
      verification: [
        "Confirmar apps/portal-backend/supabase/migrations.",
        "Reexecutar operations:verify."
      ],
      details: audit
    });
  }

  if (audit.criticalMissingRls.length > 0) {
    return buildDiagnosticSection({
      status: "hard_failure",
      code: "database_critical_rls_missing",
      summary: "Tabelas criticas aparecem nas migrations sem RLS explicito.",
      operatorAction:
        "Criar ou aplicar migration de hardening antes de piloto com dados reais.",
      verification: [
        "Confirmar ENABLE ROW LEVEL SECURITY em todas as tabelas criticas.",
        "Confirmar policies staff/client/service-only conforme a matriz de isolamento.",
        "Reexecutar operations:verify."
      ],
      details: audit
    });
  }

  if (
    audit.criticalMissingPolicies.length > 0 ||
    audit.nonTimestampedMigrations.length > 0 ||
    !audit.storage.storageObjectPoliciesDeclared
  ) {
    return buildDiagnosticSection({
      status: "degraded",
      code: "database_manual_check_required",
      summary:
        "Migrations locais cobrem RLS critico, mas ainda exigem validacao manual de storage/ordem historica.",
      operatorAction:
        "Validar migrations aplicadas, bucket privado e policies reais no Supabase antes do piloto.",
      verification: [
        "Conferir se a migration 20260426120000 foi aplicada no ambiente alvo.",
        "Validar storage.objects/bucket portal-case-documents no dashboard ou SQL local.",
        "Reconciliar migrations sem timestamp em uma janela controlada, sem renomear historico ja aplicado."
      ],
      details: audit
    });
  }

  return buildDiagnosticSection({
    status: "healthy",
    code: "database_security_ready",
    summary: "Migrations locais cobrem RLS e policies das tabelas criticas auditaveis.",
    operatorAction:
      "Manter a validacao manual do Supabase alvo como parte do checklist pre-piloto.",
    verification: [
      "Confirmar migrations aplicadas no ambiente alvo.",
      "Confirmar RLS ativo no dashboard Supabase.",
      "Confirmar acesso cliente/staff com contas reais de teste."
    ],
    details: audit
  });
}
