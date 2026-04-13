import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { OperationalList } from "@/components/operational-list";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  caseAreas,
  caseStatusLabels,
  caseStatuses,
  clientStatusLabels,
  clientStatuses,
  formatPortalDateTime,
  intakeRequestStatusLabels,
  intakeRequestStatuses
} from "@/lib/domain/portal";
import {
  buildInternalAgendaHref,
  buildInternalCaseHref,
  buildInternalCasesHref,
  buildInternalClientHref,
  buildInternalDocumentsHref,
  buildInternalNewCaseHref
} from "@/lib/navigation";
import { createClientWithInvite } from "@/lib/services/create-client";
import { getStaffOverview } from "@/lib/services/dashboard";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";
import { buildExecutiveCockpitProjection } from "@/lib/services/premium-operational-model";
import { updateIntakeRequestStatus } from "@/lib/services/public-intake";
import { getRevenueIntelligenceOverview } from "@/lib/services/revenue-intelligence";

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function isWithinDateRange(
  value: string | null | undefined,
  dateFrom: string,
  dateTo: string
) {
  if (!value) {
    return !dateFrom && !dateTo;
  }

  const current = new Date(value);

  if (Number.isNaN(current.getTime())) {
    return false;
  }

  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`);

    if (current < start) {
      return false;
    }
  }

  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59.999`);

    if (current > end) {
      return false;
    }
  }

  return true;
}

function getPriorityRank(priority: string) {
  switch (priority) {
    case "urgente":
      return 4;
    case "alta":
      return 3;
    case "normal":
      return 2;
    case "baixa":
      return 1;
    default:
      return 0;
  }
}

function getUrgencyRank(urgency: string) {
  switch (urgency) {
    case "urgente":
      return 4;
    case "alta":
      return 3;
    case "moderada":
      return 2;
    case "baixa":
      return 1;
    default:
      return 0;
  }
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "cliente-cadastrado":
      return "Cliente criado com sucesso. O convite, o caso inicial e o historico base ja ficaram alinhados.";
    case "cliente-atualizado":
      return "Ficha do cliente atualizada com sucesso. Contato, status e acesso do portal ficaram sincronizados.";
    case "atualizacao-registrada":
      return "Atualizacao registrada com sucesso. O portal interno e a area do cliente ja refletem o novo andamento.";
    case "caso-criado":
      return "Caso aberto com sucesso. O acompanhamento interno e a linha do tempo do cliente ja ficaram alinhados.";
    case "caso-editado":
      return "Caso atualizado com sucesso. As informacoes principais do acompanhamento ja foram sincronizadas.";
    case "status-atualizado":
      return "Status do caso atualizado com sucesso. A trilha operacional e a comunicacao futura ficaram consistentes.";
    case "triagem-atualizada":
      return "Triagem atualizada com sucesso. O painel interno ja reflete o novo andamento.";
    default:
      return "";
  }
}

function getIntakeNextStep(status: string, urgencyLabel: string) {
  if (status === "new") {
    return `Fazer leitura inicial e definir retorno com prioridade ${urgencyLabel.toLowerCase()}.`;
  }

  if (status === "in_review") {
    return "Concluir analise, registrar observacao interna e decidir se a triagem ja vira cliente.";
  }

  return "Revisar o andamento atual e decidir se ainda existe proximo movimento operacional pendente.";
}

function formatMoneyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

async function createClientAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await createClientWithInvite(
      {
        intakeRequestId: formData.get("intakeRequestId"),
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        cpf: formData.get("cpf"),
        phone: formData.get("phone"),
        caseArea: formData.get("caseArea"),
        notes: formData.get("notes"),
        status: formData.get("status")
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-cadastrar";
    redirect(`/internal/advogada?error=${message}`);
  }

  redirect("/internal/advogada?success=cliente-cadastrado");
}
async function updateIntakeRequestStatusAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await updateIntakeRequestStatus(
      {
        intakeRequestId: formData.get("intakeRequestId"),
        status: formData.get("status"),
        internalNotes: formData.get("internalNotes")
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-atualizar-triagem";
    redirect(`/internal/advogada?error=${message}`);
  }

  redirect("/internal/advogada?success=triagem-atualizada");
}

