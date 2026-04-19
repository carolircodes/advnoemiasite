import { NextRequest } from "next/server";
import { z } from "zod";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "@/lib/observability/request-observability";
import {
  buildAcquisitionAnalytics,
  type AnalyticsPeriod
} from "@/lib/services/acquisition-analytics";

const periodSchema = z.enum(["today", "7days", "30days"]);

export async function GET(request: NextRequest) {
  const observation = startRequestObservation(request);
  const access = await requireStaffRouteAccess({
    service: "analytics_acquisition",
    action: "read"
  });

  if (!access.ok) {
    logObservedRequest("warn", "ANALYTICS_ACQUISITION_DENIED", observation, {
      status: access.status
    });
    return access.response;
  }

  const requestedPeriod = request.nextUrl.searchParams.get("period") || "7days";
  const parsedPeriod = periodSchema.safeParse(requestedPeriod);

  if (!parsedPeriod.success) {
    logObservedRequest("warn", "ANALYTICS_ACQUISITION_INVALID_PERIOD", observation, {
      period: requestedPeriod
    });

    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "invalid_analytics_period"
      },
      { status: 400 }
    );
  }

  try {
    const analytics = await buildAcquisitionAnalytics(
      parsedPeriod.data as AnalyticsPeriod
    );

    logObservedRequest("info", "ANALYTICS_ACQUISITION_READY", observation, {
      period: parsedPeriod.data,
      totalLeads: analytics.metrics.totalLeads,
      conversions: analytics.metrics.conversions
    });

    return createObservedJsonResponse(observation, {
      ...analytics,
      ok: true
    });
  } catch (error) {
    logObservedRequest("error", "ANALYTICS_ACQUISITION_FAILED", observation, {}, error);

    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "Nao foi possivel carregar os indicadores agora."
      },
      { status: 500 }
    );
  }
}
