import "server-only";

import type { PortalProfile } from "../auth/guards";
import {
  normalizeArray,
  normalizeClientAppointmentSummaryItem,
  normalizeClientCaseSummaryItem,
  normalizeClientDocumentSummaryItem,
  normalizeClientEventSummaryItem,
  normalizeClientProfileSummary,
  normalizeClientRecordSummary,
  normalizeClientRequestSummaryItem,
  normalizeText
} from "../portal/client-normalizers";
import { createServerSupabaseClient } from "../supabase/server";

export type ClientLoaderResult<T> = {
  ok: boolean;
  reason: string | null;
  data: T;
};

export type ClientProfileSummary = {
  displayName: string;
  email: string;
  phoneLabel: string;
  firstLoginCompletedAt: string | null;
  firstLoginCompletedLabel: string;
  role: PortalProfile["role"];
  isActive: boolean;
};

type ClientRecordSummary = {
  id: string;
  status: string;
  notes: string;
  created_at: string;
};

type ClientCaseItem = {
  id: string;
  title: string;
  area: string | null;
  status: string;
  created_at: string;
  statusLabel: string;
};

type ClientDocumentItem = {
  id: string;
  case_id: string;
  file_name: string;
  category: string;
  description: string;
  status: string;
  statusLabel: string;
  visibility: string;
  document_date: string;
  created_at: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  caseTitle: string;
};

type ClientRequestItem = {
  id: string;
  case_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  status: string;
  statusLabel: string;
  visible_to_client: boolean;
  created_at: string;
  caseTitle: string;
};

type ClientAppointmentItem = {
  id: string;
  case_id: string;
  title: string;
  appointment_type: string;
  starts_at: string;
  ends_at: string | null;
  mode: string | null;
  status: string;
  notes: string;
  description: string;
  visible_to_client: boolean;
  caseTitle: string;
  statusLabel: string;
  typeLabel: string;
};

type ClientEventItem = {
  id: string;
  case_id: string;
  event_type: string;
  title: string;
  public_summary: string;
  occurred_at: string;
  caseTitle: string;
  eventLabel: string;
};

export type ClientCaseSummaryData = {
  clientRecord: ClientRecordSummary;
  cases: ClientCaseItem[];
  mainCase: ClientCaseItem | null;
  totalCases: number;
};

export type ClientDocumentsSummaryData = {
  documents: ClientDocumentItem[];
  availableCount: number;
  pendingCount: number;
  totalCount: number;
};

export type ClientAgendaSummaryData = {
  appointments: ClientAppointmentItem[];
  upcomingAppointments: ClientAppointmentItem[];
  nextAppointment: ClientAppointmentItem | null;
  totalAppointments: number;
};

export type ClientRequestsSummaryData = {
  documentRequests: ClientRequestItem[];
  openRequests: ClientRequestItem[];
  openCount: number;
  completedCount: number;
};

export type ClientEventsSummaryData = {
  events: ClientEventItem[];
  recentEvents: ClientEventItem[];
  totalEvents: number;
};

type ClientBaseContext = {
  clientRecord: ClientRecordSummary;
  cases: ClientCaseItem[];
  caseMap: Map<string, ClientCaseItem>;
};

function createLoaderResult<T>(
  data: T,
  ok = true,
  reason: string | null = null
): ClientLoaderResult<T> {
  return {
    ok,
    reason,
    data
  };
}

function buildEmptyClientCaseSummary(): ClientCaseSummaryData {
  return {
    clientRecord: normalizeClientRecordSummary(),
    cases: [],
    mainCase: null,
    totalCases: 0
  };
}

function buildEmptyClientDocumentsSummary(): ClientDocumentsSummaryData {
  return {
    documents: [],
    availableCount: 0,
    pendingCount: 0,
    totalCount: 0
  };
}

function buildEmptyClientAgendaSummary(): ClientAgendaSummaryData {
  return {
    appointments: [],
    upcomingAppointments: [],
    nextAppointment: null,
    totalAppointments: 0
  };
}

function buildEmptyClientRequestsSummary(): ClientRequestsSummaryData {
  return {
    documentRequests: [],
    openRequests: [],
    openCount: 0,
    completedCount: 0
  };
}

function buildEmptyClientEventsSummary(): ClientEventsSummaryData {
  return {
    events: [],
    recentEvents: [],
    totalEvents: 0
  };
}

