import { existsSync } from "fs";
import path from "path";

import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";
import { FUNNEL_TRACKING_EVENTS, buildFunnelStateMatrix } from "../services/funnel-lifecycle.ts";

type FunnelReadinessStatus =
  | "healthy"
  | "pilot_ready"
  | "manual_check_required"
  | "action_required"
  | "blocked"
  | "not_configured";

function resolveRepoRoot() {
  let current = process.cwd();

  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(current, "apps/portal-backend/lib/services/funnel-lifecycle.ts"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return process.cwd();
}

const REPO_ROOT = resolveRepoRoot();

const REQUIRED_FILES = [
  "apps/portal-backend/lib/services/funnel-lifecycle.ts",
  "apps/portal-backend/lib/services/conversation-inbox.ts",
  "apps/portal-backend/lib/services/channel-conversation-router.ts",
  "apps/portal-backend/lib/payment/payment-workflow.ts",
  "apps/portal-backend/lib/notifications/governed-outbox.ts",
  "apps/portal-backend/lib/analytics/funnel-events.ts",
  "apps/portal-backend/tests/phase5-funnel-journey.test.ts",
  "apps/portal-backend/docs/FUNNEL_JOURNEY_READINESS.md",
  "apps/portal-backend/docs/CLIENT_JOURNEY_PLAYBOOK.md",
  "apps/portal-backend/docs/INBOX_OPERATION_PLAYBOOK.md"
];

function isConfigured(name: string) {
  return typeof process.env[name] === "string" && process.env[name]!.trim().length > 0;
}

export function auditFunnelJourneyReadiness() {
  const missingFiles = REQUIRED_FILES.filter((file) => !existsSync(path.join(REPO_ROOT, file)));
  const paymentProviderReady =
    isConfigured("MERCADO_PAGO_ACCESS_TOKEN") || isConfigured("MERCADO_PAGO_TEST_ACCESS_TOKEN");
  const paymentSignatureEnforced = process.env.MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE === "true";
  const notificationProviderReady =
    isConfigured("EMAIL_FROM") &&
    (isConfigured("RESEND_API_KEY") ||
      (isConfigured("NOTIFICATIONS_SMTP_HOST") && isConfigured("NOTIFICATIONS_SMTP_PORT")));
  const metaOutboundReady =
    isConfigured("FACEBOOK_PAGE_ACCESS_TOKEN") && process.env.META_WEBHOOK_ENFORCE_SIGNATURE === "true";
  const durableDatabaseNeedsManualCheck = true;

  const stateMatrix = buildFunnelStateMatrix();

  return {
    checkedFiles: REQUIRED_FILES,
    missingFiles,
    stateMatrix,
    trackingEvents: FUNNEL_TRACKING_EVENTS,
    providerGates: {
      paymentProviderReady,
      paymentSignatureEnforced,
      notificationProviderReady,
      metaOutboundReady,
      durableDatabaseNeedsManualCheck
    }
  };
}

export function buildFunnelJourneyReadinessSection(): DiagnosticSection {
  const audit = auditFunnelJourneyReadiness();
  const missingRequiredFiles = audit.missingFiles.length > 0;

  const funnelReadiness: FunnelReadinessStatus = missingRequiredFiles ? "action_required" : "pilot_ready";
  const leadLifecycleReadiness: FunnelReadinessStatus = missingRequiredFiles ? "action_required" : "pilot_ready";
  const inboxOperationalReadiness: FunnelReadinessStatus = missingRequiredFiles ? "action_required" : "pilot_ready";
  const consultationReadiness: FunnelReadinessStatus = "manual_check_required";
  const paymentJourneyReadiness: FunnelReadinessStatus =
    audit.providerGates.paymentProviderReady && audit.providerGates.paymentSignatureEnforced
      ? "pilot_ready"
      : "action_required";
  const portalJourneyReadiness: FunnelReadinessStatus = "manual_check_required";
  const notificationJourneyReadiness: FunnelReadinessStatus = audit.providerGates.notificationProviderReady
    ? "pilot_ready"
    : "action_required";
  const conversionTrackingReadiness: FunnelReadinessStatus = missingRequiredFiles
    ? "action_required"
    : "pilot_ready";

  if (missingRequiredFiles) {
    return buildDiagnosticSection({
      status: "missing_configuration",
      code: "funnel_journey_action_required",
      summary: "Funil ainda precisa de contratos, testes ou documentacao obrigatoria antes do piloto.",
      operatorAction:
        "Fechar arquivos obrigatorios do funil, reexecutar testes e revisar readiness protegido antes de qualquer piloto.",
      verification: [
        "Confirmar details.missingFiles vazio.",
        "Rodar npm test.",
        "Rodar operations:verify:json."
      ],
      details: {
        funnelReadiness,
        leadLifecycleReadiness,
        inboxOperationalReadiness,
        consultationReadiness,
        paymentJourneyReadiness,
        portalJourneyReadiness,
        notificationJourneyReadiness,
        conversionTrackingReadiness,
        ...audit
      }
    });
  }

  return buildDiagnosticSection({
    status: "degraded",
    code: "funnel_journey_pilot_ready_manual_provider_checks",
    summary:
      "Funil tem contratos e testes locais para piloto controlado, com pagamentos/notificacoes/providers reais ainda pendentes de validacao.",
    operatorAction:
      "Validar providers, migrations aplicadas e um teste real controlado antes de ampliar trafego ou automacao.",
    verification: [
      "Executar testes simulados de site, Instagram, WhatsApp, familia, consulta/pagamento e provider ausente.",
      "Confirmar Mercado Pago em modo seguro antes de criar pagamento real.",
      "Confirmar notificacoes e Meta/Vercel em ambiente alvo.",
      "Validar manualmente banco/RLS antes do piloto."
    ],
    details: {
      funnelReadiness,
      leadLifecycleReadiness,
      inboxOperationalReadiness,
      consultationReadiness,
      paymentJourneyReadiness,
      portalJourneyReadiness,
      notificationJourneyReadiness,
      conversionTrackingReadiness,
      ...audit
    }
  });
}
