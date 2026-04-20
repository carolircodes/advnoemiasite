import assert from "node:assert/strict";
import test from "node:test";

import {
  buildJourneyTouchLabel,
  normalizeJourneyTaxonomy
} from "../lib/journey/taxonomy.ts";
import { buildContextRoutingDecision } from "../lib/services/context-routing.ts";

test("phase 12 normalizes omnichannel taxonomy from mixed legacy metadata", () => {
  const taxonomy = normalizeJourneyTaxonomy({
    metadata: {
      origem: "Instagram",
      campaign: "abril-consulta-quente",
      tema: "previdenciario",
      contentId: "aposentadoria-negada-inss",
      page: "/artigos/aposentadoria-negada-inss",
      contentStage: "decision",
      preferredContactChannel: "whatsapp",
      assistedTouches: ["instagram-story", "whatsapp"]
    }
  });

  assert.equal(taxonomy.channel, "instagram");
  assert.equal(taxonomy.campaign, "abril-consulta-quente");
  assert.equal(taxonomy.legalTopic, "previdenciario");
  assert.equal(taxonomy.contentId, "aposentadoria-negada-inss");
  assert.equal(taxonomy.entrySurface, "article");
  assert.equal(taxonomy.preferredChannel, "whatsapp");
  assert.equal(buildJourneyTouchLabel(taxonomy), "instagram:previdenciario:article");
});

test("phase 12 routing stays explicit for high-intent omnichannel leads", () => {
  const decision = buildContextRoutingDecision({
    score: 84,
    temperature: "urgent",
    readiness: "pronto-para-agendar",
    topic: "familia",
    sourceChannel: "instagram",
    funnelStage: "appointment",
    preferredChannel: "whatsapp",
    appointmentInterest: true,
    lifecycleStage: "urgent_triage",
    metadata: {
      source: "instagram",
      campaign: "familia-fundo-funil",
      theme: "familia",
      contentStage: "decision"
    }
  });

  assert.equal(decision.ctaVariant, "schedule_consultation");
  assert.equal(decision.followUpTrack, "appointment_completion");
  assert.equal(decision.recommendedAction, "confirm_appointment_interest");
  assert.equal(decision.priorityChannel, "whatsapp");
  assert.equal(decision.why.includes("lead ja declarou interesse em agenda"), true);
});
