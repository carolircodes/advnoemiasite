import { channelAutomationFeatures } from "../config/channel-automation-features.ts";

export type YouTubeOperationMode = "read_only" | "suggestion" | "active";

type YouTubeModeRequirement = {
  mode: YouTubeOperationMode;
  satisfied: boolean;
  missing: string[];
  notes: string[];
};

type YouTubeCredentialState = {
  channelId: string;
  redirectUri: string;
  webhookCallbackUrl: string;
  oauthStateSecretConfigured: boolean;
  hasApiKey: boolean;
  hasOAuthClient: boolean;
  hasRefreshToken: boolean;
  hasWebhookCallbackUrl: boolean;
  canRead: boolean;
  canSuggest: boolean;
  canReply: boolean;
  oauthReady: boolean;
  readyModes: YouTubeModeRequirement[];
};

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function readBooleanEnv(name: string, fallback: boolean) {
  const rawValue = process.env[name];

  if (typeof rawValue !== "string") {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized)
    ? true
    : ["0", "false", "no", "off"].includes(normalized)
      ? false
      : fallback;
}

function readNumberEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  const parsed = rawValue ? Number(rawValue) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMode(rawValue: string | undefined | null): YouTubeOperationMode | null {
  const normalized = (rawValue || "").trim().toLowerCase();

  if (normalized === "read_only" || normalized === "readonly" || normalized === "read-only") {
    return "read_only";
  }

  if (normalized === "suggestion" || normalized === "review") {
    return "suggestion";
  }

  if (normalized === "active" || normalized === "reply" || normalized === "live") {
    return "active";
  }

  return null;
}

function buildModeRequirement(
  mode: YouTubeOperationMode,
  state: {
    channelId: string;
    redirectUri: string;
    oauthStateSecretConfigured: boolean;
    hasApiKey: boolean;
    hasOAuthClient: boolean;
    hasRefreshToken: boolean;
  }
): YouTubeModeRequirement {
  const missing: string[] = [];
  const notes: string[] = [];

  if (!state.channelId) {
    missing.push("YOUTUBE_CHANNEL_ID");
  }

  if (mode === "read_only" || mode === "suggestion") {
    if (!state.hasApiKey && !state.hasOAuthClient) {
      missing.push("YOUTUBE_API_KEY|YOUTUBE_CLIENT_ID+YOUTUBE_CLIENT_SECRET");
    }

    notes.push("Read only e suggestion nao exigem refresh token para operar a malha interna.");
  }

  if (mode === "active") {
    if (!state.hasOAuthClient) {
      missing.push("YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET");
    }

    if (!state.redirectUri) {
      missing.push("YOUTUBE_REDIRECT_URI");
    }

    if (!state.hasRefreshToken) {
      missing.push("YOUTUBE_REFRESH_TOKEN");
    }

    if (!state.oauthStateSecretConfigured) {
      missing.push("YOUTUBE_OAUTH_STATE_SECRET|INTERNAL_API_SECRET");
    }

    notes.push("Active reply exige OAuth completo e refresh token valido.");
  }

  return {
    mode,
    satisfied: missing.length === 0,
    missing,
    notes
  };
}

