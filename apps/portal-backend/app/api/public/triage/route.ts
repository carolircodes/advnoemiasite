import { NextResponse } from "next/server";

import { extractErrorMessage } from "../../../../lib/http/api-response";
import {
  buildRateLimitHeaders,
  consumeRateLimit
} from "../../../../lib/http/request-guards";
import { corsPreflightResponse, withPublicApiCors } from "../../../../lib/http/cors-public";
import { submitPublicTriage } from "../../../../lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() || null;
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit({
    bucket: "public-triage",
    key: getClientIp(request) || "unknown",
    limit: 5,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    const res = NextResponse.json(
      {
        ok: false,
        error: "triage_rate_limited"
      },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimit)
      }
    );

    return withPublicApiCors(request, res);
  }

  try {
    const payload = await request.json();
    const sessionId =
      request.headers.get("x-product-session-id") ||
      payload?.sessionId ||
      undefined;
    const result = await submitPublicTriage(payload, {
      pagePath:
        typeof payload?.sourcePath === "string" && payload.sourcePath
          ? payload.sourcePath
          : "/triagem",
      sessionId,
      userAgent: request.headers.get("user-agent"),
      ipAddress: getClientIp(request)
    });

    const res = NextResponse.json(
      {
        ok: true,
        intakeRequestId: result.id
      },
      {
        status: 201,
        headers: buildRateLimitHeaders(rateLimit)
      }
    );
    return withPublicApiCors(request, res);
  } catch (error) {
    console.warn("[public.triage] Request rejected", {
      error: extractErrorMessage(error, "Nao foi possivel receber a triagem agora.")
    });

    const res = NextResponse.json(
      {
        ok: false,
        error: "Nao foi possivel receber a triagem agora."
      },
      {
        status: 400,
        headers: buildRateLimitHeaders(rateLimit)
      }
    );
    return withPublicApiCors(request, res);
  }
}
