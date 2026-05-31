import test from "node:test";
import assert from "node:assert/strict";

import {
  FUNNEL_STATUS_LABELS,
  FUNNEL_TRACKING_EVENTS,
  buildFunnelStateMatrix,
  projectFunnelJourney
} from "../lib/services/funnel-lifecycle.ts";
import { buildFunnelJourneyReadinessSection } from "../lib/diagnostics/funnel-readiness.ts";
import { normalizeProductEventInput } from "../lib/analytics/funnel-events.ts";

function assertInboxAction(projection: ReturnType<typeof projectFunnelJourney>) {
  assert.equal(projection.inbox.appearsInInbox, true);
  assert.ok(projection.inbox.nextAction.length > 20);
  assert.ok(projection.conversation.safeSummary.includes("Resumo seguro"));
  assert.ok(projection.trackingEvents.includes("lead_created"));
  assert.ok(projection.trackingEvents.includes("inbox_opened"));
}

test("phase 5 state matrix keeps funnel statuses canonical and user-facing in Portuguese", () => {
  const matrix = buildFunnelStateMatrix();

  assert.equal(FUNNEL_STATUS_LABELS.lead.needs_human_review, "Precisa de revisao humana");
  assert.equal(FUNNEL_STATUS_LABELS.conversation.manual_followup_required, "Follow-up manual necessario");
  assert.equal(FUNNEL_STATUS_LABELS.consultation.scheduled, "Consulta agendada");
  assert.equal(FUNNEL_STATUS_LABELS.payment.approved, "Pagamento aprovado");
  assert.equal(FUNNEL_STATUS_LABELS.portal.needs_manual_setup, "Criacao manual do portal necessaria");
  assert.ok(matrix.transitions.lead.includes("qualified -> consultation_offered -> payment_pending -> converted"));
});

test("phase 5 journey 1 site triage with INSS deadline creates safe handoff and inbox action", () => {
  const projection = projectFunnelJourney({
    entryPoint: "triage_page",
    sourceChannel: "site",
    message: "Meu beneficio do INSS foi negado e recebi comunicacao com prazo.",
    campaign: "site-organico"
  });

  assert.equal(projection.channel, "site");
  assert.equal(projection.legalArea, "previdenciario");
  assert.equal(projection.lead.status, "needs_human_review");
  assert.equal(projection.conversation.requiresHuman, true);
  assert.equal(projection.conversation.status, "waiting_human");
  assert.ok(projection.conversation.reasonCodes.includes("mandatory_handoff_urgency"));
  assert.ok(projection.trackingEvents.includes("handoff_required"));
  assertInboxAction(projection);
});

test("phase 5 journey 2 Instagram negativacao becomes banking lead with manual follow-up when outbound is off", () => {
  const projection = projectFunnelJourney({
    entryPoint: "instagram_comment",
    message: "negativacao",
    outboundConfigured: false
  });

  assert.equal(projection.channel, "instagram");
  assert.equal(projection.legalArea, "bancario");
  assert.equal(projection.topic, "negativacao");
  assert.equal(projection.lead.status, "needs_human_review");
  assert.equal(projection.conversation.status, "manual_followup_required");
  assert.equal(projection.inbox.priority, "high");
  assert.match(projection.inbox.nextAction, /privado|WhatsApp|follow-up manual/i);
  assert.ok(projection.trackingEvents.includes("manual_followup_required"));
  assert.doesNotMatch(projection.conversation.safeSummary, /indeniza[cç][aã]o certa|direito garantido|causa ganha/i);
});

test("phase 5 journey 3 WhatsApp desconto indevido keeps minimal triage and next action", () => {
  const projection = projectFunnelJourney({
    entryPoint: "whatsapp",
    message: "Tenho desconto indevido no meu beneficio e queria entender.",
    outboundConfigured: true
  });

  assert.equal(projection.channel, "whatsapp");
  assert.equal(projection.legalArea, "previdenciario");
  assert.equal(projection.lead.status, "triaged");
  assert.equal(projection.conversation.status, "ai_assisted");
  assert.match(projection.inbox.nextAction, /coleta minima|CTA responsavel/i);
  assertInboxAction(projection);
});

