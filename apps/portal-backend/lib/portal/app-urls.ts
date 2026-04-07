import "server-only";

import { getServerEnv } from "../config/env";

function stripTrailingSlash(origin: string) {
  return origin.replace(/\/$/, "");
}

/** Origem canônica do app Next (portal + triagem embutida hoje). Deve coincidir com a URL real do deploy. */
export function getPortalCanonicalOrigin(): string {
  return stripTrailingSlash(getServerEnv().NEXT_PUBLIC_APP_URL);
}

/**
 * Site público de marketing (HTML estático ou outro host).
 * Defina `NEXT_PUBLIC_PUBLIC_SITE_URL` quando o portal estiver em subdomínio (ex.: portal.*).
 */
export function getPublicMarketingSiteOrigin(): string | null {
  const url = getServerEnv().NEXT_PUBLIC_PUBLIC_SITE_URL;
  return url ? stripTrailingSlash(url) : null;
}

/** Monta URL absoluta no domínio do portal (redirects, e-mails). */
export function absolutePortalPath(pathnameAndSearch: string): string {
  const base = getPortalCanonicalOrigin();
  const path = pathnameAndSearch.startsWith("/") ? pathnameAndSearch : `/${pathnameAndSearch}`;
  return `${base}${path}`;
}
