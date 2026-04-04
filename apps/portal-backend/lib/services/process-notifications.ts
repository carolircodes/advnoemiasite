import "server-only";

import { renderNotificationEmail } from "@/lib/notifications/email-templates";
import { sendNotificationEmail } from "@/lib/notifications/email-delivery";
import { runOperationalAutomationRules } from "@/lib/services/automation-rules";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_NOTIFICATION_ATTEMPTS = 5;

type NotificationRecord = {
  id: string;
  event_type: string;
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

  try {
    const renderedEmail = renderNotificationEmail(record);
    await sendNotificationEmail({
      to: record.recipient_email,
      subject: renderedEmail.subject,
      html: renderedEmail.html,
      text: renderedEmail.text
    });
    await markNotificationAsSent(record.id);

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
      "id,event_type,recipient_email,subject,template_key,payload,status,attempts,available_at"
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
