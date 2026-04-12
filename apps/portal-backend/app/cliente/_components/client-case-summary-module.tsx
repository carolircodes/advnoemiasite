import type { ReactNode } from "react";
import Link from "next/link";

import { SafeModuleCard } from "@/components/safe-module-card";
import {
  normalizeDateLabel,
  normalizeShortText
} from "@/lib/portal/client-normalizers";
import type {
  ClientAgendaSummaryData,
  ClientCaseSummaryData,
  ClientDocumentsSummaryData,
  ClientEventsSummaryData,
  ClientLoaderResult,
  ClientRequestsSummaryData
} from "@/lib/services/client-workspace";

type ClientCaseSummaryModuleProps = {
  enabled: boolean;
  result: ClientLoaderResult<ClientCaseSummaryData>;
};

type ClientPreparationModuleCardProps = {
  title: string;
  href: string;
  ctaLabel: string;
  enabled: boolean;
  reason: string | null;
  description: string;
  stateLabel?: string;
  children: ReactNode;
};

function getFriendlyReason(reason: string | null) {
  switch (reason) {
    case "client_not_found":
      return "O cadastro do cliente ainda nao foi vinculado ao portal.";
    case "cases_query_failed":
    case "base_context_failed":
      return "Os dados principais do caso nao puderam ser carregados agora.";
    case "documents_query_failed":
    case "documents_loader_failed":
      return "Os documentos nao puderam ser carregados com seguranca neste momento.";
    case "agenda_query_failed":
    case "agenda_loader_failed":
      return "A agenda nao pode ser exibida agora com seguranca.";
    case "requests_query_failed":
    case "requests_loader_failed":
      return "As solicitacoes nao puderam ser carregadas agora com seguranca.";
    case "events_query_failed":
    case "events_loader_failed":
      return "O historico recente nao pode ser exibido agora com seguranca.";
    case "client_or_cases_unavailable":
    case "cases_unavailable":
      return "Ainda nao ha dados suficientes para abrir este modulo.";
    case "supabase_unavailable":
      return "O portal entrou em fallback seguro por indisponibilidade temporaria dos dados.";
    default:
      return "Este modulo entrou em fallback seguro para evitar falha de renderizacao.";
  }
}

function ClientPreparationModuleCard({
  title,
  href,
  ctaLabel,
  enabled,
  reason,
  description,
  stateLabel,
  children
}: ClientPreparationModuleCardProps) {
  const tone = !enabled ? "warning" : reason ? "warning" : "default";
  const computedStateLabel =
    stateLabel ||
    (!enabled
      ? "Desligado por flag"
      : reason
        ? "Fallback seguro ativo"
        : "Dados disponiveis");

  return (
    <SafeModuleCard title={title} description={description} tone={tone}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
        {computedStateLabel}
      </p>

      <div className="mt-4">{children}</div>

      {reason ? (
        <p className="mt-4 rounded-2xl border border-[#eadfcf] bg-[#fbf7ef] px-4 py-3 text-sm leading-6 text-[#7b5c31]">
          {getFriendlyReason(reason)}
        </p>
      ) : null}

      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-5 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
        >
          {ctaLabel}
        </Link>
      </div>
    </SafeModuleCard>
  );
}

function SummaryMetric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
        {label}
      </dt>
      <dd className="text-sm text-[#10261d]">{value}</dd>
    </div>
  );
}

function SimpleListItem({
  title,
  subtitle,
  detail,
  body
}: {
  title: string;
  subtitle: string;
  detail: string;
  body?: string;
}) {
  return (
    <li className="rounded-2xl border border-[#ece5d9] bg-[#fcfaf6] px-4 py-3">
      <p className="text-sm font-semibold text-[#10261d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#5f6f68]">{subtitle}</p>
      {body ? <p className="mt-2 text-sm leading-6 text-[#66766f]">{body}</p> : null}
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8e6a3b]">{detail}</p>
    </li>
  );
}

