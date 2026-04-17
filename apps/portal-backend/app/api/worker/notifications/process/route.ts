import "server-only";

import { NextResponse } from "next/server";

import { getNotificationEnv } from "../../../../../lib/config/env";
import { assertRouteSecret } from "../../../../../lib/http/route-secret";
import { processPendingNotifications } from "../../../../../lib/services/process-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const notificationEnv = getNotificationEnv();

  const access = assertRouteSecret({
    request,
    expectedSecret: notificationEnv.workerSecret,
    secretName: "NOTIFICATIONS_WORKER_SECRET",
    errorMessage: "Worker nao autorizado para processar notificacoes.",
    headerNames: ["x-worker-secret"]
  });

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
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
