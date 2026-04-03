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
      { label: "Iniciar atendimento", href: data.routes.triagem, active: activeKey === "triagem" },
      { label: "Área do cliente", href: data.routes.login, active: activeKey === "login" },
      { label: "Painel interno", href: data.routes.painelAdvogada, active: activeKey === "advogada" }
    ];
  }

  function buildAdvogadaSidebarNav(activePage) {
    return [
      {
        label: "Visão geral",
        href: data.routes.painelAdvogada,
        badge: "Painel",
        active: activePage === "painel-advogada"
      },
      {
        label: "Cadastrar cliente",
        href: data.routes.painelAdvogada + "#cadastro-cliente",
        badge: "Novo",
        active: false
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
        label: "Login do cliente",
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
        badge: "Painel",
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
        label: "Painel interno",
        href: data.routes.painelAdvogada,
        badge: "Equipe",
        active: activePage === "painel-advogada"
      },
      {
        label: "Área do cliente",
        href: data.routes.painelCliente,
        badge: "Cliente",
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
        label: "Login do cliente",
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
    return {
      type: "login",
      topbar: {
        message: "Acesso reservado para clientes já cadastrados. Novos atendimentos começam pela triagem.",
        pills: ["Login por e-mail", "Convite de acesso", "Recuperação de senha"]
      },
      header: {
        brandHref: data.routes.site,
        brandSmall: "Área do cliente",
        nav: buildHeaderNav("login"),
        actions: [
          { label: "Iniciar atendimento", href: data.routes.triagem, variant: "secondary" },
          { label: "Painel interno", href: data.routes.painelAdvogada, variant: "primary" }
        ]
      },
      intro: {
        eyebrow: "Acesso para clientes cadastrados",
        title: "Entre com o e-mail liberado pela equipe.",
        description:
          "O portal é liberado após o cadastro interno do cliente. No primeiro acesso, a senha é definida pelo próprio cliente a partir do convite enviado por e-mail.",
        timeline: clone(data.loginHighlights),
        quickAccess: [
          { label: "Iniciar atendimento", href: data.routes.triagem, variant: "secondary" },
          { label: "Voltar ao site", href: data.routes.site, variant: "secondary" },
          { label: "Painel interno", href: data.routes.painelAdvogada, variant: "secondary" }
        ]
      },
      form: {
        eyebrow: "Clientes já cadastrados",
        title: "Acessar área do cliente",
        description:
          "Use o e-mail cadastrado pela equipe e a senha definida no convite inicial. O CPF permanece apenas como dado cadastral, sem uso como senha.",
        selectedRole: "cliente",
        submitLabel: "Entrar na área do cliente",
        note: "Somente clientes cadastrados pela equipe conseguem acessar este ambiente.",
        inlineLinks: [
          { label: "Primeiro acesso", href: "#primeiro-acesso" },
          { label: "Esqueci minha senha", href: "#recuperacao-senha" }
        ],
        supportCards: clone(data.loginSupportCards),
        readiness: {
          title: "Estrutura pronta para integração",
          description:
            "A interface já foi organizada para backend, sessão segura, convites por e-mail, redefinição de senha e permissões por perfil.",
          items: clone(data.loginReadiness)
        }
      }
    };
  }

  function buildAdvogadaModel() {
    return {
      type: "app",
      pageId: "painel-advogada",
      topbar: {
        message: "Painel interno para cadastrar clientes, atualizar casos e organizar eventos futuros de comunicação.",
        pills: ["Cadastro de clientes", "Atualização de casos", "Notificações futuras"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.advogada.label,
        userName: data.users.advogada.name,
        userSummary: data.users.advogada.summary,
        nav: buildAdvogadaSidebarNav("painel-advogada"),
        footerAction: {
          label: "Abrir agenda da equipe",
          href: data.routes.agenda,
          variant: "primary"
        },
        caption: "Camada interna preparada para cadastro manual, gestão de casos, convites por e-mail e histórico operacional."
      },
      header: {
        eyebrow: "Painel interno da advogada",
        title: "Cadastro, casos e comunicação futura em um único fluxo.",
        description:
          "A equipe cadastra o cliente, vincula o caso, organiza documentos e agenda, e prepara os eventos que poderão gerar e-mails automáticos quando o backend estiver conectado.",
        subnav: [
          { label: "Visão geral", href: data.routes.painelAdvogada, active: true },
          { label: "Cadastrar cliente", href: "#cadastro-cliente", active: false },
          { label: "Notificações", href: "#notificacoes", active: false },
          { label: "Documentos", href: data.routes.documentos, active: false }
        ],
        actions: [
          { label: "Abrir agenda", href: data.routes.agenda, variant: "secondary" },
          { label: "Ver documentos", href: data.routes.documentos, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.advogada.registrations,
          description: "Cadastros prontos para conferência, liberação de acesso ou envio de convite."
        },
        {
          title: data.summaries.advogada.cases,
          description: "Casos em andamento com atualização interna, status e próximos passos definidos."
        },
        {
          title: data.summaries.advogada.notifications,
          description: "Eventos já mapeados para gerar e-mail automático quando a integração for ativada."
        },
        {
          title: data.summaries.advogada.documents,
          description: "Documentos ligados a triagem, onboarding, prova e andamento do atendimento."
        }
      ],
      columns: {
        primary: [
          {
            anchorId: "cadastro-cliente",
            variant: "app-card",
            eyebrow: "Cadastrar cliente",
            title: "Cadastro inicial e liberação futura do portal",
            body: {
              kind: "form-preview",
              fields: clone(data.clientRegistrationFields),
              tags: clone(data.clientRegistrationTags),
              noteTitle: "Convite por e-mail",
              noteText:
                "Depois de salvar o cadastro e vincular o caso, o sistema poderá enviar convite para que o cliente defina a própria senha no primeiro acesso."
            }
          },
          {
            variant: "app-card",
            eyebrow: "Atualizações do caso",
            title: "Fila de andamento e próximos envios",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.advogadaCaseUpdates)
            }
          },
          {
            variant: "app-card",
            eyebrow: "Radar do dia",
            title: "Agenda e prioridades da operação",
            action: { label: "Abrir agenda", href: data.routes.agenda, variant: "secondary" },
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.advogadaRadar)
            }
          }
        ],
        secondary: [
          {
            variant: "status-card",
            eyebrow: "Fluxo do cliente",
            title: "Da triagem ao primeiro login",
            body: {
              kind: "timeline",
              items: clone(data.clientAccessFlow)
            }
          },
          {
            anchorId: "notificacoes",
            variant: "status-card",
            eyebrow: "Notificações futuras",
            title: "Eventos preparados para e-mail automático",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.notificationEvents)
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
        message: "Portal do cliente com acompanhamento claro, documentos organizados e próximos passos visíveis.",
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
        caption: "Área preparada para sessão do cliente, histórico do caso, documentos, agenda e comunicações futuras."
      },
      header: {
        eyebrow: "Painel do cliente",
        title: "Clareza sobre o caso e próximos passos.",
        description:
          "O cliente acessa o portal com o e-mail cadastrado e acompanha documentos, agenda e atualizações do atendimento em uma leitura simples.",
        subnav: [
          { label: "Visão geral", href: data.routes.painelCliente, active: true },
          { label: "Documentos", href: data.routes.documentos, active: false },
          { label: "Agenda", href: data.routes.agenda, active: false },
          { label: "Acesso", href: data.routes.login, active: false }
        ],
        actions: [
          { label: "Ver documentos", href: data.routes.documentos, variant: "secondary" },
          { label: "Ver agenda", href: data.routes.agenda, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.cliente.currentStage,
          description: "Análise técnica do caso com documentação essencial recebida."
        },
        {
          title: data.summaries.cliente.nextMeeting,
          description: "Segunda-feira • 09:30 • atendimento online confirmado."
        },
        {
          title: data.summaries.cliente.pendingDocs,
          description: "Pendência restante para fechar o dossiê documental."
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
            eyebrow: "Acesso e avisos",
            title: "Login por e-mail e comunicações do portal",
            body: {
              kind: "timeline",
              items: clone(data.clientSupportNotes)
            },
            footerActions: [
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
        message: "Módulo documental preparado para checklist, conferência, solicitações ao cliente e avisos futuros.",
        pills: ["Checklist", "Solicitações", "Histórico"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.documentos.label,
        userName: data.users.documentos.name,
        userSummary: data.users.documentos.summary,
        nav: buildSharedSidebarNav("documentos"),
        footerAction: {
          label: "Voltar ao painel interno",
          href: data.routes.painelAdvogada,
          variant: "primary"
        },
        caption: "Estrutura preparada para upload, solicitação de documento, histórico por caso e eventos de notificação."
      },
      header: {
        eyebrow: "Estrutura de documentos",
        title: "Documentos, solicitações e conferência em um só módulo.",
        description:
          "A camada visual já separa fila documental, checklist, solicitações ao cliente e eventos que poderão gerar aviso por e-mail quando a integração estiver ativa.",
        subnav: [
          { label: "Central", href: data.routes.documentos, active: true },
          { label: "Painel interno", href: data.routes.painelAdvogada, active: false },
          { label: "Cliente", href: data.routes.painelCliente, active: false },
          { label: "Agenda", href: data.routes.agenda, active: false }
        ],
        actions: [
          { label: "Ver agenda", href: data.routes.agenda, variant: "secondary" },
          { label: "Abrir painel interno", href: data.routes.painelAdvogada, variant: "primary" }
        ]
      },
      metrics: [
        {
          title: data.summaries.documentos.files,
          description: "Arquivos organizados por caso, etapa e necessidade operacional."
        },
        {
          title: data.summaries.documentos.requests,
          description: "Solicitações abertas ao cliente com checklist e vínculo ao caso."
        },
        {
          title: data.summaries.documentos.pendingItems,
          description: "Itens aguardando cliente, conferência técnica ou publicação no portal."
        },
        {
          title: data.summaries.documentos.traceability,
          description: "Estrutura pronta para registrar origem, versão, responsável e status."
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
            eyebrow: "Fluxo documental",
            title: "Solicitação, conferência e publicação",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: clone(data.documentFlow)
            }
          },
          {
            variant: "status-card",
            eyebrow: "Avisos por e-mail",
            title: "Eventos documentais preparados",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.documentNotificationEvents)
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
        message: "Módulo de agenda preparado para compromissos, confirmações e notificações futuras ao cliente.",
        pills: ["Compromissos", "Confirmações", "Lembretes"]
      },
      sidebar: {
        brandHref: data.routes.site,
        brandSmall: data.users.agenda.label,
        userName: data.users.agenda.name,
        userSummary: data.users.agenda.summary,
        nav: buildSharedSidebarNav("agenda"),
        footerAction: {
          label: "Voltar ao painel interno",
          href: data.routes.painelAdvogada,
          variant: "primary"
        },
        caption: "Agenda pronta para integrar disponibilidade, criação de compromissos, confirmações e avisos automáticos."
      },
      header: {
        eyebrow: "Estrutura de agenda",
        title: "Agenda clara para equipe e cliente.",
        description:
          "O módulo já separa compromissos, confirmações e eventos que poderão gerar lembretes e avisos automáticos por e-mail.",
        subnav: [
          { label: "Semana", href: data.routes.agenda, active: true },
          { label: "Painel interno", href: data.routes.painelAdvogada, active: false },
          { label: "Cliente", href: data.routes.painelCliente, active: false },
          { label: "Documentos", href: data.routes.documentos, active: false }
        ],
        actions: [
          { label: "Ver documentos", href: data.routes.documentos, variant: "secondary" },
          { label: "Ver área do cliente", href: data.routes.painelCliente, variant: "primary" }
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
          description: "Compromissos conectados a lembrete, confirmação ou documentação pendente."
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
            eyebrow: "Avisos por e-mail",
            title: "Eventos de agenda preparados",
            body: {
              kind: "rows",
              listClass: "timeline-list",
              rowClass: "timeline-row",
              items: withStatus(data.agendaNotificationEvents)
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
