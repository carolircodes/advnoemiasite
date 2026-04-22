import assert from "node:assert/strict";
import test from "node:test";

import {
  buildYouTubeOAuthAuthorizationUrl,
  verifyYouTubeOAuthState
} from "../lib/youtube/youtube-auth.ts";
import {
  getYouTubeCredentialState,
  getYouTubeModeReadiness,
  getYouTubeOperationMode,
  getYouTubeReadinessReport
} from "../lib/youtube/youtube-config.ts";

function withEnv(
  overrides: Record<string, string | undefined>,
  callback: () => void
) {
  const previousEntries = Object.entries(overrides).map(([key]) => [key, process.env[key]] as const);

  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    callback();
  } finally {
    for (const [key, value] of previousEntries) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("youtube env validation exposes what is required for read_only and active", () => {
  withEnv(
    {
      YOUTUBE_CHANNEL_ID: "channel-1",
      YOUTUBE_API_KEY: "api-key-1",
      YOUTUBE_CLIENT_ID: undefined,
      YOUTUBE_CLIENT_SECRET: undefined,
      YOUTUBE_REDIRECT_URI: undefined,
      YOUTUBE_REFRESH_TOKEN: undefined,
      YOUTUBE_OAUTH_STATE_SECRET: undefined,
      INTERNAL_API_SECRET: undefined
    },
    () => {
      const credentialState = getYouTubeCredentialState();
      const readOnly = getYouTubeModeReadiness("read_only");
      const active = getYouTubeModeReadiness("active");

      assert.equal(credentialState.canRead, true);
      assert.equal(readOnly.satisfied, true);
      assert.equal(active.satisfied, false);
      assert.ok(active.missing.includes("YOUTUBE_CLIENT_ID"));
      assert.ok(active.missing.includes("YOUTUBE_REDIRECT_URI"));
    }
  );
});

test("youtube operation mode prefers YOUTUBE_MODE and blocks active without full readiness", () => {
  withEnv(
    {
      YOUTUBE_MODE: "active",
      YOUTUBE_CHANNEL_ID: "channel-1",
      YOUTUBE_CLIENT_ID: "client-id",
      YOUTUBE_CLIENT_SECRET: undefined,
      YOUTUBE_REDIRECT_URI: "https://portal.advnoemia.com.br/api/youtube/oauth/callback",
      YOUTUBE_REFRESH_TOKEN: undefined,
      YOUTUBE_OAUTH_STATE_SECRET: "state-secret"
    },
    () => {
      const report = getYouTubeReadinessReport();

      assert.equal(getYouTubeOperationMode(), "active");
      assert.equal(report.modeReadiness.satisfied, false);
      assert.ok(report.modeReadiness.missing.includes("YOUTUBE_CLIENT_SECRET"));
      assert.ok(report.modeReadiness.missing.includes("YOUTUBE_REFRESH_TOKEN"));
    }
  );
});

test("youtube suggestion mode is operational with read credentials and explicit mode", () => {
  withEnv(
    {
      YOUTUBE_MODE: "suggestion",
      YOUTUBE_CHANNEL_ID: "channel-2",
      YOUTUBE_API_KEY: "api-key-2",
      YOUTUBE_CLIENT_ID: undefined,
      YOUTUBE_CLIENT_SECRET: undefined,
      YOUTUBE_REDIRECT_URI: undefined,
      YOUTUBE_REFRESH_TOKEN: undefined
    },
    () => {
      const report = getYouTubeReadinessReport();

      assert.equal(report.operationMode, "suggestion");
      assert.equal(report.modeReadiness.satisfied, true);
      assert.equal(report.credentialState.canSuggest, true);
    }
  );
});

test("youtube oauth authorization url signs and validates state", () => {
  withEnv(
    {
      YOUTUBE_CLIENT_ID: "client-id",
      YOUTUBE_CLIENT_SECRET: "client-secret",
      YOUTUBE_REDIRECT_URI: "https://portal.advnoemia.com.br/api/youtube/oauth/callback",
      YOUTUBE_OAUTH_STATE_SECRET: "youtube-oauth-secret",
      YOUTUBE_CHANNEL_ID: "channel-3"
    },
    () => {
      const auth = buildYouTubeOAuthAuthorizationUrl({
        redirectTo: "/internal/advogada/atendimento",
        mode: "suggestion"
      });
      const parsed = new URL(auth.url);
      const verified = verifyYouTubeOAuthState(parsed.searchParams.get("state") || "");

      assert.equal(parsed.searchParams.get("client_id"), "client-id");
      assert.equal(parsed.searchParams.get("redirect_uri"), "https://portal.advnoemia.com.br/api/youtube/oauth/callback");
      assert.equal(parsed.searchParams.get("prompt"), "consent");
      assert.equal(verified.mode, "suggestion");
      assert.equal(verified.redirectTo, "/internal/advogada/atendimento");
    }
  );
});
