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
      .select("id,profile_id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("cases")
      .select("id,title,area,summary,status,priority,client_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("case_events")
      .select(
        "id,case_id,event_type,title,occurred_at,visible_to_client,should_notify_client"
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
      .select("id,case_id,title,status,visible_to_client,due_at,created_at")
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
    ? await supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
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
  const upcomingAppointments = appointments.filter(
    (item) =>
      item.starts_at >= nowIso &&
      item.status !== "cancelled" &&
      item.status !== "completed"
  );

  return {
    latestClients: clients.slice(0, 5).map((client) => ({
      id: client.id,
      fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
      email: profileMap.get(client.profile_id)?.email || "",
      statusLabel: clientStatusLabels[client.status as keyof typeof clientStatusLabels],
      createdAt: client.created_at
    })),
    clientOptions: clients.map((client) => ({
      id: client.id,
      fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
      email: profileMap.get(client.profile_id)?.email || "",
      status: client.status,
      statusLabel: clientStatusLabels[client.status as keyof typeof clientStatusLabels],
      createdAt: client.created_at
    })),
    latestIntakeRequests: intakeRequests.map((item) => ({
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
    })),
    caseOptions: cases.map((caseItem) => ({
      id: caseItem.id,
      title: caseItem.title,
      area: caseItem.area,
      summary: caseItem.summary || "",
      priority: caseItem.priority || "normal",
      priorityLabel:
        casePriorityLabels[
          (caseItem.priority || "normal") as keyof typeof casePriorityLabels
        ] || "Normal",
      created_at: caseItem.created_at,
      status: caseItem.status,
      statusLabel: caseStatusLabels[caseItem.status as keyof typeof caseStatusLabels],
      clientName:
        profileMap.get(clientMap.get(caseItem.client_id)?.profile_id || "")?.full_name ||
        "Cliente"
    })),
    latestCases: cases.slice(0, 6).map((caseItem) => ({
      ...caseItem,
      priorityLabel:
        casePriorityLabels[
          (caseItem.priority || "normal") as keyof typeof casePriorityLabels
        ] || "Normal",
      statusLabel: caseStatusLabels[caseItem.status as keyof typeof caseStatusLabels],
      clientName:
        profileMap.get(clientMap.get(caseItem.client_id)?.profile_id || "")?.full_name ||
        "Cliente"
    })),
    latestEvents: events.map((event) => ({
      ...event,
      caseTitle: caseMap.get(event.case_id)?.title || "Caso",
      eventLabel:
        caseEventTypeLabels[event.event_type as keyof typeof caseEventTypeLabels] ||
        portalEventTypeLabels[event.event_type as keyof typeof portalEventTypeLabels] ||
        event.event_type
    })),
    latestDocuments: documents.map((document) => ({
      ...document,
      caseTitle: caseMap.get(document.case_id)?.title || "Caso",
      statusLabel: documentStatusLabels[document.status as keyof typeof documentStatusLabels]
    })),
    latestDocumentRequests: requests.map((request) => ({
      ...request,
      caseTitle: caseMap.get(request.case_id)?.title || "Caso",
      statusLabel:
        documentRequestStatusLabels[
          request.status as keyof typeof documentRequestStatusLabels
        ] || request.status
    })),
    latestAppointments: appointments.map((appointment) => ({
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
    })),
    latestAppointmentHistory: appointmentHistory.map((item) => ({
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
    })),
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
