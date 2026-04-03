import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { passwordSchema } from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function markClientFirstAccessCompleted(profileId: string, completedAt: string) {
  const admin = createAdminSupabaseClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_login_completed_at: completedAt })
    .eq("id", profileId);

  if (profileError) {
    throw new Error(
      `Nao foi possivel concluir o primeiro acesso no perfil: ${profileError.message}`
    );
  }

  const { error: clientError } = await admin
    .from("clients")
    .update({ status: "ativo" })
    .eq("profile_id", profileId)
    .in("status", ["convite-enviado", "aguardando-primeiro-acesso"]);

  if (clientError) {
    throw new Error(
      `Nao foi possivel atualizar o status do cliente: ${clientError.message}`
    );
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_profile_id: profileId,
    action: "auth.first_access.completed",
    entity_type: "profiles",
    entity_id: profileId,
    payload: {
      completedAt
    }
  });

  if (auditError) {
    throw new Error(
      `Nao foi possivel registrar a auditoria do primeiro acesso: ${auditError.message}`
    );
  }
}

async function firstAccessAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["cliente"]);
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    redirect("/auth/primeiro-acesso?error=senha-invalida");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    redirect("/auth/primeiro-acesso?error=nao-foi-possivel-definir-senha");
  }

  const completedAt = new Date().toISOString();
  try {
    await markClientFirstAccessCompleted(profile.id, completedAt);
  } catch (_error) {
    redirect("/auth/primeiro-acesso?error=nao-foi-possivel-finalizar");
  }

  redirect("/cliente?success=primeiro-acesso-concluido");
}

export default async function FirstAccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["cliente"]);

  if (profile.first_login_completed_at) {
    redirect("/cliente");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <AppFrame
      eyebrow="Primeiro acesso"
      title="Defina a senha inicial da sua área do cliente."
      description="Este passo é liberado depois que a equipe envia o convite por e-mail."
      actions={[{ href: "/auth/esqueci-senha", label: "Recuperar senha", tone: "secondary" }]}
    >
      {error ? (
        <div className="error-notice">
          Não foi possível concluir o primeiro acesso. Tente novamente com uma senha
          válida.
        </div>
      ) : null}
      <SectionCard
        title="Senha inicial"
        description="Depois desta etapa, o portal passa a usar e-mail + senha para os próximos acessos."
      >
        <form action={firstAccessAction} className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="password">Nova senha</label>
              <input id="password" name="password" type="password" required />
            </div>
            <div className="field-full">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
          </div>
          <div className="notice">
            Use uma senha exclusiva para o portal. O CPF permanece somente como dado
            cadastral.
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              Salvar senha inicial
            </button>
          </div>
        </form>
      </SectionCard>
    </AppFrame>
  );
}
