import "server-only";

import {
  appointmentChangeLabels,
  appointmentStatusLabels,
  appointmentTypeLabels,
  caseAreaLabels,
  caseEventTypeLabels,
  casePriorityLabels,
  caseStatusLabels,
  clientStatusLabels,
  intakeRequestStatusLabels,
  documentRequestStatusLabels,
  documentStatusLabels,
  publicContactPeriodLabels,
  publicIntakeStageLabels,
  publicIntakeUrgencyLabels,
  portalEventTypeLabels
} from "@/lib/domain/portal";
import type { PortalProfile } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const WEEK_IN_MS = 7 * DAY_IN_MS;

export type StaffOperationalQueueKey =
  | "today"
  | "thisWeek"
  | "awaitingClient"
  | "awaitingTeam"
  | "recentlyCompleted";

export type StaffOperationalSeverity = "critical" | "high" | "medium" | "low";
export type StaffOperationalStateTone = "critical" | "warning" | "neutral" | "success";

export type StaffOperationalItem = {
  id: string;
  queue: StaffOperationalQueueKey;
  kindLabel: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  meta: string[];
  timingLabel: string;
  stateLabel: string;
  stateTone: StaffOperationalStateTone;
  severity: StaffOperationalSeverity;
  sortAt: number;
};

type StaffOperationalQueueMap = Record<StaffOperationalQueueKey, StaffOperationalItem[]>;

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getMostRecentTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => toTimestamp(value))
    .filter((value): value is number => value !== null);

  if (!timestamps.length) {
    return null;
  }

  return Math.max(...timestamps);
}

function getHoursSince(value: string | null | undefined, nowTimestamp: number) {
  const timestamp = toTimestamp(value);

  if (timestamp === null) {
    return 0;
  }

  return (nowTimestamp - timestamp) / HOUR_IN_MS;
}

function getDaysSince(value: string | null | undefined, nowTimestamp: number) {
  return getHoursSince(value, nowTimestamp) / 24;
}

function getHoursUntil(value: string | null | undefined, nowTimestamp: number) {
  const timestamp = toTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  return (timestamp - nowTimestamp) / HOUR_IN_MS;
}

function formatElapsedLabel(value: string | null | undefined, nowTimestamp: number) {
  const hours = Math.max(0, Math.round(getHoursSince(value, nowTimestamp)));

  if (hours < 24) {
    return `ha ${Math.max(hours, 1)}h`;
  }

  const days = Math.round(hours / 24);

  if (days < 7) {
    return `ha ${Math.max(days, 1)}d`;
  }

  const weeks = Math.round(days / 7);
  return `ha ${Math.max(weeks, 1)} sem`;
}

function formatDueLabel(value: string | null | undefined, nowTimestamp: number) {
  const hoursUntil = getHoursUntil(value, nowTimestamp);

  if (hoursUntil === null) {
    return "sem prazo definido";
  }

  if (hoursUntil < 0) {
    const overdueHours = Math.abs(hoursUntil);

    if (overdueHours < 24) {
      return `atrasado ha ${Math.max(Math.round(overdueHours), 1)}h`;
    }

    return `atrasado ha ${Math.max(Math.round(overdueHours / 24), 1)}d`;
  }

  if (hoursUntil < 24) {
    return `vence em ${Math.max(Math.round(hoursUntil), 1)}h`;
  }

  const days = Math.round(hoursUntil / 24);
  return `vence em ${Math.max(days, 1)}d`;
}

function formatUpcomingLabel(value: string | null | undefined, nowTimestamp: number) {
  const hoursUntil = getHoursUntil(value, nowTimestamp);

  if (hoursUntil === null) {
    return "sem horario definido";
  }

  if (hoursUntil < 0) {
    return `aconteceu ${formatElapsedLabel(value, nowTimestamp)}`;
  }

  if (hoursUntil < 24) {
    return `acontece em ${Math.max(Math.round(hoursUntil), 1)}h`;
  }

  const days = Math.round(hoursUntil / 24);
  return `acontece em ${Math.max(days, 1)}d`;
}

