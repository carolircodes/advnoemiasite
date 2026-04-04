import { NextResponse } from "next/server";

import { corsPreflightResponse, withPublicApiCors } from "@/lib/http/cors-public";
import { submitPublicTriage } from "@/lib/services/public-intake";

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
      { status: 201 }
    );
    return withPublicApiCors(request, res);
  } catch (error) {
    const res = NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel receber a triagem agora."
      },
      { status: 400 }
    );
    return withPublicApiCors(request, res);
  }
}
