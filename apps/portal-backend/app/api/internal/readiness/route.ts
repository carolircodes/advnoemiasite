import { requireInternalOperatorAccess } from "@/lib/auth/api-authorization";
import { buildBackendReadinessReport } from "@/lib/diagnostics/backend-readiness";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "@/lib/observability/request-observability";

export async function GET(request: Request) {
  const observation = startRequestObservation(request, {
    flow: "internal_readiness",
    provider: "diagnostics"
  });
  const access = await requireInternalOperatorAccess({
    request,
    service: "internal_readiness",
    action: "read",
    errorMessage: "diagnostics_require_internal_access"
  });

  if (!access.ok) {
    logObservedRequest("warn", "INTERNAL_READINESS_DENIED", observation, {
      flow: "internal_readiness",
      outcome: "denied",
      status: access.status,
      errorCategory: "boundary"
    });
    return access.response;
  }

  const readiness = await buildBackendReadinessReport();

  logObservedRequest("info", "INTERNAL_READINESS_GENERATED", observation, {
    flow: "internal_readiness",
    provider: "diagnostics",
    outcome: readiness.status === "healthy" ? "success" : "degraded",
    status: 200,
    runtimeState: readiness.status
  });

  return createObservedJsonResponse(observation, {
    ok: true,
    actor: access.actor,
    readiness
  });
}
