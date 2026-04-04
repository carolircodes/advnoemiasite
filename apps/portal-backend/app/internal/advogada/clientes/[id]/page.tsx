import Link from "next/link";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  clientStatusLabels,
  clientStatuses,
  formatPortalDateTime
} from "@/lib/domain/portal";
import {
  buildInternalAgendaHref,
  buildInternalCaseHref,
  buildInternalCasesHref,
  buildInternalClientHref,
  buildInternalDocumentsHref,
  buildInternalNewCaseHref
} from "@/lib/navigation";
import { getStaffOverview } from "@/lib/services/dashboard";

import { updateInternalClientAction } from "../actions";

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value.trim() : fallback;
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "cliente-atualizado":
      return "Ficha do cliente atualizada com sucesso. Contato, status e acesso do portal ficaram sincronizados.";
    default:
      return "";
  }
}

function getPortalState(client: {
  isActive: boolean;
  invitedAt: string | null;
  firstLoginCompletedAt: string | null;
}) {
  if (!client.isActive) {
    return {
      label: "Acesso bloqueado",
      tone: "warning",
      detail: "O login do portal esta pausado ate nova liberacao interna."
    } as const;
  }

  if (client.firstLoginCompletedAt) {
    return {
      label: "Primeiro acesso concluido",
      tone: "success",
      detail: `Primeiro acesso finalizado em ${formatPortalDateTime(client.firstLoginCompletedAt)}.`
    } as const;
  }

  if (client.invitedAt) {
    return {
      label: "Convite pendente",
      tone: "muted",
      detail: `Convite enviado em ${formatPortalDateTime(client.invitedAt)} e ainda sem primeiro acesso.`
    } as const;
  }

  return {
    label: "Sem convite emitido",
    tone: "muted",
    detail: "Ainda nao houve disparo de acesso ao portal para este cliente."
  } as const;
}

function isUpcomingAppointment(appointment: { starts_at: string; status: string }, now: Date) {
  const startsAt = new Date(appointment.starts_at).getTime();

  if (Number.isNaN(startsAt)) {
    return false;
  }

  return (
    startsAt >= now.getTime() &&
    appointment.status !== "cancelled" &&
    appointment.status !== "completed"
  );
}