function compactText(value: string | null | undefined, maxLength = 160) {
  const cleanValue = (value || "").replace(/\s+/g, " ").trim();

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, Math.max(maxLength - 3, 1))}...`;
}

function getSeverityRank(severity: StaffOperationalSeverity) {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function sortOperationalItems(
  queue: StaffOperationalQueueKey,
  items: StaffOperationalItem[]
) {
  return [...items].sort((left, right) => {
    const severityDifference = getSeverityRank(right.severity) - getSeverityRank(left.severity);

    if (severityDifference !== 0) {
      return severityDifference;
    }

    if (queue === "recentlyCompleted") {
      return right.sortAt - left.sortAt;
    }

    return left.sortAt - right.sortAt;
  });
}

function createEmptyQueueMap(): StaffOperationalQueueMap {
  return {
    today: [],
    thisWeek: [],
    awaitingClient: [],
    awaitingTeam: [],
    recentlyCompleted: []
  };
}

export async function getStaffOverview() {
  const supabase = await createServerSupabaseClient();
  const [
    clientsResult,
    casesResult,
    eventsResult,
    documentsResult,
    requestsResult,
    intakeRequestsResult,
    appointmentsResult,
    appointmentHistoryResult,
    outboxResult
  ] =
    await Promise.all([
    supabase
      .from("clients")
      .select("id,profile_id,status,created_at,source_intake_request_id,cpf,phone,notes")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("cases")
      .select(
        "id,title,area,summary,status,priority,client_id,created_at,updated_at,last_public_update_at,last_status_changed_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("case_events")
      .select(
        "id,case_id,event_type,title,description,public_summary,occurred_at,visible_to_client,should_notify_client"
      )
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("documents")
      .select(
        "id,case_id,file_name,category,status,visibility,document_date,created_at,storage_path,mime_type,file_size_bytes"
      )
      .order("document_date", { ascending: false })
      .limit(100),
    supabase
      .from("document_requests")
      .select(
        "id,case_id,title,instructions,status,visible_to_client,due_at,created_at,updated_at,completed_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("intake_requests")
      .select(
        "id,full_name,email,phone,city,case_area,current_stage,urgency_level,preferred_contact_period,case_summary,status,submitted_at,reviewed_at,created_at,internal_notes"
      )
      .order("submitted_at", { ascending: false })
      .limit(100),
    supabase
      .from("appointments")
      .select(
        "id,case_id,client_id,title,appointment_type,status,visible_to_client,starts_at,notes,created_at,updated_at"
      )
      .order("starts_at", { ascending: true })
      .limit(100),
    supabase
      .from("appointment_history")
      .select(
        "id,appointment_id,case_id,client_id,change_type,title,appointment_type,status,visible_to_client,starts_at,changed_fields,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications_outbox")
      .select("id,status,template_key,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
    ]);

  if (clientsResult.error) {
    throw new Error(`Nao foi possivel carregar os clientes: ${clientsResult.error.message}`);
  }

  if (casesResult.error) {
    throw new Error(`Nao foi possivel carregar os casos: ${casesResult.error.message}`);
  }

  if (eventsResult.error) {
    throw new Error(`Nao foi possivel carregar as atualizacoes: ${eventsResult.error.message}`);
  }

  if (documentsResult.error) {
    throw new Error(`Nao foi possivel carregar os documentos: ${documentsResult.error.message}`);
  }

  if (requestsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as solicitacoes de documentos: ${requestsResult.error.message}`
    );
  }

  if (appointmentsResult.error) {
    throw new Error(`Nao foi possivel carregar a agenda: ${appointmentsResult.error.message}`);
  }

  if (intakeRequestsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as triagens recebidas: ${intakeRequestsResult.error.message}`
    );
  }

  if (appointmentHistoryResult.error) {
    throw new Error(
      `Nao foi possivel carregar o historico da agenda: ${appointmentHistoryResult.error.message}`
    );
  }

  if (outboxResult.error) {
    throw new Error(
      `Nao foi possivel carregar a fila de notificacoes: ${outboxResult.error.message}`
    );
  }

  const cases = casesResult.data || [];
  const clients = clientsResult.data || [];
  const events = eventsResult.data || [];
  const documents = documentsResult.data || [];
  const requests = requestsResult.data || [];
  const intakeRequests = intakeRequestsResult.data || [];
  const appointments = appointmentsResult.data || [];
  const appointmentHistory = appointmentHistoryResult.data || [];
  const caseClientIds = [...new Set(cases.map((item) => item.client_id))];

  const { data: relatedClients, error: relatedClientsError } = caseClientIds.length
    ? await supabase.from("clients").select("id,profile_id").in("id", caseClientIds)
    : { data: [], error: null };

  if (relatedClientsError) {
    throw new Error(
      `Nao foi possivel carregar os clientes vinculados aos casos: ${relatedClientsError.message}`
    );
  }

  const clientMap = new Map(
    [...clients, ...(relatedClients || [])].map((client) => [client.id, client])
  );
  const profileIds = [
    ...new Set(
      [...clients, ...(relatedClients || [])].map((item) => item.profile_id).filter(Boolean)
    )
  ];
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email,phone,is_active,invited_at,first_login_completed_at")
        .in("id", profileIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const caseMap = new Map(cases.map((caseItem) => [caseItem.id, caseItem]));
  const pendingNotifications = (outboxResult.data || []).filter(
    (item) => item.status === "pending"
  ).length;
  const openDocumentRequests = requests.filter((item) => item.status === "pending");
  const pendingIntakeRequests = intakeRequests.filter((item) =>
    item.status === "new" || item.status === "in_review"
  );
  const nowIso = new Date().toISOString();
  const nowTimestamp = Date.now();
  const recentCompletionThreshold = nowTimestamp - WEEK_IN_MS;
  const upcomingAppointments = appointments.filter(
    (item) =>
      item.starts_at >= nowIso &&
      item.status !== "cancelled" &&
      item.status !== "completed"
  );
  const latestClients = clients.slice(0, 5).map((client) => ({
    id: client.id,
    fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
    email: profileMap.get(client.profile_id)?.email || "",
    statusLabel: clientStatusLabels[client.status as keyof typeof clientStatusLabels],
    createdAt: client.created_at
  }));
  const clientOptionsBase = clients.map((client) => ({
    id: client.id,
    profileId: client.profile_id,
    fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
    email: profileMap.get(client.profile_id)?.email || "",
    phone: client.phone || profileMap.get(client.profile_id)?.phone || "",
    cpf: client.cpf || "",
    notes: client.notes || "",
    status: client.status,
    statusLabel: clientStatusLabels[client.status as keyof typeof clientStatusLabels],
    isActive: profileMap.get(client.profile_id)?.is_active ?? true,
    invitedAt: profileMap.get(client.profile_id)?.invited_at || null,
    firstLoginCompletedAt:
      profileMap.get(client.profile_id)?.first_login_completed_at || null,
    createdAt: client.created_at,
    sourceIntakeRequestId: client.source_intake_request_id || null
  }));
  const latestIntakeRequests = intakeRequests.map((item) => ({
    ...item,
    areaLabel: caseAreaLabels[item.case_area as keyof typeof caseAreaLabels],
    stageLabel:
      publicIntakeStageLabels[
        item.current_stage as keyof typeof publicIntakeStageLabels
      ] || item.current_stage,
    urgencyLabel:
      publicIntakeUrgencyLabels[
        item.urgency_level as keyof typeof publicIntakeUrgencyLabels
      ] || item.urgency_level,
    preferredContactLabel:
      publicContactPeriodLabels[
        item.preferred_contact_period as keyof typeof publicContactPeriodLabels
      ] || item.preferred_contact_period,
    statusLabel:
      intakeRequestStatusLabels[
        item.status as keyof typeof intakeRequestStatusLabels
      ] || item.status
  }));
  const caseOptions = cases.map((caseItem) => ({
    id: caseItem.id,
    clientId: caseItem.client_id,
    title: caseItem.title,
    area: caseItem.area,
    summary: caseItem.summary || "",
    priority: caseItem.priority || "normal",
    priorityLabel:
      casePriorityLabels[
        (caseItem.priority || "normal") as keyof typeof casePriorityLabels
      ] || "Normal",
    created_at: caseItem.created_at,
    updated_at: caseItem.updated_at,
    last_public_update_at: caseItem.last_public_update_at,
    last_status_changed_at: caseItem.last_status_changed_at,
    status: caseItem.status,
    statusLabel: caseStatusLabels[caseItem.status as keyof typeof caseStatusLabels],
    clientName:
      profileMap.get(clientMap.get(caseItem.client_id)?.profile_id || "")?.full_name ||
      "Cliente"
  }));
  const latestCases = caseOptions.slice(0, 6);
  const latestEvents = events.map((event) => ({
    ...event,
    caseTitle: caseMap.get(event.case_id)?.title || "Caso",
    eventLabel:
      caseEventTypeLabels[event.event_type as keyof typeof caseEventTypeLabels] ||
      portalEventTypeLabels[event.event_type as keyof typeof portalEventTypeLabels] ||
      event.event_type
  }));
  const latestDocuments = documents.map((document) => ({
    ...document,
    caseTitle: caseMap.get(document.case_id)?.title || "Caso",
    statusLabel: documentStatusLabels[document.status as keyof typeof documentStatusLabels]
  }));
  const latestDocumentRequests = requests.map((request) => ({
    ...request,
    caseTitle: caseMap.get(request.case_id)?.title || "Caso",
    statusLabel:
      documentRequestStatusLabels[
        request.status as keyof typeof documentRequestStatusLabels
      ] || request.status
  }));
  const latestAppointments = appointments.map((appointment) => ({
    ...appointment,
    caseTitle: caseMap.get(appointment.case_id)?.title || "Caso",
    clientName:
      profileMap.get(clientMap.get(appointment.client_id)?.profile_id || "")?.full_name ||
      "Cliente",
    description: appointment.notes || "",
    statusLabel:
      appointmentStatusLabels[
        appointment.status as keyof typeof appointmentStatusLabels
      ] || appointment.status,
    typeLabel:
      appointmentTypeLabels[
        appointment.appointment_type as keyof typeof appointmentTypeLabels
      ] || appointment.appointment_type
  }));
  const latestAppointmentHistory = appointmentHistory.map((item) => ({
    ...item,
    caseTitle: caseMap.get(item.case_id)?.title || "Caso",
    clientName:
      profileMap.get(clientMap.get(item.client_id)?.profile_id || "")?.full_name ||
      "Cliente",
    changeLabel:
      appointmentChangeLabels[
        item.change_type as keyof typeof appointmentChangeLabels
      ] || item.change_type,
    statusLabel:
      appointmentStatusLabels[
        item.status as keyof typeof appointmentStatusLabels
      ] || item.status,
    typeLabel:
      appointmentTypeLabels[
        item.appointment_type as keyof typeof appointmentTypeLabels
      ] || item.appointment_type
  }));
  const casesByClientId = new Map<string, typeof caseOptions>();
  const appointmentsByClientId = new Map<string, typeof latestAppointments>();
  const eventsByClientId = new Map<string, typeof latestEvents>();
  const documentRequestsByClientId = new Map<string, typeof latestDocumentRequests>();

  for (const caseItem of caseOptions) {
    const current = casesByClientId.get(caseItem.clientId) || [];
    current.push(caseItem);
    casesByClientId.set(caseItem.clientId, current);
  }

  for (const appointment of latestAppointments) {
    const current = appointmentsByClientId.get(appointment.client_id) || [];
    current.push(appointment);
    appointmentsByClientId.set(appointment.client_id, current);
  }

  for (const event of latestEvents) {
    const clientId = caseMap.get(event.case_id)?.client_id;

    if (!clientId) {
      continue;
    }

    const current = eventsByClientId.get(clientId) || [];
    current.push(event);
    eventsByClientId.set(clientId, current);
  }

  for (const request of latestDocumentRequests) {
    const clientId = caseMap.get(request.case_id)?.client_id;

    if (!clientId) {
      continue;
    }

    const current = documentRequestsByClientId.get(clientId) || [];
    current.push(request);
    documentRequestsByClientId.set(clientId, current);
  }

  const clientOptions = clientOptionsBase.map((client) => {
    const latestCasesForClient = [...(casesByClientId.get(client.id) || [])].sort((left, right) =>
      right.created_at.localeCompare(left.created_at)
    );
    const appointmentsForClient = [...(appointmentsByClientId.get(client.id) || [])].sort(
      (left, right) => left.starts_at.localeCompare(right.starts_at)
    );
    const upcomingAppointmentsForClient = appointmentsForClient
      .filter(
        (appointment) =>
          appointment.starts_at >= nowIso &&
          appointment.status !== "cancelled" &&
          appointment.status !== "completed"
      )
      .slice(0, 3);
    const recentEventsForClient = [...(eventsByClientId.get(client.id) || [])]
      .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
      .slice(0, 3);
    const openDocumentRequestsForClient = [...(documentRequestsByClientId.get(client.id) || [])]
      .filter((request) => request.status === "pending")
      .sort((left, right) =>
        (right.due_at || right.created_at).localeCompare(left.due_at || left.created_at)
      )
      .slice(0, 3);
    const primaryCase =
      latestCasesForClient.find((caseItem) => caseItem.status !== "concluido") ||
      latestCasesForClient[0] ||
      null;
    const lastActivityTimestamp = getMostRecentTimestamp([
      client.createdAt,
      ...latestCasesForClient.flatMap((caseItem) => [
        caseItem.updated_at,
        caseItem.last_public_update_at,
        caseItem.last_status_changed_at,
        caseItem.created_at
      ]),
      ...appointmentsForClient.flatMap((appointment) => [appointment.updated_at, appointment.starts_at]),
      ...recentEventsForClient.map((event) => event.occurred_at)
    ]);

    return {
      ...client,
      caseCount: latestCasesForClient.length,
      activeCaseCount: latestCasesForClient.filter((caseItem) => caseItem.status !== "concluido")
        .length,
      upcomingAppointmentsCount: upcomingAppointmentsForClient.length,
      pendingDocumentRequestsCount: openDocumentRequestsForClient.length,
      lastActivityAt:
        lastActivityTimestamp === null
          ? client.createdAt
          : new Date(lastActivityTimestamp).toISOString(),
      primaryCaseId: primaryCase?.id || null,
      primaryCaseTitle: primaryCase?.title || null,
      primaryCaseArea: primaryCase?.area || null,
      primaryCaseStatus: primaryCase?.status || null,
      primaryCaseStatusLabel: primaryCase?.statusLabel || null,
      latestCases: latestCasesForClient.slice(0, 3),
      upcomingAppointments: upcomingAppointmentsForClient,
      openDocumentRequests: openDocumentRequestsForClient,
      recentEvents: recentEventsForClient
    };
  });

  const latestEventByCase = new Map<string, (typeof latestEvents)[number]>();

  for (const event of latestEvents) {
    if (!latestEventByCase.has(event.case_id)) {
      latestEventByCase.set(event.case_id, event);
    }
  }

  const operationalQueues = createEmptyQueueMap();

  for (const intakeRequest of latestIntakeRequests) {
    if (intakeRequest.status === "converted" || intakeRequest.status === "closed") {
      const reviewedTimestamp = toTimestamp(intakeRequest.reviewed_at);

      if (reviewedTimestamp && reviewedTimestamp >= recentCompletionThreshold) {
        operationalQueues.recentlyCompleted.push({
          id: `intake-completed-${intakeRequest.id}`,
          queue: "recentlyCompleted",
          kindLabel: "Triagem",
          title: `${intakeRequest.full_name} - ${intakeRequest.statusLabel}`,
          description:
            intakeRequest.status === "converted"
              ? "A triagem foi convertida em cliente e saiu da fila inicial."
              : "A triagem foi encerrada depois da analise inicial.",
          href: "/internal/advogada#triagens-recebidas",
          actionLabel: "Revisar triagem",
          meta: [intakeRequest.areaLabel, intakeRequest.urgencyLabel],
          timingLabel: `Finalizada ${formatElapsedLabel(intakeRequest.reviewed_at, nowTimestamp)}`,
          stateLabel: "Concluido",
          stateTone: "success",
          severity: "low",
          sortAt: reviewedTimestamp
        });
      }

      continue;
    }

    if (!(intakeRequest.status === "new" || intakeRequest.status === "in_review")) {
      continue;
    }

    const ageHours = getHoursSince(intakeRequest.submitted_at, nowTimestamp);
    const isUrgent = intakeRequest.urgency_level === "urgente";
    const isHigh = intakeRequest.urgency_level === "alta";

    operationalQueues[isUrgent || ageHours >= 48 ? "today" : "awaitingTeam"].push({
      id: `intake-${intakeRequest.id}`,
      queue: isUrgent || ageHours >= 48 ? "today" : "awaitingTeam",
      kindLabel: "Triagem",
      title: `${intakeRequest.full_name} - ${intakeRequest.areaLabel}`,
      description: compactText(
        `${intakeRequest.stageLabel}. ${intakeRequest.case_summary}`,
        150
      ),
      href: "/internal/advogada#triagens-recebidas",
      actionLabel: "Revisar triagem",
      meta: [
        intakeRequest.urgencyLabel,
        intakeRequest.preferredContactLabel,
        intakeRequest.statusLabel
      ],
      timingLabel: `Recebida ${formatElapsedLabel(intakeRequest.submitted_at, nowTimestamp)}`,
      stateLabel: isUrgent ? "Critico" : ageHours <= 6 ? "Novo" : "Pendente",
      stateTone: isUrgent ? "critical" : ageHours <= 6 ? "neutral" : "warning",
      severity: isUrgent ? "critical" : isHigh || ageHours >= 24 ? "high" : "medium",
      sortAt: toTimestamp(intakeRequest.submitted_at) || nowTimestamp
    });
  }

  for (const client of clientOptions) {
    if (!client.invitedAt || client.firstLoginCompletedAt) {
      continue;
    }

    const inviteAgeHours = getHoursSince(client.invitedAt, nowTimestamp);

    if (inviteAgeHours < 24) {
      continue;
    }

    const queue = inviteAgeHours >= 72 ? "today" : "awaitingClient";
    const severity =
      inviteAgeHours >= 120 ? "critical" : inviteAgeHours >= 72 ? "high" : "medium";

    operationalQueues[queue].push({
      id: `invite-${client.id}`,
      queue,
      kindLabel: "Onboarding",
      title: `${client.fullName} ainda nao concluiu o primeiro acesso`,
      description: `O convite continua aberto em ${client.email} e o portal ainda nao foi ativado.`,
      href: "/internal/advogada#cadastro-cliente",
      actionLabel: "Acompanhar acesso",
      meta: [client.statusLabel, "Convite emitido"],
      timingLabel: `Convite enviado ${formatElapsedLabel(client.invitedAt, nowTimestamp)}`,
      stateLabel: inviteAgeHours >= 72 ? "Pendente" : "Novo",
      stateTone: severity === "critical" ? "critical" : "warning",
      severity,
      sortAt: toTimestamp(client.invitedAt) || nowTimestamp
    });
  }

  for (const request of latestDocumentRequests) {
    const resolutionTimestamp = getMostRecentTimestamp([
      request.completed_at,
      request.updated_at
    ]);

    if (request.status !== "pending") {
      if (resolutionTimestamp && resolutionTimestamp >= recentCompletionThreshold) {
        operationalQueues.recentlyCompleted.push({
          id: `request-completed-${request.id}`,
          queue: "recentlyCompleted",
          kindLabel: "Documento",
          title: `${request.title} - ${request.statusLabel}`,
          description: `${request.caseTitle} saiu da fila documental recente.`,
          href: "/documentos#solicitacoes-abertas",
          actionLabel: "Abrir documentos",
          meta: [request.caseTitle],
          timingLabel: `Atualizada ${formatElapsedLabel(request.updated_at, nowTimestamp)}`,
          stateLabel: request.status === "completed" ? "Concluido" : "Encerrado",
          stateTone: request.status === "completed" ? "success" : "neutral",
          severity: "low",
          sortAt: resolutionTimestamp
        });
      }

      continue;
    }

    const requestAgeDays = getDaysSince(request.created_at, nowTimestamp);
    const requestDueHours = getHoursUntil(request.due_at, nowTimestamp);
    const requestOverdue = requestDueHours !== null && requestDueHours < 0;
    const requestDueSoon = requestDueHours !== null && requestDueHours <= 48;
    const requestThisWeek = requestDueHours !== null && requestDueHours <= 7 * 24;
    const agedRequest = requestAgeDays >= 7;
    const queue = !request.visible_to_client
      ? "awaitingTeam"
      : requestOverdue || requestDueSoon || agedRequest
        ? "today"
        : requestThisWeek
          ? "thisWeek"
          : "awaitingClient";

    operationalQueues[queue].push({
      id: `request-${request.id}`,
      queue,
      kindLabel: "Documento",
      title: request.title,
      description: compactText(
        request.instructions || `${request.caseTitle} segue aguardando esse envio do cliente.`,
        150
      ),
      href: "/documentos#solicitacoes-abertas",
      actionLabel: requestOverdue ? "Cobrar documento" : "Ver solicitacao",
      meta: [
        request.caseTitle,
        request.visible_to_client ? "Aguardando cliente" : "Aguardando equipe"
      ],
      timingLabel: request.due_at
        ? formatDueLabel(request.due_at, nowTimestamp)
        : `Aberta ${formatElapsedLabel(request.created_at, nowTimestamp)}`,
      stateLabel: requestOverdue ? "Critico" : requestAgeDays < 1 ? "Novo" : "Pendente",
      stateTone: requestOverdue ? "critical" : requestAgeDays < 1 ? "neutral" : "warning",
      severity: requestOverdue ? "critical" : requestDueSoon || agedRequest ? "high" : requestThisWeek ? "medium" : "low",
      sortAt: toTimestamp(request.due_at) || toTimestamp(request.created_at) || nowTimestamp
    });
  }

  for (const appointment of latestAppointments) {
    const appointmentUpdatedTimestamp = toTimestamp(appointment.updated_at);

    if (appointment.status === "completed" || appointment.status === "cancelled") {
      if (appointmentUpdatedTimestamp && appointmentUpdatedTimestamp >= recentCompletionThreshold) {
        operationalQueues.recentlyCompleted.push({
          id: `appointment-completed-${appointment.id}`,
          queue: "recentlyCompleted",
          kindLabel: "Agenda",
          title: `${appointment.title} - ${appointment.statusLabel}`,
          description: `${appointment.caseTitle} com ${appointment.clientName}.`,
          href: "/agenda#historico-recente",
          actionLabel: "Abrir agenda",
          meta: [appointment.typeLabel, appointment.caseTitle],
          timingLabel: `Atualizado ${formatElapsedLabel(appointment.updated_at, nowTimestamp)}`,
          stateLabel: appointment.status === "completed" ? "Concluido" : "Encerrado",
          stateTone: appointment.status === "completed" ? "success" : "neutral",
          severity: "low",
          sortAt: appointmentUpdatedTimestamp
        });
      }

      continue;
    }

    const appointmentHoursUntil = getHoursUntil(appointment.starts_at, nowTimestamp);

    if (appointmentHoursUntil === null || appointmentHoursUntil < 0 || appointmentHoursUntil > 7 * 24) {
      continue;
    }

    const queue = appointmentHoursUntil <= 48 ? "today" : "thisWeek";
    const severity =
      appointmentHoursUntil <= 12
        ? "critical"
        : appointmentHoursUntil <= 24
          ? "high"
          : "medium";

    operationalQueues[queue].push({
      id: `appointment-${appointment.id}`,
      queue,
      kindLabel: "Agenda",
      title: appointment.title,
      description: compactText(
        appointment.description ||
          `${appointment.caseTitle} com ${appointment.clientName}. Revise orientacoes e preparo.`,
        150
      ),
      href: "/agenda#proximos-compromissos",
      actionLabel: appointmentHoursUntil <= 24 ? "Preparar compromisso" : "Revisar agenda",
      meta: [appointment.caseTitle, appointment.clientName, appointment.typeLabel],
      timingLabel: formatUpcomingLabel(appointment.starts_at, nowTimestamp),
      stateLabel: appointmentHoursUntil <= 24 ? "Critico" : "Pendente",
      stateTone: severity === "critical" ? "critical" : "warning",
      severity,
      sortAt: toTimestamp(appointment.starts_at) || nowTimestamp
    });
  }

  let staleCasesCount = 0;

  for (const caseItem of caseOptions) {
    const latestCaseEvent = latestEventByCase.get(caseItem.id);
    const lastActionTimestamp = getMostRecentTimestamp([
      latestCaseEvent?.occurred_at,
      caseItem.last_public_update_at,
      caseItem.last_status_changed_at,
      caseItem.updated_at,
      caseItem.created_at
    ]);
    const lastActionDate =
      lastActionTimestamp !== null ? new Date(lastActionTimestamp).toISOString() : caseItem.created_at;
    const staleDays = getDaysSince(lastActionDate, nowTimestamp);
    const waitingClientCase = caseItem.status === "aguardando-retorno";

    if (caseItem.status === "concluido") {
      if (lastActionTimestamp !== null && lastActionTimestamp >= recentCompletionThreshold) {
        operationalQueues.recentlyCompleted.push({
          id: `case-completed-${caseItem.id}`,
          queue: "recentlyCompleted",
          kindLabel: "Caso",
          title: `${caseItem.title} - ${caseItem.statusLabel}`,
          description: `${caseItem.clientName} concluiu o ciclo principal do acompanhamento.`,
          href: "/internal/advogada#gestao-casos",
          actionLabel: "Revisar caso",
          meta: [caseItem.clientName, caseItem.priorityLabel],
          timingLabel: `Atualizado ${formatElapsedLabel(lastActionDate, nowTimestamp)}`,
          stateLabel: "Concluido",
          stateTone: "success",
          severity: "low",
          sortAt: lastActionTimestamp
        });
      }

      continue;
    }

    if (staleDays >= 10) {
      staleCasesCount += 1;
    }

    if (waitingClientCase && staleDays >= 2) {
      const severity =
        staleDays >= 14 || caseItem.priority === "urgente"
          ? "critical"
          : staleDays >= 7
            ? "high"
            : "medium";
      const queue = staleDays >= 7 ? "today" : "awaitingClient";

      operationalQueues[queue].push({
        id: `case-waiting-client-${caseItem.id}`,
        queue,
        kindLabel: "Caso",
        title: caseItem.title,
        description: compactText(
          latestCaseEvent?.public_summary ||
            latestCaseEvent?.description ||
            "O caso esta parado aguardando retorno do cliente para seguir.",
          150
        ),
        href: "/internal/advogada#atualizacoes-caso",
        actionLabel: "Cobrar retorno",
        meta: [caseItem.clientName, caseItem.statusLabel, caseItem.priorityLabel],
        timingLabel: `Sem retorno ${formatElapsedLabel(lastActionDate, nowTimestamp)}`,
        stateLabel: severity === "critical" ? "Critico" : "Pendente",
        stateTone: severity === "critical" ? "critical" : "warning",
        severity,
        sortAt: lastActionTimestamp || nowTimestamp
      });

      continue;
    }

    if (staleDays < 10) {
      continue;
    }

    const queue =
      staleDays >= 21 || caseItem.priority === "urgente"
        ? "today"
        : staleDays >= 14
          ? "thisWeek"
          : "awaitingTeam";
    const severity =
      staleDays >= 21 || caseItem.priority === "urgente"
        ? "critical"
        : staleDays >= 14 || caseItem.priority === "alta"
          ? "high"
          : "medium";

    operationalQueues[queue].push({
      id: `case-stale-${caseItem.id}`,
      queue,
      kindLabel: "Caso",
      title: caseItem.title,
      description: compactText(
        latestCaseEvent?.public_summary ||
          latestCaseEvent?.description ||
          caseItem.summary ||
          "O caso esta sem atualizacao recente e precisa de novo movimento interno.",
        150
      ),
      href: "/internal/advogada#atualizacoes-caso",
      actionLabel: "Atualizar caso",
      meta: [caseItem.clientName, caseItem.statusLabel, caseItem.priorityLabel],
      timingLabel: `Sem atualizacao ${formatElapsedLabel(lastActionDate, nowTimestamp)}`,
      stateLabel: severity === "critical" ? "Critico" : "Pendente",
      stateTone: severity === "critical" ? "critical" : "warning",
      severity,
      sortAt: lastActionTimestamp || nowTimestamp
    });
  }

  const sortedOperationalQueues = {
    today: sortOperationalItems("today", operationalQueues.today),
    thisWeek: sortOperationalItems("thisWeek", operationalQueues.thisWeek),
    awaitingClient: sortOperationalItems("awaitingClient", operationalQueues.awaitingClient),
    awaitingTeam: sortOperationalItems("awaitingTeam", operationalQueues.awaitingTeam),
    recentlyCompleted: sortOperationalItems(
      "recentlyCompleted",
      operationalQueues.recentlyCompleted
    )
  };
  const criticalCount =
    sortedOperationalQueues.today.filter((item) => item.severity === "critical").length +
    sortedOperationalQueues.thisWeek.filter((item) => item.severity === "critical").length +
    sortedOperationalQueues.awaitingClient.filter((item) => item.severity === "critical").length +
    sortedOperationalQueues.awaitingTeam.filter((item) => item.severity === "critical").length;
  const agedPendingDocumentsCount = latestDocumentRequests.filter((request) => {
    if (request.status !== "pending") {
      return false;
    }

    const isOverdue = (getHoursUntil(request.due_at, nowTimestamp) || 0) < 0;
    return isOverdue || getDaysSince(request.created_at, nowTimestamp) >= 7;
  }).length;
  const inviteStalledCount = clientOptions.filter((client) => {
    if (!client.invitedAt || client.firstLoginCompletedAt) {
      return false;
    }

    return getHoursSince(client.invitedAt, nowTimestamp) >= 24;
  }).length;
  const urgentTriageCount = latestIntakeRequests.filter(
    (item) =>
      item.urgency_level === "urgente" &&
      (item.status === "new" || item.status === "in_review")
  ).length;

  return {
    latestClients,
    clientOptions,
    latestIntakeRequests,
    caseOptions,
    latestCases,
    latestEvents,
    latestDocuments,
    latestDocumentRequests,
    latestAppointments,
    latestAppointmentHistory,
    operationalCenter: {
      summary: {
        criticalCount,
        todayCount: sortedOperationalQueues.today.length,
        thisWeekCount: sortedOperationalQueues.thisWeek.length,
        waitingClientCount: sortedOperationalQueues.awaitingClient.length,
        waitingTeamCount: sortedOperationalQueues.awaitingTeam.length,
        recentlyCompletedCount: sortedOperationalQueues.recentlyCompleted.length,
        staleCasesCount,
        agedPendingDocumentsCount,
        inviteStalledCount,
        urgentTriageCount
      },
      queues: sortedOperationalQueues
    },
    upcomingAppointmentsCount: upcomingAppointments.length,
    openDocumentRequestsCount: openDocumentRequests.length,
    pendingIntakeRequestsCount: pendingIntakeRequests.length,
    pendingNotifications,
    outboxPreview: outboxResult.data || []
  };
}

export async function getClientWorkspace(profile: PortalProfile) {
  const supabase = await createServerSupabaseClient();
  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("id,status,notes,created_at")
    .eq("profile_id", profile.id)
    .single();

  if (clientError || !clientRecord) {
    throw new Error(
      clientError?.message || "Nao foi possivel localizar o cadastro do cliente."
    );
  }

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id,title,area,status,created_at")
    .eq("client_id", clientRecord.id)
    .order("created_at", { ascending: false });

  if (casesError) {
    throw new Error(`Nao foi possivel carregar os casos: ${casesError.message}`);
  }

  const caseList = cases || [];
  const caseIds = caseList.map((item) => item.id);
  const caseMap = new Map(caseList.map((item) => [item.id, item]));

  const [documentsResult, documentRequestsResult, appointmentsResult, eventsResult] =
    await Promise.all([
    caseIds.length
      ? supabase
          .from("documents")
          .select(
            "id,case_id,file_name,category,description,status,visibility,document_date,created_at,storage_path,mime_type,file_size_bytes"
          )
          .in("case_id", caseIds)
          .eq("visibility", "client")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    caseIds.length
      ? supabase
          .from("document_requests")
          .select(
            "id,case_id,title,instructions,due_at,status,visible_to_client,created_at"
          )
          .in("case_id", caseIds)
          .eq("visible_to_client", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("appointments")
      .select(
        "id,case_id,title,appointment_type,starts_at,ends_at,mode,status,notes,visible_to_client"
      )
      .eq("client_id", clientRecord.id)
      .eq("visible_to_client", true)
      .order("starts_at", { ascending: true }),
    supabase
      .from("case_events")
      .select("id,case_id,event_type,title,public_summary,occurred_at")
      .eq("client_id", clientRecord.id)
      .eq("visible_to_client", true)
      .order("occurred_at", { ascending: false })
      .limit(100)
  ]);

  if (documentsResult.error) {
    throw new Error(`Nao foi possivel carregar os documentos: ${documentsResult.error.message}`);
  }

  if (appointmentsResult.error) {
    throw new Error(`Nao foi possivel carregar a agenda: ${appointmentsResult.error.message}`);
  }

  if (documentRequestsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as solicitacoes de documentos: ${documentRequestsResult.error.message}`
    );
  }

  if (eventsResult.error) {
    throw new Error(`Nao foi possivel carregar as atualizacoes: ${eventsResult.error.message}`);
  }

  return {
    clientRecord,
    cases: caseList.map((caseItem) => ({
      ...caseItem,
      statusLabel: caseStatusLabels[caseItem.status as keyof typeof caseStatusLabels]
    })),
    documents: (documentsResult.data || []).map((document) => ({
      ...document,
      caseTitle: caseMap.get(document.case_id)?.title || "Caso",
      statusLabel: documentStatusLabels[document.status as keyof typeof documentStatusLabels]
    })),
    documentRequests: (documentRequestsResult.data || []).map((request) => ({
      ...request,
      caseTitle: caseMap.get(request.case_id)?.title || "Caso",
      statusLabel:
        documentRequestStatusLabels[
          request.status as keyof typeof documentRequestStatusLabels
        ] || request.status
    })),
    appointments: (appointmentsResult.data || []).map((appointment) => ({
      ...appointment,
      caseTitle: caseMap.get(appointment.case_id)?.title || "Caso",
      description: appointment.notes || "",
      statusLabel:
        appointmentStatusLabels[
          appointment.status as keyof typeof appointmentStatusLabels
        ] || appointment.status,
      typeLabel:
        appointmentTypeLabels[
          appointment.appointment_type as keyof typeof appointmentTypeLabels
        ] || appointment.appointment_type
    })),
    events: (eventsResult.data || []).map((event) => ({
      ...event,
      caseTitle: caseMap.get(event.case_id)?.title || "Caso",
      eventLabel:
        caseEventTypeLabels[event.event_type as keyof typeof caseEventTypeLabels] ||
        portalEventTypeLabels[event.event_type as keyof typeof portalEventTypeLabels] ||
        event.event_type
    }))
  };
}
