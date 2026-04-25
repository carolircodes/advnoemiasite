import { getServerEnv } from "../config/env.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";
import type { NotificationEventKey } from "./policy.ts";

const PUSH_PILOT_CANDIDATES: NotificationEventKey[] = [
  "client.appointment.reminder",
  "client.document.available"
];

export function getPushPilotCandidates() {
  return PUSH_PILOT_CANDIDATES;
}

export function isPushPilotCandidate(eventKey: NotificationEventKey) {
  return PUSH_PILOT_CANDIDATES.includes(eventKey);
}

export async function assessPushPilotReadiness() {
  getServerEnv();

  const vapidPublicKeyConfigured =
    typeof process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY === "string" &&
    process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY.trim().length > 0;
  const vapidPrivateKeyConfigured =
    typeof process.env.PUSH_VAPID_PRIVATE_KEY === "string" &&
    process.env.PUSH_VAPID_PRIVATE_KEY.trim().length > 0;
  const activationFlag = process.env.NOTIFICATIONS_PUSH_PILOT_ENABLED === "true";
  const swAssetPrepared = true;

  let subscriptionCount = 0;
  let pilotInterestCount = 0;
  let storageReady = true;
  let storageError: string | null = null;

  try {
    const supabase = createAdminSupabaseClient();
    const [{ count: subscriptionTotal, error: subscriptionError }, { count: pilotCount, error: pilotError }] =
      await Promise.all([
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

  return {
    status:
      activationFlag &&
      vapidPublicKeyConfigured &&
      vapidPrivateKeyConfigured &&
      storageReady &&
      swAssetPrepared
        ? "pilot_ready"
        : "not_ready",
    summary:
      activationFlag &&
      vapidPublicKeyConfigured &&
      vapidPrivateKeyConfigured &&
      storageReady
        ? "Base pronta para piloto controlado, ainda dependente de registro explicito do service worker no cliente."
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
      ? "Liberar apenas para lembrete de compromisso e documento liberado, com cohort pequeno e opt-in explicito."
      : "Manter piloto desligado ate VAPID, subscriptions e registro controlado do service worker estarem prontos."
  };
}
