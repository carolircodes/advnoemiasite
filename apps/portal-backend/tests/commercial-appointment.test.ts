import test from "node:test";
import assert from "node:assert/strict";

import { evaluateFormalAppointmentRule } from "../lib/services/commercial-appointment-rule.ts";

test("cenario A: consulta proposta com horario em negociacao ainda nao cria appointment", () => {
  const result = evaluateFormalAppointmentRule({
    ownerProfileId: "8fb5fcb4-2dcf-4f07-8f17-4a0fb1e8b00a",
    schedulingState: "collecting_availability",
    paymentState: "not_started"
  });

  assert.equal(result.appointmentState, "not_created");
  assert.equal(result.shouldCreateAppointment, false);
});

test("cenario B: horario confirmado e pagamento pendente deixa consulta preconfirmada", () => {
  const result = evaluateFormalAppointmentRule({
    ownerProfileId: "8fb5fcb4-2dcf-4f07-8f17-4a0fb1e8b00a",
    schedulingState: "confirmed",
    scheduleConfirmedAt: "2026-04-16T13:00:00.000Z",
    paymentState: "pending"
  });

  assert.equal(result.appointmentState, "preconfirmed");
  assert.equal(result.shouldCreateAppointment, false);
});

test("cenario C: pagamento aprovado com horario confirmado cria appointment formal", () => {
  const result = evaluateFormalAppointmentRule({
    ownerProfileId: "8fb5fcb4-2dcf-4f07-8f17-4a0fb1e8b00a",
    schedulingState: "confirmed",
    scheduleConfirmedAt: "2026-04-16T13:00:00.000Z",
    paymentState: "approved",
    paymentApprovedAt: "2026-04-15T18:20:00.000Z"
  });

  assert.equal(result.appointmentState, "confirmed");
  assert.equal(result.shouldCreateAppointment, true);
  assert.equal(result.shouldConfirmConsultation, true);
});

test("cenario D: falha de pagamento mantem appointment fora da formalizacao", () => {
  const result = evaluateFormalAppointmentRule({
    ownerProfileId: "8fb5fcb4-2dcf-4f07-8f17-4a0fb1e8b00a",
    schedulingState: "confirmed",
    scheduleConfirmedAt: "2026-04-16T13:00:00.000Z",
    paymentState: "failed"
  });

  assert.equal(result.appointmentState, "preconfirmed");
  assert.equal(result.shouldCreateAppointment, false);
});

test("cenario E: pagamento recuperado depois do travamento volta a permitir confirmacao formal", () => {
  const result = evaluateFormalAppointmentRule({
    ownerProfileId: "8fb5fcb4-2dcf-4f07-8f17-4a0fb1e8b00a",
    schedulingState: "confirmed",
    scheduleConfirmedAt: "2026-04-18T10:30:00.000Z",
    paymentState: "approved",
    paymentApprovedAt: "2026-04-16T10:00:00.000Z"
  });

  assert.equal(result.appointmentState, "confirmed");
  assert.equal(result.shouldCreateAppointment, true);
});
