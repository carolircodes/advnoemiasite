import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRevenuePaymentRows } from "../lib/services/revenue-intelligence-shared.ts";

test("legacy payments rows keep revenue intelligence operational without financial_state", () => {
  const normalized = normalizeRevenuePaymentRows([
    {
      id: "payment-1",
      lead_id: "lead-1",
      user_id: "user-1",
      external_id: "ext-1",
      amount: 390,
      status: "approved",
      created_at: "2026-04-24T12:00:00.000Z",
      updated_at: "2026-04-24T12:05:00.000Z",
      approved_at: "2026-04-24T12:04:00.000Z",
      rejected_at: null,
      metadata: {
        offer_code: "consultation_initial",
        price_source: "legacy_checkout"
      },
      status_detail: "approved by provider"
    }
  ]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].financial_state, null);
  assert.equal(normalized[0].price_source, "legacy_checkout");
  assert.equal(normalized[0].base_amount_cents, null);
  assert.equal(normalized[0].final_amount_cents, null);
});
