import assert from "node:assert/strict";
import test from "node:test";

import {
  getOmnichannelCapabilityMatrix,
  getOmnichannelGovernanceReport
} from "../lib/channels/omnichannel-governance.ts";
import { buildWebhookEventPayloadHash } from "../lib/services/webhook-idempotency.ts";

test("phase 15 exposes a canonical omnichannel capability matrix", () => {
  const matrix = getOmnichannelCapabilityMatrix();
  const whatsapp = matrix.find((entry) => entry.channel === "whatsapp");
  const telegram = matrix.find((entry) => entry.channel === "telegram");
  const tiktok = matrix.find((entry) => entry.channel === "tiktok");

  assert.ok(whatsapp);
  assert.equal(whatsapp.maturity, "mature");
  assert.equal(whatsapp.capabilities.signed_webhook.available, true);
  assert.equal(whatsapp.capabilities.read_status.available, true);

  assert.ok(telegram);
  assert.equal(telegram.automationMode, "assisted_only");
  assert.equal(telegram.capabilities.full_automation.safeToAutomateToday, false);

  assert.ok(tiktok);
  assert.equal(tiktok.runtimeIncluded, false);
  assert.equal(tiktok.capabilities.receive_inbound.available, false);
});

test("phase 15 governance report tells the truth about optional future channels", () => {
  const report = getOmnichannelGovernanceReport();
  const tiktok = report.channels.find((entry) => entry.channel === "tiktok");

  assert.ok(tiktok);
  assert.equal(tiktok.status, "optional_subsystem_gap");
  assert.equal(report.futureChannels.includes("youtube"), true);
  assert.equal(report.futureChannels.includes("tiktok"), true);
});

test("phase 15 payload hash stays stable even when webhook retries omit message id", () => {
  const first = buildWebhookEventPayloadHash({
    channel: "instagram",
    source: "instagram_comment",
    externalUserId: "user-1",
    messageText: "Tenho esse problema",
    messageType: "text",
    commentId: "comment-1",
    assetId: "media-9",
    timestamp: "2026-04-24T14:33:14.000Z"
  });
  const retry = buildWebhookEventPayloadHash({
    channel: "instagram",
    source: "instagram_comment",
    externalUserId: "user-1",
    messageText: "  Tenho   esse problema ",
    messageType: "text",
    commentId: "comment-1",
    assetId: "media-9",
    timestamp: "2026-04-24T14:33:55.000Z"
  });

  assert.ok(first);
  assert.equal(first, retry);
});

test("phase 15 payload hash separates distinct omnichannel surfaces", () => {
  const instagramComment = buildWebhookEventPayloadHash({
    channel: "instagram",
    source: "instagram_comment",
    externalUserId: "user-1",
    messageText: "me ajuda",
    messageType: "text",
    commentId: "comment-1",
    assetId: "media-1"
  });
  const instagramDm = buildWebhookEventPayloadHash({
    channel: "instagram",
    source: "instagram_dm",
    externalUserId: "user-1",
    messageText: "me ajuda",
    messageType: "text",
    externalMessageId: "mid-1"
  });

  assert.ok(instagramComment);
  assert.ok(instagramDm);
  assert.notEqual(instagramComment, instagramDm);
});
