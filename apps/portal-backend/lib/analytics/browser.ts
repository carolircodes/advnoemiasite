"use client";

const SESSION_STORAGE_KEY = "portal_product_session_id";
const SESSION_FLAG_PREFIX = "portal_product_flag:";

type ProductEventPayload = {
  eventKey: string;
  eventGroup?: string;
  pagePath?: string;
  payload?: Record<string, unknown>;
};

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

export function getProductSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    // Verificar se localStorage está disponível
    const testKey = "__test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    
    const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (existingSessionId) {
      return existingSessionId;
    }

    const nextSessionId = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    return nextSessionId;
  } catch (error) {
    console.warn("[Analytics] localStorage não disponível, usando session ID temporário");
    return createSessionId();
  }
}

export function trackProductEvent(input: ProductEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    eventKey: input.eventKey,
    eventGroup: input.eventGroup || "conversion",
    pagePath: input.pagePath || window.location.pathname,
    sessionId: getProductSessionId(),
    payload: input.payload || {}
  });

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon(
      "/api/public/events",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  void fetch("/api/public/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  }).catch(() => undefined);
}

export function trackProductEventOncePerSession(input: ProductEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const flagKey = `${SESSION_FLAG_PREFIX}${input.eventKey}`;

  try {
    // Verificar se sessionStorage está disponível
    const testKey = "__test__";
    window.sessionStorage.setItem(testKey, "test");
    window.sessionStorage.removeItem(testKey);
    
    if (window.sessionStorage.getItem(flagKey)) {
      return;
    }

    window.sessionStorage.setItem(flagKey, "1");
  } catch (error) {
    console.warn("[Analytics] sessionStorage não disponível, tracking mesmo assim");
  }

  trackProductEvent(input);
}
