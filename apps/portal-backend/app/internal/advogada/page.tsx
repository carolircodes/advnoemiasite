import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  caseAreas,
  clientStatusLabels,
  clientStatuses,
  formatPortalDateTime,
  portalEventTypeLabels,
  portalEventTypes
} from "@/lib/domain/portal";
import { createClientWithInvite } from "@/lib/services/create-client";
import { getStaffOverview } from "@/lib/services/dashboard";
import { registerPortalEvent } from "@/lib/services/register-event";

function buildDefaultDateTimeValue() {
  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "cliente-cadastrado":
      return "Cliente criado com sucesso. O caso inicial, o historico base e a fila de convite ja ficaram registrados.";
    case "atualizacao-registrada":
      return "Atualizacao do caso registrada. O painel interno e a area do cliente ja passam a refletir a nova informacao.";
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

export default async function InternalLawyerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const overview = await getStaffOverview();
  const params = await searchParams;
  const error = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const success = typeof params.success === "string" ? getSuccessMessage(params.success) : "";
  const hasCases = overview.caseOptions.length > 0;

  return (
    <AppFrame
      eyebrow="Painel interno"
      title={`Operacao interna da equipe - ${profile.full_name}`}
      description="Cadastro de clientes, acompanhamento real do caso e fila transacional preparados em uma unica operacao."
      actions={[
        { href: "/api/internal/clients", label: "API de clientes", tone: "secondary" },
        { href: "/api/internal/events", label: "API de atualizacoes", tone: "secondary" },
        { href: "/documentos", label: "Central de documentos", tone: "secondary" }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? <div className="success-notice">{success}</div> : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span>Clientes recentes</span>
          <strong>{overview.latestClients.length}</strong>
        </div>
        <div className="metric-card">
          <span>Casos disponiveis</span>
          <strong>{overview.caseOptions.length}</strong>
        </div>
        <div className="metric-card">
          <span>Atualizacoes recentes</span>
          <strong>{overview.latestEvents.length}</strong>
        </div>
        <div className="metric-card">
          <span>E-mails pendentes</span>
          <strong>{overview.pendingNotifications}</strong>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Cadastrar cliente"
          description="A equipe cria o cadastro interno, abre o caso inicial e deixa o convite de primeiro acesso pronto sem ajuste manual."
        >
          <form action={createClientAction} className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="fullName">Nome completo</label>
                <input id="fullName" name="fullName" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="field">
                <label htmlFor="cpf">CPF</label>
                <input id="cpf" name="cpf" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="phone">Telefone</label>
                <input id="phone" name="phone" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="caseArea">Area do caso</label>
                <select id="caseArea" name="caseArea" required>
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
                <textarea id="notes" name="notes" />
              </div>
            </div>
            <div className="notice">
              O e-mail cadastrado vira o login oficial do portal. O convite segue para o Mailpit local e o caso inicial ja nasce vinculado ao cliente.
            </div>
            <div className="form-actions">
              <button className="button" type="submit">
                Cadastrar cliente e enviar convite
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Registrar atualizacao do caso"
          description="A advogada registra o andamento real do caso. A mesma base alimenta o painel interno, o historico do cliente e a fila para notificacao futura."
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
                  placeholder="Se ficar em branco, o portal usa a descricao como resumo visivel."
                />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="visibleToClient">
              <input
                id="visibleToClient"
                name="visibleToClient"
                type="checkbox"
                defaultChecked
              />
              Atualizacao visivel para o cliente
            </label>
            <label className="checkbox-row" htmlFor="shouldNotifyClient">
              <input
                id="shouldNotifyClient"
                name="shouldNotifyClient"
                type="checkbox"
                defaultChecked
              />
              Registrar item na fila de e-mail para esta atualizacao
            </label>
            <div className="notice">
              Se a atualizacao for interna, ela continua no historico operacional sem aparecer para o cliente. Se for visivel, o portal ja deixa a notificacao pronta na outbox.
            </div>
            <div className="form-actions">
              <button className="button" type="submit" disabled={!hasCases}>
                Registrar atualizacao
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Casos recentes"
          description="Cada caso ja pode receber novas atualizacoes de acompanhamento sem depender de ajuste manual no banco."
        >
          {overview.latestCases.length ? (
            <ul className="update-feed compact">
              {overview.latestCases.map((caseItem) => (
                <li key={caseItem.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{caseItem.title}</strong>
                      <span className="item-meta">{caseItem.clientName}</span>
                    </div>
                    <span className="tag soft">{caseItem.statusLabel}</span>
                  </div>
                  <div className="pill-row">
                    <span className="pill muted">
                      {caseAreaLabels[caseItem.area as keyof typeof caseAreaLabels]}
                    </span>
                    <span className="pill muted">{formatPortalDateTime(caseItem.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os casos abertos pela equipe aparecerao aqui.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Ultimas atualizacoes registradas"
          description="O historico interno mostra quais atualizacoes ja estao liberadas para o cliente e quais ja entraram na fila de e-mail."
        >
          {overview.latestEvents.length ? (
            <ul className="update-feed">
              {overview.latestEvents.map((event) => (
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
                      {event.should_notify_client ? "E-mail preparado" : "Sem e-mail"}
                    </span>
                  </div>
                  <span className="item-meta">{formatPortalDateTime(event.occurred_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              As atualizacoes de acompanhamento aparecerao aqui depois do primeiro registro.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Clientes cadastrados recentemente"
          description="A lista abaixo ja vem da base real do portal e ajuda a acompanhar os convites enviados."
        >
          {overview.latestClients.length ? (
            <ul className="list">
              {overview.latestClients.map((client) => (
                <li key={client.id}>
                  <div className="item-head">
                    <strong>{client.fullName}</strong>
                    <span className="tag soft">{client.statusLabel}</span>
                  </div>
                  <span className="item-meta">{client.email}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os primeiros clientes cadastrados aparecerao aqui.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Fila de notificacoes"
          description="Cada convite ou atualizacao preparada para o cliente ja gera um registro persistido na outbox para o passo de envio automatico."
        >
          {overview.outboxPreview.length ? (
            <ul className="list">
              {overview.outboxPreview.map((item) => (
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
              A fila sera alimentada pelos convites e pelas atualizacoes visiveis com notificacao habilitada.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Documentos recentes"
          description="A central de documentos parte da mesma base e ja acompanha status e visibilidade por caso."
        >
          {overview.latestDocuments.length ? (
            <ul className="update-feed">
              {overview.latestDocuments.map((document) => (
                <li key={document.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{document.file_name}</strong>
                      <span className="item-meta">{document.caseTitle}</span>
                    </div>
                    <span className="tag soft">{document.category}</span>
                  </div>
                  <div className="pill-row">
                    <span
                      className={`pill ${
                        document.status === "recebido" || document.status === "revisado"
                          ? "success"
                          : "warning"
                      }`}
                    >
                      {document.statusLabel}
                    </span>
                    <span
                      className={`pill ${
                        document.visibility === "client" ? "success" : "muted"
                      }`}
                    >
                      {document.visibility === "client" ? "Visivel ao cliente" : "Uso interno"}
                    </span>
                  </div>
                  <span className="item-meta">
                    {formatPortalDateTime(document.document_date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Os documentos registrados para os casos aparecerao aqui.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Pendencias documentais"
          description="As solicitacoes abertas aparecem aqui e tambem ficam visiveis na central de documentos."
        >
          {overview.latestDocumentRequests.length ? (
            <ul className="update-feed">
              {overview.latestDocumentRequests.map((request) => (
                <li key={request.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{request.title}</strong>
                      <span className="item-meta">{request.caseTitle}</span>
                    </div>
                    <span className="tag soft">{request.statusLabel}</span>
                  </div>
                  <div className="pill-row">
                    <span
                      className={`pill ${
                        request.visible_to_client ? "success" : "muted"
                      }`}
                    >
                      {request.visible_to_client ? "Cliente acompanha" : "Somente equipe"}
                    </span>
                    <span className="pill muted">
                      {request.due_at
                        ? `Prazo ${formatPortalDateTime(request.due_at)}`
                        : "Sem prazo definido"}
                    </span>
                  </div>
                  <span className="item-meta">
                    Aberta em {formatPortalDateTime(request.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              As solicitacoes documentais abertas aparecerao aqui.
            </p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
