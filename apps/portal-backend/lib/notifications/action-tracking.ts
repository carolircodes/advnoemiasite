import "server-only";

import { traceOperationalEvent } from "../observability/operational-trace";
import { recordProductEvent } from "../services/public-intake";
import { createAdminSupabaseClient } from "../supabase/admin";

export type NotificationInteractionType =
  | "cta_clicked"
  | "deep_link_opened"
  | "action_completed"
  | "expired_without_action";

const INTERACTION_EVENT_KEY: Record<NotificationInteractionType, string> = {
  cta_clicked: "notification_cta_clicked",
  deep_link_opened: "notification_destination_opened",
  action_completed: "notification_action_completed",
  expired_without_action: "notification_expired_without_action"
};

function getOutboxPatch(type: NotificationInteractionType, occurredAt: string) {
  const patch: Record<string, unknown> = {
    last_interaction_at: occurredAt,
    last_interaction_type: type
  };

  if (type === "cta_clicked") {
    patch.last_clicked_at = occurredAt;
  }

  if (type === "deep_link_opened") {
    patch.last_opened_at = occurredAt;
  }

  if (type === "action_completed") {
    patch.last_action_taken_at = occurredAt;
  }

  if (type === "expired_without_action") {
    patch.last_expired_at = occurredAt;
  }

  return patch;
}

export async function recordNotificationInteraction(input: {
  notificationId: string;
  interactionType: NotificationInteractionType;
  profileId?: string | null;
  pagePath?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminSupabaseClient();
  const occurredAt = new Date().toISOString();
  const { data: notification, error: notificationError } = await supabase
    .from("notifications_outbox")
    .select("id,canonical_event_key,audience,priority,recipient_profile_id,related_id")
    .eq("id", input.notificationId)
    .maybeSingle();

  if (notificationError || !notification) {
    throw new Error(
      notificationError?.message || "Notificacao nao encontrada para registrar interacao."
    );
  }

  const profileId = input.profileId || notification.recipient_profile_id || null;
  const { error: insertError } = await supabase.from("notification_interactions").insert({
    notification_id: input.notificationId,
    profile_id: profileId,
    interaction_type: input.interactionType,
    page_path: input.pagePath || null,
    metadata: input.metadata || {}
  });

  if (insertError) {
    throw new Error(
      `Nao foi possivel registrar a interacao da notificacao: ${insertError.message}`
    );
  }

  const { error: updateError } = await supabase
    .from("notifications_outbox")
    .update(getOutboxPatch(input.interactionType, occurredAt))
    .eq("id", input.notificationId);

  if (updateError) {
    throw new Error(
      `Nao foi possivel atualizar o resumo da interacao da notificacao: ${updateError.message}`
    );
  }

  try {
    await recordProductEvent({
      eventKey: INTERACTION_EVENT_KEY[input.interactionType],
      eventGroup: "conversion",
      pagePath: input.pagePath || undefined,
      payload: {
        notificationId: input.notificationId,
        canonicalEventKey: notification.canonical_event_key,
        audience: notification.audience,
        priority: notification.priority,
        relatedId: notification.related_id,
        ...input.metadata
      },
      profileId: profileId || undefined
    });
  } catch (trackingError) {
    console.warn("[notifications.interactions] product_event_failed", {
      notificationId: input.notificationId,
      interactionType: input.interactionType,
      message:
        trackingError instanceof Error ? trackingError.message : String(trackingError)
    });
  }

  traceOperationalEvent(
    "info",
    "NOTIFICATION_INTERACTION_RECORDED",
    {
      service: "notifications_governance",
      action: input.interactionType,
      clientId: profileId,
      outcome: "recorded"
    },
    {
      notificationId: input.notificationId,
      canonicalEventKey: notification.canonical_event_key,
      audience: notification.audience,
      priority: notification.priority,
      pagePath: input.pagePath || null
    }
  );
}
