import "server-only";

import { logger } from "../logging/structured-logger.ts";
import { getOfficialSchemaVersion } from "../schema/compatibility.ts";

export type OperationalTraceContext = {
  eventId?: string | null;
  sessionId?: string | null;
  clientId?: string | null;
  channel?: string | null;
  pipelineId?: string | null;
  decisionState?: string | null;
  sendResult?: string | null;
  handoffState?: string | null;
  service?: string;
  action?: string;
  requestId?: string | null;
  correlationId?: string | null;
  flow?: string | null;
  provider?: string | null;
  outcome?: string | null;
  status?: number | string | null;
  errorCategory?: string | null;
};

type TraceLevel = "info" | "warn" | "error";

const sensitiveMetadataKeyParts = [
  "authorization",
  "body",
  "content",
  "cookie",
  "cpf",
  "document",
  "email",
  "message",
  "password",
  "payload",
  "phone",
  "raw",
  "secret",
  "token"
];

function sanitizeTraceMetadata(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: "[redacted]"
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTraceMetadata(item, depth + 1));
  }

  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.length > 500) {
      return `${value.slice(0, 500)}...[truncated]`;
    }

    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();

    if (sensitiveMetadataKeyParts.some((part) => normalizedKey.includes(part))) {
      sanitized[key] = "[redacted]";
      continue;
    }

    sanitized[key] = sanitizeTraceMetadata(nestedValue, depth + 1);
  }

  return sanitized;
}

export function traceOperationalEvent(
  level: TraceLevel,
  event: string,
  context: OperationalTraceContext,
  metadata: Record<string, unknown> = {},
  error?: unknown
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: {
      event_id: context.eventId || null,
      session_id: context.sessionId || null,
      client_id: context.clientId || null,
      channel: context.channel || null,
      pipeline_id: context.pipelineId || null,
      decision_state: context.decisionState || null,
      send_result: context.sendResult || null,
      handoff_state: context.handoffState || null,
      request_id: context.requestId || null,
      correlation_id: context.correlationId || null,
      flow: context.flow || null,
      provider: context.provider || null,
      outcome: context.outcome || null,
      status: context.status || null,
      error_category: context.errorCategory || null,
      schema_version: getOfficialSchemaVersion(),
      ...(sanitizeTraceMetadata(metadata) as Record<string, unknown>)
    }
  };

  console.log(JSON.stringify(payload));

  const service = context.service || "operations";
  const action = context.action || event.toLowerCase();
  const message = `${event} on ${service}`;
  const loggerContext = {
    clientId: context.clientId || undefined,
    userId: context.sessionId || context.eventId || undefined,
    channel: context.channel || undefined
  };

  if (level === "warn") {
    void logger.warn(service, action, message, payload.data, loggerContext);
    return;
  }

  if (level === "error") {
    const normalizedError =
      error instanceof Error ? error : new Error(typeof error === "string" ? error : event);
    void logger.error(service, action, message, normalizedError, payload.data, loggerContext);
    return;
  }

  void logger.info(service, action, message, payload.data, loggerContext);
}
