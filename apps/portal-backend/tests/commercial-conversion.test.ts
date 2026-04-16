import test from "node:test";
import assert from "node:assert/strict";

import { evaluateCommercialConversion } from "../lib/services/commercial-conversion.ts";

test("cenario A: lead em esclarecimento nao recomenda consulta cedo demais", () => {
  const assessment = evaluateCommercialConversion({
    pipelineStage: "new_lead",
    leadTemperature: "cold",
    latestSummary: "Cliente perguntou se o escritorio atende a area e trouxe contexto bem inicial.",
    conversationState: {
      conversionScore: 22,
      reportSummary: "Contato ainda em acolhimento e sem riqueza de contexto."
    }
  });

  assert.equal(assessment.consultationReadiness, "cold");
  assert.equal(assessment.recommendedAction, "continue_clarifying");
  assert.equal(assessment.consultationRecommendationState, "hold");
});

test("cenario B: lead maduro recomenda consulta e proximo passo coerente", () => {
  const assessment = evaluateCommercialConversion({
    pipelineStage: "engaged",
    leadTemperature: "hot",
    latestSummary:
      "Lead descreveu o problema, trouxe urgencia, pediu valor e perguntou pelos proximos passos da consulta.",
    conversationState: {
      conversionScore: 82,
      consultationIntentLevel: "clear",
      consultationInviteState: "invite_now",
      consultationValueAngle: "seguranca para decidir com criterio",
      urgencySignals: ["urgente"],
      valueSignals: ["quero resolver"]
    }
  });

  assert.equal(assessment.consultationReadiness, "ready_for_consultation");
  assert.equal(assessment.recommendedAction, "offer_consultation");
  assert.equal(assessment.consultationRecommendationState, "recommend_now");
  assert.ok(assessment.consultationSuggestedCopy);
});

test("cenario C: lead travado por objecao recebe leitura e acao adequada", () => {
  const assessment = evaluateCommercialConversion({
    pipelineStage: "engaged",
    leadTemperature: "warm",
    latestSummary: "Lead gostou do caminho, mas disse que precisa pensar porque ficou em duvida sobre o valor.",
    conversationState: {
      conversionScore: 61,
      consultationIntentLevel: "emerging",
      objectionsDetected: ["valor"],
      hesitationSignals: ["preciso pensar"]
    }
  });

  assert.equal(assessment.consultationReadiness, "blocked_by_objection");
  assert.equal(assessment.blockingReason, "objection_value");
  assert.equal(assessment.recommendedAction, "reinforce_consultation_value");
});

test("cenario D: lead sumiu e sistema marca reativacao coerente", () => {
  const assessment = evaluateCommercialConversion({
    pipelineStage: "engaged",
    leadTemperature: "hot",
    followUpState: "overdue",
    followUpStatus: "overdue",
    latestSummary: "Lead demonstrou interesse, mas ficou sem responder ao follow-up.",
    conversationState: {
      conversionScore: 58,
      consultationIntentLevel: "emerging"
    }
  });

  assert.equal(assessment.consultationReadiness, "blocked_by_silence");
  assert.equal(assessment.conversionStage, "reactivable");
  assert.equal(assessment.recommendedAction, "reactivate_lead");
});

test("cenario E: lead quente entra em trilho de fechamento", () => {
  const assessment = evaluateCommercialConversion({
    pipelineStage: "proposal_sent",
    leadTemperature: "hot",
    latestSummary: "Consulta aceita, proposta enviada e cliente aguardando apenas definicao final.",
    conversationState: {
      conversionScore: 90,
      consultationIntentLevel: "accepted",
      schedulingStatus: "pending_confirmation"
    }
  });

  assert.equal(assessment.consultationReadiness, "closing");
  assert.equal(assessment.conversionStage, "awaiting_decision");
  assert.equal(assessment.recommendedAction, "move_to_closing");
  assert.equal(assessment.opportunityState, "closing");
});
