import { buildBackendEnvCompletenessSnapshot } from "../config/backend-env-governance.ts";
import { getAuthEnvDiagnostics } from "../config/env.ts";
import { getDurableProtectionStatus } from "../http/durable-abuse-protection.ts";
import {
  DURABLE_PROTECTION_EXPECTATIONS,
  buildEnvironmentConvergenceSections
} from "./environment-convergence.ts";
import {
  buildDiagnosticSection,
  combineDiagnosticStatuses,
  type DiagnosticSection,
  type DiagnosticStatus
} from "./status.ts";

export type BackendEnforcementProfile = "local" | "ci" | "preview" | "production";
export type BackendRuntimeVerificationMode = "off" | "auto" | "required";
export type BackendEnforcementLevel =
  | "info"
  | "warning"
  | "action_required"
  | "release_blocker";

export type BackendSectionAssessment = {
  subsystem: string;
  status: DiagnosticStatus;
  code: string;
  summary: string;
  operatorAction: string;
  verification: string[];
  details: Record<string, unknown>;
  enforcement: {
    level: BackendEnforcementLevel;
    deployAllowed: boolean;
    reason: string;
  };
};

export type BackendOperationsVerificationReport = {
  schemaVersion: "phase6-2026-04-18";
  profile: BackendEnforcementProfile;
  runtimeVerification: {
    mode: BackendRuntimeVerificationMode;
    attempted: boolean;
    available: boolean;
    reason: string | null;
  };
  status: DiagnosticStatus;
  enforcementLevel: BackendEnforcementLevel;
  deployAllowed: boolean;
  protectedReadiness: {
    path: "/api/internal/readiness";
    access: string;
  };
  blockers: BackendSectionAssessment[];
  warnings: BackendSectionAssessment[];
  sections: BackendSectionAssessment[];
  envCompleteness: ReturnType<typeof buildBackendEnvCompletenessSnapshot>;
};

export type BackendOperationsVerificationFormat = "json" | "text";

type SectionContext = {
  profile: BackendEnforcementProfile;
  runtimeVerification: BackendOperationsVerificationReport["runtimeVerification"];
};

function buildDurableRuntimeSection(
  durableProtection: Awaited<ReturnType<typeof getDurableProtectionStatus>>
): DiagnosticSection {
  return buildDiagnosticSection({
    status:
      durableProtection.runtime.mode === "memory-fallback"
        ? "fallback"
        : durableProtection.migrationApplied
          ? "healthy"
          : "degraded",
    code:
      durableProtection.runtime.mode === "memory-fallback"
        ? "durable_runtime_fallback_active"
        : durableProtection.migrationApplied
          ? "durable_runtime_ready"
          : "durable_runtime_partial",
    summary:
      durableProtection.runtime.mode === "memory-fallback"
        ? "Protecao duravel caiu para memory-fallback no runtime atual."
        : durableProtection.migrationApplied
          ? "Runtime confirmou rate limit e idempotencia duraveis."
          : "Runtime nao confirmou a convergencia duravel completa.",
    operatorAction:
      durableProtection.runtime.mode === "memory-fallback"
        ? "Aplicar ou reconciliar a migracao duravel antes de tratar o ambiente como convergido."
        : durableProtection.migrationApplied
          ? "Manter esta confirmacao como parte do checklist pos-deploy."
          : "Confirmar a migracao e repetir a verificacao protegida ate sair do estado parcial.",
    verification: [
      `Confirmar migracao ${DURABLE_PROTECTION_EXPECTATIONS.migrationName}.`,
      "Conferir runtime.mode e activeFallbackBuckets.",
      "Confirmar coverage dos flows em details.flows."
    ],
    details: durableProtection
  });
}

