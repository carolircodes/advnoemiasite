"use client";

import { useEffect } from "react";

import { trackProductEventOncePerSession } from "@/lib/analytics/browser";

type EcosystemTelemetryBeaconProps = {
  eventKey:
    | "product_viewed"
    | "product_selected"
    | "plan_viewed"
    | "subscription_interest"
    | "content_unlocked"
    | "content_started"
    | "member_joined"
    | "retention_signal"
    | "expansion_revenue_signal"
    | "recurring_revenue_signal";
  payload?: Record<string, unknown>;
};

export function EcosystemTelemetryBeacon({
  eventKey,
  payload = {}
}: EcosystemTelemetryBeaconProps) {
  useEffect(() => {
    trackProductEventOncePerSession({
      eventKey,
      eventGroup: "ecosystem",
      payload
    });
  }, [eventKey, payload]);

  return null;
}
