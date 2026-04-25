import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import {
  InstitutionalStatCard,
  StrategicPanel
} from "@/components/portal/module-primitives";
import {
  PremiumFeatureCard,
  PremiumStatePanel
} from "@/components/portal/premium-experience";
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
  const nextCaseSignal = operationalCaseQueue[0] || null;
  const latestCaseEvent = recentCaseEvents[0] || null;
  const executiveCaseGuidance = [
    {
      label: "Caso que puxa a fila",
      title: focusCase?.title || "Nenhum caso puxando a carteira agora",
      detail: focusCase
        ? `${focusCase.clientName} - ${focusCase.statusLabel} - ${focusCase.priorityLabel}.`
        : "A central continua pronta para destacar o proximo caso assim que a prioridade mudar.",
      meta: focusCase
        ? focusCase.staleDays >= 1
          ? `${focusCase.staleDays} dia(s) sem nova leitura`
          : "Atividade recente"
        : "Sem alerta imediato"
    },
    {
      label: "Ultimo movimento relevante",
      title: latestCaseEvent?.title || "Ainda nao ha novo andamento recente",
      detail: latestCaseEvent
        ? `${latestCaseEvent.caseTitle} - ${latestCaseEvent.eventLabel}.`
        : "Os proximos registros de caso vao aparecer aqui para orientar reentrada e prioridade.",
      meta: latestCaseEvent
        ? formatPortalDateTime(latestCaseEvent.occurred_at)
        : "Linha da carteira aguardando novo movimento"
    },
    {
      label: "Proximo passo operacional",
      title: nextCaseSignal?.title || "Nenhum item pedindo acao imediata",
      detail:
        nextCaseSignal?.description ||
        "Quando houver espera, prazo, retorno ou envelhecimento relevante, a central vai apontar a reentrada certa.",
      meta: nextCaseSignal?.timingLabel || "Operacao estavel agora"
    }
  ];
  const executiveSignals = [
    {
      eyebrow: "Caso em foco",
      title: focusCase?.title || "Carteira sem caso dominante agora",
      description: focusCase
        ? `${focusCase.clientName} concentra a maior prioridade desta leitura com status ${focusCase.statusLabel.toLowerCase()}.`
        : "A central continua preparada para destacar o caso que puxar a fila assim que houver nova prioridade.",
      meta: focusCase?.priorityLabel || "Sem urgência dominante",
      tone:
        focusCase?.priority === "urgente"
          ? ("warning" as const)
          : focusCase?.priority === "alta"
            ? ("accent" as const)
            : ("default" as const)
    },
    {
      eyebrow: "Janela de reentrada",
      title:
        staleCount > 0
          ? `${staleCount} caso(s) pedem releitura`
          : "Carteira sem envelhecimento crítico",
      description:
        staleCount > 0
          ? "Os itens mais antigos já estão visíveis para evitar silêncio operacional, retorno tardio ou perda de contexto."
          : "O ritmo recente da carteira está saudável e sem volumes relevantes parados há muitos dias.",
      meta: staleCount > 0 ? "Revisar hoje" : "Operação estável",
      tone: staleCount > 0 ? ("warning" as const) : ("success" as const)
    },
    {
      eyebrow: "Próximo movimento",
      title: nextCaseSignal?.title || "Sem passo obrigatório imediato",
      description:
        nextCaseSignal?.description ||
        "A fila de casos não aponta um bloqueio dominante neste instante, então a leitura pode seguir pelo caso em foco.",
      meta: nextCaseSignal?.timingLabel || "Monitoramento",
      tone: nextCaseSignal ? ("accent" as const) : ("default" as const)
    }
  ];

  return (
    <AppFrame
      eyebrow="Central de casos"
      title="Carteira jurídica com foco, prioridade e continuidade."
      description="Esta central organiza abertura, andamento, prioridade e reentrada de cada caso com leitura mais clara entre foco atual, retorno devido e próximo passo jurídico."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Operacao interna por caso"
          workspaceHint="Sessao protegida para conduzir casos, timeline, cliente, agenda e documentos com a mesma referencia."
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
        { label: "Sem leitura ha 10+ dias", value: String(staleCount) }
      ]}
      actions={[
        { href: buildInternalNewCaseHref(selectedClientId || null), label: "Abrir novo caso" },
        {
          href: focusCase ? buildInternalCaseHref(focusCase.id) : buildInternalCasesHref(selectedClientId || null),
          label: focusCase ? "Continuar caso em foco" : "Listar casos",
          tone: "secondary"
        },
        {
          href: selectedClient ? buildInternalClientHref(selectedClient.id) : "/internal/advogada",
          label: selectedClient ? "Abrir cliente" : "Voltar ao painel",
          tone: "secondary"
        }
      ]}
    >
      {error ? (
        <PremiumStatePanel
          tone="error"
          eyebrow="Central de casos"
          title="A carteira precisa de atencao antes da proxima decisao."
          description={error}
        />
      ) : null}

      <SectionCard
        title="Mesa executiva da carteira"
        description="Antes dos filtros, a central deixa claro qual caso puxa a fila, onde existe risco de silêncio operacional e qual reentrada merece decisão primeiro."
      >
        <div className="grid three">
          {executiveSignals.map((signal) => (
            <InstitutionalStatCard
              key={signal.eyebrow}
              eyebrow={signal.eyebrow}
              title={signal.title}
              description={signal.description}
              meta={signal.meta}
              tone={signal.tone}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Busca e recorte da carteira"
        description="Os filtros continuam completos, mas entram depois da leitura executiva para a equipe começar pela prioridade certa e não por tentativa e erro."
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
                placeholder="Titulo, cliente, area ou resumo executivo do caso"
              />
            </div>
            <div className="field">
              <label htmlFor="cases-client">Cliente</label>
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
              <label htmlFor="cases-status">Status do caso</label>
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
              <label htmlFor="cases-priority">Prioridade</label>
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
              <label htmlFor="cases-sort">Ordenacao</label>
              <select id="cases-sort" name="sort" defaultValue={sort}>
                <option value="priority">Prioridade (maior primeiro)</option>
                <option value="recent">Atividade mais recente</option>
                <option value="stale">Mais tempo sem atualizacao</option>
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
        title="Leitura executiva da carteira"
        description="Este resumo cruza foco atual, ultimo movimento e proxima acao para a central de casos funcionar como eixo real da operacao."
      >
        <div className="grid three">
          {executiveCaseGuidance.map((item) => (
            <StrategicPanel
              key={item.label}
              eyebrow={item.label}
              title={item.title}
              description={item.detail}
            >
              <span className="item-meta">{item.meta}</span>
            </StrategicPanel>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Rotas de condução"
        description="A central de casos agora funciona como trilha própria: abrir, continuar, revisar cliente e agir sem voltar a formulários espalhados pelo painel."
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
          title="Carteira em andamento"
          description="Cada bloco traz leitura rápida do caso e atalhos consistentes para cliente, agenda e documentos."
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
            <PremiumStatePanel
              tone="neutral"
              eyebrow="Carteira em andamento"
              title="Nenhum caso apareceu nesta leitura."
              description="Ajuste os filtros ou abra um novo acompanhamento para recolocar a carteira em movimento."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Fila operacional de casos"
          description="A lateral passa a concentrar o que exige retorno, atualização de status ou retomada imediata, sem ocupar o mesmo protagonismo da carteira principal."
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
            <PremiumStatePanel
              tone="neutral"
              eyebrow="Fila operacional"
              title="Nenhum caso entrou na fila agora."
              description="Novos sinais vao aparecer aqui assim que houver espera, pendencia ou envelhecimento operacional."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Andamentos recentes"
        description="Linha viva da carteira para entender o que mudou e qual caso merece reentrada antes de abrir cada ficha."
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
                <p className="update-body">
                  {event.visible_to_client
                    ? "Este movimento ja conversa com a visao do cliente e ajuda a manter o caso alinhado dos dois lados."
                    : "Atualizacao interna pronta para orientar o proximo passo da equipe neste caso."}
                </p>
                <div className="form-actions">
                  <Link className="button secondary" href={buildInternalCaseHref(event.case_id)}>
                    Abrir caso
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <PremiumStatePanel
            tone="neutral"
            eyebrow="Andamentos recentes"
            title="Ainda nao ha novos movimentos para exibir."
            description="Assim que a carteira registrar novas atualizacoes, a linha de andamentos sera preenchida automaticamente."
          />
        )}
      </SectionCard>
    </AppFrame>
  );
}
