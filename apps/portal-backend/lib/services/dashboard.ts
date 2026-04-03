import "server-only";

import { clientStatusLabels, portalEventTypeLabels } from "@/lib/domain/portal";
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
      .select("id,title,area,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("case_events")
      .select("id,event_type,title,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("notifications_outbox")
      .select("id,status,template_key,created_at")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  if (clientsResult.error) {
    throw new Error(`Não foi possível carregar os clientes: ${clientsResult.error.message}`);
  }

  if (casesResult.error) {
    throw new Error(`Não foi possível carregar os casos: ${casesResult.error.message}`);
  }

  if (eventsResult.error) {
    throw new Error(`Não foi possível carregar os eventos: ${eventsResult.error.message}`);
  }

  if (outboxResult.error) {
    throw new Error(`Não foi possível carregar a fila de notificações: ${outboxResult.error.message}`);
  }

  const profileIds = (clientsResult.data || []).map((item) => item.profile_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const pendingNotifications = (outboxResult.data || []).filter(
    (item) => item.status === "pending"
  ).length;

  return {
    latestClients: (clientsResult.data || []).map((client) => ({
      id: client.id,
      fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
      email: profileMap.get(client.profile_id)?.email || "",
      statusLabel: clientStatusLabels[client.status as keyof typeof clientStatusLabels],
      createdAt: client.created_at
    })),
    latestCases: casesResult.data || [],
    latestEvents: (eventsResult.data || []).map((event) => ({
      ...event,
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
      clientError?.message || "Não foi possível localizar o cadastro do cliente."
    );
  }

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id,title,area,status,created_at")
    .eq("client_id", clientRecord.id)
    .order("created_at", { ascending: false });

  if (casesError) {
    throw new Error(`Não foi possível carregar os casos: ${casesError.message}`);
  }

  const caseIds = (cases || []).map((item) => item.id);

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
      .select("id,event_type,title,public_summary,occurred_at")
      .eq("client_id", clientRecord.id)
      .order("occurred_at", { ascending: false })
      .limit(10)
  ]);

  if (documentsResult.error) {
    throw new Error(`Não foi possível carregar os documentos: ${documentsResult.error.message}`);
  }

  if (appointmentsResult.error) {
    throw new Error(`Não foi possível carregar a agenda: ${appointmentsResult.error.message}`);
  }

  if (eventsResult.error) {
    throw new Error(`Não foi possível carregar as atualizações: ${eventsResult.error.message}`);
  }

  return {
    clientRecord,
    cases: cases || [],
    documents: documentsResult.data || [],
    appointments: appointmentsResult.data || [],
    events: (eventsResult.data || []).map((event) => ({
      ...event,
      eventLabel: portalEventTypeLabels[event.event_type as keyof typeof portalEventTypeLabels]
    }))
  };
}
