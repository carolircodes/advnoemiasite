import {
  appointmentStatusLabels,
  caseStatusLabels,
  documentRequestStatusLabels,
  documentStatusLabels,
  formatPortalDateTime
} from "../domain/portal";
import type {
  ClientAgendaSummaryData,
  ClientCaseSummaryData,
  ClientDocumentsSummaryData,
  ClientEventsSummaryData,
  ClientRequestsSummaryData
} from "./client-workspace";

type PremiumTone = "success" | "warning" | "muted" | "critical";

type PremiumStatusCard = {
  label: string;
  value: string;
  detail: string;
  tone: PremiumTone;
};

type PremiumActionItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  tone: PremiumTone;
  href: string;
  actionLabel: string;
};

type PremiumTimelineItem = {
  id: string;
  occurredAt: string;
  kind: string;
  title: string;
  detail: string;
  meta: string[];
  tone: PremiumTone;
  href: string;
  actionLabel: string;
};

export type ClientPortalPremiumProjection = {
  stageLabel: string;
  stageDetail: string;
  statusCards: PremiumStatusCard[];
  nextStep: {
    title: string;
    detail: string;
    ownerLabel: string;
    tone: PremiumTone;
  };
  attentionItems: PremiumActionItem[];
  timeline: PremiumTimelineItem[];
  strategicCards: PremiumStatusCard[];
  consistencyNote: string;
};

export type ExecutiveCockpitProjection = {
  focusHeadline: string;
  radarCards: PremiumStatusCard[];
  strategicCards: PremiumStatusCard[];
  priorityDeck: PremiumActionItem[];
  dependencyDeck: PremiumActionItem[];
  revenueDeck: PremiumActionItem[];
  consistencyNote: string;
};

function getRequestTone(request: { due_at: string | null; status: string }): PremiumTone {
  if (request.status !== "pending") {
    return "success";
  }

  if (request.due_at && new Date(request.due_at) < new Date()) {
    return "critical";
  }

  return request.due_at ? "warning" : "muted";
}

function getAppointmentTone(status: string): PremiumTone {
  if (status === "confirmed" || status === "completed") {
    return "success";
  }

  if (status === "cancelled") {
    return "critical";
  }

  return "warning";
}

function getCaseStageLabel(caseStatus: string, openRequests: number, nextAppointment: boolean) {
  if (openRequests > 0) {
    return {
      label: "Aguardando envio do cliente",
      detail: "Existem solicitacoes abertas que destravam o proximo movimento do caso."
    };
  }

  if (nextAppointment) {
    return {
      label: "Preparacao para compromisso",
      detail: "A agenda ja aponta um marco concreto e o portal pode orientar esse preparo."
    };
  }

  switch (caseStatus) {
    case "documentos":
      return {
        label: "Organizacao documental",
        detail: "A equipe esta estruturando documentos e validando o que falta para seguir."
      };
    case "analise":
      return {
        label: "Analise juridica",
        detail: "O atendimento esta em leitura tecnica e consolidacao de contexto."
      };
    case "em-andamento":
      return {
        label: "Conducao ativa",
        detail: "O caso esta em acompanhamento e os proximos marcos aparecem conforme avancam."
      };
    case "aguardando-retorno":
      return {
        label: "Aguardando retorno",
        detail: "Existe dependencia externa antes da proxima movimentacao formal."
      };
    case "concluido":
      return {
        label: "Ciclo principal concluido",
        detail: "O caso segue registrado com historico e materiais disponiveis para consulta."
      };
    default:
      return {
        label: "Triagem e organizacao inicial",
        detail: "O atendimento esta sendo estruturado para ganhar clareza e direcao."
      };
  }
}

function formatCaseStatusLabel(status: string) {
  return caseStatusLabels[status as keyof typeof caseStatusLabels] || status || "Sem status";
}

function formatDocumentStatusLabel(status: string) {
  return documentStatusLabels[status as keyof typeof documentStatusLabels] || status;
}

