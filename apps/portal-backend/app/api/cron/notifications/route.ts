import "server-only";

import { NextResponse } from "next/server";

import { requireRouteSecretOrStaffAccess } from "../../../../lib/auth/api-authorization";
import { getNotificationEnv, getServerEnv } from "../../../../lib/config/env";
import { processPendingNotifications } from "../../../../lib/services/process-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint acionado pelo Vercel Cron Jobs.
 *
 * No plano Hobby da Vercel o cron precisa ser no maximo diario, por isso o
 * schedule versionado do portal roda 1x ao dia e nao bloqueia novos deploys.
 * Se a operacao exigir frequencia maior, o projeto `advnoemiaportal` precisa
 * ser promovido para Pro antes de restaurar uma cadencia subdiaria.
 *
 * Em producao: Vercel envia `Authorization: Bearer <CRON_SECRET>`.
 * Em desenvolvimento local: o fallback sem segredo so e aceito em localhost.
 *
 * Este endpoint chama processPendingNotifications() diretamente (sem HTTP
 * interno), o que e mais eficiente e evita problemas de rede em serverless.
 */
export async function GET(request: Request) {
  const env = getServerEnv();
  const notificationEnv = getNotificationEnv();

  const access = await requireRouteSecretOrStaffAccess({
    request,
    expectedSecret: env.CRON_SECRET,
    secretName: "CRON_SECRET",
    errorMessage: "Nao autorizado para disparar o cron de notificacoes.",
    service: "notifications_cron",
    action: "process",
    allowLocalWithoutSecret: true
  });

  if (!access.ok) {
    return access.response;
  }

  if (!notificationEnv.emailFrom) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "EMAIL_FROM nao configurado. Defina a variavel de ambiente antes de processar notificacoes.",
        provider: notificationEnv.provider,
        recommendation:
          "Configure EMAIL_FROM e RESEND_API_KEY ou variaveis SMTP no painel do Vercel"
      },
      { status: 200 }
    );
  }

  const providerReady =
    notificationEnv.provider === "resend"
      ? Boolean(notificationEnv.resendApiKey)
      : Boolean(notificationEnv.smtpHost && notificationEnv.smtpPort);

  if (!providerReady) {
    return NextResponse.json(
      {
        ok: false,
        error:
          notificationEnv.provider === "resend"
            ? "RESEND_API_KEY nao configurado."
            : "NOTIFICATIONS_SMTP_HOST ou NOTIFICATIONS_SMTP_PORT nao configurados.",
        provider: notificationEnv.provider,
        recommendation:
          "Configure as variaveis de ambiente do provedor de email no painel do Vercel"
      },
      { status: 200 }
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
