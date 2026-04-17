import type { NextRequest } from "next/server";

import { timingSafeEqualText } from "./webhook-security";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type SecretGuardRequest = Request | NextRequest;

type SecretGuardOptions = {
  request: SecretGuardRequest;
  expectedSecret: string | null | undefined;
  secretName: string;
  errorMessage: string;
  headerNames?: string[];
  queryParamNames?: string[];
  allowLocalWithoutSecret?: boolean;
};

type SecretGuardResult =
  | { ok: true; source: "header" | "query" | "local-dev" }
  | { ok: false; status: number; error: string };

function getRequestUrl(request: SecretGuardRequest) {
  return new URL(request.url);
}

function getBearerToken(value: string | null) {
  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function getHeaderCandidate(request: SecretGuardRequest, headerNames: string[]) {
  for (const headerName of headerNames) {
    const value = request.headers.get(headerName)?.trim();

    if (value) {
      return value;
    }
  }

  return getBearerToken(request.headers.get("authorization"));
}

function getQueryCandidate(request: SecretGuardRequest, queryParamNames: string[]) {
  const requestUrl = getRequestUrl(request);

  for (const queryParamName of queryParamNames) {
    const value = requestUrl.searchParams.get(queryParamName)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function isLocalRequest(request: SecretGuardRequest) {
  return LOCAL_HOSTS.has(getRequestUrl(request).hostname);
}

function isSecretMatch(providedSecret: string | null, expectedSecret: string) {
  return providedSecret ? timingSafeEqualText(providedSecret, expectedSecret) : false;
}

export function assertRouteSecret(options: SecretGuardOptions): SecretGuardResult {
  const expectedSecret = options.expectedSecret?.trim() || null;

  if (!expectedSecret) {
    if (
      options.allowLocalWithoutSecret &&
      process.env.NODE_ENV !== "production" &&
      isLocalRequest(options.request)
    ) {
      return { ok: true, source: "local-dev" };
    }

    return {
      ok: false,
      status: 503,
      error: `Defina ${options.secretName} para proteger esta rota.`
    };
  }

  const headerCandidate = getHeaderCandidate(
    options.request,
    options.headerNames || []
  );

  if (isSecretMatch(headerCandidate, expectedSecret)) {
    return { ok: true, source: "header" };
  }

  const queryCandidate = getQueryCandidate(options.request, options.queryParamNames || []);

  if (isSecretMatch(queryCandidate, expectedSecret)) {
    return { ok: true, source: "query" };
  }

  return {
    ok: false,
    status: 401,
    error: options.errorMessage
  };
}

export function hasInternalServiceSecretAccess(request: SecretGuardRequest) {
  const secret = process.env.INTERNAL_API_SECRET?.trim();

  if (!secret) {
    return false;
  }

  return (
    assertRouteSecret({
      request,
      expectedSecret: secret,
      secretName: "INTERNAL_API_SECRET",
      errorMessage: "Operacao interna nao autorizada.",
      headerNames: ["x-internal-api-secret"]
    }).ok
  );
}
