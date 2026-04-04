import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import {
  getAccessMessage,
  getPostAuthDestination,
  normalizeNextPath
} from "@/lib/auth/access-control";
import { ensureProfileForUser, getCurrentProfile } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/domain/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  redirect(getPostAuthDestination(profile, requestedPath));
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentProfile = await getCurrentProfile();
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" ? normalizeNextPath(params.next) : null;

  if (currentProfile?.is_active) {
    redirect(getPostAuthDestination(currentProfile, nextPath));
  }

  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getLoginErrorMessage(error);

  return (
    <AppFrame
      eyebrow="Acesso seguro"
      title="Login unico para clientes e equipe autorizada."
      description="O portal nao possui auto cadastro publico. Clientes entram com o convite enviado pela equipe e a area interna continua protegida por sessao e papel autorizado."
      actions={[
        { href: "/auth/esqueci-senha", label: "Esqueci minha senha", tone: "secondary" },
        { href: "/", label: "Voltar para a base", tone: "secondary" }
      ]}
    >
      {errorMessage ? <div className="error-notice">{errorMessage}</div> : null}

      <div className="split">
        <SectionCard
          title="Entrar com e-mail e senha"
          description="Use o e-mail cadastrado pela equipe. O mesmo login atende clientes e perfis internos autorizados."
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
              <button className="button" type="submit">
                Entrar no portal
              </button>
              <Link className="button secondary" href="/auth/esqueci-senha">
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Primeiro acesso"
          description="A equipe cria o cadastro interno, vincula o caso e libera o portal pelo e-mail informado. O acesso inicial sempre comeca pelo link seguro do convite."
        >
          <ul className="timeline">
            <li>1. A advogada cadastra o cliente e abre o caso inicial.</li>
            <li>2. O sistema envia um convite de acesso para o e-mail informado.</li>
            <li>3. O cliente define sua propria senha na primeira entrada.</li>
            <li>4. A partir disso, o login passa a ser sempre por e-mail + senha.</li>
          </ul>
          <div className="form-actions">
            <Link className="button" href="/auth/esqueci-senha">
              Preciso de novo link
            </Link>
            <Link className="button secondary" href="/">
              Voltar para a base
            </Link>
          </div>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
