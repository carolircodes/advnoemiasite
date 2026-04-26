/**
 * Mapa conceitual de rotas do monólito Next atual.
 * A decisão real de proteção continua em `lib/auth/access-control.ts` + `lib/supabase/middleware.ts`.
 * Mantemos este ficheiro como documentação executável e para futuros layouts separados.
 */

import { isProtectedPortalPath } from "../auth/access-control.ts";

/** Páginas de entrada e fluxo de credenciais (não exigem perfil de portal, só sessão Supabase quando aplicável). */
export const PORTAL_AUTH_PATH_PREFIXES = [
  "/portal/login",
  "/auth/login",
  "/auth/callback",
  "/auth/esqueci-senha",
  "/auth/atualizar-senha"
] as const;

/** Conteúdo público servido pelo mesmo app (hoje convive com o portal). */
export const PORTAL_MARKETING_PATH_PREFIXES = ["/", "/triagem", "/noemia"] as const;

export const PORTAL_PUBLIC_API_PREFIXES = ["/api/public", "/api/health"] as const;

export function isAuthFlowPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  return PORTAL_AUTH_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function isMarketingPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  if (path === "/") {
    return true;
  }
  return PORTAL_MARKETING_PATH_PREFIXES.filter((p) => p !== "/").some((prefix) =>
    path.startsWith(prefix)
  );
}

export function isPublicApiPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  return PORTAL_PUBLIC_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/** Delega para access-control (fonte única para rotas que exigem sessão + perfil). */
export { isProtectedPortalPath };
