import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
import { getDefaultDestinationForProfile, requireProfile } from "@/lib/auth/guards";
import { passwordSchema } from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Atualizar senha do portal",
  description: "Defina uma nova senha para continuar usando o portal com seguranca.",
  robots: {
    index: false,
    follow: false
  }
};

async function markClientFirstAccessCompleted(profileId: string, completedAt: string) {
  const admin = createAdminSupabaseClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_login_completed_at: completedAt })
    .eq("id", profileId);

  if (profileError) {
    throw new Error(
      `Nao foi possivel sincronizar o perfil apos a troca de senha: ${profileError.message}`
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
}

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
  const destinationProfile =
    profile.role === "cliente" && !profile.first_login_completed_at
      ? { ...profile, first_login_completed_at: updatedAt }
      : profile;

  if (profile.role === "cliente" && !profile.first_login_completed_at) {
    try {
      await markClientFirstAccessCompleted(profile.id, updatedAt);
    } catch {
      redirect("/auth/atualizar-senha?error=nao-foi-possivel-finalizar");
    }
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "auth.password.updated",
    entity_type: "profiles",
    entity_id: profile.id,
    payload: {
      updatedAt
    }
  });

  if (auditError) {
    redirect("/auth/atualizar-senha?error=nao-foi-possivel-registrar-auditoria");
  }

  redirect(`${getDefaultDestinationForProfile(destinationProfile)}?success=senha-atualizada`);
}

function getErrorMessage(error: string) {
  switch (error) {
    case "senha-invalida":
      return "Use uma senha valida e confirme a mesma combinacao nos dois campos.";
    case "nao-foi-possivel-atualizar":
      return "Nao foi possivel atualizar sua senha agora. Tente novamente em instantes.";
    case "nao-foi-possivel-finalizar":
      return "A senha mudou, mas a sincronizacao final do acesso nao terminou corretamente.";
    case "nao-foi-possivel-registrar-auditoria":
      return "Sua senha foi alterada, mas houve falha ao concluir o registro interno.";
    default:
      return error ? "Nao foi possivel atualizar a senha." : "";
  }
}

export default async function UpdatePasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfile();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getErrorMessage(error);

  return (
    <AppFrame
      eyebrow="Atualizar senha"
      title="Defina uma nova senha para continuar no portal."
      description="Use esta tela quando o acesso for retomado por link seguro de recuperacao."
    >
      {errorMessage ? <div className="error-notice">{errorMessage}</div> : null}

      <div className="split">
        <SectionCard
          title="Nova senha"
          description="A nova senha passa a valer imediatamente para os proximos acessos."
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
              <FormSubmitButton pendingLabel="Atualizando senha...">
                Atualizar senha
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Depois da atualizacao"
          description="O portal redireciona voce automaticamente para a area correta depois que a senha for salva."
        >
          <ul className="timeline">
            <li>1. A nova senha substitui imediatamente a anterior.</li>
            <li>2. O perfil volta ao fluxo normal de acesso.</li>
            <li>3. Clientes retornam ao proprio painel; perfis internos voltam ao painel operacional.</li>
          </ul>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
