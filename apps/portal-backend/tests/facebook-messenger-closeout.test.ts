import assert from "node:assert/strict";
import test from "node:test";

import {
  presentOperationalChannelLabel,
  presentOperationalSourceLabel,
  presentOperationalThreadOriginLabel,
  resolveOperationalLabel
} from "../lib/channels/channel-presentation.ts";
import { buildWebhookEventPayloadHash } from "../lib/services/webhook-idempotency.ts";

test("facebook messenger labels stay consistent across channel, source and thread origin", () => {
  assert.equal(resolveOperationalLabel("facebook"), "Facebook Messenger");
  assert.equal(presentOperationalChannelLabel("facebook"), "Facebook Messenger");
  assert.equal(presentOperationalSourceLabel("facebook_dm"), "Facebook Messenger");
  assert.equal(
    presentOperationalThreadOriginLabel({ entryType: "facebook_comment_to_dm" }),
    "Comentario do Facebook convertido em Messenger"
  );
});

test("messenger payload hash stays stable for Meta retries and changes with a new message id", () => {
  const retryHash = buildWebhookEventPayloadHash({
    channel: "facebook",
    externalMessageId: "mid.111",
    externalUserId: "user-1",
    messageText: "Oi, preciso de ajuda",
    messageType: "text"
  });
  const sameMessageRetryHash = buildWebhookEventPayloadHash({
    channel: "facebook",
    externalMessageId: "mid.111",
    externalUserId: "user-1",
    messageText: "  Oi, preciso   de ajuda ",
    messageType: "text"
  });
  const nextMessageHash = buildWebhookEventPayloadHash({
    channel: "facebook",
    externalMessageId: "mid.222",
    externalUserId: "user-1",
    messageText: "Oi, preciso de ajuda",
    messageType: "text"
  });

  assert.equal(retryHash, sameMessageRetryHash);
  assert.notEqual(retryHash, nextMessageHash);
});

test("facebook messenger labels preserve the private thread journey without mixing with instagram", () => {
  assert.equal(
    presentOperationalThreadOriginLabel({ entryType: "facebook_dm" }),
    "Facebook Messenger oficial"
  );
  assert.equal(
    presentOperationalThreadOriginLabel({ entryType: "instagram_dm" }),
    "Instagram Direct oficial"
  );
  assert.equal(
    presentOperationalSourceLabel("facebook_comment_to_dm"),
    "Comentario do Facebook convertido em Messenger"
  );
});
