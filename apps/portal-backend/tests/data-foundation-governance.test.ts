import test from "node:test";
import assert from "node:assert/strict";

import officialSchema from "../lib/schema/official-schema.json" with { type: "json" };
import {
  isClosedFollowUpStatus,
  isPendingFollowUpStatus,
  mapFollowUpMessageStatusToFollowUpStatus,
  normalizeFollowUpStatus
} from "../lib/services/follow-up-semantics.ts";

test("official schema governance tracks the current data foundation surfaces", () => {
  assert.equal(officialSchema.schemaVersion, "phase6-data-foundation-2026-04-24");

  const requiredTables = officialSchema.requiredTables as Record<string, string[]>;

  for (const table of [
    "case_events",
    "documents",
    "appointments",
    "appointment_history",
    "client_pipeline",
    "client_channels",
    "noemia_leads",
    "acquisition_events",
    "payments",
    "payment_events"
  ]) {
    assert.equal(Array.isArray(requiredTables[table]), true);
    assert.equal(requiredTables[table].length > 0, true);
  }

  assert.equal(requiredTables.intake_requests.includes("contact_channel"), false);
  assert.equal(requiredTables.intake_requests.includes("preferred_contact_channel"), true);
});

test("follow-up semantics normalize legacy pipeline statuses into the canonical language", () => {
  assert.equal(normalizeFollowUpStatus("scheduled"), "pending");
  assert.equal(normalizeFollowUpStatus("completed"), "resolved");
  assert.equal(
    normalizeFollowUpStatus("completed", { pipelineStage: "consultation_scheduled" }),
    "converted"
  );
  assert.equal(normalizeFollowUpStatus("failed"), "due");
});

test("follow-up delivery outcomes map cleanly to canonical pipeline status", () => {
  assert.equal(mapFollowUpMessageStatusToFollowUpStatus("sent"), "pending");
  assert.equal(mapFollowUpMessageStatusToFollowUpStatus("replied"), "resolved");
  assert.equal(mapFollowUpMessageStatusToFollowUpStatus("no_response"), "due");
});

test("follow-up status helpers distinguish actionable queues from completed flows", () => {
  assert.equal(isPendingFollowUpStatus("pending"), true);
  assert.equal(isPendingFollowUpStatus("scheduled"), true);
  assert.equal(isClosedFollowUpStatus("completed"), true);
  assert.equal(
    isClosedFollowUpStatus("completed", { pipelineStage: "consultation_scheduled" }),
    true
  );
  assert.equal(isClosedFollowUpStatus("due"), false);
});
