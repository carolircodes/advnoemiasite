import "server-only";

import { traceOperationalEvent } from "../observability/operational-trace";
import { createAdminSupabaseClient } from "../supabase/admin";
import {
  getDefaultPreferenceForAudience,
  getNotificationPolicy,
  resolveNotificationAvailability,
  resolveNotificationChannelAvailability,
  resolveNotificationEventPreference,
  type NotificationAudience,
  type NotificationChannel,
  type NotificationEventKey,
  type NotificationPreferenceSnapshot,
  type NotificationPriority
} from "./policy";
import {
  assessPushPilotSubscriptionEligibility,
  isPushPilotChannelAllowedForEvent
} from "./push-pilot";

type QueueGovernedNotificationInput = {
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  recipientProfileId?: string | null;
  recipientAddress: string;
  subject: string;
  templateKey: string;
  payload: Record<string, unknown>;
  relatedTable: string;
  relatedId?: string | null;
  actionLabel?: string;
  actionPath?: string;
  dedupKey?: string;
  cooldownMinutes?: number;
  expiresAt?: string | null;
  decisionContext?: Record<string, unknown>;
};

type NotificationPreferenceRow = {
  timezone: string | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  email_enabled: boolean | null;
  whatsapp_enabled: boolean | null;
  push_enabled: boolean | null;
  event_overrides: Record<string, unknown> | null;
};

export type GovernedOutboxResult = {
  id: string;
  status: string;
  audience: NotificationAudience;
  priority: NotificationPriority;
  canonicalEventKey: NotificationEventKey;
  governanceReason: string;
  availableAt: string;
  actionLabel: string;
  actionUrl: string;
};

function buildFallbackDedupKey(input: QueueGovernedNotificationInput) {
  return [
    input.eventKey,
    input.channel,
    input.recipientProfileId || input.recipientAddress,
    input.relatedTable,
    input.relatedId || "none"
  ].join(":");
}

function buildExpiresAt(input: QueueGovernedNotificationInput, defaultMinutes: number) {
  if (input.expiresAt) {
    return input.expiresAt;
  }

  return new Date(Date.now() + defaultMinutes * 60_000).toISOString();
}

async function loadNotificationPreference(
  recipientProfileId: string | null | undefined,
  audience: NotificationAudience
): Promise<{
  preference: NotificationPreferenceSnapshot;
  source: "default" | "stored";
}> {
  const fallback = getDefaultPreferenceForAudience(audience);

  if (!recipientProfileId) {
    return {
      preference: fallback,
      source: "default"
    };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "timezone,quiet_hours_start,quiet_hours_end,email_enabled,whatsapp_enabled,push_enabled,event_overrides"
    )
    .eq("profile_id", recipientProfileId)
    .maybeSingle<NotificationPreferenceRow>();

  if (error || !data) {
    return {
      preference: fallback,
      source: "default"
    };
  }

  return {
    source: "stored",
    preference: {
      timezone: data.timezone || fallback.timezone,
      quietHoursStart: data.quiet_hours_start ?? fallback.quietHoursStart,
      quietHoursEnd: data.quiet_hours_end ?? fallback.quietHoursEnd,
      emailEnabled: data.email_enabled ?? fallback.emailEnabled,
      whatsappEnabled: data.whatsapp_enabled ?? fallback.whatsappEnabled,
      pushEnabled: data.push_enabled ?? fallback.pushEnabled,
      eventOverrides: data.event_overrides || fallback.eventOverrides
    }
  };
}

