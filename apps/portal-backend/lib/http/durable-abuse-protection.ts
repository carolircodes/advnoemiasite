import { createHash } from "crypto";

import { buildRateLimitHeaders, consumeRateLimit } from "./request-guards.ts";

type DurableRateLimitPayload = {
  current_count: number;
  reset_at: string;
  retry_after_seconds: number;
};

type DurableRateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
};

type DurableRateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  mode: "durable" | "memory-fallback";
};

type IdempotencyRecord = {
  scope: string;
  key_hash: string;
  request_fingerprint: string;
  status: "pending" | "completed" | "failed";
  resource_id: string | null;
  response_payload: Record<string, unknown> | null;
  expires_at: string;
  updated_at: string;
};

type DurableProtectionAdapter = {
  claimRateLimitBucket(input: {
    scope: string;
    keyHash: string;
    limit: number;
    windowSeconds: number;
  }): Promise<DurableRateLimitPayload>;
  insertIdempotencyRecord(record: {
    scope: string;
    keyHash: string;
    requestFingerprint: string;
    expiresAt: string;
  }): Promise<IdempotencyRecord>;
  getIdempotencyRecord(scope: string, keyHash: string): Promise<IdempotencyRecord | null>;
  updateIdempotencyRecord(input: {
    scope: string;
    keyHash: string;
    requestFingerprint?: string;
    fromStatus?: "pending" | "completed" | "failed";
    toStatus: "pending" | "completed" | "failed";
    expiresAt: string;
    responsePayload?: Record<string, unknown> | null;
    resourceId?: string | null;
  }): Promise<IdempotencyRecord | null>;
  getDurableStatus(): Promise<{
    provider: "supabase-postgres";
    available: boolean;
    rateLimits: boolean;
    idempotency: boolean;
    rateLimitRpc?: boolean;
  }>;
};

type DurableFallbackReason = "migration_missing_or_unapplied" | "storage_unavailable";

type DurableFallbackState = {
  count: number;
  lastFallbackAt: string | null;
  lastFallbackReason: DurableFallbackReason | null;
  buckets: Set<string>;
  warnedMissingMigration: boolean;
};

const DURABLE_FALLBACK_STATE: DurableFallbackState = {
  count: 0,
  lastFallbackAt: null,
  lastFallbackReason: null,
  buckets: new Set<string>(),
  warnedMissingMigration: false
};

const DURABLE_PROTECTED_FLOWS = [
  {
    flow: "lead_create",
    bucket: "lead-create",
    protections: ["rate_limit"] as const
  },
  {
    flow: "public_events",
    bucket: "public-events",
    protections: ["rate_limit"] as const
  },
  {
    flow: "public_triage",
    bucket: "public-triage",
    protections: ["rate_limit"] as const
  },
  {
    flow: "noemia_chat",
    bucket: "noemia-chat",
    protections: ["rate_limit"] as const
  },
  {
    flow: "payment_create",
    bucket: "payment-create",
    protections: ["rate_limit", "idempotency"] as const
  },
  {
    flow: "payment_status",
    bucket: "payment-status",
    protections: ["rate_limit"] as const
  }
] as const;

type ClaimIdempotencyOptions = {
  scope: string;
  key: string;
  requestFingerprint: string;
  ttlMs: number;
};

type ClaimIdempotencyResult =
  | {
      ok: true;
      status: "claimed";
      keyHash: string;
    }
  | {
      ok: true;
      status: "replay";
      keyHash: string;
      responsePayload: Record<string, unknown>;
      resourceId: string | null;
    }
  | {
      ok: false;
      status: "in-progress" | "conflict";
      keyHash: string;
      retryAfterSeconds: number;
    };

type FinalizeIdempotencyOptions = {
  scope: string;
  keyHash: string;
  requestFingerprint: string;
  responsePayload: Record<string, unknown>;
  resourceId?: string | null;
  retentionMs?: number;
};

type FailIdempotencyOptions = {
  scope: string;
  keyHash: string;
  requestFingerprint: string;
  error: string;
  retryAfterMs?: number;
};

function hashAbuseKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function readBooleanLikeEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeWindowSeconds(windowMs: number) {
  return Math.max(1, Math.ceil(windowMs / 1000));
}

function normalizeRateLimitPayload(
  payload: DurableRateLimitPayload,
  limit: number
): DurableRateLimitResult {
  const remaining = Math.max(limit - Math.min(payload.current_count, limit), 0);

  return {
    ok: payload.current_count <= limit,
    limit,
    remaining,
    retryAfterSeconds: Math.max(payload.retry_after_seconds, 1),
    mode: "durable"
  };
}

