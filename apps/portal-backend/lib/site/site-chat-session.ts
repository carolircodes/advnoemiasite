import { createHmac, randomUUID } from "crypto";

import type { NextRequest, NextResponse } from "next/server";

const SITE_CHAT_COOKIE_NAME = "noemia_site_chat";
const SITE_CHAT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SITE_CHAT_COOKIE_VERSION = "v1";
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{16,120}$/;

type SiteChatSecretResult =
  | {
      ok: true;
      secret: string;
      source: "SITE_CHAT_SESSION_SECRET" | "INTERNAL_API_SECRET";
    }
  | {
      ok: false;
      reason: "missing_secret";
    };

type VerifiedSiteChatSession =
  | {
      ok: true;
      sessionId: string;
      issuedAt: number;
    }
  | {
      ok: false;
      reason: "missing" | "invalid" | "misconfigured";
    };

type IssuedSiteChatSession =
  | {
      ok: true;
      sessionId: string;
      issuedAt: number;
      value: string;
      secretSource: "SITE_CHAT_SESSION_SECRET" | "INTERNAL_API_SECRET";
    }
  | {
      ok: false;
      reason: "missing_secret" | "invalid_session_id";
    };

function getSiteChatSecret(): SiteChatSecretResult {
  const directSecret = process.env.SITE_CHAT_SESSION_SECRET?.trim();

  if (directSecret) {
    return {
      ok: true,
      secret: directSecret,
      source: "SITE_CHAT_SESSION_SECRET"
    };
  }

  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();

  if (internalSecret) {
    return {
      ok: true,
      secret: internalSecret,
      source: "INTERNAL_API_SECRET"
    };
  }

  return {
    ok: false,
    reason: "missing_secret"
  };
}

function isValidSessionId(value: string) {
  return SESSION_ID_PATTERN.test(value);
}

function buildSessionSignature(secret: string, sessionId: string, issuedAt: number) {
  return createHmac("sha256", secret)
    .update(`${SITE_CHAT_COOKIE_VERSION}:${sessionId}:${issuedAt}`)
    .digest("hex");
}

function serializeSignedSession(secret: string, sessionId: string, issuedAt: number) {
  const signature = buildSessionSignature(secret, sessionId, issuedAt);
  return `${SITE_CHAT_COOKIE_VERSION}.${sessionId}.${issuedAt}.${signature}`;
}

function parseSignedSession(
  cookieValue: string | undefined,
  secret: string
): VerifiedSiteChatSession {
  if (!cookieValue) {
    return {
      ok: false,
      reason: "missing"
    };
  }

  const [version, sessionId, issuedAtRaw, signature] = cookieValue.split(".");
  const issuedAt = Number.parseInt(issuedAtRaw || "", 10);

  if (
    version !== SITE_CHAT_COOKIE_VERSION ||
    !sessionId ||
    !signature ||
    !Number.isFinite(issuedAt) ||
    issuedAt <= 0 ||
    !isValidSessionId(sessionId)
  ) {
    return {
      ok: false,
      reason: "invalid"
    };
  }

  const expectedSignature = buildSessionSignature(secret, sessionId, issuedAt);

  if (expectedSignature !== signature) {
    return {
      ok: false,
      reason: "invalid"
    };
  }

  return {
    ok: true,
    sessionId,
    issuedAt
  };
}

function readCookieValueFromHeader(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");

    if (rawName === cookieName) {
      return rawValue.join("=");
    }
  }

  return undefined;
}

export function getSiteChatCookieName() {
  return SITE_CHAT_COOKIE_NAME;
}

export function createIssuedSiteChatSession(sessionId?: string): IssuedSiteChatSession {
  const secret = getSiteChatSecret();

  if (!secret.ok) {
    return {
      ok: false,
      reason: "missing_secret" as const
    };
  }

  const safeSessionId = sessionId?.trim() || randomUUID();

  if (!isValidSessionId(safeSessionId)) {
    return {
      ok: false,
      reason: "invalid_session_id" as const
    };
  }

  const issuedAt = Date.now();

  return {
    ok: true,
    sessionId: safeSessionId,
    issuedAt,
    value: serializeSignedSession(secret.secret, safeSessionId, issuedAt),
    secretSource: secret.source
  };
}

export function readSiteChatSessionFromRequest(request: Request | NextRequest): VerifiedSiteChatSession {
  const secret = getSiteChatSecret();

  if (!secret.ok) {
    return {
      ok: false,
      reason: "misconfigured"
    };
  }

  const cookieValue =
    "cookies" in request && request.cookies
      ? request.cookies.get(SITE_CHAT_COOKIE_NAME)?.value
      : readCookieValueFromHeader(request.headers.get("cookie"), SITE_CHAT_COOKIE_NAME);

  return parseSignedSession(cookieValue, secret.secret);
}

export function setSiteChatSessionCookie(response: NextResponse, sessionId: string) {
  const issuedSession = createIssuedSiteChatSession(sessionId);

  if (!issuedSession.ok) {
    throw new Error(
      issuedSession.reason === "missing_secret"
        ? "site_chat_session_secret_missing"
        : "site_chat_session_invalid"
    );
  }

  response.cookies.set({
    name: SITE_CHAT_COOKIE_NAME,
    value: issuedSession.value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_CHAT_COOKIE_MAX_AGE_SECONDS
  });

  return issuedSession.sessionId;
}

export function clearSiteChatSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SITE_CHAT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