function getRequestTypeLabel(title: string, instructions: string) {
  const normalizedValue = `${title} ${instructions}`.toLowerCase();

  if (normalizedValue.includes("document")) {
    return "Documentacao";
  }

  if (normalizedValue.includes("assin")) {
    return "Assinatura";
  }

  if (normalizedValue.includes("prazo")) {
    return "Prazo";
  }

  return "Interacao";
}

function getRequestNextStepLabel(status: string, dueAt: string | null) {
  if (status === "completed") {
    return "Proximo passo: acompanhamento interno.";
  }

  if (dueAt) {
    return `Proximo passo: revisar ate ${normalizeDateLabel(dueAt)}.`;
  }

  if (status === "pending") {
    return "Proximo passo: aguardar orientacao da equipe.";
  }

  return "Proximo passo: acompanhar a atualizacao na area completa.";
}

function getEventContextLabel(summary: string, eventLabel: string) {
  if (summary) {
    return normalizeShortText(summary, "", 130);
  }

  return `${eventLabel} registrada no portal.`;
}

export function ClientCaseSummaryModule({
  enabled,
  result
}: ClientCaseSummaryModuleProps) {
  const tone = !enabled ? "warning" : !result.ok ? "warning" : "default";
  const mainCase = result.data.mainCase;
  const hasCase = !!mainCase;

  return (
    <SafeModuleCard
      id="client-case-summary"
      title="Resumo do caso"
      description="Visao inicial do seu acompanhamento para voce entender o status atual, a data de entrada no portal e quantos casos estao visiveis."
      tone={tone}
    >
      {!enabled ? (
        <p className="rounded-2xl border border-[#eadfcf] bg-[#fbf7ef] px-4 py-3 text-sm leading-6 text-[#7b5c31]">
          O resumo do caso esta temporariamente indisponivel. Os demais modulos
          do painel continuam acessiveis.
        </p>
      ) : null}

      {enabled && !hasCase ? (
        <p className="rounded-2xl border border-[#eadfcf] bg-[#fbf7ef] px-4 py-3 text-sm leading-6 text-[#7b5c31]">
          {result.reason === "client_not_found"
            ? "Seu cadastro ainda nao foi vinculado a um caso visivel no portal."
            : "Ainda nao ha um caso disponivel para resumir nesta area. Quando houver atualizacoes visiveis, elas aparecerao aqui."}
        </p>
      ) : null}

      {enabled && hasCase ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Caso principal
            </p>
            <p className="mt-2 text-base font-semibold text-[#10261d]">{mainCase.title}</p>
            <p className="mt-2 text-sm leading-6 text-[#66766f]">
              {mainCase.area || "Area nao informada"}
            </p>
          </div>

          <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Status do caso
            </p>
            <p className="mt-2 text-base font-semibold text-[#10261d]">
              {mainCase.statusLabel || "Sem status"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#66766f]">
              Situacao do cadastro: {result.data.clientRecord.status || "indisponivel"}
            </p>
          </div>

          <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Cadastro no portal
            </p>
            <p className="mt-2 text-base font-semibold text-[#10261d]">
              {normalizeDateLabel(mainCase.created_at)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#66766f]">
              Data em que este acompanhamento passou a aparecer no seu portal.
            </p>
          </div>

          <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Casos visiveis
            </p>
            <p className="mt-2 text-base font-semibold text-[#10261d]">
              {result.data.totalCases}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#66766f]">
              Quantidade de acompanhamentos hoje vinculados ao seu acesso.
            </p>
          </div>
        </div>
      ) : null}

      {enabled && result.reason && hasCase ? (
        <p className="mt-4 rounded-2xl border border-[#eadfcf] bg-[#fbf7ef] px-4 py-3 text-sm leading-6 text-[#7b5c31]">
          Parte deste resumo foi carregada com seguranca reduzida: {getFriendlyReason(result.reason)}
        </p>
      ) : null}
    </SafeModuleCard>
  );
}

export function ClientDocumentsPreparationCard({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientDocumentsSummaryData>;
}) {
  const visibleDocuments = result.data.documents.slice(0, 3);
  const hasDocuments = visibleDocuments.length > 0;

  return (
    <ClientPreparationModuleCard
      title="Documentos do caso"
      href="/documentos"
      ctaLabel="Abrir documentos"
      enabled={enabled}
      reason={enabled && !result.ok ? result.reason : null}
      stateLabel={
        !enabled
          ? "Desligado por flag"
          : hasDocuments
            ? "Modulo simples ativo"
            : "Estado vazio seguro"
      }
      description="Veja quantos documentos ja estao disponiveis, quantos ainda estao pendentes e abra a area completa quando precisar."
    >
      <dl className="space-y-3">
        <SummaryMetric label="Total visivel" value={String(result.data.totalCount)} />
        <SummaryMetric label="Disponiveis" value={String(result.data.availableCount)} />
        <SummaryMetric label="Pendentes" value={String(result.data.pendingCount)} />
      </dl>

      {enabled && hasDocuments ? (
        <ul className="mt-4 space-y-3">
          {visibleDocuments.map((document) => (
            <SimpleListItem
              key={document.id}
              title={document.file_name}
              subtitle={`${document.category} - ${document.caseTitle}`}
              detail={`${document.statusLabel} - ${normalizeDateLabel(document.document_date)}`}
            />
          ))}
        </ul>
      ) : null}

      {enabled && !hasDocuments ? (
        <p className="mt-4 rounded-2xl border border-[#ece5d9] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-[#5f6f68]">
          Nenhum documento visivel foi encontrado agora. Quando a equipe liberar
          arquivos ou registrar novas pendencias, este bloco sera atualizado.
        </p>
      ) : null}
    </ClientPreparationModuleCard>
  );
}

export function ClientAgendaPreparationCard({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientAgendaSummaryData>;
}) {
  const visibleAppointments = result.data.upcomingAppointments.slice(0, 3);
  const hasAppointments = visibleAppointments.length > 0;

  return (
    <ClientPreparationModuleCard
      title="Agenda do acompanhamento"
      href="/agenda"
      ctaLabel="Abrir agenda"
      enabled={enabled}
      reason={enabled && !result.ok ? result.reason : null}
      stateLabel={
        !enabled
          ? "Desligado por flag"
          : hasAppointments
            ? "Modulo simples ativo"
            : "Estado vazio seguro"
      }
      description="Veja os proximos compromissos ligados ao seu caso e qual e a proxima data importante ja registrada pela equipe."
    >
      <dl className="space-y-3">
        <SummaryMetric label="Compromissos" value={String(result.data.totalAppointments)} />
        <SummaryMetric
          label="Proximos"
          value={String(result.data.upcomingAppointments.length)}
        />
        <SummaryMetric
          label="Proxima data"
          value={
            result.data.nextAppointment
              ? `${result.data.nextAppointment.title} em ${normalizeDateLabel(result.data.nextAppointment.starts_at)}`
              : "Nenhuma data futura cadastrada"
          }
        />
      </dl>

      {enabled && hasAppointments ? (
        <ul className="mt-4 space-y-3">
          {visibleAppointments.map((appointment) => (
            <SimpleListItem
              key={appointment.id}
              title={appointment.title}
              subtitle={`${appointment.typeLabel} - ${appointment.caseTitle}`}
              detail={`${appointment.statusLabel} - ${normalizeDateLabel(appointment.starts_at)}`}
            />
          ))}
        </ul>
      ) : null}

      {enabled && !hasAppointments ? (
        <p className="mt-4 rounded-2xl border border-[#ece5d9] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-[#5f6f68]">
          Ainda nao ha compromissos futuros cadastrados. Quando uma nova data
          for liberada para voce, ela aparecera aqui.
        </p>
      ) : null}
    </ClientPreparationModuleCard>
  );
}

export function ClientRequestsModule({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientRequestsSummaryData>;
}) {
  const visibleRequests = result.data.documentRequests.slice(0, 3);
  const hasRequests = visibleRequests.length > 0;

  return (
    <ClientPreparationModuleCard
      title="Solicitacoes e interacoes"
      href="/documentos"
      ctaLabel="Ver area completa"
      enabled={enabled}
      reason={enabled && !result.ok ? result.reason : null}
      stateLabel={
        !enabled
          ? "Desligado por flag"
          : hasRequests
            ? "Modo leitura ativo"
            : "Estado vazio seguro"
      }
      description="Aqui voce acompanha as solicitacoes recentes e entende rapidamente se ainda existe algo aguardando sua acao."
    >
      <dl className="space-y-3">
        <SummaryMetric label="Total" value={String(result.data.documentRequests.length)} />
        <SummaryMetric label="Em aberto" value={String(result.data.openCount)} />
        <SummaryMetric label="Concluidas" value={String(result.data.completedCount)} />
      </dl>

      {enabled && hasRequests ? (
        <ul className="mt-4 space-y-3">
          {visibleRequests.map((request) => (
            <SimpleListItem
              key={request.id}
              title={request.title}
              subtitle={`${getRequestTypeLabel(request.title, request.instructions)} - ${request.statusLabel}`}
              body={
                request.instructions
                  ? normalizeShortText(request.instructions, "", 120)
                  : getRequestNextStepLabel(request.status, request.due_at)
              }
              detail={`Ultima movimentacao em ${normalizeDateLabel(request.created_at)} - ${request.caseTitle}`}
            />
          ))}
        </ul>
      ) : null}

      {enabled && !hasRequests ? (
        <p className="mt-4 rounded-2xl border border-[#ece5d9] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-[#5f6f68]">
          Nenhuma solicitacao recente foi encontrada. Quando a equipe pedir um
          documento ou registrar uma interacao importante, ela aparecera aqui.
        </p>
      ) : null}
    </ClientPreparationModuleCard>
  );
}

export function ClientEventsModule({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientEventsSummaryData>;
}) {
  const visibleEvents = result.data.recentEvents.slice(0, 4);
  const hasEvents = visibleEvents.length > 0;

  return (
    <ClientPreparationModuleCard
      title="Historico recente"
      href="/cliente"
      ctaLabel="Atualizar painel"
      enabled={enabled}
      reason={enabled && !result.ok ? result.reason : null}
      stateLabel={
        !enabled
          ? "Desligado por flag"
          : hasEvents
            ? "Resumo recente ativo"
            : "Estado vazio seguro"
      }
      description="Resumo das ultimas atualizacoes visiveis para voce acompanhar o andamento sem precisar interpretar termos tecnicos."
    >
      <dl className="space-y-3">
        <SummaryMetric label="Eventos recentes" value={String(result.data.recentEvents.length)} />
        <SummaryMetric label="Total visivel" value={String(result.data.totalEvents)} />
      </dl>

      {enabled && hasEvents ? (
        <ul className="mt-4 space-y-3">
          {visibleEvents.map((event) => (
            <SimpleListItem
              key={event.id}
              title={event.title}
              subtitle={`${event.eventLabel} - ${event.caseTitle}`}
              body={getEventContextLabel(event.public_summary, event.eventLabel)}
              detail={`Atualizado em ${normalizeDateLabel(event.occurred_at)}`}
            />
          ))}
        </ul>
      ) : null}

      {enabled && !hasEvents ? (
        <p className="mt-4 rounded-2xl border border-[#ece5d9] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-[#5f6f68]">
          Ainda nao ha historico recente disponivel para exibir. As proximas
          movimentacoes publicadas pela equipe passarao a aparecer aqui.
        </p>
      ) : null}
    </ClientPreparationModuleCard>
  );
}
