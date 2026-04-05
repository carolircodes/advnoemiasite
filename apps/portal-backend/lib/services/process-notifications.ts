import "server-only";

import { routeNotificationByChannel } from "@/lib/notifications/channel-router";
import { renderNotificationEmail } from "@/lib/notifications/email-templates";
import { runOperationalAutomationRules } from "@/lib/services/automation-rules";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_NOTIFICATION_ATTEMPTS = 5;

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

async function markNotificationAsProcessing(record: NotificationRecord) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications_outbox")
    .update({
      status: "processing",
      attempts: record.attempts + 1,
      last_attempt_at: now,
      error_message: null
    })
    .eq("id", record.id);

  if (error) {
    throw new Error(`Nao foi possivel marcar a notificacao como em processamento: ${error.message}`);
  }

  return now;
}

async function markNotificationAsSent(id: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications_outbox")
    .update({
      status: "sent",
      sent_at: now,
      error_message: null
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
      error_message: truncateErrorMessage(reason)
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Nao foi possivel marcar a notificacao como ignorada: ${error.message}`);
  }
}

async function markNotificationAsFailed(
  record: NotificationRecord,
  processingTimestamp: string,
  errorMessage: string
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
      error_message: truncateErrorMessage(errorMessage)
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
    // Nao-bloqueante: falha no log nao interrompe o envio
    console.warn(
      "[notifications.history] Falha ao registrar historico de envio:",
      logError instanceof Error ? logError.message : String(logError)
    );
  }
}

async function processNotification(record: NotificationRecord) {
  const processingTimestamp = await markNotificationAsProcessing(record);

  if (record.template_key === "client-invite") {
    await markNotificationAsSkipped(
      record.id,
      "Convite principal enviado pelo fluxo nativo do Supabase Auth."
    );
    return {
      id: record.id,
      status: "skipped" as const
    };
  }

  const channel = record.channel || "email";

  try {
    if (channel === "email") {
      const renderedEmail = renderNotificationEmail(record);
      await routeNotificationByChannel("email", {
        to: record.recipient_email,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text
      });
    } else {
      // Canais futuros (whatsapp, noemia): roteador lanca erro informativo
      await routeNotificationByChannel(channel, {
        to: record.recipient_email,
        subject: record.subject,
        html: "",
        text: ""
      });
    }

    await markNotificationAsSent(record.id);
    await logNotificationSentToHistory(record);

    return {
      id: record.id,
      status: "sent" as const
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha desconhecida ao enviar notificacao.";
    await markNotificationAsFailed(record, processingTimestamp, message);

    return {
      id: record.id,
      status: "failed" as const,
      error: message
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
    results
  };
}
