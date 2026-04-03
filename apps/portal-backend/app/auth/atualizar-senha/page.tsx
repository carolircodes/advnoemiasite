import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { getDefaultDestinationForRole, requireProfile } from "@/lib/auth/guards";
import { passwordSchema } from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function updatePasswordAction(formData: FormData) {
  "use server";

  const profile = await requireProfile();
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    redirect("/auth/atualizar-senha?error=senha-invalida");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    redirect("/auth/atualizar-senha?error=nao-foi-possivel-atualizar");
  }

  const admin = createAdminSupabaseClient();
  const updatedAt = new Date().toISOString();

  if (profile.role === "cliente" && !profile.first_login_completed_at) {
    await admin
      .from("profiles")
      .update({ first_login_completed_at: updatedAt })
      .eq("id", profile.id);
  }

  await admin.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "auth.password.updated",
    entity_type: "profiles",
    entity_id: profile.id,
    payload: {
      updatedAt
    }
  });

  redirect(`${getDefaultDestinationForRole(profile)}?success=senha-atualizada`);
}

export default async function UpdatePasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfile();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <AppFrame
      eyebrow="Atualizar senha"
      title="Defina uma nova senha para o portal."
      description="Use esta tela depois do link de recuperação enviado por e-mail."
    >
      {error ? (
        <div className="error-notice">
          Não foi possível atualizar a senha. Tente novamente com uma nova combinação.
        </div>
      ) : null}
      <SectionCard
        title="Nova senha"
        description="A nova senha passa a valer imediatamente para os próximos acessos."
      >
        <form action={updatePasswordAction} className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="password">Nova senha</label>
              <input id="password" name="password" type="password" required />
            </div>
            <div className="field-full">
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              Atualizar senha
            </button>
          </div>
        </form>
      </SectionCard>
    </AppFrame>
  );
}

