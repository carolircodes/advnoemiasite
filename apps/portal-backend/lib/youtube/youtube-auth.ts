import { createHmac, timingSafeEqual } from "node:crypto";

import { getYouTubeCredentialState } from "./youtube-config.ts";

type YouTubeOAuthStatePayload = {
  issuedAt: string;
  redirectTo: string;
  mode: string;
};

const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl"
];

function getOAuthStateSecret() {
  return (
    process.env.YOUTUBE_OAUTH_STATE_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim() ||
    ""
  );
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  return Buffer.from(`${normalized}${"=".repeat(paddingLength)}`, "base64").toString("utf8");
}

function signValue(rawValue: string, secret: string) {
  return createHmac("sha256", secret).update(rawValue).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildYouTubeOAuthAuthorizationUrl(input?: {
  redirectTo?: string;
  mode?: string;
}) {
  const credentials = getYouTubeCredentialState();
  const secret = getOAuthStateSecret();

  if (!credentials.oauthReady) {
    throw new Error("OAuth do YouTube ainda nao esta pronto. Revise client id, client secret e redirect URI.");
  }

  if (!secret) {
    throw new Error("Nao existe secret para assinar o state do OAuth do YouTube.");
  }

  const payload: YouTubeOAuthStatePayload = {
    issuedAt: new Date().toISOString(),
    redirectTo: input?.redirectTo || "/internal/advogada/atendimento",
    mode: input?.mode || "suggestion"
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload, secret);
  const state = `${encodedPayload}.${signature}`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", process.env.YOUTUBE_CLIENT_ID!.trim());
  url.searchParams.set("redirect_uri", credentials.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", YOUTUBE_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);

  return {
    url: url.toString(),
    state,
    scopes: [...YOUTUBE_OAUTH_SCOPES]
  };
}

export function verifyYouTubeOAuthState(rawState: string) {
  const secret = getOAuthStateSecret();

  if (!secret) {
    throw new Error("Nao existe secret para validar o state do OAuth do YouTube.");
  }

  const [encodedPayload, signature] = rawState.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("State do OAuth do YouTube esta malformado.");
  }

  const expectedSignature = signValue(encodedPayload, secret);

  if (!safeCompare(signature, expectedSignature)) {
    throw new Error("State do OAuth do YouTube falhou na validacao.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as YouTubeOAuthStatePayload;
  return payload;
}

export async function exchangeYouTubeOAuthCode(code: string) {
  const credentials = getYouTubeCredentialState();

  if (!credentials.oauthReady) {
    throw new Error("OAuth do YouTube nao esta pronto para trocar o code.");
  }

  const params = new URLSearchParams({
    code,
    client_id: process.env.YOUTUBE_CLIENT_ID!.trim(),
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!.trim(),
    redirect_uri: credentials.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    console.error("YOUTUBE_OAUTH_EXCHANGE_FAILED", {
      service: "youtube_oauth",
      action: "exchange_code",
      channel: "youtube",
      status: response.status,
      error: typeof payload.error === "string" ? payload.error : "unknown",
      errorDescription:
        typeof payload.error_description === "string" ? payload.error_description : null
    });

    throw new Error(
      typeof payload.error_description === "string"
        ? payload.error_description
        : "A troca do code OAuth do YouTube falhou."
    );
  }

  const tokenResponse = {
    accessToken: typeof payload.access_token === "string" ? payload.access_token : "",
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : "",
    scope: typeof payload.scope === "string" ? payload.scope : "",
    tokenType: typeof payload.token_type === "string" ? payload.token_type : "",
    expiresIn:
      typeof payload.expires_in === "number"
        ? payload.expires_in
        : Number(payload.expires_in || 0) || 0
  };

  console.info("YOUTUBE_OAUTH_EXCHANGE_SUCCEEDED", {
    service: "youtube_oauth",
    action: "exchange_code",
    channel: "youtube",
    hasRefreshToken: Boolean(tokenResponse.refreshToken),
    scope: tokenResponse.scope,
    expiresIn: tokenResponse.expiresIn
  });

  return tokenResponse;
}
