import "server-only";

import { requireRouteSecretOrStaffAccess } from "../../../../../lib/auth/api-authorization.ts";
import { getNotificationEnv } from "../../../../../lib/config/env.ts";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "../../../../../lib/observability/request-observability.ts";
import { processPendingNotifications } from "../../../../../lib/services/process-notifications.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const observation = startRequestObservation(request, {
    flow: "notifications_worker",
    provider: "notifications"
  });
  const notificationEnv = getNotificationEnv();

  const access = await requireRouteSecretOrStaffAccess({
    request,
    expectedSecret: notificationEnv.workerSecret,
    secretName: "NOTIFICATIONS_WORKER_SECRET",
    errorMessage: "Worker nao autorizado para processar notificacoes.",
    service: "notifications_worker",
    action: "process",
    headerNames: ["x-worker-secret"]
  });

  if (!access.ok) {
    logObservedRequest("warn", "NOTIFICATIONS_WORKER_DENIED", observation, {
      flow: "notifications_worker",
      provider: "notifications",
      outcome: "denied",
      status: access.status,
      errorCategory: "boundary"
    });
    return access.response;
  }

  let requestedLimit = 10;

  try {
    const body = await request.json().catch(() => null);

    if (body && typeof body.limit === "number") {
      requestedLimit = body.limit;
    }
  } catch {
    requestedLimit = 10;
  }

  try {
    const result = await processPendingNotifications(requestedLimit);
    logObservedRequest("info", "NOTIFICATIONS_WORKER_PROCESSED", observation, {
      flow: "notifications_worker",
      provider: notificationEnv.provider,
      outcome: result.failed > 0 ? "degraded" : "success",
      status: 200,
      requestedLimit,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      runtimeState: result.diagnostics.status
    });
    return createObservedJsonResponse(observation, result, { status: 200 });
  } catch (error) {
    logObservedRequest("error", "NOTIFICATIONS_WORKER_FAILED", observation, {
      flow: "notifications_worker",
      provider: notificationEnv.provider,
      outcome: "failed",
      status: 500,
      errorCategory: "internal",
      requestedLimit
    }, error);
    return createObservedJsonResponse(
      observation,
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel processar a fila de notificacoes."
      },
      { status: 500 }
    );
  }
}
