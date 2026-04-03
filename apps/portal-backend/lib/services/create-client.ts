import "server-only";

import { getServerEnv } from "@/lib/config/env";
import {
  caseAreaLabels,
  createClientSchema,
  mapClientStatusToCaseStatus
} from "@/lib/domain/portal";
import { queueClientInviteTracking } from "@/lib/notifications/outbox";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function createClientWithInvite(rawInput: unknown, actorProfileId: string) {
  const input = createClientSchema.parse(rawInput);
  const env = getServerEnv();
  const supabase = createAdminSupabaseClient();
  const invitedAt = new Date().toISOString();

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    input.email,
    {
      redirectTo: env.inviteRedirectUrl,
      data: {
        role: "cliente",
        full_name: input.fullName
      }
    }
  );

  if (inviteError || !inviteData.user) {
    throw new Error(
      inviteError?.message ||
        "NÃ£o foi possÃ­vel criar o convite inicial para este cliente."
    );
  }

  const userId = inviteData.user.id;

  try {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        role: "cliente",
        is_active: true,
        invited_at: invitedAt,
        first_login_completed_at: null
      },
      {
        onConflict: "id"
      }
    );

    if (profileError) {
      throw new Error(`NÃ£o foi possÃ­vel salvar o perfil do cliente: ${profileError.message}`);
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .upsert(
        {
          profile_id: userId,
          cpf: input.cpf,
          phone: input.phone,
          notes: input.notes || null,
          status: input.status,
          created_by: actorProfileId
        },
        {
          onConflict: "profile_id"
        }
      )
      .select("id,status")
      .single();

    if (clientError || !client) {
      throw new Error(
        clientError?.message || "NÃ£o foi possÃ­vel criar o cadastro interno do cliente."
      );
    }

    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .insert({
        client_id: client.id,
        area: input.caseArea,
        title: `Atendimento inicial - ${input.fullName}`,
        summary:
          input.notes || `Cadastro interno criado para ${caseAreaLabels[input.caseArea]}.`,
        status: mapClientStatusToCaseStatus(input.status),
        priority: "normal",
        assigned_staff_id: actorProfileId
      })
      .select("id")
      .single();

    if (caseError || !caseRecord) {
      throw new Error(caseError?.message || "NÃ£o foi possÃ­vel abrir o caso inicial.");
    }

    const { data: eventRecord, error: eventError } = await supabase
      .from("case_events")
      .insert({
        case_id: caseRecord.id,
        client_id: client.id,
        event_type: "status_change",
        title: "Cadastro interno concluÃ­do",
        description:
          "Cliente criado pela equipe com convite de primeiro acesso preparado para envio por e-mail.",
        public_summary:
          "Seu acesso ao portal estÃ¡ sendo preparado pela equipe responsÃ¡vel.",
        triggered_by: actorProfileId,
        should_notify_client: false,
        payload: {
          caseArea: input.caseArea,
          clientStatus: input.status
        }
      })
      .select("id")
      .single();

    if (eventError || !eventRecord) {
      throw new Error(eventError?.message || "NÃ£o foi possÃ­vel registrar o evento inicial.");
    }

    const inviteNotification = await queueClientInviteTracking({
      clientProfileId: userId,
      clientEmail: input.email,
      fullName: input.fullName,
      caseAreaLabel: caseAreaLabels[input.caseArea],
      clientId: client.id
    });

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: actorProfileId,
      action: "clients.create",
      entity_type: "clients",
      entity_id: client.id,
      payload: {
        clientStatus: input.status,
        caseId: caseRecord.id,
        eventId: eventRecord.id,
        inviteNotificationId: inviteNotification.id
      }
    });

    if (auditError) {
      throw new Error(`NÃ£o foi possÃ­vel registrar a auditoria do cadastro: ${auditError.message}`);
    }

    return {
      userId,
      clientId: client.id,
      caseId: caseRecord.id,
      eventId: eventRecord.id,
      inviteNotificationId: inviteNotification.id,
      invitedAt
    };
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId).catch(() => null);
    throw error;
  }
}

export async function listLatestClients(limit = 8) {
  const supabase = createAdminSupabaseClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id,profile_id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`NÃ£o foi possÃ­vel listar os clientes: ${error.message}`);
  }

  const profileIds = (clients || []).map((item) => item.profile_id);

  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return (clients || []).map((client) => ({
    ...client,
    fullName: profileMap.get(client.profile_id)?.full_name || "Cliente",
    email: profileMap.get(client.profile_id)?.email || ""
  }));
}
