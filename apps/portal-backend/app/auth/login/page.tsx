import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
import {
  getAccessMessage,
  getPostAuthDestination,
  normalizeNextPath
} from "@/lib/auth/access-control";
import { ensureProfileForUser, getCurrentProfile } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/domain/portal";
import { recordProductEvent } from "@/lib/services/public-intake";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar na area do cliente",
  description:
    "Acesso seguro ao portal do cliente e ao painel interno, com login por e-mail e senha.",
  robots: {
    index: false,
    follow: false
  }
};

function getLoginErrorMessage(error: string) {
  const accessMessage = getAccessMessage(error);

  if (accessMessage) {
    return accessMessage;
  }

  switch (error) {
    case "dados-invalidos":
      return "Informe um e-mail valido e uma senha para continuar.";
    case "credenciais-invalidas":
      return "Nao foi possivel concluir o acesso. Revise o e-mail e a senha informados.";
    case "link-invalido":
      return "O link recebido nao e valido para este portal.";
    case "link-expirado":
      return "O link de acesso expirou. Solicite um novo envio.";
    case "sessao-nao-disponivel":
      return "Sua sessao nao ficou disponivel. Entre novamente.";
    default:
      return error ? "Nao foi possivel concluir o acesso agora." : "";
  }
}

async function loginAction(formData: FormData) {
  "use server";

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/auth/login?error=dados-invalidos");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    redirect("/auth/login?error=credenciais-invalidas");
  }

  const requestedPath = normalizeNextPath(String(formData.get("next") || ""));
  const profile = await ensureProfileForUser(data.user);

  try {
    await recordProductEvent({
      eventKey: "portal_access_completed",
      eventGroup: "portal",
      profileId: profile.id,
      payload: {
        role: profile.role,
        source: "password-login"
      }
    });
  } catch (trackingError) {
    console.error("[auth.login] Failed to record portal access event", {
      profileId: profile.id,
      message: trackingError instanceof Error ? trackingError.message : String(trackingError)
    });
  }

  redirect(getPostAuthDestination(profile, requestedPath));
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentProfile = await getCurrentProfile();
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? normalizeNextPath(params.next) : null;

  if (currentProfile?.is_active) {
    redirect(getPostAuthDestination(currentProfile, nextPath));
  }

  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getLoginErrorMessage(error);

  return (
    <AppFrame
      eyebrow="Acesso seguro"
      title="Entrar no portal com clareza, sem etapas confusas."
      description="Clientes acessam o portal com o convite enviado pela equipe e, depois do primeiro acesso, entram com e-mail e senha. A area interna continua protegida para perfis autorizados."
      navigation={[
        { href: "/", label: "Inicio" },
        { href: "/triagem", label: "Triagem" },
        { href: "/auth/login", label: "Area do cliente", active: true }
      ]}
      highlights={[
        { label: "Acesso", value: "E-mail e senha" },
        { label: "Primeira entrada", value: "Por convite seguro" },
        { label: "Recuperacao", value: "Link por e-mail" },
        { label: "Ambiente", value: "Clientes e equipe" }
      ]}
      actions={[
        { href: "/auth/esqueci-senha", label: "Recuperar acesso", tone: "secondary" },
        { href: "/triagem", label: "Ainda nao sou cliente", tone: "secondary" }
      ]}
    >
      {errorMessage ? <div className="error-notice">{errorMessage}</div> : null}

      <div className="split">
        <SectionCard
          title="Entrar com e-mail e senha"
          description="Use o mesmo e-mail informado no atendimento. O portal direciona voce automaticamente para a area correta depois do login."
        >
          <form action={loginAction} className="stack">
            <input type="hidden" name="next" value={nextPath || ""} />
            <div className="fields">
              <div className="field-full">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="field-full">
                <label htmlFor="password">Senha</label>
                <input id="password" name="password" type="password" required />
              </div>
            </div>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Entrando no portal...">
                Entrar no portal
              </FormSubmitButton>
              <Link className="button secondary" href="/auth/esqueci-senha">
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </SectionCard>

        <div className="stack">
          <SectionCard
            title="Se este for seu primeiro acesso"
            description="O convite inicial sempre parte da equipe, depois do cadastro interno do atendimento."
          >
            <ul className="timeline">
              <li>1. A equipe cadastra o atendimento e prepara o portal.</li>
              <li>2. Voce recebe um convite seguro por e-mail.</li>
              <li>3. No primeiro acesso, define sua propria senha.</li>
              <li>4. Depois disso, entra normalmente com e-mail e senha.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Se ainda esta no primeiro contato"
            description="A triagem e o melhor caminho para iniciar o atendimento com contexto e organizacao."
          >
            <div className="cta-strip">
              <strong>Comece pela triagem organizada.</strong>
              <p>Ela ajuda a equipe a entender seu momento atual e encaminhar o retorno com mais clareza.</p>
              <div className="form-actions">
                <Link className="button" href="/triagem">
                  Iniciar triagem
                </Link>
                <Link className="button secondary" href="/">
                  Voltar ao inicio
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppFrame>
  );
}
