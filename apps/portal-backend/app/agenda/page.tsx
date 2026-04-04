import { redirect } from "next/navigation";
import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { ProductEventBeacon } from "@/components/product-event-beacon";
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
import { buildInternalClientHref, buildInternalDocumentsHref } from "@/lib/navigation";
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

function isWithinDateRange(
  value: string | null | undefined,
  dateFrom: string,
  dateTo: string
) {
  if (!value) {
    return !dateFrom && !dateTo;
  }

  const current = new Date(value);

  if (Number.isNaN(current.getTime())) {
    return false;
  }

  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`);

    if (current < start) {
      return false;
    }
  }

  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59.999`);

    if (current > end) {
      return false;
    }
  }

  return true;
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
    const rawError = getStringParam(params.error);
    const decodedError = rawError ? decodeURIComponent(rawError) : "";
    const query = getStringParam(params.q);
    const selectedStatus = getStringParam(params.status);
    const selectedClientId = getStringParam(params.clientId);
    const selectedCaseId = getStringParam(params.caseId);
    const dateFrom = getStringParam(params.dateFrom);
    const dateTo = getStringParam(params.dateTo);
    const scope = getStringParam(params.scope, "all");
    const sort = getStringParam(params.sort, "nearest");
    const hasFilters = !!(
      query ||
      selectedStatus ||
      selectedClientId ||
      selectedCaseId ||
      dateFrom ||
      dateTo ||
      scope !== "all" ||
      sort !== "nearest"
    );
    const error = getAccessMessage(decodedError) || decodedError;
    const success =
      typeof params.success === "string" ? getSuccessMessage(params.success) : "";
    const selectedClient =
      overview.clientOptions.find((client) => client.id === selectedClientId) || null;
    const caseOptionsForAgenda = overview.caseOptions.filter(
      (caseItem) => !selectedClientId || caseItem.clientId === selectedClientId
    );
    const selectedCase =
      overview.caseOptions.find((caseItem) => caseItem.id === selectedCaseId) ||
      (selectedClientId
        ? caseOptionsForAgenda.find((caseItem) => caseItem.status !== "concluido") ||
          caseOptionsForAgenda[0] ||
          null
        : null);
    const defaultCaseId = selectedCase?.id || caseOptionsForAgenda[0]?.id || undefined;
    const hasCases = caseOptionsForAgenda.length > 0;
    const now = new Date();
    const filteredAppointments = [...overview.latestAppointments]
      .filter(
        (appointment) =>
          matchesSearch(query, [
            appointment.title,
            appointment.caseTitle,
            appointment.clientName,
            appointment.typeLabel,
            appointment.statusLabel
          ]) &&
          (!selectedStatus || appointment.status === selectedStatus) &&
          (!selectedClientId || appointment.client_id === selectedClientId) &&
          (!selectedCaseId || appointment.case_id === selectedCaseId) &&
          isWithinDateRange(appointment.starts_at, dateFrom, dateTo) &&
          (scope === "all" ||
            (scope === "upcoming" && isUpcomingAppointment(appointment, now)) ||
            (scope === "history" && !isUpcomingAppointment(appointment, now)))
      )
      .sort((left, right) =>
        sort === "recent"
          ? right.starts_at.localeCompare(left.starts_at)
          : left.starts_at.localeCompare(right.starts_at)
      );
    const upcomingAppointments = filteredAppointments
      .filter((appointment) => isUpcomingAppointment(appointment, now))
      .slice(0, 8);
    const recentHistory = filteredAppointments
      .filter((appointment) => !isUpcomingAppointment(appointment, now))
      .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
      .slice(0, 6);
    const filteredAppointmentHistory = overview.latestAppointmentHistory
      .filter(
        (item) =>
          matchesSearch(query, [
            item.title,
            item.caseTitle,
            item.clientName,
            item.changeLabel,
            item.typeLabel
          ]) &&
          (!selectedClientId || item.client_id === selectedClientId) &&
          (!selectedCaseId || item.case_id === selectedCaseId) &&
          isWithinDateRange(item.created_at, dateFrom, dateTo)
      )
      .slice(0, 10);
    const sameDayAppointments = upcomingAppointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.starts_at);

      return (
        appointmentDate.getFullYear() === now.getFullYear() &&
        appointmentDate.getMonth() === now.getMonth() &&
        appointmentDate.getDate() === now.getDate()
      );
    });
    const next48HoursCount = upcomingAppointments.filter((appointment) => {
      const startsAt = new Date(appointment.starts_at).getTime();
      const distance = startsAt - now.getTime();

      return distance >= 0 && distance <= 48 * 60 * 60 * 1000;
    }).length;
    const visibleToClientCount = upcomingAppointments.filter(
      (appointment) => appointment.visible_to_client
    ).length;

    return (
      <AppFrame
        eyebrow="Agenda"
        title="Central de agenda para compromissos, prazos e proximos passos."
        description="A equipe acompanha aqui o ciclo completo da agenda do caso, com criacao, reagendamento, cancelamento e historico bem organizados."
        utilityContent={
          <PortalSessionBanner
            role={profile.role}
            fullName={profile.full_name}
            email={profile.email}
            workspaceLabel="Agenda interna protegida"
            workspaceHint="Sessao interna ativa para operar compromissos, prazos e retornos."
          />
        }
        navigation={[
          {
            href: selectedClient ? buildInternalClientHref(selectedClient.id) : "/internal/advogada",
            label: selectedClient ? "Cliente" : "Painel"
          },
          {
            href: selectedClient
              ? buildInternalDocumentsHref(selectedClient.id, selectedCase?.id || null)
              : "/documentos",
            label: "Documentos"
          },
          { href: "/agenda", label: "Agenda", active: true }
        ]}
        highlights={[
          { label: "Hoje", value: String(sameDayAppointments.length) },
          { label: "Proximas 48h", value: String(next48HoursCount) },
          { label: "Casos filtrados", value: String(caseOptionsForAgenda.length) },
          {
            label: "Visiveis ao cliente",
            value: String(visibleToClientCount)
          },
          { label: "Notificacoes pendentes", value: String(overview.pendingNotifications) }
        ]}
        actions={[
          { href: "#registrar-compromisso", label: "Criar compromisso" },
          { href: "#editar-compromisso", label: "Editar agenda", tone: "secondary" },
          {
            href: selectedClient ? buildInternalClientHref(selectedClient.id) : "/internal/advogada#clientes-operacao",
            label: "Abrir ficha",
            tone: "secondary"
          }
        ]}
      >
        {error ? <div className="error-notice">{error}</div> : null}
        {success ? <div className="success-notice">{success}</div> : null}

        <SectionCard
          title="Busca e filtros"
          description="Filtre compromissos por cliente, caso, status ou periodo para localizar rapidamente o que importa."
        >
          <form className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="agenda-q">Buscar compromisso, caso ou cliente</label>
                <input
                  id="agenda-q"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Titulo, tipo, caso ou nome do cliente"
                />
              </div>
              <div className="field">
                <label htmlFor="agenda-status">Status</label>
                <select id="agenda-status" name="status" defaultValue={selectedStatus}>
                  <option value="">Todos os status</option>
                  {appointmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {appointmentStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-client">Cliente</label>
                <select id="agenda-client" name="clientId" defaultValue={selectedClientId}>
                  <option value="">Todos os clientes</option>
                  {overview.clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-case">Caso</label>
                <select id="agenda-case" name="caseId" defaultValue={selectedCaseId}>
                  <option value="">Todos os casos</option>
                  {caseOptionsForAgenda.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-scope">Escopo</label>
                <select id="agenda-scope" name="scope" defaultValue={scope}>
                  <option value="all">Tudo</option>
                  <option value="upcoming">Somente proximos</option>
                  <option value="history">Somente historico</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-sort">Ordenacao</label>
                <select id="agenda-sort" name="sort" defaultValue={sort}>
                  <option value="nearest">Mais proximos primeiro</option>
                  <option value="recent">Mais recentes primeiro</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-date-from">De</label>
                <input id="agenda-date-from" name="dateFrom" type="date" defaultValue={dateFrom} />
              </div>
              <div className="field">
                <label htmlFor="agenda-date-to">Ate</label>
                <input id="agenda-date-to" name="dateTo" type="date" defaultValue={dateTo} />
              </div>
            </div>
            {selectedClient || selectedCase ? (
              <div className="notice">
                {selectedClient
                  ? `${selectedClient.fullName} esta no foco desta agenda.`
                  : "Filtro de caso ativo."}{" "}
                {selectedCase ? `Caso selecionado: ${selectedCase.title}.` : ""}
              </div>
            ) : null}
            <div className="form-actions">
              <button className="button secondary" type="submit">
                Aplicar filtros
              </button>
              <a className="button secondary" href="/agenda">
                Limpar filtros
              </a>
            </div>
          </form>
        </SectionCard>

        <div className="metric-grid">
          <div className="metric-card">
            <span>Hoje</span>
            <strong>{sameDayAppointments.length}</strong>
          </div>
          <div className="metric-card">
            <span>Proximas 48h</span>
            <strong>{next48HoursCount}</strong>
          </div>
          <div className="metric-card">
            <span>Visiveis ao cliente</span>
            <strong>{visibleToClientCount}</strong>
          </div>
          <div className="metric-card">
            <span>Historico filtrado</span>
            <strong>{filteredAppointmentHistory.length}</strong>
          </div>
        </div>

        <div className="grid two">
          <SectionCard
            id="registrar-compromisso"
            title="Registrar compromisso ou proximo passo"
            description="Use o mesmo fluxo para reuniao, retorno, prazo, audiencia ou ligacao, sempre vinculado ao caso e ao cliente correto."
          >
            <form action={registerAppointmentAction} className="stack">
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="caseId">Caso</label>
                  <select
                    id="caseId"
                    name="caseId"
                    required
                    disabled={!hasCases}
                    defaultValue={defaultCaseId}
                  >
                    {hasCases ? (
                      caseOptionsForAgenda.map((caseItem) => (
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
                Quando o item for visivel, a agenda registra criacao, reagendamento ou cancelamento no historico do caso e deixa a notificacao futura preparada.
              </div>
              <div className="form-actions">
                <FormSubmitButton pendingLabel="Registrando compromisso..." disabled={!hasCases}>
                  Registrar compromisso
                </FormSubmitButton>
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
                    <div className="form-actions">
                      <Link
                        className="button secondary"
                        href={buildInternalClientHref(appointment.client_id)}
                      >
                        Abrir ficha
                      </Link>
                      <Link
                        className="button secondary"
                        href={`/agenda?clientId=${appointment.client_id}&caseId=${appointment.case_id}#editar-compromisso`}
                      >
                        Editar este caso
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                {hasFilters
                  ? "Nenhum compromisso futuro corresponde aos filtros atuais."
                  : "Os proximos compromissos cadastrados para os casos aparecerao aqui."}
              </p>
            )}
          </SectionCard>
        </div>

        <SectionCard
          id="editar-compromisso"
          title="Editar, reagendar ou cancelar"
          description="Cada formulario abaixo atualiza o compromisso atual, grava a alteracao no historico da agenda e prepara notificacao futura quando a mudanca for relevante para o cliente."
        >
          {filteredAppointments.length ? (
            <div className="grid two">
              {filteredAppointments.slice(0, 8).map((appointment) => (
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
                  <div className="form-actions">
                    <Link
                      className="button secondary"
                      href={buildInternalClientHref(appointment.client_id)}
                    >
                      Ficha do cliente
                    </Link>
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
                      <FormSubmitButton pendingLabel="Salvando alteracoes...">
                        Salvar alteracoes
                      </FormSubmitButton>
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
                      <FormSubmitButton
                        tone="danger"
                        pendingLabel="Cancelando compromisso..."
                        disabled={appointment.status === "cancelled"}
                        confirmMessage="Tem certeza que deseja cancelar este compromisso?"
                      >
                        {appointment.status === "cancelled"
                          ? "Compromisso ja cancelado"
                          : "Cancelar compromisso"}
                      </FormSubmitButton>
                    </div>
                  </form>
                </SectionCard>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              {hasFilters
                ? "Nenhum compromisso editavel corresponde aos filtros atuais."
                : "Os primeiros compromissos editaveis aparecerao aqui assim que forem registrados."}
            </p>
          )}
        </SectionCard>

        <div className="grid two">
          <SectionCard
            id="historico-recente"
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
                {hasFilters
                  ? "Nenhum item do historico recente corresponde aos filtros atuais."
                  : "O historico recente da agenda aparecera aqui assim que os primeiros itens forem registrados."}
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Historico de alteracoes"
            description="Cada criacao, edicao, reagendamento ou cancelamento gera uma trilha persistida para operacao, auditoria e notificacao futura."
          >
            {filteredAppointmentHistory.length ? (
              <ul className="update-feed">
                {filteredAppointmentHistory.map((item) => (
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
                {hasFilters
                  ? "Nenhuma alteracao de agenda corresponde aos filtros atuais."
                  : "O historico de alteracoes da agenda aparecera aqui depois da primeira criacao."}
              </p>
            )}
          </SectionCard>
        </div>
      </AppFrame>
    );
  }

  const workspace = await getClientWorkspace(profile);
  const params = searchParams ? await searchParams : {};
  const rawError = getStringParam(params.error);
  const decodedError = rawError ? decodeURIComponent(rawError) : "";
  const error = getAccessMessage(decodedError) || decodedError;
  const query = getStringParam(params.q);
  const scope = getStringParam(params.scope, "all");
  const dateFrom = getStringParam(params.dateFrom);
  const dateTo = getStringParam(params.dateTo);
  const sort = getStringParam(params.sort, "nearest");
  const now = new Date();
  const hasFilters = !!(query || dateFrom || dateTo || scope !== "all" || sort !== "nearest");
  const filteredAppointments = [...workspace.appointments]
    .filter(
      (appointment) =>
        matchesSearch(query, [
          appointment.title,
          appointment.caseTitle,
          appointment.typeLabel,
          appointment.statusLabel,
          appointment.description
        ]) &&
        isWithinDateRange(appointment.starts_at, dateFrom, dateTo) &&
        (scope === "all" ||
          (scope === "upcoming" && isUpcomingAppointment(appointment, now)) ||
          (scope === "history" && !isUpcomingAppointment(appointment, now)))
    )
    .sort((left, right) =>
      sort === "recent"
        ? right.starts_at.localeCompare(left.starts_at)
        : left.starts_at.localeCompare(right.starts_at)
    );
  const upcomingAppointments = filteredAppointments.filter((appointment) =>
    isUpcomingAppointment(appointment, now)
  );
  const recentHistory = [...filteredAppointments]
    .filter((appointment) => !isUpcomingAppointment(appointment, now))
    .sort((left, right) => right.starts_at.localeCompare(left.starts_at))
    .slice(0, 8);

  return (
    <>
      <ProductEventBeacon
        eventKey="client_agenda_viewed"
        eventGroup="portal"
        payload={{
          scope,
          upcomingAppointments: upcomingAppointments.length,
          recentHistory: recentHistory.length
        }}
      />
      <AppFrame
        eyebrow="Agenda"
        title="Sua agenda do caso, organizada para consulta rapida."
        description="Aqui voce ve os proximos compromissos, os itens recentes e qualquer mudanca importante liberada pela equipe para o seu atendimento."
        utilityContent={
          <PortalSessionBanner
            role={profile.role}
            fullName={profile.full_name}
            email={profile.email}
            workspaceLabel="Portal autenticado"
            workspaceHint="Sessao ativa para acompanhar compromissos e datas do proprio caso."
          />
        }
        navigation={[
          { href: "/cliente", label: "Meu painel" },
          { href: "/documentos", label: "Documentos" },
          { href: "/agenda", label: "Agenda", active: true }
        ]}
        highlights={[
          { label: "Proximos compromissos", value: String(upcomingAppointments.length) },
          { label: "Historico recente", value: String(recentHistory.length) },
          { label: "Total visivel", value: String(workspace.appointments.length) },
          {
            label: "Proximo item",
            value: upcomingAppointments[0]
              ? formatPortalDateTime(upcomingAppointments[0].starts_at)
              : "Sem agenda"
          }
        ]}
        actions={[
          { href: "/cliente", label: "Voltar ao painel", tone: "secondary" },
          { href: "/documentos", label: "Ver documentos", tone: "secondary" }
        ]}
      >
      {error ? <div className="error-notice">{error}</div> : null}

      <SectionCard
        title="Encontrar compromissos"
        description="Use a busca e os filtros para localizar mais rapido datas futuras, historico recente e mudancas visiveis no seu caso."
      >
        <form className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="client-agenda-q">Buscar por titulo ou tipo</label>
              <input
                id="client-agenda-q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Compromisso, prazo, reuniao ou descricao"
              />
            </div>
            <div className="field">
              <label htmlFor="client-agenda-scope">Mostrar</label>
              <select id="client-agenda-scope" name="scope" defaultValue={scope}>
                <option value="all">Tudo</option>
                <option value="upcoming">Somente proximos</option>
                <option value="history">Somente historico</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="client-agenda-sort">Ordenacao</label>
              <select id="client-agenda-sort" name="sort" defaultValue={sort}>
                <option value="nearest">Mais proximos primeiro</option>
                <option value="recent">Mais recentes primeiro</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="client-agenda-date-from">De</label>
              <input
                id="client-agenda-date-from"
                name="dateFrom"
                type="date"
                defaultValue={dateFrom}
              />
            </div>
            <div className="field">
              <label htmlFor="client-agenda-date-to">Ate</label>
              <input
                id="client-agenda-date-to"
                name="dateTo"
                type="date"
                defaultValue={dateTo}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="button secondary" type="submit">
              Aplicar filtros
            </button>
            <a className="button secondary" href="/agenda">
              Limpar filtros
            </a>
          </div>
        </form>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          id="proximos-compromissos"
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
              {hasFilters
                ? "Nenhum compromisso futuro corresponde aos filtros atuais."
                : "Ainda nao ha compromissos visiveis vinculados ao seu caso."}
            </p>
          )}
        </SectionCard>

        <SectionCard
          id="historico-recente"
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
              {hasFilters
                ? "Nenhum item do historico recente corresponde aos filtros atuais."
                : "O historico recente da agenda aparecera aqui depois dos primeiros compromissos."}
            </p>
          )}
        </SectionCard>
      </div>
      </AppFrame>
    </>
  );
}
