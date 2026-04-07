import "server-only";

import { assertStaffActor } from "../auth/guards";
import { updateClientSchema } from "../domain/portal";
import { createAdminSupabaseClient } from "../supabase/admin";

export async function updateClientRecord(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = updateClientSchema.parse(rawInput);
  const supabase = createAdminSupabaseClient();

  const { data: currentClient, error: clientError } = await supabase
    .from("clients")
    .select("id,profile_id,cpf,phone,notes,status")
    .eq("id", input.clientId)
    .single();

  if (clientError || !currentClient) {
    throw new Error(clientError?.message || "Nao foi possivel localizar o cadastro do cliente.");
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,is_active,role")
    .eq("id", currentClient.profile_id)
    .single();

  if (profileError || !currentProfile) {
    throw new Error(profileError?.message || "Nao foi possivel localizar o perfil do cliente.");
  }

  if (currentProfile.role !== "cliente") {
    throw new Error("Apenas perfis de cliente podem ser editados neste fluxo.");
  }

  const previousState = {
    email: currentProfile.email,
    fullName: currentProfile.full_name,
    phone: currentClient.phone || currentProfile.phone || "",
    cpf: currentClient.cpf || "",
    status: currentClient.status,
    notes: currentClient.notes || "",
    isActive: currentProfile.is_active
  };

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      is_active: input.isActive
    })
    .eq("id", currentProfile.id);

  if (profileUpdateError) {
    throw new Error(
      `Nao foi possivel atualizar o perfil do cliente: ${profileUpdateError.message}`
    );
  }

  const { error: clientUpdateError } = await supabase
    .from("clients")
    .update({
      cpf: input.cpf,
      phone: input.phone,
      notes: input.notes || null,
      status: input.status
    })
    .eq("id", currentClient.id);

  if (clientUpdateError) {
    await supabase
      .from("profiles")
      .update({
        email: previousState.email,
        full_name: previousState.fullName,
        phone: previousState.phone,
        is_active: previousState.isActive
      })
      .eq("id", currentProfile.id);

    throw new Error(
      `Nao foi possivel atualizar o cadastro interno do cliente: ${clientUpdateError.message}`
    );
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(currentProfile.id, {
    email: input.email,
    email_confirm: true,
    user_metadata: {
      role: "cliente",
      full_name: input.fullName
    }
  });

  if (authError) {
    await supabase
      .from("profiles")
      .update({
        email: previousState.email,
        full_name: previousState.fullName,
        phone: previousState.phone,
        is_active: previousState.isActive
      })
      .eq("id", currentProfile.id);

    await supabase
      .from("clients")
      .update({
        cpf: previousState.cpf || null,
        phone: previousState.phone || null,
        notes: previousState.notes || null,
        status: previousState.status
      })
      .eq("id", currentClient.id);

    throw new Error(
      `Nao foi possivel sincronizar o acesso do cliente com Auth: ${authError.message}`
    );
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    action: "clients.update",
    entity_type: "clients",
    entity_id: currentClient.id,
    payload: {
      previousState,
      currentState: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        cpf: input.cpf,
        status: input.status,
        notes: input.notes,
        isActive: input.isActive
      }
    }
  });

  if (auditError) {
    console.error("[clients.update] Failed to register audit log", {
      clientId: currentClient.id,
      actorProfileId,
      message: auditError.message
    });
  }

  return {
    clientId: currentClient.id,
    profileId: currentProfile.id
  };
}
