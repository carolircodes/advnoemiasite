import { NextRequest, NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth/guards";
import { startCirculoEssencialSubscriptionCheckout } from "@/lib/services/ecosystem-billing";

function buildReturnUrl(request: NextRequest, error?: string) {
  const target = new URL("/cliente/ecossistema/beneficios", request.url);

  if (error) {
    target.searchParams.set("error", error);
  }

  return target;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireProfile(["cliente"]);
    const result = await startCirculoEssencialSubscriptionCheckout(profile);

    return NextResponse.redirect(result.checkoutUrl);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel iniciar a assinatura premium agora.";

    return NextResponse.redirect(buildReturnUrl(request, message));
  }
}
