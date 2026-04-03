import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getProfileById } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

function normalizeOtpType(type: string | null): EmailOtpType | null {
  if (!type) {
    return null;
  }

  const supportedTypes: EmailOtpType[] = [
    "invite",
    "recovery",
    "email",
    "email_change"
  ];

  return supportedTypes.includes(type as EmailOtpType) ? (type as EmailOtpType) : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = normalizeOtpType(url.searchParams.get("type"));
  const next = normalizeNextPath(url.searchParams.get("next"));

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(new URL("/auth/login?error=link-invalido", url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } =
    tokenHash && otpType
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType
        })
      : await supabase.auth.exchangeCodeForSession(code as string);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=link-expirado", url.origin));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?error=sessao-nao-disponivel", url.origin));
  }

  const profile = await getProfileById(user.id);

  if (!profile) {
    return NextResponse.redirect(
      new URL("/auth/login?error=perfil-nao-localizado", url.origin)
    );
  }

  let destination =
    next ||
    (otpType === "recovery"
      ? "/auth/atualizar-senha"
      : profile.role === "cliente"
        ? "/cliente"
        : "/internal/advogada");

  if (profile.role === "cliente" && !profile.first_login_completed_at && next !== "/auth/atualizar-senha") {
    destination = "/auth/primeiro-acesso";
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
