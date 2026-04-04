import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { isStaffRole, requireProfile } from "@/lib/auth/guards";
import {
  appointmentStatuses,
  appointmentStatusLabels,
  appointmentTypes,
  appointmentTypeLabels,
  formatPortalDateTime
} from "@/lib/domain/portal";
import { getClientWorkspace, getStaffOverview } from "@/lib/services/dashboard";
import { registerCaseAppointment } from "@/lib/services/manage-appointments";

function buildDefaultDateTimeValue(offsetHours = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
  const localValue = new Date(future.getTime() - future.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "compromisso-registrado":
      return "Compromisso registrado com sucesso. O caso, o historico e a fila de notificacao ficaram alinhados.";
    default:
      return "";
  }
}

async function registerAppointmentAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await registerCaseAppointment(
      {
        caseId: formData.get("caseId"),
        title: formData.get("title"),
        appointmentType: formData.get("appointmentType"),
        description: formData.get("description"),
        startsAt: formData.get("startsAt"),
        status: formData.get("status"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-registrar";
    redirect(`/agenda?error=${message}`);
  }

  redirect("/agenda?success=compromisso-registrado");
}

export default async function AgendaPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["cliente", "advogada", "admin"]);

  if (isStaffRole(profile.role)) {
    const overview = await getStaffOverview();
    const params = searchParams ? await searchParams : {};
    const rawError =
      typeof params.error === "string" ? decodeURIComponent(params.error) : "";
    const error = getAccessMessage(rawError) || rawError;
    const success =
      typeof params.success === "string" ? getSuccessMessage(params.success) : "";
    const hasCases = overview.caseOptions.length > 0;
    const now = new Date();
    const upcomingAppointments = overview.latestAppointments.filter(
      (appointment) => new Date(appointment.starts_at) >= now
    );
    const recentHistory = [...overview.latestAppointments]
      .filter((appointment) => new Date(appointment.starts_at) < now)
      .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
      .slice(0, 6);

    return (
      <AppFrame
        eyebrow="Agenda"
        title="Agenda real de compromissos e proximos passos."
        description="A equipe registra compromissos, prazos e retornos vinculados ao caso, com visibilidade controlada para o cliente e preparo de notificacoes futuras."
        actions={[
          { href: "/api/internal/appointments", label: "API de agenda", tone: "secondary" },
          { href: "/internal/advogada", label: "Painel interno", tone: "secondary" }
        ]}
      >
        {error ? <div className="error-notice">{error}</div> : null}
        {success ? <div className="success-notice">{success}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Proximos compromissos</span>
            <strong>{overview.upcomingAppointmentsCount}</strong>
          </div>
          <div className="metric-card">
            <span>Casos disponiveis</span>
            <strong>{overview.caseOptions.length}</strong>
          </div>
          <div className="metric-card">
            <span>Solicitacoes abertas</span>
            <strong>{overview.openDocumentRequestsCount}</strong>
          </div>
          <div className="metric-card">
            <span>E-mails pendentes</span>
            <strong>{overview.pendingNotifications}</strong>
          </div>
        </div>

        <div className="grid two">
          <SectionCard
            title="Registrar compromisso ou proximo passo"
            description="Use o mesmo fluxo para reuniao, retorno, prazo, audiencia ou ligacao, sempre vinculado ao caso e ao cliente correto."
          >
            <form action={registerAppointmentAction} className="stack">
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
                <div className="field-full">
                  <label htmlFor="title">Titulo</label>
                  <input id="title" name="title" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="appointmentType">Tipo de compromisso</label>
                  <select
                    id="appointmentType"
                    name="appointmentType"
                    required
                    defaultValue="reuniao"
                  >
                    {appointmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {appointmentTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" required defaultValue="scheduled">
                    {appointmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {appointmentStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="startsAt">Data e hora</label>
                  <input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={buildDefaultDateTimeValue()}
                    required
                  />
                </div>
                <div className="field-full">
                  <label htmlFor="description">Descricao curta</label>
                  <textarea id="description" name="description" />
                </div>
              </div>
              <label className="checkbox-row" htmlFor="visibleToClient">
                <input
                  id="visibleToClient"
                  name="visibleToClient"
                  type="checkbox"
                  defaultChecked
                />
                Compromisso visivel para o cliente
              </label>
              <label className="checkbox-row" htmlFor="shouldNotifyClient">
                <input
                  id="shouldNotifyClient"
                  name="shouldNotifyClient"
                  type="checkbox"
                  defaultChecked
                />
                Preparar notificacao por e-mail para este compromisso
              </label>
              <div className="notice">
                Quando o item for visivel, a agenda ja registra o evento no historico do caso e deixa a outbox pronta para lembrete futuro.
              </div>
              <div className="form-actions">
                <button className="button" type="submit" disabled={!hasCases}>
                  Registrar compromisso
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Proximos compromissos"
            description="Acompanhe reunioes, prazos e retornos futuros ja registrados para os casos."
          >
            {upcomingAppointments.length ? (
              <ul className="update-feed">
                {upcomingAppointments.slice(0, 8).map((appointment) => (
                  <li key={appointment.id} className="update-card featured">
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
                      <span
                        className={`pill ${
                          appointment.status === "scheduled" || appointment.status === "confirmed"
                            ? "success"
                            : "muted"
                        }`}
                      >
                        {appointment.statusLabel}
                      </span>
                      <span
                        className={`pill ${
                          appointment.visible_to_client ? "success" : "muted"
                        }`}
                      >
                        {appointment.visible_to_client ? "Cliente acompanha" : "Somente equipe"}
                      </span>
                    </div>
                    <span className="item-meta">
                      {formatPortalDateTime(appointment.starts_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Os proximos compromissos cadastrados para os casos aparecerao aqui.
              </p>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Historico recente da agenda"
          description="Itens passados ou concluidos continuam vinculados ao caso e ajudam a acompanhar a linha do tempo do atendimento."
        >
          {recentHistory.length ? (
            <ul className="update-feed">
              {recentHistory.map((appointment) => (
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
                    <span
                      className={`pill ${
                        appointment.status === "completed" ? "success" : "warning"
                      }`}
                    >
                      {appointment.statusLabel}
                    </span>
                    <span className="pill muted">
                      {formatPortalDateTime(appointment.starts_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              O historico recente da agenda aparecera aqui assim que os primeiros itens forem registrados.
            </p>
          )}
        </SectionCard>
      </AppFrame>
    );
  }

  const workspace = await getClientWorkspace(profile);
  const params = searchParams ? await searchParams : {};
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const now = new Date();
  const upcomingAppointments = workspace.appointments.filter(
    (appointment) => new Date(appointment.starts_at) >= now
  );
  const recentHistory = [...workspace.appointments]
    .filter((appointment) => new Date(appointment.starts_at) < now)
    .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
    .slice(0, 8);

  return (
    <AppFrame
      eyebrow="Agenda"
      title="Compromissos e proximos passos do seu caso."
      description="Aqui voce acompanha compromissos futuros, prazos e o historico recente liberado pela equipe para o seu atendimento."
    >
      {error ? <div className="error-notice">{error}</div> : null}
      <div className="metric-grid">
        <div className="metric-card">
          <span>Proximos compromissos</span>
          <strong>{upcomingAppointments.length}</strong>
        </div>
        <div className="metric-card">
          <span>Historico recente</span>
          <strong>{recentHistory.length}</strong>
        </div>
        <div className="metric-card">
          <span>Total visivel</span>
          <strong>{workspace.appointments.length}</strong>
        </div>
        <div className="metric-card">
          <span>Proximo item</span>
          <strong>
            {upcomingAppointments[0]
              ? formatPortalDateTime(upcomingAppointments[0].starts_at)
              : "Sem agenda"}
          </strong>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Proximos compromissos"
          description="Somente itens visiveis ao cliente aparecem aqui, ordenados da data mais proxima para a mais distante."
        >
          {upcomingAppointments.length ? (
            <ul className="update-feed">
              {upcomingAppointments.map((appointment) => (
                <li key={appointment.id} className="update-card featured">
                  <div className="update-head">
                    <div>
                      <strong>{appointment.title}</strong>
                      <span className="item-meta">{appointment.caseTitle}</span>
                    </div>
                    <span className="tag soft">{appointment.typeLabel}</span>
                  </div>
                  <p className="update-body">
                    {appointment.description || "Compromisso registrado pela equipe no portal."}
                  </p>
                  <div className="pill-row">
                    <span className="pill success">{appointment.statusLabel}</span>
                    <span className="pill muted">
                      {formatPortalDateTime(appointment.starts_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Ainda nao ha compromissos visiveis vinculados ao seu caso.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Historico recente"
          description="Compromissos passados ou concluidos continuam disponiveis para consulta."
        >
          {recentHistory.length ? (
            <ul className="update-feed">
              {recentHistory.map((appointment) => (
                <li key={appointment.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{appointment.title}</strong>
                      <span className="item-meta">{appointment.caseTitle}</span>
                    </div>
                    <span className="tag soft">{appointment.typeLabel}</span>
                  </div>
                  <p className="update-body">
                    {appointment.description || "Item de agenda registrado pela equipe."}
                  </p>
                  <div className="pill-row">
                    <span
                      className={`pill ${
                        appointment.status === "completed" ? "success" : "warning"
                      }`}
                    >
                      {appointment.statusLabel}
                    </span>
                    <span className="pill muted">
                      {formatPortalDateTime(appointment.starts_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              O historico recente da agenda aparecera aqui depois dos primeiros compromissos.
            </p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
