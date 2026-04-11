import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
import {
  getAuthEnvDiagnostics,
  isAuthEnvConfigurationError
} from "@/lib/config/env";
import { loginSchema } from "@/lib/domain/portal";
import { getPublicMarketingSiteOrigin } from "@/lib/portal/app-urls";
import { recordProductEvent } from "@/lib/services/public-intake";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar na área do cliente",
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

function getLoginErrorMessage(error: string) {
  const accessMessage = getAccessMessage(error);

  if (accessMessage) {
    return accessMessage;
  }

  switch (error) {
    case "dados-invalidos":
      return "Informe um e-mail válido e uma senha para continuar.";
    case "credenciais-invalidas":
      return "Não foi possível concluir o acesso. Revise o e-mail e a senha informados.";
    case "erro-encerrar-sessao":
      return "Nao foi possivel encerrar sua sessao agora. Tente novamente em instantes.";
    case "link-invalido":
      return "O link recebido não é válido para este portal.";
    case "link-expirado":
      return "O link de acesso expirou. Solicite um novo envio.";
    case "sessao-nao-disponivel":
      return "Sua sessão não ficou disponível. Entre novamente.";
    case "erro-carregar-dados":
      return "Não foi possível carregar seus dados. Tente novamente ou entre em contato com o suporte.";
    default:
      return error ? "Não foi possível concluir o acesso agora." : "";
  }
}

