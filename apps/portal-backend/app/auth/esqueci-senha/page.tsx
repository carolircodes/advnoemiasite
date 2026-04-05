import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
import { CLIENT_LOGIN_PATH } from "../../../lib/auth/access-control";
import { getServerEnv } from "../../../lib/config/env";
import { forgotPasswordSchema } from "../../../lib/domain/portal";
import { appendEntryContextToPath, readEntryContext, type EntryContext } from "../../../lib/entry-context";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Recuperar acesso ao portal",
  description:
    "Solicite um novo link para redefinir a senha da sua area do cliente.",
  robots: {
    index: false,
    follow: false
  }
};

function readEntryContextFromFormData(formData: FormData): EntryContext {
  return readEntryContext({
    origem: typeof formData.get("origem") === "string" ? String(formData.get("origem")) : "",
    tema: typeof formData.get("tema") === "string" ? String(formData.get("tema")) : "",
    campanha: typeof formData.get("campanha") === "string" ? String(formData.get("campanha")) : "",
    video: typeof formData.get("video") === "string" ? String(formData.get("video")) : ""
  });
}

function buildForgotPasswordPath(
  entryContext: Partial<EntryContext>,
  searchParams: Record<string, string | null | undefined> = {}
) {
  const url = new URL(appendEntryContextToPath("/auth/esqueci-senha", entryContext), "https://app.local");

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}`;
}

async function forgotPasswordAction(formData: FormData) {
  "use server";

  const entryContext = readEntryContextFromFormData(formData);
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    redirect(buildForgotPasswordPath(entryContext, { error: "email-invalido" }));
  }

  const supabase = await createServerSupabaseClient();
  const env = getServerEnv();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: env.passwordResetRedirectUrl
  });

  if (error) {
    redirect(buildForgotPasswordPath(entryContext, { error: "nao-foi-possivel-enviar" }));
  }

  redirect(buildForgotPasswordPath(entryContext, { success: "email-enviado" }));
}

function getRecoveryErrorMessage(error: string) {
  switch (error) {
    case "email-invalido":
      return "Informe um e-mail valido para receber o link de redefinicao.";
    case "nao-foi-possivel-enviar":
      return "Nao foi possivel enviar o link agora. Verifique o e-mail informado e tente novamente.";
    default:
      return error ? "Nao foi possivel enviar o link agora." : "";
  }
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const entryContext = readEntryContext(params);
  const loginHref = appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext);
  const error = typeof params.error === "string" ? params.error : "";
  const success = typeof params.success === "string" ? params.success : "";
  const errorMessage = getRecoveryErrorMessage(error);

  return (
    <AppFrame
      eyebrow="Recuperacao de acesso"
      title="Solicite um novo link para entrar com tranquilidade."
      description="Se o seu e-mail estiver cadastrado no portal, o link de redefinicao sera enviado com seguranca para a mesma caixa de entrada usada no atendimento."
      actions={[{ href: loginHref, label: "Voltar ao login", tone: "secondary" }]}
    >
      {errorMessage ? <div className="error-notice">{errorMessage}</div> : null}
      {success ? (
        <div className="success-notice">
          Se o e-mail estiver cadastrado, o link de redefinicao ja foi enviado.
        </div>
      ) : null}

      <div className="split">
        <SectionCard
          title="Enviar link de redefinicao"
          description="Use sempre o mesmo e-mail que recebeu o convite inicial do portal."
        >
          <form action={forgotPasswordAction} className="stack">
            <input type="hidden" name="origem" value={entryContext.origem} />
            <input type="hidden" name="tema" value={entryContext.tema} />
            <input type="hidden" name="campanha" value={entryContext.campanha} />
            <input type="hidden" name="video" value={entryContext.video} />
            <div className="fields">
              <div className="field-full">
                <label htmlFor="email">E-mail cadastrado</label>
                <input id="email" name="email" type="email" required />
              </div>
            </div>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Enviando link...">
                Enviar link por e-mail
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="O que acontece depois"
          description="O link leva voce a uma tela segura para escolher a nova senha."
        >
          <ul className="timeline">
            <li>1. O link chega no e-mail cadastrado.</li>
            <li>2. Voce define a nova senha em ambiente autenticado.</li>
            <li>3. O portal passa a aceitar imediatamente a nova combinacao.</li>
          </ul>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
