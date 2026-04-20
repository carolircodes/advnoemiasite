import { computeHmacSha256Hex, timingSafeEqualText } from "../http/webhook-security.ts";

export type MetaWebhookConfig = {
  verifyToken: string;
  verifyTokenConfigured: boolean;
  verifyTokenEnvName: "META_VERIFY_TOKEN";
  appSecret: string;
  appSecretConfigured: boolean;
  appSecretSource: "META_APP_SECRET" | "INSTAGRAM_APP_SECRET" | null;
  appSecretCandidates: Array<{
    source: "META_APP_SECRET" | "INSTAGRAM_APP_SECRET" | "META_INSTAGRAM_APP_SECRET";
    secret: string;
  }>;
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

export type MetaWebhookSignatureValidationResult =
  | {
      ok: true;
      matchedSource: "META_APP_SECRET" | "INSTAGRAM_APP_SECRET" | "META_INSTAGRAM_APP_SECRET";
      expectedSignaturePrefix: string;
    }
  | {
      ok: false;
      reason:
        | "signature_header_missing"
        | "signature_header_malformed"
        | "app_secret_missing"
        | "raw_body_empty"
        | "signature_mismatch";
      expectedSignaturePrefix: string | null;
      attemptedSources: Array<
        "META_APP_SECRET" | "INSTAGRAM_APP_SECRET" | "META_INSTAGRAM_APP_SECRET"
      >;
    };

export function resolveMetaWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
): MetaWebhookConfig {
  const verifyToken = env.META_VERIFY_TOKEN?.trim() || "";
  const metaAppSecret = env.META_APP_SECRET?.trim() || "";
  const instagramAppSecret = env.INSTAGRAM_APP_SECRET?.trim() || "";
  const metaInstagramAppSecret = env.META_INSTAGRAM_APP_SECRET?.trim() || "";
  const appSecret = metaAppSecret || instagramAppSecret;
  const appSecretCandidates = [
    metaAppSecret
      ? ({
          source: "META_APP_SECRET",
          secret: metaAppSecret
        } as const)
      : null,
    instagramAppSecret
      ? ({
          source: "INSTAGRAM_APP_SECRET",
          secret: instagramAppSecret
        } as const)
      : null,
    metaInstagramAppSecret
      ? ({
          source: "META_INSTAGRAM_APP_SECRET",
          secret: metaInstagramAppSecret
        } as const)
      : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

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
        : null,
    appSecretCandidates
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

export function validateMetaWebhookSignature(args: {
  rawBuffer: Buffer;
  signatureHeader: string | null;
  config?: MetaWebhookConfig;
  env?: NodeJS.ProcessEnv;
}): MetaWebhookSignatureValidationResult {
  const config = args.config || resolveMetaWebhookConfig(args.env);
  const signatureHeader = args.signatureHeader?.trim() || "";

  if (!signatureHeader) {
    return {
      ok: false,
      reason: "signature_header_missing",
      expectedSignaturePrefix: null,
      attemptedSources: config.appSecretCandidates.map((item) => item.source)
    };
  }

  if (!signatureHeader.startsWith("sha256=") || signatureHeader.length <= "sha256=".length) {
    return {
      ok: false,
      reason: "signature_header_malformed",
      expectedSignaturePrefix: null,
      attemptedSources: config.appSecretCandidates.map((item) => item.source)
    };
  }

  if (!config.appSecretCandidates.length) {
    return {
      ok: false,
      reason: "app_secret_missing",
      expectedSignaturePrefix: null,
      attemptedSources: []
    };
  }

  if (!args.rawBuffer.length) {
    return {
      ok: false,
      reason: "raw_body_empty",
      expectedSignaturePrefix: null,
      attemptedSources: config.appSecretCandidates.map((item) => item.source)
    };
  }

  for (const candidate of config.appSecretCandidates) {
    const expectedSignature = `sha256=${computeHmacSha256Hex(candidate.secret, args.rawBuffer)}`;

    if (timingSafeEqualText(signatureHeader, expectedSignature)) {
      return {
        ok: true,
        matchedSource: candidate.source,
        expectedSignaturePrefix: expectedSignature.slice(0, 14)
      };
    }
  }

  const expectedSignaturePrefix = `sha256=${computeHmacSha256Hex(
    config.appSecretCandidates[0].secret,
    args.rawBuffer
  )}`.slice(0, 14);

  return {
    ok: false,
    reason: "signature_mismatch",
    expectedSignaturePrefix,
    attemptedSources: config.appSecretCandidates.map((item) => item.source)
  };
}
