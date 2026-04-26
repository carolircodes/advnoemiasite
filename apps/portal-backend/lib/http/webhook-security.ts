import { createHmac, timingSafeEqual } from "crypto";

function normalizeFlagValue(value: string | undefined) {
  return value?.trim().toLowerCase();
}

export function readBooleanFlag(name: string, fallback: boolean) {
  const normalized = normalizeFlagValue(process.env[name]);

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function shouldEnforceWebhookSignature(flagName: string) {
  return readBooleanFlag(flagName, process.env.NODE_ENV === "production");
}

export function shouldAllowShadowWebhookAcceptance(flagName: string) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return readBooleanFlag(flagName, false);
}

export function shouldExposeChannelValidationErrors() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return readBooleanFlag("CHANNEL_VALIDATION_EXPOSE_ERRORS", false);
}

export function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function computeHmacSha256Hex(secret: string, value: string | Buffer) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function parseSignatureHeader(header: string | null) {
  if (!header) {
    return {};
  }

  return header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      if (key && value) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
}

export function parseMercadoPagoSignatureInput(args: {
  header: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  const parts = parseSignatureHeader(args.header);
  const timestamp = parts.ts || null;
  const version = parts.v1 || null;

  if (!timestamp || !version || !args.requestId || !args.dataId) {
    return null;
  }

  return {
    timestamp,
    version,
    manifest: `id:${args.dataId};request-id:${args.requestId};ts:${timestamp};`
  };
}
