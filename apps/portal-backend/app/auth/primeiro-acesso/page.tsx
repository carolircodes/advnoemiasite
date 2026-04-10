import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/guards";
import { passwordSchema } from "@/lib/domain/portal";
import { recordProductEvent } from "@/lib/services/public-intake";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Primeiro acesso ao portal",
  description:
    "Defina sua senha inicial e conclua o primeiro acesso ao portal do cliente.",
  robots: {
    index: false,
    follow: false,
  },
};

async function markClientFirstAccessCompleted(
  profileId: string,
  completedAt: string
) {
  const admin = createAdminSupabaseClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_login_completed_at: completedAt })
    .eq("id", profileId);

  if (profileError) {
    throw new Error(
      `Nao foi possivel concluir o primeiro acesso no perfil: ${profileError.message}`
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

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_profile_id: profileId,
    action: "auth.first_access.completed",
    entity_type: "profiles",
    entity_id: profileId,
    payload: {
      completedAt,
    },
  });

  if (auditError) {
    throw new Error(
      `Nao foi possivel registrar a auditoria do primeiro acesso: ${auditError.message}`
    );
  }
}

async function getLinkedIntakeRequestId(profileId: string) {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("clients")
    .select("source_intake_request_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[auth.first-access] Failed to load linked intake request", {
      profileId,
      message: error.message,
    });
    return null;
  }

  return data?.source_intake_request_id || null;
}

async function firstAccessAction(formData: FormData) {
  "use server";

  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "cliente") {
    redirect("/portal/login?error=acesso-negado");
  }

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/auth/primeiro-acesso?error=senha-invalida");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirect("/auth/primeiro-acesso?error=nao-foi-possivel-definir-senha");
  }

  const completedAt = new Date().toISOString();

  try {
    await markClientFirstAccessCompleted(profile.id, completedAt);
  } catch {
    redirect("/auth/primeiro-acesso?error=nao-foi-possivel-finalizar");
  }

  try {
    await recordProductEvent({
      eventKey: "portal_access_completed",
      eventGroup: "portal",
      profileId: profile.id,
      intakeRequestId: (await getLinkedIntakeRequestId(profile.id)) || undefined,
      payload: {
        role: profile.role,
        source: "first-access",
      },
    });
  } catch (trackingError) {
    console.error("[auth.first-access] Failed to record portal access event", {
      profileId: profile.id,
      message:
        trackingError instanceof Error
          ? trackingError.message
          : String(trackingError),
    });
  }

  redirect("/cliente?success=primeiro-acesso-concluido");
}

function getErrorMessage(error: string) {
  switch (error) {
    case "senha-invalida":
      return "Use uma senha valida e confirme a mesma combinacao nos dois campos.";
    case "nao-foi-possivel-definir-senha":
      return "Nao foi possivel salvar sua senha agora. Tente novamente em instantes.";
    case "nao-foi-possivel-finalizar":
      return "Sua senha foi atualizada, mas o primeiro acesso nao terminou corretamente. Tente novamente para concluir.";
    default:
      return error ? "Nao foi possivel concluir o primeiro acesso." : "";
  }
}

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

