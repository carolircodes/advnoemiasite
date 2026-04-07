import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
import {
  CLIENT_LOGIN_PATH,
  getAccessMessage,
  getPostAuthDestination,
  normalizeNextPath
} from "@/lib/auth/access-control";
import {
  appendEntryContextToPath,
  getEntryContextPayload,
  readEntryContext,
  type EntryContext
} from "@/lib/entry-context";
import { ensureProfileForUser, getCurrentProfile } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/domain/portal";
import { getPublicMarketingSiteOrigin } from "@/lib/portal/app-urls";
import { recordProductEvent } from "@/lib/services/public-intake";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar na area do cliente",
  description:
    "Acesso seguro ao portal do cliente e ao painel interno, com login por e-mail e senha.",
  alternates: {
    canonical: CLIENT_LOGIN_PATH
  },
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

function getLoginSuccessMessage(success: string) {
  switch (success) {
    case "sessao-encerrada":
      return "Sessao encerrada com sucesso. Entre novamente quando precisar acessar a area protegida.";
    default:
      return "";
  }
}

function readEntryContextFromFormData(formData: FormData): EntryContext {
  return readEntryContext({
    origem: typeof formData.get("origem") === "string" ? String(formData.get("origem")) : "",
    tema: typeof formData.get("tema") === "string" ? String(formData.get("tema")) : "",
    campanha: typeof formData.get("campanha") === "string" ? String(formData.get("campanha")) : "",
    video: typeof formData.get("video") === "string" ? String(formData.get("video")) : ""
  });
}

function buildLoginPath(
  entryContext: Partial<EntryContext>,
  options: {
    error?: string;
    next?: string | null;
  } = {}
) {
  const url = new URL(appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext), "https://app.local");

  if (options.error) {
    url.searchParams.set("error", options.error);
  }

  if (options.next) {
    url.searchParams.set("next", options.next);
  }

  return `${url.pathname}${url.search}`;
}

async function loginAction(formData: FormData) {
  "use server";

  const entryContext = readEntryContextFromFormData(formData);
  const requestedPath = normalizeNextPath(String(formData.get("next") || ""));
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect(buildLoginPath(entryContext, { error: "dados-invalidos", next: requestedPath }));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    redirect(buildLoginPath(entryContext, { error: "credenciais-invalidas", next: requestedPath }));
  }

  const profile = await ensureProfileForUser(data.user);

  try {
    await recordProductEvent({
      eventKey: "portal_access_completed",
      eventGroup: "portal",
      profileId: profile.id,
      payload: {
        role: profile.role,
        source: "password-login",
        ...getEntryContextPayload(entryContext)
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
  const entryContext = readEntryContext(params);
  const clientLoginHref = appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext);
  const entryContextPayload = getEntryContextPayload(entryContext);
  const homeHref = appendEntryContextToPath("/", entryContext);
  const triageHref = appendEntryContextToPath("/triagem", entryContext);
  const recoverAccessHref = appendEntryContextToPath("/auth/esqueci-senha", entryContext);
  const nextPath = typeof params.next === "string" ? normalizeNextPath(params.next) : null;

  if (currentProfile?.is_active) {
    redirect(getPostAuthDestination(currentProfile, nextPath));
  }

  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getLoginErrorMessage(error);
  const success = typeof params.success === "string" ? params.success : "";
  const successMessage = getLoginSuccessMessage(success);

  const publicSiteOrigin = getPublicMarketingSiteOrigin();
  const frameActions: Array<{
    href: string;
    label: string;
    tone?: "primary" | "secondary";
  }> = [
    { href: recoverAccessHref, label: "Recuperar acesso", tone: "secondary" },
    { href: triageHref, label: "Ainda nao sou cliente", tone: "secondary" }
  ];

  if (publicSiteOrigin) {
    frameActions.push({
      href: `${publicSiteOrigin}/`,
      label: "Site institucional",
      tone: "secondary"
    });
  }

  return (
    <AppFrame
      eyebrow="Acesso seguro"
      title="Entrar no portal com clareza, sem etapas confusas."
      description="Clientes acessam o portal com o convite enviado pela equipe e, depois do primeiro acesso, entram com e-mail e senha. A area interna continua protegida para perfis autorizados."
      navigation={[
        { href: homeHref, label: "Inicio" },
        { href: triageHref, label: "Triagem" },
        { href: clientLoginHref, label: "Area do cliente", active: true }
      ]}
      highlights={[
        { label: "Acesso", value: "E-mail e senha" },
        { label: "Primeira entrada", value: "Por convite seguro" },
        { label: "Recuperacao", value: "Link por e-mail" },
        { label: "Ambiente", value: "Clientes e equipe" }
      ]}
      actions={frameActions}
    >
      {successMessage ? <div className="success-notice">{successMessage}</div> : null}
      {errorMessage ? <div className="error-notice">{errorMessage}</div> : null}

      <div className="split">
        <SectionCard
          title="Entrar com e-mail e senha"
          description="Use o mesmo e-mail informado no atendimento. O portal direciona voce automaticamente para a area correta depois do login."
        >
          <form action={loginAction} className="stack">
            <input type="hidden" name="next" value={nextPath || ""} />
            <input type="hidden" name="origem" value={entryContextPayload.origem || ""} />
            <input type="hidden" name="tema" value={entryContextPayload.tema || ""} />
            <input type="hidden" name="campanha" value={entryContextPayload.campanha || ""} />
            <input type="hidden" name="video" value={entryContextPayload.video || ""} />
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
              <Link className="button secondary" href={recoverAccessHref}>
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
            title="Area interna e primeiro contato"
            description="Clientes entram por convite seguro. A area interna continua restrita a perfis provisionados no ambiente e autenticados por sessao."
          >
            <div className="cta-strip">
              <strong>Credenciais internas nao ficam no frontend.</strong>
              <p>O acesso da equipe depende do bootstrap configurado por variaveis de ambiente, enquanto novos atendimentos seguem pela triagem organizada.</p>
              <div className="form-actions">
                <Link className="button" href={triageHref}>
                  Iniciar triagem
                </Link>
                <Link className="button secondary" href={homeHref}>
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
