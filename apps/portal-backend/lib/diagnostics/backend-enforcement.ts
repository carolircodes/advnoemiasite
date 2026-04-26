import { buildBackendEnvCompletenessSnapshot } from "../config/backend-env-governance.ts";
import { getAuthEnvDiagnostics } from "../config/env.ts";
import { getDurableProtectionStatus } from "../http/durable-abuse-protection.ts";
import {
  DURABLE_PROTECTION_EXPECTATIONS,
  buildEnvironmentConvergenceSections
} from "./environment-convergence.ts";
import { buildDatabaseSecurityReadinessSection } from "./database-security.ts";
import { buildChannelWebhookReadinessSection } from "./channel-readiness.ts";
import { buildNoemiaComplianceReadinessSection } from "./noemia-compliance-readiness.ts";
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
export type BackendActionDomain =
  | "repo_code"
  | "env_config"
  | "external_provider"
  | "database_admin"
  | "dashboard_manual"
  | "release_coordination"
  | "incident_escalation";
export type BackendActionOwner =
  | "release_manager"
  | "platform_operator"
  | "provider_operator"
  | "database_admin";
export type BackendCompletionType =
  | "automated_evidence"
  | "partially_codified"
  | "external_manual";

type ReleaseEvidenceProofBoundary =
  | "automated"
  | "inferred"
  | "external_manual";

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

type ReleaseEvidenceManualFollowUp = {
  category: "durable" | "environment" | "subsystem" | "release";
  enforcementLevel: BackendEnforcementLevel;
  blocksRelease: boolean;
  actionDomain: BackendActionDomain;
  owner: BackendActionOwner;
  completionType: BackendCompletionType;
  proofBoundary: ReleaseEvidenceProofBoundary;
  partialEvidenceAvailable: boolean;
  title: string;
  why: string;
  nextAction: string;
  proofRequired: string[];
  successSignals: string[];
};

export type BackendOperationsVerificationReport = {
  schemaVersion: "phase9-2026-04-18";
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
    manualFollowUps: ReleaseEvidenceManualFollowUp[];
    evidenceBoundaries: {
      automatedProof: string[];
      inferredStatus: string[];
      requiredExternalVerification: string[];
    };
    durableProof: {
      state: "complete" | "pending" | "failed";
      completionType: BackendCompletionType;
      requiredAccess: "supabase_admin" | "none";
      automatedSignals: string[];
      manualSteps: string[];
      successSignals: string[];
      failureSignals: string[];
    };
    secretRotation: Array<{
      name: string;
      subsystem: "perimeter" | "payments" | "telegram" | "meta";
      actionDomain: BackendActionDomain;
      owner: BackendActionOwner;
      completionType: BackendCompletionType;
      blocksReleaseUntilVerified: boolean;
      envNames: string[];
      postRotationSteps: string[];
      proofRequired: string[];
      verificationSignals: string[];
      followUp: string;
    }>;
    alertSummary: {
      immediate: Array<{
        subsystem: string;
        level: BackendEnforcementLevel;
        code: string;
        summary: string;
        operatorAction: string;
        owner: BackendActionOwner;
        actionDomain: BackendActionDomain;
        proofBoundary: ReleaseEvidenceProofBoundary;
      }>;
      review: Array<{
        subsystem: string;
        level: BackendEnforcementLevel;
        code: string;
        summary: string;
        nextAction: string;
        owner: BackendActionOwner;
        actionDomain: BackendActionDomain;
        proofBoundary: ReleaseEvidenceProofBoundary;
      }>;
    };
    releaseManagerSummary: {
      headline: string;
      decision:
        | "approved"
        | "approved_with_warnings"
        | "manual_follow_up_required"
        | "blocked";
      blockerCount: number;
      actionRequiredCount: number;
      warningCount: number;
      requiresHumanApproval: boolean;
      topActions: Array<{
        subsystem: string;
        level: BackendEnforcementLevel;
        code: string;
        owner: BackendActionOwner;
        actionDomain: BackendActionDomain;
        nextAction: string;
        proofBoundary: ReleaseEvidenceProofBoundary;
      }>;
      proofBoundary: {
        automated: number;
        inferred: number;
        external: number;
      };
    };
    releaseHandoff: {
      schemaVersion: "phase9-handoff-2026-04-18";
      artifactSetVersion: "phase9-release-handoff-v1";
      releaseChannel: {
        subject: string;
        decision:
          | "approved"
          | "approved_with_warnings"
          | "manual_follow_up_required"
          | "blocked";
        severity: BackendEnforcementLevel;
        requiresHumanApproval: boolean;
        summaryLines: string[];
        blockers: string[];
        actionRequired: string[];
        warnings: string[];
        manualFollowUps: Array<{
          title: string;
          blocksRelease: boolean;
          owner: BackendActionOwner;
          actionDomain: BackendActionDomain;
          completionType: BackendCompletionType;
          proofBoundary: ReleaseEvidenceProofBoundary;
          nextAction: string;
        }>;
      };
      incidentChannel: {
        title: string;
        severity: BackendEnforcementLevel;
        escalateNow: boolean;
        proofBoundary: ReleaseEvidenceProofBoundary;
        summaryLines: string[];
        immediate: Array<{
          subsystem: string;
          level: BackendEnforcementLevel;
          code: string;
          owner: BackendActionOwner;
          actionDomain: BackendActionDomain;
          nextAction: string;
          proofBoundary: ReleaseEvidenceProofBoundary;
        }>;
        manualFollowUps: Array<{
          title: string;
          blocksRelease: boolean;
          owner: BackendActionOwner;
          actionDomain: BackendActionDomain;
          proofBoundary: ReleaseEvidenceProofBoundary;
        }>;
      };
      artifactManifest: {
        schemaVersion: "phase9-handoff-2026-04-18";
        generatedAt: string;
        recommendedReleaseArtifact: "handoff/release-channel-summary.md";
        recommendedIncidentArtifact: "handoff/incident-escalation-summary.md";
        artifacts: Array<{
          path: string;
          audience: "release_manager" | "operator" | "incident_channel" | "automation";
          purpose: string;
        }>;
      };
    };
  };
};

