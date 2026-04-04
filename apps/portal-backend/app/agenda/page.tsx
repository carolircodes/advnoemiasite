import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { isStaffRole, requireProfile } from "@/lib/auth/guards";
import {
  appointmentChangeLabels,
  appointmentStatuses,
  appointmentStatusLabels,
  appointmentTypes,
  appointmentTypeLabels,
  formatPortalDateTime
} from "@/lib/domain/portal";
import { getClientWorkspace, getStaffOverview } from "@/lib/services/dashboard";
import {
  cancelCaseAppointment,
  registerCaseAppointment,
  updateCaseAppointment
} from "@/lib/services/manage-appointments";

function buildDefaultDateTimeValue(offsetHours = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
  const localValue = new Date(future.getTime() - future.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function formatDateTimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return buildDefaultDateTimeValue();
  }

  const localValue = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function isUpcomingAppointment(
  appointment: { starts_at: string; status: string },
  now: Date
) {
  return (
    new Date(appointment.starts_at) >= now &&
    appointment.status !== "cancelled" &&
    appointment.status !== "completed"
  );
}

function getChangedFieldLabel(field: string) {
  switch (field) {
    case "title":
      return "titulo";
    case "description":
      return "descricao";
    case "appointmentType":
      return "tipo";
    case "startsAt":
      return "data/hora";
    case "status":
      return "status";
    case "visibleToClient":
      return "visibilidade";
    default:
      return field;
  }
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "compromisso-registrado":
      return "Compromisso registrado com sucesso. O caso, o historico e a fila de notificacao ficaram alinhados.";
    case "compromisso-atualizado":
      return "Compromisso atualizado com sucesso. O historico, a auditoria e a fila futura ficaram sincronizados.";
    case "compromisso-cancelado":
      return "Compromisso cancelado com sucesso. O historico e a preparacao para notificacao foram atualizados.";
    default:
      return "";
  }
}

