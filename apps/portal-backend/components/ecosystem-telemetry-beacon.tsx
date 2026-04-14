"use client";

import { useEffect } from "react";

import { trackProductEventOncePerSession } from "@/lib/analytics/browser";

type EcosystemTelemetryBeaconProps = {
  eventKey:
    | "product_viewed"
    | "product_selected"
    | "plan_viewed"
    | "access_granted"
    | "access_revoked"
    | "access_restored"
    | "subscription_interest"
    | "subscription_started"
    | "subscription_active"
    | "subscription_renewed"
    | "subscription_paused"
    | "subscription_canceled"
    | "content_unlocked"
    | "content_started"
    | "content_completed"
    | "member_joined"
    | "member_retained"
    | "community_viewed"
    | "retention_signal"
    | "content_continuity_signal"
    | "churn_risk"
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