async function findRecentDuplicate(dedupKey: string, cooldownMinutes: number) {
  const supabase = createAdminSupabaseClient();
  const threshold = new Date(Date.now() - cooldownMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("notifications_outbox")
    .select("id,status,created_at")
    .eq("dedup_key", dedupKey)
    .in("status", ["pending", "processing", "sent"])
    .gte("created_at", threshold)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Nao foi possivel verificar deduplicacao da notificacao: ${error.message}`);
  }

  return data || null;
}

export async function queueGovernedNotification(
  input: QueueGovernedNotificationInput
): Promise<GovernedOutboxResult> {
  const policy = getNotificationPolicy(input.eventKey);
  const { preference, source: preferenceSource } = await loadNotificationPreference(
    input.recipientProfileId,
    policy.audience
  );
  const eventPreference = resolveNotificationEventPreference(input.eventKey, preference);
  const channelEligibility = resolveNotificationChannelAvailability(input.channel, preference);
  const dedupKey = input.dedupKey || buildFallbackDedupKey(input);
  const cooldownMinutes = input.cooldownMinutes ?? policy.cooldownMinutes;
  const duplicate = await findRecentDuplicate(dedupKey, cooldownMinutes);
  const availability = resolveNotificationAvailability({
    policy,
    preference
  });
  const pushPilotEligibility =
    input.channel === "push"
      ? await assessPushPilotSubscriptionEligibility({
          profileId: input.recipientProfileId,
          eventKey: input.eventKey,
          audience: policy.audience
        })
      : null;
  const expiresAt = buildExpiresAt(input, policy.expiresAfterMinutes);
  const actionLabel = input.actionLabel || policy.actionLabel;
  const actionUrl = input.actionPath || policy.actionPath;

  let status = "pending";
  let governanceReason = availability.reason;
  const channelActiveNow =
    policy.activeChannelsNow.includes(input.channel)
    || (input.channel === "push" && isPushPilotChannelAllowedForEvent(input.eventKey));

  if (!channelActiveNow) {
    status = "blocked";
    governanceReason = "channel_not_in_active_policy";
  } else if (input.channel === "push" && pushPilotEligibility && !pushPilotEligibility.eligible) {
    status = "blocked";
    governanceReason = pushPilotEligibility.reason;
  } else if (!eventPreference.enabled) {
    status = "blocked";
    governanceReason = eventPreference.reason;
  } else if (!channelEligibility.eligible) {
    status = "blocked";
    governanceReason = channelEligibility.reason;
  } else if (duplicate) {
    status = "blocked";
    governanceReason = "deduplicated_within_cooldown";
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notifications_outbox")
    .insert({
      event_type: input.eventKey,
      channel: input.channel,
      recipient_profile_id: input.recipientProfileId || null,
      recipient_email: input.recipientAddress,
      subject: input.subject,
      template_key: input.templateKey,
      payload: input.payload,
      related_table: input.relatedTable,
      related_id: input.relatedId || null,
      status,
      available_at: availability.availableAt,
      audience: policy.audience,
      priority: policy.priority,
      canonical_event_key: input.eventKey,
      action_label: actionLabel,
      action_url: actionUrl,
      dedup_key: dedupKey,
      governance_reason: governanceReason,
      cooldown_until: new Date(Date.now() + cooldownMinutes * 60_000).toISOString(),
      expires_at: expiresAt,
      decision_context: {
        ...input.decisionContext,
        policySummary: policy.summary,
        futureChannels: policy.futureChannels,
        preferenceSource,
        eventPreference: eventPreference.reason,
        channelEligibility: channelEligibility.reason,
        pushPilotEligibility: pushPilotEligibility?.reason || null,
        pushSubscriptionCount: pushPilotEligibility?.activeSubscriptions || 0,
        duplicateNotificationId: duplicate?.id || null
      }
    })
    .select(
      "id,status,audience,priority,canonical_event_key,governance_reason,available_at,action_label,action_url"
    )
    .single();

  if (error || !data) {
    throw new Error(`Nao foi possivel adicionar a notificacao governada a fila: ${error?.message}`);
  }

  traceOperationalEvent(
    status === "blocked" ? "warn" : availability.deferred ? "warn" : "info",
    status === "blocked"
      ? "NOTIFICATION_BLOCKED"
      : availability.deferred
        ? "NOTIFICATION_DEFERRED"
        : "NOTIFICATION_ELIGIBLE",
    {
      service: "notifications_governance",
      action: "queue",
      clientId: input.recipientProfileId || null,
      channel: input.channel,
      decisionState: status,
      outcome: status === "blocked" ? "suppressed" : availability.deferred ? "deferred" : "queued"
    },
    {
      notificationId: data.id,
      canonicalEventKey: input.eventKey,
      audience: policy.audience,
      priority: policy.priority,
      governanceReason,
      preferenceSource,
      actionUrl,
      relatedTable: input.relatedTable,
      relatedId: input.relatedId || null
    }
  );

  return {
    id: data.id,
    status: data.status,
    audience: data.audience as NotificationAudience,
    priority: data.priority as NotificationPriority,
    canonicalEventKey: data.canonical_event_key as NotificationEventKey,
    governanceReason: data.governance_reason,
    availableAt: data.available_at,
    actionLabel: data.action_label,
    actionUrl: data.action_url
  };
}
