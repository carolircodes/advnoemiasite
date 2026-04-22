import { randomUUID } from "crypto";

import { NextResponse } from "next/server.js";

type ObservationLevel = "info" | "warn" | "error";

type ObservationMetadata = Record<string, unknown>;

export type ObservedErrorCategory =
  | "configuration"
  | "authentication"
  | "provider"
  | "fallback"
  | "boundary"
  | "validation"
  | "rate_limit"
  | "idempotency"
  | "not_found"
  | "internal";

export type RequestObservation = {
  requestId: string;
  correlationId: string;
  method: string;
  pathname: string;
  startedAt: number;
  flow?: string;
  channel?: string;
  provider?: string;
};

type RequestObservationOptions = {
  flow?: string;
  channel?: string;
  provider?: string;
};

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const lowered = value.toLowerCase();

    if (
      lowered.includes("token") ||
      lowered.includes("secret") ||
      lowered.includes("password") ||
      lowered.includes("authorization") ||
      lowered.includes("bearer")
    ) {
      return "[REDACTED]";
    }

    return value.slice(0, 240);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => sanitizeValue(item));
  }

  if (typeof value === "object" && value) {
    return Object.fromEntries(
      Object.entries(value as ObservationMetadata)
        .slice(0, 24)
        .map(([key, nestedValue]) => {
          if (
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("secret") ||
            key.toLowerCase().includes("password")
          ) {
            return [key, "[REDACTED]"];
          }

          return [key, sanitizeValue(nestedValue)];
        })
    );
  }

  return undefined;
}

function sanitizeMetadata(metadata: ObservationMetadata = {}) {
  return sanitizeValue(metadata) as ObservationMetadata;
}

export function startRequestObservation(
  request: Request,
  options: RequestObservationOptions = {}
): RequestObservation {
  const url = new URL(request.url);
  const headerRequestId =
    request.headers.get("x-request-id") ||
    request.headers.get("x-correlation-id") ||
    request.headers.get("x-vercel-id");
  const requestId = headerRequestId?.trim() || randomUUID();

  return {
    requestId,
    correlationId: requestId,
    method: request.method,
    pathname: url.pathname,
    startedAt: performance.now(),
    flow: options.flow,
    channel: options.channel,
    provider: options.provider
  };
}

function splitObservedMetadata(metadata: ObservationMetadata) {
  const known = {
    flow:
      typeof metadata.flow === "string" && metadata.flow.trim().length > 0
        ? metadata.flow.trim()
        : null,
    outcome:
      typeof metadata.outcome === "string" && metadata.outcome.trim().length > 0
        ? metadata.outcome.trim()
        : null,
    status:
      typeof metadata.status === "number" || typeof metadata.status === "string"
        ? metadata.status
        : null,
    channel:
      typeof metadata.channel === "string" && metadata.channel.trim().length > 0
        ? metadata.channel.trim()
        : null,
    provider:
      typeof metadata.provider === "string" && metadata.provider.trim().length > 0
        ? metadata.provider.trim()
        : null,
    errorCategory:
      typeof metadata.errorCategory === "string" && metadata.errorCategory.trim().length > 0
        ? metadata.errorCategory.trim()
        : null,
    runtimeState:
      typeof metadata.runtimeState === "string" && metadata.runtimeState.trim().length > 0
        ? metadata.runtimeState.trim()
        : null
  };

  const rest = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) =>
        ![
          "flow",
          "outcome",
          "status",
          "channel",
          "provider",
          "errorCategory",
          "runtimeState"
        ].includes(key)
    )
  );

  return {
    known,
    rest
  };
}

export function logObservedRequest(
  level: ObservationLevel,
  event: string,
  observation: RequestObservation,
  metadata: ObservationMetadata = {},
  error?: unknown
) {
  const durationMs = Math.round(performance.now() - observation.startedAt);
  const { known, rest } = splitObservedMetadata(metadata);
  const output = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: observation.requestId,
    correlationId: observation.correlationId,
    flow: known.flow || observation.flow || null,
    method: observation.method,
    pathname: observation.pathname,
    channel: known.channel || observation.channel || null,
    provider: known.provider || observation.provider || null,
    outcome: known.outcome,
    status: known.status,
    errorCategory: known.errorCategory,
    runtimeState: known.runtimeState,
    durationMs,
    metadata: sanitizeMetadata(rest),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message
          }
        : typeof error === "string"
          ? { message: error }
          : null
  };

  console.log(JSON.stringify(output));
}

export function withObservationHeaders(
  response: NextResponse,
  observation: RequestObservation
) {
  const durationMs = Math.round(performance.now() - observation.startedAt);

  response.headers.set("x-request-id", observation.requestId);
  response.headers.set("x-correlation-id", observation.correlationId);
  response.headers.set("server-timing", `app;dur=${durationMs}`);

  return response;
}

export function createObservedJsonResponse(
  observation: RequestObservation,
  body: unknown,
  init?: ResponseInit
) {
  return withObservationHeaders(NextResponse.json(body, init), observation);
}

export function getObservationDurationMs(observation: RequestObservation) {
  return Math.round(performance.now() - observation.startedAt);
}
