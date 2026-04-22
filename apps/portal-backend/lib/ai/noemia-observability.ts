import { traceOperationalEvent } from "../observability/operational-trace";
import type {
  NoemiaChannel,
  NoemiaDomain,
  NoemiaPolicyMode,
  NoemiaPromptContextSummary,
  NoemiaUserType
} from "./core-types";

type NoemiaTraceLevel = "info" | "warn" | "error";

type NoemiaTraceContext = {
  channel: NoemiaChannel;
  domain: NoemiaDomain;
  userType: NoemiaUserType;
  policyMode: NoemiaPolicyMode;
  sessionId?: string | null;
  clientId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
};

export function traceNoemiaEvent(
  level: NoemiaTraceLevel,
  event: string,
  context: NoemiaTraceContext,
  metadata: Record<string, unknown> = {},
  error?: unknown
) {
  traceOperationalEvent(
    level,
    event,
    {
      service: "noemia",
      action: event.toLowerCase(),
      channel: context.channel,
      sessionId: context.sessionId || null,
      clientId: context.clientId || null,
      requestId: context.requestId || null,
      correlationId: context.correlationId || null,
      flow: "noemia",
      decisionState: context.domain,
      outcome: typeof metadata.outcome === "string" ? metadata.outcome : null
    },
    {
      domain: context.domain,
      audience: context.userType,
      policyMode: context.policyMode,
      ...metadata
    },
    error
  );
}

export function buildNoemiaTraceMetadata(input: {
  promptVersion: string;
  contextSummary: NoemiaPromptContextSummary;
  source?: string;
  usedFallback?: boolean;
  sideEffects?: string[];
  classification?: Record<string, unknown>;
  model?: string;
}) {
  return {
    promptVersion: input.promptVersion,
    source: input.source || null,
    usedFallback: input.usedFallback ?? null,
    sideEffects: input.sideEffects || [],
    model: input.model || null,
    contextSummary: input.contextSummary,
    classification: input.classification || null
  };
}
