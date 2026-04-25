"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NotificationJourneyBeaconProps = {
  completeOnViewEventKeys?: string[];
};

function rememberOnce(flag: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(flag)) {
      return false;
    }

    window.sessionStorage.setItem(flag, "1");
    return true;
  } catch {
    return true;
  }
}

async function postInteraction(body: Record<string, unknown>) {
  try {
    await fetch("/api/notifications/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch {
    // Tracking de utilidade nunca deve interromper a pagina.
  }
}

export function NotificationJourneyBeacon({
  completeOnViewEventKeys = []
}: NotificationJourneyBeaconProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const notificationId = searchParams.get("notification");
    const notificationEvent = searchParams.get("notification_event");

    if (!notificationId) {
      return;
    }

    const openedFlag = `notification-opened:${notificationId}:${pathname}`;
    if (rememberOnce(openedFlag)) {
      void postInteraction({
        notificationId,
        interactionType: "deep_link_opened",
        pagePath: pathname,
        metadata: {
          notificationEvent,
          source: searchParams.get("notification_source") || "notification"
        }
      });
    }

    if (notificationEvent && completeOnViewEventKeys.includes(notificationEvent)) {
      const completedFlag = `notification-completed:${notificationId}:${pathname}`;
      if (rememberOnce(completedFlag)) {
        void postInteraction({
          notificationId,
          interactionType: "action_completed",
          pagePath: pathname,
          metadata: {
            notificationEvent,
            source: searchParams.get("notification_source") || "notification",
            completionMode: "page_view"
          }
        });
      }
    }
  }, [completeOnViewEventKeys, pathname, searchParams]);

  return null;
}
