import { NextRequest, NextResponse } from "next/server";

import { assertRouteSecret } from "@/lib/http/route-secret";
import { syncSubscriptionFromPreapprovalId } from "@/lib/services/ecosystem-billing";

function extractPreapprovalId(request: NextRequest, event: any) {
  return (
    request.nextUrl.searchParams.get("data.id") ||
    request.nextUrl.searchParams.get("id") ||
    request.nextUrl.searchParams.get("preapproval_id") ||
    (typeof event?.data?.id === "string" || typeof event?.data?.id === "number"
      ? String(event.data.id)
      : null) ||
    (typeof event?.id === "string" || typeof event?.id === "number"
      ? String(event.id)
      : null)
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook de recorrencia premium disponivel para sincronizacao controlada."
  });
}

export async function POST(request: NextRequest) {
  try {
    const access = assertRouteSecret({
      request,
      expectedSecret: process.env.ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET,
      secretName: "ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET",
      errorMessage: "webhook_unauthorized",
      headerNames: ["x-ecosystem-webhook-secret"],
      queryParamNames: ["secret"],
      allowLocalWithoutSecret: true
    });

    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    let payload: any = {};

    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const preapprovalId = extractPreapprovalId(request, payload);

    if (!preapprovalId) {
      return NextResponse.json(
        { ok: false, error: "preapproval_id_obrigatorio" },
        { status: 400 }
      );
    }

    const result = await syncSubscriptionFromPreapprovalId(preapprovalId, "webhook");

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel sincronizar a recorrencia premium."
      },
      { status: 500 }
    );
  }
}
