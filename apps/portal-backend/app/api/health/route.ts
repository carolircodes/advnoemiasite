import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "@/lib/observability/request-observability";

/**
 * Health check para load balancer / deploy (sem Supabase, sem cookies).
 * Excluído do matcher em `middleware.ts`.
 */
export function GET(request: Request) {
  const observation = startRequestObservation(request);
  logObservedRequest("info", "PUBLIC_HEALTHCHECK_OK", observation, {
    service: "portal-backend"
  });

  return createObservedJsonResponse(
    observation,
    {
      ok: true,
      service: "portal-backend",
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
