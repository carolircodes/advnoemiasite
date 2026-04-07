import { NextResponse } from "next/server";

/**
 * CORS para `/api/public/*` quando o site institucional (apex) chama o portal em outro host.
 * Origens adicionais: `CORS_ALLOWED_ORIGINS` (lista separada por vírgulas) e `NEXT_PUBLIC_PUBLIC_SITE_URL`.
 */
export function getAllowedOriginsForPublicApi(): string[] {
  const origins = new Set<string>([
    "https://advnoemia.com.br",
    "https://www.advnoemia.com.br"
  ]);

  const publicSite = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (publicSite) {
    origins.add(publicSite);
  }

  const extra = process.env.CORS_ALLOWED_ORIGINS?.split(",") || [];
  for (const raw of extra) {
    const o = raw.trim().replace(/\/$/, "");
    if (o) {
      origins.add(o);
    }
  }

  return [...origins];
}

export function resolveCorsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const allowed = getAllowedOriginsForPublicApi();
  const normalized = origin.replace(/\/$/, "");
  return allowed.includes(normalized) ? origin : null;
}

export function corsHeadersForRequest(request: Request): Headers {
  const headers = new Headers();
  const allowOrigin = resolveCorsOrigin(request);

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, x-product-session-id");
    headers.set("Access-Control-Max-Age", "86400");
    headers.set("Vary", "Origin");
  }

  return headers;
}

export function corsPreflightResponse(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersForRequest(request)
  });
}

export function withPublicApiCors(request: Request, response: NextResponse) {
  const cors = corsHeadersForRequest(request);
  cors.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