export function getYouTubeCredentialState(): YouTubeCredentialState {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || "";
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI?.trim() || "";
  const webhookCallbackUrl = process.env.YOUTUBE_WEBHOOK_CALLBACK_URL?.trim() || "";
  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || "";
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim() || "";
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim() || "";
  const oauthStateSecretConfigured = hasConfiguredValue(process.env.YOUTUBE_OAUTH_STATE_SECRET) ||
    hasConfiguredValue(process.env.INTERNAL_API_SECRET);
  const hasOAuthClient = Boolean(clientId && clientSecret);

  return {
    channelId,
    redirectUri,
    webhookCallbackUrl,
    oauthStateSecretConfigured,
    hasApiKey: Boolean(apiKey),
    hasOAuthClient,
    hasRefreshToken: Boolean(refreshToken),
    hasWebhookCallbackUrl: Boolean(webhookCallbackUrl),
    canRead: Boolean(channelId && (apiKey || hasOAuthClient)),
    canSuggest: Boolean(channelId && (apiKey || hasOAuthClient)),
    canReply: Boolean(channelId && hasOAuthClient && redirectUri && refreshToken),
    oauthReady: Boolean(hasOAuthClient && redirectUri && oauthStateSecretConfigured),
    readyModes: [
      buildModeRequirement("read_only", {
        channelId,
        redirectUri,
        oauthStateSecretConfigured,
        hasApiKey: Boolean(apiKey),
        hasOAuthClient,
        hasRefreshToken: Boolean(refreshToken)
      }),
      buildModeRequirement("suggestion", {
        channelId,
        redirectUri,
        oauthStateSecretConfigured,
        hasApiKey: Boolean(apiKey),
        hasOAuthClient,
        hasRefreshToken: Boolean(refreshToken)
      }),
      buildModeRequirement("active", {
        channelId,
        redirectUri,
        oauthStateSecretConfigured,
        hasApiKey: Boolean(apiKey),
        hasOAuthClient,
        hasRefreshToken: Boolean(refreshToken)
      })
    ]
  };
}

export function getYouTubeOperationMode(): YouTubeOperationMode {
  const envMode = normalizeMode(process.env.YOUTUBE_MODE);

  if (envMode) {
    return envMode;
  }

  if (
    readBooleanEnv("YOUTUBE_REPLY_ENABLED", false) ||
    readBooleanEnv("YOUTUBE_AUTO_REPLY_ENABLED", false) ||
    readBooleanEnv("YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY", channelAutomationFeatures.youtubeActiveReply)
  ) {
    return "active";
  }

  if (
    readBooleanEnv(
      "YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE",
      channelAutomationFeatures.youtubeSuggestionMode
    )
  ) {
    return "suggestion";
  }

  return "read_only";
}

export function getYouTubeGuardrailConfig() {
  return {
    mode: getYouTubeOperationMode(),
    maxRepliesPerWindow:
      readNumberEnv(
        "YOUTUBE_MAX_REPLIES_PER_AUTHOR_WINDOW",
        readNumberEnv("YOUTUBE_COMMENT_MAX_REPLIES_PER_WINDOW", 3)
      ),
    authorCooldownMinutes:
      readNumberEnv(
        "YOUTUBE_COMMENT_COOLDOWN_MINUTES",
        readNumberEnv("YOUTUBE_COMMENT_AUTHOR_COOLDOWN_MINUTES", 180)
      ),
    videoCooldownMinutes:
      readNumberEnv(
        "YOUTUBE_MAX_REPLIES_PER_ASSET_WINDOW",
        readNumberEnv("YOUTUBE_COMMENT_VIDEO_COOLDOWN_MINUTES", 60)
      ),
    humanReviewDefault: channelAutomationFeatures.youtubeHumanReviewDefault,
    replyEnabled:
      readBooleanEnv("YOUTUBE_REPLY_ENABLED", false) ||
      readBooleanEnv("YOUTUBE_AUTO_REPLY_ENABLED", false) ||
      getYouTubeOperationMode() === "active"
  };
}

export function getYouTubeModeReadiness(mode = getYouTubeOperationMode()) {
  const state = getYouTubeCredentialState();
  return state.readyModes.find((entry) => entry.mode === mode)!;
}

export function getYouTubeReadinessReport() {
  const credentialState = getYouTubeCredentialState();
  const operationMode = getYouTubeOperationMode();
  const modeReadiness = getYouTubeModeReadiness(operationMode);

  return {
    operationMode,
    modeReadiness,
    credentialState,
    flags: {
      ingestion: channelAutomationFeatures.youtubeIngestion,
      commentSync: channelAutomationFeatures.youtubeCommentSync,
      readOnly: channelAutomationFeatures.youtubeReadOnlyMode,
      suggestion: channelAutomationFeatures.youtubeSuggestionMode,
      activeReply: channelAutomationFeatures.youtubeActiveReply,
      inboxRouting: channelAutomationFeatures.youtubeInboxRouting,
      crmRouting: channelAutomationFeatures.youtubeCrmRouting,
      humanReviewDefault: channelAutomationFeatures.youtubeHumanReviewDefault
    }
  };
}
