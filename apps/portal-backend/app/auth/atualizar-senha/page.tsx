import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getDefaultDestinationForProfile,
  requireProfile
} from "@/lib/auth/guards";
import {
  getAuthEnvDiagnostics,
  isAuthEnvConfigurationError
} from "@/lib/config/env";
import { passwordSchema } from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Atualizar senha do portal",
  description: "Defina uma nova senha para continuar usando o portal com segurança.",
  alternates: {
    canonical: "/auth/atualizar-senha"
  },
  robots: {
    index: false,
    follow: false
  }
};

function CheckIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-8 8.08a1 1 0 0 1-1.42.007l-4.01-3.99a1 1 0 0 1 1.41-1.42l3.3 3.285 7.296-7.37a1 1 0 0 1 1.418-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ShieldIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 1.944a.75.75 0 0 1 .66.39l1.08 1.973 2.22.382a.75.75 0 0 1 .416 1.279l-1.581 1.477.374 2.084a.75.75 0 0 1-1.088.791L10 9.582l-1.999 1.048a.75.75 0 0 1-1.088-.79l.374-2.084-1.581-1.477a.75.75 0 0 1 .416-1.28l2.22-.381 1.08-1.974A.75.75 0 0 1 10 1.944Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

async function markClientFirstAccessCompleted(profileId: string, completedAt: string) {
  const admin = createAdminSupabaseClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_login_completed_at: completedAt })
    .eq("id", profileId);

  if (profileError) {
    throw new Error(
      `Não foi possível sincronizar o perfil após a troca de senha: ${profileError.message}`
    );
  }

  const { error: clientError } = await admin
    .from("clients")
    .update({ status: "ativo" })
    .eq("profile_id", profileId)
    .in("status", ["convite-enviado", "aguardando-primeiro-acesso"]);

  if (clientError) {
    throw new Error(
      `Não foi possível atualizar o status do cliente: ${clientError.message}`
    );
  }
}

async function updatePasswordAction(formData: FormData) {
  "use server";

  const profile = await requireProfile();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const parsed = passwordSchema.safeParse({ password, confirmPassword });

  if (!parsed.success) {
    redirect("/auth/atualizar-senha?error=senha-invalida");
  }

  try {
    const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    redirect("/auth/atualizar-senha?error=nao-foi-possivel-atualizar");
  }

  const completedAt = new Date().toISOString();
  const destinationProfile = profile;

  // Marca primeiro acesso como concluído se for o caso
  if (!profile.first_login_completed_at) {
    try {
      await markClientFirstAccessCompleted(profile.id, completedAt);
    } catch (completionError) {
      console.error("[auth.atualizar-senha] Failed to mark first access completed", {
        profileId: profile.id,
        message: completionError instanceof Error ? completionError.message : String(completionError)
      });
      redirect("/auth/atualizar-senha?error=nao-foi-possivel-finalizar");
    }
  }

  // Registra auditoria
  try {
    const admin = createAdminSupabaseClient();
    await admin.from("password_change_audit").insert({
      profile_id: profile.id,
      changed_at: completedAt,
      changed_via: "recovery_link"
    });
  } catch (auditError) {
    console.error("[auth.atualizar-senha] Failed to record audit", {
      profileId: profile.id,
      message: auditError instanceof Error ? auditError.message : String(auditError)
    });
    redirect("/auth/atualizar-senha?error=nao-foi-possivel-registrar-auditoria");
  }

  redirect(`${getDefaultDestinationForProfile(destinationProfile)}?success=senha-atualizada`);
  } catch (error) {
    console.error("[auth.atualizar-senha] Auth flow unavailable", {
      profileId: profile.id,
      message: error instanceof Error ? error.message : String(error),
      authEnv: getAuthEnvDiagnostics()
    });

    redirect(
      `/auth/atualizar-senha?error=${
        isAuthEnvConfigurationError(error) ? "auth-indisponivel" : "nao-foi-possivel-atualizar"
      }`
    );
  }
}

