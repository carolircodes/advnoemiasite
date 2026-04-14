export function buildInternalClientHref(clientId: string, hash?: string) {
  const safeHash = hash ? `#${hash}` : "";
  return `/internal/advogada/clientes/${clientId}${safeHash}`;
}

export function buildInternalCasesHref(clientId?: string | null) {
  const searchParams = new URLSearchParams();

  if (clientId) {
    searchParams.set("clientId", clientId);
  }

  const query = searchParams.toString();
  return query ? `/internal/advogada/casos?${query}` : "/internal/advogada/casos";
}

export function buildInternalNewCaseHref(clientId?: string | null) {
  const searchParams = new URLSearchParams();

  if (clientId) {
    searchParams.set("clientId", clientId);
  }

  const query = searchParams.toString();
  return query ? `/internal/advogada/casos/novo?${query}` : "/internal/advogada/casos/novo";
}

export function buildInternalCaseHref(caseId: string, hash?: string) {
  const safeHash = hash ? `#${hash}` : "";
  return `/internal/advogada/casos/${caseId}${safeHash}`;
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

export function buildInternalEcosystemHref(hash?: string) {
  const safeHash = hash ? `#${hash}` : "";
  return `/internal/advogada/ecossistema${safeHash}`;
}

export function buildClientEcosystemHubHref() {
  return "/cliente/ecossistema";
}

export function buildClientEcosystemBenefitsHref() {
  return "/cliente/ecossistema/beneficios";
}

export function buildClientEcosystemContentHref() {
  return "/cliente/ecossistema/conteudo";
}

export function buildClientEcosystemCommunityHref() {
  return "/cliente/ecossistema/comunidade";
}
