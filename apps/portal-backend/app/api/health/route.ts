import { NextResponse } from "next/server";

/**
 * Health check para load balancer / deploy (sem Supabase, sem cookies).
 * Excluído do matcher em `middleware.ts`.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "portal-backend",
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
