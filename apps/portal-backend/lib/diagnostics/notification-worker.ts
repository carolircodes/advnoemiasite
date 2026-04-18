const MAX_NOTIFICATION_ATTEMPTS = 5;
const STALE_PROCESSING_MINUTES = 15;

export type NotificationWorkerDiagnosticsAdapter = {
  countByStatus(
    status: "pending" | "failed" | "processing",
    options?: {
      terminalOnly?: boolean;
      staleBefore?: string;
      availableBefore?: string;
    }
  ): Promise<number>;
};

function isNotificationProviderConfigured() {
  const provider = process.env.NOTIFICATIONS_PROVIDER?.trim() || (process.env.RESEND_API_KEY ? "resend" : "smtp");

  if (provider === "resend") {
    return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
  }

  return Boolean(
    process.env.NOTIFICATIONS_SMTP_HOST?.trim() &&
      process.env.NOTIFICATIONS_SMTP_PORT?.trim() &&
      process.env.EMAIL_FROM?.trim()
  );
}

export function createNotificationWorkerDiagnosticsMetadata() {
  return {
    providerConfigured: isNotificationProviderConfigured(),
    workerSecretConfigured: Boolean(process.env.NOTIFICATIONS_WORKER_SECRET?.trim()),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    retryPolicy: {
      maxAttempts: MAX_NOTIFICATION_ATTEMPTS,
      staleProcessingMinutes: STALE_PROCESSING_MINUTES
    }
  };
}

export async function getNotificationWorkerDiagnostics(
  adapter: NotificationWorkerDiagnosticsAdapter
) {
  const now = new Date();
  const nowIso = now.toISOString();
  const staleBefore = new Date(
    now.getTime() - STALE_PROCESSING_MINUTES * 60_000
  ).toISOString();
  const metadata = createNotificationWorkerDiagnosticsMetadata();

  try {
    const [ready, retryableFailures, processing, staleProcessing, terminalFailures] =
      await Promise.all([
        adapter.countByStatus("pending", { availableBefore: nowIso }),
        adapter.countByStatus("failed"),
        adapter.countByStatus("processing"),
        adapter.countByStatus("processing", { staleBefore }),
        adapter.countByStatus("failed", { terminalOnly: true })
      ]);

    let status: "healthy" | "degraded" | "missing_configuration" | "fallback" | "hard_failure" =
      "healthy";
    let summary = "Worker de notificacoes pronto e fila observavel.";

    if (!metadata.providerConfigured || !metadata.workerSecretConfigured) {
      status = "missing_configuration";
      summary = "Worker de notificacoes sem configuracao completa de provedor ou secret.";
    } else if (staleProcessing > 0 || terminalFailures > 0) {
      status = "degraded";
      summary = "Fila de notificacoes com itens presos ou falhas terminais para revisar.";
    } else if (!metadata.cronSecretConfigured || processing > 0 || retryableFailures > 0) {
      status = "degraded";
      summary = "Worker operante, mas com dependencias ou backlog que exigem atencao.";
    }

    return {
      status,
      summary,
      details: {
        ...metadata,
        queue: {
          ready,
          retryableFailures,
          processing,
          staleProcessing,
          terminalFailures
        }
      }
    };
  } catch {
    return {
      status: "hard_failure" as const,
      summary: "Nao foi possivel inspecionar o estado operacional do worker.",
      details: {
        ...metadata,
        queue: null,
        errorCode: "worker_diagnostics_unavailable"
      }
    };
  }
}
