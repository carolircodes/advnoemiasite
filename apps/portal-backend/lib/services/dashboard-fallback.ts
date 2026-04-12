import type { PortalProfile } from "../auth/guards";
import { getClientDisplayName, normalizeDateLabel, normalizeText } from "../portal/client-normalizers";

type ClientLoaderResult<T> = {
  ok: boolean;
  reason: string | null;
  data: T;
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

export async function getClientProfileSummary(profile: PortalProfile) {
  return createLoaderResult(
    {
      displayName: getClientDisplayName(profile.full_name, profile.email),
      email: normalizeText(profile.email, "Nao informado"),
      phoneLabel: normalizeText(profile.phone, "Nao informado"),
      firstLoginCompletedAt: profile.first_login_completed_at,
      firstLoginCompletedLabel: normalizeDateLabel(profile.first_login_completed_at),
      role: profile.role,
      isActive: !!profile.is_active
    },
    false,
    "fallback_mode"
  );
}

export async function getClientCaseSummary(_profile: PortalProfile) {
  return createLoaderResult(
    {
      clientRecord: {
        id: "",
        status: "indisponivel",
        notes: "",
        created_at: new Date().toISOString()
      },
      cases: [] as Array<{
        id: string;
        title: string;
        area: string | null;
        status: string;
        created_at: string;
        statusLabel: string;
      }>,
      mainCase: null,
      totalCases: 0
    },
    false,
    "fallback_mode"
  );
}

export async function getClientDocumentsSummary(_profile: PortalProfile) {
  return createLoaderResult(
    {
      documents: [] as Array<{
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
      }>,
      availableCount: 0,
      pendingCount: 0,
      totalCount: 0
    },
    false,
    "fallback_mode"
  );
}

export async function getClientAgendaSummary(_profile: PortalProfile) {
  return createLoaderResult(
    {
      appointments: [] as Array<{
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
      }>,
      upcomingAppointments: [] as Array<{
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
      }>,
      nextAppointment: null,
      totalAppointments: 0
    },
    false,
    "fallback_mode"
  );
}

export async function getClientRequestsSummary(_profile: PortalProfile) {
  return createLoaderResult(
    {
      documentRequests: [] as Array<{
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
      }>,
      openRequests: [] as Array<{
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
      }>,
      openCount: 0,
      completedCount: 0
    },
    false,
    "fallback_mode"
  );
}

export async function getClientEventsSummary(_profile: PortalProfile) {
  return createLoaderResult(
    {
      events: [] as Array<{
        id: string;
        case_id: string;
        event_type: string;
        title: string;
        public_summary: string;
        occurred_at: string;
        caseTitle: string;
        eventLabel: string;
      }>,
      recentEvents: [] as Array<{
        id: string;
        case_id: string;
        event_type: string;
        title: string;
        public_summary: string;
        occurred_at: string;
        caseTitle: string;
        eventLabel: string;
      }>,
      totalEvents: 0
    },
    false,
    "fallback_mode"
  );
}

export async function getClientWorkspace(profile: PortalProfile) {
  const [caseSummary, documentsSummary, requestsSummary, agendaSummary, eventsSummary] =
    await Promise.all([
      getClientCaseSummary(profile),
      getClientDocumentsSummary(profile),
      getClientRequestsSummary(profile),
      getClientAgendaSummary(profile),
      getClientEventsSummary(profile)
    ]);

  return {
    clientRecord: caseSummary.data.clientRecord,
    cases: caseSummary.data.cases,
    documents: documentsSummary.data.documents,
    documentRequests: requestsSummary.data.documentRequests,
    appointments: agendaSummary.data.appointments,
    events: eventsSummary.data.events
  };
}
