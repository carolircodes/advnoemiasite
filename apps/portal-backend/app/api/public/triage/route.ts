import { NextResponse } from "next/server";

import { submitPublicTriage } from "@/lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json(
      {
        ok: true,
        intakeRequestId: result.id
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel receber a triagem agora."
      },
      { status: 400 }
    );
  }
}
