import type { NextRequest } from "next/server";

import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
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
