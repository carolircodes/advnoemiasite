import "server-only";

import type { PortalProfile } from "../auth/guards.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";
import { getClientNotificationControls, getInternalNotificationControls } from "./preference-catalog.ts";
import {
  getDefaultPreferenceForAudience,
  type NotificationAudience,
  type NotificationEventKey,
  type NotificationPreferenceSnapshot
} from "./policy.ts";

type NotificationPreferenceRow = {
  profile_id: string;
  timezone: string | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  email_enabled: boolean | null;
  whatsapp_enabled: boolean | null;
  push_enabled: boolean | null;
  event_overrides: Record<string, unknown> | null;
};

export type NotificationPreferenceFormState = {
  audience: NotificationAudience;
  timezone: string;
  quietModeEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  pushPilotInterested: boolean;
  eventOverrides: Record<NotificationEventKey, boolean>;
};

export function resolveNotificationAudienceForProfile(profile: Pick<PortalProfile, "role">) {
  return profile.role === "cliente" ? "client" : "operations";
}

function buildEventOverrideMap(
  audience: NotificationAudience,
  rawOverrides: Record<string, unknown> | null | undefined
) {
  const controls =
    audience === "client" ? getClientNotificationControls() : getInternalNotificationControls();
  const overrides = rawOverrides || {};

  return controls.reduce(
    (acc, control) => {
      const rawValue = overrides[control.eventKey];
      acc[control.eventKey] =
        typeof rawValue === "boolean" ? rawValue : control.defaultEnabled;
      return acc;
    },
    {} as Record<NotificationEventKey, boolean>
  );
}

function normalizePreferenceRow(
  audience: NotificationAudience,
  row: NotificationPreferenceRow | null
): NotificationPreferenceFormState {
  const fallback = getDefaultPreferenceForAudience(audience);
  const quietHoursStart = row?.quiet_hours_start ?? fallback.quietHoursStart;
  const quietHoursEnd = row?.quiet_hours_end ?? fallback.quietHoursEnd;

  return {
    audience,
    timezone: row?.timezone || fallback.timezone,
    quietModeEnabled: quietHoursStart !== quietHoursEnd,
    emailEnabled: row?.email_enabled ?? fallback.emailEnabled,
    whatsappEnabled: row?.whatsapp_enabled ?? fallback.whatsappEnabled,
    pushPilotInterested: row?.push_enabled ?? fallback.pushEnabled,
    eventOverrides: buildEventOverrideMap(audience, row?.event_overrides)
  };
}

export function buildNotificationPreferenceSnapshot(
  state: NotificationPreferenceFormState
): NotificationPreferenceSnapshot {
  const fallback = getDefaultPreferenceForAudience(state.audience);

  return {
    timezone: state.timezone,
    quietHoursStart: state.quietModeEnabled ? fallback.quietHoursStart : 0,
    quietHoursEnd: state.quietModeEnabled ? fallback.quietHoursEnd : 0,
    emailEnabled: state.emailEnabled,
    whatsappEnabled: state.whatsappEnabled,
    pushEnabled: state.pushPilotInterested,
    eventOverrides: state.eventOverrides
  };
}

export async function loadNotificationPreferenceState(profile: Pick<PortalProfile, "id" | "role">) {
  const supabase = createAdminSupabaseClient();
  const audience = resolveNotificationAudienceForProfile(profile);
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "profile_id,timezone,quiet_hours_start,quiet_hours_end,email_enabled,whatsapp_enabled,push_enabled,event_overrides"
    )
    .eq("profile_id", profile.id)
    .maybeSingle<NotificationPreferenceRow>();

  if (error) {
    throw new Error(`Nao foi possivel carregar as preferencias de notificacao: ${error.message}`);
  }

  return {
    source: data ? ("stored" as const) : ("default" as const),
    state: normalizePreferenceRow(audience, data || null)
  };
}

export async function saveNotificationPreferenceState(input: {
  actorProfile: Pick<PortalProfile, "id" | "role" | "email">;
  state: NotificationPreferenceFormState;
}) {
  const supabase = createAdminSupabaseClient();
  const fallback = getDefaultPreferenceForAudience(input.state.audience);
  const snapshot = buildNotificationPreferenceSnapshot(input.state);
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      profile_id: input.actorProfile.id,
      timezone: snapshot.timezone,
      quiet_hours_start: snapshot.quietHoursStart,
      quiet_hours_end: snapshot.quietHoursEnd,
      email_enabled: snapshot.emailEnabled,
      whatsapp_enabled: snapshot.whatsappEnabled,
      push_enabled: snapshot.pushEnabled,
      event_overrides: snapshot.eventOverrides
    },
    {
      onConflict: "profile_id"
    }
  );

  if (error) {
    throw new Error(`Nao foi possivel salvar as preferencias de notificacao: ${error.message}`);
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: input.actorProfile.id,
    action: "notification_preferences.updated",
    entity_type: "notification_preferences",
    entity_id: input.actorProfile.id,
    payload: {
      audience: input.state.audience,
      quietModeEnabled: input.state.quietModeEnabled,
      emailEnabled: snapshot.emailEnabled,
      whatsappEnabled: snapshot.whatsappEnabled,
      pushPilotInterested: snapshot.pushEnabled,
      fallbackQuietHours: {
        start: fallback.quietHoursStart,
        end: fallback.quietHoursEnd
      },
      eventOverrides: snapshot.eventOverrides
    }
  });

  return snapshot;
}
