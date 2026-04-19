import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProductEventInput } from "../lib/analytics/funnel-events.ts";
import { assignExperimentVariant } from "../lib/growth/experiments.ts";
import { calculateLeadScore } from "../lib/growth/lead-scoring.ts";
import {
  getNextBestArticles,
  getRelatedArticles,
  getTopicHubBySlug
} from "../lib/site/article-content.ts";

test("phase 11 calculates transparent lead scoring for high-intent triage", () => {
  const score = calculateLeadScore({
    caseArea: "previdenciario",
    urgencyLevel: "urgente",
    currentStage: "tenho-prazo-proximo",
    readinessLevel: "pronto-para-agendar",
    preferredContactChannel: "whatsapp",
    preferredContactPeriod: "horario-comercial",
    appointmentInterest: true,
    caseSummary:
      "Recebi negativa do INSS, tenho prazo curto para resposta e quero entender se ja vale marcar consulta com todos os documentos que consegui reunir.",
    source: "organic",
    topic: "previdenciario",
    campaign: "abril-2026",
    contentId: "aposentadoria-negada-inss",
    contentStage: "decision",
    returnVisitor: true
  });

  assert.equal(score.temperature, "urgent");
  assert.equal(score.lifecycleStage, "urgent_triage");
  assert.equal(score.reasons.some((reason) => reason.label === "Urgência"), true);
  assert.equal(score.score >= 72, true);
});

test("phase 11 assigns deterministic contextual CTA experiments", () => {
  const first = assignExperimentVariant({
    experimentId: "phase11-contextual-cta",
    sessionId: "session-123",
    surface: "article",
    topic: "previdenciario",
    contentId: "aposentadoria-negada-inss"
  });
  const second = assignExperimentVariant({
    experimentId: "phase11-contextual-cta",
    sessionId: "session-123",
    surface: "article",
    topic: "previdenciario",
    contentId: "aposentadoria-negada-inss"
  });

  assert.equal(first?.variant.id, second?.variant.id);
  assert.equal(Boolean(first?.variant.headline), true);
});

test("phase 11 article hubs and next-best reading stay aligned with topic clusters", () => {
  const hub = getTopicHubBySlug("previdenciario");
  const related = getRelatedArticles({
    slug: "aposentadoria-negada-inss",
    sourceFile: "aposentadoria-negada-inss.html",
    title: "Aposentadoria negada pelo INSS: o que fazer agora?",
    description: "d",
    excerpt: "e",
    topic: "previdenciario",
    categoryLabel: "Previdenciario",
    funnelStage: "decision",
    strategicPriority: "core",
    publishedAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: "Noemia Paixao Advocacia",
    tags: [],
    readingMinutes: 4
  });
  const nextBest = getNextBestArticles({
    slug: "divorcio-primeiros-passos",
    sourceFile: "divorcio-primeiros-passos.html",
    title: "Divorcio: quais sao os primeiros passos?",
    description: "d",
    excerpt: "e",
    topic: "familia",
    categoryLabel: "Familia",
    funnelStage: "consideration",
    strategicPriority: "core",
    publishedAt: "2026-04-05T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
    author: "Noemia Paixao Advocacia",
    tags: [],
    readingMinutes: 4
  });

  assert.equal(hub?.topic, "previdenciario");
  assert.equal(related.every((article) => article.topic === "previdenciario"), true);
  assert.equal(nextBest.every((article) => article.topic === "familia"), true);
});

test("phase 11 preserves experiment payloads without leaking secrets", () => {
  const normalized = normalizeProductEventInput({
    eventKey: "experiment_variant_viewed",
    pagePath: "/artigos/aposentadoria-negada-inss",
    payload: {
      experimentId: "phase11-contextual-cta",
      variantId: "consulta",
      accessSecret: "should-not-leak",
      contentStage: "decision"
    }
  });
  const payload = normalized.payload as Record<string, unknown>;

  assert.equal(payload.experimentId, "phase11-contextual-cta");
  assert.equal(payload.variantId, "consulta");
  assert.equal(
    payload.accessSecret,
    "[REDACTED]"
  );
});
