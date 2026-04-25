import assert from "node:assert/strict";
import test from "node:test";

import {
  appendNotificationContext,
  buildNotificationRedirectPath,
  buildSafeNotificationTarget
} from "../lib/notifications/notification-links.ts";
import { getClientNotificationControls } from "../lib/notifications/preference-catalog.ts";
import {
  getDefaultPreferenceForAudience,
  resolveNotificationEventPreference
} from "../lib/notifications/policy.ts";

test("notification links route CTAs through a safe redirect context", () => {
  assert.equal(buildNotificationRedirectPath("abc-123"), "/n/abc-123");

  const safe = buildSafeNotificationTarget({
    rawTarget: "/documentos?scope=requests",
    fallbackPath: "/cliente",
    appOrigin: "https://portal.advnoemia.com.br"
  });
  appendNotificationContext(safe, {
    notificationId: "notif-1",
    eventKey: "client.document.pending",
    source: "email"
  });

  assert.equal(
    safe.toString(),
    "https://portal.advnoemia.com.br/documentos?scope=requests&notification=notif-1&notification_event=client.document.pending&notification_source=email"
  );
});

test("notification links reject offsite targets and fall back to the portal", () => {
  const blockedExternal = buildSafeNotificationTarget({
    rawTarget: "https://example.com/offsite",
    fallbackPath: "/cliente",
    appOrigin: "https://portal.advnoemia.com.br"
  });

  assert.equal(blockedExternal.toString(), "https://portal.advnoemia.com.br/cliente");
});

test("notification event preferences can suppress a canonical alert", () => {
  const preference = getDefaultPreferenceForAudience("client");
  preference.eventOverrides = {
    "client.document.pending": false
  };

  assert.deepEqual(resolveNotificationEventPreference("client.document.pending", preference), {
    enabled: false,
    reason: "event_preference_disabled"
  });
  assert.deepEqual(resolveNotificationEventPreference("client.document.available", preference), {
    enabled: true,
    reason: "event_preference_default"
  });
});

test("client preference catalog exposes the premium controls we expect", () => {
  const clientControls = getClientNotificationControls();

  assert.equal(clientControls.length >= 5, true);
  assert.equal(
    clientControls.some((item) => item.eventKey === "client.payment.confirmed"),
    true
  );
});
