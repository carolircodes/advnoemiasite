export type InternalWorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
};

export const internalWorkspaceMenuItems: InternalWorkspaceNavItem[] = [
  { id: "dashboard", label: "Painel Operacional", href: "/internal/advogada/operacional" },
  { id: "leads", label: "Leads", href: "/internal/advogada/leads" },
  { id: "atendimento", label: "Atendimento", href: "/internal/advogada/atendimento" },
  { id: "canais", label: "Canais", href: "/internal/advogada/canais" },
  { id: "casos", label: "Casos", href: "/internal/advogada/casos" },
  { id: "agenda", label: "Agenda", href: "/internal/advogada/agenda" },
  { id: "documentos", label: "Documentos", href: "/internal/advogada/documentos" },
  { id: "inteligencia", label: "Inteligencia", href: "/internal/advogada/inteligencia" },
  { id: "ecossistema", label: "Ecossistema", href: "/internal/advogada/ecossistema" }
];

export const internalWorkspaceSubtitles: Record<string, string> = {
  "Painel Operacional": "Gestao de leads e operacoes",
  Leads: "Captura, qualificacao e legado comercial",
  Atendimento: "Inbox multicanal e handoff operacional",
  Canais: "Entradas por WhatsApp, Instagram e inbox",
  Casos: "Acompanhamento de processos",
  Agenda: "Compromissos e consultas",
  Documentos: "Gestao documental",
  Inteligencia: "Analises e insights",
  Ecossistema: "Catalogo, recorrencia e expansao premium"
};

export function isInternalWorkspacePathActive(currentPath: string, href: string) {
  if (currentPath === href) {
    return true;
  }

  return (
    (href === "/internal/advogada/leads" && currentPath.startsWith("/internal/advogada/leads")) ||
    (href === "/internal/advogada/atendimento" &&
      currentPath.startsWith("/internal/advogada/atendimento")) ||
    (href === "/internal/advogada/canais" && currentPath.startsWith("/internal/advogada/canais")) ||
    (href === "/internal/advogada/casos" && currentPath.startsWith("/internal/advogada/casos")) ||
    (href === "/internal/advogada/inteligencia" &&
      currentPath.startsWith("/internal/advogada/inteligencia")) ||
    (href === "/internal/advogada/ecossistema" &&
      currentPath.startsWith("/internal/advogada/ecossistema"))
  );
}
