import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  resolveMetaWebhookConfig,
  summarizeMetaWebhookPayload,
  verifyMetaWebhookChallenge
} from "../lib/meta/meta-webhook-config.ts";

function withEnv(
  updates: Record<string, string | undefined>,
  callback: () => void | Promise<void>
) {
  const previousEntries = Object.entries(updates).map(([key]) => [key, process.env[key]] as const);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key, value] of previousEntries) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = callback();

    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(restore);
    }

    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("meta webhook config prefers META_APP_SECRET over INSTAGRAM_APP_SECRET", () => {
  return withEnv(
    {
      META_VERIFY_TOKEN: "verify-token",
      META_APP_SECRET: "shared-secret",
      INSTAGRAM_APP_SECRET: "stale-instagram-secret"
    },
    () => {
      const config = resolveMetaWebhookConfig();

      assert.equal(config.verifyTokenConfigured, true);
      assert.equal(config.verifyTokenEnvName, "META_VERIFY_TOKEN");
      assert.equal(config.appSecretConfigured, true);
      assert.equal(config.appSecretSource, "META_APP_SECRET");
      assert.equal(config.appSecret, "shared-secret");
    }
  );
});

test("meta webhook verification challenge matches the route expectations", () => {
  const accepted = verifyMetaWebhookChallenge({
    mode: "subscribe",
    token: "expected-token",
    challenge: "12345",
    verifyToken: "expected-token"
  });
  const rejected = verifyMetaWebhookChallenge({
    mode: "subscribe",
    token: "wrong-token",
    challenge: "12345",
    verifyToken: "expected-token"
  });

  assert.deepEqual(accepted, {
    ok: true,
    status: 200,
    body: "12345"
  });
  assert.deepEqual(rejected, {
    ok: false,
    status: 403,
    body: "Forbidden"
  });
});

test("meta webhook payload summary counts Messenger page payload structures", () => {
  const summary = summarizeMetaWebhookPayload({
    object: "page",
    entry: [
      {
        messaging: [{ sender: { id: "user-1" } }, { sender: { id: "user-2" } }],
        changes: [{ field: "feed" }]
      }
    ]
  });

  assert.deepEqual(summary, {
    object: "page",
    entryCount: 1,
    messagingCount: 2,
    changeCount: 1
  });
});

test("facebook outbound send path reads the expected token and page env names", () => {
  const instagramServiceSource = readFileSync(
    path.join(import.meta.dirname, "../lib/meta/instagram-service.ts"),
    "utf8"
  );
  const facebookServiceSource = readFileSync(
    path.join(import.meta.dirname, "../lib/meta/facebook-service.ts"),
    "utf8"
  );

  assert.match(instagramServiceSource, /process\.env\.FACEBOOK_PAGE_ACCESS_TOKEN/);
  assert.match(instagramServiceSource, /process\.env\.META_PAGE_ACCESS_TOKEN/);
  assert.match(instagramServiceSource, /process\.env\.FACEBOOK_PAGE_ID/);
  assert.match(instagramServiceSource, /https:\/\/graph\.facebook\.com\/v18\.0\/\$\{path\}/);
  assert.match(instagramServiceSource, /\$\{pageId\}\/messages/);
  assert.match(facebookServiceSource, /sendMetaDirectMessage\("facebook"/);
});