function formatRequestStatusLabel(status: string) {
  return (
    documentRequestStatusLabels[status as keyof typeof documentRequestStatusLabels] || status
  );
}

function formatAppointmentStatusLabel(status: string) {
  return appointmentStatusLabels[status as keyof typeof appointmentStatusLabels] || status;
}

export function buildClientPortalPremiumProjection(input: {
  caseSummary: ClientCaseSummaryData;
  documentsSummary: ClientDocumentsSummaryData;
  agendaSummary: ClientAgendaSummaryData;
  requestsSummary: ClientRequestsSummaryData;
  eventsSummary: ClientEventsSummaryData;
}): ClientPortalPremiumProjection {
  const { caseSummary, documentsSummary, agendaSummary, requestsSummary, eventsSummary } = input;
  const mainCase = caseSummary.mainCase;
  const openRequests = requestsSummary.openRequests;
  const nextAppointment = agendaSummary.nextAppointment;
  const overdueRequests = openRequests.filter(
    (request) => request.due_at && new Date(request.due_at) < new Date()
  );
  const pendingDocuments = documentsSummary.documents.filter(
    (document) => document.status === "pendente" || document.status === "solicitado"
  );
  const stage = getCaseStageLabel(
    mainCase?.status || caseSummary.clientRecord.status,
    openRequests.length,
    !!nextAppointment
  );

  const nextStep = overdueRequests[0]
    ? {
        title: overdueRequests[0].title,
        detail: overdueRequests[0].due_at
          ? `Envie este item ate ${formatPortalDateTime(overdueRequests[0].due_at)} para evitar atraso no andamento.`
          : "Esse envio ainda precisa ser concluido para o caso seguir.",
        ownerLabel: "Depende do cliente",
        tone: "critical" as const
      }
    : openRequests[0]
      ? {
          title: openRequests[0].title,
          detail: openRequests[0].instructions || "Esse envio ajuda a equipe a seguir com o atendimento.",
          ownerLabel: "Depende do cliente",
          tone: getRequestTone(openRequests[0])
        }
      : nextAppointment
        ? {
            title: nextAppointment.title,
            detail: `Seu proximo compromisso esta previsto para ${formatPortalDateTime(nextAppointment.starts_at)}.`,
            ownerLabel: "Compromisso organizado pela equipe",
            tone: getAppointmentTone(nextAppointment.status)
          }
        : {
            title: "Acompanhar novas atualizacoes",
            detail:
              "No momento, o portal esta organizado e sem pendencia imediata do seu lado. Se houver novo passo, ele aparecera aqui.",
            ownerLabel: "Sem acao imediata",
            tone: "success" as const
          };

  const attentionItems: PremiumActionItem[] = [
    ...openRequests.slice(0, 3).map((request) => ({
      id: `request-${request.id}`,
      title: request.title,
      detail:
        request.instructions || "A equipe registrou este pedido para destravar o andamento.",
      meta: request.due_at
        ? `Prazo ${formatPortalDateTime(request.due_at)}`
        : "Sem prazo definido",
      tone: getRequestTone(request) as PremiumTone,
      href: "/documentos",
      actionLabel: "Ver solicitacao"
    })),
    ...agendaSummary.upcomingAppointments.slice(0, 2).map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: appointment.title,
      detail: `${appointment.caseTitle} em ${formatPortalDateTime(appointment.starts_at)}.`,
      meta: formatAppointmentStatusLabel(appointment.status),
      tone: getAppointmentTone(appointment.status) as PremiumTone,
      href: "/agenda",
      actionLabel: "Abrir agenda"
    })),
    ...pendingDocuments.slice(0, 2).map((document) => ({
      id: `document-${document.id}`,
      title: document.file_name,
      detail: `${document.caseTitle} segue com este item em acompanhamento documental.`,
      meta: formatDocumentStatusLabel(document.status),
      tone: "warning" as const,
      href: "/documentos",
      actionLabel: "Abrir documentos"
    }))
  ].slice(0, 5);

  const timeline: PremiumTimelineItem[] = [
    ...eventsSummary.events.slice(0, 5).map((event) => ({
      id: `event-${event.id}`,
      occurredAt: event.occurred_at,
      kind: "Andamento",
      title: event.title,
      detail: event.public_summary || `${event.eventLabel} registrada no acompanhamento.`,
      meta: [event.caseTitle, event.eventLabel],
      tone: "success" as const,
      href: "/cliente",
      actionLabel: "Atualizar painel"
    })),
    ...documentsSummary.documents.slice(0, 3).map((document) => ({
      id: `timeline-document-${document.id}`,
      occurredAt: document.document_date,
      kind: "Documento",
      title: document.file_name,
      detail: `${document.caseTitle} - ${formatDocumentStatusLabel(document.status)}.`,
      meta: [document.category, formatPortalDateTime(document.document_date)],
      tone:
        document.status === "revisado" || document.status === "recebido"
          ? "success"
          : "warning" as PremiumTone,
      href: "/documentos",
      actionLabel: "Abrir documentos"
    })),
    ...agendaSummary.appointments.slice(0, 3).map((appointment) => ({
      id: `timeline-appointment-${appointment.id}`,
      occurredAt: appointment.starts_at,
      kind: "Compromisso",
      title: appointment.title,
      detail: `${appointment.caseTitle} - ${formatAppointmentStatusLabel(appointment.status)}.`,
      meta: [appointment.typeLabel, formatPortalDateTime(appointment.starts_at)],
      tone: getAppointmentTone(appointment.status) as PremiumTone,
      href: "/agenda",
      actionLabel: "Abrir agenda"
    })),
    ...requestsSummary.documentRequests.slice(0, 3).map((request) => ({
      id: `timeline-request-${request.id}`,
      occurredAt: request.due_at || request.created_at,
      kind: "Solicitacao",
      title: request.title,
      detail: request.instructions || "Solicitacao registrada pela equipe.",
      meta: [
        request.caseTitle,
        request.due_at ? `Prazo ${formatPortalDateTime(request.due_at)}` : "Sem prazo"
      ],
      tone: getRequestTone(request) as PremiumTone,
      href: "/documentos",
      actionLabel: "Ver solicitacao"
    }))
  ]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 8);

  const statusCards: PremiumStatusCard[] = [
    {
      label: "Etapa atual",
      value: stage.label,
      detail: stage.detail,
      tone: openRequests.length ? "warning" : "success"
    },
    {
      label: "Status do caso",
      value: mainCase ? formatCaseStatusLabel(mainCase.status) : "Sem caso visivel",
      detail: mainCase
        ? `${caseSummary.totalCases} acompanhamento(s) visivel(is) neste acesso.`
        : "O portal continua pronto para mostrar atualizacoes assim que o caso for liberado.",
      tone: mainCase ? "muted" : "warning"
    },
    {
      label: "Documentos e pendencias",
      value: `${documentsSummary.availableCount} disponiveis / ${openRequests.length} acao(oes)`,
      detail:
        openRequests.length > 0
          ? "Os envios e retornos pendentes aparecem primeiro para reduzir atraso."
          : "Os documentos liberados ficam organizados e o portal indica quando nada depende de voce.",
      tone: overdueRequests.length ? "critical" : openRequests.length ? "warning" : "success"
    },
    {
      label: "Agenda e proximos marcos",
      value: nextAppointment ? formatPortalDateTime(nextAppointment.starts_at) : "Sem data futura",
      detail: nextAppointment
        ? `${nextAppointment.title} - ${formatAppointmentStatusLabel(nextAppointment.status)}.`
        : "Quando houver consulta, retorno ou compromisso, ela aparecera com contexto aqui.",
      tone: nextAppointment ? getAppointmentTone(nextAppointment.status) : "muted"
    }
  ];

  const strategicCards: PremiumStatusCard[] = [
    {
      label: "Solicitacoes abertas",
      value: String(openRequests.length),
      detail:
        openRequests.length > 0
          ? `${overdueRequests.length} com prazo vencido ou pedindo prioridade.`
          : "Nenhuma solicitacao documental em aberto no momento.",
      tone: overdueRequests.length ? "critical" : openRequests.length ? "warning" : "success"
    },
    {
      label: "Eventos recentes",
      value: String(eventsSummary.recentEvents.length),
      detail: "O portal resume so o que ajuda a entender andamento e proximo movimento.",
      tone: "muted"
    },
    {
      label: "Compromissos visiveis",
      value: String(agendaSummary.upcomingAppointments.length),
      detail:
        agendaSummary.upcomingAppointments.length > 0
          ? "As datas futuras aparecem com status e contexto do caso."
          : "A agenda segue pronta para receber novos marcos.",
      tone: agendaSummary.upcomingAppointments.length ? "success" : "muted"
    }
  ];

  return {
    stageLabel: stage.label,
    stageDetail: stage.detail,
    statusCards,
    nextStep,
    attentionItems,
    timeline,
    strategicCards,
    consistencyNote:
      "Portal, documentos, agenda e andamento agora usam a mesma leitura de etapa, pendencia e proximo passo."
  };
}

