export type MetaWebhookConfig = {
  verifyToken: string;
  verifyTokenConfigured: boolean;
  verifyTokenEnvName: "META_VERIFY_TOKEN";
  appSecret: string;
  appSecretConfigured: boolean;
  appSecretSource: "META_APP_SECRET" | "INSTAGRAM_APP_SECRET" | null;
};

export type MetaWebhookVerificationInput = {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  verifyToken: string;
};

export type MetaWebhookVerificationResult =
  | {
      ok: true;
      status: 200;
      body: string;
    }
  | {
      ok: false;
      status: 403;
      body: "Forbidden";
    };

export function resolveMetaWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
): MetaWebhookConfig {
  const verifyToken = env.META_VERIFY_TOKEN?.trim() || "";
  const metaAppSecret = env.META_APP_SECRET?.trim() || "";
  const instagramAppSecret = env.INSTAGRAM_APP_SECRET?.trim() || "";
  const appSecret = metaAppSecret || instagramAppSecret;

  return {
    verifyToken,
    verifyTokenConfigured: verifyToken.length > 0,
    verifyTokenEnvName: "META_VERIFY_TOKEN",
    appSecret,
    appSecretConfigured: appSecret.length > 0,
    appSecretSource: metaAppSecret
      ? "META_APP_SECRET"
      : instagramAppSecret
        ? "INSTAGRAM_APP_SECRET"
        : null
  };
}

export function verifyMetaWebhookChallenge(
  input: MetaWebhookVerificationInput
): MetaWebhookVerificationResult {
  if (input.mode === "subscribe" && input.token === input.verifyToken) {
    return {
      ok: true,
      status: 200,
      body: input.challenge || ""
    };
  }

  return {
    ok: false,
    status: 403,
    body: "Forbidden"
  };
}

export function summarizeMetaWebhookPayload(payload: unknown) {
  const typedPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const entryList = Array.isArray(typedPayload.entry) ? typedPayload.entry : [];

  return {
    object:
      typedPayload.object === "page" || typedPayload.object === "instagram"
        ? typedPayload.object
        : null,
    entryCount: entryList.length,
    messagingCount: entryList.reduce((count, entry) => {
      const typedEntry =
        entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return count + (Array.isArray(typedEntry.messaging) ? typedEntry.messaging.length : 0);
    }, 0),
    changeCount: entryList.reduce((count, entry) => {
      const typedEntry =
        entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return count + (Array.isArray(typedEntry.changes) ? typedEntry.changes.length : 0);
    }, 0)
  };
}
