import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
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
    <AppFrame
      eyebrow="Primeiro acesso"
      title="Defina sua senha inicial e entre no portal com seguranca."
      description="Depois desta etapa, sua area do cliente passa a mostrar status, documentos, agenda e proximos passos sempre com o mesmo login."
      actions={[{ href: "/auth/esqueci-senha", label: "Preciso de novo link", tone: "secondary" }]}
    >
      {errorMessage ? <div className="error-notice">{errorMessage}</div> : null}

      <div className="split">
        <SectionCard
          title="Criar senha inicial"
          description="Escolha uma senha exclusiva para o portal. Ela passa a valer imediatamente para os proximos acessos."
        >
          <form action={firstAccessAction} className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="password">Nova senha</label>
                <input id="password" name="password" type="password" required />
              </div>
              <div className="field-full">
                <label htmlFor="confirmPassword">Confirmar senha</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required />
              </div>
            </div>
            <div className="notice">
              Use uma senha exclusiva para o portal. O CPF continua sendo apenas um dado cadastral interno.
            </div>
            <div className="form-actions">
              <FormSubmitButton pendingLabel="Salvando senha...">
                Salvar senha inicial
              </FormSubmitButton>
            </div>
          </form>
        </SectionCard>

        <div className="stack">
          <SectionCard
            title="O que voce vai encontrar logo depois"
            description="A primeira entrada nao termina na senha. Ela abre a jornada completa de acompanhamento."
          >
            <ul className="timeline">
              <li>1. Status atual do caso com explicacao mais clara da fase do atendimento.</li>
              <li>2. Documentos disponiveis, pendencias e solicitacoes em aberto.</li>
              <li>3. Agenda com proximas datas e historico recente.</li>
              <li>4. Atualizacoes liberadas pela equipe em ordem da mais recente.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Se ainda nao houver muitos itens"
            description="Isso nao significa que algo esta errado. O portal foi desenhado para crescer com o caso, sem parecer vazio ou tecnico."
          >
            <div className="support-panel">
              <div className="support-row">
                <span className="support-label">Status</span>
                <strong>Voce entende rapidamente em que fase o atendimento esta.</strong>
              </div>
              <div className="support-row">
                <span className="support-label">Proximas acoes</span>
                <strong>Quando surgirem documentos, datas ou avisos, eles aparecerao nos blocos principais.</strong>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppFrame>
  );
}
