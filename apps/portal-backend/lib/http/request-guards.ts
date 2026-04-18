import { createHash } from "crypto";

import type { ZodType } from "zod";

import { extractValidationDetails, jsonError } from "./api-response.ts";

type JsonParseOptions = {
  invalidJsonError?: string;
  invalidBodyError?: string;
  includeValidationDetails?: boolean;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __advnoemiaRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__advnoemiaRateLimitStore) {
    globalThis.__advnoemiaRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return globalThis.__advnoemiaRateLimitStore;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function buildRequestFingerprint(request: Request, scope: string) {
  const source = [
    scope,
    getClientIp(request),
    request.headers.get("user-agent") || "unknown",
    request.url
  ].join("|");

  return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

export async function parseJsonBody<TSchema extends ZodType>(
  request: Request,
  schema: TSchema,
  options: JsonParseOptions = {}
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      ok: false as const,
      response: jsonError(
        options.invalidJsonError || "invalid_json",
        400
      )
    };
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: jsonError(
        options.invalidBodyError || "invalid_request",
        400,
        options.includeValidationDetails
          ? { details: extractValidationDetails(parsed.error) }
          : undefined
      )
    };
  }

  return {
    ok: true as const,
    data: parsed.data
  };
}

export function consumeRateLimit(options: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const store = getRateLimitStore();
  const bucketKey = `${options.bucket}:${options.key}`;
  const now = Date.now();
  const existing = store.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    store.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs
    });

    return {
      ok: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000)
    };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      limit: options.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1)
    };
  }

  existing.count += 1;
  store.set(bucketKey, existing);

  return {
    ok: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1)
  };
}

export function buildRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "Retry-After": String(result.retryAfterSeconds)
  };
}

export function resetRateLimitStore() {
  getRateLimitStore().clear();
}
