import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  caseAreas,
  clientStatusLabels,
  clientStatuses,
  portalEventTypeLabels,
  portalEventTypes
} from "@/lib/domain/portal";
import { createClientWithInvite } from "@/lib/services/create-client";
import { getStaffOverview } from "@/lib/services/dashboard";
import { registerPortalEvent } from "@/lib/services/register-event";

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

  redirect("/internal/advogada?success=evento-registrado");
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
  const success = typeof params.success === "string" ? params.success : "";

  return (
    <AppFrame
      eyebrow="Painel interno"
      title={`Operação interna da equipe - ${profile.full_name}`}
      description="O fluxo real parte daqui: cadastro de clientes, abertura de casos, registro de eventos e fila de notificações."
      actions={[
        { href: "/api/internal/clients", label: "API de clientes", tone: "secondary" },
        { href: "/api/internal/events", label: "API de eventos", tone: "secondary" }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? (
        <div className="success-notice">
          Operação concluída. O painel já registrou a ação na base e deixou a fila de
          notificação pronta para o próximo passo.
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span>Clientes recentes</span>
          <strong>{overview.latestClients.length}</strong>
        </div>
        <div className="metric-card">
          <span>Casos recentes</span>
          <strong>{overview.latestCases.length}</strong>
        </div>
        <div className="metric-card">
          <span>Eventos do portal</span>
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
          description="A advogada cria o cadastro interno e o sistema prepara o convite por e-mail para o primeiro acesso."
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
                <label htmlFor="caseArea">Área do caso</label>
                <select id="caseArea" name="caseArea" required>
                  {caseAreas.map((area) => (
                    <option key={area} value={area}>
                      {caseAreaLabels[area]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" required defaultValue="convite-enviado">
                  {clientStatuses.map((status) => (
                    <option key={status} value={status}>
                      {clientStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-full">
                <label htmlFor="notes">Observações</label>
                <textarea id="notes" name="notes" />
              </div>
            </div>
            <div className="notice">
              O e-mail é o login oficial do portal. Depois do cadastro, o cliente recebe
              um convite para definir a própria senha.
            </div>
            <div className="form-actions">
              <button className="button" type="submit">
                Cadastrar cliente e enviar convite
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Registrar evento do portal"
          description="Esta base já suporta eventos que poderão disparar e-mails automáticos no próximo passo."
        >
          <form action={registerEventAction} className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="caseId">Caso</label>
                <select id="caseId" name="caseId" required disabled={!overview.latestCases.length}>
                  {overview.latestCases.length ? (
                    overview.latestCases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.title} · {caseItem.id.slice(0, 8)}
                      </option>
                    ))
                  ) : (
                    <option value="">Cadastre um cliente para gerar o primeiro caso</option>
                  )}
                </select>
              </div>
              <div className="field">
                <label htmlFor="eventType">Tipo de evento</label>
                <select id="eventType" name="eventType" required>
                  {portalEventTypes.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {portalEventTypeLabels[eventType]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="title">Título</label>
                <input id="title" name="title" type="text" required />
              </div>
              <div className="field-full">
                <label htmlFor="description">Descrição interna</label>
                <textarea id="description" name="description" />
              </div>
              <div className="field-full">
                <label htmlFor="publicSummary">Resumo visível ao cliente</label>
                <textarea id="publicSummary" name="publicSummary" />
              </div>
            </div>
            <label className="checkbox-row" htmlFor="shouldNotifyClient">
              <input
                id="shouldNotifyClient"
                name="shouldNotifyClient"
                type="checkbox"
                defaultChecked
              />
              Preparar e-mail automático para o cliente
            </label>
            <div className="notice">
              Cada caso criado pela equipe já aparece aqui como opção e pode gerar
              histórico e notificação automática futura.
            </div>
            <div className="form-actions">
              <button className="button" type="submit" disabled={!overview.latestCases.length}>
                Registrar evento no histórico
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Clientes cadastrados recentemente"
          description="A visão abaixo já vem da base relacional do portal."
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
            <p className="empty-state">Os primeiros clientes cadastrados aparecerão aqui.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Casos recentes"
          description="Use estes identificadores para conferir a persistência do fluxo completo."
        >
          {overview.latestCases.length ? (
            <ul className="list">
              {overview.latestCases.map((caseItem) => (
                <li key={caseItem.id}>
                  <div className="item-head">
                    <strong>{caseItem.title}</strong>
                    <span className="tag soft">{caseItem.status}</span>
                  </div>
                  <span className="item-meta">{caseItem.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os casos abertos pela equipe aparecerão aqui.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Eventos recentes"
          description="Toda atualização registrada entra no histórico do portal."
        >
          {overview.latestEvents.length ? (
            <ul className="list">
              {overview.latestEvents.map((event) => (
                <li key={event.id}>
                  <div className="item-head">
                    <strong>{event.title}</strong>
                    <span className="tag soft">{event.eventLabel}</span>
                  </div>
                  <span className="item-meta">{event.occurred_at}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os eventos do portal aparecerão aqui depois do primeiro registro.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Fila de notificações"
          description="Cada evento futuro pode gerar um item em fila para envio transacional por e-mail."
        >
          {overview.outboxPreview.length ? (
            <ul className="list">
              {overview.outboxPreview.map((item) => (
                <li key={item.id}>
                  <div className="item-head">
                    <strong>{item.template_key}</strong>
                    <span className="tag soft">{item.status}</span>
                  </div>
                  <span className="item-meta">{item.created_at}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">A fila será alimentada pelos convites e eventos do portal.</p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
