import "server-only";

import { logger } from "../logging/structured-logger";
import { getOfficialSchemaVersion } from "../schema/compatibility";

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
};

type TraceLevel = "info" | "warn" | "error";

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
      schema_version: getOfficialSchemaVersion(),
      ...metadata
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
