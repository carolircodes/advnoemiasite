import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  buildAccessDeniedPath,
  buildLoginRedirectPath,
  canAccessPortalPath,
  isInternalApiPath,
  isProtectedPortalPath
} from "../auth/access-control";
import { isPortalRole } from "../domain/portal";
import { getPublicEnv } from "../config/env";

export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();
  const appOrigin = env.NEXT_PUBLIC_APP_URL;
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!isProtectedPortalPath(pathname)) {
    return response;
  }

  if (!user) {
    if (isInternalApiPath(pathname)) {
      return NextResponse.json(
        { error: "Faca login para acessar a API interna." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(pathname, "login-obrigatorio"), appOrigin)
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active,first_login_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[middleware.auth] Failed to load profile", {
      pathname,
      userId: user.id,
      message: profileError.message
    });

    if (isInternalApiPath(pathname)) {
      return NextResponse.json(
        { error: "Nao foi possivel validar o perfil autenticado." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(pathname, "acesso-restrito"), appOrigin)
    );
  }

  if (!profile || !isPortalRole(profile.role)) {
    if (isInternalApiPath(pathname)) {
      return NextResponse.json(
        { error: "Perfil do portal nao encontrado para esta sessao." },
        { status: 403 }
      );
    }

    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(pathname, "acesso-restrito"), appOrigin)
    );
  }

  if (!profile.is_active) {
    if (isInternalApiPath(pathname)) {
      return NextResponse.json(
        { error: "Seu perfil do portal esta inativo." },
        { status: 403 }
      );
    }

    return NextResponse.redirect(
      new URL(buildLoginRedirectPath(pathname, "perfil-inativo"), appOrigin)
    );
  }

  if (!canAccessPortalPath(profile, pathname)) {
    if (isInternalApiPath(pathname)) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para acessar esta API." },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL(buildAccessDeniedPath(profile), appOrigin));
  }

  return response;
}
