import "server-only";

import { traceOperationalEvent } from "../observability/operational-trace";
import { routeNotificationByChannel } from "../notifications/channel-router";
import { renderNotificationEmail } from "../notifications/email-templates";
import { createAdminSupabaseClient } from "../supabase/admin";
import {
  classifyNotificationError,
  type NotificationErrorKind
} from "./notification-error-classification";
import { runOperationalAutomationRules } from "./automation-rules";

const MAX_NOTIFICATION_ATTEMPTS = 5;
const NOTIFICATION_WORKER_ID = `${process.env.VERCEL_REGION || "local"}:${process.pid}`;

type NotificationRecord = {
  id: string;
  event_type: string;
  channel: string;
  recipient_profile_id: string | null;
  recipient_email: string;
  subject: string;
  template_key: string;
  payload: Record<string, unknown> | null;
  status: string;
  attempts: number;
  available_at: string;
};

function getRetryDelayMs(attempts: number) {
  const boundedAttempts = Math.min(Math.max(attempts, 1), MAX_NOTIFICATION_ATTEMPTS);
  return Math.min(60, 2 ** boundedAttempts) * 60_000;
}

function truncateErrorMessage(message: string) {
  return message.slice(0, 900);
}

async function claimNotificationForProcessing(record: NotificationRecord) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications_outbox")
    .update({
      status: "processing",
      attempts: record.attempts + 1,
      last_attempt_at: now,
      error_message: null,
      last_error_kind: null,
      processing_started_at: now,
      processing_worker: NOTIFICATION_WORKER_ID
    })
    .eq("id", record.id)
    .eq("attempts", record.attempts)
    .in("status", ["pending", "failed"])
    .lte("available_at", now)
    .select(
      "id,event_type,channel,recipient_profile_id,recipient_email,subject,template_key,payload,status,attempts,available_at"
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Nao foi possivel marcar a notificacao como em processamento: ${error.message}`);
  }

  return {
    claimedRecord: (data as NotificationRecord | null) || null,
    processingTimestamp: now
  };
}

async function markNotificationAsSent(id: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications_outbox")
    .update({
      status: "sent",
      sent_at: now,
      error_message: null,
      last_error_kind: null,
      processing_started_at: null,
      processing_worker: null
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Nao foi possivel marcar a notificacao como enviada: ${error.message}`);
  }
}

