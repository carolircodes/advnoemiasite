import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  getAuthEnvDiagnostics,
  isAuthEnvConfigurationError
} from "@/lib/config/env";
import { passwordSchema } from "@/lib/domain/portal";
import { getCurrentProfile } from "@/lib/auth/guards";
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

  console.log("[auth.first-access] Marcando primeiro acesso como concluído", {
    profileId,
    completedAt
  });

  // 1. Atualizar o perfil
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_login_completed_at: completedAt })
    .eq("id", profileId);

  if (profileError) {
    console.error("[auth.first-access] Erro ao atualizar perfil", {
      profileId,
      error: profileError.message,
      details: profileError
    });
    throw new Error(
      `Não foi possível concluir o primeiro acesso no perfil: ${profileError.message}`
    );
  }

  console.log("[auth.first-access] Perfil atualizado com sucesso");

  // 2. Verificar se o cliente existe antes de atualizar
  const { data: existingClient, error: checkError } = await admin
    .from("clients")
    .select("id, status")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (checkError) {
    console.error("[auth.first-access] Erro ao verificar cliente existente", {
      profileId,
      error: checkError.message
    });
  }

  if (!existingClient) {
    console.warn("[auth.first-access] Cliente não encontrado para o profile", {
      profileId
    });
    // Não falhar completamente se o cliente não existir, apenas registrar
  } else {
    console.log("[auth.first-access] Cliente encontrado, atualizando status", {
      clientId: existingClient.id,
      currentStatus: existingClient.status
    });

    // 3. Atualizar status do cliente se existir e estiver em status adequado
    const { error: clientError } = await admin
      .from("clients")
      .update({ status: "ativo" })
      .eq("profile_id", profileId)
      .in("status", ["convite-enviado", "aguardando-primeiro-acesso"]);

    if (clientError) {
      console.error("[auth.first-access] Erro ao atualizar status do cliente", {
        profileId,
        error: clientError.message,
        details: clientError
      });
      throw new Error(
        `Não foi possível atualizar o status do cliente: ${clientError.message}`
      );
    }

    console.log("[auth.first-access] Status do cliente atualizado com sucesso");
  }

  // 4. Registrar auditoria (não crítico se falhar)
  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_profile_id: profileId,
    action: "auth.first_access.completed",
    entity_type: "profiles",
    entity_id: profileId,
    payload: {
      completedAt,
      clientExisted: !!existingClient,
      clientStatus: existingClient?.status
    },
  });

  if (auditError) {
    console.error("[auth.first-access] Erro ao registrar auditoria (não crítico)", {
      profileId,
      error: auditError.message
    });
    // Não falhar completamente por erro de auditoria
  } else {
    console.log("[auth.first-access] Auditoria registrada com sucesso");
  }
}