function inferRetryAfterSeconds(expiresAt: string) {
  const deltaSeconds = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(deltaSeconds, 1);
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "23505";
}

function createSupabaseAdapter(): DurableProtectionAdapter {
  return {
    async claimRateLimitBucket(input) {
      const supabase = await loadAdminSupabaseClient();
      const { data, error } = await supabase.rpc("claim_rate_limit_bucket", {
        p_scope: input.scope,
        p_key_hash: input.keyHash,
        p_limit: input.limit,
        p_window_seconds: input.windowSeconds
      });

      if (error) {
        throw new Error(error.message || "durable_rate_limit_rpc_failed");
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        throw new Error("durable_rate_limit_rpc_empty");
      }

      return {
        current_count:
          typeof row.current_count === "number" ? row.current_count : Number(row.current_count || 0),
        reset_at: String(row.reset_at),
        retry_after_seconds:
          typeof row.retry_after_seconds === "number"
            ? row.retry_after_seconds
            : Number(row.retry_after_seconds || 1)
      };
    },
    async insertIdempotencyRecord(record) {
      const supabase = await loadAdminSupabaseClient();
      const { data, error } = await supabase
        .from("idempotency_keys")
        .insert({
          scope: record.scope,
          key_hash: record.keyHash,
          request_fingerprint: record.requestFingerprint,
          status: "pending",
          expires_at: record.expiresAt,
          response_payload: null,
          resource_id: null,
          last_seen_at: new Date().toISOString()
        })
        .select(
          "scope,key_hash,request_fingerprint,status,resource_id,response_payload,expires_at,updated_at"
        )
        .single();

      if (error || !data) {
        throw error || new Error("idempotency_insert_failed");
      }

      return data as IdempotencyRecord;
    },
    async getIdempotencyRecord(scope, keyHash) {
      const supabase = await loadAdminSupabaseClient();
      const { data, error } = await supabase
        .from("idempotency_keys")
        .select(
          "scope,key_hash,request_fingerprint,status,resource_id,response_payload,expires_at,updated_at"
        )
        .eq("scope", scope)
        .eq("key_hash", keyHash)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || "idempotency_lookup_failed");
      }

      return (data as IdempotencyRecord | null) || null;
    },
    async updateIdempotencyRecord(input) {
      const supabase = await loadAdminSupabaseClient();
      let query = supabase
        .from("idempotency_keys")
        .update({
          request_fingerprint: input.requestFingerprint,
          status: input.toStatus,
          expires_at: input.expiresAt,
          response_payload:
            typeof input.responsePayload === "undefined" ? undefined : input.responsePayload,
          resource_id: typeof input.resourceId === "undefined" ? undefined : input.resourceId,
          last_seen_at: new Date().toISOString()
        })
        .eq("scope", input.scope)
        .eq("key_hash", input.keyHash);

      if (input.fromStatus) {
        query = query.eq("status", input.fromStatus);
      }

      if (input.requestFingerprint) {
        query = query.eq("request_fingerprint", input.requestFingerprint);
      }

      const { data, error } = await query
        .select(
          "scope,key_hash,request_fingerprint,status,resource_id,response_payload,expires_at,updated_at"
        )
        .maybeSingle();

      if (error) {
        throw new Error(error.message || "idempotency_update_failed");
      }

      return (data as IdempotencyRecord | null) || null;
    },
    async getDurableStatus() {
      const supabase = await loadAdminSupabaseClient();
      const [{ error: rateLimitError }, { error: idempotencyError }, { error: rpcError }] =
        await Promise.all([
        supabase.from("request_rate_limits").select("scope", { head: true, count: "exact" }),
        supabase.from("idempotency_keys").select("scope", { head: true, count: "exact" }),
        supabase.rpc("claim_rate_limit_bucket", {
          p_scope: "durable-runtime-status",
          p_key_hash: "status-probe",
          p_limit: 1,
          p_window_seconds: 60
        })
      ]);

      return {
        provider: "supabase-postgres" as const,
        available: !rateLimitError && !idempotencyError && !rpcError,
        rateLimits: !rateLimitError && !rpcError,
        idempotency: !idempotencyError,
        rateLimitRpc: !rpcError
      };
    }
  };
}

function inferFallbackReason(error: unknown): DurableFallbackReason {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("claim_rate_limit_bucket") ||
    message.includes("request_rate_limits") ||
    message.includes("idempotency_keys") ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("schema")
  ) {
    return "migration_missing_or_unapplied";
  }

  return "storage_unavailable";
}

