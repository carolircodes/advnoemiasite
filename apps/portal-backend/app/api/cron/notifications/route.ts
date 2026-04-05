import "server-only";

import { NextResponse } from "next/server";

import { getNotificationEnv, getServerEnv } from "@/lib/config/env";
import { processPendingNotifications } from "@/lib/services/process-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint acionado pelo Vercel Cron Jobs a cada 5 minutos.
 *
 * Em produção: Vercel envia `Authorization: Bearer <CRON_SECRET>`.
 * Em desenvolvimento: CRON_SECRET não é exigido — o cron pode ser chamado
 * manualmente via GET http://localhost:3000/api/cron/notifications para testar.
 *
 * Este endpoint chama processPendingNotifications() diretamente (sem HTTP
 * interno), o que é mais eficiente e evita problemas de rede em serverless.
 */
export async function GET(request: Request) {
  const env = getServerEnv();
  const notificationEnv = getNotificationEnv();

  if (env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Nao autorizado para disparar o cron de notificacoes." },
        { status: 401 }
      );
    }
  }

  if (!notificationEnv.emailFrom) {
    return NextResponse.json(
      { error: "EMAIL_FROM nao configurado. Defina a variavel de ambiente antes de processar notificacoes." },
      { status: 500 }
    );
  }

  const providerReady =
    notificationEnv.provider === "resend"
      ? Boolean(notificationEnv.resendApiKey)
      : Boolean(notificationEnv.smtpHost && notificationEnv.smtpPort);

  if (!providerReady) {
    return NextResponse.json(
      {
        error:
          notificationEnv.provider === "resend"
            ? "RESEND_API_KEY nao configurado."
            : "NOTIFICATIONS_SMTP_HOST ou NOTIFICATIONS_SMTP_PORT nao configurados."
      },
      { status: 500 }
    );
  }

  try {
    const result = await processPendingNotifications(20);

    return NextResponse.json(
      {
        ok: true,
        provider: notificationEnv.provider,
        ...result
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao processar a fila de notificacoes."
      },
      { status: 500 }
    );
  }
}
