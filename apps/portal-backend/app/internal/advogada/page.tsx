import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  caseAreas,
  casePriorities,
  casePriorityLabels,
  caseStatusLabels,
  caseStatuses,
  clientStatusLabels,
  clientStatuses,
  formatPortalDateTime,
  intakeRequestStatusLabels,
  intakeRequestStatuses,
  portalEventTypeLabels,
  portalEventTypes
} from "@/lib/domain/portal";
import {
  createCaseForClient,
  updateCaseDetails,
  updateCaseStatus
} from "@/lib/services/manage-cases";
import { createClientWithInvite } from "@/lib/services/create-client";
import { getStaffOverview } from "@/lib/services/dashboard";
import { updateIntakeRequestStatus } from "@/lib/services/public-intake";
import { registerPortalEvent } from "@/lib/services/register-event";

function buildDefaultDateTimeValue() {
  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

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

async function updateCaseStatusAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await updateCaseStatus(
      {
        caseId: formData.get("caseId"),
        status: formData.get("status"),
        internalNote: formData.get("internalNote"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-atualizar-status";
    redirect(`/internal/advogada?error=${message}`);
  }

  redirect("/internal/advogada?success=status-atualizado");
}

async function createCaseAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await createCaseForClient(
      {
        clientId: formData.get("clientId"),
        area: formData.get("area"),
        title: formData.get("title"),
        summary: formData.get("summary"),
        priority: formData.get("priority"),
        status: formData.get("status"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-abrir-caso";
    redirect(`/internal/advogada?error=${message}`);
  }

  redirect("/internal/advogada?success=caso-criado");
}

async function updateCaseDetailsAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await updateCaseDetails(
      {
        caseId: formData.get("caseId"),
        area: formData.get("area"),
        title: formData.get("title"),
        summary: formData.get("summary"),
        priority: formData.get("priority"),
        changeSummary: formData.get("changeSummary"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-editar-caso";
    redirect(`/internal/advogada?error=${message}`);
  }

  redirect("/internal/advogada?success=caso-editado");
}

async function registerEventAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await registerPortalEvent(
      {
        caseId: formData.get("caseId"),
        eventType: formData.get("eventType"),
        title: formData.get("title"),
        description: formData.get("description"),
        publicSummary: formData.get("publicSummary"),
        occurredAt: formData.get("occurredAt"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on",
        payload: {
          source: "painel-advogada"
        }
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-registrar";
    redirect(`/internal/advogada?error=${message}`);
  }

  redirect("/internal/advogada?success=atualizacao-registrada");
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
  const hasCases = overview.caseOptions.length > 0;
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
  const activeCasesCount = filteredCases.filter((caseItem) => caseItem.status !== "concluido").length;
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
  const urgentFocus = [
    filteredIntakeRequests[0]
      ? `Nova triagem: ${filteredIntakeRequests[0].full_name}`
      : null,
    pendingRequests[0]
      ? `Solicitacao em aberto: ${pendingRequests[0].title}`
      : null,
    upcomingAppointments[0]
      ? `Proximo compromisso: ${upcomingAppointments[0].title}`
      : null,
    pendingNotifications[0]
      ? `${pendingNotifications.length} notificacoes aguardando envio`
      : null
  ].filter(Boolean) as string[];

  return (
    <AppFrame
      eyebrow="Painel da advogada"
      title={`Visao operacional clara para ${profile.full_name}.`}
      description="O painel agora separa o que exige atencao imediata das acoes do dia, para voce localizar clientes, casos, pendencias e proximos passos sem ficar navegando em excesso."
      navigation={[
        { href: "/internal/advogada", label: "Painel", active: true },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" }
      ]}
      highlights={[
        { label: "Triagens novas", value: String(overview.pendingIntakeRequestsCount) },
        { label: "Casos ativos", value: String(activeCasesCount) },
        { label: "Compromissos proximos", value: String(upcomingAppointments.length) },
        { label: "Notificacoes pendentes", value: String(overview.pendingNotifications) }
      ]}
      actions={[
        { href: "#triagens-recebidas", label: "Revisar triagens", tone: "secondary" },
        { href: "#cadastro-cliente", label: "Cadastrar cliente" },
        { href: "/internal/advogada/inteligencia", label: "Ver inteligencia", tone: "secondary" },
        { href: "#gestao-casos", label: "Abrir caso", tone: "secondary" },
        { href: "#atualizacoes-caso", label: "Registrar atualizacao", tone: "secondary" },
        { href: "#status-caso", label: "Alterar status do caso", tone: "secondary" }
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
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="O que merece atencao hoje"
          description="Resumo rapido do que esta mais perto de vencer, acontecer ou travar o fluxo."
        >
          {urgentFocus.length ? (
            <ul className="priority-list">
              {urgentFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              O painel volta a destacar aqui o que ficar mais urgente ao longo do uso.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Navegacao do trabalho"
          description="Se quiser sair do painel, estes caminhos levam direto para as areas tematicas do portal."
        >
          <div className="route-grid">
            <Link href="/documentos" className="route-card">
              <strong>Central de documentos</strong>
              <span>Upload, solicitacoes e consulta do que esta pendente.</span>
            </Link>
            <Link href="/agenda" className="route-card">
              <strong>Central de agenda</strong>
              <span>Compromissos, reagendamentos, cancelamentos e historico.</span>
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
                      {item.email} - {item.phone}
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
          title="Clientes recentes"
          description="Ultimos cadastros criados pela equipe."
        >
          {filteredClients.length ? (
            <ul className="list">
              {filteredClients.slice(0, 6).map((client) => (
                <li key={client.id}>
                  <div className="item-head">
                    <strong>{client.fullName}</strong>
                    <span className="tag soft">{client.statusLabel}</span>
                  </div>
                  <span className="item-meta">
                    {client.email} - {formatPortalDateTime(client.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
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
          description="Casos ativos que seguem em acompanhamento."
        >
          {activeCases.length ? (
            <ul className="update-feed compact">
              {activeCases.slice(0, 6).map((caseItem) => (
                <li key={caseItem.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{caseItem.title}</strong>
                      <span className="item-meta">{caseItem.clientName}</span>
                    </div>
                    <span className="tag soft">{caseItem.statusLabel}</span>
                  </div>
                  <span className="item-meta">{formatPortalDateTime(caseItem.created_at)}</span>
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

      <div className="grid two">
        <SectionCard
          id="gestao-casos"
          title="Abrir novo caso"
          description="Use este fluxo quando um cliente ja cadastrado precisar de um novo acompanhamento dentro do portal."
        >
          <form action={createCaseAction} className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="clientId">Cliente</label>
                <select id="clientId" name="clientId" required disabled={!hasClients}>
                  {hasClients ? (
                    overview.clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName} - {client.statusLabel}
                      </option>
                    ))
                  ) : (
                    <option value="">Cadastre um cliente antes de abrir um caso</option>
                  )}
                </select>
              </div>
              <div className="field">
                <label htmlFor="newCaseArea">Area do caso</label>
                <select id="newCaseArea" name="area" required defaultValue="previdenciario">
                  {caseAreas.map((area) => (
                    <option key={area} value={area}>
                      {caseAreaLabels[area]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="newCasePriority">Prioridade</label>
                <select id="newCasePriority" name="priority" required defaultValue="normal">
                  {casePriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {casePriorityLabels[priority]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="newCaseTitle">Titulo do caso</label>
                <input id="newCaseTitle" name="title" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="newCaseStatus">Status inicial</label>
                <select id="newCaseStatus" name="status" required defaultValue="triagem">
                  {caseStatuses.map((status) => (
                    <option key={status} value={status}>
                      {caseStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="newCaseSummary">Resumo do caso</label>
                <textarea
                  id="newCaseSummary"
                  name="summary"
                  placeholder="Contexto inicial, objetivo do atendimento e proximo passo esperado."
                />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="newCaseVisibleToClient">
              <input id="newCaseVisibleToClient" name="visibleToClient" type="checkbox" defaultChecked />
              Mostrar este novo caso na area do cliente
            </label>
            <label className="checkbox-row" htmlFor="newCaseShouldNotifyClient">
              <input
                id="newCaseShouldNotifyClient"
                name="shouldNotifyClient"
                type="checkbox"
                defaultChecked
              />
              Preparar notificacao para a abertura do caso
            </label>
            <div className="notice">
              Abrir o caso por aqui deixa o acompanhamento pronto para status, documentos, agenda e historico.
            </div>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Abrindo caso..." disabled={!hasClients}>
                Abrir caso
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Editar casos recentes"
          description="Ajuste os dados principais dos casos mais recentes sem sair do painel. Mudancas de status continuam em um fluxo proprio para manter clareza."
        >
          {overview.latestCases.length ? (
            <div className="stack">
              {overview.latestCases.map((caseItem) => (
                <div key={caseItem.id} className="subtle-panel stack">
                  <div className="item-head">
                    <div>
                      <strong>{caseItem.title}</strong>
                      <span className="item-meta">{caseItem.clientName}</span>
                    </div>
                    <span className="tag soft">{caseItem.statusLabel}</span>
                  </div>
                  <form action={updateCaseDetailsAction} className="stack">
                    <input type="hidden" name="caseId" value={caseItem.id} />
                    <div className="fields">
                      <div className="field-full">
                        <label htmlFor={`case-title-${caseItem.id}`}>Titulo do caso</label>
                        <input
                          id={`case-title-${caseItem.id}`}
                          name="title"
                          type="text"
                          defaultValue={caseItem.title}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`case-area-${caseItem.id}`}>Area</label>
                        <select
                          id={`case-area-${caseItem.id}`}
                          name="area"
                          defaultValue={caseItem.area}
                          required
                        >
                          {caseAreas.map((area) => (
                            <option key={area} value={area}>
                              {caseAreaLabels[area]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`case-priority-${caseItem.id}`}>Prioridade</label>
                        <select
                          id={`case-priority-${caseItem.id}`}
                          name="priority"
                          defaultValue={caseItem.priority || "normal"}
                          required
                        >
                          {casePriorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {casePriorityLabels[priority]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-full">
                        <label htmlFor={`case-summary-${caseItem.id}`}>Resumo</label>
                        <textarea
                          id={`case-summary-${caseItem.id}`}
                          name="summary"
                          defaultValue={caseItem.summary || ""}
                        />
                      </div>
                      <div className="field-full">
                        <label htmlFor={`case-change-${caseItem.id}`}>Mensagem da alteracao</label>
                        <textarea
                          id={`case-change-${caseItem.id}`}
                          name="changeSummary"
                          placeholder="Explique a mudanca se ela tambem precisar aparecer para o cliente."
                        />
                      </div>
                    </div>
                    <label className="checkbox-row" htmlFor={`case-visible-${caseItem.id}`}>
                      <input
                        id={`case-visible-${caseItem.id}`}
                        name="visibleToClient"
                        type="checkbox"
                      />
                      Refletir esta edicao na area do cliente
                    </label>
                    <label className="checkbox-row" htmlFor={`case-notify-${caseItem.id}`}>
                      <input
                        id={`case-notify-${caseItem.id}`}
                        name="shouldNotifyClient"
                        type="checkbox"
                      />
                      Preparar notificacao para esta edicao
                    </label>
                    <div className="form-actions">
                      <FormSubmitButton pendingLabel="Salvando caso...">
                        Salvar dados do caso
                      </FormSubmitButton>
                      <Link className="button secondary" href="#status-caso">
                        Alterar status
                      </Link>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Nenhum caso recente para editar no momento. Assim que houver um caso aberto, ele aparecera aqui.
            </p>
          )}
        </SectionCard>
      </div>

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
          id="status-caso"
          title="Alterar status do caso"
          description="Atualize a fase do caso de forma direta, sem depender de ajuste tecnico."
        >
          <form action={updateCaseStatusAction} className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="statusCaseId">Caso</label>
                <select id="statusCaseId" name="caseId" required disabled={!hasCases}>
                  {hasCases ? (
                    overview.caseOptions.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.title} - {caseItem.clientName} - {caseItem.statusLabel}
                      </option>
                    ))
                  ) : (
                    <option value="">Cadastre um cliente para abrir o primeiro caso</option>
                  )}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="caseStatus">Novo status</label>
                <select id="caseStatus" name="status" required defaultValue="em-andamento">
                  {caseStatuses.map((status) => (
                    <option key={status} value={status}>
                      {caseStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="internalNote">Observacao da mudanca</label>
                <textarea
                  id="internalNote"
                  name="internalNote"
                  placeholder="Explique o motivo da mudanca ou o proximo passo."
                />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="statusVisibleToClient">
              <input
                id="statusVisibleToClient"
                name="visibleToClient"
                type="checkbox"
                defaultChecked
              />
              Mostrar esta mudanca para o cliente
            </label>
            <label className="checkbox-row" htmlFor="statusShouldNotifyClient">
              <input
                id="statusShouldNotifyClient"
                name="shouldNotifyClient"
                type="checkbox"
                defaultChecked
              />
              Preparar notificacao futura para esta mudanca
            </label>
            <div className="form-actions">
              <FormSubmitButton
                pendingLabel="Atualizando status..."
                tone="secondary"
                disabled={!hasCases}
              >
                Atualizar status do caso
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        id="atualizacoes-caso"
        title="Registrar atualizacao do caso"
        description="Quando precisar detalhar o andamento, registre aqui com titulo, descricao e resumo visivel."
      >
        <form action={registerEventAction} className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="caseId">Caso</label>
              <select id="caseId" name="caseId" required disabled={!hasCases}>
                {hasCases ? (
                  overview.caseOptions.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.title} - {caseItem.clientName} - {caseItem.statusLabel}
                    </option>
                  ))
                ) : (
                  <option value="">Cadastre um cliente para abrir o primeiro caso</option>
                )}
              </select>
            </div>
            <div className="field">
              <label htmlFor="eventType">Tipo de atualizacao</label>
              <select id="eventType" name="eventType" required defaultValue="case_update">
                {portalEventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {portalEventTypeLabels[eventType]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="occurredAt">Data da atualizacao</label>
              <input
                id="occurredAt"
                name="occurredAt"
                type="datetime-local"
                defaultValue={buildDefaultDateTimeValue()}
                required
              />
            </div>
            <div className="field-full">
              <label htmlFor="title">Titulo</label>
              <input id="title" name="title" type="text" required />
            </div>
            <div className="field-full">
              <label htmlFor="description">Descricao</label>
              <textarea id="description" name="description" required />
            </div>
            <div className="field-full">
              <label htmlFor="publicSummary">Mensagem visivel ao cliente</label>
              <textarea
                id="publicSummary"
                name="publicSummary"
                placeholder="Se ficar em branco, o portal aproveita a descricao."
              />
            </div>
          </div>
          <label className="checkbox-row" htmlFor="visibleToClient">
            <input id="visibleToClient" name="visibleToClient" type="checkbox" defaultChecked />
            Atualizacao visivel para o cliente
          </label>
          <label className="checkbox-row" htmlFor="shouldNotifyClient">
            <input
              id="shouldNotifyClient"
              name="shouldNotifyClient"
              type="checkbox"
              defaultChecked
            />
            Preparar item de notificacao para esta atualizacao
          </label>
          <div className="form-actions">
            <FormSubmitButton pendingLabel="Registrando atualizacao..." disabled={!hasCases}>
              Registrar atualizacao
            </FormSubmitButton>
          </div>
        </form>
      </SectionCard>
    </AppFrame>
  );
}