function getClientAppointmentMessage(appointment: {
  status: string;
  description?: string;
  starts_at: string;
}) {
  if (appointment.status === "cancelled") {
    return appointment.description
      ? `Este compromisso foi cancelado pela equipe. ${appointment.description}`
      : "Este compromisso foi cancelado pela equipe. Se um novo horario for definido, ele aparecera novamente na sua agenda.";
  }

  if (appointment.status === "completed") {
    return appointment.description
      ? `Este compromisso ja foi concluido. ${appointment.description}`
      : "Este compromisso ja foi concluido e continua disponivel para consulta.";
  }

  return (
    appointment.description || "Compromisso registrado pela equipe no portal."
  );
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

async function updateAppointmentAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await updateCaseAppointment(
      {
        appointmentId: formData.get("appointmentId"),
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
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-atualizar";
    redirect(`/agenda?error=${message}`);
  }

  redirect("/agenda?success=compromisso-atualizado");
}

async function cancelAppointmentAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await cancelCaseAppointment(
      {
        appointmentId: formData.get("appointmentId"),
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-cancelar";
    redirect(`/agenda?error=${message}`);
  }

  redirect("/agenda?success=compromisso-cancelado");
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
    const upcomingAppointments = overview.latestAppointments.filter((appointment) =>
      isUpcomingAppointment(appointment, now)
    );
    const recentHistory = [...overview.latestAppointments]
      .filter((appointment) => !isUpcomingAppointment(appointment, now))
      .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
      .slice(0, 6);

    return (
      <AppFrame
        eyebrow="Agenda"
        title="Agenda real de compromissos, reagendamentos e cancelamentos."
        description="A equipe registra compromissos, reprograma datas, cancela quando necessario e mantem a trilha operacional e a comunicacao futura alinhadas ao caso."
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
            <span>Alteracoes recentes</span>
            <strong>{overview.latestAppointmentHistory.length}</strong>
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
                Quando o item for visivel, a agenda registra criacao, reagendamento ou cancelamento no historico do caso e deixa a outbox pronta para o envio futuro.
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
          title="Editar, reagendar ou cancelar"
          description="Cada formulario abaixo atualiza o compromisso atual, grava a alteracao no historico da agenda e prepara notificacao futura quando a mudanca for relevante para o cliente."
        >
          {overview.latestAppointments.length ? (
            <div className="grid two">
              {overview.latestAppointments.slice(0, 8).map((appointment) => (
                <SectionCard
                  key={appointment.id}
                  title={appointment.title}
                  description={`${appointment.caseTitle} - ${appointment.clientName}`}
                >
                  <div className="pill-row">
                    <span
                      className={`pill ${
                        appointment.status === "cancelled"
                          ? "warning"
                          : appointment.status === "completed"
                            ? "muted"
                            : "success"
                      }`}
                    >
                      {appointment.statusLabel}
                    </span>
                    <span className="pill muted">
                      {formatPortalDateTime(appointment.starts_at)}
                    </span>
                  </div>
                  <form action={updateAppointmentAction} className="stack">
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <div className="fields">
                      <div className="field-full">
                        <label htmlFor={`title-${appointment.id}`}>Titulo</label>
                        <input
                          id={`title-${appointment.id}`}
                          name="title"
                          type="text"
                          defaultValue={appointment.title}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`type-${appointment.id}`}>Tipo</label>
                        <select
                          id={`type-${appointment.id}`}
                          name="appointmentType"
                          defaultValue={appointment.appointment_type}
                          required
                        >
                          {appointmentTypes.map((type) => (
                            <option key={type} value={type}>
                              {appointmentTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`status-${appointment.id}`}>Status</label>
                        <select
                          id={`status-${appointment.id}`}
                          name="status"
                          defaultValue={appointment.status}
                          required
                        >
                          {appointmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {appointmentStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-full">
                        <label htmlFor={`startsAt-${appointment.id}`}>Data e hora</label>
                        <input
                          id={`startsAt-${appointment.id}`}
                          name="startsAt"
                          type="datetime-local"
                          defaultValue={formatDateTimeLocalValue(appointment.starts_at)}
                          required
                        />
                      </div>
                      <div className="field-full">
                        <label htmlFor={`description-${appointment.id}`}>Descricao curta</label>
                        <textarea
                          id={`description-${appointment.id}`}
                          name="description"
                          defaultValue={appointment.description}
                        />
                      </div>
                    </div>
                    <label className="checkbox-row" htmlFor={`visible-${appointment.id}`}>
                      <input
                        id={`visible-${appointment.id}`}
                        name="visibleToClient"
                        type="checkbox"
                        defaultChecked={appointment.visible_to_client}
                      />
                      Compromisso visivel para o cliente
                    </label>
                    <label className="checkbox-row" htmlFor={`notify-${appointment.id}`}>
                      <input
                        id={`notify-${appointment.id}`}
                        name="shouldNotifyClient"
                        type="checkbox"
                        defaultChecked={appointment.visible_to_client}
                      />
                      Registrar notificacao futura para esta alteracao
                    </label>
                    <div className="form-actions">
                      <button className="button" type="submit">
                        Salvar alteracoes
                      </button>
                    </div>
                  </form>
                  <form action={cancelAppointmentAction} className="stack">
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <label
                      className="checkbox-row"
                      htmlFor={`cancel-notify-${appointment.id}`}
                    >
                      <input
                        id={`cancel-notify-${appointment.id}`}
                        name="shouldNotifyClient"
                        type="checkbox"
                        defaultChecked={appointment.visible_to_client}
                      />
                      Preparar notificacao de cancelamento para o cliente
                    </label>
                    <div className="form-actions">
                      <button
                        className="button secondary"
                        type="submit"
                        disabled={appointment.status === "cancelled"}
                      >
                        {appointment.status === "cancelled"
                          ? "Compromisso ja cancelado"
                          : "Cancelar compromisso"}
                      </button>
                    </div>
                  </form>
                </SectionCard>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Os primeiros compromissos editaveis aparecerao aqui assim que forem registrados.
            </p>
          )}
        </SectionCard>

        <div className="grid two">
          <SectionCard
            title="Historico recente da agenda"
            description="Itens passados, concluidos ou cancelados continuam vinculados ao caso e ajudam a acompanhar a linha do tempo do atendimento."
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
                          appointment.status === "completed"
                            ? "success"
                            : appointment.status === "cancelled"
                              ? "warning"
                              : "muted"
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

          <SectionCard
            title="Historico de alteracoes"
            description="Cada criacao, edicao, reagendamento ou cancelamento gera uma trilha persistida para operacao, auditoria e notificacao futura."
          >
            {overview.latestAppointmentHistory.length ? (
              <ul className="update-feed">
                {overview.latestAppointmentHistory.map((item) => (
                  <li key={item.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{item.title}</strong>
                        <span className="item-meta">
                          {item.caseTitle} - {item.clientName}
                        </span>
                      </div>
                      <span className="tag soft">
                        {
                          appointmentChangeLabels[
                            item.change_type as keyof typeof appointmentChangeLabels
                          ]
                        }
                      </span>
                    </div>
                    <div className="pill-row">
                      <span className="pill muted">{item.typeLabel}</span>
                      <span
                        className={`pill ${
                          item.visible_to_client ? "success" : "muted"
                        }`}
                      >
                        {item.visible_to_client ? "Visivel ao cliente" : "Uso interno"}
                      </span>
                    </div>
                    <p className="update-body">
                      {item.changed_fields?.length
                        ? `Campos alterados: ${item.changed_fields
                            .map((field: string) => getChangedFieldLabel(field))
                            .join(", ")}.`
                        : `Alteracao ${item.changeLabel.toLowerCase()} registrada para este compromisso.`}
                    </p>
                    <span className="item-meta">
                      {formatPortalDateTime(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                O historico de alteracoes da agenda aparecera aqui depois da primeira criacao.
              </p>
            )}
          </SectionCard>
        </div>
      </AppFrame>
    );
  }

  const workspace = await getClientWorkspace(profile);
  const params = searchParams ? await searchParams : {};
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const now = new Date();
  const upcomingAppointments = workspace.appointments.filter((appointment) =>
    isUpcomingAppointment(appointment, now)
  );
  const recentHistory = [...workspace.appointments]
    .filter((appointment) => !isUpcomingAppointment(appointment, now))
    .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
    .slice(0, 8);

  return (
    <AppFrame
      eyebrow="Agenda"
      title="Compromissos e proximos passos do seu caso."
      description="Aqui voce acompanha compromissos futuros, reagendamentos, cancelamentos e o historico recente liberado pela equipe para o seu atendimento."
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
                  <p className="update-body">{getClientAppointmentMessage(appointment)}</p>
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
          description="Compromissos concluidos, passados ou cancelados continuam disponiveis para consulta sem confundir a sua agenda futura."
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
                  <p className="update-body">{getClientAppointmentMessage(appointment)}</p>
                  <div className="pill-row">
                    <span
                      className={`pill ${
                        appointment.status === "completed"
                          ? "success"
                          : appointment.status === "cancelled"
                            ? "warning"
                            : "muted"
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
