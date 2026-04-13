import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createHmac } from "crypto";

const root = process.cwd();
const fixturesDir = path.join(root, "scripts", "fixtures");
dotenv.config({ path: path.join(root, ".env.local") });

const baseUrl =
  process.env.CHANNEL_VALIDATION_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  null;

function computeSignature(secret, payloadText) {
  return `sha256=${createHmac("sha256", secret).update(payloadText).digest("hex")}`;
}

function readFixture(name) {
  const filePath = path.join(fixturesDir, name);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateWhatsAppFixture(payload) {
  const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages || [];

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("WhatsApp fixture missing inbound messages.");
  }

  const message = messages[0];
  if (!message.from || !message.id || !message.text?.body) {
    throw new Error("WhatsApp fixture missing deterministic identity fields.");
  }

  return {
    channel: "whatsapp",
    eventId: message.id,
    externalUserId: message.from,
    messageText: message.text.body
  };
}

function validateInstagramFixture(payload) {
  const messaging = payload?.entry?.[0]?.messaging || [];

  if (!Array.isArray(messaging) || messaging.length === 0) {
    throw new Error("Instagram fixture missing messaging events.");
  }

  const event = messaging[0];
  if (!event?.sender?.id || !event?.message?.mid) {
    throw new Error("Instagram fixture missing deterministic identity fields.");
  }

  return {
    channel: "instagram",
    eventId: event.message.mid,
    externalUserId: event.sender.id,
    messageText: event.message.text || "[non_text]"
  };
}

async function optionallyReplay(endpointPath, payload, options = {}) {
  if (!baseUrl) {
    return {
      replayed: false,
      note: "dry-run only"
    };
  }

  const payloadText = JSON.stringify(payload);
  const headers = {
    "content-type": "application/json",
    ...(options.signatureSecret
      ? {
          [options.signatureHeader || "x-hub-signature-256"]: computeSignature(
            options.signatureSecret,
            payloadText
          )
        }
      : {})
  };

  const response = await fetch(`${baseUrl}${endpointPath}`, {
    method: "POST",
    headers,
    body: payloadText
  });

  const responseBody = await response.text().catch(() => "");

  return {
    replayed: true,
    status: response.status,
    signatureMode: options.signatureSecret ? "signed" : "unsigned",
    responseBody: responseBody.slice(0, 300)
  };
}

async function main() {
  const whatsappPayload = readFixture("whatsapp-inbound.json");
  const instagramPayload = readFixture("instagram-dm.json");

  const whatsappSummary = validateWhatsAppFixture(whatsappPayload);
  const instagramSummary = validateInstagramFixture(instagramPayload);

  const whatsappReplay = await optionallyReplay("/api/whatsapp/webhook", whatsappPayload, {
    signatureSecret:
      process.env.WHATSAPP_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || null
  });
  const instagramReplay = await optionallyReplay("/api/meta/webhook", instagramPayload, {
    signatureSecret:
      process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || null
  });

  console.log(
    JSON.stringify(
      {
        validatedAt: new Date().toISOString(),
        baseUrl,
        results: [
          {
            ...whatsappSummary,
            ...whatsappReplay
          },
          {
            ...instagramSummary,
            ...instagramReplay
          }
        ]
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[channel-validation] failed:", error.message);
  process.exit(1);
});