export type BackendOperationsVerificationFormat = "json" | "text";

type SectionContext = {
  profile: BackendEnforcementProfile;
  runtimeVerification: BackendOperationsVerificationReport["runtimeVerification"];
};

function inferActionDomain(
  subsystem: string,
  code: string
): BackendActionDomain {
  if (subsystem === "durableRuntime" || subsystem === "durableExpectations") {
    return "database_admin";
  }

  if (subsystem === "databaseSecurity") {
    return "database_admin";
  }

  if (subsystem === "noemiaCompliance") {
    return "repo_code";
  }

  if (
    subsystem === "environmentCompleteness" ||
    subsystem === "deployment" ||
    subsystem === "platform" ||
    subsystem === "perimeter" ||
    subsystem === "notifications"
  ) {
    return "env_config";
  }

  if (
    subsystem === "payments" ||
    subsystem === "telegram" ||
    subsystem === "meta" ||
    subsystem === "youtube" ||
    subsystem === "omnichannel" ||
    subsystem === "channelReadiness"
  ) {
    return "external_provider";
  }

  if (code.includes("host_misaligned")) {
    return "dashboard_manual";
  }

  return "repo_code";
}

function inferActionOwner(actionDomain: BackendActionDomain): BackendActionOwner {
  switch (actionDomain) {
    case "database_admin":
      return "database_admin";
    case "incident_escalation":
      return "platform_operator";
    case "external_provider":
    case "dashboard_manual":
      return "provider_operator";
    case "release_coordination":
      return "release_manager";
    case "env_config":
      return "platform_operator";
    case "repo_code":
    default:
      return "release_manager";
  }
}

function inferProofBoundaryFromCompletionType(
  completionType: BackendCompletionType
): ReleaseEvidenceProofBoundary {
  switch (completionType) {
    case "automated_evidence":
      return "automated";
    case "external_manual":
      return "external_manual";
    case "partially_codified":
    default:
      return "inferred";
  }
}

function inferProofBoundaryForSection(
  actionDomain: BackendActionDomain
): ReleaseEvidenceProofBoundary {
  switch (actionDomain) {
    case "database_admin":
    case "external_provider":
    case "dashboard_manual":
    case "incident_escalation":
      return "external_manual";
    case "env_config":
    case "release_coordination":
    case "repo_code":
    default:
      return "inferred";
  }
}

function durableStateToEnforcementLevel(
  state: BackendOperationsVerificationReport["releaseEvidence"]["durableProof"]["state"]
): BackendEnforcementLevel {
  switch (state) {
    case "complete":
      return "info";
    case "failed":
      return "release_blocker";
    case "pending":
    default:
      return "action_required";
  }
}

