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
  schemaVersion: "phase7-2026-04-18";
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
  releaseEvidence: {
    generatedAt: string;
    blockerCount: number;
    actionRequiredCount: number;
    warningCount: number;
    runtimeProofSatisfied: boolean;
    durableConvergence: "verified" | "fallback" | "unverified";
    releaseDecision:
      | "approved"
      | "approved_with_warnings"
      | "manual_follow_up_required"
      | "blocked";
    manualFollowUps: Array<{
      category: "durable" | "environment" | "subsystem" | "release";
      title: string;
      why: string;
      successSignals: string[];
    }>;
    alertSummary: {
      immediate: Array<{
        subsystem: string;
        level: BackendEnforcementLevel;
        code: string;
        summary: string;
        operatorAction: string;
      }>;
      review: Array<{
        subsystem: string;
        level: BackendEnforcementLevel;
        code: string;
        summary: string;
      }>;
    };
  };
};

export type BackendOperationsVerificationFormat = "json" | "text";

function buildReleaseEvidence(
  sections: BackendSectionAssessment[],
  blockers: BackendSectionAssessment[],
  warnings: BackendSectionAssessment[],
  runtimeVerification: BackendOperationsVerificationReport["runtimeVerification"]
): BackendOperationsVerificationReport["releaseEvidence"] {
  const actionRequiredItems = warnings.filter(
    (section) => section.enforcement.level === "action_required"
  );
  const warningItems = warnings.filter(
    (section) => section.enforcement.level === "warning"
  );
  const durableSection = sections.find((section) => section.subsystem === "durableRuntime");
  const durableConvergence =
    durableSection?.status === "healthy"
      ? "verified"
      : durableSection?.status === "fallback"
        ? "fallback"
        : "unverified";
  const runtimeProofSatisfied =
    runtimeVerification.mode !== "required" ||
    (runtimeVerification.attempted &&
      runtimeVerification.available &&
      durableConvergence === "verified");
  const releaseDecision =
    blockers.length > 0
      ? "blocked"
      : actionRequiredItems.length > 0 || !runtimeProofSatisfied
        ? "manual_follow_up_required"
        : warningItems.length > 0
          ? "approved_with_warnings"
          : "approved";

  const manualFollowUps: BackendOperationsVerificationReport["releaseEvidence"]["manualFollowUps"] = [];

  if (durableSection && durableConvergence !== "verified") {
    manualFollowUps.push({
      category: "durable",
      title: "Confirmar convergencia duravel em ambiente real",
      why:
        durableSection.status === "fallback"
          ? "O runtime atual caiu para memory-fallback."
          : "A verificacao runtime duravel ainda nao foi provada com acesso administrativo real.",
      successSignals: [
        `Migracao ${DURABLE_PROTECTION_EXPECTATIONS.migrationName} aplicada.`,
        "Readiness protegida com abuseProtection.details.runtime.mode = durable.",
        "Nenhum flow critico listado como fallback-only em abuseProtection.details.flows."
      ]
    });
  }

  const environmentSection = sections.find(
    (section) => section.subsystem === "environmentCompleteness"
  );
  if (environmentSection && environmentSection.status !== "healthy") {
    manualFollowUps.push({
      category: "environment",
      title: "Fechar lacunas de environment completeness antes da liberacao final",
      why: environmentSection.summary,
      successSignals: [
        "profiles.release.satisfied = true.",
        "profiles.full_durable.satisfied = true quando a promocao exigir prova duravel real.",
        "Nenhum secret ou chave obrigatoria pendente no ambiente alvo."
      ]
    });
  }

  for (const section of actionRequiredItems.filter(
    (item) =>
      item.subsystem !== "environmentCompleteness" &&
      item.subsystem !== "durableRuntime"
  )) {
    manualFollowUps.push({
      category: "subsystem",
      title: `Revalidar ${section.subsystem} no ambiente alvo`,
      why: section.summary,
      successSignals: section.verification.slice(0, 3)
    });
  }

  if (blockers.length > 0) {
    manualFollowUps.push({
      category: "release",
      title: "Nao promover enquanto houver release blockers",
      why: "A verificacao atual encontrou bloqueios explicitos para o perfil selecionado.",
      successSignals: [
        "blockers vazio no relatorio de release.",
        "deployAllowed = true.",
        "operator.releaseSafety.blockers vazio na readiness protegida."
      ]
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    blockerCount: blockers.length,
    actionRequiredCount: actionRequiredItems.length,
    warningCount: warningItems.length,
    runtimeProofSatisfied,
    durableConvergence,
    releaseDecision,
    manualFollowUps,
    alertSummary: {
      immediate: [...blockers, ...actionRequiredItems].map((section) => ({
        subsystem: section.subsystem,
        level: section.enforcement.level,
        code: section.code,
        summary: section.summary,
        operatorAction: section.operatorAction
      })),
      review: warningItems.map((section) => ({
        subsystem: section.subsystem,
        level: section.enforcement.level,
        code: section.code,
        summary: section.summary
      }))
    }
  };
}

export function renderBackendReleaseEvidenceMarkdown(
  report: BackendOperationsVerificationReport
) {
  const lines = [
    "# Backend Release Evidence",
    "",
    `- Generated at: ${report.releaseEvidence.generatedAt}`,
    `- Profile: ${report.profile}`,
    `- Aggregate status: ${report.status}`,
    `- Enforcement level: ${report.enforcementLevel}`,
    `- Deploy allowed: ${report.deployAllowed ? "yes" : "no"}`,
    `- Release decision: ${report.releaseEvidence.releaseDecision}`,
    `- Durable convergence: ${report.releaseEvidence.durableConvergence}`,
    `- Runtime proof satisfied: ${report.releaseEvidence.runtimeProofSatisfied ? "yes" : "no"}`,
    "",
    "## Immediate attention",
    ""
  ];

  if (report.releaseEvidence.alertSummary.immediate.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.releaseEvidence.alertSummary.immediate) {
      lines.push(
        `- ${item.subsystem}: ${item.level} / ${item.code} / ${item.summary} / Action: ${item.operatorAction}`
      );
    }
  }

  lines.push("", "## Review items", "");

  if (report.releaseEvidence.alertSummary.review.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.releaseEvidence.alertSummary.review) {
      lines.push(`- ${item.subsystem}: ${item.level} / ${item.code} / ${item.summary}`);
    }
  }

  lines.push("", "## Manual follow-up", "");

  if (report.releaseEvidence.manualFollowUps.length === 0) {
    lines.push("- none");
  } else {
    for (const followUp of report.releaseEvidence.manualFollowUps) {
      lines.push(`- ${followUp.category}: ${followUp.title}`);
      lines.push(`  Why: ${followUp.why}`);
      lines.push(`  Success signals: ${followUp.successSignals.join(" | ")}`);
    }
  }

  lines.push("", "## Protected readiness", "");
  lines.push(
    `- ${report.protectedReadiness.path} with ${report.protectedReadiness.access}`
  );

  return `${lines.join("\n")}\n`;
}

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
    schemaVersion: "phase7-2026-04-18" as const,
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
    envCompleteness: buildBackendEnvCompletenessSnapshot(),
    releaseEvidence: buildReleaseEvidence(
      enforcement.sections,
      enforcement.blockers,
      enforcement.warnings,
      runtimeVerification
    )
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
    `Runtime durable verification: ${report.runtimeVerification.mode} / attempted=${report.runtimeVerification.attempted} / available=${report.runtimeVerification.available}`,
    `Release decision: ${report.releaseEvidence.releaseDecision}`,
    `Durable convergence: ${report.releaseEvidence.durableConvergence}`,
    `Runtime proof satisfied: ${report.releaseEvidence.runtimeProofSatisfied ? "yes" : "no"}`
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

  lines.push("Manual follow-up:");
  if (report.releaseEvidence.manualFollowUps.length > 0) {
    for (const item of report.releaseEvidence.manualFollowUps) {
      lines.push(`- ${item.category}: ${item.title} :: ${item.why}`);
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
