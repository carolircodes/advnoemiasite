import test from "node:test";
import assert from "node:assert/strict";

import {
  requireRouteSecretOrStaffAccess,
  requireStaffRouteAccess
} from "../lib/auth/api-authorization.ts";
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  resetRateLimitStore
} from "../lib/http/request-guards.ts";
import { buildSafePaymentMetadata } from "../lib/payment/payment-security.ts";

test("staff route access returns the authenticated internal profile", async () => {
  const access = await requireStaffRouteAccess({
    service: "test_service",
    action: "list",
    resolveStaffAccess: async () => ({
      ok: true,
      profile: {
        id: "staff-1",
        email: "staff@example.com",
        full_name: "Equipe Interna",
        phone: null,
        role: "admin",
        is_active: true,
        invited_at: null,
        first_login_completed_at: null
      }
    })
  });

  assert.equal(access.ok, true);
  assert.equal(access.actor, "staff");
  if (access.ok && access.actor === "staff") {
    assert.equal(access.profile.id, "staff-1");
  }
});

test("route secret access accepts the configured secret header", async () => {
  const access = await requireRouteSecretOrStaffAccess({
    request: new Request("https://portal.advnoemia.com.br/api/internal/test", {
      headers: {
        "x-internal-api-secret": "expected-secret"
      }
    }),
    service: "test_service",
    action: "write",
    expectedSecret: "expected-secret",
    secretName: "INTERNAL_API_SECRET",
    errorMessage: "unauthorized",
    headerNames: ["x-internal-api-secret"]
  });

  assert.deepEqual(access, {
    ok: true,
    actor: "internal-secret",
    secretName: "INTERNAL_API_SECRET",
    source: "header"
  });
});

test("route secret access can fall back to a staff session", async () => {
  const access = await requireRouteSecretOrStaffAccess({
    request: new Request("https://portal.advnoemia.com.br/api/internal/test", {
      headers: {
        "x-internal-api-secret": "wrong-secret"
      }
    }),
    service: "test_service",
    action: "write",
    expectedSecret: "expected-secret",
    secretName: "INTERNAL_API_SECRET",
    errorMessage: "unauthorized",
    headerNames: ["x-internal-api-secret"],
    allowStaffFallback: true,
    resolveStaffAccess: async () => ({
      ok: true,
      profile: {
        id: "staff-2",
        email: "staff@example.com",
        full_name: "Equipe Interna",
        phone: null,
        role: "advogada",
        is_active: true,
        invited_at: null,
        first_login_completed_at: null
      }
    })
  });

  assert.equal(access.ok, true);
  assert.equal(access.actor, "staff");
});

test("payment metadata sanitizer keeps only safe non-reserved fields", () => {
  const sanitized = buildSafePaymentMetadata({
    lead_id: "should-not-leak",
    user_id: "should-not-leak",
    custom_note: "  observacao segura  ",
    nested: {
      referral: "campaign-123",
      token: "user-controlled-but-not-secret-env"
    },
    items: ["a", "b", { step: "checkout" }]
  });

  assert.deepEqual(sanitized, {
    custom_note: "observacao segura",
    nested: {
      referral: "campaign-123",
      token: "user-controlled-but-not-secret-env"
    },
    items: ["a", "b", { step: "checkout" }]
  });
  assert.equal("lead_id" in sanitized, false);
  assert.equal("user_id" in sanitized, false);
});

test("rate limiter blocks after the configured burst and exposes retry headers", () => {
  resetRateLimitStore();

  const first = consumeRateLimit({
    bucket: "phase2-test",
    key: "client-a",
    limit: 2,
    windowMs: 60_000
  });
  const second = consumeRateLimit({
    bucket: "phase2-test",
    key: "client-a",
    limit: 2,
    windowMs: 60_000
  });
  const blocked = consumeRateLimit({
    bucket: "phase2-test",
    key: "client-a",
    limit: 2,
    windowMs: 60_000
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);

  const headers = buildRateLimitHeaders(blocked);
  assert.equal(headers["X-RateLimit-Limit"], "2");
  assert.equal(headers["X-RateLimit-Remaining"], "0");
  assert.match(headers["Retry-After"], /^[1-9][0-9]*$/);
});
