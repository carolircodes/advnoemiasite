import assert from "node:assert/strict";
import test from "node:test";

import { categorizeObservedError } from "../lib/observability/error-categorization.ts";
import {
  logObservedRequest,
  startRequestObservation
} from "../lib/observability/request-observability.ts";

test("phase 14 request observability promotes flow, outcome and categories to top-level fields", () => {
  const request = new Request("https://portal.advnoemia.com.br/api/payment/create", {
    method: "POST",
    headers: {
      "x-request-id": "phase14-request-id"
    }
  });
  const observation = startRequestObservation(request, {
    flow: "payment_create",
    provider: "mercado_pago"
  });

  let captured = "";
  const originalLog = console.log;
  console.log = (value?: unknown) => {
    captured = String(value ?? "");
  };

  try {
    logObservedRequest("error", "PAYMENT_CREATE_FAILED", observation, {
      outcome: "failed",
      status: 500,
      errorCategory: "provider",
      leadId: "lead_123"
    }, new Error("Mercado Pago timeout"));
  } finally {
    console.log = originalLog;
  }

  const payload = JSON.parse(captured) as Record<string, unknown>;

  assert.equal(payload.requestId, "phase14-request-id");
  assert.equal(payload.flow, "payment_create");
  assert.equal(payload.provider, "mercado_pago");
  assert.equal(payload.outcome, "failed");
  assert.equal(payload.status, 500);
  assert.equal(payload.errorCategory, "provider");
  assert.equal((payload.metadata as Record<string, unknown>).leadId, "lead_123");
});

test("phase 14 categorizes operational errors into operator-meaningful buckets", () => {
  assert.equal(
    categorizeObservedError(new Error("MERCADO_PAGO token missing"), "internal"),
    "authentication"
  );
  assert.equal(
    categorizeObservedError(new Error("durable protection temporarily unavailable"), "internal"),
    "fallback"
  );
  assert.equal(
    categorizeObservedError(new Error("invalid request body"), "validation"),
    "validation"
  );
});
