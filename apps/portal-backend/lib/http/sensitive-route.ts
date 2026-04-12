import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function getBearerToken(value: string | null) {
  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function getConfiguredSecret() {
  const secret = process.env.DEBUG_ROUTE_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

export function isSensitiveRoute(pathname: string) {
  return (
    pathname.startsWith("/api/debug/") ||
    pathname.startsWith("/api/test/") ||
    pathname === "/api/meta/test" ||
    pathname === "/api/whatsapp/webhook/test"
  );
}

export function guardSensitiveRoute(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const isLocalRequest = LOCAL_HOSTS.has(hostname);
  const isProduction = process.env.NODE_ENV === "production";
  const configuredSecret = getConfiguredSecret();
  const providedSecret =
    request.headers.get("x-debug-secret") ||
    getBearerToken(request.headers.get("authorization"));

  if (!isProduction && isLocalRequest) {
    return null;
  }

  if (configuredSecret && providedSecret === configuredSecret) {
    return null;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
