export function buildInternalClientHref(clientId: string, hash?: string) {
  const safeHash = hash ? `#${hash}` : "";
  return `/internal/advogada/clientes/${clientId}${safeHash}`;
}

export function buildInternalAgendaHref(clientId?: string | null, caseId?: string | null) {
  const searchParams = new URLSearchParams();

  if (clientId) {
    searchParams.set("clientId", clientId);
  }

  if (caseId) {
    searchParams.set("caseId", caseId);
  }

  const query = searchParams.toString();
  return query ? `/agenda?${query}` : "/agenda";
}

export function buildInternalDocumentsHref(clientId?: string | null, caseId?: string | null) {
  const searchParams = new URLSearchParams();

  if (clientId) {
    searchParams.set("clientId", clientId);
  }

  if (caseId) {
    searchParams.set("caseId", caseId);
  }

  const query = searchParams.toString();
  return query ? `/documentos?${query}` : "/documentos";
}