test("phase 5 journey 4 family pension and custody escalates when child risk appears", () => {
  const projection = projectFunnelJourney({
    entryPoint: "noemia_chat",
    sourceChannel: "site",
    message: "Preciso falar sobre pensao e guarda, tem menor em risco."
  });

  assert.equal(projection.legalArea, "familia");
  assert.equal(projection.conversation.requiresHuman, true);
  assert.equal(projection.conversation.status, "waiting_human");
  assert.ok(projection.trackingEvents.includes("handoff_required"));
  assert.doesNotMatch(projection.conversation.safeSummary, /detalhes intimos|conte tudo/i);
});

test("phase 5 journey 5 consultation and mocked approved payment convert lead and prepare portal", () => {
  const projection = projectFunnelJourney({
    entryPoint: "consultation_cta",
    sourceChannel: "site",
    message: "Quero marcar consulta sobre cobranca indevida.",
    consultationOffered: true,
    consultationScheduled: true,
    paymentProviderConfigured: true,
    notificationProviderConfigured: true,
    portalAccountExists: true,
    mockPaymentState: "approved"
  });

  assert.equal(projection.legalArea, "civil");
  assert.equal(projection.lead.status, "converted");
  assert.equal(projection.consultation.status, "scheduled");
  assert.equal(projection.payment.status, "approved");
  assert.equal(projection.payment.linkedToLead, true);
  assert.equal(projection.payment.linkedToConsultation, true);
  assert.equal(projection.portal.status, "ready");
  assert.equal(projection.notification.status, "queued");
  assert.ok(projection.trackingEvents.includes("payment_approved"));
  assert.ok(projection.trackingEvents.includes("conversion_completed"));
  assertInboxAction(projection);
});

test("phase 5 journey 6 missing providers never break the funnel and create manual action", () => {
  const projection = projectFunnelJourney({
    entryPoint: "payment_cta",
    sourceChannel: "instagram",
    message: "Quero consulta sobre banco negativou meu nome.",
    consultationOffered: true,
    paymentProviderConfigured: false,
    notificationProviderConfigured: false,
    outboundConfigured: false
  });

  assert.equal(projection.legalArea, "bancario");
  assert.equal(projection.lead.status, "consultation_offered");
  assert.equal(projection.payment.status, "not_created");
  assert.equal(projection.payment.providerStatus, "provider_missing");
  assert.equal(projection.notification.status, "provider_missing");
  assert.ok(projection.trackingEvents.includes("notification_failed"));
  assertInboxAction(projection);
});

test("phase 5 tracking catalog includes complete funnel events without leaking provider details", () => {
  for (const eventKey of FUNNEL_TRACKING_EVENTS) {
    const normalized = normalizeProductEventInput({
      eventKey,
      pagePath: "/triagem",
      payload: {
        source: "instagram",
        topic: "negativacao",
        token: "secret-value"
      }
    });

    assert.equal(normalized.eventKey, eventKey);
    assert.equal(normalized.payload.source, "instagram");
    assert.equal(normalized.payload.topic, "negativacao");
    assert.equal((normalized.payload as Record<string, unknown>).token, "[REDACTED]");
  }
});

test("phase 5 readiness exposes funnel lifecycle details for operations verify", () => {
  const section = buildFunnelJourneyReadinessSection();
  const details = section.details as {
    funnelReadiness?: string;
    leadLifecycleReadiness?: string;
    inboxOperationalReadiness?: string;
    consultationReadiness?: string;
    paymentJourneyReadiness?: string;
    portalJourneyReadiness?: string;
    notificationJourneyReadiness?: string;
    conversionTrackingReadiness?: string;
    missingFiles?: string[];
  };

  assert.equal(section.code, "funnel_journey_pilot_ready_manual_provider_checks");
  assert.equal(details.funnelReadiness, "pilot_ready");
  assert.equal(details.leadLifecycleReadiness, "pilot_ready");
  assert.equal(details.inboxOperationalReadiness, "pilot_ready");
  assert.equal(details.consultationReadiness, "manual_check_required");
  assert.ok(["pilot_ready", "action_required"].includes(details.paymentJourneyReadiness || ""));
  assert.equal(details.portalJourneyReadiness, "manual_check_required");
  assert.ok(["pilot_ready", "action_required"].includes(details.notificationJourneyReadiness || ""));
  assert.equal(details.conversionTrackingReadiness, "pilot_ready");
  assert.deepEqual(details.missingFiles, []);
});