async function ensureClientExists(profileId: string, profileEmail: string) {
  const admin = createAdminSupabaseClient();

  // Verificar se cliente já existe
  const { data: existingClient, error: checkError } = await admin
    .from("clients")
    .select("id, status")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (checkError) {
    console.error("[auth.first-access] Erro ao verificar cliente existente", {
      profileId,
      error: checkError.message
    });
  }

  if (existingClient) {
    console.log("[auth.first-access] Cliente já existe", {
      profileId,
      clientId: existingClient.id,
      status: existingClient.status
    });
    return existingClient;
  }

  // Criar cliente se não existir
  console.log("[auth.first-access] Criando registro de cliente", {
    profileId,
    profileEmail
  });

  const { data: newClient, error: createError } = await admin
    .from("clients")
    .insert({
      profile_id: profileId,
      email: profileEmail,
      status: "aguardando-primeiro-acesso",
      notes: "Cliente criado automaticamente durante o primeiro acesso."
    })
    .select("id, status")
    .single();

  if (createError) {
    console.error("[auth.first-access] Erro ao criar cliente", {
      profileId,
      profileEmail,
      error: createError.message,
      details: createError
    });
    throw new Error(`Não foi possível criar o cadastro do cliente: ${createError.message}`);
  }

  console.log("[auth.first-access] Cliente criado com sucesso", {
    profileId,
    clientId: newClient.id,
    status: newClient.status
  });

  return newClient;
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

  // Garantir que o registro do cliente exista
  try {
    await ensureClientExists(profile.id, profile.email);
  } catch (error) {
    console.error("[auth.first-access] Erro ao garantir cliente existente", {
      profileId: profile.id,
      profileEmail: profile.email,
      error: error instanceof Error ? error.message : String(error)
    });
    redirect("/auth/primeiro-acesso?error=erro-criar-cliente");
  }

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/auth/primeiro-acesso?error=senha-invalida");
  }

  try {
    const supabase = await createServerSupabaseClient();
  
  // Verificar se temos uma sessão válida antes de tentar updateUser
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error("[auth.first-access] Sessão inválida ao tentar definir senha", {
      userError: userError?.message,
      userId: profile.id,
      profileEmail: profile.email
    });
    redirect("/auth/primeiro-acesso?error=sessao-invalida");
  }

  console.log("[auth.first-access] Tentando atualizar senha do usuário", {
    userId: user.id,
    userEmail: user.email,
    profileId: profile.id
  });

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[auth.first-access] Erro ao atualizar senha no Supabase", {
      error: error.message,
      status: error.status,
      userId: user.id,
      profileId: profile.id
    });
    redirect("/auth/primeiro-acesso?error=nao-foi-possivel-definir-senha");
  }

  console.log("[auth.first-access] Senha atualizada com sucesso", {
    userId: user.id,
    profileId: profile.id
  });

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
  } catch (error) {
    console.error("[auth.first-access] Auth flow unavailable", {
      profileId: profile.id,
      profileEmail: profile.email,
      message: error instanceof Error ? error.message : String(error),
      authEnv: getAuthEnvDiagnostics()
    });

    redirect(
      `/auth/primeiro-acesso?error=${
        isAuthEnvConfigurationError(error) ? "auth-indisponivel" : "nao-foi-possivel-definir-senha"
      }`
    );
  }
}

