import test from "node:test";
import assert from "node:assert/strict";

import {
  computeHmacSha256Hex,
  shouldAllowShadowWebhookAcceptance,
  shouldExposeChannelValidationErrors
} from "../lib/http/webhook-security.ts";
import {
  resolveWhatsAppWebhookConfig,
  summarizeWhatsAppWebhookPayload,
  validateWhatsAppWebhookSignature,
  verifyWhatsAppWebhookChallenge
} from "../lib/channels/whatsapp-webhook.ts";
import {
  getMercadoPagoWebhookEventId,
  validateMercadoPagoWebhookSignature
} from "../lib/payment/mercado-pago-webhook-security.ts";
import {
  validateMetaWebhookSignature,
  verifyMetaWebhookChallenge
} from "../lib/meta/meta-webhook-config.ts";
import { buildChannelWebhookReadinessSection } from "../lib/diagnostics/channel-readiness.ts";

function withEnv(
  updates: Record<string, string | undefined>,
  callback: () => void | Promise<void>
) {
  const previousEntries = Object.entries(updates).map(([key]) => [key, process.env[key]] as const);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key, value] of previousEntries) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = callback();

    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(restore);
    }

    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("phase 3 keeps shadow acceptance and validation details disabled in production", () => {
  return withEnv(
    {
      NODE_ENV: "production",
      META_WEBHOOK_ALLOW_SHADOW_SIGNATURE: "true",
      WHATSAPP_WEBHOOK_ALLOW_SHADOW_SIGNATURE: "true",
      CHANNEL_VALIDATION_EXPOSE_ERRORS: "true"
    },
    () => {
      assert.equal(shouldAllowShadowWebhookAcceptance("META_WEBHOOK_ALLOW_SHADOW_SIGNATURE"), false);
      assert.equal(
        shouldAllowShadowWebhookAcceptance("WHATSAPP_WEBHOOK_ALLOW_SHADOW_SIGNATURE"),
        false
      );
      assert.equal(shouldExposeChannelValidationErrors(), false);
    }
  );
});

test("phase 3 validates WhatsApp verify challenge and signatures without provider calls", () => {
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { messages: [{ id: "wamid.1" }] } }] }]
  });
  const signature = `sha256=${computeHmacSha256Hex("whatsapp-secret", body)}`;

  const config = resolveWhatsAppWebhookConfig({
    WHATSAPP_VERIFY_TOKEN: "verify-token",
    WHATSAPP_APP_SECRET: "whatsapp-secret",
    WHATSAPP_ACCESS_TOKEN: "token",
    WHATSAPP_PHONE_NUMBER_ID: "phone"
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.appSecretSource, "WHATSAPP_APP_SECRET");
  assert.deepEqual(
    verifyWhatsAppWebhookChallenge({
      mode: "subscribe",
      token: "verify-token",
      challenge: "challenge-value",
      verifyToken: config.verifyToken
    }),
    {
      ok: true,
      status: 200,
      body: "challenge-value"
    }
  );
  assert.equal(
    verifyWhatsAppWebhookChallenge({
      mode: "subscribe",
      token: "wrong",
      challenge: "challenge-value",
      verifyToken: config.verifyToken
    }).status,
    403
  );
  assert.deepEqual(
    validateWhatsAppWebhookSignature({
      body,
      signatureHeader: signature,
      appSecret: config.appSecret
    }),
    {
      ok: true,
      code: "validated"
    }
  );
  assert.equal(
    validateWhatsAppWebhookSignature({
      body,
      signatureHeader: "sha256=invalid",
      appSecret: config.appSecret
    }).code,
    "signature_mismatch"
  );
  assert.equal(
    validateWhatsAppWebhookSignature({
      body,
      signatureHeader: null,
      appSecret: config.appSecret
    }).code,
    "signature_header_missing"
  );
});

test("phase 3 summarizes WhatsApp duplicate-like message/status payloads without raw content", () => {
  const summary = summarizeWhatsAppWebhookPayload({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              messages: [{ id: "wamid.1", text: { body: "mensagem sensivel" } }],
              statuses: [{ id: "wamid.1", status: "delivered" }]
            }
          },
          {
            field: "unknown",
            value: {}
          }
        ]
      }
    ]
  });

  assert.deepEqual(summary, {
    object: "whatsapp_business_account",
    entryCount: 1,
    messageCount: 1,
    statusCount: 1,
    unknownChangeCount: 1
  });
});

