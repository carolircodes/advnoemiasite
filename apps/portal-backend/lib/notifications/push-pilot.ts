import { getServerEnv } from "../config/env.ts";
import { traceOperationalEvent } from "../observability/operational-trace.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";
import type { NotificationAudience, NotificationEventKey } from "./policy.ts";

const PUSH_PILOT_CANDIDATES: NotificationEventKey[] = [
  "client.appointment.reminder",
  "client.document.available"
];

type PushPilotSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  device_label: string | null;
  platform: string | null;
  status: "pending" | "active" | "revoked" | "failed";
  last_seen_at: string | null;
  last_tested_at: string | null;
  last_error: string | null;
  updated_at: string;
};

export type PushPilotSubscriptionInput = {
  profileId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  deviceLabel?: string | null;
  platform?: string | null;
};

export type PushPilotSubscriptionStatus = {
  hasActiveSubscription: boolean;
  activeSubscriptions: number;
  revokedSubscriptions: number;
  lastSeenAt: string | null;
  lastTestedAt: string | null;
};

type PushPilotEligibility = {
  eligible: boolean;
  reason:
    | "push_pilot_ready"
    | "push_pilot_disabled"
    | "push_vapid_missing"
    | "push_audience_not_eligible"
    | "push_event_not_in_pilot"
    | "push_profile_missing"
    | "push_subscription_missing";
  activeSubscriptions: number;
};

