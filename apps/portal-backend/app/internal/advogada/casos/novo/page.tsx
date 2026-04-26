import Link from "next/link";

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
  caseStatusLabels,
  caseStatuses
} from "@/lib/domain/portal";
import {
  buildInternalCasesHref,
  buildInternalClientHref
} from "@/lib/navigation";
import { getStaffOverview } from "@/lib/services/dashboard";

import { createInternalCaseAction } from "../actions.ts";

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value.trim() : fallback;
}

export default async function NewInternalCasePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const overview = await getStaffOverview();
  const params = searchParams ? await searchParams : {};
  const selectedClientId = getStringParam(params.clientId);
  const rawError = getStringParam(params.error);
  const decodedError = rawError ? decodeURIComponent(rawError) : "";
  const error = getAccessMessage(decodedError) || decodedError;
  const selectedClient =
    overview.clientOptions.find((client) => client.id === selectedClientId) || null;
  const defaultClient = selectedClient || overview.clientOptions[0] || null;

  return (
    <AppFrame
      eyebrow="Novo caso"
      title="Abrir caso em uma rota focada."
      description="A criacao do caso saiu do dashboard para um fluxo proprio, com leitura mais calma, melhor navegacao no mobile e menos risco de operacao dispersa."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Criacao de caso protegida"
          workspaceHint="Sessao interna ativa para abrir novos acompanhamentos com contexto e rastreabilidade."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        ...(selectedClient
          ? [{ href: buildInternalClientHref(selectedClient.id), label: "Cliente" }]
          : []),
        { href: buildInternalCasesHref(selectedClientId || null), label: "Casos" },
        { href: "/internal/advogada/casos/novo", label: "Novo caso", active: true }
      ]}
      highlights={[
        { label: "Clientes ativos", value: String(overview.clientOptions.length) },
        {
          label: "Cliente em foco",
          value: selectedClient ? selectedClient.fullName : "Selecionar"
        },
        {
          label: "Casos ativos",
          value: selectedClient ? String(selectedClient.activeCaseCount) : String(overview.latestCases.length)
        },
        {
          label: "Pendencias abertas",
          value: selectedClient ? String(selectedClient.pendingDocumentRequestsCount) : String(overview.openDocumentRequestsCount)
        }
      ]}
      actions={[
        { href: buildInternalCasesHref(selectedClientId || null), label: "Voltar aos casos", tone: "secondary" },
        ...(selectedClient
          ? [{ href: buildInternalClientHref(selectedClient.id), label: "Voltar ao cliente", tone: "secondary" as const }]
          : [])
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}

      <div className="grid two">
        <SectionCard
          title="Contexto rapido"
          description="Antes de abrir o caso, vale confirmar se o cliente certo esta no foco e se o acompanhamento ja tem sinais pendentes."
        >
          {defaultClient ? (
            <div className="client-sheet-card">
              <div className="client-sheet-head">
                <div>
                  <span className="shortcut-kicker">Cliente selecionado</span>
                  <h3>{defaultClient.fullName}</h3>
                  <p className="client-sheet-copy">
                    {defaultClient.primaryCaseTitle
                      ? `${defaultClient.primaryCaseTitle} segue como referencia atual deste atendimento.`
                      : "Este cliente ainda nao tem um caso principal definido."}
                  </p>
                </div>
                <div className="pill-row">
                  <span className="pill success">{defaultClient.statusLabel}</span>
                  <span className={`pill ${defaultClient.isActive ? "success" : "warning"}`}>
                    {defaultClient.isActive ? "Portal ativo" : "Portal bloqueado"}
                  </span>
                </div>
              </div>

              <div className="summary-grid compact">
                <div className="summary-card">
                  <span>Casos ativos</span>
                  <strong>{defaultClient.activeCaseCount}</strong>
                  <p>{defaultClient.caseCount} caso(s) vinculados ao cliente.</p>
                </div>
                <div className="summary-card">
                  <span>Agenda futura</span>
                  <strong>{defaultClient.upcomingAppointmentsCount}</strong>
                  <p>Compromissos conectados a esse atendimento.</p>
                </div>
                <div className="summary-card">
                  <span>Pendencias</span>
                  <strong>{defaultClient.pendingDocumentRequestsCount}</strong>
                  <p>Solicitacoes documentais ainda abertas.</p>
                </div>
              </div>

              <div className="form-actions">
                <Link className="button secondary" href={buildInternalCasesHref(defaultClient.id)}>
                  Ver casos deste cliente
                </Link>
                <Link className="button secondary" href={buildInternalClientHref(defaultClient.id)}>
                  Abrir ficha do cliente
                </Link>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Ainda nao ha clientes cadastrados para abrir um caso. Conclua um cadastro primeiro e volte para este fluxo.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Abrir novo caso"
          description="Abertura direta, com prioridade, visibilidade e notificacao alinhadas desde o primeiro movimento."
        >
          {overview.clientOptions.length ? (
            <form action={createInternalCaseAction} className="stack">
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="case-client-id">Cliente</label>
                  <select
                    id="case-client-id"
                    name="clientId"
                    defaultValue={defaultClient?.id || undefined}
                    required
                  >
                    {overview.clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName} - {client.statusLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="case-area">Area</label>
                  <select id="case-area" name="area" required defaultValue="previdenciario">
                    {caseAreas.map((area) => (
                      <option key={area} value={area}>
                        {caseAreaLabels[area]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="case-priority">Prioridade</label>
                  <select id="case-priority" name="priority" required defaultValue="normal">
                    {casePriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {casePriorityLabels[priority]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="case-title">Titulo do caso</label>
                  <input id="case-title" name="title" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="case-status">Status inicial</label>
                  <select id="case-status" name="status" required defaultValue="triagem">
                    {caseStatuses.map((status) => (
                      <option key={status} value={status}>
                        {caseStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="case-summary">Resumo inicial</label>
                  <textarea
                    id="case-summary"
                    name="summary"
                    placeholder="Contexto inicial, objetivo do atendimento e primeiro proximo passo."
                  />
                </div>
              </div>
              <label className="checkbox-row" htmlFor="case-visible-to-client">
                <input
                  id="case-visible-to-client"
                  name="visibleToClient"
                  type="checkbox"
                  defaultChecked
                />
                Mostrar o novo caso na area do cliente
              </label>
              <label className="checkbox-row" htmlFor="case-should-notify-client">
                <input
                  id="case-should-notify-client"
                  name="shouldNotifyClient"
                  type="checkbox"
                  defaultChecked
                />
                Preparar notificacao para a abertura do caso
              </label>
              <div className="notice">
                Depois da criacao, o fluxo segue para a pagina propria do caso para editar dados, status e andamento sem voltar ao dashboard.
              </div>
              <div className="form-actions">
                <FormSubmitButton pendingLabel="Abrindo caso...">
                  Abrir caso
                </FormSubmitButton>
                <Link className="button secondary" href={buildInternalCasesHref(selectedClientId || null)}>
                  Cancelar
                </Link>
              </div>
            </form>
          ) : (
            <p className="empty-state">
              Nenhum cliente cadastrado disponivel. Use o painel para cadastrar o primeiro cliente e retorne para abrir o caso.
            </p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
