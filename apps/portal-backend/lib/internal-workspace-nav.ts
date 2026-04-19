export type InternalWorkspaceNavSection =
  | "primary"
  | "support"
  | "history"
  | "insight"
  | "hidden";

export type InternalWorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
  subtitle: string;
  section: InternalWorkspaceNavSection;
  showInSidebar?: boolean;
};

export const internalWorkspaceNavItems: InternalWorkspaceNavItem[] = [
  {
    id: "painel",
    label: "Painel",
    href: "/internal/advogada",
    subtitle: "Visão executiva do escritório e centro oficial de operação",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "atendimento",
    label: "Inbox",
    href: "/internal/advogada/atendimento",
    subtitle: "Inbox conversacional com histórico, handoff e contexto operacional",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "casos",
    label: "Casos",
    href: "/internal/advogada/casos",
    subtitle: "Operação jurídica ativa de casos, etapas e acompanhamento",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "agenda",
    label: "Agenda",
    href: "/internal/advogada/agenda",
    subtitle: "Agenda real do escritório, com compromissos e consultas",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "/internal/advogada/documentos",
    subtitle: "Documentos reais e solicitações documentais do escritório",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "inteligencia",
    label: "Inteligência",
    href: "/internal/advogada/inteligencia",
    subtitle: "Leitura executiva de BI, receita, crescimento e telemetria",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "ecossistema",
    label: "Ecossistema",
    href: "/internal/advogada/ecossistema",
    subtitle: "Expansão premium, recorrência, comunidade e camada estratégica",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "operacional",
    label: "CRM Comercial",
    href: "/internal/advogada/operacional",
    subtitle: "Fila comercial, follow-up, consulta e prioridade de conversão",
    section: "support",
    showInSidebar: true
  },
  {
    id: "canais",
    label: "Distribuição",
    href: "/internal/advogada/canais",
    subtitle: "Distribuição por canal com separação clara entre inbox e origem",
    section: "support",
    showInSidebar: true
  },
  {
    id: "leads",
    label: "Histórico de Leads",
    href: "/internal/advogada/leads",
    subtitle: "Leitura histórica, apoio e legado comercial",
    section: "history",
    showInSidebar: true
  },
  {
    id: "acquisition",
    label: "Aquisição",
    href: "/internal/advogada/acquisition",
    subtitle: "Leitura de aquisição e origem de demanda fora do menu principal",
    section: "insight"
  },
  {
    id: "performance",
    label: "Performance",
    href: "/internal/advogada/performance",
    subtitle: "Painel auxiliar de performance preservado fora do topo",
    section: "insight"
  },
  {
    id: "configuracoes",
    label: "Configurações",
    href: "/internal/advogada/configuracoes",
    subtitle: "Alias temporário para outra camada do workspace",
    section: "hidden"
  },
  {
    id: "automacoes",
    label: "Automações",
    href: "/internal/advogada/automacoes",
    subtitle: "Alias temporário para inteligência",
    section: "hidden"
  }
];

export const internalWorkspaceMenuSections = [
  {
    id: "primary",
    label: "Núcleo principal",
    items: internalWorkspaceNavItems.filter(
      (item) => item.showInSidebar && item.section === "primary"
    )
  },
  {
    id: "support",
    label: "Apoio operacional",
    items: internalWorkspaceNavItems.filter(
      (item) => item.showInSidebar && item.section === "support"
    )
  },
  {
    id: "history",
    label: "Histórico e legado",
    items: internalWorkspaceNavItems.filter(
      (item) => item.showInSidebar && item.section === "history"
    )
  }
] as const;

export function isInternalWorkspacePathActive(currentPath: string, href: string) {
  if (currentPath === href) {
    return true;
  }

  if (href === "/internal/advogada") {
    return currentPath === href;
  }

  return currentPath.startsWith(`${href}/`);
}

export function getInternalWorkspaceCurrentPage(currentPath: string) {
  const currentItem =
    internalWorkspaceNavItems
      .filter((item) => isInternalWorkspacePathActive(currentPath, item.href))
      .sort((left, right) => right.href.length - left.href.length)[0] ||
    internalWorkspaceNavItems[0];

  return currentItem;
}