function buildUnavailableDurableRuntimeSection(reason: string): DiagnosticSection {
  return buildDiagnosticSection({
    status: "missing_configuration",
    code: "durable_runtime_verification_unavailable",
    summary: "A verificacao runtime da protecao duravel nao pode ser executada neste contexto.",
    operatorAction:
      "Rodar a verificacao com acesso administrativo real antes de promover para ambiente de producao.",
    verification: [
      "Confirmar NEXT_PUBLIC_SUPABASE_URL.",
      "Confirmar SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.",
      "Repetir a verificacao com runtime habilitado."
    ],
    details: {
      reason
    }
  });
}

function evaluateDiagnosticSection(
  subsystem: string,
  section: DiagnosticSection,
  context: SectionContext
): BackendSectionAssessment {
  const defaultReason = `Status ${section.status} em ${subsystem}.`;
  let level: BackendEnforcementLevel;
  let reason = defaultReason;

  switch (section.status) {
    case "healthy":
      level = "info";
      reason = "Nenhuma acao imediata necessaria.";
      break;
    case "degraded":
      level = "warning";
      reason = "Sinal degradado; monitorar e corrigir sem bloquear por padrao.";
      break;
    case "missing_configuration":
      level =
        context.profile === "production" || context.profile === "preview"
          ? "release_blocker"
          : "action_required";
      reason = "Configuracao ausente para o perfil atual de verificacao.";
      break;
    case "fallback":
      level =
        context.profile === "production" ? "release_blocker" : "action_required";
      reason = "Fallback ativo; corrigir antes de considerar o ambiente plenamente convergido.";
      break;
    case "hard_failure":
      level = "release_blocker";
      reason = "Falha dura em subsistema critico.";
      break;
  }

  if (section.code === "deployment_host_misaligned") {
    level = "release_blocker";
    reason = "Host do portal desalinhado com o deployment endurecido.";
  } else if (section.code === "payments_signature_not_enforced") {
    level =
      context.profile === "production"
        ? "release_blocker"
        : context.profile === "preview"
          ? "action_required"
          : "warning";
    reason = "Webhook de pagamento sem enforcement de assinatura.";
  } else if (
    section.code === "telegram_missing" ||
    section.code === "telegram_partial"
  ) {
    level = context.profile === "production" ? "action_required" : "warning";
    reason =
      "Telegram continua como subsistema especifico; falta configuracao se o canal fizer parte da liberacao.";
  } else if (section.code === "durable_runtime_verification_unavailable") {
    level =
      context.runtimeVerification.mode === "required" && context.profile === "production"
        ? "release_blocker"
        : "action_required";
    reason =
      "A verificacao runtime da protecao duravel ainda nao foi provada neste contexto.";
  } else if (subsystem === "durableExpectations") {
    level = "info";
    reason = "Referencia documental de convergencia; nao e um gate por si so.";
  } else if (subsystem === "environmentCompleteness" && section.status === "degraded") {
    level = context.profile === "production" ? "action_required" : "warning";
    reason = "Existem lacunas de subsistema ou de perfil que merecem acompanhamento.";
  }

  return {
    subsystem,
    ...section,
    enforcement: {
      level,
      deployAllowed: level !== "release_blocker",
      reason
    }
  };
}

export function summarizeBackendEnforcement(
  sections: Record<string, DiagnosticSection>,
  context: SectionContext
) {
  const assessedSections = Object.entries(sections).map(([subsystem, section]) =>
    evaluateDiagnosticSection(subsystem, section, context)
  );
  const blockers = assessedSections.filter(
    (section) => section.enforcement.level === "release_blocker"
  );
  const warnings = assessedSections.filter(
    (section) =>
      section.enforcement.level === "warning" ||
      section.enforcement.level === "action_required"
  );

  const enforcementLevel: BackendEnforcementLevel =
    blockers.length > 0
      ? "release_blocker"
      : warnings.some((section) => section.enforcement.level === "action_required")
        ? "action_required"
        : warnings.length > 0
          ? "warning"
          : "info";

  return {
    sections: assessedSections,
    blockers,
    warnings,
    deployAllowed: blockers.length === 0,
    enforcementLevel
  };
}

