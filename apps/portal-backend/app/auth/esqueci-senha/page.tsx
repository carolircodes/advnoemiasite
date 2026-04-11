import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CLIENT_LOGIN_PATH,
  getAccessMessage,
  normalizeNextPath
} from "@/lib/auth/access-control";
import {
  appendEntryContextToPath,
  getEntryContextPayload,
  readEntryContext,
  type EntryContext
} from "@/lib/entry-context";
import {
  getAuthEnvDiagnostics,
  getServerEnv,
  isAuthEnvConfigurationError
} from "@/lib/config/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Recuperar acesso ao portal",
  description:
    "Solicite um novo link para redefinir a senha da sua área do cliente.",
  alternates: {
    canonical: "/auth/esqueci-senha"
  },
  robots: {
    index: false,
    follow: false
  }
};

function MailIcon({
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
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

function getRecoveryErrorMessage(error: string) {
  const accessMessage = getAccessMessage(error);

  if (accessMessage) {
    return accessMessage;
  }

  switch (error) {
    case "dados-invalidos":
      return "Informe um e-mail válido para continuar.";
    case "email-nao-encontrado":
      return "Se o e-mail estiver cadastrado, você receberá um link de recuperação.";
    case "limite-excedido":
      return "Muitas tentativas de recuperação. Aguarde alguns minutos antes de tentar novamente.";
    case "erro-interno":
      return "Não foi possível processar sua solicitação agora. Tente novamente em instantes.";
    default:
      return error ? "Não foi possível concluir a solicitação agora." : "";
  }
}

function getRecoverySuccessMessage(success: string) {
  switch (success) {
    case "email-enviado":
      return "Se o e-mail estiver cadastrado, o link de recuperação foi enviado para sua caixa de entrada.";
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

function buildForgotPasswordPath(
  entryContext: Partial<EntryContext>,
  options: {
    error?: string;
    success?: string;
  } = {}
) {
  const url = new URL(appendEntryContextToPath("/auth/esqueci-senha", entryContext), "https://app.local");

  if (options.error) {
    url.searchParams.set("error", options.error);
  }

  if (options.success) {
    url.searchParams.set("success", options.success);
  }

  return `${url.pathname}${url.search}`;
}

async function forgotPasswordAction(formData: FormData) {
  "use server";

  const entryContext = readEntryContextFromFormData(formData);
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(buildForgotPasswordPath(entryContext, { error: "dados-invalidos" }));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const env = getServerEnv();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: env.passwordResetRedirectUrl
    });

  // Sempre redireciona para sucesso por segurança (não revela se e-mail existe)
    if (error) {
      console.error("[auth.forgot-password] Failed to request password reset", {
        email,
        message: error.message
      });

      redirect(buildForgotPasswordPath(entryContext, { error: "erro-interno" }));
    }
  } catch (error) {
    console.error("[auth.forgot-password] Auth flow unavailable", {
      email,
      message: error instanceof Error ? error.message : String(error),
      authEnv: getAuthEnvDiagnostics()
    });

    redirect(
      buildForgotPasswordPath(entryContext, {
        error: isAuthEnvConfigurationError(error) ? "auth-indisponivel" : "erro-interno"
      })
    );
  }

  redirect(buildForgotPasswordPath(entryContext, { success: "email-enviado" }));
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const entryContext = readEntryContext(params);
  const entryContextPayload = getEntryContextPayload(entryContext);
  const clientLoginHref = appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext);
  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getRecoveryErrorMessage(error);
  const success = typeof params.success === "string" ? params.success : "";
  const successMessage = getRecoverySuccessMessage(success);

  return (
    <main className="auth-page min-h-screen bg-[#f7f4ee] text-[#10261d]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Card de Recuperação - Esquerda */}
          <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-white via-white to-[#fafbff] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.04),0_8px_32px_rgba(142,106,59,0.02),0_2px_8px_rgba(16,38,29,0.02)] backdrop-blur-sm sm:p-14 lg:p-16">
            <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
              Recuperação de acesso
            </div>

            <div className="mt-10">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] leading-[1.08] text-[#10261d] sm:text-4xl sm:leading-[1.06]">
                Recuperar sua senha
              </h1>
              <p className="mt-5 max-w-xl text-base leading-[1.7] text-[#7a8a83] sm:text-lg sm:leading-[1.68]">
                Receba um link seguro por e-mail para redefinir sua senha e acessar o portal novamente.
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

            {successMessage ? (
              <div className="mt-8 rounded-2xl border border-[#e6f5e6] bg-gradient-to-r from-[#f9fff9] via-[#f7fff7] to-[#f9fff9] p-5 shadow-[0_4px_16px_rgba(68,157,68,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d7f2d7] to-[#c5e8c5] text-[#44b444]">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-8 8.08a1 1 0 0 1-1.42.007l-4.01-3.99a1 1 0 0 1 1.41-1.42l3.3 3.285 7.296-7.37a1 1 0 0 1 1.418-.006Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium leading-[1.6] text-[#577c57]">
                    {successMessage}
                  </p>
                </div>
              </div>
            ) : null}

            {!successMessage && (
              <form action={forgotPasswordAction} className="mt-8 space-y-6">
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
                      E-mail cadastrado
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
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="group inline-flex h-[60px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-base font-semibold text-white shadow-[0_12px_32px_rgba(142,106,59,0.15),0_4px_16px_rgba(142,106,59,0.1)] transition-all duration-300 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_20px_48px_rgba(142,106,59,0.2),0_8px_24px_rgba(142,106,59,0.15)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98] active:shadow-[0_8px_24px_rgba(142,106,59,0.1),0_2px_8px_rgba(142,106,59,0.05)]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Enviar link por e-mail</span>
                  </button>
                </div>

                <div className="pt-3 text-center">
                  <Link
                    href={clientLoginHref}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#7a8a83] transition-all duration-200 hover:text-[#8e6a3b] hover:gap-2"
                  >
                    <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Voltar ao login</span>
                  </Link>
                </div>
              </form>
            )}
          </section>

          {/* Conteúdo Institucional - Direita */}
          <aside className="space-y-8">
            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.03),0_8px_32px_rgba(142,106,59,0.01)] backdrop-blur-sm sm:p-14">
              <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
                Recuperação segura e rápida
              </h2>

              <div className="mt-10 space-y-6">
                {[
                  {
                    title: "Link exclusivo e temporário",
                    text: "O link de recuperação é pessoal, válido por tempo limitado e pode ser usado apenas uma vez.",
                  },
                  {
                    title: "Entrega instantânea",
                    text: "Se o e-mail estiver cadastrado, você receberá o link em segundos na sua caixa de entrada.",
                  },
                  {
                    title: "Processo confidencial",
                    text: "A recuperação é tratada com total sigilo, mantendo a segurança dos seus dados.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="group flex items-start gap-4 rounded-2xl border border-[#ede7dc] bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-sm p-6 shadow-[0_4px_16px_rgba(16,38,29,0.02)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(16,38,29,0.04)] hover:bg-white hover:-translate-y-[1px] hover:border-[#e5ddd4]"
                  >
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] text-white shadow-[0_4px_8px_rgba(142,106,59,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_12px_rgba(142,106,59,0.2)]">
                      <MailIcon className="h-4 w-4" />
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
                Dicas importantes
              </h3>

              <div className="mt-8 space-y-5">
                {[
                  "Verifique sua caixa de spam e lixo eletrônico.",
                  "Use sempre o mesmo e-mail do seu cadastro no portal.",
                  "O link expira em 24 horas por segurança.",
                ].map((item) => (
                  <div key={item} className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white/70 to-white/50 backdrop-blur-sm p-5 shadow-[0_4px_16px_rgba(47,122,82,0.02)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(47,122,82,0.04)] hover:bg-white/80 hover:-translate-y-[1px]">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcf2e3] to-[#c8e8d4] text-[#2f7a52] shadow-[0_4px_8px_rgba(47,122,82,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_12px_rgba(47,122,82,0.2)]">
                      <MailIcon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm leading-[1.65] text-[#4e5f58] transition-colors duration-300 group-hover:text-[#3a5a4a]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.03),0_8px_32px_rgba(142,106,59,0.01)] backdrop-blur-sm">
              <h3 className="flex items-center gap-3 text-lg font-semibold tracking-[-0.03em] leading-[1.15] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
                Precisa de ajuda?
              </h3>

              <div className="mt-8 space-y-5">
                <p className="text-sm leading-[1.65] text-[#5f6f68]">
                  Se tiver dificuldades para acessar ou recuperar sua senha, nossa equipe está disponível para ajudar.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/triagem"
                    className="group inline-flex h-[60px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(142,106,59,0.15),0_4px_16px_rgba(142,106,59,0.1)] transition-all duration-300 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_20px_48px_rgba(142,106,59,0.2),0_8px_24px_rgba(142,106,59,0.15)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Falar com equipe</span>
                  </Link>

                  <Link
                    href={clientLoginHref}
                    className="group inline-flex h-[60px] items-center justify-center rounded-2xl border border-[#d8d2c8] bg-gradient-to-br from-white via-white to-[#fafbfb] px-8 text-sm font-semibold text-[#10261d] shadow-[0_4px_16px_rgba(16,38,29,0.04)] transition-all duration-300 hover:bg-white hover:shadow-[0_8px_32px_rgba(16,38,29,0.08)] hover:-translate-y-[2px] focus:outline-none focus:ring-[4px] focus:ring-[#d4b78a] focus:ring-opacity-30 active:scale-[0.98]"
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">Voltar ao login</span>
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
