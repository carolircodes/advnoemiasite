import "server-only";

import { requireRouteSecretOrStaffAccess } from "../../../../lib/auth/api-authorization.ts";
import { getNotificationEnv, getServerEnv } from "../../../../lib/config/env.ts";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "../../../../lib/observability/request-observability.ts";
import { processPendingNotifications } from "../../../../lib/services/process-notifications.ts";

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
  const observation = startRequestObservation(request, {
    flow: "notifications_cron",
    provider: "notifications"
  });
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
    logObservedRequest("warn", "NOTIFICATIONS_CRON_DENIED", observation, {
      flow: "notifications_cron",
      provider: "notifications",
      outcome: "denied",
      status: access.status,
      errorCategory: "boundary"
    });
    return access.response;
  }

  if (!notificationEnv.emailFrom) {
    logObservedRequest("error", "NOTIFICATIONS_CRON_EMAIL_FROM_MISSING", observation, {
      flow: "notifications_cron",
      provider: notificationEnv.provider,
      outcome: "failed",
      status: 503,
      errorCategory: "configuration"
    });
    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        error:
          "EMAIL_FROM nao configurado. Defina a variavel de ambiente antes de processar notificacoes.",
        provider: notificationEnv.provider,
        recommendation:
          "Configure EMAIL_FROM e RESEND_API_KEY ou variaveis SMTP no painel do Vercel"
      },
      { status: 503 }
    );
  }

  const providerReady =
    notificationEnv.provider === "resend"
      ? Boolean(notificationEnv.resendApiKey)
      : Boolean(notificationEnv.smtpHost && notificationEnv.smtpPort);

  if (!providerReady) {
    logObservedRequest("error", "NOTIFICATIONS_CRON_PROVIDER_CONFIG_MISSING", observation, {
      flow: "notifications_cron",
      provider: notificationEnv.provider,
      outcome: "failed",
      status: 503,
      errorCategory: "configuration"
    });
    return createObservedJsonResponse(
      observation,
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
      { status: 503 }
    );
  }

  try {
    const result = await processPendingNotifications(20);

    logObservedRequest("info", "NOTIFICATIONS_CRON_PROCESSED", observation, {
      flow: "notifications_cron",
      provider: notificationEnv.provider,
      outcome: result.failed > 0 ? "degraded" : "success",
      status: 200,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      runtimeState: result.diagnostics.status
    });

    return createObservedJsonResponse(
      observation,
      {
        ok: true,
        provider: notificationEnv.provider,
        ...result
      },
      { status: 200 }
    );
  } catch (error) {
    logObservedRequest("error", "NOTIFICATIONS_CRON_FAILED", observation, {
      flow: "notifications_cron",
      provider: notificationEnv.provider,
      outcome: "failed",
      status: 500,
      errorCategory: "internal"
    }, error);
    return createObservedJsonResponse(
      observation,
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
