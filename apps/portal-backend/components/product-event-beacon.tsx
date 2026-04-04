"use client";

import { useEffect } from "react";

import {
  trackProductEvent,
  trackProductEventOncePerSession
} from "@/lib/analytics/browser";

type ProductEventBeaconProps = {
  eventKey: string;
  eventGroup?: string;
  payload?: Record<string, unknown>;
  oncePerSession?: boolean;
};

export function ProductEventBeacon({
  eventKey,
  eventGroup,
  payload,
  oncePerSession = false
}: ProductEventBeaconProps) {
  useEffect(() => {
    const input = {
      eventKey,
      eventGroup,
      payload
    };

    if (oncePerSession) {
      trackProductEventOncePerSession(input);
      return;
    }

    trackProductEvent(input);
  }, [eventGroup, eventKey, oncePerSession, payload]);

  return null;
}
