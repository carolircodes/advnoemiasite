import type { PortalRole } from "../domain/portal";

export type AccessProfile = {
  role: PortalRole;
  is_active?: boolean;
  first_login_completed_at?: string | null;
};

export const CLIENT_LOGIN_PATH = "/portal/login";
export const LEGACY_CLIENT_LOGIN_PATH = "/auth/login";

function matchesPrefix(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function normalizeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

export function isStaffRole(role: PortalRole) {
  return role === "admin" || role === "advogada";
}

export function isInternalPath(pathname: string) {
  return matchesPrefix(pathname, "/internal");
}

export function isInternalApiPath(pathname: string) {
  return matchesPrefix(pathname, "/api/internal");
}

export function isClientPortalPath(pathname: string) {
  return matchesPrefix(pathname, "/cliente");
}

export function isSharedPortalPath(pathname: string) {
  return matchesPrefix(pathname, "/documentos") || matchesPrefix(pathname, "/agenda");
}

export function isProtectedPortalPath(pathname: string) {
  return (
    isInternalPath(pathname) ||
    isInternalApiPath(pathname) ||
    isClientPortalPath(pathname) ||
    isSharedPortalPath(pathname)
  );
}

export function getDefaultDestinationForProfile(
  profile: Pick<AccessProfile, "role" | "first_login_completed_at">
) {
  if (profile.role === "cliente" && !profile.first_login_completed_at) {
    return "/auth/primeiro-acesso";
  }

  return isStaffRole(profile.role) ? "/internal/advogada" : "/cliente";
}

export function canAccessPortalPath(
  profile: Pick<AccessProfile, "role" | "first_login_completed_at">,
  pathname: string
) {
  const normalizedPath = normalizeNextPath(pathname) || pathname;
  const needsFirstAccess = profile.role === "cliente" && !profile.first_login_completed_at;

  if (matchesPrefix(normalizedPath, "/auth/primeiro-acesso")) {
    return profile.role === "cliente";
  }

  if (matchesPrefix(normalizedPath, "/auth/atualizar-senha")) {
    return true;
  }

  if (needsFirstAccess) {
    return false;
  }

  if (isInternalPath(normalizedPath) || isInternalApiPath(normalizedPath)) {
    return isStaffRole(profile.role);
  }

  if (isClientPortalPath(normalizedPath)) {
    return profile.role === "cliente";
  }

  if (isSharedPortalPath(normalizedPath)) {
    return profile.role === "cliente" || isStaffRole(profile.role);
  }

  return true;
}

function appendErrorParam(pathname: string, error: string) {
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}error=${encodeURIComponent(error)}`;
}

export function buildLoginRedirectPath(nextPath?: string | null, error = "login-obrigatorio") {
  const params = new URLSearchParams({
    error
  });
  const normalizedNext = normalizeNextPath(nextPath);

  if (normalizedNext) {
    params.set("next", normalizedNext);
  }

  return `${CLIENT_LOGIN_PATH}?${params.toString()}`;
}

export function buildAccessDeniedPath(
  profile: Pick<AccessProfile, "role" | "first_login_completed_at">
) {
  const error =
    profile.role === "cliente" && !profile.first_login_completed_at
      ? "primeiro-acesso-obrigatorio"
      : "acesso-negado";

  return appendErrorParam(getDefaultDestinationForProfile(profile), error);
}

export function getPostAuthDestination(
  profile: Pick<AccessProfile, "role" | "first_login_completed_at">,
  requestedPath?: string | null
) {
  const normalizedNext = normalizeNextPath(requestedPath);

  if (!normalizedNext) {
    return getDefaultDestinationForProfile(profile);
  }

  if (canAccessPortalPath(profile, normalizedNext)) {
    return normalizedNext;
  }

  return buildAccessDeniedPath(profile);
}

export function getAccessMessage(error: string) {
  switch (error) {
    case "login-obrigatorio":
      return "Faca login para continuar no portal.";
    case "auth-indisponivel":
      return "A autenticacao do portal esta temporariamente indisponivel. Tente novamente em instantes.";
    case "acesso-negado":
      return "Voce nao tem permissao para acessar esta area.";
    case "acesso-restrito":
      return "Seu perfil nao esta autorizado a acessar o portal.";
    case "perfil-inativo":
      return "Seu perfil esta inativo. Fale com a equipe responsavel.";
    case "primeiro-acesso-obrigatorio":
      return "Conclua o primeiro acesso antes de entrar nesta area.";
    default:
      return "";
  }
}
