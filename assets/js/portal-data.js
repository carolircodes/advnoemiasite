(function (global) {
  global.PortalData = {
    office: {
      name: "Noêmia Paixão Advocacia",
      oab: "OAB/RN 3939",
      tagline: "Portal Jurídico Premium",
      supportPhone: "5584996248241"
    },
    api: {
      useMock: true,
      baseUrl: "../api",
      endpoints: {
        session: "/portal/session",
        login: "/portal/auth/login",
        dashboardAdvogada: "/portal/advogada/dashboard",
        dashboardCliente: "/portal/cliente/dashboard",
        documents: "/portal/documents",
        schedule: "/portal/schedule"
      }
    },
    routes: {
      site: "../index.html",
      blog: "../blog.html",
      login: "login.html",
      painelAdvogada: "painel-advogada.html",
      painelCliente: "painel-cliente.html",
      documentos: "documentos.html",
      agenda: "agenda.html"
    },
    statusMap: {
      confirmed: { label: "Confirmado", tone: "success" },
      ready: { label: "Pronto", tone: "success" },
      completed: { label: "Concluído", tone: "success" },
      validated: { label: "Validado", tone: "success" },
      inReview: { label: "Em revisão", tone: "" },
      preparing: { label: "Em preparação", tone: "" },
      reserve: { label: "Reserva", tone: "" },
      base: { label: "Base pronta", tone: "success" },
      model: { label: "Modelo base", tone: "" },
      pending: { label: "Pendente", tone: "warning" },
      pendingClient: { label: "Aguardando cliente", tone: "warning" },
      missing: { label: "Falta revisar", tone: "danger" },
      highPriority: { label: "Prioridade alta", tone: "warning" },
      prerequisite: { label: "Pré-requisito aberto", tone: "warning" }
    },
    users: {
      advogada: {
        name: "Dra. Noêmia Paixão",
        label: "Operação Premium",
        summary: "Gestão jurídica com foco em atendimento, revisão documental e agenda estratégica."
      },
      cliente: {
        name: "Marina Costa",
        label: "Área do Cliente",
        summary: "Cliente com revisão de aposentadoria em andamento, acompanhamento digital e agenda ativa."
      },
      documentos: {
        name: "Centro documental",
        label: "Centro Documental",
        summary: "Organização por caso, status, checklist, revisão e governança dos arquivos do atendimento."
      },
      agenda: {
        name: "Semana operacional",
        label: "Agenda Premium",
        summary: "Blocos visuais para consulta, retorno, preparo estratégico e gestão da carga."
      }
    },
    summaries: {
      advogada: {
        cases: "24 casos",
        appointments: "08 compromissos",
        documents: "12 documentos",
        alerts: "03 alertas"
      },
      cliente: {
        currentStage: "Etapa atual",
        nextMeeting: "Próxima consulta",
        pendingDocs: "1 documento",
        lastUpdate: "Última atualização"
      },
      documentos: {
        files: "12 arquivos",
        checklists: "04 checklists",
        pendingItems: "03 pendências",
        traceability: "100% rastreável"
      },
      agenda: {
        appointments: "08 compromissos",
        confirmations: "03 confirmações",
        freeSlots: "02 janelas livres",
        alerts: "01 alerta"
      }
    },
    integrationModules: [
      {
        title: "Autenticação e sessão",
        description: "Pronta para login real, sessão persistida, perfil ativo e permissões por papel."
      },
      {
        title: "Casos e clientes",
        description: "Estrutura compatível com cadastro de clientes, casos, estágio, prioridade e histórico."
      },
      {
        title: "Documentos e agenda",
        description: "Fluxo preparado para upload, checklist, confirmações, reagendamento e alertas."
      },
      {
        title: "Auditoria e rastreio",
        description: "Base pronta para registrar ação, data, responsável e origem de cada mudança."
      }
    ],
    loginHighlights: [
      {
        title: "Experiência consistente",
        description: "O acesso mantém a mesma linguagem visual do site e facilita a continuidade do atendimento."
      },
      {
        title: "Base pronta para evoluir",
        description: "Campos, perfis e navegação já sustentam autenticação, sessão e governança futura."
      },
      {
        title: "Separação por contexto",
        description: "Cliente acompanha o atendimento. Equipe visualiza operação, agenda e documentos."
      }
    ],
    loginRoles: [
      {
        id: "cliente",
        title: "Cliente",
        description: "Visualiza andamento, agenda, documentos, solicitações e próximos passos."
      },
      {
        id: "advogada",
        title: "Advogada",
        description: "Visualiza operação, triagem, agenda, documentos e gestão do atendimento."
      }
    ],
    leads: [
      {
        title: "Consumidor e bancário",
        description: "2 novos leads com documentos iniciais enviados e pendência de confirmação de consulta."
      },
      {
        title: "Previdenciário",
        description: "1 cliente aguardando checklist final para análise de revisão de benefício."
      }
    ],
    advogadaRadar: [
      {
        title: "09:30 • Consulta inicial",
        description: "Marina Costa • revisão de aposentadoria",
        status: "confirmed"
      },
      {
        title: "11:00 • Revisão documental",
        description: "Procuração e contrato de honorários • caso bancário",
        status: "highPriority"
      },
      {
        title: "15:30 • Retorno ao cliente",
        description: "Acompanhamento de negativa do INSS",
        status: "preparing"
      }
    ],
    advogadaDocuments: [
      {
        title: "Contrato de honorários",
        description: "Cliente: Marina Costa • assinatura pendente",
        status: "pendingClient"
      },
      {
        title: "Extratos bancários",
        description: "Caso bancário • revisão de provas",
        status: "missing"
      },
      {
        title: "CNIS atualizado",
        description: "Revisão previdenciária • recebido hoje",
        status: "ready"
      }
    ],
    clientTimeline: [
      {
        title: "1. Cadastro e triagem concluídos",
        description: "Seus dados principais já foram recebidos e o tipo de atendimento foi definido pela equipe."
      },
      {
        title: "2. Documentação em conferência",
        description: "CNIS e documentos pessoais foram analisados. Falta apenas um comprovante complementar."
      },
      {
        title: "3. Reunião estratégica agendada",
        description: "Na próxima consulta serão explicados cenário, riscos, próximos passos e estratégia sugerida."
      }
    ],
    clientDocuments: [
      {
        title: "Documento pessoal",
        description: "Recebido e conferido",
        status: "completed"
      },
      {
        title: "CNIS",
        description: "Recebido e validado pela equipe",
        status: "completed"
      },
      {
        title: "Comprovante complementar",
        description: "Necessário para fechar a análise",
        status: "pending"
      }
    ],
    clientAppointments: [
      {
        title: "Segunda-feira • 09:30",
        description: "Consulta online de alinhamento estratégico",
        status: "confirmed"
      },
      {
        title: "Quarta-feira • 17:00",
        description: "Janela reservada para eventual retorno",
        status: "reserve"
      }
    ],
    clientSupportNotes: [
      {
        title: "Dúvidas rápidas",
        description: "O WhatsApp continua como canal de apoio para questões práticas e encaminhamentos imediatos."
      },
      {
        title: "Próximos passos claros",
        description: "O cliente enxerga o que falta, o que já foi feito e quando haverá novo contato."
      }
    ],
    documentQueue: [
      {
        title: "Contrato de honorários",
        description: "Cliente: Marina Costa • módulo comercial",
        status: "pending"
      },
      {
        title: "Procuração",
        description: "Cliente: Marina Costa • pronta para conferência",
        status: "ready"
      },
      {
        title: "Extratos bancários",
        description: "Caso bancário • anexos probatórios",
        status: "missing"
      },
      {
        title: "CNIS atualizado",
        description: "Caso previdenciário • documento técnico",
        status: "validated"
      }
    ],
    documentChecklist: [
      {
        title: "Onboarding inicial",
        description: "Documento pessoal, comprovante, contrato e procuração.",
        status: "base"
      },
      {
        title: "Provas do caso",
        description: "Extratos, prints, protocolos, contratos e anexos complementares.",
        status: "pending"
      },
      {
        title: "Documentação processual",
        description: "Petições, anexos técnicos e peças organizadas por etapa.",
        status: "model"
      }
    ],
    documentFlow: [
      {
        title: "1. Solicitar",
        description: "Cliente recebe checklist objetivo no portal."
      },
      {
        title: "2. Receber",
        description: "Arquivo entra com tipo, origem, caso e status inicial."
      },
      {
        title: "3. Conferir",
        description: "Equipe marca se está válido, incompleto ou pendente."
      },
      {
        title: "4. Consolidar",
        description: "Documentos aprovados alimentam análise, agenda e próximos passos."
      }
    ],
    weekSchedule: [
      {
        day: "Segunda",
        slots: ["09:30 • Consulta inicial", "14:00 • Revisão de documentos"]
      },
      {
        day: "Terça",
        slots: ["10:00 • Atendimento bancário", "16:30 • Retorno ao cliente"]
      },
      {
        day: "Quarta",
        slots: ["09:00 • Bloco interno", "17:00 • Janela reservada"]
      },
      {
        day: "Quinta",
        slots: ["11:00 • Estratégia processual"]
      },
      {
        day: "Sexta",
        slots: ["08:30 • Follow-up semanal", "15:00 • Encerramento operacional"]
      }
    ],
    todaySchedule: [
      {
        title: "09:30 • Consulta inicial",
        description: "Cliente: Marina Costa • atendimento online",
        status: "confirmed"
      },
      {
        title: "11:00 • Revisão documental",
        description: "Pasta bancária com pendência de extratos",
        status: "prerequisite"
      },
      {
        title: "15:30 • Retorno ao cliente",
        description: "Envio de próximos passos após análise preliminar",
        status: "preparing"
      }
    ],
    agendaGuides: [
      {
        title: "Confirmação",
        description: "Registrar status do compromisso e orientar o cliente com antecedência."
      },
      {
        title: "Pré-leitura",
        description: "Verificar se documentos essenciais foram enviados antes da reunião."
      },
      {
        title: "Blocos internos",
        description: "Separar tempo de revisão estratégica e fechamento operacional."
      }
    ]
  };
})(window);
