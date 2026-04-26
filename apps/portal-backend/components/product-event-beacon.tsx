"use client";

import { useEffect, useState } from "react";

import {
  trackProductEvent,
  trackProductEventOncePerSession
} from "../lib/analytics/browser.ts";

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") {
      return;
    }

    try {
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
    } catch (error) {
      console.warn("[product-event-beacon] tracking_failed", {
        eventKey,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [isClient, eventGroup, eventKey, oncePerSession, payload]);

  return null;
}
