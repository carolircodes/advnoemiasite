import {
  computeHmacSha256Hex,
  timingSafeEqualText
} from "../http/webhook-security.ts";

export type WhatsAppWebhookConfig = {
  verifyToken: string;
  verifyTokenConfigured: boolean;
  appSecret: string;
  appSecretConfigured: boolean;
  appSecretSource: "WHATSAPP_APP_SECRET" | "META_APP_SECRET" | null;
  accessToken: string;
  accessTokenConfigured: boolean;
  accessTokenSource: "WHATSAPP_ACCESS_TOKEN" | "META_WHATSAPP_ACCESS_TOKEN" | null;
  phoneNumberId: string;
  phoneNumberIdConfigured: boolean;
  phoneNumberIdSource: "WHATSAPP_PHONE_NUMBER_ID" | "META_WHATSAPP_PHONE_NUMBER_ID" | null;
};

export type WhatsAppSignatureValidationResult =
  | {
      ok: true;
      code: "validated";
    }
  | {
      ok: false;
      code:
        | "signature_header_missing"
        | "signature_header_malformed"
        | "app_secret_missing"
        | "raw_body_empty"
        | "signature_mismatch";
    };

function envValue(env: NodeJS.ProcessEnv, name: string) {
  return env[name]?.trim() || "";
}

export function resolveWhatsAppWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
): WhatsAppWebhookConfig {
  const appSecret = envValue(env, "WHATSAPP_APP_SECRET") || envValue(env, "META_APP_SECRET");
  const accessToken =
    envValue(env, "WHATSAPP_ACCESS_TOKEN") || envValue(env, "META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId =
    envValue(env, "WHATSAPP_PHONE_NUMBER_ID") ||
    envValue(env, "META_WHATSAPP_PHONE_NUMBER_ID");

  return {
    verifyToken: envValue(env, "WHATSAPP_VERIFY_TOKEN"),
    verifyTokenConfigured: envValue(env, "WHATSAPP_VERIFY_TOKEN").length > 0,
    appSecret,
    appSecretConfigured: appSecret.length > 0,
    appSecretSource: envValue(env, "WHATSAPP_APP_SECRET")
      ? "WHATSAPP_APP_SECRET"
      : envValue(env, "META_APP_SECRET")
        ? "META_APP_SECRET"
        : null,
    accessToken,
    accessTokenConfigured: accessToken.length > 0,
    accessTokenSource: envValue(env, "WHATSAPP_ACCESS_TOKEN")
      ? "WHATSAPP_ACCESS_TOKEN"
      : envValue(env, "META_WHATSAPP_ACCESS_TOKEN")
        ? "META_WHATSAPP_ACCESS_TOKEN"
        : null,
    phoneNumberId,
    phoneNumberIdConfigured: phoneNumberId.length > 0,
    phoneNumberIdSource: envValue(env, "WHATSAPP_PHONE_NUMBER_ID")
      ? "WHATSAPP_PHONE_NUMBER_ID"
      : envValue(env, "META_WHATSAPP_PHONE_NUMBER_ID")
        ? "META_WHATSAPP_PHONE_NUMBER_ID"
        : null
  };
}

export function verifyWhatsAppWebhookChallenge(args: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  verifyToken: string;
}) {
  if (args.mode === "subscribe" && args.token === args.verifyToken) {
    return {
      ok: true as const,
      status: 200,
      body: args.challenge || ""
    };
  }

  return {
    ok: false as const,
    status: 403,
    body: "Forbidden"
  };
}

export function validateWhatsAppWebhookSignature(args: {
  body: string;
  signatureHeader: string | null;
  appSecret?: string;
}): WhatsAppSignatureValidationResult {
  const appSecret = args.appSecret?.trim() || "";
  const signatureHeader = args.signatureHeader?.trim() || "";

  if (!appSecret) {
    return {
      ok: false,
      code: "app_secret_missing"
    };
  }

  if (!signatureHeader) {
    return {
      ok: false,
      code: "signature_header_missing"
    };
  }

  if (!signatureHeader.startsWith("sha256=") || signatureHeader.length <= "sha256=".length) {
    return {
      ok: false,
      code: "signature_header_malformed"
    };
  }

  if (args.body.length === 0) {
    return {
      ok: false,
      code: "raw_body_empty"
    };
  }

  const expectedSignature = `sha256=${computeHmacSha256Hex(appSecret, args.body)}`;

  if (!timingSafeEqualText(signatureHeader, expectedSignature)) {
    return {
      ok: false,
      code: "signature_mismatch"
    };
  }

  return {
    ok: true,
    code: "validated"
  };
}

export function summarizeWhatsAppWebhookPayload(payload: unknown) {
  const typedPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const entries = Array.isArray(typedPayload.entry) ? typedPayload.entry : [];

  let messageCount = 0;
  let statusCount = 0;
  let unknownChangeCount = 0;

  for (const entry of entries) {
    const typedEntry =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const changes = Array.isArray(typedEntry.changes) ? typedEntry.changes : [];

    for (const change of changes) {
      const typedChange =
        change && typeof change === "object" ? (change as Record<string, any>) : {};
      const value = typedChange.value && typeof typedChange.value === "object"
        ? (typedChange.value as Record<string, unknown>)
        : {};

      if (typedChange.field !== "messages") {
        unknownChangeCount += 1;
        continue;
      }

      messageCount += Array.isArray(value.messages) ? value.messages.length : 0;
      statusCount += Array.isArray(value.statuses) ? value.statuses.length : 0;
    }
  }

  return {
    object: typedPayload.object === "whatsapp_business_account"
      ? "whatsapp_business_account"
      : null,
    entryCount: entries.length,
    messageCount,
    statusCount,
    unknownChangeCount
  };
}