function getErrorMessage(error: string) {
  switch (error) {
    case "senha-invalida":
      return "Use uma senha válida e confirme a mesma combinação nos dois campos.";
    case "sessao-invalida":
      return "Sua sessão expirou. Por favor, solicite um novo convite por e-mail ou tente fazer login normalmente.";
    case "erro-criar-cliente":
      return "Não foi possível criar seu cadastro de cliente. Entre em contato com o suporte.";
    case "auth-indisponivel":
      return "A autenticacao do portal esta temporariamente indisponivel. Tente novamente em instantes.";
    case "nao-foi-possivel-definir-senha":
      return "Não foi possível salvar sua senha agora. Verifique o console para detalhes técnicos ou tente novamente em instantes.";
    case "nao-foi-possivel-finalizar":
      return "Sua senha foi atualizada, mas o primeiro acesso não terminou corretamente. Tente novamente para concluir.";
    default:
      return error ? "Não foi possível concluir o primeiro acesso." : "";
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
            <section className="rounded-[32px] border border-[#f0ebe5] bg-gradient-to-br from-white via-white to-[#fafbff] p-12 shadow-[0_32px_96px_rgba(16,38,29,0.04),0_8px_32px_rgba(142,106,59,0.02),0_2px_8px_rgba(16,38,29,0.02)] backdrop-blur-sm sm:p-14 lg:p-16">
              <div className="mb-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f6ecd9] to-[#e8d4b3] text-[#8e6a3b] shadow-[0_4px_12px_rgba(142,106,59,0.15)]">
                <AlertIcon className="h-7 w-7" />
              </div>

              <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.025em] leading-[1.1] text-[#10261d] sm:text-4xl sm:leading-[1.08]">
                Acesso exclusivo por convite
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-[1.65] text-[#6a7973] sm:text-lg sm:leading-[1.62]">
                Esta área é destinada apenas a clientes que receberam um <strong className="text-[#8e6a3b]">convite por e-mail</strong> para ativar o portal. 
                O primeiro acesso deve ser iniciado através do link enviado no seu e-mail.
              </p>

              <div className="mt-9 rounded-2xl border border-[#f4e4d1] bg-gradient-to-r from-[#fff8e9] via-[#fff5e4] to-[#fff8e9] p-6 shadow-[0_2px_8px_rgba(142,106,59,0.04)]">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f3e2bd] to-[#e8d4b3] text-[#8e6a3b] shadow-[0_2px_6px_rgba(142,106,59,0.15)]">
                    <AlertIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#6f542d] leading-[1.45]">
                      Como funciona o primeiro acesso
                    </p>
                    <p className="mt-2 text-sm leading-[1.6] text-[#7b6b4d]">
                      1. Você recebe um e-mail de convite com link personalizado<br />
                      2. Clica no link para confirmar sua identidade<br />
                      3. Define sua senha segura e acessa o portal
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-9 rounded-2xl border border-[#e8d4ca] bg-gradient-to-r from-[#f0f7f2] via-[#e8f4ec] to-[#f0f7f2] p-6 shadow-[0_2px_8px_rgba(47,122,82,0.03)]">
                <p className="text-sm leading-[1.6] text-[#4e5f58]">
                  <strong className="text-[#2f7a52]">Não recebeu o convite?</strong> Verifique sua caixa de spam ou 
                  entre em contato com a equipe para solicitar um novo envio.
                </p>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/portal/login"
                  className="inline-flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(142,106,59,0.2),0_2px_8px_rgba(142,106,59,0.15)] transition-all duration-200 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_12px_32px_rgba(142,106,59,0.25),0_4px_12px_rgba(142,106,59,0.2)] hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#d4b78a] focus:ring-opacity-50"
                >
                  Já tenho acesso
                </Link>

                <Link
                  href="/"
                  className="inline-flex h-[56px] items-center justify-center rounded-2xl border border-[#d8d2c8] bg-gradient-to-br from-white via-white to-[#fafbfb] px-8 text-sm font-semibold text-[#10261d] shadow-[0_2px_8px_rgba(16,38,29,0.04)] transition-all duration-200 hover:bg-white hover:shadow-[0_4px_16px_rgba(16,38,29,0.08)] hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#d4b78a] focus:ring-opacity-30"
                >
                  Voltar ao site
                </Link>
              </div>
            </section>

            <aside className="rounded-[32px] border border-[#e9e2d6] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-10 shadow-[0_24px_72px_rgba(16,38,29,0.03),0_4px_24px_rgba(142,106,59,0.01)] sm:p-12">
              <div className="inline-flex rounded-full border border-[#eadfcf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
                Portal do cliente
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.025em] leading-[1.2] text-[#10261d]">
                O que você terá acesso após o convite
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
                    className="flex items-start gap-4 rounded-2xl border border-[#ede7dc] bg-gradient-to-r from-white/90 to-white/80 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(16,38,29,0.02)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(16,38,29,0.04)] hover:bg-white/95"
                  >
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] text-white shadow-[0_2px_6px_rgba(142,106,59,0.15)]">
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#10261d] leading-[1.45]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-[1.6] text-[#5f6f68]">
                        {item.text}
                      </p>
                    </div>
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

            <div className="mt-8">
              <h1 className="text-3xl font-semibold tracking-[-0.025em] leading-[1.1] text-[#10261d] sm:text-4xl sm:leading-[1.08]">
                Definir acesso ao portal
              </h1>
              <p className="mt-4 max-w-xl text-base leading-[1.65] text-[#6a7973] sm:text-lg sm:leading-[1.62]">
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
                    placeholder="Crie uma senha forte"
                    className="h-[56px] w-full rounded-2xl border border-[#e5ddd4] bg-white px-5 text-base text-[#10261d] outline-none transition-all duration-200 placeholder:text-[#9ca3a0] focus:border-[#8e6a3b] focus:shadow-[0_0_0_3px_rgba(142,106,59,0.1)] focus:ring-[3px] focus:ring-[#d4b78a] focus:ring-opacity-20"
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
                    placeholder="Confirme sua senha forte"
                    className="h-[56px] w-full rounded-2xl border border-[#e5ddd4] bg-white px-5 text-base text-[#10261d] outline-none transition-all duration-200 placeholder:text-[#9ca3a0] focus:border-[#8e6a3b] focus:shadow-[0_0_0_3px_rgba(142,106,59,0.1)] focus:ring-[3px] focus:ring-[#d4b78a] focus:ring-opacity-20"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#ead8b0] bg-gradient-to-r from-[#fff8e9] via-[#fff5e4] to-[#fff8e9] p-5 shadow-[0_2px_8px_rgba(142,106,59,0.04)]">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f3e2bd] to-[#e8d4b3] text-[#8e6a3b] shadow-[0_2px_6px_rgba(142,106,59,0.15)]">
                    <AlertIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#6f542d] leading-[1.45]">
                      Sua senha é exclusiva e protegida.
                    </p>
                    <p className="mt-2 text-sm leading-[1.6] text-[#7b6b4d]">
                      Seus dados permanecem seguros com criptografia e acesso
                      vinculado ao seu ambiente privado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="inline-flex h-[56px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#8e6a3b] via-[#957342] to-[#8e6a3b] px-8 text-base font-semibold text-white shadow-[0_8px_24px_rgba(142,106,59,0.2),0_2px_8px_rgba(142,106,59,0.15)] transition-all duration-200 hover:from-[#7b5c31] hover:via-[#856538] hover:to-[#7b5c31] hover:shadow-[0_12px_32px_rgba(142,106,59,0.25),0_4px_12px_rgba(142,106,59,0.2)] hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#d4b78a] focus:ring-opacity-50"
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

          <aside className="space-y-8">
            <section className="rounded-[32px] border border-[#e9e2d6] bg-gradient-to-br from-[#fffdf9] via-[#faf8f4] to-[#f8f4ec] p-10 shadow-[0_24px_72px_rgba(16,38,29,0.03),0_4px_24px_rgba(142,106,59,0.01)] sm:p-12">
              <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.025em] leading-[1.2] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] shadow-[0_2px_4px_rgba(142,106,59,0.2)]" />
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
                    className="flex items-start gap-4 rounded-2xl border border-[#ede7dc] bg-gradient-to-r from-white/90 to-white/80 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(16,38,29,0.02)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(16,38,29,0.04)] hover:bg-white/95"
                  >
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#7b5c31] text-white shadow-[0_2px_6px_rgba(142,106,59,0.15)]">
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#10261d] leading-[1.45]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-[1.6] text-[#5f6f68]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#dde7df] bg-gradient-to-br from-[#f8fbf8] via-[#f4f9f5] to-[#f0f7f2] p-10 shadow-[0_24px_72px_rgba(16,38,29,0.03),0_4px_24px_rgba(47,122,82,0.01)]">
              <h3 className="flex items-center gap-3 text-lg font-semibold tracking-[-0.025em] leading-[1.2] text-[#10261d]">
                <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#2f7a52] to-[#246342] shadow-[0_2px_4px_rgba(47,122,82,0.2)]" />
                Segurança e privacidade
              </h3>

              <div className="mt-6 space-y-4">
                {[
                  "Seus dados são protegidos no ambiente do portal.",
                  "A comunicação é centralizada e mais segura.",
                  "O acesso é exclusivo e vinculado ao seu cadastro.",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm p-4 shadow-[0_2px_8px_rgba(47,122,82,0.02)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(47,122,82,0.04)] hover:bg-white/70">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcf2e3] to-[#c8e8d4] text-[#2f7a52] shadow-[0_2px_6px_rgba(47,122,82,0.15)]">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm leading-[1.6] text-[#4e5f58]">{item}</p>
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
