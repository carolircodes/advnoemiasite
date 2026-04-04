import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  buildLoginRedirectPath,
  getPostAuthDestination,
  normalizeNextPath
} from "@/lib/auth/access-control";
import {
  ensureProfileForUser
} from "@/lib/auth/guards";
import { getServerEnv } from "@/lib/config/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const env = getServerEnv();
  const appOrigin = env.NEXT_PUBLIC_APP_URL;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = normalizeOtpType(url.searchParams.get("type"));
  const next = normalizeNextPath(url.searchParams.get("next"));

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(null, "link-invalido"), appOrigin)
    );
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
    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(null, "link-expirado"), appOrigin)
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(null, "sessao-nao-disponivel"), appOrigin)
    );
  }

  const profile = await ensureProfileForUser(user);
  if (!profile.is_active) {
    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(null, "perfil-inativo"), appOrigin)
    );
  }

  const destination =
    otpType === "recovery"
      ? "/auth/atualizar-senha"
      : getPostAuthDestination(profile, next);

  return NextResponse.redirect(new URL(destination, appOrigin));
}
