import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { getServerEnv } from "@/lib/config/env";
import { forgotPasswordSchema } from "@/lib/domain/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function forgotPasswordAction(formData: FormData) {
  "use server";

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    redirect("/auth/esqueci-senha?error=email-invalido");
  }

  const supabase = await createServerSupabaseClient();
  const env = getServerEnv();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: env.passwordResetRedirectUrl
  });

  if (error) {
    redirect("/auth/esqueci-senha?error=nao-foi-possivel-enviar");
  }

  redirect("/auth/esqueci-senha?success=email-enviado");
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const success = typeof params.success === "string" ? params.success : "";

  return (
    <AppFrame
      eyebrow="Recuperação de senha"
      title="Solicite um novo link de acesso."
      description="O link é enviado para o e-mail cadastrado pela equipe."
      actions={[{ href: "/auth/login", label: "Voltar ao login", tone: "secondary" }]}
    >
      {error ? (
        <div className="error-notice">
          Não foi possível enviar o link agora. Verifique o e-mail informado e tente
          novamente.
        </div>
      ) : null}
      {success ? (
        <div className="success-notice">
          Se o e-mail estiver cadastrado, o link de redefinição foi enviado.
        </div>
      ) : null}

      <SectionCard
        title="Enviar link de redefinição"
        description="Use sempre o mesmo e-mail que recebeu o convite inicial do portal."
      >
        <form action={forgotPasswordAction} className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="email">E-mail cadastrado</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              Enviar link por e-mail
            </button>
          </div>
        </form>
      </SectionCard>
    </AppFrame>
  );
}
