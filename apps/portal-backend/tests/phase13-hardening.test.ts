import test from "node:test";
import assert from "node:assert/strict";

import {
  createIssuedSiteChatSession,
  getSiteChatCookieName,
  readSiteChatSessionFromRequest
} from "../lib/site/site-chat-session.ts";
import { shouldEnforceDurableProtection } from "../lib/http/durable-abuse-protection.ts";

function withEnv<T>(entries: Record<string, string | undefined>, run: () => T) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(entries)) {
    previous.set(key, process.env[key]);

    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("site chat session cookies are signed and accepted only when untampered", () => {
  withEnv(
    {
      SITE_CHAT_SESSION_SECRET: "chat-secret-for-tests",
      INTERNAL_API_SECRET: undefined
    },
    () => {
      const issued = createIssuedSiteChatSession("session_secure_123456");
      assert.equal(issued.ok, true);

      if (!issued.ok) {
        assert.fail("expected a signed site chat session");
      }

      const request = new Request("https://portal.advnoemia.com.br/api/noemia/chat", {
        headers: {
          cookie: `${getSiteChatCookieName()}=${issued.value}`
        }
      });

      const verified = readSiteChatSessionFromRequest(request);
      assert.equal(verified.ok, true);

      if (verified.ok) {
        assert.equal(verified.sessionId, "session_secure_123456");
      }
    }
  );
});

test("site chat rejects tampered cookies instead of trusting the presented session id", () => {
  withEnv(
    {
      SITE_CHAT_SESSION_SECRET: "chat-secret-for-tests",
      INTERNAL_API_SECRET: undefined
    },
    () => {
      const issued = createIssuedSiteChatSession("session_secure_123456");
      assert.equal(issued.ok, true);

      if (!issued.ok) {
        assert.fail("expected a signed site chat session");
      }

      const tamperedValue = issued.value.replace("session_secure_123456", "session_secure_654321");
      const request = new Request("https://portal.advnoemia.com.br/api/noemia/chat", {
        headers: {
          cookie: `${getSiteChatCookieName()}=${tamperedValue}`
        }
      });

      const verified = readSiteChatSessionFromRequest(request);
      assert.equal(verified.ok, false);

      if (!verified.ok) {
        assert.equal(verified.reason, "invalid");
      }
    }
  );
});

test("durable protection is treated as mandatory in production-like enforcement", () => {
  withEnv(
    {
      NODE_ENV: "production",
      DURABLE_PROTECTION_REQUIRED: undefined
    },
    () => {
      assert.equal(shouldEnforceDurableProtection(), true);
    }
  );

  withEnv(
    {
      NODE_ENV: "development",
      DURABLE_PROTECTION_REQUIRED: "false"
    },
    () => {
      assert.equal(shouldEnforceDurableProtection(), false);
    }
  );
});
