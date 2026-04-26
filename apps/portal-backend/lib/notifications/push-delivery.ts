import "server-only";

import webpush from "web-push";

import { getServerEnv } from "../config/env.ts";
import { traceOperationalEvent } from "../observability/operational-trace.ts";
import {
  listActivePushPilotSubscriptions,
  markPushPilotSubscriptionDeliveryResult
} from "./push-pilot.ts";
import { buildNotificationRedirectPath } from "./notification-links.ts";

type PushNotificationRecord = {
  id: string;
  canonical_event_key: string | null;
  audience: string | null;
  priority: string | null;
  recipient_profile_id: string | null;
  subject: string;
  payload: Record<string, unknown> | null;
};

function getPushBody(record: PushNotificationRecord) {
  const explicitBody = record.payload?.pushBody;
  if (typeof explicitBody === "string" && explicitBody.trim().length > 0) {
    return explicitBody.trim();
  }

  const summary = record.payload?.publicSummary;
  if (typeof summary === "string" && summary.trim().length > 0) {
    return summary.trim().slice(0, 180);
  }

  return "Existe uma atualizacao importante aguardando voce no portal.";
}

function buildPushHref(notificationId: string) {
  const appUrl = new URL(getServerEnv().NEXT_PUBLIC_APP_URL);
  return new URL(buildNotificationRedirectPath(notificationId), appUrl).toString();
}

function configureWebPush() {
  const env = getServerEnv();
  const publicKey = env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = env.PUSH_VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("Chaves VAPID ausentes para envio do piloto push.");
  }

  webpush.setVapidDetails(
    env.NEXT_PUBLIC_APP_URL,
    publicKey,
    privateKey
  );
}

function isRevokedByProvider(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : null;

  return statusCode === 404 || statusCode === 410;
}

export async function sendPilotPushNotification(record: PushNotificationRecord) {
  if (!record.recipient_profile_id) {
    throw new Error("Notificacao push sem recipient_profile_id nao pode ser enviada.");
  }

  configureWebPush();

  const subscriptions = await listActivePushPilotSubscriptions(record.recipient_profile_id);
  if (!subscriptions.length) {
    throw new Error("Nenhuma subscription ativa encontrada para o piloto push.");
  }

  const payload = JSON.stringify({
    title: record.subject,
    body: getPushBody(record),
    href: buildPushHref(record.id),
    notificationId: record.id,
    eventKey: record.canonical_event_key,
    priority: record.priority
  });

  let sentCount = 0;
  const failures: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        },
        payload,
        {
          TTL: 60 * 60,
          urgency:
            record.priority === "critical" || record.priority === "urgent"
              ? "high"
              : "normal",
          topic: record.id
        }
      );

      sentCount += 1;
      await markPushPilotSubscriptionDeliveryResult({
        endpoint: subscription.endpoint,
        status: "active"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      failures.push(errorMessage);

      await markPushPilotSubscriptionDeliveryResult({
        endpoint: subscription.endpoint,
        status: isRevokedByProvider(error) ? "revoked" : "failed",
        errorMessage
      });

      traceOperationalEvent(
        isRevokedByProvider(error) ? "warn" : "error",
        isRevokedByProvider(error)
          ? "NOTIFICATION_PUSH_SUBSCRIPTION_INVALID"
          : "NOTIFICATION_PUSH_DELIVERY_FAILED",
        {
          service: "notifications_push_pilot",
          action: "send",
          clientId: record.recipient_profile_id,
          outcome: isRevokedByProvider(error) ? "revoked" : "failed"
        },
        {
          notificationId: record.id,
          subscriptionId: subscription.id,
          canonicalEventKey: record.canonical_event_key
        },
        error
      );
    }
  }

  if (!sentCount) {
    throw new Error(
      failures[0] || "Falha ao enviar o push do piloto para todas as subscriptions elegiveis."
    );
  }

  traceOperationalEvent(
    "info",
    "NOTIFICATION_PUSH_SENT",
    {
      service: "notifications_push_pilot",
      action: "send",
      clientId: record.recipient_profile_id,
      outcome: "sent"
    },
    {
      notificationId: record.id,
      canonicalEventKey: record.canonical_event_key,
      audience: record.audience,
      priority: record.priority,
      sentSubscriptions: sentCount,
      failedSubscriptions: failures.length
    }
  );
}