export async function buildBackendOperationsVerificationReport(options?: {
  profile?: BackendEnforcementProfile;
  runtimeMode?: BackendRuntimeVerificationMode;
}) {
  const profile = options?.profile || "local";
  const runtimeMode = options?.runtimeMode || "auto";
  const envSections = buildEnvironmentConvergenceSections();
  const authDiagnostics = getAuthEnvDiagnostics();
  const runtimeAccessAvailable =
    authDiagnostics.supabaseUrlConfigured && authDiagnostics.adminKeySource !== null;

  const runtimeVerification: BackendOperationsVerificationReport["runtimeVerification"] = {
    mode: runtimeMode,
    attempted: false,
    available: runtimeAccessAvailable,
    reason: null
  };

  const sections: Record<string, DiagnosticSection> = {
    ...envSections
  };

  if (runtimeMode === "off") {
    runtimeVerification.reason = "disabled_by_policy";
  } else if (runtimeAccessAvailable) {
    runtimeVerification.attempted = true;
    const durableProtection = await getDurableProtectionStatus();
    sections.durableRuntime = buildDurableRuntimeSection(durableProtection);
  } else {
    runtimeVerification.attempted = runtimeMode === "required";
    runtimeVerification.reason = "admin_env_unavailable";

    if (runtimeMode === "required") {
      sections.durableRuntime = buildUnavailableDurableRuntimeSection(
        "admin_env_unavailable"
      );
    }
  }

  const enforcement = summarizeBackendEnforcement(sections, {
    profile,
    runtimeVerification
  });

  return {
    schemaVersion: "phase6-2026-04-18" as const,
    profile,
    runtimeVerification,
    status: combineDiagnosticStatuses(Object.values(sections)),
    enforcementLevel: enforcement.enforcementLevel,
    deployAllowed: enforcement.deployAllowed,
    protectedReadiness: {
      path: "/api/internal/readiness" as const,
      access: "x-internal-api-secret ou sessao staff autenticada"
    },
    blockers: enforcement.blockers,
    warnings: enforcement.warnings,
    sections: enforcement.sections,
    envCompleteness: buildBackendEnvCompletenessSnapshot()
  };
}

export function renderBackendOperationsVerificationReport(
  report: BackendOperationsVerificationReport,
  format: BackendOperationsVerificationFormat
) {
  if (format === "json") {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const lines = [
    `Backend operations verification: ${report.status}`,
    `Enforcement level: ${report.enforcementLevel}`,
    `Deploy allowed: ${report.deployAllowed ? "yes" : "no"}`,
    `Profile: ${report.profile}`,
    `Protected readiness: ${report.protectedReadiness.path} with ${report.protectedReadiness.access}`,
    `Runtime durable verification: ${report.runtimeVerification.mode} / attempted=${report.runtimeVerification.attempted} / available=${report.runtimeVerification.available}`
  ];

  if (report.runtimeVerification.reason) {
    lines.push(`Runtime verification note: ${report.runtimeVerification.reason}`);
  }

  lines.push("Release blockers:");
  if (report.blockers.length > 0) {
    for (const item of report.blockers) {
      lines.push(`- ${item.subsystem}: ${item.code} :: ${item.enforcement.reason}`);
    }
  } else {
    lines.push("- none");
  }

  lines.push("Warnings:");
  if (report.warnings.length > 0) {
    for (const item of report.warnings) {
      lines.push(
        `- ${item.subsystem}: ${item.code} :: ${item.enforcement.level} :: ${item.enforcement.reason}`
      );
    }
  } else {
    lines.push("- none");
  }

  for (const section of report.sections) {
    lines.push(
      "",
      `[${section.subsystem}] ${section.status} :: ${section.code}`,
      section.summary,
      `Enforcement: ${section.enforcement.level} / deployAllowed=${section.enforcement.deployAllowed}`,
      `Action: ${section.operatorAction}`,
      "Verify:"
    );

    for (const item of section.verification) {
      lines.push(`- ${item}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
