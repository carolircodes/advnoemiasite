import Link from "next/link";

import { SafeModuleCard } from "@/components/safe-module-card";
import type {
  ClientAgendaSummaryData,
  ClientCaseSummaryData,
  ClientDocumentsSummaryData,
  ClientLoaderResult
} from "@/lib/services/client-workspace";

function getSafeReason(reason: string | null | undefined, fallback: string) {
  return typeof reason === "string" && reason.trim().length > 0 ? reason.trim() : fallback;
}

export function ClientCaseSummaryModule({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientCaseSummaryData>;
}) {
  if (!enabled) {
    return (
      <SafeModuleCard
        title="Resumo do caso"
        description="Este modulo esta temporariamente desligado por flag para preservar a estabilidade do painel."
        tone="warning"
      >
        <p>O shell continua funcionando normalmente enquanto o modulo estiver desligado.</p>
      </SafeModuleCard>
    );
  }

  if (!result.ok && !result.data.mainCase) {
    return (
      <SafeModuleCard
        title="Resumo do caso"
        description="O modulo abriu em fallback seguro e nao derrubou o painel."
        tone="warning"
      >
        <p>
          Ainda nao foi possivel carregar um caso principal para este acesso.
          Motivo: {getSafeReason(result.reason, "caso indisponivel no momento")}.
        </p>
        <p className="mt-3">
          Quando o caso estiver vinculado e consistente no portal, este bloco
          volta a mostrar os dados resumidos automaticamente.
        </p>
      </SafeModuleCard>
    );
  }

  const mainCase = result.data.mainCase;

  if (!mainCase) {
    return (
      <SafeModuleCard
        title="Resumo do caso"
        description="Nenhum caso principal foi encontrado para este portal, mas a rota segue util e carregada."
      >
        <p>
          Assim que a equipe vincular o primeiro caso ao seu cadastro, o resumo
          vai aparecer aqui com status, area e data de abertura.
        </p>
      </SafeModuleCard>
    );
  }

  return (
    <SafeModuleCard
      title="Resumo do caso"
      description="Primeiro modulo real da Fase 2: isolado, server-first e protegido contra dados ausentes."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Caso principal
          </p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">{mainCase.title}</p>
          <p className="mt-2 text-sm leading-6 text-[#66766f]">
            {mainCase.area || "Area ainda nao informada no portal."}
          </p>
        </div>

        <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Status
          </p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">{mainCase.statusLabel}</p>
          <p className="mt-2 text-sm leading-6 text-[#66766f]">
            Codigo interno: {mainCase.status || "analise"}.
          </p>
        </div>

        <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Base segura
          </p>
          <p className="mt-2 text-lg font-semibold text-[#10261d]">{result.data.totalCases}</p>
          <p className="mt-2 text-sm leading-6 text-[#66766f]">
            {result.data.totalCases === 1
              ? "caso encontrado para este acesso."
              : "casos encontrados para este acesso."}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Area
          </dt>
          <dd className="mt-2 text-sm text-[#10261d]">{mainCase.area || "Nao informada"}</dd>
        </div>
        <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Abertura
          </dt>
          <dd className="mt-2 text-sm text-[#10261d]">
            {mainCase.created_at || "Nao informado"}
          </dd>
        </div>
      </dl>

      {!result.ok ? (
        <p className="mt-4 text-sm leading-7 text-[#7b5c31]">
          O modulo foi carregado com degradacao segura. Motivo:{" "}
          {getSafeReason(result.reason, "dados parcialmente indisponiveis")}.
        </p>
      ) : null}
    </SafeModuleCard>
  );
}

export function ClientDocumentsPreviewModule({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientDocumentsSummaryData>;
}) {
  return (
    <SafeModuleCard
      title="Documentos simples"
      description="Estrutura pronta para a proxima onda: loader pequeno, fallback local e sem depender do workspace completo."
      tone={!enabled || !result.ok ? "warning" : "default"}
    >
      {!enabled ? (
        <p>O modulo de documentos permanece desligado por flag nesta etapa.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Disponiveis
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">
                {result.data.availableCount}
              </p>
            </div>
            <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Pendentes
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">
                {result.data.pendingCount}
              </p>
            </div>
            <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Total
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">
                {result.data.totalCount}
              </p>
            </div>
          </div>
          <p className="mt-4">
            Nesta onda, o painel so confirma que a base do modulo esta segura e
            pronta para expandir sem reabrir risco estrutural.
          </p>
          {!result.ok ? (
            <p className="mt-3 text-sm leading-7 text-[#7b5c31]">
              Fallback ativo: {getSafeReason(result.reason, "documentos indisponiveis")}.
            </p>
          ) : null}
          <div className="mt-4">
            <Link
              href="/documentos"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-5 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Abrir documentos
            </Link>
          </div>
        </>
      )}
    </SafeModuleCard>
  );
}

export function ClientAgendaPreviewModule({
  enabled,
  result
}: {
  enabled: boolean;
  result: ClientLoaderResult<ClientAgendaSummaryData>;
}) {
  return (
    <SafeModuleCard
      title="Agenda simples"
      description="Estrutura pronta para a proxima onda: leitura resumida, sem composicao antiga pesada e com fallback seguro."
      tone={!enabled || !result.ok ? "warning" : "default"}
    >
      {!enabled ? (
        <p>O modulo de agenda permanece desligado por flag nesta etapa.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Proximos
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">
                {result.data.upcomingAppointments.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Total
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">
                {result.data.totalAppointments}
              </p>
            </div>
            <div className="rounded-2xl border border-[#eee7db] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Proximo item
              </p>
              <p className="mt-2 text-sm font-semibold text-[#10261d]">
                {result.data.nextAppointment?.typeLabel || "Nenhum compromisso futuro"}
              </p>
            </div>
          </div>
          <p className="mt-4">
            A expansao da agenda volta depois, mas a base desta leitura curta ja
            esta segura para crescer em camadas.
          </p>
          {!result.ok ? (
            <p className="mt-3 text-sm leading-7 text-[#7b5c31]">
              Fallback ativo: {getSafeReason(result.reason, "agenda indisponivel")}.
            </p>
          ) : null}
          <div className="mt-4">
            <Link
              href="/agenda"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-5 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Abrir agenda
            </Link>
          </div>
        </>
      )}
    </SafeModuleCard>
  );
}