function AlertIcon({
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
        d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-1 4a1 1 0 0 0 0 2v2a1 1 0 1 0 2 0v-2a1 1 0 0 0-1-1H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();

  if (profile && profile.role !== "cliente") {
    redirect("/portal/login?error=acesso-negado");
  }

  if (profile?.first_login_completed_at) {
    redirect("/cliente");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getErrorMessage(error);

  if (!profile) {
    return (
      <main className="auth-page min-h-screen bg-[#f7f4ee] text-[#10261d]">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-8 lg:px-10">
          <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[32px] border border-[#e9e2d6] bg-white p-8 shadow-[0_20px_60px_rgba(16,38,29,0.06)] sm:p-10 lg:p-12">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f6ecd9] text-[#8e6a3b]">
                <AlertIcon className="h-7 w-7" />
              </div>

              <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.02em] text-[#10261d] sm:text-4xl">
                Acesso restrito ao primeiro cadastro
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f6f68] sm:text-lg">
                Esta área é destinada apenas a clientes que receberam um convite
                para ativar o portal. Se você já possui acesso, entre com seu
                e-mail e senha normalmente.
              </p>

              <div className="mt-8 rounded-2xl border border-[#eee6da] bg-[#fbf8f3] p-5">
                <p className="text-sm leading-6 text-[#5f6f68]">
                  O primeiro acesso serve para criar sua senha inicial e liberar
                  seu ambiente privado de acompanhamento.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/portal/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white transition hover:bg-[#7b5c31]"
                >
                  Fazer login
                </Link>

                <Link
                  href="/"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] transition hover:bg-[#faf7f2]"
                >
                  Voltar ao site
                </Link>
              </div>
            </section>

            <aside className="rounded-[32px] border border-[#e9e2d6] bg-[linear-gradient(180deg,#fffdf9_0%,#f8f4ec_100%)] p-8 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-10">
              <div className="inline-flex rounded-full border border-[#eadfcf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
                Portal do cliente
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#10261d]">
                O que você encontra depois do acesso
              </h2>

              <div className="mt-8 space-y-5">
                {[
                  "Status do caso com explicação mais clara do andamento.",
                  "Documentos liberados, solicitações e pendências em aberto.",
                  "Agenda com próximos passos e histórico recente.",
                  "Atualizações organizadas em ordem da mais recente.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-[#ede7dc] bg-white/80 p-4"
                  >
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#8e6a3b] text-white">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm leading-6 text-[#41524b]">{item}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page min-h-screen bg-[#f7f4ee] text-[#10261d]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[32px] border border-[#e9e2d6] bg-white p-8 shadow-[0_20px_60px_rgba(16,38,29,0.06)] sm:p-10 lg:p-12">
            <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
              Primeiro acesso
            </div>

            <div className="mt-6">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#10261d] sm:text-4xl">
                Definir acesso ao portal
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#5f6f68] sm:text-lg">
                Crie uma senha segura para acessar seu ambiente privado de
                acompanhamento.
              </p>
            </div>

            {errorMessage ? (
              <div className="mt-8 rounded-2xl border border-[#f1c9c9] bg-[#fff4f4] p-4">
                <p className="text-sm font-medium leading-6 text-[#8a3b3b]">
                  {errorMessage}
                </p>
              </div>
            ) : null}

            <form action={firstAccessAction} className="mt-8 space-y-6">
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-[#10261d]"
                  >
                    Nova senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Digite sua senha segura"
                    className="h-14 w-full rounded-2xl border border-[#ddd6ca] bg-white px-4 text-base text-[#10261d] outline-none transition placeholder:text-[#96a19d] focus:border-[#8e6a3b] focus:ring-2 focus:ring-[#d4b78a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-[#10261d]"
                  >
                    Confirmar senha
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Confirme sua senha"
                    className="h-14 w-full rounded-2xl border border-[#ddd6ca] bg-white px-4 text-base text-[#10261d] outline-none transition placeholder:text-[#96a19d] focus:border-[#8e6a3b] focus:ring-2 focus:ring-[#d4b78a]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#ead8b0] bg-[#fff8e9] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#f3e2bd] text-[#8e6a3b]">
                    <AlertIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#6f542d]">
                      Sua senha é exclusiva para o portal.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#7b6b4d]">
                      Seus dados pessoais permanecem protegidos e o acesso é
                      vinculado ao seu ambiente privado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-base font-semibold text-white shadow-[0_12px_30px_rgba(142,106,59,0.25)] transition hover:bg-[#7b5c31]"
                >
                  Salvar e acessar o portal
                </button>
              </div>

              <div className="pt-1 text-center">
                <Link
                  href="/auth/esqueci-senha"
                  className="text-sm font-medium text-[#6a7973] transition hover:text-[#8e6a3b]"
                >
                  Preciso de novo link
                </Link>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-[#e9e2d6] bg-[linear-gradient(180deg,#fffdf9_0%,#f8f4ec_100%)] p-8 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-10">
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.02em] text-[#10261d]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8e6a3b]" />
                O que você terá acesso
              </h2>

              <div className="mt-8 space-y-5">
                {[
                  {
                    title: "Status atual do caso",
                    text: "Acompanhamento claro da fase do atendimento e dos próximos passos.",
                  },
                  {
                    title: "Documentos e solicitações",
                    text: "Arquivos liberados, pendências e pedidos da equipe em um só lugar.",
                  },
                  {
                    title: "Agenda do atendimento",
                    text: "Próximas datas, retornos e histórico recente organizados.",
                  },
                  {
                    title: "Atualizações da equipe",
                    text: "Comunicações exibidas em ordem cronológica, com mais clareza.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-[#ede7dc] bg-white/80 p-4"
                  >
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#8e6a3b] text-white">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#10261d]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#5f6f68]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#dde7df] bg-[#f8fbf8] p-8 shadow-[0_20px_60px_rgba(16,38,29,0.04)]">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[#10261d]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2f7a52]" />
                Segurança e privacidade
              </h3>

              <div className="mt-5 space-y-3">
                {[
                  "Seus dados são protegidos no ambiente do portal.",
                  "A comunicação é centralizada e mais segura.",
                  "O acesso é exclusivo e vinculado ao seu cadastro.",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#dcf2e3] text-[#2f7a52]">
                      <CheckIcon className="h-3 w-3" />
                    </div>
                    <p className="text-sm leading-6 text-[#4e5f58]">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}