function buildEmptyClientWorkspace() {
  return {
    clientRecord: normalizeClientRecordSummary() as ClientRecordSummary,
    cases: [] as ClientCaseItem[],
    documents: [] as ClientDocumentItem[],
    documentRequests: [] as ClientRequestItem[],
    appointments: [] as ClientAppointmentItem[],
    events: [] as ClientEventItem[]
  };
}

async function getSafeClientSupabase(profile: PortalProfile) {
  try {
    const supabase = await createServerSupabaseClient();
    return createLoaderResult(supabase);
  } catch (error) {
    console.error("[client-workspace] Falha ao criar client Supabase", {
      profileId: profile.id,
      profileEmail: profile.email,
      error: error instanceof Error ? error.message : String(error)
    });

    return createLoaderResult(null, false, "supabase_unavailable");
  }
}

async function loadClientBaseContext(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientBaseContext>> {
  const emptySummary = buildEmptyClientCaseSummary();
  const supabaseResult = await getSafeClientSupabase(profile);

  if (!supabaseResult.ok || !supabaseResult.data) {
    return createLoaderResult(
      {
        clientRecord: emptySummary.clientRecord,
        cases: emptySummary.cases,
        caseMap: new Map()
      },
      false,
      supabaseResult.reason || "supabase_unavailable"
    );
  }

  try {
    const supabase = supabaseResult.data;
    const { data: clientRecord, error: clientError } = await supabase
      .from("clients")
      .select("id,status,notes,created_at")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (clientError) {
      console.error("[client-workspace] Erro ao buscar cliente", {
        profileId: profile.id,
        error: clientError.message
      });

      return createLoaderResult(
        {
          clientRecord: emptySummary.clientRecord,
          cases: emptySummary.cases,
          caseMap: new Map()
        },
        false,
        "client_query_failed"
      );
    }

    if (!clientRecord) {
      console.warn("[client-workspace] Cliente nao encontrado para profile", {
        profileId: profile.id,
        profileEmail: profile.email
      });

      return createLoaderResult(
        {
          clientRecord: emptySummary.clientRecord,
          cases: [],
          caseMap: new Map()
        },
        false,
        "client_not_found"
      );
    }

    const normalizedClientRecord: ClientRecordSummary = {
      ...normalizeClientRecordSummary(clientRecord),
      status: normalizeText(clientRecord.status, "ativo")
    };

    const { data: cases, error: casesError } = await supabase
      .from("cases")
      .select("id,title,area,status,created_at")
      .eq("client_id", normalizedClientRecord.id)
      .order("created_at", { ascending: false });

    if (casesError) {
      console.error("[client-workspace] Erro ao buscar casos do cliente", {
        profileId: profile.id,
        clientId: normalizedClientRecord.id,
        error: casesError.message
      });

      return createLoaderResult(
        {
          clientRecord: normalizedClientRecord,
          cases: [],
          caseMap: new Map()
        },
        false,
        "cases_query_failed"
      );
    }

    const normalizedCases = normalizeArray(cases).map((caseItem) =>
      normalizeClientCaseSummaryItem(caseItem)
    );

    return createLoaderResult({
      clientRecord: normalizedClientRecord,
      cases: normalizedCases,
      caseMap: new Map(normalizedCases.map((caseItem) => [caseItem.id, caseItem]))
    });
  } catch (error) {
    console.error("[client-workspace] Excecao ao montar contexto base do cliente", {
      profileId: profile.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return createLoaderResult(
      {
        clientRecord: emptySummary.clientRecord,
        cases: emptySummary.cases,
        caseMap: new Map()
      },
      false,
      "base_context_failed"
    );
  }
}

async function loadClientDocumentsWithCompatibility(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  caseIds: string[]
) {
  return supabase
    .from("documents")
    .select(
      "id,case_id,file_name,category,description,status,visibility,document_date,created_at,storage_path,mime_type,file_size_bytes"
    )
    .in("case_id", caseIds)
    .eq("visibility", "client")
    .order("created_at", { ascending: false });
}

async function loadClientAppointmentsWithCompatibility(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string
) {
  return supabase
    .from("appointments")
    .select(
      "id,case_id,title,appointment_type,starts_at,ends_at,mode,status,notes,visible_to_client"
    )
    .eq("client_id", clientId)
    .eq("visible_to_client", true)
    .order("starts_at", { ascending: true });
}

async function loadClientEventsWithCompatibility(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string
) {
  return supabase
    .from("case_events")
    .select("id,case_id,event_type,title,public_summary,occurred_at")
    .eq("client_id", clientId)
    .eq("visible_to_client", true)
    .order("occurred_at", { ascending: false })
    .limit(100);
}

export async function getClientProfileSummary(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientProfileSummary>> {
  return createLoaderResult(
    normalizeClientProfileSummary(profile) as ClientProfileSummary
  );
}

export async function getClientCaseSummary(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientCaseSummaryData>> {
  const baseContextResult = await loadClientBaseContext(profile);

  return createLoaderResult(
    {
      clientRecord: baseContextResult.data.clientRecord,
      cases: baseContextResult.data.cases,
      mainCase: baseContextResult.data.cases[0] || null,
      totalCases: baseContextResult.data.cases.length
    },
    baseContextResult.ok,
    baseContextResult.reason
  );
}

export async function getClientDocumentsSummary(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientDocumentsSummaryData>> {
  const emptyData = buildEmptyClientDocumentsSummary();
  const supabaseResult = await getSafeClientSupabase(profile);
  const baseContextResult = await loadClientBaseContext(profile);

  if (!supabaseResult.ok || !supabaseResult.data) {
    return createLoaderResult(emptyData, false, supabaseResult.reason || "supabase_unavailable");
  }

  const clientRecord = baseContextResult.data.clientRecord;
  const caseIds = baseContextResult.data.cases.map((caseItem) => caseItem.id);

  if (caseIds.length === 0) {
    return createLoaderResult(
      emptyData,
      false,
      baseContextResult.reason || "client_or_cases_unavailable"
    );
  }

  try {
    const { data: documents, error } = await loadClientDocumentsWithCompatibility(
      supabaseResult.data,
      caseIds
    );

    if (error) {
      console.error("[client-workspace] Erro ao buscar documentos do cliente", {
        profileId: profile.id,
        clientId: clientRecord.id,
        error: error.message
      });

      return createLoaderResult(emptyData, false, "documents_query_failed");
    }

    const normalizedDocuments = normalizeArray(documents).map((document) =>
      normalizeClientDocumentSummaryItem(
        document,
        baseContextResult.data.caseMap.get(normalizeText(document.case_id))?.title || "Caso"
      )
    );

    return createLoaderResult({
      documents: normalizedDocuments,
      availableCount: normalizedDocuments.filter(
        (document) => document.status === "recebido" || document.status === "revisado"
      ).length,
      pendingCount: normalizedDocuments.filter(
        (document) => document.status === "pendente" || document.status === "solicitado"
      ).length,
      totalCount: normalizedDocuments.length
    });
  } catch (error) {
    console.error("[client-workspace] Excecao ao buscar documentos do cliente", {
      profileId: profile.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return createLoaderResult(emptyData, false, "documents_loader_failed");
  }
}

export async function getClientAgendaSummary(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientAgendaSummaryData>> {
  const emptyData = buildEmptyClientAgendaSummary();
  const supabaseResult = await getSafeClientSupabase(profile);
  const baseContextResult = await loadClientBaseContext(profile);

  if (!supabaseResult.ok || !supabaseResult.data) {
    return createLoaderResult(emptyData, false, supabaseResult.reason || "supabase_unavailable");
  }

  const clientRecord = baseContextResult.data.clientRecord;

  try {
    const { data: appointments, error } = await loadClientAppointmentsWithCompatibility(
      supabaseResult.data,
      clientRecord.id
    );

    if (error) {
      console.error("[client-workspace] Erro ao buscar agenda do cliente", {
        profileId: profile.id,
        clientId: clientRecord.id,
        error: error.message
      });

      return createLoaderResult(emptyData, false, "agenda_query_failed");
    }

    const now = new Date();
    const normalizedAppointments = normalizeArray(appointments).map((appointment) =>
      normalizeClientAppointmentSummaryItem(
        appointment,
        baseContextResult.data.caseMap.get(normalizeText(appointment.case_id))?.title || "Caso"
      )
    );
    const upcomingAppointments = normalizedAppointments.filter((appointment) => {
      const startsAt = new Date(appointment.starts_at);

      return (
        !Number.isNaN(startsAt.getTime()) &&
        startsAt >= now &&
        appointment.status !== "cancelled" &&
        appointment.status !== "completed"
      );
    });

    return createLoaderResult({
      appointments: normalizedAppointments,
      upcomingAppointments,
      nextAppointment: upcomingAppointments[0] || null,
      totalAppointments: normalizedAppointments.length
    });
  } catch (error) {
    console.error("[client-workspace] Excecao ao buscar agenda do cliente", {
      profileId: profile.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return createLoaderResult(emptyData, false, "agenda_loader_failed");
  }
}

export async function getClientRequestsSummary(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientRequestsSummaryData>> {
  const emptyData = buildEmptyClientRequestsSummary();
  const supabaseResult = await getSafeClientSupabase(profile);
  const baseContextResult = await loadClientBaseContext(profile);

  if (!supabaseResult.ok || !supabaseResult.data) {
    return createLoaderResult(emptyData, false, supabaseResult.reason || "supabase_unavailable");
  }

  const caseIds = baseContextResult.data.cases.map((caseItem) => caseItem.id);

  if (caseIds.length === 0) {
    return createLoaderResult(
      emptyData,
      false,
      baseContextResult.reason || "cases_unavailable"
    );
  }

  try {
    const { data: requests, error } = await supabaseResult.data
      .from("document_requests")
      .select("id,case_id,title,instructions,due_at,status,visible_to_client,created_at")
      .in("case_id", caseIds)
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[client-workspace] Erro ao buscar solicitacoes do cliente", {
        profileId: profile.id,
        error: error.message
      });

      return createLoaderResult(emptyData, false, "requests_query_failed");
    }

    const normalizedRequests = normalizeArray(requests).map((request) =>
      normalizeClientRequestSummaryItem(
        request,
        baseContextResult.data.caseMap.get(normalizeText(request.case_id))?.title || "Caso"
      )
    );
    const openRequests = normalizedRequests.filter((request) => request.status === "pending");

    return createLoaderResult({
      documentRequests: normalizedRequests,
      openRequests,
      openCount: openRequests.length,
      completedCount: normalizedRequests.filter((request) => request.status === "completed").length
    });
  } catch (error) {
    console.error("[client-workspace] Excecao ao buscar solicitacoes do cliente", {
      profileId: profile.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return createLoaderResult(emptyData, false, "requests_loader_failed");
  }
}

export async function getClientEventsSummary(
  profile: PortalProfile
): Promise<ClientLoaderResult<ClientEventsSummaryData>> {
  const emptyData = buildEmptyClientEventsSummary();
  const supabaseResult = await getSafeClientSupabase(profile);
  const baseContextResult = await loadClientBaseContext(profile);

  if (!supabaseResult.ok || !supabaseResult.data) {
    return createLoaderResult(emptyData, false, supabaseResult.reason || "supabase_unavailable");
  }

  const clientRecord = baseContextResult.data.clientRecord;

  try {
    const { data: events, error } = await loadClientEventsWithCompatibility(
      supabaseResult.data,
      clientRecord.id
    );

    if (error) {
      console.error("[client-workspace] Erro ao buscar eventos do cliente", {
        profileId: profile.id,
        clientId: clientRecord.id,
        error: error.message
      });

      return createLoaderResult(emptyData, false, "events_query_failed");
    }

    const normalizedEvents = normalizeArray(events).map((event) =>
      normalizeClientEventSummaryItem(
        event,
        baseContextResult.data.caseMap.get(normalizeText(event.case_id))?.title || "Caso"
      )
    );

    return createLoaderResult({
      events: normalizedEvents,
      recentEvents: normalizedEvents.slice(0, 5),
      totalEvents: normalizedEvents.length
    });
  } catch (error) {
    console.error("[client-workspace] Excecao ao buscar eventos do cliente", {
      profileId: profile.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return createLoaderResult(emptyData, false, "events_loader_failed");
  }
}

export async function getClientWorkspace(profile: PortalProfile) {
  const [
    caseSummary,
    documentsSummary,
    requestsSummary,
    agendaSummary,
    eventsSummary
  ] = await Promise.all([
    getClientCaseSummary(profile),
    getClientDocumentsSummary(profile),
    getClientRequestsSummary(profile),
    getClientAgendaSummary(profile),
    getClientEventsSummary(profile)
  ]);

  const emptyWorkspace = buildEmptyClientWorkspace();

  return {
    clientRecord: caseSummary.data.clientRecord ?? emptyWorkspace.clientRecord,
    cases: caseSummary.data.cases,
    documents: documentsSummary.data.documents,
    documentRequests: requestsSummary.data.documentRequests,
    appointments: agendaSummary.data.appointments,
    events: eventsSummary.data.events
  };
}
