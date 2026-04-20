import { createHash } from "node:crypto";

export type WebhookIdempotencyInput = {
  channel: "instagram" | "facebook" | "whatsapp" | "telegram";
  externalMessageId?: string;
  externalUserId: string;
  messageText?: string;
  messageType?: string;
};

function normalizeEventText(value: string | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildWebhookEventPayloadHash(input: WebhookIdempotencyInput) {
  const externalMessageId = input.externalMessageId?.trim();

  if (!externalMessageId) {
    return null;
  }

  return createHash("sha256")
    .update(
      JSON.stringify({
        channel: input.channel,
        externalMessageId,
        externalUserId: input.externalUserId.trim(),
        messageType: input.messageType?.trim() || "text",
        messageText: normalizeEventText(input.messageText)
      })
    )
    .digest("hex");
}