function recordDurableFallback(bucket: string, error: unknown) {
  const reason = inferFallbackReason(error);
  DURABLE_FALLBACK_STATE.count += 1;
  DURABLE_FALLBACK_STATE.lastFallbackAt = new Date().toISOString();
  DURABLE_FALLBACK_STATE.lastFallbackReason = reason;
  DURABLE_FALLBACK_STATE.buckets.add(bucket);

  if (reason === "migration_missing_or_unapplied" && !DURABLE_FALLBACK_STATE.warnedMissingMigration) {
    DURABLE_FALLBACK_STATE.warnedMissingMigration = true;
    console.warn(
      "[durable-abuse-protection] Durable limiter fallback suggests migration 20260418120000_phase3_durable_abuse_controls.sql is missing in this environment."
    );
  }
}

async function loadAdminSupabaseClient() {
  const module = await import("../supabase/admin.ts");
  return module.createAdminSupabaseClient();
}

export async function consumeDurableRateLimit(
  options: DurableRateLimitOptions,
  adapter: DurableProtectionAdapter = createSupabaseAdapter()
): Promise<DurableRateLimitResult> {
  try {
    const payload = await adapter.claimRateLimitBucket({
      scope: options.bucket,
      keyHash: hashAbuseKey(options.key),
      limit: options.limit,
      windowSeconds: normalizeWindowSeconds(options.windowMs)
    });

    return normalizeRateLimitPayload(payload, options.limit);
  } catch (error) {
    recordDurableFallback(options.bucket, error);
    traceOperationalEvent(
      options.bucket,
      error
    );

    const fallback = consumeRateLimit(options);

    return {
      ...fallback,
      mode: "memory-fallback"
    };
  }
}

function traceOperationalEvent(service: string, error: unknown) {
  void import("../observability/operational-trace.ts")
    .then(({ traceOperationalEvent: emitTrace }) => {
      emitTrace(
        "warn",
        "RATE_LIMIT_DURABLE_FALLBACK",
        {
          service,
          action: "consume_rate_limit"
        },
        {
          strategy: "memory",
          reason: error instanceof Error ? error.message : String(error)
        },
        error
      );
    })
    .catch(() => {
      console.warn("[durable-abuse-protection] Falling back to memory limiter", {
        service,
        error: error instanceof Error ? error.message : String(error)
      });
    });
}

export function shouldEnforceDurableProtection() {
  const explicit = readBooleanLikeEnv(process.env.DURABLE_PROTECTION_REQUIRED);

  if (explicit !== null) {
    return explicit;
  }

  return process.env.NODE_ENV === "production";
}

export async function claimDurableIdempotencyKey(
  options: ClaimIdempotencyOptions,
  adapter: DurableProtectionAdapter = createSupabaseAdapter()
): Promise<ClaimIdempotencyResult> {
  const keyHash = hashAbuseKey(`${options.scope}:${options.key}`);
  const expiresAt = new Date(Date.now() + options.ttlMs).toISOString();

  try {
    await adapter.insertIdempotencyRecord({
      scope: options.scope,
      keyHash,
      requestFingerprint: options.requestFingerprint,
      expiresAt
    });

    return {
      ok: true,
      status: "claimed",
      keyHash
    };
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }

  const existing = await adapter.getIdempotencyRecord(options.scope, keyHash);

  if (!existing) {
    throw new Error("idempotency_lookup_missing_after_conflict");
  }

  const sameFingerprint = existing.request_fingerprint === options.requestFingerprint;
  const expired = new Date(existing.expires_at).getTime() <= Date.now();

  if (sameFingerprint && existing.status === "completed" && existing.response_payload) {
    return {
      ok: true,
      status: "replay",
      keyHash,
      responsePayload: existing.response_payload,
      resourceId: existing.resource_id
    };
  }

  if ((expired || (sameFingerprint && existing.status === "failed")) && sameFingerprint) {
    const reclaimed = await adapter.updateIdempotencyRecord({
      scope: options.scope,
      keyHash,
      requestFingerprint: options.requestFingerprint,
      fromStatus: existing.status,
      toStatus: "pending",
      expiresAt,
      responsePayload: null,
      resourceId: null
    });

    if (reclaimed) {
      return {
        ok: true,
        status: "claimed",
        keyHash
      };
    }
  }

  return {
    ok: false,
    status: sameFingerprint ? "in-progress" : "conflict",
    keyHash,
    retryAfterSeconds: inferRetryAfterSeconds(existing.expires_at)
  };
}

