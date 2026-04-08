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
import { updateIntakeRequestStatus } from "@/lib/services/public-intake";

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

  return (
    <AppFrame
      eyebrow="Painel da advogada"
      title={`Central operacional premium para ${profile.full_name}.`}
      description="O painel agora comeca pela prioridade real: organiza o trabalho em filas uteis, destaca o que envelheceu e usa inteligencia do produto para apoiar decisao, retorno e acompanhamento."
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
        title="Central de prioridades"
        description="A rotina agora comeca pela fila certa: o que exige acao hoje, o que pede preparo nesta semana e o que ficou esperando cliente ou equipe."
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
          title="Acoes rapidas"
          description="Use estes atalhos quando souber exatamente o que precisa fazer. Cada card leva voce direto para a acao principal."
        >
          <div className="shortcut-grid">
            <Link href="#cadastro-cliente" className="shortcut-card">
              <span className="shortcut-kicker">Atendimento</span>
              <strong>Cadastrar cliente</strong>
              <p>Abrir cadastro, gerar convite e iniciar o caso sem etapas manuais.</p>
            </Link>
            <Link href="#atualizacoes-caso" className="shortcut-card">
              <span className="shortcut-kicker">Andamento</span>
              <strong>Registrar atualizacao</strong>
              <p>Adicionar novo andamento visivel ou interno com resumo para o portal.</p>
            </Link>
            <Link href="#gestao-casos" className="shortcut-card">
              <span className="shortcut-kicker">Casos</span>
              <strong>Abrir ou editar caso</strong>
              <p>Organizar titulo, area, prioridade e resumo do caso sem sair do painel.</p>
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
            <Link href="#status-caso" className="shortcut-card">
              <span className="shortcut-kicker">Fluxo</span>
              <strong>Alterar status do caso</strong>
              <p>Atualizar a fase do caso e refletir isso com clareza para a equipe e o cliente.</p>
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
        description="Entradas do site institucional que ja chegaram organizadas para analise inicial e retorno da equipe."
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
        description="Linha do tempo recente das movimentacoes registradas para os casos."
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
        description="O painel so mostra leitura curta e atalhos. O trabalho detalhado continua dentro da central de casos."
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
