import { computeHmacSha256Hex, timingSafeEqualText } from "../http/webhook-security.ts";

export type MetaWebhookSecretSource =
  | "META_APP_SECRET"
  | "INSTAGRAM_APP_SECRET"
  | "FACEBOOK_APP_SECRET"
  | "META_INSTAGRAM_APP_SECRET";

export type MetaWebhookObjectHint = "page" | "instagram" | null;

export type MetaWebhookConfig = {
  verifyToken: string;
  verifyTokenConfigured: boolean;
  verifyTokenEnvName: "META_VERIFY_TOKEN";
  appSecret: string;
  appSecretConfigured: boolean;
  appSecretSource: MetaWebhookSecretSource | null;
  appSecretCandidates: Array<{
    source: MetaWebhookSecretSource;
    secret: string;
  }>;
  secretPresence: Record<MetaWebhookSecretSource, boolean>;
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
      matchedSource: MetaWebhookSecretSource;
      expectedSignaturePrefix: string;
      objectHint: MetaWebhookObjectHint;
      attemptedSources: MetaWebhookSecretSource[];
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
      attemptedSources: MetaWebhookSecretSource[];
      objectHint: MetaWebhookObjectHint;
    };

export function resolveMetaWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
): MetaWebhookConfig {
  const verifyToken = env.META_VERIFY_TOKEN?.trim() || "";
  const metaAppSecret = env.META_APP_SECRET?.trim() || "";
  const instagramAppSecret = env.INSTAGRAM_APP_SECRET?.trim() || "";
  const facebookAppSecret = env.FACEBOOK_APP_SECRET?.trim() || "";
  const metaInstagramAppSecret = env.META_INSTAGRAM_APP_SECRET?.trim() || "";
  const appSecret = metaAppSecret || instagramAppSecret || facebookAppSecret || metaInstagramAppSecret;
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
    facebookAppSecret
      ? ({
          source: "FACEBOOK_APP_SECRET",
          secret: facebookAppSecret
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
        : facebookAppSecret
          ? "FACEBOOK_APP_SECRET"
          : metaInstagramAppSecret
            ? "META_INSTAGRAM_APP_SECRET"
            : null,
    secretPresence: {
      META_APP_SECRET: metaAppSecret.length > 0,
      INSTAGRAM_APP_SECRET: instagramAppSecret.length > 0,
      FACEBOOK_APP_SECRET: facebookAppSecret.length > 0,
      META_INSTAGRAM_APP_SECRET: metaInstagramAppSecret.length > 0
    },
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

export function inferMetaWebhookObjectHint(rawBuffer: Buffer): MetaWebhookObjectHint {
  if (!rawBuffer.length) {
    return null;
  }

  const rawText = rawBuffer.toString("utf8");
  const objectMatch = rawText.match(/"object"\s*:\s*"(page|instagram)"/);

  return objectMatch?.[1] === "page" || objectMatch?.[1] === "instagram"
    ? objectMatch[1]
    : null;
}

export function resolveMetaWebhookSignatureCandidates(args?: {
  objectHint?: MetaWebhookObjectHint;
  config?: MetaWebhookConfig;
  env?: NodeJS.ProcessEnv;
}) {
  const config = args?.config || resolveMetaWebhookConfig(args?.env);
  const objectHint = args?.objectHint ?? null;
  const preferredSources: MetaWebhookSecretSource[] =
    objectHint === "page"
      ? [
          "FACEBOOK_APP_SECRET",
          "META_APP_SECRET",
          "INSTAGRAM_APP_SECRET",
          "META_INSTAGRAM_APP_SECRET"
        ]
      : objectHint === "instagram"
        ? [
            "INSTAGRAM_APP_SECRET",
            "META_APP_SECRET",
            "META_INSTAGRAM_APP_SECRET",
            "FACEBOOK_APP_SECRET"
          ]
        : [
            "META_APP_SECRET",
            "INSTAGRAM_APP_SECRET",
            "FACEBOOK_APP_SECRET",
            "META_INSTAGRAM_APP_SECRET"
          ];

  const candidateMap = new Map(config.appSecretCandidates.map((item) => [item.source, item] as const));

  return preferredSources
    .map((source) => candidateMap.get(source) || null)
    .filter(
      (
        item
      ): item is {
        source: MetaWebhookSecretSource;
        secret: string;
      } => Boolean(item)
    );
}

export function validateMetaWebhookSignature(args: {
  rawBuffer: Buffer;
  signatureHeader: string | null;
  objectHint?: MetaWebhookObjectHint;
  config?: MetaWebhookConfig;
  env?: NodeJS.ProcessEnv;
}): MetaWebhookSignatureValidationResult {
  const config = args.config || resolveMetaWebhookConfig(args.env);
  const signatureHeader = args.signatureHeader?.trim() || "";
  const objectHint = args.objectHint ?? inferMetaWebhookObjectHint(args.rawBuffer);
  const signatureCandidates = resolveMetaWebhookSignatureCandidates({
    objectHint,
    config
  });

  if (!signatureHeader) {
    return {
      ok: false,
      reason: "signature_header_missing",
      expectedSignaturePrefix: null,
      attemptedSources: signatureCandidates.map((item) => item.source),
      objectHint
    };
  }

  if (!signatureHeader.startsWith("sha256=") || signatureHeader.length <= "sha256=".length) {
    return {
      ok: false,
      reason: "signature_header_malformed",
      expectedSignaturePrefix: null,
      attemptedSources: signatureCandidates.map((item) => item.source),
      objectHint
    };
  }

  if (!signatureCandidates.length) {
    return {
      ok: false,
      reason: "app_secret_missing",
      expectedSignaturePrefix: null,
      attemptedSources: [],
      objectHint
    };
  }

  if (!args.rawBuffer.length) {
    return {
      ok: false,
      reason: "raw_body_empty",
      expectedSignaturePrefix: null,
      attemptedSources: signatureCandidates.map((item) => item.source),
      objectHint
    };
  }

  for (const candidate of signatureCandidates) {
    const expectedSignature = `sha256=${computeHmacSha256Hex(candidate.secret, args.rawBuffer)}`;

    if (timingSafeEqualText(signatureHeader, expectedSignature)) {
      return {
        ok: true,
        matchedSource: candidate.source,
        expectedSignaturePrefix: expectedSignature.slice(0, 14),
        attemptedSources: signatureCandidates.map((item) => item.source),
        objectHint
      };
    }
  }

  const expectedSignaturePrefix = `sha256=${computeHmacSha256Hex(
    signatureCandidates[0].secret,
    args.rawBuffer
  )}`.slice(0, 14);

  return {
    ok: false,
    reason: "signature_mismatch",
    expectedSignaturePrefix,
    attemptedSources: signatureCandidates.map((item) => item.source),
    objectHint
  };
}
