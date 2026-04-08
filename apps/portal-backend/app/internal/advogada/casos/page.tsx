import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  casePriorityLabels,
  casePriorities,
  caseStatusLabels,
  caseStatuses,
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

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value.trim() : fallback;
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
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

function getMostRecentTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => !Number.isNaN(value));

  if (!timestamps.length) {
    return null;
  }

  return Math.max(...timestamps);
}

function getDaysSince(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

export default async function InternalCasesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const overview = await getStaffOverview();
  const params = searchParams ? await searchParams : {};
  const rawError = getStringParam(params.error);
  const decodedError = rawError ? decodeURIComponent(rawError) : "";
  const error = getAccessMessage(decodedError) || decodedError;
  const query = getStringParam(params.q);
  const selectedStatus = getStringParam(params.status);
  const selectedPriority = getStringParam(params.priority);
  const selectedClientId = getStringParam(params.clientId);
  const sort = getStringParam(params.sort, "priority");
  const selectedClient =
    overview.clientOptions.find((client) => client.id === selectedClientId) || null;
  const relatedEventsByCase = new Map(
    overview.latestEvents.map((event) => [event.case_id, event])
  );
  const filteredCases = overview.caseOptions
    .filter(
      (caseItem) =>
        matchesSearch(query, [
          caseItem.title,
          caseItem.clientName,
          caseItem.summary,
          caseItem.priorityLabel,
          caseItem.statusLabel
        ]) &&
        (!selectedStatus || caseItem.status === selectedStatus) &&
        (!selectedPriority || caseItem.priority === selectedPriority) &&
        (!selectedClientId || caseItem.clientId === selectedClientId)
    )
    .map((caseItem) => {
      const relatedEvent = relatedEventsByCase.get(caseItem.id);
      const lastActivityTimestamp = getMostRecentTimestamp([
        caseItem.updated_at,
        caseItem.last_public_update_at,
        caseItem.last_status_changed_at,
        relatedEvent?.occurred_at,
        caseItem.created_at
      ]);

      return {
        ...caseItem,
        lastActivityAt:
          lastActivityTimestamp === null
            ? caseItem.created_at
            : new Date(lastActivityTimestamp).toISOString(),
        staleDays: getDaysSince(
          lastActivityTimestamp === null
            ? caseItem.created_at
            : new Date(lastActivityTimestamp).toISOString()
        )
      };
    })
    .sort((left, right) => {
      if (sort === "recent") {
        return right.lastActivityAt.localeCompare(left.lastActivityAt);
      }

      if (sort === "stale") {
        return right.staleDays - left.staleDays;
      }

      const priorityDifference = getPriorityRank(right.priority) - getPriorityRank(left.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return right.lastActivityAt.localeCompare(left.lastActivityAt);
    });
  const highPriorityCount = filteredCases.filter(
    (caseItem) => caseItem.priority === "alta" || caseItem.priority === "urgente"
  ).length;
  const waitingClientCount = filteredCases.filter(
    (caseItem) => caseItem.status === "aguardando-retorno"
  ).length;
  const staleCount = filteredCases.filter((caseItem) => caseItem.staleDays >= 10).length;
  const operationalCaseQueue = [
    ...overview.operationalCenter.queues.today,
    ...overview.operationalCenter.queues.thisWeek,
    ...overview.operationalCenter.queues.awaitingClient,
    ...overview.operationalCenter.queues.awaitingTeam
  ]
    .filter(
      (item) =>
        item.kindLabel === "Caso" && (!selectedClientId || item.clientId === selectedClientId)
    )
    .slice(0, 8);
  const recentCaseEvents = overview.latestEvents
    .filter((event) => !selectedClientId || event.clientId === selectedClientId)
    .slice(0, 8);
  const focusCase = filteredCases[0] || null;

  return (
    <AppFrame
      eyebrow="Gestão de Casos"
      title="Painel Operacional de Casos"
      description="Gerencie todos os casos jurídicos em um ambiente organizado. Abra novos processos, atualize andamentos, altere status e mantenha o controle completo da jornada de cada cliente."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Ambiente Operacional"
          workspaceHint="Sessão interna ativa para gestão completa de casos jurídicos"
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        ...(selectedClient
          ? [{ href: buildInternalClientHref(selectedClient.id), label: "Cliente" }]
          : []),
        { href: buildInternalCasesHref(selectedClientId || null), label: "Casos", active: true }
      ]}
      highlights={[
        { label: "Casos ativos", value: String(filteredCases.length) },
        { label: "Alta prioridade", value: String(highPriorityCount) },
        { label: "Aguardando retorno", value: String(waitingClientCount) },
        { label: "Inativos há 10+ dias", value: String(staleCount) }
      ]}
      actions={[
        { href: buildInternalNewCaseHref(selectedClientId || null), label: "Novo Caso" },
        {
          href: focusCase ? buildInternalCaseHref(focusCase.id) : buildInternalCasesHref(selectedClientId || null),
          label: focusCase ? "Ver Caso em Foco" : "Listar Casos",
          tone: "secondary"
        },
        {
          href: selectedClient ? buildInternalClientHref(selectedClient.id) : "/internal/advogada",
          label: selectedClient ? "Ver Cliente" : "Painel Principal",
          tone: "secondary"
        }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}

      <SectionCard
        title="Filtrar Casos"
        description="Encontre rapidamente qualquer caso usando busca inteligente e filtros específicos. Otimize seu tempo focando nos casos mais relevantes."
      >
        <form className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="cases-q">Buscar casos</label>
              <input
                id="cases-q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Título, cliente, área ou descrição do caso"
              />
            </div>
            <div className="field">
              <label htmlFor="cases-client">Filtrar por Cliente</label>
              <select id="cases-client" name="clientId" defaultValue={selectedClientId}>
                <option value="">Todos os clientes</option>
                {overview.clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cases-status">Status do Processo</label>
              <select id="cases-status" name="status" defaultValue={selectedStatus}>
                <option value="">Todos os status</option>
                {caseStatuses.map((status) => (
                  <option key={status} value={status}>
                    {caseStatusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cases-priority">Nível de Prioridade</label>
              <select id="cases-priority" name="priority" defaultValue={selectedPriority}>
                <option value="">Todas as prioridades</option>
                {casePriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {casePriorityLabels[priority]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cases-sort">Ordenar por</label>
              <select id="cases-sort" name="sort" defaultValue={sort}>
                <option value="priority">Prioridade (maior primeiro)</option>
                <option value="recent">Atividade mais recente</option>
                <option value="stale">Mais tempo sem atualização</option>
              </select>
            </div>
          </div>
          {selectedClient ? (
            <div className="notice">
              {selectedClient.fullName} esta no foco desta central. Voce pode abrir um novo caso ja vinculado ou seguir para a ficha do cliente.
            </div>
          ) : null}
          <div className="form-actions">
            <button className="button secondary" type="submit">
              Aplicar filtros
            </button>
            <Link className="button secondary" href="/internal/advogada/casos">
              Limpar filtros
            </Link>
            <Link className="button secondary" href={buildInternalNewCaseHref(selectedClientId || null)}>
              Abrir novo caso
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Fluxos de caso"
        description="O centro de casos agora virou uma trilha propria: abrir, continuar, revisar cliente e agir sem voltar para formularios no dashboard."
      >
        <div className="grid three">
          <Link className="route-card" href={buildInternalNewCaseHref(selectedClientId || null)}>
            <span className="shortcut-kicker">Criacao</span>
            <strong>Abrir novo caso</strong>
            <span>
              Comecar um acompanhamento novo em uma rota focada, com menos ruido e melhor leitura no mobile.
            </span>
          </Link>
          <Link
            className="route-card"
            href={
              focusCase ? buildInternalCaseHref(focusCase.id) : buildInternalCasesHref(selectedClientId || null)
            }
          >
            <span className="shortcut-kicker">Execucao</span>
            <strong>{focusCase ? "Continuar caso em foco" : "Revisar casos abertos"}</strong>
            <span>
              {focusCase
                ? `${focusCase.title} esta puxando a fila neste momento.`
                : "Abra a lista detalhada e siga pelo caso que exigir a proxima acao."}
            </span>
          </Link>
          <Link
            className="route-card"
            href={selectedClient ? buildInternalClientHref(selectedClient.id) : "/internal/advogada"}
          >
            <span className="shortcut-kicker">Contexto</span>
            <strong>{selectedClient ? "Voltar para o cliente" : "Voltar ao dashboard"}</strong>
            <span>
              {selectedClient
                ? "Retorne para a ficha do cliente quando precisar cruzar casos, agenda, documentos e notas."
                : "Use o painel principal apenas para visao, prioridades e atalhos rapidos."}
            </span>
          </Link>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Casos em operacao"
          description="Cada card traz leitura rapida do caso e atalhos consistentes para cliente, agenda e documentos."
        >
          {filteredCases.length ? (
            <ul className="update-feed">
              {filteredCases.slice(0, 12).map((caseItem) => (
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
                  <p className="update-body">
                    {caseItem.summary || "Resumo do caso ainda nao registrado."}
                  </p>
                  <div className="pill-row">
                    <span className={`pill ${caseItem.priority === "urgente" ? "critical" : caseItem.priority === "alta" ? "warning" : "muted"}`}>
                      {caseItem.priorityLabel}
                    </span>
                    <span className={`pill ${caseItem.staleDays >= 14 ? "warning" : "muted"}`}>
                      {caseItem.staleDays >= 1
                        ? `${caseItem.staleDays} dia(s) sem nova leitura`
                        : "Atividade recente"}
                    </span>
                    <span className="pill muted">
                      {formatPortalDateTime(caseItem.lastActivityAt)}
                    </span>
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
              Nenhum caso corresponde aos filtros atuais. Ajuste os filtros ou abra um novo acompanhamento.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Fila operacional de casos"
          description="Itens que pedem status, retorno ou novo movimento agora entram aqui sem entupir o dashboard."
        >
          {operationalCaseQueue.length ? (
            <ul className="update-feed compact">
              {operationalCaseQueue.map((item) => (
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
          ) : (
            <p className="empty-state">
              Nenhum caso entrou na fila operacional agora. Os novos sinais aparecem aqui assim que houver espera, pendencia ou envelhecimento.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Andamentos recentes"
        description="Linha do tempo curta para entender o que mudou nos casos sem abrir cada detalhe imediatamente."
      >
        {recentCaseEvents.length ? (
          <ul className="update-feed">
            {recentCaseEvents.map((event) => (
              <li key={event.id} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{event.title}</strong>
                    <span className="item-meta">
                      {event.caseTitle} - {event.clientName}
                    </span>
                  </div>
                  <span className="tag soft">{event.eventLabel}</span>
                </div>
                <div className="pill-row">
                  <span className={`pill ${event.visible_to_client ? "success" : "muted"}`}>
                    {event.visible_to_client ? "Visivel ao cliente" : "Uso interno"}
                  </span>
                  <span className="pill muted">{formatPortalDateTime(event.occurred_at)}</span>
                </div>
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
            Nenhuma atualizacao recente para mostrar agora. Os novos registros de caso passarao a aparecer aqui automaticamente.
          </p>
        )}
      </SectionCard>
    </AppFrame>
  );
}
