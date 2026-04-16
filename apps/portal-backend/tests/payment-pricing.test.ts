import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSULTATION_ONLINE_AMOUNT_CENTS,
  buildCheckoutPaymentMethods,
  resolvePaymentPricing
} from "../lib/payment/pricing.ts";

test("ignora override para remetente comum pedindo link de 5 reais", () => {
  const pricing = resolvePaymentPricing({
    offerCode: "consultation_initial",
    offerDefaultAmount: 297,
    requesterPhone: "5588999999999",
    originalMessage: "me manda um link de 5 reais"
  });

  assert.equal(pricing.finalAmountCents, CONSULTATION_ONLINE_AMOUNT_CENTS);
  assert.equal(pricing.priceSource, "default_consultation");
});

test("permite override para o numero da advogada pedindo link de 5 reais", () => {
  const pricing = resolvePaymentPricing({
    offerCode: "consultation_initial",
    offerDefaultAmount: 297,
    requesterPhone: "5584998566004",
    originalMessage: "me manda um link de 5 reais"
  });

  assert.equal(pricing.finalAmountCents, 500);
  assert.equal(pricing.priceSource, "owner_test_override");
});

test("permite override para o numero da advogada com valor decimal explicito", () => {
  const pricing = resolvePaymentPricing({
    offerCode: "consultation_initial",
    offerDefaultAmount: 297,
    requesterPhone: "5584998566004",
    originalMessage: "quero um link teste de 12,90"
  });

  assert.equal(pricing.finalAmountCents, 1290);
  assert.equal(pricing.priceSource, "owner_test_override");
});

test("usa consulta padrao quando a advogada pede algo generico sem valor", () => {
  const pricing = resolvePaymentPricing({
    offerCode: "consultation_initial",
    offerDefaultAmount: 297,
    requesterPhone: "5584998566004",
    originalMessage: "me manda o link da consulta"
  });

  assert.equal(pricing.finalAmountCents, CONSULTATION_ONLINE_AMOUNT_CENTS);
  assert.equal(pricing.priceSource, "default_consultation");
});

test("usa consulta padrao para usuario comum pedindo consulta", () => {
  const pricing = resolvePaymentPricing({
    offerCode: "consultation_initial",
    offerDefaultAmount: 297,
    requesterPhone: "5588999999999",
    originalMessage: "quero pagar a consulta"
  });

  assert.equal(pricing.finalAmountCents, CONSULTATION_ONLINE_AMOUNT_CENTS);
  assert.equal(pricing.priceSource, "default_consultation");
});

test("checkout geral nao fica preso a pix e mantem parcelamento", () => {
  const paymentMethods = buildCheckoutPaymentMethods();

  assert.equal(paymentMethods.installments, 12);
  assert.equal(paymentMethods.default_installments, 1);
  assert.equal("default_payment_method_id" in paymentMethods, false);
  assert.equal("excluded_payment_types" in paymentMethods, false);
});