export default async function InternalClientPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const routeParams = await params;
  const overview = await getStaffOverview();
  const query = searchParams ? await searchParams : {};
  const rawError = getStringParam(query.error);
  const decodedError = rawError ? decodeURIComponent(rawError) : "";
  const error = getAccessMessage(decodedError) || decodedError;
  const success =
    typeof query.success === "string" ? getSuccessMessage(query.success) : "";
  const client = overview.clientOptions.find((item) => item.id === routeParams.id) || null;

  if (!client) {
    notFound();
  }

  const now = new Date();
  const portalState = getPortalState(client);
  const clientCases = overview.caseOptions
    .filter((caseItem) => caseItem.clientId === client.id)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const clientCaseIds = new Set(clientCases.map((caseItem) => caseItem.id));
  const clientDocuments = overview.latestDocuments
    .filter((document) => clientCaseIds.has(document.case_id))
    .sort((left, right) => right.document_date.localeCompare(left.document_date));
  const availableDocuments = clientDocuments.filter(
    (document) => document.status === "recebido" || document.status === "revisado"
  );
  const clientRequests = overview.latestDocumentRequests
    .filter((request) => clientCaseIds.has(request.case_id))
    .sort((left, right) =>
      (right.due_at || right.created_at).localeCompare(left.due_at || left.created_at)
    );
  const openRequests = clientRequests.filter((request) => request.status === "pending");
  const clientAppointments = overview.latestAppointments
    .filter((appointment) => appointment.client_id === client.id)
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  const upcomingAppointments = clientAppointments
    .filter((appointment) => isUpcomingAppointment(appointment, now))
    .slice(0, 6);
  const recentAppointmentHistory = clientAppointments
    .filter((appointment) => !isUpcomingAppointment(appointment, now))
    .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
    .slice(0, 4);
  const recentEvents = overview.latestEvents
    .filter((event) => clientCaseIds.has(event.case_id))
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 6);
  const clientOperationalItems = [
    ...overview.operationalCenter.queues.today,
    ...overview.operationalCenter.queues.thisWeek,
    ...overview.operationalCenter.queues.awaitingClient,
    ...overview.operationalCenter.queues.awaitingTeam
  ]
    .filter((item) => item.clientId === client.id)
    .slice(0, 8);
  const primaryCaseId = client.primaryCaseId || clientCases[0]?.id || null;
  const casesHref = buildInternalCasesHref(client.id);
  const newCaseHref = buildInternalNewCaseHref(client.id);
  const agendaHref = buildInternalAgendaHref(client.id, primaryCaseId);
  const documentsHref = buildInternalDocumentsHref(client.id, primaryCaseId);
  const dashboardHref = "/internal/advogada";
  const sourceTriageHref = client.sourceIntakeRequestId
    ? `/internal/advogada?intakeRequestId=${client.sourceIntakeRequestId}#triagens-recebidas`
    : null;

  return (
    <AppFrame
      eyebrow="Cliente interno"
      title={`Ficha operacional de ${client.fullName}.`}
      description="Esta pagina concentra o contexto real do atendimento com menos ruido: contato, acesso ao portal, casos, agenda, documentos, pendencias e notas internas no mesmo fluxo."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Operacao interna protegida"
          workspaceHint="Sessao interna ativa para acompanhar o cliente sem depender do dashboard completo."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: buildInternalClientHref(client.id), label: "Cliente", active: true },
        { href: casesHref, label: "Casos" },
        { href: agendaHref, label: "Agenda" },
        { href: documentsHref, label: "Documentos" }
      ]}
      highlights={[
        { label: "Casos ativos", value: String(client.activeCaseCount) },
        { label: "Pendencias abertas", value: String(openRequests.length) },
        { label: "Agenda futura", value: String(upcomingAppointments.length) },
        {
          label: "Portal",
          value: portalState.label
        }
      ]}
      actions={[
        { href: dashboardHref, label: "Voltar ao painel", tone: "secondary" },
        { href: casesHref, label: "Abrir casos", tone: "secondary" },
        { href: agendaHref, label: "Abrir agenda", tone: "secondary" },
        { href: documentsHref, label: "Abrir documentos", tone: "secondary" }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? <div className="success-notice">{success}</div> : null}

      <div className="grid two client-page-grid">
        <SectionCard
          id="dados"
          title="Identificacao e contato"
          description="Os dados principais do atendimento ficam organizados aqui, com leitura rapida e contexto suficiente para agir."
        >
          <div className="client-sheet-card">
            <div className="client-sheet-head">
              <div>
                <span className="shortcut-kicker">Cliente em foco</span>
                <h3>{client.fullName}</h3>
                <p className="client-sheet-copy">
                  {client.primaryCaseTitle
                    ? `${client.primaryCaseTitle} segue como caso principal desta ficha.`
                    : "Ainda nao existe um caso principal definido para este cliente."}
                </p>
              </div>
              <div className="pill-row">
                <span className="pill success">{client.statusLabel}</span>
                <span className={`pill ${portalState.tone}`}>{portalState.label}</span>
              </div>
            </div>

            <div className="summary-grid compact">
              <div className="summary-card">
                <span>Casos vinculados</span>
                <strong>{client.caseCount}</strong>
                <p>{client.activeCaseCount} ainda pedem acompanhamento ativo.</p>
              </div>
              <div className="summary-card">
                <span>Documentos do caso</span>
                <strong>{client.documentCount}</strong>
                <p>{client.pendingDocumentCount} seguem pendentes ou solicitados.</p>
              </div>
              <div className="summary-card">
                <span>Agenda ligada</span>
                <strong>{client.upcomingAppointmentsCount}</strong>
                <p>Compromissos futuros conectados ao atendimento.</p>
              </div>
              <div className="summary-card">
                <span>Ultima atividade</span>
                <strong>{formatPortalDateTime(client.lastActivityAt)}</strong>
                <p>A ficha acompanha o ritmo real da operacao.</p>
              </div>
            </div>

            <div className="support-panel">
              <div className="support-row">
                <span className="support-label">Contato principal</span>
                <strong>{client.email || "E-mail ainda nao informado"}</strong>
                <span className="item-meta">
                  {client.phone || "Telefone ainda nao informado"}
                  {client.cpf ? ` - CPF ${client.cpf}` : ""}
                </span>
              </div>
              <div className="support-row">
                <span className="support-label">Status do portal</span>
                <strong>{portalState.label}</strong>
                <span className="item-meta">{portalState.detail}</span>
              </div>
              <div className="support-row">
                <span className="support-label">Origem do cadastro</span>
                <strong>
                  {sourceTriageHref ? "Cliente convertido a partir de triagem" : "Cadastro interno direto"}
                </strong>
                <span className="item-meta">
                  {sourceTriageHref
                    ? "A triagem original continua acessivel no painel para revisao."
                    : "Sem triagem vinculada neste atendimento."}
                </span>
              </div>
            </div>

            <div className="client-ops-grid">
              <Link className="shortcut-card" href={casesHref}>
                <span className="shortcut-kicker">Casos</span>
                <strong>Abrir central de casos</strong>
                <p>Ver lista, detalhe e andamento dos casos deste cliente em rotas proprias.</p>
              </Link>
              <Link className="shortcut-card" href={dashboardHref}>
                <span className="shortcut-kicker">Painel</span>
                <strong>Voltar ao dashboard</strong>
                <p>Retornar para filas, indicadores e resumos sem perder esta referencia.</p>
              </Link>
              <Link className="shortcut-card" href={agendaHref}>
                <span className="shortcut-kicker">Agenda</span>
                <strong>Abrir compromissos</strong>
                <p>Ir direto para a agenda filtrada deste cliente e do caso principal.</p>
              </Link>
              <Link className="shortcut-card" href={documentsHref}>
                <span className="shortcut-kicker">Documentos</span>
                <strong>Abrir documentos</strong>
                <p>Chegar nas pendencias e nos arquivos ligados ao mesmo atendimento.</p>
              </Link>
            </div>

            {sourceTriageHref ? (
              <div className="form-actions">
                <Link className="button secondary" href={sourceTriageHref}>
                  Revisar triagem de origem
                </Link>
                <Link className="button secondary" href={newCaseHref}>
                  Abrir novo caso
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          id="portal"
          title="Portal e notas internas"
          description="Edite o cadastro com retorno claro e mantenha observacoes operacionais sem espalhar contexto em outras telas."
        >
          <div className="stack">
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Notas atuais</span>
              <strong>
                {client.notes ? "Existe contexto interno salvo para este cliente." : "Nenhuma nota interna registrada."}
              </strong>
              <p className="item-meta">
                {client.notes ||
                  "Use este campo para registrar combinados, preferencia de contato, observacoes operacionais e contexto sensivel de atendimento."}
              </p>
            </div>

            <form action={updateInternalClientAction} className="stack">
              <input type="hidden" name="clientId" value={client.id} />
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="client-edit-fullName">Nome completo</label>
                  <input
                    id="client-edit-fullName"
                    name="fullName"
                    type="text"
                    defaultValue={client.fullName}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-edit-email">E-mail</label>
                  <input
                    id="client-edit-email"
                    name="email"
                    type="email"
                    defaultValue={client.email}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-edit-phone">Telefone</label>
                  <input
                    id="client-edit-phone"
                    name="phone"
                    type="text"
                    defaultValue={client.phone}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-edit-cpf">CPF</label>
                  <input
                    id="client-edit-cpf"
                    name="cpf"
                    type="text"
                    defaultValue={client.cpf}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-edit-status">Status do cliente</label>
                  <select
                    id="client-edit-status"
                    name="status"
                    defaultValue={client.status}
                    required
                  >
                    {clientStatuses.map((status) => (
                      <option key={status} value={status}>
                        {clientStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="client-edit-notes">Notas internas</label>
                  <textarea
                    id="client-edit-notes"
                    name="notes"
                    defaultValue={client.notes}
                    placeholder="Contexto, combinados, preferencia de contato ou observacoes operacionais."
                  />
                </div>
              </div>
              <label className="checkbox-row" htmlFor="client-edit-isActive">
                <input
                  id="client-edit-isActive"
                  name="isActive"
                  type="checkbox"
                  defaultChecked={client.isActive}
                />
                Manter acesso do cliente ativo no portal
              </label>
              <div className="notice">
                Esta edicao sincroniza cadastro, perfil autenticado e status de acesso para evitar divergencia operacional.
              </div>
              <div className="form-actions">
                <FormSubmitButton pendingLabel="Salvando ficha do cliente...">
                  Salvar ficha do cliente
                </FormSubmitButton>
                <Link className="button secondary" href={agendaHref}>
                  Abrir agenda deste cliente
                </Link>
              </div>
            </form>
          </div>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          id="casos"
          title="Casos"
          description="Casos vinculados, status atual e atalhos para seguir a operacao sem voltar para listas amplas."
        >
          {clientCases.length ? (
            <ul className="update-feed">
              {clientCases.map((caseItem) => (
                <li key={caseItem.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{caseItem.title}</strong>
                      <span className="item-meta">
                        {caseAreaLabels[caseItem.area as keyof typeof caseAreaLabels]} - {caseItem.priorityLabel}
                      </span>
                    </div>
                    <span className="tag soft">{caseItem.statusLabel}</span>
                  </div>
                  <p className="update-body">
                    {caseItem.summary || "Resumo do caso ainda nao registrado no painel."}
                  </p>
                  <div className="pill-row">
                    <span className="pill muted">
                      Aberto em {formatPortalDateTime(caseItem.created_at)}
                    </span>
                    <span className="pill muted">
                      Atualizado em {formatPortalDateTime(caseItem.updated_at)}
                    </span>
                  </div>
                  <div className="form-actions">
                    <Link
                      className="button secondary"
                      href={buildInternalCaseHref(caseItem.id)}
                    >
                      Abrir caso
                    </Link>
                    <Link
                      className="button secondary"
                      href={buildInternalAgendaHref(client.id, caseItem.id)}
                    >
                      Agenda do caso
                    </Link>
                    <Link
                      className="button secondary"
                      href={buildInternalDocumentsHref(client.id, caseItem.id)}
                    >
                      Documentos do caso
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Nenhum caso foi vinculado a este cliente ainda. Use a central de casos para abrir o primeiro acompanhamento.
            </p>
          )}
          <div className="form-actions">
            <Link className="button secondary" href={casesHref}>
              Ver todos os casos
            </Link>
            <Link className="button secondary" href={newCaseHref}>
              Abrir novo caso
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          id="agenda"
          title="Agenda"
          description="Compromissos proximos e historico recente do cliente aparecem juntos para leitura rapida da rotina."
        >
          {upcomingAppointments.length || recentAppointmentHistory.length ? (
            <div className="stack">
              {upcomingAppointments.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Proximos compromissos</span>
                  <ul className="list">
                    {upcomingAppointments.map((appointment) => (
                      <li key={appointment.id}>
                        <div className="item-head">
                          <strong>{appointment.title}</strong>
                          <span className="tag soft">{appointment.statusLabel}</span>
                        </div>
                        <span className="item-meta">
                          {appointment.caseTitle} - {formatPortalDateTime(appointment.starts_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recentAppointmentHistory.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Historico recente</span>
                  <ul className="list">
                    {recentAppointmentHistory.map((appointment) => (
                      <li key={appointment.id}>
                        <div className="item-head">
                          <strong>{appointment.title}</strong>
                          <span className="tag soft">{appointment.statusLabel}</span>
                        </div>
                        <span className="item-meta">
                          {appointment.caseTitle} - {formatPortalDateTime(appointment.starts_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="form-actions">
                <Link className="button secondary" href={agendaHref}>
                  Abrir agenda filtrada
                </Link>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Ainda nao ha compromissos vinculados a este atendimento. A agenda filtrada continua disponivel para registrar o primeiro item.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          id="documentos"
          title="Documentos"
          description="Arquivos recentes e solicitacoes abertas ficam acessiveis sem espalhar a leitura por varias telas."
        >
          {clientDocuments.length || openRequests.length ? (
            <div className="stack">
              {clientDocuments.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Documentos recentes</span>
                  <ul className="list">
                    {clientDocuments.slice(0, 6).map((document) => (
                      <li key={document.id}>
                        <div className="item-head">
                          <strong>{document.file_name}</strong>
                          <span className="tag soft">{document.statusLabel}</span>
                        </div>
                        <span className="item-meta">
                          {document.caseTitle} - {formatPortalDateTime(document.document_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {openRequests.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Solicitacoes abertas</span>
                  <ul className="list">
                    {openRequests.slice(0, 6).map((request) => (
                      <li key={request.id}>
                        <div className="item-head">
                          <strong>{request.title}</strong>
                          <span className="tag soft">{request.statusLabel}</span>
                        </div>
                        <span className="item-meta">
                          {request.caseTitle} -{" "}
                          {request.due_at
                            ? `Prazo ${formatPortalDateTime(request.due_at)}`
                            : "Sem prazo definido"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="form-actions">
                <Link className="button secondary" href={documentsHref}>
                  Abrir documentos filtrados
                </Link>
                {availableDocuments.length ? (
                  <span className="item-meta">
                    {availableDocuments.length} documento(s) ja estao disponiveis para consulta.
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Ainda nao ha documentos ou solicitacoes ligados a este cliente. A central de documentos continua pronta para o primeiro registro.
            </p>
          )}
        </SectionCard>

        <SectionCard
          id="pendencias"
          title="Pendencias e sinais operacionais"
          description="Esta fila resume o que exige acao, espera ou acompanhamento neste atendimento sem depender do dashboard inteiro."
        >
          {clientOperationalItems.length || recentEvents.length ? (
            <div className="stack">
              {clientOperationalItems.length ? (
                <ul className="update-feed compact">
                  {clientOperationalItems.map((item) => (
                    <li key={item.id} className="update-card">
                      <div className="update-head">
                        <div>
                          <strong>{item.title}</strong>
                          <span className="item-meta">{item.kindLabel}</span>
                        </div>
                        <span className={`pill ${item.stateTone}`}>{item.stateLabel}</span>
                      </div>
                      <p className="update-body">{item.description}</p>
                      <div className="pill-row">
                        <span className="pill muted">{item.timingLabel}</span>
                        <span className="pill muted">{item.meta.join(" - ")}</span>
                      </div>
                      <div className="form-actions">
                        <Link className="button secondary" href={item.href}>
                          {item.actionLabel}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {recentEvents.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Historico recente</span>
                  <ul className="list">
                    {recentEvents.map((event) => (
                      <li key={event.id}>
                        <div className="item-head">
                          <strong>{event.title}</strong>
                          <span className="tag soft">{event.eventLabel}</span>
                        </div>
                        <span className="item-meta">
                          {event.caseTitle} - {formatPortalDateTime(event.occurred_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="empty-state">
              Nenhuma pendencia operacional aberta para este cliente agora. A ficha segue pronta para agenda, documentos e novos movimentos internos.
            </p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
