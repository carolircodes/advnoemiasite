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
    subtitle: "Cockpit executivo do escritorio e command center oficial",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "atendimento",
    label: "Inbox",
    href: "/internal/advogada/atendimento",
    subtitle: "Inbox conversacional oficial com threads, handoff e contexto",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "casos",
    label: "Casos",
    href: "/internal/advogada/casos",
    subtitle: "Operacao juridica ativa de casos, etapas e acompanhamento",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "agenda",
    label: "Agenda",
    href: "/internal/advogada/agenda",
    subtitle: "Agenda real do escritorio, com compromissos e consultas",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "/internal/advogada/documentos",
    subtitle: "Documentos reais e pedidos documentais do escritorio",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "inteligencia",
    label: "Inteligencia",
    href: "/internal/advogada/inteligencia",
    subtitle: "Leitura executiva de BI, receita, growth e telemetria",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "ecossistema",
    label: "Ecossistema",
    href: "/internal/advogada/ecossistema",
    subtitle: "Expansao premium, recorrencia, comunidade e camada estrategica",
    section: "primary",
    showInSidebar: true
  },
  {
    id: "operacional",
    label: "CRM Comercial",
    href: "/internal/advogada/operacional",
    subtitle: "Fila comercial, follow-up, consulta e prioridade de conversao",
    section: "support",
    showInSidebar: true
  },
  {
    id: "canais",
    label: "Distribuicao",
    href: "/internal/advogada/canais",
    subtitle: "Launcher por canal e separacao entre inbox e distribuicao",
    section: "support",
    showInSidebar: true
  },
  {
    id: "leads",
    label: "Historico de Leads",
    href: "/internal/advogada/leads",
    subtitle: "Leitura historica, apoio e legado comercial",
    section: "history",
    showInSidebar: true
  },
  {
    id: "acquisition",
    label: "Aquisicao",
    href: "/internal/advogada/acquisition",
    subtitle: "Leitura de aquisicao e origem de demanda fora do menu nobre",
    section: "insight"
  },
  {
    id: "performance",
    label: "Performance",
    href: "/internal/advogada/performance",
    subtitle: "Dashboard paralelo de performance preservado fora do topo",
    section: "insight"
  },
  {
    id: "configuracoes",
    label: "Configuracoes",
    href: "/internal/advogada/configuracoes",
    subtitle: "Alias temporario para outra camada do workspace",
    section: "hidden"
  },
  {
    id: "automacoes",
    label: "Automacoes",
    href: "/internal/advogada/automacoes",
    subtitle: "Alias temporario para inteligencia",
    section: "hidden"
  }
];

export const internalWorkspaceMenuSections = [
  {
    id: "primary",
    label: "Nucleo principal",
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
    label: "Historico e legado",
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
