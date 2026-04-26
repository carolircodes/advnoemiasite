import { extractErrorMessage } from "../../../../lib/http/api-response.ts";
import {
  buildDurableRateLimitHeaders,
  consumeDurableRateLimit
} from "../../../../lib/http/durable-abuse-protection.ts";
import { getClientIp } from "../../../../lib/http/request-guards.ts";
import { corsPreflightResponse, withPublicApiCors } from "../../../../lib/http/cors-public.ts";
import { submitPublicTriage } from "../../../../lib/services/public-intake.ts";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "../../../../lib/observability/request-observability.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export async function POST(request: Request) {
  const observation = startRequestObservation(request);
  const rateLimit = await consumeDurableRateLimit({
    bucket: "public-triage",
    key: getClientIp(request) || "unknown",
    limit: 5,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    logObservedRequest("warn", "PUBLIC_TRIAGE_RATE_LIMITED", observation, {
      limiter: "public-triage"
    });

    const res = createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "triage_rate_limited"
      },
      {
        status: 429,
        headers: buildDurableRateLimitHeaders(rateLimit)
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

    logObservedRequest("info", "PUBLIC_TRIAGE_ACCEPTED", observation, {
      sourcePath:
        typeof payload?.sourcePath === "string" && payload.sourcePath
          ? payload.sourcePath
          : "/triagem",
      sessionId: sessionId || null
    });

    const res = createObservedJsonResponse(
      observation,
      {
        ok: true,
        intakeRequestId: result.id
      },
      {
        status: 201,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
    return withPublicApiCors(request, res);
  } catch (error) {
    logObservedRequest(
      "warn",
      "PUBLIC_TRIAGE_REJECTED",
      observation,
      {
        reason: extractErrorMessage(error, "Nao foi possivel receber a triagem agora.")
      },
      error
    );

    const res = createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "Nao foi possivel receber a triagem agora."
      },
      {
        status: 400,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
    return withPublicApiCors(request, res);
  }
}