function getErrorMessage(error: string) {
  switch (error) {
    case "senha-invalida":
      return "Use uma senha válida e confirme a mesma combinação nos dois campos.";
    case "nao-foi-possivel-atualizar":
      return "Não foi possível atualizar sua senha agora. Tente novamente em instantes.";
    case "auth-indisponivel":
      return "A autenticacao do portal esta temporariamente indisponivel. Tente novamente em instantes.";
    case "nao-foi-possivel-finalizar":
      return "A senha mudou, mas a sincronização final do acesso não terminou corretamente.";
    case "nao-foi-possivel-registrar-auditoria":
      return "Sua senha foi alterada, mas houve falha ao concluir o registro interno.";
    default:
      return error ? "Não foi possível atualizar a senha." : "";
  }
}

export default async function UpdatePasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getErrorMessage(error);

  return (
    <main className="auth-page min-h-screen bg-[#f7f4ee] text-[#10261d]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Card de Atualização - Esquerda */}
          <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-white via-white to-[#fafbff] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.04),0_8px_32px_rgba(142,106,59,0.02),0_2px_8px_rgba(16,38,29,0.02)] backdrop-blur-sm sm:p-14 lg:p-16">
            <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
              Atualização de senha
            </div>

            <div className="mt-10">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] leading-[1.08] text-[#10261d] sm:text-4xl sm:leading-[1.06]">
                Definir nova senha
              </h1>
              <p className="mt-5 max-w-xl text-base leading-[1.7] text-[#7a8a83] sm:text-lg sm:leading-[1.68]">
                Crie uma senha forte e segura para continuar acessando o portal com total tranquilidade.
              </p>
            </div>

            {errorMessage ? (
              <div className="mt-8 rounded-2xl border border-[#f5e6e6] bg-gradient-to-r from-[#fff9f9] via-[#fff7f7] to-[#fff9f9] p-5 shadow-[0_4px_16px_rgba(239,68,68,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f8d7d7] to-[#f1c5c5] text-[#d97777]">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a1 1 0 00-.867.5 1 1 0 00.006 1.414l4 4a1 1 0 001.414.006A1 1 0 0010 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium leading-[1.6] text-[#9b5757]">
                    {errorMessage}
                  </p>
                </div>
              </div>
            ) : null}

            <form action={updatePasswordAction} className="mt-8 space-y-6">
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-3 block text-sm font-medium text-[#4a5a54]"
                  >
                    Nova senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Digite sua nova senha"
                    className="h-[60px] w-full rounded-2xl border border-[#e8e2d6] bg-white px-6 text-base text-[#10261d] outline-none transition-all duration-300 placeholder:text-[#a8b5af] focus:border-[#8e6a3b] focus:shadow-[0_0_0_4px_rgba(142,106,59,0.08),0_0_0_12px_rgba(142,106,59,0.03)] focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-20 focus:translate-y-[-1px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-3 block text-sm font-medium text-[#4a5a54]"
                  >
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Confirme sua nova senha"
                    className="h-[60px] w-full rounded-2xl border border-[#e8e2d6] bg-white px-6 text-base text-[#10261d] outline-none transition-all duration-300 placeholder:text-[#a8b5af] focus:border-[#8e6a3b] focus:shadow-[0_0_0_4px_rgba(142,106,59,0.08),0_0_0_12px_rgba(142,106,59,0.03)] focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-20 focus:translate-y-[-1px]"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="group inline-flex h-[60px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-base font-semibold text-white shadow-[0_12px_32px_rgba(142,106,59,0.15),0_4px_16px_rgba(142,106,59,0.1)] transition-all duration-300 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_20px_48px_rgba(142,106,59,0.2),0_8px_24px_rgba(142,106,59,0.15)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98] active:shadow-[0_8px_24px_rgba(142,106,59,0.1),0_2px_8px_rgba(142,106,59,0.05)]"
                >
                  <span className="transition-transform duration-300 group-hover:scale-105">Atualizar minha senha</span>
                </button>
              </div>

              <div className="pt-3 text-center">
                <Link
                  href="/portal/login"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#7a8a83] transition-all duration-200 hover:text-[#8e6a3b] hover:gap-2"
                >
                  <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Voltar ao login</span>
                </Link>
              </div>
            </form>
          </section>

          {/* Conteúdo Institucional - Direita */}
          <aside className="space-y-8">
            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.03),0_8px_32px_rgba(142,106,59,0.01)] backdrop-blur-sm sm:p-14">
              <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
                Senha forte e segura
              </h2>

              <div className="mt-10 space-y-6">
                {[
                  {
                    title: "Mínimo de 8 caracteres",
                    text: "Use combinações de letras, números e caracteres especiais para maior segurança.",
                  },
                  {
                    title: "Atualização imediata",
                    text: "Sua nova senha passa a valer assim que o processo for concluído com sucesso.",
                  },
                  {
                    title: "Acesso exclusivo",
                    text: "Apenas você terá acesso ao portal com sua nova senha pessoal e intransferível.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="group flex items-start gap-4 rounded-2xl border border-[#ede7dc] bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-sm p-6 shadow-[0_4px_16px_rgba(16,38,29,0.02)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(16,38,29,0.04)] hover:bg-white hover:-translate-y-[1px] hover:border-[#e5ddd4]"
                  >
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] text-white shadow-[0_4px_8px_rgba(142,106,59,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_12px_rgba(142,106,59,0.2)]">
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#10261d] leading-[1.4] transition-colors duration-300 group-hover:text-[#0a1a1a]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-[1.65] text-[#5f6f68] transition-colors duration-300 group-hover:text-[#4a5a54]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e8f2e8] bg-gradient-to-br from-[#f8fbf8] via-[#f4f9f5] to-[#f0f7f2] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.02),0_8px_32px_rgba(47,122,82,0.01)] backdrop-blur-sm">
              <h3 className="flex items-center gap-3 text-lg font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#2f7a52] to-[#246342] shadow-[0_2px_4px_rgba(47,122,82,0.2)]" />
                Segurança reforçada
              </h3>

              <div className="mt-8 space-y-5">
                {[
                  "Sua anterior senha será desativada automaticamente.",
                  "Recomendamos não usar senhas de outros serviços.",
                  "Guarde sua nova senha em local seguro.",
                ].map((item) => (
                  <div key={item} className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white/70 to-white/50 backdrop-blur-sm p-5 shadow-[0_4px_16px_rgba(47,122,82,0.02)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(47,122,82,0.04)] hover:bg-white/80 hover:-translate-y-[1px]">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcf2e3] to-[#c8e8d4] text-[#2f7a52] shadow-[0_4px_8px_rgba(47,122,82,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_12px_rgba(47,122,82,0.2)]">
                      <ShieldIcon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm leading-[1.65] text-[#4e5f58] transition-colors duration-300 group-hover:text-[#3a5a4a]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.03),0_8px_32px_rgba(142,106,59,0.01)] backdrop-blur-sm">
              <h3 className="flex items-center gap-3 text-lg font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
                Suporte disponível
              </h3>

              <div className="mt-8 space-y-5">
                <p className="text-sm leading-[1.65] text-[#5f6f68]">
                  Após atualizar sua senha, você terá acesso completo ao portal com todos os recursos disponíveis.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/triagem"
                    className="group inline-flex h-[60px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(142,106,59,0.15),0_4px_16px_rgba(142,106,59,0.1)] transition-all duration-300 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_20px_48px_rgba(142,106,59,0.2),0_8px_24px_rgba(142,106,59,0.15)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Falar com equipe</span>
                  </Link>

                  <Link
                    href="/portal/login"
                    className="group inline-flex h-[60px] items-center justify-center rounded-2xl border border-[#d8d2c8] bg-gradient-to-br from-white via-white to-[#fafbfb] px-8 text-sm font-semibold text-[#10261d] shadow-[0_4px_16px_rgba(16,38,29,0.04)] transition-all duration-300 hover:bg-white hover:shadow-[0_8px_32px_rgba(16,38,29,0.08)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Ir para o login</span>
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
