import { createHash } from "node:crypto";

export type WebhookIdempotencyInput = {
  channel: "instagram" | "facebook" | "whatsapp" | "telegram" | "youtube";
  externalMessageId?: string;
  externalEventId?: string;
  externalUserId: string;
  messageText?: string;
  messageType?: string;
  source?: string;
  threadKey?: string;
  providerEventType?: string;
  assetId?: string;
  commentId?: string;
  timestamp?: string | number;
};

function normalizeEventText(value: string | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeToken(value: string | number | undefined) {
  return typeof value === "number"
    ? String(value)
    : typeof value === "string"
      ? value.trim()
      : "";
}

function normalizeTimestampBucket(value: string | number | undefined) {
  const raw = normalizeToken(value);

  if (!raw) {
    return "";
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    return new Date(Math.floor(milliseconds / 60_000) * 60_000).toISOString();
  }

  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return new Date(Math.floor(parsed / 60_000) * 60_000).toISOString();
}

export function buildWebhookEventPayloadHash(input: WebhookIdempotencyInput) {
  const externalMessageId = normalizeToken(input.externalMessageId);
  const externalEventId = normalizeToken(input.externalEventId);
  const payload = {
    channel: input.channel,
    source: normalizeToken(input.source),
    externalEventId,
    externalMessageId,
    externalUserId: normalizeToken(input.externalUserId),
    messageType: normalizeToken(input.messageType) || "text",
    providerEventType: normalizeToken(input.providerEventType),
    threadKey: normalizeToken(input.threadKey),
    assetId: normalizeToken(input.assetId),
    commentId: normalizeToken(input.commentId),
    timestampBucket: normalizeTimestampBucket(input.timestamp),
    messageText: normalizeEventText(input.messageText)
  };

  const hasStableFingerprint =
    Boolean(payload.externalMessageId) ||
    Boolean(payload.externalEventId) ||
    Boolean(payload.commentId) ||
    (Boolean(payload.threadKey) && Boolean(payload.messageText)) ||
    (Boolean(payload.assetId) && Boolean(payload.messageText));

  if (!hasStableFingerprint) {
    return null;
  }

  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}