function getLoginSuccessMessage(success: string) {
  switch (success) {
    case "sessao-encerrada":
      return "Sessão encerrada com sucesso. Entre novamente quando precisar acessar a área protegida.";
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

  let profile;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      redirect(
        buildLoginPath(entryContext, { error: "credenciais-invalidas", next: requestedPath })
      );
    }

    profile = await ensureProfileForUser(data.user);
  } catch (error) {
    console.error("[auth.login] Failed to complete sign-in", {
      message: error instanceof Error ? error.message : String(error),
      authEnv: getAuthEnvDiagnostics()
    });

    redirect(
      buildLoginPath(entryContext, {
        error: isAuthEnvConfigurationError(error) ? "auth-indisponivel" : "erro-interno",
        next: requestedPath
      })
    );
  }

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
    // Se for cliente e não tiver primeiro acesso, mas já estiver na página de login,
    // permitir que faça login normalmente em vez de redirecionar automaticamente
    if (currentProfile.role === "cliente" && !currentProfile.first_login_completed_at) {
      // Permanece na página de login para permitir acesso manual
      // O usuário pode fazer login se já tiver credenciais funcionais
    } else {
      redirect(getPostAuthDestination(currentProfile, nextPath));
    }
  }

  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getLoginErrorMessage(error);
  const success = typeof params.success === "string" ? params.success : "";
  const successMessage = getLoginSuccessMessage(success);

  return (
    <main className="auth-page min-h-screen bg-[#f7f4ee] text-[#10261d]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Card de Login - Esquerda */}
          <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-white via-white to-[#fafbff] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.04),0_8px_32px_rgba(142,106,59,0.02),0_2px_8px_rgba(16,38,29,0.02)] backdrop-blur-sm sm:p-14 lg:p-16">
            <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
              Portal do cliente
            </div>

            <div className="mt-10">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] leading-[1.08] text-[#10261d] sm:text-4xl sm:leading-[1.06]">
                Entrar no portal
              </h1>
              <p className="mt-5 max-w-xl text-base leading-[1.7] text-[#7a8a83] sm:text-lg sm:leading-[1.68]">
                Acesse seu ambiente para acompanhar documentos, atualizações e próximos passos com total segurança.
              </p>
            </div>

            {currentProfile?.role === "cliente" && !currentProfile.first_login_completed_at ? (
              <div className="mt-8 rounded-2xl border border-[#f0e6d6] bg-gradient-to-r from-[#fff9f4] via-[#fff7f2] to-[#fff9f4] p-5 shadow-[0_4px_16px_rgba(142,106,59,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f8e6d7] to-[#f1d5c5] text-[#d97757]">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-[1.6] text-[#9b7757]">
                      Detectamos que seu primeiro acesso ainda não foi concluído
                    </p>
                    <p className="mt-2 text-sm leading-[1.6] text-[#7a6a5a]">
                      Se você já recebeu suas credenciais por e-mail, tente fazer login abaixo. Caso contrário, 
                      <Link href="/auth/primeiro-acesso" className="font-medium text-[#8e6a3b] hover:text-[#7b5c31] underline">
                        clique aqui para completar seu primeiro acesso
                      </Link>.
                    </p>
                  </div>
                </div>
              </div>
            ) : errorMessage ? (
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

            {successMessage ? (
              <div className="mt-8 rounded-2xl border border-[#e6f5e6] bg-gradient-to-r from-[#f9fff9] via-[#f7fff7] to-[#f9fff9] p-5 shadow-[0_4px_16px_rgba(68,157,68,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d7f2d7] to-[#c5e8c5] text-[#44b444]">
                    <CheckIcon className="h-3 w-3" />
                  </div>
                  <p className="text-sm font-medium leading-[1.6] text-[#577c57]">
                    {successMessage}
                  </p>
                </div>
              </div>
            ) : null}

            <form action={loginAction} className="mt-8 space-y-6">
              <input type="hidden" name="next" value={nextPath || ""} />
              <input type="hidden" name="origem" value={entryContextPayload.origem || ""} />
              <input type="hidden" name="tema" value={entryContextPayload.tema || ""} />
              <input type="hidden" name="campanha" value={entryContextPayload.campanha || ""} />
              <input type="hidden" name="video" value={entryContextPayload.video || ""} />
              
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-3 block text-sm font-medium text-[#4a5a54]"
                  >
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Qual seu e-mail de acesso?"
                    className="h-[60px] w-full rounded-2xl border border-[#e8e2d6] bg-white px-6 text-base text-[#10261d] outline-none transition-all duration-300 placeholder:text-[#a8b5af] focus:border-[#8e6a3b] focus:shadow-[0_0_0_4px_rgba(142,106,59,0.08),0_0_0_12px_rgba(142,106,59,0.03)] focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-20 focus:translate-y-[-1px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-3 block text-sm font-medium text-[#4a5a54]"
                  >
                    Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Qual sua senha?"
                    className="h-[60px] w-full rounded-2xl border border-[#e8e2d6] bg-white px-6 text-base text-[#10261d] outline-none transition-all duration-300 placeholder:text-[#a8b5af] focus:border-[#8e6a3b] focus:shadow-[0_0_0_4px_rgba(142,106,59,0.08),0_0_0_12px_rgba(142,106,59,0.03)] focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-20 focus:translate-y-[-1px]"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="group inline-flex h-[60px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-base font-semibold text-white shadow-[0_12px_32px_rgba(142,106,59,0.15),0_4px_16px_rgba(142,106,59,0.1)] transition-all duration-300 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_20px_48px_rgba(142,106,59,0.2),0_8px_24px_rgba(142,106,59,0.15)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98] active:shadow-[0_8px_24px_rgba(142,106,59,0.1),0_2px_8px_rgba(142,106,59,0.05)]"
                >
                  <span className="transition-transform duration-300 group-hover:scale-105">Entrar no portal</span>
                </button>
              </div>

              <div className="pt-3 text-center">
                <Link
                  href={recoverAccessHref}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#7a8a83] transition-all duration-200 hover:text-[#8e6a3b] hover:gap-2"
                >
                  <span>Esqueci minha senha</span>
                  <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </form>
          </section>

          {/* Conteúdo Institucional - Direita */}
          <aside className="space-y-8">
            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.03),0_8px_32px_rgba(142,106,59,0.01)] backdrop-blur-sm sm:p-14">
              <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
                Um ambiente pensado para dar clareza ao seu atendimento
              </h2>

              <div className="mt-10 space-y-6">
                {[
                  {
                    title: "Acompanhamento claro do seu caso",
                    text: "Visualize o status atual, próximos passos e evolução do seu atendimento em tempo real.",
                  },
                  {
                    title: "Comunicação organizada com a equipe",
                    text: "Mensagens centralizadas, atualizações importantes e histórico completo das interações.",
                  },
                  {
                    title: "Documentos centralizados",
                    text: "Acesso seguro a todos os documentos do seu processo, com organização e facilidade de consulta.",
                  },
                  {
                    title: "Histórico completo do atendimento",
                    text: "Linha do tempo detalhada com todas as etapas, datas marcantes e decisões importantes.",
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
                Segurança e confidencialidade
              </h3>

              <div className="mt-8 space-y-5">
                {[
                  "Seus dados são protegidos com criptografia de ponta.",
                  "Acesso individual e pessoal, intransferível.",
                  "Comunicação segura entre você e a equipe jurídica.",
                ].map((item) => (
                  <div key={item} className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white/70 to-white/50 backdrop-blur-sm p-5 shadow-[0_4px_16px_rgba(47,122,82,0.02)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(47,122,82,0.04)] hover:bg-white/80 hover:-translate-y-[1px]">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcf2e3] to-[#c8e8d4] text-[#2f7a52] shadow-[0_4px_8px_rgba(47,122,82,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_12px_rgba(47,122,82,0.2)]">
                      <ShieldIcon className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-[1.65] text-[#4e5f58] transition-colors duration-300 group-hover:text-[#3a5a4a]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.03),0_8px_32px_rgba(142,106,59,0.01)] backdrop-blur-sm">
              <h3 className="flex items-center gap-3 text-lg font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
                Primeiro acesso?
              </h3>

              <div className="mt-8 space-y-5">
                <p className="text-sm leading-[1.65] text-[#5f6f68]">
                  Se este for seu primeiro acesso, você precisa receber um convite da equipe para criar sua senha inicial.
                </p>

                <div className="rounded-2xl border border-[#f4e4d1] bg-gradient-to-r from-[#fff8e9] via-[#fff5e4] to-[#fff8e9] p-6 shadow-[0_4px_16px_rgba(142,106,59,0.04)]">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f3e2bd] to-[#e8d4b3] text-[#8e6a3b] shadow-[0_4px_8px_rgba(142,106,59,0.15)]">
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#6f542d] leading-[1.4]">
                        Como funciona
                      </p>
                      <p className="mt-2 text-sm leading-[1.65] text-[#7b6b4d]">
                        1. A equipe envia um convite por e-mail<br />
                        2. Você clica no link e cria sua senha<br />
                        3. Depois disso, entra normalmente aqui
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/auth/primeiro-acesso"
                    className="group inline-flex h-[60px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(142,106,59,0.15),0_4px_16px_rgba(142,106,59,0.1)] transition-all duration-300 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_20px_48px_rgba(142,106,59,0.2),0_8px_24px_rgba(142,106,59,0.15)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Primeiro acesso</span>
                  </Link>

                  <Link
                    href={triageHref}
                    className="group inline-flex h-[60px] items-center justify-center rounded-2xl border border-[#d8d2c8] bg-gradient-to-br from-white via-white to-[#fafbfb] px-8 text-sm font-semibold text-[#10261d] shadow-[0_4px_16px_rgba(16,38,29,0.04)] transition-all duration-300 hover:bg-white hover:shadow-[0_8px_32px_rgba(16,38,29,0.08)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Falar com equipe</span>
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
