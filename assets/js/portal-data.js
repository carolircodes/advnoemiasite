(function (global) {
  global.PortalData = {
    office: {
      name: "Noêmia Paixão Advocacia",
      oab: "OAB/RN 3939",
      tagline: "Portal jurídico organizado",
      supportPhone: "5584996248241"
    },
    api: {
      useMock: true,
      baseUrl: "../api",
      endpoints: {
        session: "/portal/session",
        login: "/portal/auth/login",
        internalLogin: "/portal/auth/internal/login",
        passwordSetup: "/portal/auth/password/setup",
        passwordReset: "/portal/auth/password/reset",
        clients: "/portal/clients",
        clientInvite: "/portal/clients/invite",
        cases: "/portal/cases",
        caseUpdates: "/portal/cases/updates",
        documents: "/portal/documents",
        documentRequests: "/portal/documents/requests",
        schedule: "/portal/schedule",
        notifications: "/portal/notifications"
      }
    },
    routes: {
      site: "https://advnoemia.com.br/",
      blog: "https://advnoemia.com.br/blog.html",
      triagem: "https://advnoemia.com.br/triagem.html?area=geral&origem=portal-login&pagina=portal/login",
      login: "https://portal.advnoemia.com.br/portal/login",
      painelAdvogada: "https://portal.advnoemia.com.br/internal/advogada",
      painelCliente: "https://portal.advnoemia.com.br/cliente",
      documentos: "https://portal.advnoemia.com.br/documentos",
      agenda: "https://portal.advnoemia.com.br/agenda"
    },
    statusMap: {
      confirmed: { label: "Confirmado", tone: "success" },
      ready: { label: "Pronto", tone: "success" },
      completed: { label: "Concluído", tone: "success" },
      validated: { label: "Validado", tone: "success" },
      active: { label: "Acesso ativo", tone: "success" },
      planned: { label: "Preparado", tone: "success" },
      scheduled: { label: "Agendado", tone: "success" },
      updated: { label: "Atualizado", tone: "success" },
      inReview: { label: "Em revisão", tone: "" },
      preparing: { label: "Em andamento", tone: "" },
      reserve: { label: "Reserva", tone: "" },
      pending: { label: "Pendente", tone: "warning" },
      pendingClient: { label: "Aguardando cliente", tone: "warning" },
      invited: { label: "Convite pendente", tone: "warning" },
      requested: { label: "Solicitado", tone: "warning" },
      highPriority: { label: "Prioridade alta", tone: "warning" },
      prerequisite: { label: "Pré-requisito", tone: "warning" },
      missing: { label: "Documento pendente", tone: "danger" }
    },
    users: {
      advogada: {
        name: "Dra. Noêmia Paixão",
        label: "Painel interno",
        summary: "Cadastro de clientes, atualização de casos, agenda e organização das comunicações do escritório."
      },
      cliente: {
        name: "Marina Costa",
        label: "Área do cliente",
        summary: "Cliente com revisão previdenciária em andamento, documentos conferidos e agenda ativa."
      },
      documentos: {
        name: "Centro documental",
        label: "Documentos",
        summary: "Fila de arquivos, solicitações ao cliente, conferência e histórico organizados por caso."
      },
      agenda: {
        name: "Agenda operacional",
        label: "Agenda",
        summary: "Compromissos, confirmações e lembretes conectados aos casos e às próximas ações do atendimento."
      }
    },
    summaries: {
      advogada: {
        registrations: "06 cadastros",
        cases: "24 casos",
        notifications: "05 eventos",
        documents: "12 documentos"
      },
      cliente: {
        currentStage: "Etapa atual",
        nextMeeting: "Próxima consulta",
        pendingDocs: "1 documento",
        lastUpdate: "Última atualização"
      },
      documentos: {
        files: "12 arquivos",
        requests: "03 solicitações",
        pendingItems: "03 pendências",
        traceability: "Histórico ativo"
      },
      agenda: {
        appointments: "08 compromissos",
        confirmations: "03 confirmações",
        freeSlots: "02 janelas livres",
        alerts: "02 avisos"
      }
    },
    integrationModules: [
      {
        title: "Cadastro e acesso do cliente",
        description: "A equipe cadastra o cliente, vincula o caso e libera o portal com login por e-mail."
      },
      {
        title: "Convite e primeiro acesso",
        description: "O cliente recebe convite por e-mail para definir a própria senha com fluxo seguro."
      },
      {
        title: "Recuperação de senha",
        description: "A redefinição poderá ser enviada para o e-mail cadastrado, sem uso de CPF como senha."
      },
      {
        title: "Eventos e notificações",
        description: "Atualizações de caso, documentos, agenda e status poderão acionar e-mails automáticos."
      }
    ],
    loginHighlights: [
      {
        title: "1. Cadastro pela equipe",
        description: "A advogada cadastra nome, e-mail, CPF, telefone, área do caso e status inicial."
      },
      {
        title: "2. Convite por e-mail",
        description: "Depois do cadastro, o cliente pode receber um convite para definir a própria senha."
      },
      {
        title: "3. Acompanhamento no portal",
        description: "Com o acesso liberado, o cliente entra com o e-mail cadastrado e acompanha o caso."
      }
    ],
    loginSupportCards: [
      {
        id: "primeiro-acesso",
        title: "Primeiro acesso",
        description: "O cliente recebe um convite no e-mail cadastrado para criar a senha e liberar a entrada no portal.",
        tags: ["Convite por e-mail", "Senha definida pelo cliente"]
      },
      {
        id: "recuperacao-senha",
        title: "Esqueci minha senha",
        description: "A recuperação será feita por link seguro enviado para o e-mail cadastrado no escritório.",
        tags: ["Redefinição segura", "Login por e-mail"]
      },
      {
        id: "acesso-interno",
        title: "Painel interno da equipe",
        description: "A advogada usa o painel interno para cadastrar clientes, atualizar casos e preparar comunicações futuras.",
        tags: ["Cadastro interno", "Gestão de casos"],
        action: {
          label: "Abrir painel interno",
          href: "https://portal.advnoemia.com.br/internal/advogada",
          variant: "secondary"
        }
      }
    ],
    loginReadiness: [
      {
        key: "Login do cliente",
        value: "Entrada pelo e-mail cadastrado, com sessão segura e permissão por perfil."
      },
      {
        key: "Convite inicial",
        value: "Disparo futuro de e-mail para criação da primeira senha do cliente."
      },
      {
        key: "Esqueci minha senha",
        value: "Envio futuro de link de redefinição para o e-mail cadastrado."
      },
      {
        key: "Painel interno",
        value: "Cadastro de clientes, atualização de casos e organização dos próximos envios."
      }
    ],
    clientRegistrationFields: [
      {
        label: "Nome completo",
        type: "text",
        placeholder: "Nome completo do cliente"
      },
      {
        label: "E-mail",
        type: "email",
        placeholder: "cliente@dominio.com"
      },
      {
        label: "CPF",
        type: "text",
        placeholder: "000.000.000-00"
      },
      {
        label: "Telefone",
        type: "tel",
        placeholder: "(84) 00000-0000"
      },
      {
        label: "Área do caso",
        type: "select",
        placeholder: "Selecione a área do caso",
        options: [
          "Direito Previdenciário",
          "Consumidor e Bancário",
          "Direito de Família",
          "Direito Civil"
        ]
      },
      {
        label: "Status",
        type: "select",
        placeholder: "Selecione o status inicial",
        options: [
          "Triagem recebida",
          "Cadastro concluído",
          "Convite pendente",
          "Acesso ativo"
        ]
      },
      {
        label: "Observações",
        type: "textarea",
        placeholder: "Observações internas, urgência, documentos pendentes e próximos passos.",
        fullWidth: true,
        rows: 4
      }
    ],
    clientRegistrationTags: ["Login por e-mail", "Convite por e-mail", "Senha criada pelo cliente"],
    clientAccessFlow: [
      {
        title: "Triagem ou contato inicial",
        description: "O novo atendimento chega ao escritório e é qualificado pela equipe."
      },
      {
        title: "Cadastro interno do cliente",
        description: "A advogada registra dados, área do caso, observações e status inicial."
      },
      {
        title: "Convite para o portal",
        description: "O sistema poderá enviar e-mail com convite para o cliente definir a própria senha."
      },
      {
        title: "Acompanhamento do caso",
        description: "Depois do primeiro acesso, o cliente acompanha documentos, agenda e atualizações."
      }
    ],
    advogadaRadar: [
      {
        title: "09:30 • Consulta inicial",
        description: "Marina Costa • revisão previdenciária",
        status: "confirmed"
      },
      {
        title: "11:00 • Conferência de cadastro",
        description: "Novo cliente bancário • convite pendente de envio",
        status: "highPriority"
      },
      {
        title: "15:30 • Retorno ao cliente",
        description: "Atualização de status após análise do caso",
        status: "preparing"
      }
    ],
    advogadaCaseUpdates: [
      {
        title: "Atualização do caso • Marina Costa",
        description: "Resumo do andamento pronto para publicação no portal e envio futuro por e-mail.",
        status: "updated"
      },
      {
        title: "Mudança de status • caso bancário",
        description: "Status alterado para aguardando documentos complementares do cliente.",
        status: "pendingClient"
      },
      {
        title: "Novo cliente • direito de família",
        description: "Cadastro recebido e aguardando conferência final antes do convite para o portal.",
        status: "invited"
      }
    ],
    notificationEvents: [
      {
        title: "Atualização do caso",
        description: "Quando a equipe registrar novo andamento, o cliente poderá receber resumo por e-mail com link para o portal.",
        status: "planned"
      },
      {
        title: "Novo documento",
        description: "Ao disponibilizar documento no portal, o sistema poderá avisar o cliente por e-mail.",
        status: "planned"
      },
      {
        title: "Novo agendamento",
        description: "Criação de consulta ou retorno poderá gerar confirmação por e-mail para o cliente.",
        status: "scheduled"
      },
      {
        title: "Solicitação de documento",
        description: "Pedidos de novos arquivos poderão ser enviados com checklist e link direto para o portal.",
        status: "requested"
      },
      {
        title: "Mudança de status",
        description: "Mudanças como em análise, aguardando cliente ou concluído poderão acionar comunicação automática.",
        status: "planned"
      }
    ],
    clientTimeline: [
      {
        title: "1. Cadastro e triagem concluídos",
        description: "Seus dados principais já foram registrados e o atendimento foi vinculado à área correta."
      },
      {
        title: "2. Documentação em conferência",
        description: "CNIS e documentos pessoais foram analisados. Falta apenas um comprovante complementar."
      },
      {
        title: "3. Reunião estratégica agendada",
        description: "Na próxima consulta serão explicados cenário, riscos e próximos passos do caso."
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
        title: "Login por e-mail",
        description: "O acesso do cliente usa o e-mail cadastrado pela equipe no escritório."
      },
      {
        title: "Convite e redefinição",
        description: "O primeiro acesso e a recuperação de senha poderão ser enviados para o mesmo e-mail."
      },
      {
        title: "Canal de apoio",
        description: "O WhatsApp continua disponível para dúvidas práticas e encaminhamentos imediatos."
      }
    ],
    documentQueue: [
      {
        title: "Contrato de honorários",
        description: "Cliente: Marina Costa • aguardando assinatura",
        status: "pendingClient"
      },
      {
        title: "Procuração",
        description: "Cliente: Marina Costa • pronta para conferência",
        status: "ready"
      },
      {
        title: "Extratos bancários",
        description: "Caso bancário • documentos complementares solicitados",
        status: "requested"
      },
      {
        title: "CNIS atualizado",
        description: "Caso previdenciário • documento validado pela equipe",
        status: "validated"
      }
    ],
    documentChecklist: [
      {
        title: "Onboarding inicial",
        description: "Documento pessoal, comprovante de endereço, contrato e procuração.",
        status: "active"
      },
      {
        title: "Provas do caso",
        description: "Extratos, prints, protocolos, contratos e anexos complementares.",
        status: "pending"
      },
      {
        title: "Peças e histórico",
        description: "Petição, anexos técnicos, versões e validações organizadas por etapa.",
        status: "planned"
      }
    ],
    documentFlow: [
      {
        title: "1. Solicitar",
        description: "A equipe abre a solicitação com checklist objetivo e prazo."
      },
      {
        title: "2. Receber",
        description: "O arquivo entra no caso com tipo documental, origem e status inicial."
      },
      {
        title: "3. Conferir",
        description: "A equipe valida se o documento está completo, pendente ou pronto para uso."
      },
      {
        title: "4. Publicar no portal",
        description: "Quando necessário, o cliente é avisado no portal e poderá receber comunicação por e-mail."
      }
    ],
    documentNotificationEvents: [
      {
        title: "Novo documento disponibilizado",
        description: "Quando um arquivo for publicado no portal, o cliente poderá receber aviso por e-mail.",
        status: "planned"
      },
      {
        title: "Solicitação de documento",
        description: "Pedidos de anexos poderão ser enviados com checklist e link direto para o portal.",
        status: "requested"
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
        title: "11:00 • Novo agendamento",
        description: "Retorno bancário criado e aguardando confirmação do cliente",
        status: "scheduled"
      },
      {
        title: "15:30 • Lembrete ao cliente",
        description: "Compromisso de amanhã com envio futuro de aviso por e-mail",
        status: "preparing"
      }
    ],
    agendaGuides: [
      {
        title: "Confirmação do compromisso",
        description: "Registrar status do atendimento e orientar o cliente com antecedência."
      },
      {
        title: "Pré-leitura documental",
        description: "Verificar se documentos essenciais foram enviados antes da reunião."
      },
      {
        title: "Rotina interna",
        description: "Separar tempo para revisão estratégica, retorno ao cliente e fechamento operacional."
      }
    ],
    agendaNotificationEvents: [
      {
        title: "Novo agendamento",
        description: "Ao criar consulta ou retorno, o cliente poderá receber confirmação por e-mail.",
        status: "scheduled"
      },
      {
        title: "Lembrete de compromisso",
        description: "Antes do horário agendado, o sistema poderá enviar aviso com data, hora e link do portal.",
        status: "planned"
      }
    ]
  };
})(window);
