(function (global) {
  var data = global.PortalData;

  if (!data) {
    return;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStatus(statusKey) {
    return clone(data.statusMap[statusKey] || { label: "Em análise", tone: "" });
  }

  function withStatus(items) {
    return items.map(function (item) {
      var normalized = clone(item);

      if (normalized.status) {
        normalized.status = getStatus(normalized.status);
      }

      return normalized;
    });
  }

  function getStoredRole() {
    try {
      return window.sessionStorage.getItem("portal.role") || "cliente";
    } catch (error) {
      return "cliente";
    }
  }

  function setStoredRole(role) {
    try {
      window.sessionStorage.setItem("portal.role", role);
    } catch (error) {
      return;
    }
  }

  function buildSupportHref(message) {
    return "https://wa.me/" + data.office.supportPhone + "?text=" + encodeURIComponent(message);
  }

  function buildHeaderNav(activeKey) {
    return [
      { label: "Site", href: data.routes.site, active: activeKey === "site" },
      { label: "Blog", href: data.routes.blog, active: activeKey === "blog" },
      { label: "Acesso", href: data.routes.login, active: activeKey === "login" },
      { label: "Cliente", href: data.routes.painelCliente, active: activeKey === "cliente" },
      { label: "Advogada", href: data.routes.painelAdvogada, active: activeKey === "advogada" }
    ];
  }

  function buildAdvogadaSidebarNav(activePage) {
    return [
      {
        label: "Visão geral",
        href: data.routes.painelAdvogada,
        badge: "01",
        active: activePage === "painel-advogada"
      },
      {
        label: "Documentos",
        href: data.routes.documentos,
        badge: "12",
        active: activePage === "documentos"
      },
      {
        label: "Agenda",
        href: data.routes.agenda,
        badge: "08",
        active: activePage === "agenda"
      },
      {
        label: "Área do cliente",
        href: data.routes.painelCliente,
        badge: "Cliente",
        active: activePage === "painel-cliente"
      },
      {
        label: "Trocar acesso",
        href: data.routes.login,
        badge: "↗",
        active: activePage === "login"
      },
      {
        label: "Voltar ao site",
        href: data.routes.site,
        badge: "↗",
        active: false
      }
    ];
  }

  function buildClienteSidebarNav(activePage) {
    return [
      {
        label: "Meu painel",
        href: data.routes.painelCliente,
        badge: "01",
        active: activePage === "painel-cliente"
      },
      {
        label: "Meus documentos",
        href: data.routes.documentos,
        badge: "04",
        active: activePage === "documentos"
      },
      {
        label: "Minha agenda",
        href: data.routes.agenda,
        badge: "02",
        active: activePage === "agenda"
      },
      {
        label: "Painel interno",
        href: data.routes.painelAdvogada,
        badge: "Equipe",
        active: activePage === "painel-advogada"
      },
      {
        label: "Trocar acesso",
        href: data.routes.login,
        badge: "↗",
        active: activePage === "login"
      },
      {
        label: "Site principal",
        href: data.routes.site,
        badge: "↗",
        active: false
      }
    ];
  }

  function buildSharedSidebarNav(activePage) {
    return [
      {
        label: "Painel da advogada",
        href: data.routes.painelAdvogada,
        badge: "↗",
        active: activePage === "painel-advogada"
      },
      {
        label: "Painel do cliente",
        href: data.routes.painelCliente,
        badge: "↗",
        active: activePage === "painel-cliente"
      },
      {
        label: "Documentos",
        href: data.routes.documentos,
        badge: "12",
        active: activePage === "documentos"
      },
      {
        label: "Agenda",
        href: data.routes.agenda,
        badge: "08",
        active: activePage === "agenda"
      },
      {
        label: "Trocar acesso",
        href: data.routes.login,
        badge: "↗",
        active: activePage === "login"
      }
    ];
  }

  function buildIntegrationRows() {
    return data.integrationModules.map(function (item) {
      return {
        key: item.title,
        value: item.description
      };
    });
  }

  function buildLoginModel() {
    var selectedRole = getStoredRole();

    return {
      type: "login",
      topbar: {
        message: "Área reservada organizada para autenticação, sessão, perfis e módulos do escritório.",
        pills: ["Login", "Sessão", "Permissões"]
      },
      header: {
        brandHref: data.routes.site,
        brandSmall: "Área Reservada",
        nav: buildHeaderNav("login"),
        actions: [
          { label: "Área do cliente", href: data.routes.painelCliente, variant: "secondary" },
          { label: "Área interna", href: data.routes.painelAdvogada, variant: "primary" }
        ]
      },
      intro: {
        eyebrow: "Acesso organizado por perfil",
        title: "Uma entrada reservada clara para clientes, equipe e autenticação real.",
        description:
          "A interface separa cliente e operação do escritório, enquanto a camada técnica já organiza sessão, permissões e a conexão posterior com a API.",
        timeline: clone(data.loginHighlights),
        quickAccess: [
          { label: "Entrar como equipe", href: data.routes.painelAdvogada, variant: "secondary" },
          { label: "Entrar como cliente", href: data.routes.painelCliente, variant: "secondary" },
          { label: "Abrir documentos", href: data.routes.documentos, variant: "secondary" },
          { label: "Abrir agenda", href: data.routes.agenda, variant: "secondary" }
        ]
      },
      form: {
        eyebrow: "Acesso reservado",
        title: "Entrar na área reservada",
        description:
          "A estrutura já está separada para validar credenciais, montar sessão segura e redirecionar o perfil correto quando o backend for integrado.",
        roles: clone(data.loginRoles),
        selectedRole: selectedRole,
        submitLabel: "Acessar área reservada",
        note: "Fluxo preparado para autenticação segura, permissões por perfil e continuidade do atendimento digital.",
        readiness: {
          title: "Estrutura de integração",
          description:
            "Interface, dados de exibição e serviço de acesso já estão isolados. Quando a API entrar, a camada de demonstração pode ser substituída pelas rotas reais sem reescrever a interface.",
          items: buildIntegrationRows()
        }
      }
    };
  }

  function buildAdvogadaModel() {
    return {
      type: "app",
      pageId: "painel-advogada",
      topbar: {
        message: "Ambiente interno organizado para gestão de clientes, documentos, agenda e acompanhamento do escritório.",
        pills: ["Visão executiva", "Agenda", "Documentos"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.advogada.label,
        userName: data.users.advogada.name,
        userSummary: data.users.advogada.summary,
        nav: buildAdvogadaSidebarNav("painel-advogada"),
        footerAction: {
          label: "Abrir agenda da semana",
          href: data.routes.agenda,
          variant: "primary"
        },
        caption: "Estrutura compartilhada para casos, agenda, documentos, sessão e ações da equipe."
      },
      header: {
        eyebrow: "Painel da advogada",
        title: "Visão executiva da operação jurídica.",
        description:
          "O portal concentra rotina, documentos, agenda e entrada de casos em uma camada única, com dados e renderização já separados para integração posterior com backend.",
        subnav: [
          { label: "Geral", href: data.routes.painelAdvogada, active: true },
          { label: "Documentos", href: data.routes.documentos, active: false },
          { label: "Agenda", href: data.routes.agenda, active: false },
          { label: "Cliente", href: data.routes.painelCliente, active: false }
        ],
        actions: [
          { label: "Voltar ao site", href: data.routes.site, variant: "secondary" },
          { label: "Revisar pendências", href: data.routes.documentos, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.advogada.cases,
          description: "Carteira ativa com leitura rápida por prioridade, estágio e necessidade operacional."
        },
        {
          title: data.summaries.advogada.appointments,
          description: "Agenda do ciclo com consultas, retornos, diligências e janelas de preparação."
        },
        {
          title: data.summaries.advogada.documents,
          description: "Arquivos aguardando conferência, assinatura, upload ou envio complementar."
        },
        {
          title: data.summaries.advogada.alerts,
          description: "Prazos e atenção crítica visíveis no primeiro olhar do painel."
        }
      ],
      columns: {
        primary: [
          {
            variant: "app-card",
            eyebrow: "Radar do dia",
            title: "Atendimentos e foco operacional",
            action: { label: "Abrir agenda", href: data.routes.agenda, variant: "secondary" },
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.advogadaRadar)
            }
          },
          {
            variant: "app-card",
            eyebrow: "Triagem e onboarding",
            title: "Entrada de casos e próximas ações",
            body: {
              kind: "stack-grid",
              gridClass: "mini-grid",
              items: clone(data.leads)
            }
          }
        ],
        secondary: [
          {
            variant: "app-card",
            eyebrow: "Documentos críticos",
            title: "Fila de conferência",
            action: { label: "Centro documental", href: data.routes.documentos, variant: "secondary" },
            body: {
              kind: "rows",
              listClass: "document-list",
              rowClass: "document-row",
              items: withStatus(data.advogadaDocuments)
            }
          },
          {
            variant: "status-card",
            eyebrow: "Expansão técnica",
            title: "Camadas separadas para integração",
            body: {
              kind: "key-list",
              items: buildIntegrationRows()
            }
          }
        ]
      }
    };
  }

  function buildClienteModel() {
    return {
      type: "app",
      pageId: "painel-cliente",
      topbar: {
        message: "Portal do cliente com leitura clara, menos ansiedade e acompanhamento mais elegante.",
        pills: ["Status do caso", "Documentos", "Agenda"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.cliente.label,
        userName: data.users.cliente.name,
        userSummary: data.users.cliente.summary,
        nav: buildClienteSidebarNav("painel-cliente"),
        footerAction: {
          label: "Falar com a equipe",
          href: buildSupportHref("Olá, estou na área do cliente e preciso de orientação."),
          variant: "primary"
        },
        caption: "Camada desenhada para sessão do cliente, caso ativo, timeline, documentos e agenda."
      },
      header: {
        eyebrow: "Painel do cliente",
        title: "Clareza sobre o caso e próximos passos.",
        description:
          "A interface do cliente foi organizada para reduzir ruído, com dados e componentes já separados para conectar caso, cronologia, documentos e agenda reais depois.",
        subnav: [
          { label: "Visão geral", href: data.routes.painelCliente, active: true },
          { label: "Documentos", href: data.routes.documentos, active: false },
          { label: "Agenda", href: data.routes.agenda, active: false },
          { label: "Login", href: data.routes.login, active: false }
        ],
        actions: [
          { label: "Ler conteúdos", href: data.routes.blog, variant: "secondary" },
          { label: "Enviar documentos", href: data.routes.documentos, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.cliente.currentStage,
          description: "Análise técnica do benefício com documentação essencial recebida."
        },
        {
          title: data.summaries.cliente.nextMeeting,
          description: "Segunda-feira • 09:30 • atendimento online confirmado."
        },
        {
          title: data.summaries.cliente.pendingDocs,
          description: "Pendência restante para fechar o dossiê documental do caso."
        },
        {
          title: data.summaries.cliente.lastUpdate,
          description: "Hoje às 11:10 com revisão do CNIS e checklist da próxima etapa."
        }
      ],
      columns: {
        primary: [
          {
            variant: "app-card",
            eyebrow: "Linha do caso",
            title: "Andamento com linguagem simples",
            body: {
              kind: "timeline",
              items: clone(data.clientTimeline)
            }
          },
          {
            variant: "app-card",
            eyebrow: "Documentos",
            title: "Checklist visível ao cliente",
            action: { label: "Abrir central", href: data.routes.documentos, variant: "secondary" },
            body: {
              kind: "rows",
              listClass: "document-list",
              rowClass: "document-row",
              items: withStatus(data.clientDocuments)
            }
          }
        ],
        secondary: [
          {
            variant: "app-card",
            eyebrow: "Agenda",
            title: "Próximos compromissos",
            action: { label: "Ver agenda", href: data.routes.agenda, variant: "secondary" },
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.clientAppointments)
            }
          },
          {
            variant: "status-card",
            eyebrow: "Apoio",
            title: "Canal de orientação",
            body: {
              kind: "timeline",
              items: clone(data.clientSupportNotes)
            },
            footerActions: [
              { label: "Abrir documentos", href: data.routes.documentos, variant: "secondary" },
              { label: "Falar com a equipe", href: buildSupportHref("Olá, estou na área do cliente e preciso de orientação."), variant: "primary" }
            ]
          }
        ]
      }
    };
  }

  function buildDocumentosModel() {
    return {
      type: "app",
      pageId: "documentos",
      topbar: {
        message: "Módulo documental pensado para checklist, rastreio, revisão e fluxo organizado de conferência.",
        pills: ["Checklist", "Metadados", "Pendências"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.documentos.label,
        userName: data.users.documentos.name,
        userSummary: data.users.documentos.summary,
        nav: buildSharedSidebarNav("documentos"),
        footerAction: {
          label: "Ver visão do cliente",
          href: data.routes.painelCliente,
          variant: "primary"
        },
        caption: "Fluxo desenhado para upload, histórico de versão, status, responsável e trilha de conferência."
      },
      header: {
        eyebrow: "Estrutura de documentos",
        title: "Centro documental com estrutura organizada.",
        description:
          "A camada visual já está separada da lógica de dados, e o módulo está organizado para receber backend de arquivos, status, trilha de revisão e permissões por perfil.",
        subnav: [
          { label: "Central", href: data.routes.documentos, active: true },
          { label: "Advogada", href: data.routes.painelAdvogada, active: false },
          { label: "Cliente", href: data.routes.painelCliente, active: false },
          { label: "Agenda", href: data.routes.agenda, active: false }
        ],
        actions: [
          { label: "Conectar com agenda", href: data.routes.agenda, variant: "secondary" },
          { label: "Voltar ao painel", href: data.routes.painelAdvogada, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.documentos.files,
          description: "Volume atual em análise com separação por tipo documental e status."
        },
        {
          title: data.summaries.documentos.checklists,
          description: "Trilhas para onboarding, contratos, provas e andamento processual."
        },
        {
          title: data.summaries.documentos.pendingItems,
          description: "Itens aguardando cliente, conferência técnica ou assinatura."
        },
        {
          title: data.summaries.documentos.traceability,
          description: "Arquitetura visual preparada para histórico de versão, upload e validação consistente."
        }
      ],
      columns: {
        primary: [
          {
            variant: "document-card",
            title: "Fila documental",
            body: {
              kind: "rows",
              listClass: "document-list",
              rowClass: "document-row",
              items: withStatus(data.documentQueue)
            }
          },
          {
            variant: "app-card",
            eyebrow: "Checklist por etapa",
            title: "Estrutura de organização",
            body: {
              kind: "checklist",
              items: withStatus(data.documentChecklist)
            }
          }
        ],
        secondary: [
          {
            variant: "status-card",
            eyebrow: "Fluxo recomendado",
            title: "Como o módulo evolui para operação real",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: clone(data.documentFlow)
            }
          },
          {
            variant: "status-card",
            eyebrow: "Expansão técnica",
            title: "Recursos previstos para integração",
            body: {
              kind: "key-list",
              items: buildIntegrationRows()
            }
          }
        ]
      }
    };
  }

  function buildAgendaModel() {
    return {
      type: "app",
      pageId: "agenda",
      topbar: {
        message: "Módulo de agenda pensado para confirmações, janelas livres, capacidade e leitura operacional.",
        pills: ["Compromissos", "Capacidade", "Confirmações"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.agenda.label,
        userName: data.users.agenda.name,
        userSummary: data.users.agenda.summary,
        nav: buildSharedSidebarNav("agenda"),
        footerAction: {
          label: "Voltar ao painel",
          href: data.routes.painelAdvogada,
          variant: "primary"
        },
        caption: "Camada desenhada para calendário real, disponibilidade, confirmações automáticas e histórico de mudanças."
      },
      header: {
        eyebrow: "Estrutura de agenda",
        title: "Agenda clara para operação e atendimento.",
        description:
          "A agenda já foi desenhada como módulo independente, o que facilita conectar disponibilidade, compromissos, lembretes e vínculo com documentos e casos reais.",
        subnav: [
          { label: "Semana", href: data.routes.agenda, active: true },
          { label: "Advogada", href: data.routes.painelAdvogada, active: false },
          { label: "Cliente", href: data.routes.painelCliente, active: false },
          { label: "Documentos", href: data.routes.documentos, active: false }
        ],
        actions: [
          { label: "Ver documentos", href: data.routes.documentos, variant: "secondary" },
          { label: "Ver visão do cliente", href: data.routes.painelCliente, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.agenda.appointments,
          description: "Consultas, retornos e blocos internos visíveis em leitura rápida."
        },
        {
          title: data.summaries.agenda.confirmations,
          description: "Atendimentos já confirmados para o ciclo atual."
        },
        {
          title: data.summaries.agenda.freeSlots,
          description: "Espaços úteis para encaixe, urgência ou preparo adicional."
        },
        {
          title: data.summaries.agenda.alerts,
          description: "Compromisso que depende de documentação complementar antes da reunião."
        }
      ],
      columns: {
        primary: [
          {
            variant: "app-card",
            eyebrow: "Semana útil",
            title: "Distribuição por dia",
            body: {
              kind: "week-grid",
              items: clone(data.weekSchedule)
            }
          },
          {
            variant: "app-card",
            eyebrow: "Compromissos de hoje",
            title: "Fila operacional",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.todaySchedule)
            }
          }
        ],
        secondary: [
          {
            variant: "status-card",
            eyebrow: "Boas práticas",
            title: "Leitura operacional da agenda",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: clone(data.agendaGuides)
            }
          },
          {
            variant: "status-card",
            eyebrow: "Expansão técnica",
            title: "Conexões previstas para integração",
            body: {
              kind: "key-list",
              items: buildIntegrationRows()
            }
          }
        ]
      }
    };
  }

  function getPageModel(pageId) {
    var builders = {
      login: buildLoginModel,
      "painel-advogada": buildAdvogadaModel,
      "painel-cliente": buildClienteModel,
      documentos: buildDocumentosModel,
      agenda: buildAgendaModel
    };

    if (!builders[pageId]) {
      return Promise.reject(new Error("Página de portal não mapeada: " + pageId));
    }

    return Promise.resolve(builders[pageId]());
  }

  function login(payload) {
    var role = payload.role === "advogada" ? "advogada" : "cliente";

    if (data.api.useMock) {
      setStoredRole(role);

      return Promise.resolve({
        redirectTo: role === "advogada" ? data.routes.painelAdvogada : data.routes.painelCliente,
        session: {
          role: role,
          profile: role === "advogada" ? data.users.advogada.name : data.users.cliente.name
        }
      });
    }

    return fetch(data.api.baseUrl + data.api.endpoints.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json();
    });
  }

  global.PortalService = {
    api: clone(data.api),
    routes: clone(data.routes),
    getPageModel: getPageModel,
    login: login,
    getStoredRole: getStoredRole,
    buildSupportHref: buildSupportHref
  };
})(window);
