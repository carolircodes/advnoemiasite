import assert from "node:assert/strict";
import test from "node:test";

import {
  getNotificationAudienceMatrix,
  getNotificationPolicy,
  getNotificationReadiness,
  resolveNotificationAvailability,
  resolveNotificationChannelAvailability
} from "../lib/notifications/policy.ts";

test("notification governance keeps push disabled until runtime is ready", () => {
  const readiness = getNotificationReadiness();

  assert.equal(readiness.pushPwaEnabled, false);
  assert.match(readiness.pushPwaReason, /service worker/i);
});

test("notification governance defers non-urgent client alerts during quiet hours", () => {
  const policy = getNotificationPolicy("client.document.pending");
  const result = resolveNotificationAvailability({
    now: new Date("2026-04-25T01:30:00.000Z"),
    policy,
    preference: {
      timezone: "America/Fortaleza",
      quietHoursStart: 21,
      quietHoursEnd: 8,
      emailEnabled: true,
      whatsappEnabled: true,
      pushEnabled: false,
      eventOverrides: {}
    }
  });

  assert.equal(result.deferred, true);
  assert.equal(result.reason, "deferred_quiet_hours");
});

test("notification governance bypasses quiet hours for urgent operational handoff", () => {
  const policy = getNotificationPolicy("operations.handoff.human");
  const result = resolveNotificationAvailability({
    now: new Date("2026-04-25T01:30:00.000Z"),
    policy,
    preference: {
      timezone: "America/Fortaleza",
      quietHoursStart: 22,
      quietHoursEnd: 7,
      emailEnabled: true,
      whatsappEnabled: true,
      pushEnabled: false,
      eventOverrides: {}
    }
  });

  assert.equal(result.deferred, false);
  assert.equal(result.reason, "eligible_now");
});

test("notification governance explains why push is not eligible yet", () => {
  const result = resolveNotificationChannelAvailability("push", {
    timezone: "America/Fortaleza",
    quietHoursStart: 21,
    quietHoursEnd: 8,
    emailEnabled: true,
    whatsappEnabled: true,
    pushEnabled: true,
    eventOverrides: {}
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "push_not_ready");
});

test("notification governance exposes a canonical audience matrix", () => {
  const matrix = getNotificationAudienceMatrix();

  assert.equal(matrix.client.some((item) => item.eventKey === "client.document.pending"), true);
  assert.equal(matrix.operations.some((item) => item.eventKey === "operations.handoff.human"), true);
  assert.equal(matrix.lawyer.length, 0);
});
