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
  caseAreas,
  casePriorities,
  casePriorityLabels,
  caseStatuses,
  caseStatusLabels,
  formatPortalDateTime,
  portalEventTypeLabels,
  portalEventTypes
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

import {
  registerInternalCaseEventAction,
  updateInternalCaseDetailsAction,
  updateInternalCaseStatusAction
} from "../actions";

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value.trim() : fallback;
}

function buildDefaultDateTimeValue() {
  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "caso-criado":
      return "Caso aberto com sucesso. Acompanhamento, cliente e trilha operacional ja ficaram alinhados.";
    case "caso-editado":
      return "Dados principais do caso atualizados com sucesso.";
    case "status-atualizado":
      return "Status do caso atualizado com sucesso.";
    case "atualizacao-registrada":
      return "Atualizacao do caso registrada com sucesso.";
    default:
      return "";
  }
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

export default async function InternalCasePage({
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
  const caseItem = overview.caseOptions.find((item) => item.id === routeParams.id) || null;

  if (!caseItem) {
    notFound();
  }

  const client =
    overview.clientOptions.find((item) => item.id === caseItem.clientId) || null;

  if (!client) {
    notFound();
  }

  const now = new Date();
  const caseDocuments = overview.latestDocuments
    .filter((document) => document.case_id === caseItem.id)
    .sort((left, right) => right.document_date.localeCompare(left.document_date));
  const caseRequests = overview.latestDocumentRequests
    .filter((request) => request.case_id === caseItem.id)
    .sort((left, right) =>
      (right.due_at || right.created_at).localeCompare(left.due_at || left.created_at)
    );
  const openRequests = caseRequests.filter((request) => request.status === "pending");
  const caseAppointments = overview.latestAppointments
    .filter((appointment) => appointment.case_id === caseItem.id)
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  const upcomingAppointments = caseAppointments
    .filter((appointment) => isUpcomingAppointment(appointment, now))
    .slice(0, 6);
  const recentAppointmentHistory = overview.latestAppointmentHistory
    .filter((item) => item.case_id === caseItem.id)
    .slice(0, 6);
  const caseEvents = overview.latestEvents
    .filter((event) => event.case_id === caseItem.id)
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 12);
  const operationalItems = [
    ...overview.operationalCenter.queues.today,
    ...overview.operationalCenter.queues.thisWeek,
    ...overview.operationalCenter.queues.awaitingClient,
    ...overview.operationalCenter.queues.awaitingTeam
  ]
    .filter((item) => item.caseId === caseItem.id)
    .slice(0, 8);
  const agendaHref = buildInternalAgendaHref(client.id, caseItem.id);
  const documentsHref = buildInternalDocumentsHref(client.id, caseItem.id);
  const clientHref = buildInternalClientHref(client.id);
  const casesHref = buildInternalCasesHref(client.id);
  const newCaseHref = buildInternalNewCaseHref(client.id);

  return (
    <AppFrame
      eyebrow="Caso interno"
      title={caseItem.title}
      description="Acompanhamento de caso em uma pagina propria: leitura, edicao, status, andamento e atalhos laterais sem depender do dashboard principal."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Caso interno protegido"
          workspaceHint="Sessao interna ativa para operar detalhes, status e andamento do caso."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: clientHref, label: "Cliente" },
        { href: casesHref, label: "Casos" },
        { href: buildInternalCaseHref(caseItem.id), label: "Caso", active: true }
      ]}
      highlights={[
        { label: "Status", value: caseItem.statusLabel },
        { label: "Prioridade", value: caseItem.priorityLabel },
        { label: "Pendencias", value: String(openRequests.length) },
        { label: "Agenda futura", value: String(upcomingAppointments.length) }
      ]}
      actions={[
        { href: casesHref, label: "Voltar aos casos", tone: "secondary" },
        { href: clientHref, label: "Abrir cliente", tone: "secondary" },
        { href: agendaHref, label: "Agenda do caso", tone: "secondary" },
        { href: documentsHref, label: "Documentos do caso", tone: "secondary" }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? <div className="success-notice">{success}</div> : null}

      <div className="grid two client-page-grid">
        <SectionCard
          id="visao-geral"
          title="Visao geral do caso"
          description="Leitura limpa do contexto, do cliente, da prioridade e do estado atual antes de qualquer acao."
        >
          <div className="client-sheet-card">
            <div className="client-sheet-head">
              <div>
                <span className="shortcut-kicker">Caso em foco</span>
                <h3>{caseItem.title}</h3>
                <p className="client-sheet-copy">
                  {caseItem.summary || "Resumo do caso ainda nao registrado. Use a edicao abaixo para deixar o contexto mais claro."}
                </p>
              </div>
              <div className="pill-row">
                <span className="pill success">{caseItem.statusLabel}</span>
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
              </div>
            </div>

            <div className="summary-grid compact">
              <div className="summary-card">
                <span>Cliente</span>
                <strong>{client.fullName}</strong>
                <p>{client.statusLabel}</p>
              </div>
              <div className="summary-card">
                <span>Area</span>
                <strong>{caseAreaLabels[caseItem.area as keyof typeof caseAreaLabels]}</strong>
                <p>Fluxo principal deste atendimento.</p>
              </div>
              <div className="summary-card">
                <span>Ultimo status</span>
                <strong>{formatPortalDateTime(caseItem.last_status_changed_at || caseItem.created_at)}</strong>
                <p>Mudanca mais recente do funil do caso.</p>
              </div>
              <div className="summary-card">
                <span>Ultima atualizacao</span>
                <strong>{formatPortalDateTime(caseItem.last_public_update_at || caseItem.updated_at)}</strong>
                <p>Referencia de andamento mais recente registrada.</p>
              </div>
            </div>

            <div className="support-panel">
              <div className="support-row">
                <span className="support-label">Cliente vinculado</span>
                <strong>{client.fullName}</strong>
                <span className="item-meta">{client.email} - {client.phone || "Telefone ainda nao informado"}</span>
              </div>
              <div className="support-row">
                <span className="support-label">Operacao ligada</span>
                <strong>{openRequests.length} pendencia(s) e {upcomingAppointments.length} compromisso(s)</strong>
                <span className="item-meta">
                  O caso continua conectado a documentos, agenda e historico do cliente.
                </span>
              </div>
              <div className="support-row">
                <span className="support-label">Proximo passo</span>
                <strong>
                  {operationalItems[0]?.title || "Nenhum alerta imediato na fila operacional"}
                </strong>
                <span className="item-meta">
                  {operationalItems[0]?.description ||
                    "Use os formularios abaixo para editar, mudar status ou registrar novo andamento."}
                </span>
              </div>
            </div>

            <div className="grid two">
              <Link className="route-card" href={clientHref}>
                <span className="shortcut-kicker">Cliente</span>
                <strong>Abrir ficha do cliente</strong>
                <span>Voltar para o hub do cliente sem perder o contexto do caso.</span>
              </Link>
              <Link className="route-card" href={newCaseHref}>
                <span className="shortcut-kicker">Criacao</span>
                <strong>Abrir outro caso</strong>
                <span>Use o mesmo cliente como base para um novo acompanhamento, quando fizer sentido.</span>
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Atalhos do fluxo"
          description="As rotas principais do caso ficam aqui para evitar voltas desnecessarias e manter a operacao intuitiva no desktop e no mobile."
        >
          <div className="grid two">
            <Link className="shortcut-card" href={agendaHref}>
              <span className="shortcut-kicker">Agenda</span>
              <strong>Abrir compromissos do caso</strong>
              <p>Ir direto para reunioes, prazos e reagendamentos vinculados a este acompanhamento.</p>
            </Link>
            <Link className="shortcut-card" href={documentsHref}>
              <span className="shortcut-kicker">Documentos</span>
              <strong>Abrir documentos do caso</strong>
              <p>Chegar nas pendencias documentais e nos arquivos ja registrados para este caso.</p>
            </Link>
            <Link className="shortcut-card" href="#editar">
              <span className="shortcut-kicker">Dados</span>
              <strong>Editar dados do caso</strong>
              <p>Ajustar titulo, area, prioridade e resumo sem sair desta pagina.</p>
            </Link>
            <Link className="shortcut-card" href="#andamento">
              <span className="shortcut-kicker">Andamento</span>
              <strong>Registrar nova atualizacao</strong>
              <p>Adicionar movimentacao interna ou visivel ao cliente com rastreabilidade clara.</p>
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          id="editar"
          title="Editar dados do caso"
          description="Mantenha o caso limpo e legivel. Esse formulario agora vive em um lugar proprio, sem competir com o resto do dashboard."
        >
          <form action={updateInternalCaseDetailsAction} className="stack">
            <input type="hidden" name="caseId" value={caseItem.id} />
            <div className="fields">
              <div className="field-full">
                <label htmlFor="case-title">Titulo do caso</label>
                <input
                  id="case-title"
                  name="title"
                  type="text"
                  defaultValue={caseItem.title}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="case-area">Area</label>
                <select id="case-area" name="area" defaultValue={caseItem.area} required>
                  {caseAreas.map((area) => (
                    <option key={area} value={area}>
                      {caseAreaLabels[area]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="case-priority">Prioridade</label>
                <select
                  id="case-priority"
                  name="priority"
                  defaultValue={caseItem.priority}
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
                <label htmlFor="case-summary">Resumo do caso</label>
                <textarea
                  id="case-summary"
                  name="summary"
                  defaultValue={caseItem.summary || ""}
                />
              </div>
              <div className="field-full">
                <label htmlFor="case-changeSummary">Mensagem da alteracao</label>
                <textarea
                  id="case-changeSummary"
                  name="changeSummary"
                  placeholder="Explique a mudanca se ela tambem precisar aparecer para o cliente."
                />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="case-visibleToClient">
              <input id="case-visibleToClient" name="visibleToClient" type="checkbox" />
              Refletir esta edicao na area do cliente
            </label>
            <label className="checkbox-row" htmlFor="case-shouldNotifyClient">
              <input id="case-shouldNotifyClient" name="shouldNotifyClient" type="checkbox" />
              Preparar notificacao para esta edicao
            </label>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Salvando caso...">
                Salvar dados do caso
              </FormSubmitButton>
              <Link className="button secondary" href="#status">
                Atualizar status
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          id="status"
          title="Status do caso"
          description="Status e nota de mudanca ficam concentrados aqui para a advogada agir rapido sem abrir formularios espalhados."
        >
          <form action={updateInternalCaseStatusAction} className="stack">
            <input type="hidden" name="caseId" value={caseItem.id} />
            <div className="fields">
              <div className="field-full">
                <label htmlFor="case-status">Novo status</label>
                <select id="case-status" name="status" defaultValue={caseItem.status} required>
                  {caseStatuses.map((status) => (
                    <option key={status} value={status}>
                      {caseStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="case-internalNote">Observacao da mudanca</label>
                <textarea
                  id="case-internalNote"
                  name="internalNote"
                  placeholder="Explique o motivo da mudanca ou o proximo passo esperado."
                />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="case-status-visible">
              <input id="case-status-visible" name="visibleToClient" type="checkbox" defaultChecked />
              Mostrar esta mudanca para o cliente
            </label>
            <label className="checkbox-row" htmlFor="case-status-notify">
              <input id="case-status-notify" name="shouldNotifyClient" type="checkbox" defaultChecked />
              Preparar notificacao futura para esta mudanca
            </label>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Atualizando status...">
                Atualizar status do caso
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          id="andamento"
          title="Registrar andamento"
          description="Sempre que o caso exigir contexto adicional, registre por aqui titulo, descricao e resumo visivel."
        >
          <form action={registerInternalCaseEventAction} className="stack">
            <input type="hidden" name="caseId" value={caseItem.id} />
            <div className="fields">
              <div className="field">
                <label htmlFor="case-eventType">Tipo de atualizacao</label>
                <select id="case-eventType" name="eventType" required defaultValue="case_update">
                  {portalEventTypes.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {portalEventTypeLabels[eventType]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="case-occurredAt">Data da atualizacao</label>
                <input
                  id="case-occurredAt"
                  name="occurredAt"
                  type="datetime-local"
                  defaultValue={buildDefaultDateTimeValue()}
                  required
                />
              </div>
              <div className="field-full">
                <label htmlFor="case-eventTitle">Titulo</label>
                <input id="case-eventTitle" name="title" type="text" required />
              </div>
              <div className="field-full">
                <label htmlFor="case-eventDescription">Descricao</label>
                <textarea id="case-eventDescription" name="description" required />
              </div>
              <div className="field-full">
                <label htmlFor="case-eventPublicSummary">Mensagem visivel ao cliente</label>
                <textarea
                  id="case-eventPublicSummary"
                  name="publicSummary"
                  placeholder="Se ficar em branco, a descricao sera usada quando a atualizacao for visivel."
                />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="case-event-visible">
              <input id="case-event-visible" name="visibleToClient" type="checkbox" defaultChecked />
              Atualizacao visivel ao cliente
            </label>
            <label className="checkbox-row" htmlFor="case-event-notify">
              <input id="case-event-notify" name="shouldNotifyClient" type="checkbox" defaultChecked />
              Preparar notificacao para esta atualizacao
            </label>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Registrando atualizacao...">
                Registrar atualizacao
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Pendencias ligadas"
          description="Sinais operacionais, agenda e documentos ligados a este caso aparecem juntos para reduzir troca de contexto."
        >
          {operationalItems.length || openRequests.length || upcomingAppointments.length ? (
            <div className="stack">
              {operationalItems.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Fila operacional</span>
                  <ul className="list">
                    {operationalItems.map((item) => (
                      <li key={item.id}>
                        <div className="item-head">
                          <strong>{item.title}</strong>
                          <span className={`pill ${item.stateTone}`}>{item.stateLabel}</span>
                        </div>
                        <span className="item-meta">{item.timingLabel}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {openRequests.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Solicitacoes abertas</span>
                  <ul className="list">
                    {openRequests.map((request) => (
                      <li key={request.id}>
                        <div className="item-head">
                          <strong>{request.title}</strong>
                          <span className="tag soft">{request.statusLabel}</span>
                        </div>
                        <span className="item-meta">
                          {request.due_at
                            ? `Prazo ${formatPortalDateTime(request.due_at)}`
                            : "Sem prazo definido"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

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
                          {formatPortalDateTime(appointment.starts_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="empty-state">
              Nenhuma pendencia aberta para este caso agora. Use a agenda ou documentos quando surgir novo movimento.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Linha do tempo recente"
          description="Leitura operacional das atualizacoes mais novas deste caso."
        >
          {caseEvents.length ? (
            <ul className="update-feed">
              {caseEvents.map((event) => (
                <li key={event.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{event.title}</strong>
                      <span className="item-meta">{event.eventLabel}</span>
                    </div>
                    <span className="tag soft">{formatPortalDateTime(event.occurred_at)}</span>
                  </div>
                  <div className="pill-row">
                    <span className={`pill ${event.visible_to_client ? "success" : "muted"}`}>
                      {event.visible_to_client ? "Visivel ao cliente" : "Uso interno"}
                    </span>
                    <span className={`pill ${event.should_notify_client ? "warning" : "muted"}`}>
                      {event.should_notify_client ? "Notificacao preparada" : "Sem notificacao"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Ainda nao ha historico registrado para este caso. O primeiro andamento que voce registrar aparecera aqui.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Documentos e agenda ligados"
          description="Resumo curto dos itens conectados ao caso para consulta rapida."
        >
          {caseDocuments.length || caseAppointments.length || recentAppointmentHistory.length ? (
            <div className="stack">
              {caseDocuments.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Documentos recentes</span>
                  <ul className="list">
                    {caseDocuments.slice(0, 5).map((document) => (
                      <li key={document.id}>
                        <div className="item-head">
                          <strong>{document.file_name}</strong>
                          <span className="tag soft">{document.statusLabel}</span>
                        </div>
                        <span className="item-meta">
                          {formatPortalDateTime(document.document_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recentAppointmentHistory.length ? (
                <div className="subtle-panel stack">
                  <span className="shortcut-kicker">Historico da agenda</span>
                  <ul className="list">
                    {recentAppointmentHistory.map((appointment) => (
                      <li key={appointment.id}>
                        <div className="item-head">
                          <strong>{appointment.title}</strong>
                          <span className="tag soft">{appointment.changeLabel}</span>
                        </div>
                        <span className="item-meta">
                          {formatPortalDateTime(appointment.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="form-actions">
                <Link className="button secondary" href={agendaHref}>
                  Abrir agenda do caso
                </Link>
                <Link className="button secondary" href={documentsHref}>
                  Abrir documentos do caso
                </Link>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Ainda nao ha documentos ou agenda ligados a este caso. Os atalhos acima levam para as rotas certas quando voce precisar registrar algo novo.
            </p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