test("phase 3 validates Meta page and Instagram signatures with fake local payloads", () => {
  const pagePayload = Buffer.from(JSON.stringify({ object: "page", entry: [] }), "utf8");
  const instagramPayload = Buffer.from(JSON.stringify({ object: "instagram", entry: [] }), "utf8");

  const pageSignature = `sha256=${computeHmacSha256Hex("facebook-secret", pagePayload)}`;
  const instagramSignature = `sha256=${computeHmacSha256Hex("instagram-secret", instagramPayload)}`;

  assert.equal(
    verifyMetaWebhookChallenge({
      mode: "subscribe",
      token: "verify",
      challenge: "ok",
      verifyToken: "verify"
    }).status,
    200
  );
  assert.equal(
    validateMetaWebhookSignature({
      rawBuffer: pagePayload,
      signatureHeader: pageSignature,
      env: {
        FACEBOOK_APP_SECRET: "facebook-secret",
        INSTAGRAM_APP_SECRET: "instagram-secret"
      } as unknown as NodeJS.ProcessEnv
    }).ok,
    true
  );
  assert.equal(
    validateMetaWebhookSignature({
      rawBuffer: instagramPayload,
      signatureHeader: instagramSignature,
      env: {
        FACEBOOK_APP_SECRET: "facebook-secret",
        INSTAGRAM_APP_SECRET: "instagram-secret"
      } as unknown as NodeJS.ProcessEnv
    }).ok,
    true
  );
  assert.equal(
    validateMetaWebhookSignature({
      rawBuffer: pagePayload,
      signatureHeader: null,
      env: {
        FACEBOOK_APP_SECRET: "facebook-secret"
      } as unknown as NodeJS.ProcessEnv
    }).ok,
    false
  );
});

test("phase 3 validates Mercado Pago signature input and rejects missing ids locally", () => {
  const dataId = "123456";
  const requestId = "req-123";
  const timestamp = "1710000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const signature = computeHmacSha256Hex("mp-secret", manifest);
  const searchParams = new URLSearchParams({ "data.id": dataId });

  assert.equal(
    getMercadoPagoWebhookEventId({
      searchParams,
      event: { type: "payment", data: { id: "fallback" } }
    }),
    dataId
  );
  assert.deepEqual(
    validateMercadoPagoWebhookSignature({
      signatureHeader: `ts=${timestamp},v1=${signature}`,
      requestId,
      dataId,
      webhookSecret: "mp-secret"
    }),
    {
      ok: true,
      status: 200,
      code: "validated"
    }
  );
  assert.equal(
    validateMercadoPagoWebhookSignature({
      signatureHeader: `ts=${timestamp},v1=invalid`,
      requestId,
      dataId,
      webhookSecret: "mp-secret"
    }).code,
    "invalid_signature"
  );
  assert.equal(
    validateMercadoPagoWebhookSignature({
      signatureHeader: `ts=${timestamp},v1=${signature}`,
      requestId,
      dataId: null,
      webhookSecret: "mp-secret"
    }).code,
    "invalid_signature_input"
  );
});

test("phase 3 channel readiness reports core action-required state without secret values", () => {
  return withEnv(
    {
      META_VERIFY_TOKEN: "meta-verify",
      META_APP_SECRET: "meta-secret",
      META_WEBHOOK_ENFORCE_SIGNATURE: "true",
      WHATSAPP_VERIFY_TOKEN: "whatsapp-verify",
      WHATSAPP_APP_SECRET: "whatsapp-secret",
      WHATSAPP_WEBHOOK_ENFORCE_SIGNATURE: "true",
      MERCADO_PAGO_WEBHOOK_SECRET: "mp-secret",
      MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE: "true",
      TELEGRAM_WEBHOOK_SECRET: undefined,
      NOTIFICATIONS_WORKER_SECRET: undefined,
      CRON_SECRET: undefined
    },
    () => {
      const section = buildChannelWebhookReadinessSection();
      const serialized = JSON.stringify(section);

      assert.equal(section.code, "channel_readiness_action_required");
      assert.equal(serialized.includes("meta-secret"), false);
      assert.equal(serialized.includes("whatsapp-secret"), false);
      assert.equal(serialized.includes("mp-secret"), false);
      assert.match(serialized, /whatsapp/);
      assert.match(serialized, /mercado_pago/);
      assert.match(serialized, /telegram/);
    }
  );
});
