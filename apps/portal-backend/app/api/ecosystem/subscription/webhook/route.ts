import { NextRequest, NextResponse } from "next/server";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
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
    const access = await requireRouteSecretOrStaffAccess({
      request,
      expectedSecret: process.env.ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET,
      secretName: "ECOSYSTEM_SUBSCRIPTION_WEBHOOK_SECRET",
      errorMessage: "webhook_unauthorized",
      service: "ecosystem_subscription_webhook",
      action: "receive_webhook",
      headerNames: ["x-ecosystem-webhook-secret"],
      queryParamNames: ["secret"],
      allowLocalWithoutSecret: true
    });

    if (!access.ok) {
      return access.response;
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
    console.error("[ecosystem.subscription.webhook] Processing error", {
      error: extractErrorMessage(error, "Nao foi possivel sincronizar a recorrencia premium.")
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Nao foi possivel sincronizar a recorrencia premium."
      },
      { status: 500 }
    );
  }
}