export async function completeDurableIdempotencyKey(
  options: FinalizeIdempotencyOptions,
  adapter: DurableProtectionAdapter = createSupabaseAdapter()
) {
  const expiresAt = new Date(
    Date.now() + (options.retentionMs || 24 * 60 * 60 * 1000)
  ).toISOString();

  await adapter.updateIdempotencyRecord({
    scope: options.scope,
    keyHash: options.keyHash,
    requestFingerprint: options.requestFingerprint,
    fromStatus: "pending",
    toStatus: "completed",
    expiresAt,
    responsePayload: options.responsePayload,
    resourceId: options.resourceId || null
  });
}

export async function failDurableIdempotencyKey(
  options: FailIdempotencyOptions,
  adapter: DurableProtectionAdapter = createSupabaseAdapter()
) {
  const expiresAt = new Date(
    Date.now() + (options.retryAfterMs || 60_000)
  ).toISOString();

  await adapter.updateIdempotencyRecord({
    scope: options.scope,
    keyHash: options.keyHash,
    requestFingerprint: options.requestFingerprint,
    fromStatus: "pending",
    toStatus: "failed",
    expiresAt,
    responsePayload: {
      ok: false,
      error: options.error
    },
    resourceId: null
  });
}

export function buildDurableRateLimitHeaders(result: DurableRateLimitResult) {
  return {
    ...buildRateLimitHeaders(result),
    "X-RateLimit-Mode": result.mode
  };
}

export function buildIdempotencyFingerprint(parts: Array<string | number | null | undefined>) {
  return hashAbuseKey(parts.map((part) => String(part || "")).join("|")).slice(0, 32);
}

export async function getDurableProtectionStatus(
  adapter: DurableProtectionAdapter = createSupabaseAdapter()
) {
  const strictEnforcement = shouldEnforceDurableProtection();

  try {
    const durable = await adapter.getDurableStatus();
    const migrationApplied = durable.rateLimits && durable.idempotency;
    const fallbackMode =
      DURABLE_FALLBACK_STATE.count > 0 && !migrationApplied ? "memory-fallback" : "durable";

    return {
      ...durable,
      migrationApplied,
      runtime: {
        mode: fallbackMode as "durable" | "memory-fallback",
        strictEnforcement,
        fallbackActive: DURABLE_FALLBACK_STATE.count > 0,
        fallbackEventCount: DURABLE_FALLBACK_STATE.count,
        lastFallbackAt: DURABLE_FALLBACK_STATE.lastFallbackAt,
        lastFallbackReason: DURABLE_FALLBACK_STATE.lastFallbackReason,
        activeFallbackBuckets: [...DURABLE_FALLBACK_STATE.buckets].sort()
      },
      flows: DURABLE_PROTECTED_FLOWS.map((flow) => ({
        flow: flow.flow,
        bucket: flow.bucket,
        rateLimit:
          durable.rateLimits ? "durable" : "memory-fallback",
        idempotency: (flow.protections as readonly string[]).includes("idempotency")
          ? durable.idempotency
            ? "durable"
            : "unavailable"
          : "not_applicable"
      }))
    };
  } catch (error) {
      return {
        provider: "supabase-postgres" as const,
        available: false,
        rateLimits: false,
        idempotency: false,
        rateLimitRpc: false,
        migrationApplied: false,
        runtime: {
        mode: "memory-fallback" as const,
        strictEnforcement,
        fallbackActive: DURABLE_FALLBACK_STATE.count > 0,
        fallbackEventCount: DURABLE_FALLBACK_STATE.count,
        lastFallbackAt: DURABLE_FALLBACK_STATE.lastFallbackAt,
        lastFallbackReason:
          DURABLE_FALLBACK_STATE.lastFallbackReason || inferFallbackReason(error),
        activeFallbackBuckets: [...DURABLE_FALLBACK_STATE.buckets].sort()
      },
      flows: DURABLE_PROTECTED_FLOWS.map((flow) => ({
        flow: flow.flow,
        bucket: flow.bucket,
        rateLimit: "memory-fallback",
        idempotency: (flow.protections as readonly string[]).includes("idempotency")
          ? "unavailable"
          : "not_applicable"
      }))
    };
  }
}

export function resetDurableProtectionRuntimeState() {
  DURABLE_FALLBACK_STATE.count = 0;
  DURABLE_FALLBACK_STATE.lastFallbackAt = null;
  DURABLE_FALLBACK_STATE.lastFallbackReason = null;
  DURABLE_FALLBACK_STATE.buckets.clear();
  DURABLE_FALLBACK_STATE.warnedMissingMigration = false;
}
