import test from "node:test";
import assert from "node:assert/strict";

import {
  buildIdempotencyFingerprint,
  claimDurableIdempotencyKey,
  consumeDurableRateLimit,
  getDurableProtectionStatus
} from "../lib/http/durable-abuse-protection.ts";
import { resetRateLimitStore } from "../lib/http/request-guards.ts";
import { classifyNotificationError } from "../lib/services/notification-error-classification.ts";

test("durable rate limiter honors a cross-instance bucket decision", async () => {
  const result = await consumeDurableRateLimit(
    {
      bucket: "phase3-payment-create",
      key: "client-a",
      limit: 2,
      windowMs: 60_000
    },
    {
      async claimRateLimitBucket() {
        return {
          current_count: 3,
          reset_at: new Date(Date.now() + 60_000).toISOString(),
          retry_after_seconds: 60
        };
      },
      async insertIdempotencyRecord() {
        throw new Error("not-used");
      },
      async getIdempotencyRecord() {
        return null;
      },
      async updateIdempotencyRecord() {
        return null;
      },
      async getDurableStatus() {
        return {
          provider: "supabase-postgres" as const,
          available: true,
          rateLimits: true,
          idempotency: true
        };
      }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.mode, "durable");
  assert.equal(result.remaining, 0);
  assert.equal(result.retryAfterSeconds, 60);
});

test("durable rate limiter falls back to in-memory protection when storage is unavailable", async () => {
  resetRateLimitStore();

  const first = await consumeDurableRateLimit(
    {
      bucket: "phase3-fallback",
      key: "client-b",
      limit: 1,
      windowMs: 60_000
    },
    {
      async claimRateLimitBucket() {
        throw new Error("database unavailable");
      },
      async insertIdempotencyRecord() {
        throw new Error("not-used");
      },
      async getIdempotencyRecord() {
        return null;
      },
      async updateIdempotencyRecord() {
        return null;
      },
      async getDurableStatus() {
        return {
          provider: "supabase-postgres" as const,
          available: false,
          rateLimits: false,
          idempotency: false
        };
      }
    }
  );

  const second = await consumeDurableRateLimit(
    {
      bucket: "phase3-fallback",
      key: "client-b",
      limit: 1,
      windowMs: 60_000
    },
    {
      async claimRateLimitBucket() {
        throw new Error("database unavailable");
      },
      async insertIdempotencyRecord() {
        throw new Error("not-used");
      },
      async getIdempotencyRecord() {
        return null;
      },
      async updateIdempotencyRecord() {
        return null;
      },
      async getDurableStatus() {
        return {
          provider: "supabase-postgres" as const,
          available: false,
          rateLimits: false,
          idempotency: false
        };
      }
    }
  );

  assert.equal(first.ok, true);
  assert.equal(first.mode, "memory-fallback");
  assert.equal(second.ok, false);
});

test("durable idempotency replays a completed response for the same request fingerprint", async () => {
  const key = "lead-1:offer-a";
  const requestFingerprint = buildIdempotencyFingerprint(["lead-1", "offer-a", 10000]);

  const result = await claimDurableIdempotencyKey(
    {
      scope: "payment-create",
      key,
      requestFingerprint,
      ttlMs: 60_000
    },
    {
      async claimRateLimitBucket() {
        throw new Error("not-used");
      },
      async insertIdempotencyRecord() {
        const duplicate = new Error("duplicate");
        (duplicate as Error & { code?: string }).code = "23505";
        throw duplicate;
      },
      async getIdempotencyRecord() {
        return {
          scope: "payment-create",
          key_hash: "key-hash",
          request_fingerprint: requestFingerprint,
          status: "completed" as const,
          resource_id: "payment-123",
          response_payload: {
            success: true,
            paymentId: "payment-123"
          },
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          updated_at: new Date().toISOString()
        };
      },
      async updateIdempotencyRecord() {
        return null;
      },
      async getDurableStatus() {
        return {
          provider: "supabase-postgres" as const,
          available: true,
          rateLimits: true,
          idempotency: true
        };
      }
    }
  );

  assert.equal(result.ok, true);
  if (result.ok && result.status === "replay") {
    assert.equal(result.responsePayload.paymentId, "payment-123");
  } else {
    assert.fail("expected a replay result");
  }
});

test("durable idempotency blocks conflicting in-flight requests", async () => {
  const result = await claimDurableIdempotencyKey(
    {
      scope: "payment-create",
      key: "lead-2:offer-b",
      requestFingerprint: "fingerprint-a",
      ttlMs: 60_000
    },
    {
      async claimRateLimitBucket() {
        throw new Error("not-used");
      },
      async insertIdempotencyRecord() {
        const duplicate = new Error("duplicate");
        (duplicate as Error & { code?: string }).code = "23505";
        throw duplicate;
      },
      async getIdempotencyRecord() {
        return {
          scope: "payment-create",
          key_hash: "key-hash",
          request_fingerprint: "fingerprint-b",
          status: "pending" as const,
          resource_id: null,
          response_payload: null,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          updated_at: new Date().toISOString()
        };
      },
      async updateIdempotencyRecord() {
        return null;
      },
      async getDurableStatus() {
        return {
          provider: "supabase-postgres" as const,
          available: true,
          rateLimits: true,
          idempotency: true
        };
      }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "conflict");
  assert.match(String(result.retryAfterSeconds), /^[1-9][0-9]*$/);
});

test("notification error classification distinguishes database and provider failures", () => {
  assert.equal(
    classifyNotificationError(new Error("column client_pipeline does not exist")),
    "database"
  );
  assert.equal(
    classifyNotificationError(new Error("Resend provider returned 429")),
    "provider"
  );
  assert.equal(
    classifyNotificationError(new Error("unsupported channel noemia")),
    "unsupported"
  );
});

test("durable protection status reports unavailable storage without leaking internals", async () => {
  const status = await getDurableProtectionStatus({
    async claimRateLimitBucket() {
      throw new Error("not-used");
    },
    async insertIdempotencyRecord() {
      throw new Error("not-used");
    },
    async getIdempotencyRecord() {
      return null;
    },
    async updateIdempotencyRecord() {
      return null;
    },
    async getDurableStatus() {
      throw new Error("schema missing");
    }
  });

  assert.equal(status.available, false);
  assert.equal(status.rateLimits, false);
  assert.equal(status.idempotency, false);
});