function buildActionItemFromOperationalItem(item: any): PremiumActionItem {
  return {
    id: item.id,
    title: item.title,
    detail: item.description,
    meta: [item.kindLabel, item.timingLabel].filter(Boolean).join(" - "),
    tone:
      item.stateTone === "critical"
        ? "critical"
        : item.stateTone === "warning"
          ? "warning"
          : item.stateTone === "success"
            ? "success"
            : "muted",
    href: item.href,
    actionLabel: item.actionLabel
  };
}

export function buildExecutiveCockpitProjection(overview: any, intelligence: any): ExecutiveCockpitProjection {
  const operationalSummary = overview.operationalCenter.summary;
  const todayQueue = overview.operationalCenter.queues.today || [];
  const waitingClientQueue = overview.operationalCenter.queues.awaitingClient || [];
  const waitingTeamQueue = overview.operationalCenter.queues.awaitingTeam || [];
  const upcomingAppointments = overview.latestAppointments.filter((appointment: any) => {
    const startsAt = new Date(appointment.starts_at).getTime();
    return (
      !Number.isNaN(startsAt) &&
      startsAt >= Date.now() &&
      appointment.status !== "cancelled" &&
      appointment.status !== "completed"
    );
  });
  const followUpPending = intelligence.summary?.triageSubmitted
    ? intelligence.summary.triageSubmitted - intelligence.summary.clientsCreated
    : 0;
  const revenueFormation =
    operationalSummary.todayCount +
    intelligence.summary.clientsCreated +
    (intelligence.automation?.upcomingAppointments || 0);

  const radarCards: PremiumStatusCard[] = [
    {
      label: "Radar imediato",
      value: String(operationalSummary.criticalCount),
      detail:
        todayQueue[0]?.title ||
        "Sem item critico no momento. O cockpit continua destacando o que perderia timing.",
      tone: operationalSummary.criticalCount > 0 ? "critical" : "success"
    },
    {
      label: "Travado por cliente",
      value: String(operationalSummary.waitingClientCount),
      detail:
        "Pedidos de documento, primeiro acesso pendente ou retorno ainda nao recebido.",
      tone: operationalSummary.waitingClientCount > 0 ? "warning" : "success"
    },
    {
      label: "Travado por equipe",
      value: String(operationalSummary.waitingTeamCount),
      detail: "Casos, triagens e ajustes internos que pedem decisao ou registro.",
      tone: operationalSummary.waitingTeamCount > 0 ? "warning" : "success"
    },
    {
      label: "Agenda pronta",
      value: String(upcomingAppointments.length),
      detail:
        upcomingAppointments[0]
          ? `${upcomingAppointments[0].title} em ${formatPortalDateTime(upcomingAppointments[0].starts_at)}.`
          : "Sem compromisso futuro puxando preparo imediato.",
      tone: upcomingAppointments.length ? "success" : "muted"
    }
  ];

  const strategicCards: PremiumStatusCard[] = [
    {
      label: "Receita em formacao",
      value: String(revenueFormation),
      detail:
        "Leitura composta por fila do dia, clientes novos no periodo e compromissos proximos.",
      tone: revenueFormation > 0 ? "success" : "muted"
    },
    {
      label: "Oportunidades em follow-up",
      value: String(Math.max(followUpPending, 0)),
      detail: "Triagens enviadas que ainda dependem de conversa, consulta ou conversao.",
      tone: followUpPending > 0 ? "warning" : "success"
    },
    {
      label: "Pendencias documentais",
      value: String(operationalSummary.agedPendingDocumentsCount),
      detail: "Pedidos vencidos ou envelhecidos que seguram a operacao e a experiencia do cliente.",
      tone: operationalSummary.agedPendingDocumentsCount > 0 ? "critical" : "success"
    },
    {
      label: "Portal sem ativacao",
      value: String(operationalSummary.inviteStalledCount),
      detail: "Clientes cadastrados que ainda nao entraram no portal e enfraquecem continuidade.",
      tone: operationalSummary.inviteStalledCount > 0 ? "warning" : "success"
    }
  ];

  const priorityDeck = [
    ...todayQueue.slice(0, 3),
    ...overview.latestIntakeRequests
      .filter((item: any) => item.status === "new" || item.status === "in_review")
      .slice(0, 2)
      .map((item: any) => ({
        id: `intake-${item.id}`,
        title: item.full_name,
        description: `${item.areaLabel} - ${item.urgencyLabel} - ${item.statusLabel}.`,
        kindLabel: "Triagem",
        timingLabel: `Recebida em ${formatPortalDateTime(item.submitted_at)}`,
        href: `/internal/advogada?intakeRequestId=${item.id}#triagens-recebidas`,
        actionLabel: "Abrir triagem",
        stateTone: item.urgency_level === "urgente" ? "critical" : "warning"
      }))
  ]
    .slice(0, 5)
    .map(buildActionItemFromOperationalItem);

  const dependencyDeck = [...waitingClientQueue.slice(0, 3), ...waitingTeamQueue.slice(0, 2)]
    .slice(0, 5)
    .map(buildActionItemFromOperationalItem);

  const revenueDeck = [
    ...(intelligence.suggestions || []).slice(0, 3).map((item: any, index: number) => ({
      id: `suggestion-${index}`,
      title: item.title,
      description: item.body,
      kindLabel: "Leitura estrategica",
      timingLabel: "Aja agora",
      href: item.href,
      actionLabel: "Abrir area",
      stateTone: "success"
    })),
    ...upcomingAppointments.slice(0, 2).map((appointment: any) => ({
      id: `appointment-${appointment.id}`,
      title: appointment.title,
      description: `${appointment.clientName} - ${appointment.caseTitle}.`,
      kindLabel: "Compromisso",
      timingLabel: formatPortalDateTime(appointment.starts_at),
      href: `/agenda?clientId=${appointment.client_id}&caseId=${appointment.case_id}`,
      actionLabel: "Abrir agenda",
      stateTone: "warning"
    }))
  ]
    .slice(0, 5)
    .map(buildActionItemFromOperationalItem);

  const focusHeadline =
    operationalSummary.criticalCount > 0
      ? `${operationalSummary.criticalCount} ponto(s) ja exigem conducao imediata antes do restante da fila.`
      : operationalSummary.todayCount > 0
        ? `${operationalSummary.todayCount} movimento(s) estruturam o dia com clareza entre consulta, documentos e operacao.`
        : "A operacao esta limpa agora. O cockpit segue pronto para destacar o proximo gargalo assim que ele surgir.";

  return {
    focusHeadline,
    radarCards,
    strategicCards,
    priorityDeck,
    dependencyDeck,
    revenueDeck,
    consistencyNote:
      "Cockpit, portal, agenda e documentos agora podem ser lidos pela mesma logica: urgencia, dependencia, proximo passo e impacto operacional."
  };
}