function buildDurableProofSupport(
  durableSection: BackendSectionAssessment | undefined,
  runtimeVerification: BackendOperationsVerificationReport["runtimeVerification"]
): BackendOperationsVerificationReport["releaseEvidence"]["durableProof"] {
  const state =
    durableSection?.status === "healthy" &&
    runtimeVerification.attempted &&
    runtimeVerification.available
      ? "complete"
      : durableSection?.status === "fallback"
        ? "failed"
        : "pending";

  return {
    state,
    completionType: state === "complete" ? "automated_evidence" : "external_manual",
    requiredAccess: state === "complete" ? "none" : "supabase_admin",
    automatedSignals: [
      `runtimeVerification.mode=${runtimeVerification.mode}`,
      `runtimeVerification.attempted=${runtimeVerification.attempted}`,
      `runtimeVerification.available=${runtimeVerification.available}`,
      `durableSection.code=${durableSection?.code || "durable_runtime_not_available"}`
    ],
    manualSteps: [
      `Confirmar migracao ${DURABLE_PROTECTION_EXPECTATIONS.migrationName}.`,
      `Confirmar tabelas ${DURABLE_PROTECTION_EXPECTATIONS.requiredTables.join(" e ")}.`,
      `Confirmar funcao ${DURABLE_PROTECTION_EXPECTATIONS.requiredFunction}.`,
      "Reexecutar a readiness protegida e verificar abuseProtection.details.runtime.mode.",
      "Conferir coverage dos flows em abuseProtection.details.flows."
    ],
    successSignals: [
      "abuseProtection.details.runtime.mode = durable.",
      "durableRuntime.status = healthy.",
      "Nenhum flow critico em memory-fallback ou unavailable."
    ],
    failureSignals: [
      "abuseProtection.details.runtime.mode = memory-fallback.",
      "durable_runtime_verification_unavailable.",
      "Tabelas ou funcao duravel ausentes no ambiente alvo."
    ]
  };
}

function buildSecretRotationGuidance(): BackendOperationsVerificationReport["releaseEvidence"]["secretRotation"] {
  return [
    {
      name: "Internal perimeter secrets",
      subsystem: "perimeter",
      actionDomain: "env_config",
      owner: "platform_operator",
      completionType: "partially_codified",
      blocksReleaseUntilVerified: true,
      envNames: ["INTERNAL_API_SECRET", "NOTIFICATIONS_WORKER_SECRET", "CRON_SECRET"],
      postRotationSteps: [
        "Reexecutar operations:verify:release no ambiente alvo.",
        "Confirmar GET /api/internal/readiness com o novo secret.",
        "Confirmar falha explicita com o secret anterior."
      ],
      proofRequired: [
        "Readiness protegida acessivel apenas com o novo secret.",
        "Chamadas com o secret anterior ou ausente rejeitadas.",
        "Nenhum blocker de perimeter na release evidence."
      ],
      verificationSignals: [
        "Novo secret acessa /api/internal/readiness e o worker protegido.",
        "Chamadas sem secret ou com secret antigo falham.",
        "operations:verify:release deixa de sinalizar perimeter_internal_guards_missing."
      ],
      followUp:
        "Rotacao e externa/manual, mas a revalidacao pode ser feita com readiness protegida e testes de acesso."
    },
    {
      name: "Mercado Pago webhook and access credentials",
      subsystem: "payments",
      actionDomain: "external_provider",
      owner: "provider_operator",
      completionType: "partially_codified",
      blocksReleaseUntilVerified: true,
      envNames: ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"],
      postRotationSteps: [
        "Revalidar GET /api/payment/webhook com acesso protegido.",
        "Executar um webhook de teste ou fluxo controlado de pagamento.",
        "Reexecutar operations:evidence:release e confirmar ausencia de blocker de assinatura."
      ],
      proofRequired: [
        "signature.enforced = true no diagnostico protegido.",
        "Nenhuma falha de assinatura ou token em fluxo de teste.",
        "payments_signature_not_enforced ausente."
      ],
      verificationSignals: [
        "payments_signature_not_enforced ausente.",
        "GET /api/payment/webhook com acesso protegido mostra signature.enforced = true.",
        "Fluxo de pagamento ou webhook de teste retorna sem falha de assinatura."
      ],
      followUp:
        "A troca do segredo ocorre fora do repo; a prova final depende do dashboard/provider."
    },
    {
      name: "Telegram bot and webhook secret",
      subsystem: "telegram",
      actionDomain: "external_provider",
      owner: "provider_operator",
      completionType: "partially_codified",
      blocksReleaseUntilVerified: false,
      envNames: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
      postRotationSteps: [
        "Revalidar readiness protegida para telegram.status.",
        "Confirmar webhook com novo secret.",
        "Executar mensagem de teste no bot."
      ],
      proofRequired: [
        "telegram.status = healthy.",
        "Webhook aceita o novo secret e rejeita o anterior.",
        "Mensagem de teste atravessa o fluxo sem falha de credencial."
      ],
      verificationSignals: [
        "telegram.status = healthy na readiness protegida.",
        "Webhook do Telegram aceita o novo secret e rejeita o anterior.",
        "Distribuicao protegida continua funcional."
      ],
      followUp:
        "Rotacao exige ajuste externo no provedor e revalidacao do webhook."
    },
    {
      name: "Meta webhook and page credentials",
      subsystem: "meta",
      actionDomain: "dashboard_manual",
      owner: "provider_operator",
      completionType: "external_manual",
      blocksReleaseUntilVerified: false,
      envNames: [
        "META_VERIFY_TOKEN",
        "META_APP_SECRET",
        "FACEBOOK_APP_SECRET",
        "INSTAGRAM_APP_SECRET",
        "FACEBOOK_PAGE_ACCESS_TOKEN"
      ],
      postRotationSteps: [
        "Refazer verificacao GET /api/meta/webhook no dashboard da Meta.",
        "Enviar evento real do canal apos a rotacao.",
        "Confirmar runtime logs com META_WEBHOOK_INBOUND_ACCEPTED e ausencia de falha outbound."
      ],
      proofRequired: [
        "GET de verificacao da Meta bem-sucedido.",
        "Evento inbound real aceito apos a rotacao.",
        "Resposta outbound sem erro de token ou assinatura."
      ],
      verificationSignals: [
        "Meta revalida GET /api/meta/webhook com sucesso.",
        "Runtime logs mostram META_SIGNATURE_VALIDATED e META_WEBHOOK_INBOUND_ACCEPTED apos novo evento.",
        "Envio outbound deixa de retornar facebook_access_token_missing ou falhas de assinatura."
      ],
      followUp:
        "A ultima milha depende do dashboard da Meta e de um evento real do canal."
    }
  ];
}

