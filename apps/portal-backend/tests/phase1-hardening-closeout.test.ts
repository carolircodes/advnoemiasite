import test from "node:test";
import assert from "node:assert/strict";

import {
  assertRouteSecret,
  hasInternalServiceSecretAccess
} from "../lib/http/route-secret.ts";
import { buildPublicPaymentPayload } from "../lib/payment/public-payment-payload.ts";

function withEnv(
  updates: Record<string, string | undefined>,
  callback: () => void | Promise<void>
) {
  const previousEntries = Object.entries(updates).map(([key]) => [key, process.env[key]] as const);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key, value] of previousEntries) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = callback();

    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(restore);
    }

    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("route secret helper allows localhost fallback only in non-production", () => {
  return withEnv({ NODE_ENV: "development" }, () => {
    const result = assertRouteSecret({
      request: new Request("http://127.0.0.1:3000/api/test"),
      expectedSecret: undefined,
      secretName: "EXAMPLE_SECRET",
      errorMessage: "unauthorized",
      allowLocalWithoutSecret: true
    });

    assert.deepEqual(result, { ok: true, source: "local-dev" });
  });
});

test("route secret helper fails closed when secret is missing outside local dev", () => {
  return withEnv({ NODE_ENV: "production" }, () => {
    const result = assertRouteSecret({
      request: new Request("http://127.0.0.1:3000/api/test"),
      expectedSecret: undefined,
      secretName: "EXAMPLE_SECRET",
      errorMessage: "unauthorized",
      allowLocalWithoutSecret: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
  });
});

test("route secret helper rejects wrong secrets and accepts header/query matches", () => {
  const wrong = assertRouteSecret({
    request: new Request("https://portal.advnoemia.com.br/api/test", {
      headers: {
        authorization: "Bearer wrong-secret"
      }
    }),
    expectedSecret: "expected-secret",
    secretName: "EXAMPLE_SECRET",
    errorMessage: "unauthorized"
  });

  assert.equal(wrong.ok, false);
  assert.equal(wrong.status, 401);

  const viaHeader = assertRouteSecret({
    request: new Request("https://portal.advnoemia.com.br/api/test", {
      headers: {
        "x-example-secret": "expected-secret"
      }
    }),
    expectedSecret: "expected-secret",
    secretName: "EXAMPLE_SECRET",
    errorMessage: "unauthorized",
    headerNames: ["x-example-secret"]
  });

  assert.deepEqual(viaHeader, { ok: true, source: "header" });

  const viaQuery = assertRouteSecret({
    request: new Request("https://portal.advnoemia.com.br/api/test?secret=expected-secret"),
    expectedSecret: "expected-secret",
    secretName: "EXAMPLE_SECRET",
    errorMessage: "unauthorized",
    queryParamNames: ["secret"]
  });

  assert.deepEqual(viaQuery, { ok: true, source: "query" });
});

test("telegram webhook guard accepts Telegram's official secret header", () => {
  const result = assertRouteSecret({
    request: new Request("https://portal.advnoemia.com.br/api/telegram/webhook", {
      headers: {
        "x-telegram-bot-api-secret-token": "telegram-secret"
      }
    }),
    expectedSecret: "telegram-secret",
    secretName: "TELEGRAM_WEBHOOK_SECRET",
    errorMessage: "Webhook do Telegram nao autorizado.",
    headerNames: ["x-telegram-bot-api-secret-token", "x-telegram-webhook-secret"]
  });

  assert.deepEqual(result, { ok: true, source: "header" });
});

test("internal service secret helper only grants access with the configured secret", () => {
  return withEnv({ INTERNAL_API_SECRET: "internal-secret" }, () => {
    const denied = hasInternalServiceSecretAccess(
      new Request("https://portal.advnoemia.com.br/api/internal/test", {
        headers: {
          "x-internal-api-secret": "wrong-secret"
        }
      })
    );

    const allowed = hasInternalServiceSecretAccess(
      new Request("https://portal.advnoemia.com.br/api/internal/test", {
        headers: {
          "x-internal-api-secret": "internal-secret"
        }
      })
    );

    assert.equal(denied, false);
    assert.equal(allowed, true);
  });
});

test("public payment payload stays restricted to the safe fields needed by return pages", () => {
  const payload = buildPublicPaymentPayload({
    id: "payment-row-id",
    status: "approved",
    amount: 297,
    payment_url: "https://example.com/pay",
    external_id: "mp-123",
    metadata: {
      offer_code: "consultation_initial",
      offer_name: "Consulta estrategica inicial",
      offer_kind: "consultation",
      payer_email: "private@example.com",
      lead_id: "lead-123"
    },
    created_at: "2026-04-17T10:00:00.000Z",
    updated_at: "2026-04-17T10:05:00.000Z"
  });

  assert.deepEqual(payload, {
    id: "payment-row-id",
    status: "approved",
    amount: 297,
    payment_url: "https://example.com/pay",
    external_id: "mp-123",
    metadata: {
      offer_code: "consultation_initial",
      offer_name: "Consulta estrategica inicial",
      offer_kind: "consultation"
    },
    created_at: "2026-04-17T10:00:00.000Z",
    updated_at: "2026-04-17T10:05:00.000Z"
  });

  assert.equal("payer_email" in payload.metadata, false);
  assert.equal("lead_id" in payload.metadata, false);
  assert.equal("price_source" in payload, false);
  assert.equal("base_amount_cents" in payload, false);
});