export default async function InternalLawyerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const overview = await getStaffOverview();
  const intelligence = await getBusinessIntelligenceOverview(30);
  const revenue = await getRevenueIntelligenceOverview(30);
  const params = await searchParams;
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const success = typeof params.success === "string" ? getSuccessMessage(params.success) : "";
  const query = getStringParam(params.q);
  const selectedCaseStatus = getStringParam(params.caseStatus);
  const sort = getStringParam(params.sort, "recent");
  const dateFrom = getStringParam(params.dateFrom);
  const dateTo = getStringParam(params.dateTo);
  const selectedIntakeRequestId = getStringParam(params.intakeRequestId);
  const pendingOnly = getStringParam(params.pending) === "1";
  const hasFilters = !!(query || selectedCaseStatus || dateFrom || dateTo || pendingOnly || sort !== "recent");
  const hasClients = overview.clientOptions.length > 0;
  const now = new Date();
  const filteredClients = overview.clientOptions.filter((client) =>
    matchesSearch(query, [client.fullName, client.email, client.statusLabel])
  );
  const filteredIntakeRequests = overview.latestIntakeRequests
    .filter(
      (item) =>
        matchesSearch(query, [
          item.full_name,
          item.email,
          item.phone,
          item.areaLabel,
          item.stageLabel,
          item.urgencyLabel,
          item.statusLabel
        ]) &&
        isWithinDateRange(item.submitted_at, dateFrom, dateTo) &&
        (!pendingOnly || item.status === "new" || item.status === "in_review")
    )
    .sort((left, right) => {
      const urgencyDifference =
        getUrgencyRank(right.urgency_level) - getUrgencyRank(left.urgency_level);

      if (urgencyDifference !== 0) {
        return urgencyDifference;
      }

      return right.submitted_at.localeCompare(left.submitted_at);
    })
    .slice(0, 6);
  const selectedIntakeRequest =
    overview.latestIntakeRequests.find((item) => item.id === selectedIntakeRequestId) || null;
  const filteredCases = overview.caseOptions
    .filter(
      (caseItem) =>
        matchesSearch(query, [
          caseItem.title,
          caseItem.clientName,
          caseItem.summary,
          caseItem.priorityLabel
        ]) &&
        (!selectedCaseStatus || caseItem.status === selectedCaseStatus) &&
        (!pendingOnly || caseItem.status !== "concluido")
    )
    .sort((left, right) => {
      if (sort === "priority") {
        const priorityDifference = getPriorityRank(right.priority) - getPriorityRank(left.priority);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }
      }

      return right.created_at.localeCompare(left.created_at);
    });
  const preferredClient = filteredClients[0] || overview.clientOptions[0] || null;
  const preferredCase =
    filteredCases.find((caseItem) => caseItem.status !== "concluido") ||
    filteredCases[0] ||
    overview.caseOptions.find((caseItem) => caseItem.status !== "concluido") ||
    overview.caseOptions[0] ||
    null;
  const upcomingAppointments = overview.latestAppointments
    .filter(
      (appointment) =>
        matchesSearch(query, [
          appointment.title,
          appointment.clientName,
          appointment.caseTitle,
          appointment.typeLabel
        ]) &&
        isWithinDateRange(appointment.starts_at, dateFrom, dateTo) &&
        new Date(appointment.starts_at) >= now &&
        appointment.status !== "cancelled" &&
        appointment.status !== "completed" &&
        (!pendingOnly || appointment.visible_to_client)
    )
    .slice(0, 6);
  const activeCases = filteredCases.filter((caseItem) => caseItem.status !== "concluido").slice(0, 6);
  const pendingDocuments = overview.latestDocuments.filter(
    (document) =>
      (document.status === "pendente" || document.status === "solicitado") &&
      matchesSearch(query, [document.file_name, document.caseTitle, document.category]) &&
      isWithinDateRange(document.document_date, dateFrom, dateTo)
  );
  const pendingRequests = overview.latestDocumentRequests.filter(
    (request) =>
      request.status === "pending" &&
      matchesSearch(query, [request.title, request.caseTitle, request.statusLabel]) &&
      isWithinDateRange(request.due_at || request.created_at, dateFrom, dateTo)
  );
  const pendingNotifications = overview.outboxPreview.filter(
    (item) =>
      item.status === "pending" &&
      matchesSearch(query, [item.template_key, item.status]) &&
      isWithinDateRange(item.created_at, dateFrom, dateTo)
  );
  const latestEvents = overview.latestEvents
    .filter(
      (event) =>
        matchesSearch(query, [event.title, event.caseTitle, event.eventLabel]) &&
        isWithinDateRange(event.occurred_at, dateFrom, dateTo)
    )
    .slice(0, 8);
  const operationalSummary = overview.operationalCenter.summary;
  const todayQueue = overview.operationalCenter.queues.today.slice(0, 5);
  const thisWeekQueue = overview.operationalCenter.queues.thisWeek.slice(0, 5);
  const awaitingClientQueue = overview.operationalCenter.queues.awaitingClient.slice(0, 5);
  const awaitingTeamQueue = overview.operationalCenter.queues.awaitingTeam.slice(0, 5);
  const recentlyCompletedQueue =
    overview.operationalCenter.queues.recentlyCompleted.slice(0, 5);
  const operationalHighlights = [
    {
      label: "Criticos agora",
      value: String(operationalSummary.criticalCount),
      note: "Triagens urgentes, pendencias vencidas ou compromissos que ja pedem preparo.",
      tone: "critical"
    },
    {
      label: "Fazer hoje",
      value: String(operationalSummary.todayCount),
      note: todayQueue[0]
        ? `${todayQueue[0].title} esta puxando a fila neste momento.`
        : "A fila do dia esta limpa neste momento.",
      tone: "warning"
    },
    {
      label: "Aguardando cliente",
      value: String(operationalSummary.waitingClientCount),
      note: "Itens parados por falta de retorno, envio documental ou primeiro acesso.",
      tone: "neutral"
    },
    {
      label: "Aguardando equipe",
      value: String(operationalSummary.waitingTeamCount),
      note: "Casos, triagens e ajustes internos que ainda pedem um proximo movimento.",
      tone: "success"
    }
  ] as const;
  const operationalSignals = [
    {
      label: "Triagens urgentes",
      value: String(operationalSummary.urgentTriageCount),
      body: "Entradas que pedem leitura inicial sem ficar perdidas no restante do painel."
    },
    {
      label: "Convites travados",
      value: String(operationalSummary.inviteStalledCount),
      body: "Clientes criados que ainda nao concluiram o primeiro acesso ao portal."
    },
    {
      label: "Pendencias envelhecidas",
      value: String(operationalSummary.agedPendingDocumentsCount),
      body: "Solicitacoes documentais vencidas ou abertas ha tempo demais."
    },
    {
      label: "Casos sem atualizacao",
      value: String(operationalSummary.staleCasesCount),
      body: "Acompanhamentos que ja merecem novo andamento, retorno ou decisao interna."
    }
  ];
  const suggestedMoves = intelligence.suggestions.slice(0, 4);
  const pendingRevenuePayments = revenue.latestPayments.filter((item) => item.status === "pending");
  const failedRevenuePayments = revenue.latestPayments.filter(
    (item) => item.status === "rejected" || item.status === "failed"
  );
  const sourceRows = intelligence.acquisition.bySource.slice(0, 4);
  const hottestSource = sourceRows[0] || null;
  const siteSource =
    intelligence.acquisition.bySource.find((item) => item.key === "site") || null;
  const socialSources = intelligence.acquisition.bySource.filter(
    (item) => item.key === "instagram" || item.key === "whatsapp"
  );
  const commandQuickActions = [
    {
      kicker: "Consulta do dia",
      title: upcomingAppointments[0]
        ? `Abrir ${upcomingAppointments[0].title}`
        : "Organizar agenda e compromissos",
      body: upcomingAppointments[0]
        ? `${upcomingAppointments[0].clientName} - ${formatPortalDateTime(upcomingAppointments[0].starts_at)}`
        : "A agenda segue como eixo central para preparar atendimento, retorno e comparecimento.",
      href: upcomingAppointments[0]
        ? buildInternalAgendaHref(
            upcomingAppointments[0].client_id,
            upcomingAppointments[0].case_id
          )
        : "/agenda",
      actionLabel: upcomingAppointments[0] ? "Abrir agenda do compromisso" : "Abrir agenda"
    },
    {
      kicker: "Pagamento pendente",
      title: pendingRevenuePayments[0]
        ? pendingRevenuePayments[0].offerLabel
        : "Abrir camada de monetizacao",
      body: pendingRevenuePayments[0]
        ? `${pendingRevenuePayments[0].amountLabel} em ${pendingRevenuePayments[0].pathLabel}.`
        : "Veja pagamentos pendentes, gargalos entre aceite e checkout e oportunidades de retomada.",
      href: "#camadas-command-center",
      actionLabel: pendingRevenuePayments[0] ? "Ver pagamentos em aberto" : "Abrir monetizacao"
    },
    {
      kicker: "Entrada mais forte",
      title: hottestSource
        ? `${hottestSource.label} puxando aquisicao`
        : "Revisar entradas e social",
      body: hottestSource
        ? `${hottestSource.triageSubmitted} triagem(ns) enviadas e ${hottestSource.clientsCreated} cliente(s) originados no periodo.`
        : "A camada de entradas cruza site, social e triagem para mostrar onde existe oportunidade hoje.",
      href: "#camadas-command-center",
      actionLabel: hottestSource ? "Abrir entradas e canais" : "Ver entradas"
    },
    {
      kicker: "Gargalo dominante",
      title:
        operationalSummary.waitingClientCount > operationalSummary.waitingTeamCount
          ? "Destravar dependencias do cliente"
          : "Destravar fila interna",
      body:
        operationalSummary.waitingClientCount > operationalSummary.waitingTeamCount
          ? `${operationalSummary.waitingClientCount} item(ns) seguem parados por documento, retorno ou acesso.`
          : `${operationalSummary.waitingTeamCount} item(ns) dependem de decisao, registro ou conducao humana.`,
      href: "#central-prioridades",
      actionLabel: "Abrir gargalos"
    }
  ];
  const commandCenterLayers = [
    {
      title: "Agenda e compromissos no centro",
      kicker: "Camada agenda",
      summary: upcomingAppointments.length
        ? `${upcomingAppointments.length} compromisso(s) futuro(s) visivel(is) com preparo operacional imediato.`
        : "Sem compromisso futuro puxando preparo agora, mas a agenda segue como eixo principal do cockpit.",
      bullets: [
        upcomingAppointments[0]
          ? `${upcomingAppointments[0].title} em ${formatPortalDateTime(upcomingAppointments[0].starts_at)}.`
          : "Nenhum compromisso puxando urgencia nas proximas horas.",
        `${overview.latestAppointments.filter((item) => item.status === "scheduled").length} consulta(s) ainda em status agendado.`,
        `${overview.latestAppointments.filter((item) => item.status === "confirmed").length} compromisso(s) ja confirmados.`
      ],
      href: "/agenda",
      actionLabel: "Abrir agenda central"
    },
    {
      title: "Entradas, social e maquina do site",
      kicker: "Camada entrada",
      summary: sourceRows.length
        ? `${sourceRows
            .map((item) => `${item.label}: ${item.triageSubmitted}`)
            .join(" | ")} triagem(ns) enviadas por origem.`
        : "As origens ganham leitura aqui assim que o funil registrar mais movimento no periodo.",
      bullets: [
        siteSource
          ? `Site gerou ${siteSource.triageSubmitted} triagem(ns) e ${siteSource.clientsCreated} cliente(s).`
          : "Sem volume do site suficiente para destaque no periodo.",
        socialSources.length
          ? socialSources
              .map((item) => `${item.label} com ${item.triageStarted} inicio(s) de triagem`)
              .join(" | ")
          : "Instagram e WhatsApp entram aqui quando a origem social gera conversa rastreavel.",
        filteredIntakeRequests[0]
          ? `Triagem mais recente: ${filteredIntakeRequests[0].full_name} em ${filteredIntakeRequests[0].areaLabel}.`
          : "Nenhuma triagem nova aguardando leitura neste momento."
      ],
      href: "#triagens-recebidas",
      actionLabel: "Abrir entradas e triagens"
    },
    {
      title: "Comercial, consulta e receita",
      kicker: "Camada comercial",
      summary: `${formatMoneyBRL(revenue.summary.revenueInFormation)} em formacao e ${formatMoneyBRL(revenue.summary.revenueConfirmed)} confirmados no periodo.`,
      bullets: [
        `${revenue.summary.pendingCount} pagamento(s) pendente(s) entre aceite e confirmacao.`,
        `${revenue.summary.paymentFollowUpNeeded} jornada(s) pedindo follow-up monetizavel.`,
        pendingRevenuePayments[0]
          ? `Pagamento mais sensivel: ${pendingRevenuePayments[0].offerLabel} (${pendingRevenuePayments[0].amountLabel}).`
          : "Sem pagamento pendente puxando a fila agora."
      ],
      href: "#camadas-command-center",
      actionLabel: "Abrir monetizacao"
    },
    {
      title: "Gargalos, dependencias e risco",
      kicker: "Camada risco operacional",
      summary: `${operationalSummary.waitingClientCount} dependencias do cliente, ${operationalSummary.waitingTeamCount} internas e ${operationalSummary.agedPendingDocumentsCount} pendencia(s) documental(is) envelhecida(s).`,
      bullets: [
        `${operationalSummary.inviteStalledCount} convite(s) travado(s) no portal.`,
        failedRevenuePayments.length
          ? `${failedRevenuePayments.length} tentativa(s) de pagamento falharam e podem ser recuperadas.`
          : "Nenhuma falha de pagamento recente dominando o risco comercial.",
        `${operationalSummary.staleCasesCount} caso(s) sem atualizacao recente pedindo reentrada.`
      ],
      href: "#central-prioridades",
      actionLabel: "Abrir gargalos"
    }
  ];
  const operationalHeadline =
    operationalSummary.criticalCount > 0
      ? `${operationalSummary.criticalCount} item(ns) ja cruzaram o limite de atencao e merecem acao antes do restante da fila.`
      : operationalSummary.todayCount > 0
        ? `${operationalSummary.todayCount} item(ns) entram no radar de hoje e ajudam a organizar a rotina sem leitura manual dispersa.`
        : "A operacao esta estavel agora. O painel segue atento para destacar o que mudar de prioridade.";
  const noemiaPrompts = [
    "Resuma a fila de hoje e diga por onde devo comecar.",
    "Quais pendencias estao envelhecendo e qual proximo passo interno faz mais sentido?",
    "Monte um texto-base curto para cobrar documentos do cliente.",
    "Quais casos estao sem atualizacao recente e como eu deveria prioriza-los?"
  ];
  const executiveFocus = [
    preferredCase
      ? {
          kicker: "Caso que pede conducao",
          title: preferredCase.title,
          detail: `${preferredCase.clientName} - ${preferredCase.statusLabel} - ${preferredCase.priorityLabel}.`,
          body:
            preferredCase.summary ||
            "Abra a ficha do caso para consolidar status, andamento e proximo passo no mesmo fluxo.",
          href: buildInternalCaseHref(preferredCase.id),
          actionLabel: "Abrir caso"
        }
      : null,
    preferredClient
      ? {
          kicker: "Cliente em foco",
          title: preferredClient.fullName,
          detail: `${preferredClient.caseCount} caso(s), ${preferredClient.pendingDocumentRequestsCount} pendencia(s) e ${preferredClient.upcomingAppointmentsCount} compromisso(s).`,
          body:
            preferredClient.primaryCaseTitle ||
            "A ficha do cliente concentra portal, documentos, agenda e sinais operacionais.",
          href: buildInternalClientHref(preferredClient.id),
          actionLabel: "Abrir ficha"
        }
      : null,
    filteredIntakeRequests[0]
      ? {
          kicker: "Triagem que pede decisao",
          title: filteredIntakeRequests[0].full_name,
          detail: `${filteredIntakeRequests[0].areaLabel} - ${filteredIntakeRequests[0].urgencyLabel} - ${filteredIntakeRequests[0].statusLabel}.`,
          body: getIntakeNextStep(
            filteredIntakeRequests[0].status,
            filteredIntakeRequests[0].urgencyLabel
          ),
          href: `/internal/advogada?intakeRequestId=${filteredIntakeRequests[0].id}#triagens-recebidas`,
          actionLabel: "Abrir triagem"
        }
      : null,
    suggestedMoves[0]
      ? {
          kicker: "Movimento sugerido",
          title: suggestedMoves[0].title,
          detail: "Leitura orientada por comportamento real da operacao.",
          body: suggestedMoves[0].body,
          href: suggestedMoves[0].href,
          actionLabel: "Abrir area"
        }
      : null
  ].filter(
    (
      item
    ): item is {
      kicker: string;
      title: string;
      detail: string;
      body: string;
      href: string;
      actionLabel: string;
    } => item !== null
  );
  const cockpitProjection = buildExecutiveCockpitProjection(overview, intelligence);

  return (
    <AppFrame
      eyebrow="Painel da advogada"
      title={`Command center premium para ${profile.full_name}.`}
      description="O cockpit-mae agora unifica agenda, entradas, comercial, receita, operacao e proximo passo em uma leitura central de comando, sem depender de paines paralelos."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Operacao interna protegida"
          workspaceHint="Painel restrito a sessao autenticada com perfil interno autorizado."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel", active: true },
        { href: "/internal/advogada/leads", label: "Leads" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" }
      ]}
      highlights={[
        { label: "Criticos agora", value: String(operationalSummary.criticalCount) },
        { label: "Fazer hoje", value: String(operationalSummary.todayCount) },
        { label: "Aguardando cliente", value: String(operationalSummary.waitingClientCount) },
        { label: "Aguardando equipe", value: String(operationalSummary.waitingTeamCount) }
      ]}
      actions={[
        { href: "#central-prioridades", label: "Fila do dia", tone: "secondary" },
        { href: "#gestao-casos", label: "Central de casos", tone: "secondary" },
        { href: "#cadastro-cliente", label: "Cadastrar cliente" },
        { href: "#noemia-operacional", label: "Usar Noemia", tone: "secondary" }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? <div className="success-notice">{success}</div> : null}

      <SectionCard
        title="Command center do imperio"
        description="Radar executivo do dia com hierarquia clara: o que pede acao agora, o que trava a operacao, onde existe resultado hoje e qual camada deve ser aberta em seguida."
      >
        <div className="notice">{cockpitProjection.focusHeadline}</div>

        <div className="operational-band">
          {cockpitProjection.radarCards.map((card) => (
            <article
              key={card.label}
              className={`operational-band-card ${
                card.tone === "critical"
                  ? "critical"
                  : card.tone === "warning"
                    ? "warning"
                    : card.tone === "success"
                      ? "success"
                      : "neutral"
              }`}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>

        <div className="summary-grid compact">
          {cockpitProjection.strategicCards.map((card) => (
            <article key={card.label} className="summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>

        <div className="grid two">
          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Prioridade imediata</span>
            {cockpitProjection.priorityDeck.length ? (
              <ul className="update-feed compact">
                {cockpitProjection.priorityDeck.map((item) => (
                  <li key={item.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{item.title}</strong>
                        <span className="item-meta">{item.meta}</span>
                      </div>
                      <span className={`pill ${item.tone === "critical" ? "critical" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "muted"}`}>
                        {item.tone === "critical"
                          ? "Agir agora"
                          : item.tone === "warning"
                            ? "Puxando fila"
                            : item.tone === "success"
                              ? "Pronto"
                              : "Monitorar"}
                      </span>
                    </div>
                    <p className="update-body">{item.detail}</p>
                    <div className="form-actions">
                      <Link className="button secondary" href={item.href}>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Nenhuma prioridade nova no momento. O cockpit continua atento para destacar o primeiro gargalo relevante.
              </p>
            )}
          </div>

          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Proximos passos com maior impacto</span>
            <div className="grid two">
              {commandQuickActions.map((item) => (
                <Link key={item.title} href={item.href} className="route-card">
                  <span className="shortcut-kicker">{item.kicker}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <span>{item.actionLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid two">
          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Dependencias e bloqueios</span>
            {cockpitProjection.dependencyDeck.length ? (
              <ul className="update-feed compact">
                {cockpitProjection.dependencyDeck.map((item) => (
                  <li key={item.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{item.title}</strong>
                        <span className="item-meta">{item.meta}</span>
                      </div>
                      <span className={`pill ${item.tone === "critical" ? "critical" : item.tone === "warning" ? "warning" : "muted"}`}>
                        {item.tone === "critical" ? "Bloqueio critico" : item.tone === "warning" ? "Depende de retorno" : "Em acompanhamento"}
                      </span>
                    </div>
                    <p className="update-body">{item.detail}</p>
                    <div className="form-actions">
                      <Link className="button secondary" href={item.href}>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Nenhuma dependencia dominante agora. A operacao segue mais limpa entre equipe, cliente e agenda.
              </p>
            )}
          </div>

          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Receita e continuidade</span>
            {cockpitProjection.revenueDeck.length ? (
              <ul className="update-feed compact">
                {cockpitProjection.revenueDeck.map((item) => (
                  <li key={item.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{item.title}</strong>
                        <span className="item-meta">{item.meta}</span>
                      </div>
                      <span className={`pill ${item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "muted"}`}>
                        {item.tone === "success" ? "Mover agora" : item.tone === "warning" ? "Preparar" : "Leitura"}
                      </span>
                    </div>
                    <p className="update-body">{item.detail}</p>
                    <div className="form-actions">
                      <Link className="button secondary" href={item.href}>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Nenhuma oportunidade adicional destacada agora. O painel segue focado no que realmente destrava resultado.
              </p>
            )}
          </div>
        </div>

        <div className="notice">
          {cockpitProjection.consistencyNote}
        </div>
      </SectionCard>

      <SectionCard
        id="camadas-command-center"
        title="Camadas centrais do command center"
        description="Agenda, entradas, receita e gargalos agora aparecem como camadas do mesmo cerebro executivo, em vez de modulos separados competindo por atencao."
      >
        <div className="summary-grid compact">
          <div className="summary-card">
            <span>Agenda real no centro</span>
            <strong>{upcomingAppointments.length}</strong>
            <p>Compromisso(s) futuro(s) conectando consulta, preparo e proximo passo operacional.</p>
            <span className="item-meta">A agenda deixa de ser detalhe e vira eixo do cockpit.</span>
          </div>
          <div className="summary-card">
            <span>Entradas e canais</span>
            <strong>{intelligence.summary.triageSubmitted}</strong>
            <p>Triagem(ns) enviada(s) no periodo entre site, social e canais de conversa.</p>
            <span className="item-meta">Entrada viva, nao analytics ornamental.</span>
          </div>
          <div className="summary-card">
            <span>Receita em formacao</span>
            <strong>{formatMoneyBRL(revenue.summary.revenueInFormation)}</strong>
            <p>{revenue.summary.pendingCount} pagamento(s) ainda em aberto antes da confirmacao.</p>
            <span className="item-meta">Consulta, aceite e pagamento agora entram na mesma leitura.</span>
          </div>
        </div>

        <div className="grid two">
          {commandCenterLayers.map((layer) => (
            <div key={layer.title} className="subtle-panel stack">
              <span className="shortcut-kicker">{layer.kicker}</span>
              <strong>{layer.title}</strong>
              <p className="update-body">{layer.summary}</p>
              <ul className="list">
                {layer.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="form-actions">
                <Link className="button secondary" href={layer.href}>
                  {layer.actionLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="grid three">
          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Agenda do dia e prontidao</span>
            {upcomingAppointments.length ? (
              <ul className="update-feed compact">
                {upcomingAppointments.slice(0, 4).map((appointment) => (
                  <li key={appointment.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{appointment.title}</strong>
                        <span className="item-meta">
                          {appointment.clientName} - {appointment.caseTitle}
                        </span>
                      </div>
                      <span className="pill success">{appointment.statusLabel}</span>
                    </div>
                    <p className="update-body">
                      {appointment.typeLabel} em {formatPortalDateTime(appointment.starts_at)}.
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Sem compromisso futuro puxando preparo imediato no momento.</p>
            )}
          </div>

          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Social, site e origem viva</span>
            {sourceRows.length ? (
              <ul className="update-feed compact">
                {sourceRows.map((item) => (
                  <li key={item.key} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{item.label}</strong>
                        <span className="item-meta">
                          {item.visits} visita(s) | {item.ctas} CTA(s)
                        </span>
                      </div>
                      <span className="pill warning">{item.triageSubmitted} triagem(ns)</span>
                    </div>
                    <p className="update-body">
                      {item.clientsCreated} cliente(s) criados com taxa triagem-&gt;cliente de {item.triageToClientRate}%.
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">As origens entram aqui assim que o periodo registrar aquisicao suficiente.</p>
            )}
          </div>

          <div className="subtle-panel stack">
            <span className="shortcut-kicker">Pagamento e recuperacao</span>
            {pendingRevenuePayments.length || failedRevenuePayments.length ? (
              <ul className="update-feed compact">
                {[...pendingRevenuePayments.slice(0, 2), ...failedRevenuePayments.slice(0, 2)].map((item) => (
                  <li key={item.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{item.offerLabel}</strong>
                        <span className="item-meta">{item.amountLabel}</span>
                      </div>
                      <span className={`pill ${item.status === "pending" ? "warning" : "critical"}`}>
                        {item.status === "pending" ? "Pagamento pendente" : "Recuperar"}
                      </span>
                    </div>
                    <p className="update-body">
                      {item.status === "pending"
                        ? `Caminho ${item.pathLabel} criado em ${new Date(item.createdAt).toLocaleString("pt-BR")}.`
                        : item.statusDetail || "Falha recente na camada de pagamento."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Nenhum pagamento aberto ou falhado puxando a fila agora.</p>
            )}
          </div>
        </div>

        <div className="notice">
          O command center agora responde no mesmo lugar onde esta o dinheiro, onde esta a agenda, onde entram as oportunidades e onde a operacao esta travando.
        </div>
      </SectionCard>

      <SectionCard
        title="Busca e filtros"
        description="Use estes filtros para encontrar clientes, casos e pendencias sem depender de leitura manual do painel inteiro."
      >
        <form className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="dashboard-q">Buscar cliente, caso ou item</label>
              <input
                id="dashboard-q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Nome do cliente, titulo do caso, documento ou compromisso"
              />
            </div>
            <div className="field">
              <label htmlFor="dashboard-case-status">Status do caso</label>
              <select id="dashboard-case-status" name="caseStatus" defaultValue={selectedCaseStatus}>
                <option value="">Todos os status</option>
                {caseStatuses.map((status) => (
                  <option key={status} value={status}>
                    {caseStatusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dashboard-sort">Ordenacao</label>
              <select id="dashboard-sort" name="sort" defaultValue={sort}>
                <option value="recent">Mais recentes primeiro</option>
                <option value="priority">Prioridade mais alta primeiro</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="dashboard-date-from">De</label>
              <input id="dashboard-date-from" name="dateFrom" type="date" defaultValue={dateFrom} />
            </div>
            <div className="field">
              <label htmlFor="dashboard-date-to">Ate</label>
              <input id="dashboard-date-to" name="dateTo" type="date" defaultValue={dateTo} />
            </div>
          </div>
          <label className="checkbox-row" htmlFor="dashboard-pending">
            <input
              id="dashboard-pending"
              name="pending"
              type="checkbox"
              value="1"
              defaultChecked={pendingOnly}
            />
            Mostrar apenas itens que exigem acompanhamento agora
          </label>
          <div className="form-actions">
            <button className="button secondary" type="submit">
              Aplicar filtros
            </button>
            <Link className="button secondary" href="/internal/advogada">
              Limpar filtros
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        id="central-prioridades"
        title="Gargalos, filas e prioridades"
        description="A rotina agora comeca pela fila certa: o que exige acao hoje, o que pede preparo nesta semana e o que ficou travado por cliente ou equipe."
      >
        <div className="operational-band">
          {operationalHighlights.map((item) => (
            <article key={item.label} className={`operational-band-card ${item.tone} interactive`}>
              <div className="operational-band-header">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <p>{item.note}</p>
              {item.tone === "critical" && (
                <div className="operational-band-actions">
                  <Link href="#central-prioridades" className="button small critical">
                    Ver itens críticos
                  </Link>
                </div>
              )}
              {item.tone === "warning" && operationalSummary.todayCount > 0 && (
                <div className="operational-band-actions">
                  <Link href="#central-prioridades" className="button small secondary">
                    Organizar fila do dia
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
        <div className="support-panel">
          <div className="support-row">
            <span className="support-label">Leitura rapida</span>
            <strong>{operationalHeadline}</strong>
          </div>
          <div className="support-row">
            <span className="support-label">Regua operacional</span>
            <strong>
              Novo = entrou nas ultimas 24h. Pendente = esta parado e pede retorno.
              Critico = ficou urgente, envelheceu ou venceu prazo.
            </strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Proximos focos do command center"
        description="Este bloco costura cliente, caso, triagem e inteligencia em uma leitura unica para a equipe comecar pelo ponto certo sem abrir paines paralelos."
      >
        {executiveFocus.length ? (
          <div className="grid two">
            {executiveFocus.map((item) => (
              <Link key={`${item.kicker}-${item.title}`} href={item.href} className="route-card">
                <span className="shortcut-kicker">{item.kicker}</span>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <p>{item.body}</p>
                <span>{item.actionLabel}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            Assim que houver cliente, caso, triagem ou sinal de inteligencia relevante, a direcao executiva aparece aqui com o melhor ponto de entrada.
          </p>
        )}
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title={`Fazer hoje (${operationalSummary.todayCount})`}
          description="Itens para atacar primeiro porque ja estao urgentes, venceram prazo ou travam outros passos."
        >
          <OperationalList
            items={todayQueue}
            emptyMessage="✅ Nenhum item crítico para hoje. A rotina está organizada! Use o tempo para cadastrar novos clientes ou revisar casos ativos."
          />
        </SectionCard>

        <SectionCard
          title={`Acompanhar esta semana (${operationalSummary.thisWeekCount})`}
          description="Compromissos e pendencias proximas que merecem preparo antes de virarem urgencia."
        >
          <OperationalList
            items={thisWeekQueue}
            emptyMessage="📅 Sem compromissos próximos. Ótimo momento para organizar a base e planejar novos casos!"
          />
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title={`Aguardando cliente (${operationalSummary.waitingClientCount})`}
          description="Aqui ficam convites, documentos e retornos que dependem do cliente para a fila voltar a andar."
        >
          <OperationalList
            items={awaitingClientQueue}
            emptyMessage="Nao ha itens relevantes aguardando retorno do cliente neste momento."
          />
        </SectionCard>

        <SectionCard
          title={`Aguardando equipe (${operationalSummary.waitingTeamCount})`}
          description="Fila interna para triagens, casos e pendencias que ainda precisam de um movimento da equipe."
        >
          <OperationalList
            items={awaitingTeamQueue}
            emptyMessage="A fila interna esta limpa agora. Novos movimentos da equipe aparecerao aqui."
          />
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Regua operacional inteligente"
          description="Os sinais abaixo ajudam a diferenciar item novo, pendente e critico sem varrer cada modulo manualmente."
        >
          <div className="summary-grid">
            {operationalSignals.map((item) => (
              <article key={item.label} className="summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Sugestoes orientadas pelo uso real"
          description="Telemetria, automacoes e comportamento do fluxo ajudam o painel a apontar o que tende a destravar mais rapido a rotina."
        >
          {suggestedMoves.length ? (
            <div className="notice-grid">
              {suggestedMoves.map((item) => (
                <Link key={item.title} href={item.href} className="notice-card">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <span>Abrir area relacionada</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Ainda nao houve mudanca suficiente de comportamento para sugerir nova acao. Quando o uso ou a operacao mudarem, os proximos movimentos aparecem aqui.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        id="noemia-operacional"
        title="Noemia aplicada ao trabalho"
        description="A assistente agora ajuda a resumir a fila, sugerir prioridade, recuperar contexto do caso e rascunhar retornos sem tirar voce do painel."
      >
        <div className="grid two">
          <div className="stack">
            <div className="support-panel">
              <div className="support-row">
                <span className="support-label">O que ela acelera</span>
                <strong>
                  Resume triagens, sinaliza o que esta envelhecendo e transforma contexto disperso em proximo passo acionavel.
                </strong>
              </div>
              <div className="support-row">
                <span className="support-label">Melhor uso</span>
                <strong>
                  Peca prioridade inicial, historico recente, proxima acao interna ou um texto-base curto para retorno ao cliente.
                </strong>
              </div>
              <div className="support-row">
                <span className="support-label">Limite</span>
                <strong>
                  Ela apoia a leitura operacional, mas a decisao juridica final e o criterio tecnico continuam com a equipe.
                </strong>
              </div>
            </div>

            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Prompts que aceleram</span>
              <ul className="timeline">
                {noemiaPrompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
              <div className="form-actions">
                <Link className="button secondary" href="/noemia">
                  Abrir Noemia em tela dedicada
                </Link>
              </div>
            </div>
          </div>

          <NoemiaAssistant
            audience="staff"
            displayName={profile.full_name}
            suggestedPrompts={noemiaPrompts}
            currentPath="/internal/advogada"
          />
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title={`Concluido recentemente (${operationalSummary.recentlyCompletedCount})`}
          description="Fechamentos recentes aparecem aqui para dar contexto sem poluir as filas que ainda pedem acao."
        >
          <OperationalList
            items={recentlyCompletedQueue}
            emptyMessage="Quando triagens, compromissos e pendencias forem resolvidos, o fechamento recente aparece aqui."
          />
        </SectionCard>

        <SectionCard
          title="Acoes rapidas e comando operacional"
          description="Use estes atalhos quando souber exatamente o que precisa fazer. Cada card reduz cliques e leva voce direto para a acao principal."
        >
            <div className="shortcut-grid">
              <Link href="#cadastro-cliente" className="shortcut-card">
                <span className="shortcut-kicker">Atendimento</span>
                <strong>Cadastrar cliente</strong>
                <p>Abrir cadastro, gerar convite e iniciar o caso sem etapas manuais.</p>
              </Link>
              <Link
                href={
                  preferredCase
                    ? buildInternalCaseHref(preferredCase.id)
                    : buildInternalCasesHref(preferredClient?.id || null)
                }
                className="shortcut-card"
              >
                <span className="shortcut-kicker">Andamento</span>
                <strong>Registrar atualizacao</strong>
                <p>Adicionar novo andamento visivel ou interno com resumo consistente para o portal.</p>
              </Link>
              <Link href="#gestao-casos" className="shortcut-card">
                <span className="shortcut-kicker">Casos</span>
                <strong>Abrir ou editar caso</strong>
                <p>Organizar titulo, area, prioridade e resumo do caso sem sair do painel.</p>
              </Link>
              <Link href="#triagens-recebidas" className="shortcut-card">
                <span className="shortcut-kicker">Entradas</span>
                <strong>Revisar triagens e origem</strong>
                <p>Entrar direto na camada de entrada para decidir resposta, conversao e prioridade.</p>
              </Link>
              <Link href="/documentos#solicitar-documento" className="shortcut-card">
                <span className="shortcut-kicker">Documentos</span>
                <strong>Solicitar documento</strong>
                <p>Abrir uma pendencia documental com orientacoes e prazo para o cliente.</p>
              </Link>
            <Link href="/documentos#registrar-documento" className="shortcut-card">
              <span className="shortcut-kicker">Arquivos</span>
              <strong>Registrar documento</strong>
              <p>Enviar o arquivo real para o caso e definir se ele aparece no portal.</p>
            </Link>
              <Link href="/agenda#registrar-compromisso" className="shortcut-card">
                <span className="shortcut-kicker">Agenda</span>
                <strong>Criar compromisso</strong>
                <p>Marcar prazo, reuniao, retorno ou audiencia com data e visibilidade.</p>
              </Link>
              <Link href="#camadas-command-center" className="shortcut-card">
                <span className="shortcut-kicker">Receita</span>
                <strong>Abrir monetizacao e pagamentos</strong>
                <p>Ir direto para consulta, pagamento pendente, recuperacao e receita em formacao.</p>
              </Link>
              <Link href="/noemia" className="shortcut-card">
                <span className="shortcut-kicker">IA aplicada</span>
                <strong>Consultar Noemia</strong>
                <p>Usar a assistente em tela cheia para resumir o contexto e rascunhar retornos.</p>
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        id="triagens-recebidas"
        title="Triagens recebidas"
        description="Entradas novas ja chegam com contexto suficiente para a equipe decidir leitura inicial, retorno e conversao sem perder continuidade."
      >
        {filteredIntakeRequests.length ? (
          <div className="grid two">
            {filteredIntakeRequests.map((item) => (
              <div key={item.id} className="subtle-panel stack">
                <div className="update-head">
                  <div>
                    <strong>{item.full_name}</strong>
                    <span className="item-meta">
                      {[item.email, item.phone].filter(Boolean).join(" - ")}
                    </span>
                  </div>
                  <span className="tag soft">{item.statusLabel}</span>
                </div>
                <div className="pill-row">
                  <span className="pill warning">{item.areaLabel}</span>
                  <span className="pill muted">{item.urgencyLabel}</span>
                  <span className="pill muted">{item.preferredContactLabel}</span>
                </div>
                <p className="update-body">{item.case_summary}</p>
                <span className="item-meta">
                  {item.city ? `${item.city} - ` : ""}
                  {item.stageLabel} - recebida em {formatPortalDateTime(item.submitted_at)}
                </span>
                <div className="support-panel">
                  <div className="support-row">
                    <span className="support-label">Direcao recomendada</span>
                    <strong>{getIntakeNextStep(item.status, item.urgencyLabel)}</strong>
                    <span className="item-meta">
                      {item.internal_notes
                        ? `Ultima observacao interna: ${item.internal_notes}`
                        : "Ainda nao ha observacao interna registrada para esta triagem."}
                    </span>
                  </div>
                </div>
                <form action={updateIntakeRequestStatusAction} className="stack">
                  <input type="hidden" name="intakeRequestId" value={item.id} />
                  <div className="fields">
                    <div className="field">
                      <label htmlFor={`intake-status-${item.id}`}>Status da triagem</label>
                      <select
                        id={`intake-status-${item.id}`}
                        name="status"
                        defaultValue={item.status}
                      >
                        {intakeRequestStatuses.map((status) => (
                          <option key={status} value={status}>
                            {intakeRequestStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-full">
                      <label htmlFor={`intake-notes-${item.id}`}>Observacao interna</label>
                      <textarea
                        id={`intake-notes-${item.id}`}
                        name="internalNotes"
                        defaultValue={item.internal_notes || ""}
                        placeholder="Ex.: retorno previsto para amanha, pedido de documentos ou contato ja realizado."
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <FormSubmitButton pendingLabel="Atualizando triagem..." tone="secondary">
                      Salvar triagem
                    </FormSubmitButton>
                    <Link
                      className="button secondary"
                      href={`/internal/advogada?intakeRequestId=${item.id}#cadastro-cliente`}
                    >
                      Converter em cliente
                    </Link>
                  </div>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {hasFilters
              ? "Nenhuma triagem corresponde aos filtros atuais."
              : "As triagens enviadas pelo site aparecerao aqui para organizacao do retorno."}
          </p>
        )}
      </SectionCard>

      <div className="grid three">
        <SectionCard
          id="clientes-operacao"
          title="Clientes em operacao"
          description="O dashboard fica em modo resumo: abra a rota propria do cliente para contato, portal, agenda, documentos e pendencias."
        >
          {filteredClients.length ? (
            <div className="client-directory">
              {filteredClients.slice(0, 6).map((client) => (
                <div key={client.id} className="client-directory-card">
                  <div className="client-directory-head">
                    <div>
                      <strong>{client.fullName}</strong>
                      <span className="item-meta">{client.email}</span>
                    </div>
                    <span className="tag soft">{client.statusLabel}</span>
                  </div>
                  <div className="client-directory-meta">
                    <span className="operation-meta-pill">
                      {client.caseCount} caso(s)
                    </span>
                    <span className="operation-meta-pill">
                      {client.pendingDocumentRequestsCount} pendencia(s)
                    </span>
                    <span className="operation-meta-pill">
                      {client.upcomingAppointmentsCount} compromisso(s)
                    </span>
                  </div>
                  <div className="client-directory-footer">
                    <span className="item-meta">
                      Ultima atividade em {formatPortalDateTime(client.lastActivityAt)}
                    </span>
                    <div className="client-directory-actions">
                      <Link
                        className="button secondary"
                        href={buildInternalClientHref(client.id)}
                      >
                        Abrir ficha
                      </Link>
                      <Link
                        className="button secondary"
                        href={buildInternalAgendaHref(client.id, client.primaryCaseId)}
                      >
                        Agenda
                      </Link>
                      <Link
                        className="button secondary"
                        href={buildInternalDocumentsHref(client.id, client.primaryCaseId)}
                      >
                        Documentos
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              {hasFilters
                ? "Nenhum cliente corresponde aos filtros atuais."
                : "Os primeiros clientes cadastrados aparecerao aqui."}
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Casos em andamento"
          description="Leitura curta dos casos ativos, com atalhos para abrir a rota propria do caso e continuar o trabalho."
        >
          {activeCases.length ? (
            <ul className="update-feed compact">
              {activeCases.slice(0, 6).map((caseItem) => (
                <li key={caseItem.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{caseItem.title}</strong>
                      <span className="item-meta">
                        {caseItem.clientName} - {caseAreaLabels[caseItem.area as keyof typeof caseAreaLabels]}
                      </span>
                    </div>
                    <span className="tag soft">{caseItem.statusLabel}</span>
                  </div>
                  <div className="pill-row">
                    <span
                      className={`pill ${
                        caseItem.priority === "urgente"
                          ? "critical"
                          : caseItem.priority === "alta"
                            ? "warning"
                            : "muted"
                      }`}
                    >
                      {caseItem.priorityLabel}
                    </span>
                    <span className="pill muted">{formatPortalDateTime(caseItem.updated_at)}</span>
                  </div>
                  <div className="form-actions">
                    <Link className="button secondary" href={buildInternalCaseHref(caseItem.id)}>
                      Abrir caso
                    </Link>
                    <Link className="button secondary" href={buildInternalClientHref(caseItem.clientId)}>
                      Cliente
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {hasFilters
                ? "Nenhum caso ativo corresponde aos filtros aplicados."
                : "Os casos ativos aparecem aqui conforme avancam."}
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Notificacoes pendentes"
          description="Fila pronta para envio automatico futuro."
        >
          {pendingNotifications.length ? (
            <ul className="list">
              {pendingNotifications.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <div className="item-head">
                    <strong>{item.template_key}</strong>
                    <span className="tag soft">{item.status}</span>
                  </div>
                  <span className="item-meta">{formatPortalDateTime(item.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {hasFilters
                ? "Nenhuma notificacao pendente corresponde aos filtros atuais."
                : "Nenhuma notificacao esta aguardando envio agora."}
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Proximos compromissos"
          description="Reunioes, prazos e retornos mais proximos do escritorio."
        >
          {upcomingAppointments.length ? (
            <ul className="update-feed">
              {upcomingAppointments.map((appointment) => (
                <li key={appointment.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{appointment.title}</strong>
                      <span className="item-meta">
                        {appointment.caseTitle} - {appointment.clientName}
                      </span>
                    </div>
                    <span className="tag soft">{appointment.typeLabel}</span>
                  </div>
                  <div className="pill-row">
                    <span className="pill success">{appointment.statusLabel}</span>
                    <span className="pill muted">{formatPortalDateTime(appointment.starts_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {hasFilters
                ? "Nenhum compromisso futuro corresponde aos filtros atuais."
                : "Os proximos compromissos aparecerao aqui."}
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Documentos pendentes ou solicitados"
          description="Tudo o que ainda depende de envio, revisao ou retorno do cliente."
        >
          {pendingDocuments.length || pendingRequests.length ? (
            <ul className="update-feed">
              {pendingDocuments.slice(0, 3).map((document) => (
                <li key={document.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{document.file_name}</strong>
                      <span className="item-meta">{document.caseTitle}</span>
                    </div>
                    <span className="tag soft">{document.category}</span>
                  </div>
                  <div className="pill-row">
                    <span className="pill warning">{document.statusLabel}</span>
                    <span className="pill muted">
                      {document.visibility === "client" ? "Cliente acompanha" : "Uso interno"}
                    </span>
                  </div>
                </li>
              ))}
              {pendingRequests.slice(0, 3).map((request) => (
                <li key={request.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{request.title}</strong>
                      <span className="item-meta">{request.caseTitle}</span>
                    </div>
                    <span className="tag soft">{request.statusLabel}</span>
                  </div>
                  <div className="pill-row">
                    <span className="pill warning">Solicitado</span>
                    <span className="pill muted">
                      {request.due_at
                        ? `Prazo ${formatPortalDateTime(request.due_at)}`
                        : "Sem prazo definido"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {hasFilters
                ? "Nenhuma pendencia documental corresponde aos filtros atuais."
                : "Nenhuma pendencia documental aberta no momento."}
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Ultimas atualizacoes"
        description="Linha do tempo recente da operacao, com leitura curta para entender o que mudou e qual caso merece reentrada."
      >
        {latestEvents.length ? (
          <ul className="update-feed">
            {latestEvents.map((event) => (
              <li key={event.id} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{event.title}</strong>
                    <span className="item-meta">{event.caseTitle}</span>
                  </div>
                  <span className="tag soft">{event.eventLabel}</span>
                </div>
                <div className="pill-row">
                  <span className={`pill ${event.visible_to_client ? "success" : "muted"}`}>
                    {event.visible_to_client ? "Visivel ao cliente" : "Uso interno"}
                  </span>
                  <span className={`pill ${event.should_notify_client ? "warning" : "muted"}`}>
                    {event.should_notify_client ? "Notificacao preparada" : "Sem notificacao"}
                  </span>
                </div>
                <p className="update-body">
                  {event.visible_to_client
                    ? "Este movimento ja ajuda a alinhar o portal com a leitura interna do caso."
                    : "Atualizacao interna pronta para orientar o proximo movimento da equipe."}
                </p>
                <span className="item-meta">{formatPortalDateTime(event.occurred_at)}</span>
                <div className="form-actions">
                  <Link className="button secondary" href={buildInternalCaseHref(event.case_id)}>
                    Abrir caso
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            {hasFilters
              ? "Nenhuma atualizacao recente corresponde aos filtros aplicados."
              : "As proximas movimentacoes do caso passarao a aparecer aqui automaticamente."}
          </p>
        )}
      </SectionCard>

      <SectionCard
        id="gestao-casos"
        title="Central de casos"
        description="O dashboard agora so aponta o caminho. Abertura, edicao, status e andamento do caso vivem em rotas proprias mais claras e utilizaveis."
      >
        <div className="grid three">
          <Link className="route-card" href={buildInternalCasesHref(preferredClient?.id || null)}>
            <span className="shortcut-kicker">Visao</span>
            <strong>Abrir central de casos</strong>
            <span>
              Entre na lista de casos para filtrar, priorizar e abrir o acompanhamento certo sem poluir o painel principal.
            </span>
          </Link>
          <Link className="route-card" href={buildInternalNewCaseHref(preferredClient?.id || null)}>
            <span className="shortcut-kicker">Criacao</span>
            <strong>Abrir novo caso</strong>
            <span>
              Use a rota de criacao focada para iniciar um acompanhamento com menos atrito e melhor leitura no mobile.
            </span>
          </Link>
          <Link
            className="route-card"
            href={
              preferredCase
                ? buildInternalCaseHref(preferredCase.id)
                : buildInternalCasesHref(preferredClient?.id || null)
            }
          >
            <span className="shortcut-kicker">Execucao</span>
            <strong>{preferredCase ? "Continuar caso em foco" : "Ver casos ativos"}</strong>
            <span>
              {preferredCase
                ? `${preferredCase.title} pode seguir com edicao, status e andamento na pagina propria.`
                : "Assim que houver um caso ativo, ele aparecera aqui como proximo atalho de execucao."}
            </span>
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Casos em foco agora"
        description="Leitura executiva dos casos que mais pedem conducao, com atalho direto para a ficha certa e continuidade entre agenda, documentos e cliente."
      >
        {filteredCases.length ? (
          <ul className="update-feed">
            {filteredCases.slice(0, 6).map((caseItem) => (
              <li key={caseItem.id} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{caseItem.title}</strong>
                    <span className="item-meta">
                      {caseItem.clientName} - {caseAreaLabels[caseItem.area as keyof typeof caseAreaLabels]}
                    </span>
                  </div>
                  <span className="tag soft">{caseItem.statusLabel}</span>
                </div>
                <div className="pill-row">
                  <span
                    className={`pill ${
                      caseItem.priority === "urgente"
                        ? "critical"
                        : caseItem.priority === "alta"
                          ? "warning"
                          : "muted"
                    }`}
                  >
                    {caseItem.priorityLabel}
                  </span>
                  <span className="pill muted">{formatPortalDateTime(caseItem.updated_at)}</span>
                </div>
                <p className="update-body">
                  {caseItem.summary ||
                    "Abra a ficha do caso para registrar um resumo executivo, alinhar status e manter a narrativa do atendimento mais clara."}
                </p>
                <div className="form-actions">
                  <Link className="button secondary" href={buildInternalCaseHref(caseItem.id)}>
                    Abrir caso
                  </Link>
                  <Link className="button secondary" href={buildInternalClientHref(caseItem.clientId)}>
                    Cliente
                  </Link>
                  <Link
                    className="button secondary"
                    href={buildInternalAgendaHref(caseItem.clientId, caseItem.id)}
                  >
                    Agenda
                  </Link>
                  <Link
                    className="button secondary"
                    href={buildInternalDocumentsHref(caseItem.clientId, caseItem.id)}
                  >
                    Documentos
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            {hasFilters
              ? "Nenhum caso em foco corresponde aos filtros atuais."
              : "Os casos em operacao aparecerao aqui com atalhos rapidos para a nova central."}
          </p>
        )}
      </SectionCard>

      <div className="grid two">
        <SectionCard
          id="cadastro-cliente"
          title="Cadastrar cliente"
          description="Fluxo mais usado do dia a dia: abrir cadastro, iniciar caso e preparar o convite."
        >
          <form action={createClientAction} className="stack">
            <input
              type="hidden"
              name="intakeRequestId"
              value={selectedIntakeRequest?.id || ""}
            />
            <div className="fields">
              <div className="field-full">
                <label htmlFor="fullName">Nome completo</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  defaultValue={selectedIntakeRequest?.full_name || ""}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={selectedIntakeRequest?.email || ""}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cpf">CPF</label>
                <input id="cpf" name="cpf" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="phone">Telefone</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={selectedIntakeRequest?.phone || ""}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="caseArea">Area do caso</label>
                <select
                  id="caseArea"
                  name="caseArea"
                  required
                  defaultValue={selectedIntakeRequest?.case_area || "previdenciario"}
                >
                  {caseAreas.map((area) => (
                    <option key={area} value={area}>
                      {caseAreaLabels[area]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">Status inicial</label>
                <select id="status" name="status" required defaultValue="convite-enviado">
                  {clientStatuses.map((status) => (
                    <option key={status} value={status}>
                      {clientStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="notes">Observacoes internas</label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={selectedIntakeRequest?.case_summary || ""}
                />
              </div>
            </div>
            <div className="notice">
              {selectedIntakeRequest
                ? `Esta ficha ja veio conectada com a triagem de ${selectedIntakeRequest.full_name}. Ao concluir o cadastro, a conversao fica refletida no funil e a triagem e marcada como convertida.`
                : "O mesmo envio ja cuida do cliente, do caso inicial e do convite de acesso."}
            </div>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Cadastrando cliente...">
                Cadastrar cliente e enviar convite
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Atalhos operacionais"
          description="As acoes detalhadas de caso sairam do dashboard. Aqui ficam apenas os caminhos rapidos para continuar a operacao."
        >
          <div className="grid two">
            <Link className="shortcut-card" href={buildInternalCasesHref(preferredClient?.id || null)}>
              <span className="shortcut-kicker">Casos</span>
              <strong>Ir para a central de casos</strong>
              <p>Filtrar, abrir, revisar e continuar acompanhamentos em uma estrutura propria.</p>
            </Link>
            <Link className="shortcut-card" href={buildInternalNewCaseHref(preferredClient?.id || null)}>
              <span className="shortcut-kicker">Novo</span>
              <strong>Abrir novo caso</strong>
              <p>Comecar um acompanhamento em fluxo dedicado, sem campos demais no dashboard.</p>
            </Link>
            <Link
              className="shortcut-card"
              href={
                preferredCase
                  ? buildInternalCaseHref(preferredCase.id)
                  : buildInternalCasesHref(preferredClient?.id || null)
              }
            >
              <span className="shortcut-kicker">Caso</span>
              <strong>{preferredCase ? "Abrir caso priorizado" : "Revisar casos"}</strong>
              <p>
                {preferredCase
                  ? `${preferredCase.title} ja esta pronto para status, andamento e leitura detalhada.`
                  : "Abra a central de casos para encontrar o acompanhamento certo."}
              </p>
            </Link>
            <Link
              className="shortcut-card"
              href={
                preferredClient
                  ? buildInternalClientHref(preferredClient.id)
                  : "/internal/advogada#clientes-operacao"
              }
            >
              <span className="shortcut-kicker">Cliente</span>
              <strong>{preferredClient ? "Abrir cliente em foco" : "Ver clientes em operacao"}</strong>
              <p>
                {preferredClient
                  ? "A ficha do cliente segue como hub para cruzar casos, agenda, documentos e notas."
                  : "Use o bloco de clientes para abrir a ficha certa e seguir o atendimento."}
              </p>
            </Link>
          </div>
          <div className="notice">
            Status, edicao e andamento do caso agora vivem nas rotas internas de casos para reduzir ruído visual e melhorar a operacao no mobile.
          </div>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
