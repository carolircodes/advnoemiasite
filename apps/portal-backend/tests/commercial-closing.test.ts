import test from "node:test";
import assert from "node:assert/strict";

import { evaluateCommercialClosing } from "../lib/services/commercial-closing.ts";

test("cenario A: lead maduro vira proposta enviada e aguardando resposta", () => {
  const assessment = evaluateCommercialClosing({
    pipelineStage: "consultation_offered",
    consultationReadiness: "ready_for_consultation",
    consultationRecommendationState: "recommend_now",
    consultationOfferState: "offered",
    consultationOfferSentAt: "2026-04-15T12:00:00.000Z",
    consultationOfferReason: "Lead pediu proximo passo para consulta.",
    latestSummary: "Lead maduro, proposta enviada e aguardando retorno."
  });

  assert.equal(assessment.consultationOfferState, "offered");
  assert.equal(assessment.closingState, "proposal_sent");
  assert.equal(assessment.closingRecommendedAction, "collect_schedule_preferences");
});

test("cenario B: consulta proposta com horario sugerido aguarda confirmacao", () => {
  const assessment = evaluateCommercialClosing({
    pipelineStage: "consultation_offered",
    consultationOfferState: "awaiting_schedule",
    schedulingState: "slot_suggested",
    schedulingSuggestedAt: "2026-04-16T15:00:00.000Z",
    desiredScheduleWindow: "quinta a tarde"
  });

  assert.equal(assessment.schedulingState, "slot_suggested");
  assert.equal(assessment.closingState, "scheduling_in_progress");
  assert.equal(assessment.closingRecommendedAction, "confirm_internal_schedule");
});

test("cenario C: pagamento pendente recebe follow-up coerente", () => {
  const assessment = evaluateCommercialClosing({
    pipelineStage: "proposal_sent",
    consultationOfferState: "awaiting_schedule",
    schedulingState: "confirmed",
    scheduleConfirmedAt: "2026-04-16T15:00:00.000Z",
    paymentState: "pending",
    paymentLinkSentAt: "2026-04-15T16:00:00.000Z",
    paymentLinkUrl: "https://checkout.exemplo/pagamento"
  });

  assert.equal(assessment.paymentState, "pending");
  assert.equal(assessment.closingState, "payment_in_progress");
  assert.equal(assessment.closingRecommendedAction, "follow_up_payment");
});

test("cenario D: pagamento aprovado com horario confirmado vira consulta confirmada", () => {
  const assessment = evaluateCommercialClosing({
    pipelineStage: "consultation_scheduled",
    consultationOfferState: "awaiting_schedule",
    schedulingState: "confirmed",
    scheduleConfirmedAt: "2026-04-16T15:00:00.000Z",
    paymentState: "approved",
    paymentApprovedAt: "2026-04-15T17:00:00.000Z",
    consultationConfirmedAt: "2026-04-15T17:05:00.000Z"
  });

  assert.equal(assessment.closingState, "consultation_confirmed");
  assert.equal(assessment.closingRecommendedAction, "confirm_consultation");
  assert.equal(assessment.consultationOfferState, "confirmed");
});

test("cenario E: objecao de valor ou silencio gera bloqueio e reativacao coerente", () => {
  const valueAssessment = evaluateCommercialClosing({
    consultationReadiness: "blocked_by_objection",
    blockingReason: "objection_value",
    objectionState: "value"
  });
  const silentAssessment = evaluateCommercialClosing({
    consultationOfferState: "offered",
    blockingReason: "lead_silent",
    consultationReadiness: "blocked_by_silence"
  });

  assert.equal(valueAssessment.closingState, "blocked");
  assert.equal(valueAssessment.closingBlockReason, "objection_value");
  assert.equal(silentAssessment.closingState, "reactivable");
  assert.equal(silentAssessment.closingRecommendedAction, "reactivate_closing");
});
