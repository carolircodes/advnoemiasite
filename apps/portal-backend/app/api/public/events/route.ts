import { z } from "zod";

import { corsPreflightResponse, withPublicApiCors } from "../../../../lib/http/cors-public";
import {
  buildDurableRateLimitHeaders,
  consumeDurableRateLimit
} from "../../../../lib/http/durable-abuse-protection";
import { getClientIp, parseJsonBody } from "../../../../lib/http/request-guards";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "../../../../lib/observability/request-observability";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { recordProductEvent } from "../../../../lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicEventRequestSchema = z.object({
  eventKey: z.string().trim().min(1).max(120),
  eventGroup: z.string().trim().min(1).max(80).optional(),
  pagePath: z.string().trim().min(1).max(300).optional(),
  sessionId: z.string().trim().min(1).max(160).optional(),
  intakeRequestId: z.string().trim().min(1).max(160).optional(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export async function POST(request: Request) {
  const observation = startRequestObservation(request);
  const rateLimit = await consumeDurableRateLimit({
    bucket: "public-events",
    key: `${getClientIp(request)}:${request.headers.get("x-product-session-id") || "anon"}`,
    limit: 20,
    windowMs: 5 * 60 * 1000
  });

  if (!rateLimit.ok) {
    logObservedRequest("warn", "PUBLIC_EVENT_RATE_LIMITED", observation, {
      limiter: "public-events"
    });

    const response = createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "public_event_rate_limited"
      },
      {
        status: 429,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );

    return withPublicApiCors(request, response);
  }

  try {
    const parsedBody = await parseJsonBody(request, publicEventRequestSchema, {
      invalidBodyError: "invalid_public_event"
    });

    if (!parsedBody.ok) {
      logObservedRequest("warn", "PUBLIC_EVENT_INVALID_BODY", observation);
      return withPublicApiCors(request, parsedBody.response);
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    let profileId: string | undefined;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_active) {
        profileId = profile.id;
      }
    }

    const result = await recordProductEvent({
      ...parsedBody.data,
      profileId
    });

    logObservedRequest("info", "PUBLIC_EVENT_RECORDED", observation, {
      eventKey: parsedBody.data.eventKey,
      eventGroup: parsedBody.data.eventGroup || null
    });

    const res = createObservedJsonResponse(
      observation,
      {
        ok: true,
        eventId: result.id
      },
      {
        status: 201,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
    return withPublicApiCors(request, res);
  } catch (error) {
    logObservedRequest("error", "PUBLIC_EVENT_FAILED", observation, {}, error);

    const res = createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "Nao foi possivel registrar o evento agora."
      },
      {
        status: 400,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
    return withPublicApiCors(request, res);
  }
}
