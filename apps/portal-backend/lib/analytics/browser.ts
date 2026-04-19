"use client";

import {
  buildBrowserEventPayload,
  normalizeProductEventInput
} from "./funnel-events";

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

function canUseStorage(storage: Storage) {
  try {
    const testKey = "__portal_analytics_storage__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getProductSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  if (!canUseStorage(window.localStorage)) {
    return createSessionId();
  }

  const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

function buildRequestBody(input: ProductEventPayload) {
  const pagePath = input.pagePath || window.location.pathname;
  const normalized = normalizeProductEventInput({
    eventKey: input.eventKey,
    eventGroup: input.eventGroup,
    pagePath,
    sessionId: getProductSessionId(),
    payload: buildBrowserEventPayload({
      payload: input.payload,
      pagePath,
      pageTitle: document.title,
      referrer: document.referrer || undefined,
      searchParams: new URLSearchParams(window.location.search)
    })
  });

  return JSON.stringify({
    eventKey: normalized.eventKey,
    eventGroup: normalized.eventGroup,
    pagePath: normalized.pagePath,
    sessionId: normalized.sessionId,
    payload: normalized.payload
  });
}

export function trackProductEvent(input: ProductEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const body = buildRequestBody(input);
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `evt-${Date.now()}`;

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
      "Content-Type": "application/json",
      "x-request-id": requestId,
      "x-product-session-id": getProductSessionId()
    },
    body
  }).catch(() => undefined);
}

export function trackProductEventOncePerSession(input: ProductEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  if (!canUseStorage(window.sessionStorage)) {
    trackProductEvent(input);
    return;
  }

  const flagKey = `${SESSION_FLAG_PREFIX}${input.eventKey}`;

  if (window.sessionStorage.getItem(flagKey)) {
    return;
  }

  window.sessionStorage.setItem(flagKey, "1");
  trackProductEvent(input);
}
