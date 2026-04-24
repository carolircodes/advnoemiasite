import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildPaymentTransitionKey,
  canApplyPaymentTransition,
  getPersistedFinancialState,
  mapFinancialStateToCommercialPaymentState,
  mapMercadoPagoStatusToFinancialState,
  pickCanonicalPaymentRecord,
  resolvePaymentOrigin
} from "../lib/payment/payment-workflow.ts";

test("payment workflow mapeia status do Mercado Pago para estados financeiros canônicos", () => {
  assert.equal(
    mapMercadoPagoStatusToFinancialState({ status: "approved", status_detail: "accredited" }),
    "approved"
  );
  assert.equal(
    mapMercadoPagoStatusToFinancialState({ status: "rejected", status_detail: "expired_card" }),
    "expired"
  );
  assert.equal(
    mapMercadoPagoStatusToFinancialState({ status: "cancelled", status_detail: "by_collector" }),
    "cancelled"
  );
  assert.equal(
    mapMercadoPagoStatusToFinancialState({ status: "charged_back", status_detail: "chargeback" }),
    "charged_back"
  );
});

test("payment workflow bloqueia regressao fora de ordem apos aprovacao", () => {
  assert.equal(
    canApplyPaymentTransition({ currentState: "approved", nextState: "pending" }),
    false
  );
  assert.equal(
    canApplyPaymentTransition({ currentState: "approved", nextState: "failed" }),
    false
  );
  assert.equal(
    canApplyPaymentTransition({ currentState: "approved", nextState: "charged_back" }),
    true
  );
});

test("payment workflow permite recuperacao controlada de falha para aprovacao", () => {
  assert.equal(
    canApplyPaymentTransition({ currentState: "failed", nextState: "approved" }),
    true
  );
  assert.equal(
    canApplyPaymentTransition({ currentState: "expired", nextState: "approved" }),
    false
  );
});

test("payment workflow escolhe o registro canônico por external_reference e preserva lead ativo", () => {
  const selected = pickCanonicalPaymentRecord(
    [
      {
        id: "old",
        status: "pending",
        financial_state: "pending",
        active_for_lead: false,
        metadata: {
          external_reference: "offer_old_123_1"
        }
      },
      {
        id: "current",
        status: "pending",
        financial_state: "pending",
        active_for_lead: true,
        external_reference: "offer_new_123_2",
        metadata: {}
      }
    ],
    {
      externalReference: "offer_new_123_2",
      providerPaymentId: "999"
    }
  );

  assert.equal(selected?.id, "current");
});

test("payment workflow projeta estado comercial e origem da cobranca com semântica explícita", () => {
  assert.equal(mapFinancialStateToCommercialPaymentState("approved"), "approved");
  assert.equal(mapFinancialStateToCommercialPaymentState("charged_back"), "failed");

  const origin = resolvePaymentOrigin({
    accessActor: "internal-secret",
    monetizationSource: "whatsapp",
    metadata: {
      channel: "whatsapp"
    },
    userId: "5511999999999"
  });

  assert.equal(origin.originType, "channel_automation");
  assert.equal(origin.originSource, "whatsapp");
  assert.equal(origin.originActorId, "5511999999999");
});

test("payment workflow persiste trilha financeira prioritariamente por financial_state", () => {
  assert.equal(
    getPersistedFinancialState({
      id: "payment-1",
      status: "rejected",
      financial_state: "approved"
    }),
    "approved"
  );
});

test("payment workflow nao recai para status legado quando financial_state esta ausente", () => {
  assert.equal(
    getPersistedFinancialState({
      id: "payment-2",
      status: "approved",
      financial_state: null
    }),
    "pending"
  );
});

test("phase 5 migration registra trilha auditável e source of truth financeiro", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260422160000_phase5_payment_reliability.sql"
  );
  const documentPath = path.join(process.cwd(), "docs", "PAYMENT_WORKFLOW.md");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const document = fs.readFileSync(documentPath, "utf8");

  assert.equal(migration.includes("add column if not exists financial_state"), true);
  assert.equal(migration.includes("create table if not exists public.payment_events"), true);
  assert.equal(migration.includes("payment_events_transition_key_idx"), true);
  assert.equal(document.includes("financial_state"), true);
  assert.equal(document.includes("active_for_lead"), true);
  assert.equal(
    buildPaymentTransitionKey({
      paymentId: "payment-1",
      providerPaymentId: "mp-1",
      financialState: "approved",
      stage: "webhook"
    }),
    "webhook:payment-1:mp-1:approved"
  );
});
