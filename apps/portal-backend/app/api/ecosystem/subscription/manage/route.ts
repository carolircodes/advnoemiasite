import { NextRequest, NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth/guards";
import { applyCirculoEssencialLifecycleAction } from "@/lib/services/ecosystem-billing";

function buildRedirect(request: NextRequest, error?: string, success?: string) {
  const target = new URL("/cliente/ecossistema/beneficios", request.url);

  if (error) {
    target.searchParams.set("error", error);
  }

  if (success) {
    target.searchParams.set("success", success);
  }

  return target;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireProfile(["cliente"]);
    const action = request.nextUrl.searchParams.get("action");

    if (!action || !["pause", "resume", "cancel", "sync"].includes(action)) {
      return NextResponse.redirect(buildRedirect(request, "acao-de-assinatura-invalida"));
    }

    await applyCirculoEssencialLifecycleAction(
      profile,
      action as "pause" | "resume" | "cancel" | "sync"
    );

    return NextResponse.redirect(buildRedirect(request, undefined, action));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar a assinatura premium agora.";

    return NextResponse.redirect(buildRedirect(request, message));
  }
}