function buildEvidenceBoundaries(
  runtimeVerification: BackendOperationsVerificationReport["runtimeVerification"],
  blockers: BackendSectionAssessment[],
  warnings: BackendSectionAssessment[],
  durableProof: BackendOperationsVerificationReport["releaseEvidence"]["durableProof"]
) {
  return {
    automatedProof: [
      "Classificacao de release/blocker baseada no report gerado em repo.",
      "Snapshot de environment completeness e sections criticas.",
      "Evidence artifact persistido em JSON, texto e markdown."
    ],
    inferredStatus: [
      `Runtime verification mode ${runtimeVerification.mode} com attempted=${runtimeVerification.attempted}.`,
      `Warnings ativos: ${warnings.length}.`,
      `Blockers ativos: ${blockers.length}.`
    ],
    requiredExternalVerification:
      durableProof.requiredAccess === "supabase_admin"
        ? [
            "Acesso administrativo real ao Supabase para prova de convergencia duravel.",
            "Dashboards/provedores externos para rotacao e webhook validation quando aplicavel."
          ]
        : ["Revalidacao externa somente quando houver mudanca de provider ou rotacao de segredo."]
  };
}

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
  } else if (section.code === "database_critical_rls_missing") {
    level = "release_blocker";
    reason = "Tabelas criticas sem RLS explicito nas migrations locais.";
  } else if (section.code === "database_manual_check_required") {
    level = context.profile === "production" ? "action_required" : "warning";
    reason =
      "Banco exige validacao manual de migrations/RLS/storage no ambiente alvo.";
  } else if (section.code === "channel_readiness_action_required") {
    level =
      context.profile === "production"
        ? "release_blocker"
        : context.profile === "preview"
          ? "action_required"
          : "action_required";
    reason =
      "Canais core ainda nao fecham assinatura/secret/readiness para piloto seguro.";
  } else if (section.code === "channel_readiness_manual_check_required") {
    level = context.profile === "production" ? "action_required" : "warning";
    reason =
      "Canais core exigem validacao manual em provider antes de producao plena.";
  } else if (section.code === "noemia_compliance_blocked_phrases") {
    level = "release_blocker";
    reason = "NoemIA contem linguagem proibida para atendimento juridico responsavel.";
  } else if (section.code === "noemia_compliance_action_required") {
    level = context.profile === "production" ? "release_blocker" : "action_required";
    reason = "NoemIA ainda nao tem guardrails/testes minimos para piloto responsavel.";
  } else if (section.code === "noemia_compliance_pilot_ready_manual_review") {
    level = context.profile === "production" ? "action_required" : "warning";
    reason = "NoemIA esta pronta para piloto controlado, mas exige revisao humana antes de escala.";
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
  const durableProof = buildDurableProofSupport(durableSection, runtimeVerification);
  const secretRotation = buildSecretRotationGuidance();
  const manualFollowUps: ReleaseEvidenceManualFollowUp[] = [];

  if (durableSection && durableConvergence !== "verified") {
    const actionDomain = inferActionDomain("durableRuntime", durableSection.code);
    manualFollowUps.push({
      category: "durable",
      enforcementLevel: durableStateToEnforcementLevel(durableProof.state),
      blocksRelease: durableProof.state !== "complete" && runtimeVerification.mode === "required",
      actionDomain,
      owner: inferActionOwner(actionDomain),
      completionType: durableProof.completionType,
      proofBoundary: inferProofBoundaryFromCompletionType(durableProof.completionType),
      partialEvidenceAvailable: true,
      title: "Confirmar convergencia duravel em ambiente real",
      why:
        durableSection.status === "fallback"
          ? "O runtime atual caiu para memory-fallback."
          : "A verificacao runtime duravel ainda nao foi provada com acesso administrativo real.",
      nextAction:
        "Validar a migracao, a funcao duravel e a readiness protegida com acesso administrativo real.",
      proofRequired: [...durableProof.successSignals],
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
    const actionDomain = inferActionDomain(
      environmentSection.subsystem,
      environmentSection.code
    );
    manualFollowUps.push({
      category: "environment",
      enforcementLevel: environmentSection.enforcement.level,
      blocksRelease: environmentSection.enforcement.level === "release_blocker",
      actionDomain,
      owner: inferActionOwner(actionDomain),
      completionType: "partially_codified",
      proofBoundary: inferProofBoundaryFromCompletionType("partially_codified"),
      partialEvidenceAvailable: true,
      title: "Fechar lacunas de environment completeness antes da liberacao final",
      why: environmentSection.summary,
      nextAction:
        "Completar os envs obrigatorios do perfil alvo e reexecutar a verificacao de release.",
      proofRequired: [
        "profiles.release.satisfied = true.",
        "profiles.full_durable.satisfied = true quando a promocao exigir prova duravel real.",
        "Nenhum secret ou chave obrigatoria pendente no ambiente alvo."
      ],
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
    const actionDomain = inferActionDomain(section.subsystem, section.code);
    manualFollowUps.push({
      category: "subsystem",
      enforcementLevel: section.enforcement.level,
      blocksRelease: section.enforcement.level === "release_blocker",
      actionDomain,
      owner: inferActionOwner(actionDomain),
      completionType:
        actionDomain === "external_provider" || actionDomain === "dashboard_manual"
          ? "external_manual"
          : "partially_codified",
      proofBoundary: inferProofBoundaryFromCompletionType(
        actionDomain === "external_provider" || actionDomain === "dashboard_manual"
          ? "external_manual"
          : "partially_codified"
      ),
      partialEvidenceAvailable: true,
      title: `Revalidar ${section.subsystem} no ambiente alvo`,
      why: section.summary,
      nextAction: section.operatorAction,
      proofRequired: section.verification.slice(0, 3),
      successSignals: section.verification.slice(0, 3)
    });
  }

  if (blockers.length > 0) {
    manualFollowUps.push({
      category: "release",
      enforcementLevel: "release_blocker",
      blocksRelease: true,
      actionDomain: "release_coordination",
      owner: "release_manager",
      completionType: "partially_codified",
      proofBoundary: inferProofBoundaryFromCompletionType("partially_codified"),
      partialEvidenceAvailable: true,
      title: "Nao promover enquanto houver release blockers",
      why: "A verificacao atual encontrou bloqueios explicitos para o perfil selecionado.",
      nextAction:
        "Resolver os blockers, regenerar os artifacts de release e registrar a decisao humana de promocao.",
      proofRequired: [
        "blockers vazio no relatorio de release.",
        "deployAllowed = true.",
        "operator.releaseSafety.blockers vazio na readiness protegida."
      ],
      successSignals: [
        "blockers vazio no relatorio de release.",
        "deployAllowed = true.",
        "operator.releaseSafety.blockers vazio na readiness protegida."
      ]
    });
  }

  const evidenceBoundaries = buildEvidenceBoundaries(
    runtimeVerification,
    blockers,
    warnings,
    durableProof
  );
  const immediateAlerts = [...blockers, ...actionRequiredItems].map((section) => {
    const actionDomain = inferActionDomain(section.subsystem, section.code);

    return {
      subsystem: section.subsystem,
      level: section.enforcement.level,
      code: section.code,
      summary: section.summary,
      operatorAction: section.operatorAction,
      owner: inferActionOwner(actionDomain),
      actionDomain,
      proofBoundary: inferProofBoundaryForSection(actionDomain)
    };
  });
  const reviewAlerts = warningItems.map((section) => {
    const actionDomain = inferActionDomain(section.subsystem, section.code);

    return {
      subsystem: section.subsystem,
      level: section.enforcement.level,
      code: section.code,
      summary: section.summary,
      nextAction: section.operatorAction,
      owner: inferActionOwner(actionDomain),
      actionDomain,
      proofBoundary: inferProofBoundaryForSection(actionDomain)
    };
  });
  const topActions = [...blockers, ...actionRequiredItems]
    .slice(0, 5)
    .map((section) => {
      const actionDomain = inferActionDomain(section.subsystem, section.code);

      return {
        subsystem: section.subsystem,
        level: section.enforcement.level,
        code: section.code,
        owner: inferActionOwner(actionDomain),
        actionDomain,
        nextAction: section.operatorAction,
        proofBoundary: inferProofBoundaryForSection(actionDomain)
      };
    });
  const releaseHandoffSummaryLines = [
    `Decision=${releaseDecision}`,
    `Severity=${blockers.length > 0 ? "release_blocker" : actionRequiredItems.length > 0 ? "action_required" : warningItems.length > 0 ? "warning" : "info"}`,
    `DeployAllowed=${blockers.length === 0 ? "yes" : "no"}`,
    `DurableProof=${durableProof.state}`,
    `RuntimeProofSatisfied=${runtimeProofSatisfied ? "yes" : "no"}`
  ];
  const handoffSchemaVersion = "phase9-handoff-2026-04-18" as const;
  const artifactSetVersion = "phase9-release-handoff-v1" as const;

  return {
    generatedAt: new Date().toISOString(),
    blockerCount: blockers.length,
    actionRequiredCount: actionRequiredItems.length,
    warningCount: warningItems.length,
    runtimeProofSatisfied,
    durableConvergence,
    releaseDecision,
    manualFollowUps,
    evidenceBoundaries,
    durableProof,
    secretRotation,
    alertSummary: {
      immediate: immediateAlerts,
      review: reviewAlerts
    },
    releaseManagerSummary: {
      headline:
        releaseDecision === "blocked"
          ? "Backend release blocked pending operational follow-up."
          : releaseDecision === "manual_follow_up_required"
            ? "Backend release requires conscious manual follow-up."
            : releaseDecision === "approved_with_warnings"
              ? "Backend release approved with tracked warnings."
              : "Backend release approved by current evidence.",
      decision: releaseDecision,
      blockerCount: blockers.length,
      actionRequiredCount: actionRequiredItems.length,
      warningCount: warningItems.length,
      requiresHumanApproval: releaseDecision !== "approved",
      topActions,
      proofBoundary: {
        automated: evidenceBoundaries.automatedProof.length,
        inferred: evidenceBoundaries.inferredStatus.length,
        external: evidenceBoundaries.requiredExternalVerification.length
      }
    },
    releaseHandoff: {
      schemaVersion: handoffSchemaVersion,
      artifactSetVersion,
      releaseChannel: {
        subject: `[backend-release] ${releaseDecision} (${blockers.length} blockers / ${actionRequiredItems.length} action-required)`,
        decision: releaseDecision,
        severity:
          blockers.length > 0
            ? "release_blocker"
            : actionRequiredItems.length > 0
              ? "action_required"
              : warningItems.length > 0
                ? "warning"
                : "info",
        requiresHumanApproval: releaseDecision !== "approved",
        summaryLines: [
          ...releaseHandoffSummaryLines,
          `TopActionCount=${topActions.length}`,
          `ManualFollowUpCount=${manualFollowUps.length}`
        ],
        blockers: blockers.map(
          (section) =>
            `${section.subsystem}:${section.code}:${section.enforcement.reason}`
        ),
        actionRequired: actionRequiredItems.map(
          (section) =>
            `${section.subsystem}:${section.code}:${section.operatorAction}`
        ),
        warnings: warningItems.map(
          (section) =>
            `${section.subsystem}:${section.code}:${section.summary}`
        ),
        manualFollowUps: manualFollowUps.map((item) => ({
          title: item.title,
          blocksRelease: item.blocksRelease,
          owner: item.owner,
          actionDomain: item.actionDomain,
          completionType: item.completionType,
          proofBoundary: item.proofBoundary,
          nextAction: item.nextAction
        }))
      },
      incidentChannel: {
        title:
          blockers.length > 0
            ? "Backend release blocker requires escalation"
            : actionRequiredItems.length > 0
              ? "Backend action-required state needs release follow-up"
              : "Backend release status summary",
        severity:
          blockers.length > 0
            ? "release_blocker"
            : actionRequiredItems.length > 0
              ? "action_required"
              : warningItems.length > 0
                ? "warning"
                : "info",
        escalateNow: blockers.length > 0 || durableProof.state === "failed",
        proofBoundary:
          blockers.length > 0 || durableProof.state === "failed"
            ? "external_manual"
            : "inferred",
        summaryLines: [
          `ImmediateItems=${immediateAlerts.length}`,
          `ReviewItems=${reviewAlerts.length}`,
          `DurableProof=${durableProof.state}`,
          `ReleaseDecision=${releaseDecision}`
        ],
        immediate: immediateAlerts.map((item) => ({
          subsystem: item.subsystem,
          level: item.level,
          code: item.code,
          owner: item.owner,
          actionDomain: item.actionDomain,
          nextAction: item.operatorAction,
          proofBoundary: item.proofBoundary
        })),
        manualFollowUps: manualFollowUps
          .filter((item) => item.blocksRelease || item.enforcementLevel !== "warning")
          .map((item) => ({
            title: item.title,
            blocksRelease: item.blocksRelease,
            owner: item.owner,
            actionDomain: item.actionDomain,
            proofBoundary: item.proofBoundary
          }))
      },
      artifactManifest: {
        schemaVersion: handoffSchemaVersion,
        generatedAt: new Date().toISOString(),
        recommendedReleaseArtifact: "handoff/release-channel-summary.md",
        recommendedIncidentArtifact: "handoff/incident-escalation-summary.md",
        artifacts: [
          {
            path: "backend-operations-report.json",
            audience: "automation",
            purpose: "Complete machine-readable backend verification report"
          },
          {
            path: "backend-release-evidence.md",
            audience: "operator",
            purpose: "Detailed operator evidence with proof boundaries and follow-ups"
          },
          {
            path: "backend-release-summary.md",
            audience: "release_manager",
            purpose: "Compact release-manager review summary"
          },
          {
            path: "handoff/release-channel-summary.md",
            audience: "release_manager",
            purpose: "Paste-ready release handoff for external release channel"
          },
          {
            path: "handoff/release-channel-summary.json",
            audience: "automation",
            purpose: "Structured release handoff payload for downstream glue"
          },
          {
            path: "handoff/incident-escalation-summary.md",
            audience: "incident_channel",
            purpose: "Concise escalation summary for incident or blocker channel"
          },
          {
            path: "handoff/incident-escalation-summary.json",
            audience: "automation",
            purpose: "Structured escalation payload for manual or scripted routing"
          }
        ]
      }
    }
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
    ...envSections,
    databaseSecurity: buildDatabaseSecurityReadinessSection(),
    channelReadiness: buildChannelWebhookReadinessSection(),
    noemiaCompliance: buildNoemiaComplianceReadinessSection()
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
    schemaVersion: "phase9-2026-04-18" as const,
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
        `- ${item.subsystem}: ${item.level} / ${item.code} / owner=${item.owner} / domain=${item.actionDomain} / proofBoundary=${item.proofBoundary} / ${item.summary} / Action: ${item.operatorAction}`
      );
    }
  }

  lines.push("", "## Review items", "");

  if (report.releaseEvidence.alertSummary.review.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.releaseEvidence.alertSummary.review) {
      lines.push(
        `- ${item.subsystem}: ${item.level} / ${item.code} / owner=${item.owner} / domain=${item.actionDomain} / proofBoundary=${item.proofBoundary} / ${item.summary} / Next: ${item.nextAction}`
      );
    }
  }

  lines.push("", "## Manual follow-up", "");

  if (report.releaseEvidence.manualFollowUps.length === 0) {
    lines.push("- none");
  } else {
    for (const followUp of report.releaseEvidence.manualFollowUps) {
      lines.push(
        `- ${followUp.category}: ${followUp.title} / level=${followUp.enforcementLevel} / blocksRelease=${followUp.blocksRelease} / owner=${followUp.owner} / domain=${followUp.actionDomain} / completionType=${followUp.completionType} / proofBoundary=${followUp.proofBoundary} / partialEvidenceAvailable=${followUp.partialEvidenceAvailable}`
      );
      lines.push(`  Why: ${followUp.why}`);
      lines.push(`  Next action: ${followUp.nextAction}`);
      lines.push(`  Proof required: ${followUp.proofRequired.join(" | ")}`);
      lines.push(`  Success signals: ${followUp.successSignals.join(" | ")}`);
    }
  }

  lines.push("", "## Durable proof support", "");
  lines.push(
    `- state=${report.releaseEvidence.durableProof.state} / completionType=${report.releaseEvidence.durableProof.completionType} / requiredAccess=${report.releaseEvidence.durableProof.requiredAccess}`
  );
  lines.push(
    `- Automated signals: ${report.releaseEvidence.durableProof.automatedSignals.join(" | ")}`
  );
  lines.push(`- Manual steps: ${report.releaseEvidence.durableProof.manualSteps.join(" | ")}`);
  lines.push(
    `- Success signals: ${report.releaseEvidence.durableProof.successSignals.join(" | ")}`
  );

  lines.push("", "## Secret rotation support", "");
  for (const item of report.releaseEvidence.secretRotation) {
    lines.push(
      `- ${item.name}: owner=${item.owner} / domain=${item.actionDomain} / completionType=${item.completionType} / blocksReleaseUntilVerified=${item.blocksReleaseUntilVerified}`
    );
    lines.push(`  Env: ${item.envNames.join(", ")}`);
    lines.push(`  Post-rotation: ${item.postRotationSteps.join(" | ")}`);
    lines.push(`  Proof required: ${item.proofRequired.join(" | ")}`);
    lines.push(`  Verify: ${item.verificationSignals.join(" | ")}`);
  }

  lines.push("", "## Evidence boundary", "");
  lines.push(
    `- Automated: ${report.releaseEvidence.evidenceBoundaries.automatedProof.join(" | ")}`
  );
  lines.push(
    `- Inferred: ${report.releaseEvidence.evidenceBoundaries.inferredStatus.join(" | ")}`
  );
  lines.push(
    `- External/manual: ${report.releaseEvidence.evidenceBoundaries.requiredExternalVerification.join(" | ")}`
  );

  lines.push("", "## Protected readiness", "");
  lines.push(
    `- ${report.protectedReadiness.path} with ${report.protectedReadiness.access}`
  );

  return `${lines.join("\n")}\n`;
}

export function renderBackendReleaseManagerSummaryMarkdown(
  report: BackendOperationsVerificationReport
) {
  const summary = report.releaseEvidence.releaseManagerSummary;
  const lines = [
    "# Backend Release Manager Summary",
    "",
    `- Headline: ${summary.headline}`,
    `- Decision: ${summary.decision}`,
    `- Requires human approval: ${summary.requiresHumanApproval ? "yes" : "no"}`,
    `- Blockers: ${summary.blockerCount}`,
    `- Action required: ${summary.actionRequiredCount}`,
    `- Warnings: ${summary.warningCount}`,
    `- Evidence boundary: automated=${summary.proofBoundary.automated} / inferred=${summary.proofBoundary.inferred} / external=${summary.proofBoundary.external}`,
    "",
    "## Top actions",
    ""
  ];

  if (summary.topActions.length === 0) {
    lines.push("- none");
  } else {
    for (const item of summary.topActions) {
      lines.push(
        `- ${item.subsystem}: ${item.level} / ${item.code} / owner=${item.owner} / domain=${item.actionDomain} / proofBoundary=${item.proofBoundary} / next=${item.nextAction}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderBackendReleaseChannelSummaryMarkdown(
  report: BackendOperationsVerificationReport
) {
  const handoff = report.releaseEvidence.releaseHandoff.releaseChannel;
  const lines = [
    "# Backend Release Channel Summary",
    "",
    `- Subject: ${handoff.subject}`,
    `- Decision: ${handoff.decision}`,
    `- Severity: ${handoff.severity}`,
    `- Requires human approval: ${handoff.requiresHumanApproval ? "yes" : "no"}`,
    "",
    "## Summary lines",
    "",
    ...handoff.summaryLines.map((line) => `- ${line}`),
    "",
    "## Top follow-ups",
    ""
  ];

  if (handoff.manualFollowUps.length === 0) {
    lines.push("- none");
  } else {
    for (const item of handoff.manualFollowUps.slice(0, 5)) {
      lines.push(
        `- ${item.title}: blocksRelease=${item.blocksRelease} / owner=${item.owner} / domain=${item.actionDomain} / completionType=${item.completionType} / proofBoundary=${item.proofBoundary} / next=${item.nextAction}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderBackendIncidentEscalationSummaryMarkdown(
  report: BackendOperationsVerificationReport
) {
  const incident = report.releaseEvidence.releaseHandoff.incidentChannel;
  const lines = [
    "# Backend Incident Escalation Summary",
    "",
    `- Title: ${incident.title}`,
    `- Severity: ${incident.severity}`,
    `- Escalate now: ${incident.escalateNow ? "yes" : "no"}`,
    `- Proof boundary: ${incident.proofBoundary}`,
    "",
    "## Summary lines",
    "",
    ...incident.summaryLines.map((line) => `- ${line}`),
    "",
    "## Immediate items",
    ""
  ];

  if (incident.immediate.length === 0) {
    lines.push("- none");
  } else {
    for (const item of incident.immediate) {
      lines.push(
        `- ${item.subsystem}: ${item.level} / ${item.code} / owner=${item.owner} / domain=${item.actionDomain} / proofBoundary=${item.proofBoundary} / next=${item.nextAction}`
      );
    }
  }

  lines.push("", "## Manual follow-ups", "");

  if (incident.manualFollowUps.length === 0) {
    lines.push("- none");
  } else {
    for (const item of incident.manualFollowUps) {
      lines.push(
        `- ${item.title}: blocksRelease=${item.blocksRelease} / owner=${item.owner} / domain=${item.actionDomain} / proofBoundary=${item.proofBoundary}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
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
      lines.push(
        `- ${item.category}: ${item.title} :: ${item.why} :: owner=${item.owner} :: domain=${item.actionDomain} :: proofBoundary=${item.proofBoundary}`
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
