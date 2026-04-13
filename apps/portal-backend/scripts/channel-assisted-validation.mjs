import fs from "fs";
import path from "path";

const root = process.cwd();
const fixturesDir = path.join(root, "scripts", "fixtures");
const baseUrl = process.env.CHANNEL_VALIDATION_BASE_URL?.trim() || null;

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

async function optionallyReplay(endpointPath, payload) {
  if (!baseUrl) {
    return {
      replayed: false,
      note: "dry-run only"
    };
  }

  const response = await fetch(`${baseUrl}${endpointPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return {
    replayed: true,
    status: response.status
  };
}

async function main() {
  const whatsappPayload = readFixture("whatsapp-inbound.json");
  const instagramPayload = readFixture("instagram-dm.json");

  const whatsappSummary = validateWhatsAppFixture(whatsappPayload);
  const instagramSummary = validateInstagramFixture(instagramPayload);

  const whatsappReplay = await optionallyReplay("/api/whatsapp/webhook", whatsappPayload);
  const instagramReplay = await optionallyReplay("/api/meta/webhook", instagramPayload);

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