async function markNotificationAsSkipped(id: string, reason: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications_outbox")
    .update({
      status: "skipped",
      sent_at: now,
      error_message: truncateErrorMessage(reason),
      last_error_kind: "validation",
      processing_started_at: null,
      processing_worker: null
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Nao foi possivel marcar a notificacao como ignorada: ${error.message}`);
  }
}

async function markNotificationAsFailed(
  record: NotificationRecord,
  processingTimestamp: string,
  errorMessage: string,
  errorKind: NotificationErrorKind
) {
  const supabase = createAdminSupabaseClient();
  const nextAttemptAt = new Date(
    Date.now() + getRetryDelayMs(record.attempts + 1)
  ).toISOString();
  const terminalFailure = record.attempts + 1 >= MAX_NOTIFICATION_ATTEMPTS;
  const { error } = await supabase
    .from("notifications_outbox")
    .update({
      status: "failed",
      available_at: terminalFailure ? processingTimestamp : nextAttemptAt,
      error_message: truncateErrorMessage(errorMessage),
      last_error_kind: errorKind,
      processing_started_at: null,
      processing_worker: null
    })
    .eq("id", record.id);

  if (error) {
    throw new Error(`Nao foi possivel registrar a falha da notificacao: ${error.message}`);
  }
}

async function logNotificationSentToHistory(record: NotificationRecord) {
  try {
    const supabase = createAdminSupabaseClient();
    await supabase.from("audit_logs").insert({
      actor_profile_id: record.recipient_profile_id || null,
      action: "notification.sent",
      entity_type: "notifications_outbox",
      entity_id: record.id,
      payload: {
        channel: record.channel || "email",
        templateKey: record.template_key,
        recipientEmail: record.recipient_email,
        eventType: record.event_type,
        sentAt: new Date().toISOString()
      }
    });
  } catch (logError) {
    console.warn(
      "[notifications.history] Falha ao registrar historico de envio:",
      logError instanceof Error ? logError.message : String(logError)
    );
  }
}

async function processNotification(record: NotificationRecord) {
  const { claimedRecord, processingTimestamp } = await claimNotificationForProcessing(record);

  if (!claimedRecord) {
    traceOperationalEvent("warn", "NOTIFICATION_PROCESSING_CONTENDED", {
      service: "notifications_worker",
      action: "claim"
    }, {
      notificationId: record.id,
      workerId: NOTIFICATION_WORKER_ID
    });

    return {
      id: record.id,
      status: "contended" as const
    };
  }

  if (claimedRecord.template_key === "client-invite") {
    await markNotificationAsSkipped(
      claimedRecord.id,
      "Convite principal enviado pelo fluxo nativo do Supabase Auth."
    );

    return {
      id: claimedRecord.id,
      status: "skipped" as const
    };
  }

  const channel = claimedRecord.channel || "email";

  try {
    if (channel === "email") {
      const renderedEmail = renderNotificationEmail(claimedRecord);
      await routeNotificationByChannel("email", {
        to: claimedRecord.recipient_email,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text
      });
    } else if (channel === "whatsapp") {
      const payload = claimedRecord.payload || {};
      const whatsappMessage =
        typeof payload.message === "string" && payload.message.trim().length > 0
          ? payload.message
          : claimedRecord.subject;

      await routeNotificationByChannel("whatsapp", {
        to: claimedRecord.recipient_email,
        subject: claimedRecord.subject,
        html: "",
        text: whatsappMessage
      });
    } else {
      await routeNotificationByChannel(channel, {
        to: claimedRecord.recipient_email,
        subject: claimedRecord.subject,
        html: "",
        text: ""
      });
    }

    await markNotificationAsSent(claimedRecord.id);
    await logNotificationSentToHistory(claimedRecord);

    traceOperationalEvent("info", "NOTIFICATION_SENT", {
      service: "notifications_worker",
      action: "send"
    }, {
      notificationId: claimedRecord.id,
      channel,
      workerId: NOTIFICATION_WORKER_ID
    });

    return {
      id: claimedRecord.id,
      status: "sent" as const
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha desconhecida ao enviar notificacao.";
    const errorKind = classifyNotificationError(error);

    await markNotificationAsFailed(claimedRecord, processingTimestamp, message, errorKind);

    traceOperationalEvent("error", "NOTIFICATION_SEND_FAILED", {
      service: "notifications_worker",
      action: "send"
    }, {
      notificationId: claimedRecord.id,
      channel,
      workerId: NOTIFICATION_WORKER_ID,
      errorKind
    }, error);

    return {
      id: claimedRecord.id,
      status: "failed" as const,
      error: message,
      errorKind
    };
  }
}

export async function processPendingNotifications(limit = 10) {
  const automationSummary = await runOperationalAutomationRules();
  const supabase = createAdminSupabaseClient();
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications_outbox")
    .select(
      "id,event_type,channel,recipient_profile_id,recipient_email,subject,template_key,payload,status,attempts,available_at"
    )
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_NOTIFICATION_ATTEMPTS)
    .lte("available_at", now)
    .order("available_at", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Nao foi possivel carregar a fila de notificacoes: ${error.message}`);
  }

  const results = [];

  for (const record of (data || []) as NotificationRecord[]) {
    results.push(await processNotification(record));
  }

  return {
    automation: automationSummary,
    processed: results.length,
    sent: results.filter((item) => item.status === "sent").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    failed: results.filter((item) => item.status === "failed").length,
    contended: results.filter((item) => item.status === "contended").length,
    results
  };
}
