import { NextResponse } from "next/server";

import { getNotificationEnv } from "@/lib/config/env";
import { processPendingNotifications } from "@/lib/services/process-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(value: string | null) {
  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  return value.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const notificationEnv = getNotificationEnv();

  if (!notificationEnv.workerSecret) {
    return NextResponse.json(
      {
        error:
          "Defina NOTIFICATIONS_WORKER_SECRET para proteger a rota de processamento da outbox."
      },
      { status: 500 }
    );
  }

  const headerSecret =
    request.headers.get("x-worker-secret") || getBearerToken(request.headers.get("authorization"));

  if (headerSecret !== notificationEnv.workerSecret) {
    return NextResponse.json(
      { error: "Worker nao autorizado para processar notificacoes." },
      { status: 401 }
    );
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
