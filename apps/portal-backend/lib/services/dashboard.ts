import "server-only";

import {
  caseStatusLabels,
  clientStatusLabels,
  portalEventTypeLabels
} from "@/lib/domain/portal";
import type { PortalProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getStaffOverview() {
  const supabase = createAdminSupabaseClient();
  const [clientsResult, casesResult, eventsResult, outboxResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,profile_id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("cases")
      .select("id,title,area,status,client_id,created_at")
      .order("created_at", { ascending: false })
      .limit(18),
    supabase
      .from("case_events")
      .select(
        "id,case_id,event_type,title,occurred_at,visible_to_client,should_notify_client"
      )
      .order("occurred_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications_outbox")
      .select("id,status,template_key,created_at")
      .order("created_at", { ascending: false })
      .limit(12)
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

  if (outboxResult.error) {
    throw new Error(
      `Nao foi possivel carregar a fila de notificacoes: ${outboxResult.error.message}`
    );
  }

  const cases = casesResult.data || [];
  const clients = clientsResult.data || [];
  const events = eventsResult.data || [];
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

  return {
    latestClients: clients.map((client) => ({
      id: client.id,
      fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
      email: profileMap.get(client.profile_id)?.email || "",
      statusLabel: clientStatusLabels[client.status as keyof typeof clientStatusLabels],
      createdAt: client.created_at
    })),
    caseOptions: cases.map((caseItem) => ({
      id: caseItem.id,
      title: caseItem.title,
      status: caseItem.status,
      statusLabel: caseStatusLabels[caseItem.status as keyof typeof caseStatusLabels],
      clientName:
        profileMap.get(clientMap.get(caseItem.client_id)?.profile_id || "")?.full_name ||
        "Cliente"
    })),
    latestCases: cases.slice(0, 6).map((caseItem) => ({
      ...caseItem,
      statusLabel: caseStatusLabels[caseItem.status as keyof typeof caseStatusLabels],
      clientName:
        profileMap.get(clientMap.get(caseItem.client_id)?.profile_id || "")?.full_name ||
        "Cliente"
    })),
    latestEvents: events.map((event) => ({
      ...event,
      caseTitle: caseMap.get(event.case_id)?.title || "Caso",
      eventLabel: portalEventTypeLabels[event.event_type as keyof typeof portalEventTypeLabels]
    })),
    pendingNotifications,
    outboxPreview: outboxResult.data || []
  };
}

export async function getClientWorkspace(profile: PortalProfile) {
  const supabase = createAdminSupabaseClient();
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

  const [documentsResult, appointmentsResult, eventsResult] = await Promise.all([
    caseIds.length
      ? supabase
          .from("documents")
          .select("id,file_name,category,visibility,created_at")
          .in("case_id", caseIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("appointments")
      .select("id,starts_at,ends_at,mode,status,notes")
      .eq("client_id", clientRecord.id)
      .order("starts_at", { ascending: true }),
    supabase
      .from("case_events")
      .select("id,case_id,event_type,title,public_summary,occurred_at")
      .eq("client_id", clientRecord.id)
      .eq("visible_to_client", true)
      .order("occurred_at", { ascending: false })
      .limit(20)
  ]);

  if (documentsResult.error) {
    throw new Error(`Nao foi possivel carregar os documentos: ${documentsResult.error.message}`);
  }

  if (appointmentsResult.error) {
    throw new Error(`Nao foi possivel carregar a agenda: ${appointmentsResult.error.message}`);
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
    documents: documentsResult.data || [],
    appointments: appointmentsResult.data || [],
    events: (eventsResult.data || []).map((event) => ({
      ...event,
      caseTitle: caseMap.get(event.case_id)?.title || "Caso",
      eventLabel: portalEventTypeLabels[event.event_type as keyof typeof portalEventTypeLabels]
    }))
  };
}
