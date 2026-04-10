"use client";

import { useEffect, useState } from "react";

import {
  trackProductEvent,
  trackProductEventOncePerSession
} from "../lib/analytics/browser";

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
  
  // Aguardar hidratação completa antes de executar qualquer código client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Só executar após hidratação e se estiver no client-side
    if (!isClient || typeof window === "undefined") {
      return;
    }

    try {
      console.log("[ProductEventBeacon] useEffect executado no client-side");
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
      console.error("[ProductEventBeacon] Erro ao rastrear evento:", error);
      // Não quebrar a aplicação se tracking falhar
    }
  }, [isClient, eventGroup, eventKey, oncePerSession, payload]);

  // Não renderizar nada durante SSR/hidratação
  return null;
}
