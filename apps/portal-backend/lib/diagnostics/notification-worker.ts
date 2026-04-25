import { buildDiagnosticSection, type DiagnosticSection } from "./status.ts";

const MAX_NOTIFICATION_ATTEMPTS = 5;
const STALE_PROCESSING_MINUTES = 15;

export type NotificationWorkerDiagnosticsAdapter = {
  countByStatus(
    status: "pending" | "failed" | "processing" | "blocked",
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
    const [ready, retryableFailures, processing, staleProcessing, terminalFailures, blocked] =
      await Promise.all([
        adapter.countByStatus("pending", { availableBefore: nowIso }),
        adapter.countByStatus("failed"),
        adapter.countByStatus("processing"),
        adapter.countByStatus("processing", { staleBefore }),
        adapter.countByStatus("failed", { terminalOnly: true }),
        adapter.countByStatus("blocked")
      ]);

    let section: DiagnosticSection = buildDiagnosticSection({
      status: "healthy",
      code: "notifications_worker_ready",
      summary: "Worker de notificacoes pronto e fila observavel.",
      operatorAction:
        "Nenhuma acao imediata; validar a fila apos deploy ou mudanca de provedor.",
      verification: [
        "Executar uma rodada protegida do worker.",
        "Confirmar ausencia de itens presos em processing."
      ],
      details: {}
    });

    if (!metadata.providerConfigured || !metadata.workerSecretConfigured) {
      section = buildDiagnosticSection({
        status: "missing_configuration",
        code: "notifications_worker_missing_configuration",
        summary: "Worker de notificacoes sem configuracao completa de provedor ou secret.",
        operatorAction:
          "Configurar provider, EMAIL_FROM e secret do worker antes de promover o ambiente.",
        verification: [
          "Confirmar NOTIFICATIONS_PROVIDER.",
          "Confirmar EMAIL_FROM e credenciais do provider.",
          "Confirmar NOTIFICATIONS_WORKER_SECRET."
        ],
        details: {}
      });
    } else if (staleProcessing > 0 || terminalFailures > 0) {
      section = buildDiagnosticSection({
        status: "degraded",
        code: "notifications_worker_queue_degraded",
        summary: "Fila de notificacoes com itens presos ou falhas terminais para revisar.",
        operatorAction:
          "Revisar falhas terminais e itens presos antes que a fila acumule backlog silencioso.",
        verification: [
          "Inspecionar staleProcessing e terminalFailures.",
          "Executar rodada protegida do worker e confirmar nova movimentacao."
        ],
        details: {}
      });
    } else if (!metadata.cronSecretConfigured || processing > 0 || retryableFailures > 0) {
      section = buildDiagnosticSection({
        status: "degraded",
        code: "notifications_worker_attention_needed",
        summary: "Worker operante, mas com dependencias ou backlog que exigem atencao.",
        operatorAction:
          "Confirmar cron secret e acompanhar backlog retryable ate estabilizar.",
        verification: [
          "Confirmar CRON_SECRET.",
          "Confirmar queue.ready, processing e retryableFailures."
        ],
        details: {}
      });
    }

    return {
      ...section,
      details: {
        ...metadata,
        queue: {
          ready,
          retryableFailures,
          processing,
          staleProcessing,
          terminalFailures,
          blocked
        }
      }
    };
  } catch {
    return {
      ...buildDiagnosticSection({
        status: "hard_failure",
        code: "notifications_worker_diagnostics_unavailable",
        summary: "Nao foi possivel inspecionar o estado operacional do worker.",
        operatorAction:
          "Tratar o worker como nao verificavel ate que a inspecao protegida volte a responder.",
        verification: [
          "Repetir a readiness protegida.",
          "Validar conectividade e acesso administrativo ao banco."
        ],
        details: {}
      }),
      details: {
        ...metadata,
        queue: null,
        errorCode: "worker_diagnostics_unavailable"
      }
    };
  }
}
