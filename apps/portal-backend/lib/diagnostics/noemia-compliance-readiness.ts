import { existsSync, readFileSync } from "fs";
import path from "path";

import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";

type NoemiaComplianceReadinessStatus =
  | "healthy"
  | "pilot_ready"
  | "manual_check_required"
  | "action_required"
  | "blocked"
  | "not_configured";

const REPO_ROOT = process.cwd();

const TARGET_FILES = [
  "apps/portal-backend/lib/ai/noemia-core.ts",
  "apps/portal-backend/lib/ai/response-composer.ts",
  "apps/portal-backend/lib/ai/handoff-orchestrator.ts",
  "apps/portal-backend/lib/services/channel-conversation-router.ts",
  "apps/portal-backend/lib/services/instagram-keyword-automation.ts",
  "apps/portal-backend/lib/services/ab-testing.ts"
];

const BLOCKED_PATTERNS = [
  /causa ganha/i,
  /direito garantido/i,
  /com certeza (voce|você)?\s*(ganha|vai ganhar)/i,
  /vale muito pelo resultado/i,
  /cada dia de espera pode impactar diretamente seu resultado/i,
  /tempo (esta|está) esgotando para garantir/i,
  /orienta[cç][aã]o precisa e definitiva/i
];

export function auditNoemiaComplianceSources() {
  const findings: Array<{
    file: string;
    pattern: string;
  }> = [];
  const missingFiles: string[] = [];

  for (const file of TARGET_FILES) {
    const absolutePath = path.join(REPO_ROOT, file);

    if (!existsSync(absolutePath)) {
      missingFiles.push(file);
      continue;
    }

    const source = readFileSync(absolutePath, "utf8");

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(source)) {
        findings.push({
          file,
          pattern: String(pattern)
        });
      }
    }
  }

  return {
    checkedFiles: TARGET_FILES,
    missingFiles,
    blockedPhraseFindings: findings,
    guardrails: {
      systemPromptPolicy: true,
      complianceHelper: existsSync(
        path.join(REPO_ROOT, "apps/portal-backend/lib/ai/noemia-compliance.ts")
      ),
      publicPrivateBoundary: true,
      promptInjectionTests: existsSync(
        path.join(REPO_ROOT, "apps/portal-backend/tests/phase4-noemia-compliance.test.ts")
      )
    }
  };
}

export function buildNoemiaComplianceReadinessSection(): DiagnosticSection {
  const audit = auditNoemiaComplianceSources();
  const blocked = audit.blockedPhraseFindings.length > 0;
  const missingGuardrail =
    !audit.guardrails.complianceHelper || !audit.guardrails.promptInjectionTests;
  const readinessStatus: NoemiaComplianceReadinessStatus = blocked
    ? "blocked"
    : missingGuardrail
      ? "action_required"
      : "pilot_ready";

  if (blocked) {
    return buildDiagnosticSection({
      status: "hard_failure",
      code: "noemia_compliance_blocked_phrases",
      summary: "NoemIA ainda contem linguagem juridica/comercial bloqueada em fontes de resposta.",
      operatorAction:
        "Remover promessas, garantias, urgencia artificial e parecer definitivo antes de qualquer piloto.",
      verification: [
        "Reexecutar npm test.",
        "Reexecutar operations:verify.",
        "Conferir details.blockedPhraseFindings."
      ],
      details: {
        readinessStatus,
        ...audit
      }
    });
  }

  return buildDiagnosticSection({
    status: missingGuardrail ? "missing_configuration" : "degraded",
    code: missingGuardrail
      ? "noemia_compliance_action_required"
      : "noemia_compliance_pilot_ready_manual_review",
    summary: missingGuardrail
      ? "NoemIA ainda precisa fechar testes/guardrails minimos antes do piloto."
      : "NoemIA tem guardrails minimos para piloto controlado, com revisao humana obrigatoria.",
    operatorAction: missingGuardrail
      ? "Fechar helper, testes e politica de handoff antes de ativar piloto."
      : "Executar revisao humana dos prompts e respostas reais antes de ampliar automacao.",
    verification: [
      "Confirmar que prompts nao prometem resultado.",
      "Confirmar testes de prompt injection e pedidos indevidos.",
      "Validar amostras reais antes de liberar automacao ampla."
    ],
    details: {
      readinessStatus,
      noemiaCompliance: readinessStatus,
      promptSafety: missingGuardrail ? "action_required" : "pilot_ready",
      legalHandoff: "pilot_ready",
      aiFallback: "pilot_ready",
      lgpdConversationSafety: "manual_check_required",
      ...audit
    }
  });
}
