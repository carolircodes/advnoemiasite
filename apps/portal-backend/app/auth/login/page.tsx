import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import {
  getCurrentProfile,
  getDefaultDestinationForRole,
  getProfileById
} from "@/lib/auth/guards";
import { loginSchema } from "@/lib/domain/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const profile = await getProfileById(data.user.id);

  if (!profile) {
    redirect("/auth/login?error=perfil-nao-localizado");
  }

  if (profile.role === "cliente" && !profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  redirect(getDefaultDestinationForRole(profile));
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentProfile = await getCurrentProfile();

  if (currentProfile) {
    redirect(getDefaultDestinationForRole(currentProfile));
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <AppFrame
      eyebrow="Área do cliente"
      title="Acesso para clientes já cadastrados pela equipe."
      description="O portal não possui auto cadastro. O cliente recebe um convite por e-mail e define a própria senha no primeiro acesso."
      actions={[
        { href: "/auth/esqueci-senha", label: "Esqueci minha senha", tone: "secondary" },
        { href: "/internal/advogada", label: "Painel da advogada", tone: "secondary" }
      ]}
    >
      {error ? (
        <div className="error-notice">
          Não foi possível concluir o acesso. Revise o e-mail e a senha ou use o fluxo
          de recuperação.
        </div>
      ) : null}

      <div className="split">
        <SectionCard
          title="Entrar com e-mail e senha"
          description="Use o e-mail cadastrado pela equipe. O CPF não é utilizado como senha."
        >
          <form action={loginAction} className="stack">
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
                Entrar na área do cliente
              </button>
              <Link className="button secondary" href="/auth/esqueci-senha">
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Primeiro acesso"
          description="A equipe cria o cadastro interno, vincula o caso e libera o portal pelo e-mail informado. A mesma base de autenticação também atende o acesso interno da equipe."
        >
          <ul className="timeline">
            <li>1. A advogada cadastra o cliente e abre o caso inicial.</li>
            <li>2. O sistema envia um convite de acesso para o e-mail informado.</li>
            <li>3. O cliente define sua própria senha na primeira entrada.</li>
            <li>4. A partir disso, o login passa a ser sempre por e-mail + senha.</li>
          </ul>
          <div className="form-actions">
            <Link className="button" href="/auth/primeiro-acesso">
              Concluir primeiro acesso
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