function hasNonEmptyEnv(name: "NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY" | "PUSH_VAPID_PRIVATE_KEY") {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export function getPushPilotCandidates() {
  return PUSH_PILOT_CANDIDATES;
}

export function isPushPilotCandidate(eventKey: NotificationEventKey) {
  return PUSH_PILOT_CANDIDATES.includes(eventKey);
}

export function isPushPilotActivationFlagEnabled() {
  return process.env.NOTIFICATIONS_PUSH_PILOT_ENABLED === "true";
}

export function hasPushPilotVapidKeys() {
  return (
    hasNonEmptyEnv("NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY")
    && hasNonEmptyEnv("PUSH_VAPID_PRIVATE_KEY")
  );
}

export function isPushPilotRuntimeReady() {
  return isPushPilotActivationFlagEnabled() && hasPushPilotVapidKeys();
}

export function isPushPilotChannelAllowedForEvent(eventKey: NotificationEventKey) {
  return isPushPilotRuntimeReady() && isPushPilotCandidate(eventKey);
}

async function countSubscriptionsByStatus(profileId?: string) {
  const supabase = createAdminSupabaseClient();
  let activeQuery = supabase
    .from("notification_push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  let revokedQuery = supabase
    .from("notification_push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "revoked");

  if (profileId) {
    activeQuery = activeQuery.eq("profile_id", profileId);
    revokedQuery = revokedQuery.eq("profile_id", profileId);
  }

  const [{ count: activeCount, error: activeError }, { count: revokedCount, error: revokedError }] =
    await Promise.all([activeQuery, revokedQuery]);

  if (activeError || revokedError) {
    throw new Error(activeError?.message || revokedError?.message);
  }

  return {
    activeCount: activeCount || 0,
    revokedCount: revokedCount || 0
  };
}

export async function getPushPilotSubscriptionStatus(
  profileId: string
): Promise<PushPilotSubscriptionStatus> {
  const supabase = createAdminSupabaseClient();
  const [{ activeCount, revokedCount }, latestResult] = await Promise.all([
    countSubscriptionsByStatus(profileId),
    supabase
      .from("notification_push_subscriptions")
      .select("last_seen_at,last_tested_at")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (latestResult.error) {
    throw new Error(
      `Nao foi possivel carregar o status das subscriptions push: ${latestResult.error.message}`
    );
  }

  return {
    hasActiveSubscription: activeCount > 0,
    activeSubscriptions: activeCount,
    revokedSubscriptions: revokedCount,
    lastSeenAt: latestResult.data?.last_seen_at || null,
    lastTestedAt: latestResult.data?.last_tested_at || null
  };
}

export async function assessPushPilotSubscriptionEligibility(input: {
  profileId?: string | null;
  eventKey: NotificationEventKey;
  audience: NotificationAudience;
}): Promise<PushPilotEligibility> {
  if (!isPushPilotActivationFlagEnabled()) {
    return {
      eligible: false,
      reason: "push_pilot_disabled",
      activeSubscriptions: 0
    };
  }

  if (!hasPushPilotVapidKeys()) {
    return {
      eligible: false,
      reason: "push_vapid_missing",
      activeSubscriptions: 0
    };
  }

  if (input.audience !== "client") {
    return {
      eligible: false,
      reason: "push_audience_not_eligible",
      activeSubscriptions: 0
    };
  }

  if (!isPushPilotCandidate(input.eventKey)) {
    return {
      eligible: false,
      reason: "push_event_not_in_pilot",
      activeSubscriptions: 0
    };
  }

  if (!input.profileId) {
    return {
      eligible: false,
      reason: "push_profile_missing",
      activeSubscriptions: 0
    };
  }

  const status = await getPushPilotSubscriptionStatus(input.profileId);

  if (!status.hasActiveSubscription) {
    return {
      eligible: false,
      reason: "push_subscription_missing",
      activeSubscriptions: 0
    };
  }

  return {
    eligible: true,
    reason: "push_pilot_ready",
    activeSubscriptions: status.activeSubscriptions
  };
}

export async function listActivePushPilotSubscriptions(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notification_push_subscriptions")
    .select(
      "id,endpoint,p256dh_key,auth_key,device_label,platform,status,last_seen_at,last_tested_at,last_error,updated_at"
    )
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(
      `Nao foi possivel listar as subscriptions ativas do piloto push: ${error.message}`
    );
  }

  return (data || []) as PushPilotSubscriptionRow[];
}

export async function upsertPushPilotSubscription(input: PushPilotSubscriptionInput) {
  getServerEnv();

  if (!isPushPilotRuntimeReady()) {
    throw new Error("Piloto push ainda nao esta pronto para registrar subscriptions.");
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_push_subscriptions")
    .upsert(
      {
        profile_id: input.profileId,
        endpoint: input.endpoint,
        p256dh_key: input.p256dhKey,
        auth_key: input.authKey,
        device_label: input.deviceLabel || null,
        platform: input.platform || null,
        status: "active",
        last_seen_at: now,
        last_tested_at: null,
        last_error: null
      },
      {
        onConflict: "endpoint"
      }
    )
    .select(
      "id,endpoint,p256dh_key,auth_key,device_label,platform,status,last_seen_at,last_tested_at,last_error,updated_at"
    )
    .single();

  if (error || !data) {
    throw new Error(
      `Nao foi possivel registrar a subscription do piloto push: ${error?.message}`
    );
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: input.profileId,
    action: "notification_push.subscription_upserted",
    entity_type: "notification_push_subscriptions",
    entity_id: data.id,
    payload: {
      platform: input.platform || null,
      deviceLabel: input.deviceLabel || null,
      endpointHash: input.endpoint.slice(-24),
      status: "active"
    }
  });

  traceOperationalEvent(
    "info",
    "NOTIFICATION_PUSH_SUBSCRIPTION_UPSERTED",
    {
      service: "notifications_push_pilot",
      action: "subscription_upsert",
      clientId: input.profileId,
      outcome: "active"
    },
    {
      subscriptionId: data.id,
      platform: data.platform,
      deviceLabel: data.device_label
    }
  );

  return data as PushPilotSubscriptionRow;
}

export async function revokePushPilotSubscription(input: {
  profileId: string;
  endpoint?: string | null;
  reason: string;
}) {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("notification_push_subscriptions")
    .update({
      status: "revoked",
      last_error: input.reason
    })
    .eq("profile_id", input.profileId);

  const scopedQuery = input.endpoint ? query.eq("endpoint", input.endpoint) : query;
  const { data, error } = await scopedQuery
    .select("id,endpoint,status")
    .returns<Array<{ id: string; endpoint: string; status: string }>>();

  if (error) {
    throw new Error(
      `Nao foi possivel revogar a subscription do piloto push: ${error.message}`
    );
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: input.profileId,
    action: "notification_push.subscription_revoked",
    entity_type: "notification_push_subscriptions",
    entity_id: data?.[0]?.id || input.profileId,
    payload: {
      endpointHash: input.endpoint ? input.endpoint.slice(-24) : null,
      revokedCount: data?.length || 0,
      reason: input.reason
    }
  });

  traceOperationalEvent(
    "warn",
    "NOTIFICATION_PUSH_SUBSCRIPTION_REVOKED",
    {
      service: "notifications_push_pilot",
      action: "subscription_revoke",
      clientId: input.profileId,
      outcome: "revoked"
    },
    {
      revokedCount: data?.length || 0,
      reason: input.reason
    }
  );

  return data || [];
}

export async function markPushPilotPermissionDecision(input: {
  profileId: string;
  decision: "granted" | "denied" | "default";
}) {
  const supabase = createAdminSupabaseClient();
  await supabase.from("audit_logs").insert({
    actor_profile_id: input.profileId,
    action: "notification_push.permission_decision",
    entity_type: "profiles",
    entity_id: input.profileId,
    payload: {
      decision: input.decision
    }
  });

  traceOperationalEvent(
    input.decision === "denied" ? "warn" : "info",
    "NOTIFICATION_PUSH_PERMISSION_DECISION",
    {
      service: "notifications_push_pilot",
      action: "permission_decision",
      clientId: input.profileId,
      outcome: input.decision
    },
    {
      decision: input.decision
    }
  );
}

export async function markPushPilotSubscriptionDeliveryResult(input: {
  endpoint: string;
  status: "active" | "failed" | "revoked";
  errorMessage?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const patch: Record<string, unknown> = {
    status: input.status,
    last_tested_at: new Date().toISOString(),
    last_error: input.errorMessage || null
  };

  if (input.status === "active") {
    patch.last_seen_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("notification_push_subscriptions")
    .update(patch)
    .eq("endpoint", input.endpoint);

  if (error) {
    throw new Error(
      `Nao foi possivel atualizar o estado da subscription push: ${error.message}`
    );
  }
}

export async function assessPushPilotReadiness() {
  getServerEnv();

  const vapidPublicKeyConfigured = hasNonEmptyEnv("NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY");
  const vapidPrivateKeyConfigured = hasNonEmptyEnv("PUSH_VAPID_PRIVATE_KEY");
  const activationFlag = isPushPilotActivationFlagEnabled();
  const swAssetPrepared = true;

  let subscriptionCount = 0;
  let pilotInterestCount = 0;
  let storageReady = true;
  let storageError: string | null = null;

  try {
    const supabase = createAdminSupabaseClient();
    const [
      { count: subscriptionTotal, error: subscriptionError },
      { count: pilotCount, error: pilotError }
    ] = await Promise.all([
      supabase
        .from("notification_push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("notification_preferences")
        .select("profile_id", { count: "exact", head: true })
        .eq("push_enabled", true)
    ]);

    if (subscriptionError || pilotError) {
      throw new Error(subscriptionError?.message || pilotError?.message);
    }

    subscriptionCount = subscriptionTotal || 0;
    pilotInterestCount = pilotCount || 0;
  } catch (error) {
    storageReady = false;
    storageError = error instanceof Error ? error.message : String(error);
  }

  const runtimeReady =
    activationFlag
    && vapidPublicKeyConfigured
    && vapidPrivateKeyConfigured
    && storageReady
    && swAssetPrepared;

  return {
    status: (runtimeReady ? "pilot_ready" : "not_ready") as "pilot_ready" | "not_ready",
    summary: runtimeReady
      ? "Piloto push pronto para cohort pequeno com opt-in explicito e apenas dois eventos de alto valor."
      : "Push PWA continua em preparo controlado e ainda nao deve ser ativado amplamente.",
    activationFlag,
    vapidPublicKeyConfigured,
    vapidPrivateKeyConfigured,
    swAssetPrepared,
    storageReady,
    storageError,
    subscriptionCount,
    pilotInterestCount,
    pilotCandidates: PUSH_PILOT_CANDIDATES,
    operatorGuidance: activationFlag
      ? "Liberar apenas para lembrete de compromisso e documento liberado, sempre com opt-in explicito e rollback via flag."
      : "Manter piloto desligado ate confirmar cohort, subscription e readiness de browser."
  };
}
