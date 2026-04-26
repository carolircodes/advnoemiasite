import type { NextRequest } from "next/server";

import { guardSensitiveRoute, isSensitiveRoute } from "./lib/http/sensitive-route.ts";
import { updateSession } from "./lib/supabase/middleware.ts";

export async function middleware(request: NextRequest) {
  if (isSensitiveRoute(request.nextUrl.pathname)) {
    const sensitiveRouteResponse = guardSensitiveRoute(request);

    if (sensitiveRouteResponse) {
      return sensitiveRouteResponse;
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/cliente/:path*",
    "/documentos/:path*",
    "/agenda/:path*",
    "/internal/:path*",
    "/api/internal/:path*"
  ]
};
