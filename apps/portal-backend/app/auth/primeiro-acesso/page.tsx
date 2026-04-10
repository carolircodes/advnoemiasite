import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/form-submit-button";
import { requireProfile } from "@/lib/auth/guards";
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
    follow: false
  }
};

async function markClientFirstAccessCompleted(profileId: string, completedAt: string) {
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
      completedAt
    }
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
      message: error.message
    });
    return null;
  }

  return data?.source_intake_request_id || null;
}

async function firstAccessAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["cliente"]);
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    redirect("/auth/primeiro-acesso?error=senha-invalida");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
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
        source: "first-access"
      }
    });
  } catch (trackingError) {
    console.error("[auth.first-access] Failed to record portal access event", {
      profileId: profile.id,
      message: trackingError instanceof Error ? trackingError.message : String(trackingError)
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

export default async function FirstAccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["cliente"]);

  if (profile.first_login_completed_at) {
    redirect("/cliente");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239ca3af' fill-opacity='0.03'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      {/* Main Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            
            {/* Left Column - Form (58%) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 lg:p-12">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Definir acesso ao portal
                  </h1>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Crie uma senha segura para acessar seu ambiente.
                  </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-800 font-medium">{errorMessage}</p>
                  </div>
                )}

                {/* Form */}
                <form action={firstAccessAction} className="space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                        Nova senha
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Digite sua senha segura"
                        className="w-full h-14 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8e6a3b] focus:border-[#8e6a3b] transition-all duration-200 text-base"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                        Confirmar senha
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        placeholder="Confirme sua senha"
                        className="w-full h-14 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8e6a3b] focus:border-[#8e6a3b] transition-all duration-200 text-base"
                      />
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-amber-800 font-medium">
                          Sua senha é exclusiva para o portal.
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          Seus dados pessoais permanecem protegidos.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <FormSubmitButton 
                      pendingLabel="Salvando senha..."
                      className="w-full h-14 bg-[#8e6a3b] hover:bg-[#7a5a33] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base"
                    >
                      Salvar e acessar o portal
                    </FormSubmitButton>
                  </div>

                  {/* Help Link */}
                  <div className="text-center pt-2">
                    <a 
                      href="/auth/esqueci-senha" 
                      className="text-sm text-gray-500 hover:text-[#8e6a3b] transition-colors duration-200"
                    >
                      Preciso de novo link
                    </a>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column - Content (42%) */}
            <div className="lg:col-span-5 space-y-6">
              {/* What you'll have access */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#8e6a3b] rounded-full"></div>
                  O que você terá acesso
                </h2>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#8e6a3b] rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Status atual do caso</p>
                      <p className="text-sm text-gray-600 mt-1">Acompanhamento claro da fase do atendimento</p>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#8e6a3b] rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Documentos</p>
                      <p className="text-sm text-gray-600 mt-1">Disponíveis, pendências e solicitações</p>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#8e6a3b] rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Agenda</p>
                      <p className="text-sm text-gray-600 mt-1">Próximas datas e histórico completo</p>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#8e6a3b] rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Atualizações</p>
                      <p className="text-sm text-gray-600 mt-1">Comunicações da equipe em ordem cronológica</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Security & Privacy */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl border border-gray-200 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Segurança e privacidade
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">Seus dados são protegidos</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">Comunicação segura</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">Acesso exclusivo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
