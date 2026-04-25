import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import {
  PremiumFeatureCard,
  PremiumSection,
  PremiumStatePanel
} from "@/components/portal/premium-experience";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getInternalNotificationControls } from "@/lib/notifications/preference-catalog";
import {
  loadNotificationPreferenceState,
  saveNotificationPreferenceState
} from "@/lib/notifications/preferences";
import { assessPushPilotReadiness } from "@/lib/notifications/push-pilot";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSuccessMessage(code: string) {
  if (code === "preferencias-salvas") {
    return "As preferencias internas foram atualizadas. A governanca continua priorizando filas uteis, urgencias legitimas e menos ruido operacional.";
  }

  return "";
}

async function saveInternalNotificationPreferencesAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);
  const controls = getInternalNotificationControls();

  await saveNotificationPreferenceState({
    actorProfile: profile,
    state: {
      audience: "operations",
      timezone: "America/Fortaleza",
      quietModeEnabled: formData.get("quietModeEnabled") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
      whatsappEnabled: formData.get("whatsappEnabled") === "on",
      pushPilotInterested: false,
      eventOverrides: Object.fromEntries(
        controls.map((control) => [
          control.eventKey,
          formData.get(control.eventKey) === "on"
        ])
      ) as Record<(typeof controls)[number]["eventKey"], boolean>
    }
  });

  redirect("/internal/advogada/configuracoes?success=preferencias-salvas");
}

export default async function InternalLawyerSettingsAliasPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const params = await searchParams;
  const success =
    typeof params.success === "string" ? getSuccessMessage(params.success) : "";
  const [{ state, source }, pushReadiness] = await Promise.all([
    loadNotificationPreferenceState(profile),
    assessPushPilotReadiness()
  ]);
  const controls = getInternalNotificationControls();

  return (
    <AppFrame
      eyebrow="Configuracoes"
      title="Governanca de alertas para operacao e atendimento."
      description="Aqui a equipe regula o que merece interromper, o que pode esperar e como manter a camada de notificacoes util sem pressionar a rotina."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Configuracoes internas protegidas"
          workspaceHint="Sessao interna ativa para ajustar governanca, sinais e retomadas."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/operacional", label: "Operacional" },
        { href: "/internal/advogada/atendimento", label: "Atendimento" },
        { href: "/internal/advogada/configuracoes", label: "Configuracoes", active: true }
      ]}
      highlights={[
        {
          label: "Signals ativos",
          value: String(Object.values(state.eventOverrides).filter(Boolean).length)
        },
        { label: "Email", value: state.emailEnabled ? "Ativo" : "Pausado" },
        { label: "WhatsApp", value: state.whatsappEnabled ? "Ativo" : "Pausado" },
        {
          label: "Push piloto",
          value: pushReadiness.status === "pilot_ready" ? "Preparado" : "Desligado"
        }
      ]}
      actions={[
        { href: "#preferencias-alerta", label: "Ajustar alertas" },
        {
          href: "/internal/advogada/operacional",
          label: "Voltar ao operacional",
          tone: "secondary"
        }
      ]}
    >
      {success ? (
        <PremiumStatePanel
          tone="success"
          eyebrow="Governanca salva"
          title="Preferencias internas atualizadas."
          description={success}
        />
      ) : null}

      {source === "default" ? (
        <PremiumStatePanel
          tone="warning"
          eyebrow="Defaults operacionais"
          title="A equipe ainda esta na configuracao recomendada."
          description="Ela mantem intake novo, intake urgente, handoff humano e pagamento confirmado ativos. Ajuste apenas o que muda a sua leitura de fila."
        />
      ) : null}

      <PremiumSection
        title="Leitura executiva dos alertas"
        description="A camada governada agora aparece no produto, nao apenas no backend. O objetivo continua o mesmo: menos sinais dispersos, mais retomada curta e acionavel."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PremiumFeatureCard
            eyebrow="Interrupcao"
            title="Urgencia so quando ha lastro"
            description="Quiet hours e cooldown continuam segurando o que nao precisa interromper a operacao fora de hora."
          />
          <PremiumFeatureCard
            eyebrow="Fila"
            title="Cada alerta pede uma leitura clara"
            description="Handoff, triagem e desbloqueio financeiro entram com CTA unico e trilha observavel."
          />
          <PremiumFeatureCard
            eyebrow="Proximo passo"
            title="Push segue em preparo"
            description="A arquitetura do piloto foi preparada, mas a ativacao continua desligada para evitar acelerar antes da hora."
          />
        </div>
      </PremiumSection>

      <SectionCard
        id="preferencias-alerta"
        title="Preferencias internas"
        description="Este painel foi mantido curto de proposito. A ideia e ajustar o que realmente muda sua rotina de atendimento e operacao."
      >
        <form action={saveInternalNotificationPreferencesAction} className="stack">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="checkbox-row rounded-[20px] border border-[#eadfcf] bg-[#fbf7ef] p-4">
              <input name="emailEnabled" type="checkbox" defaultChecked={state.emailEnabled} />
              <span>
                <strong className="block text-sm text-[#10261d]">Receber por e-mail</strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  Canal principal para intake, handoff e desbloqueios com contexto completo.
                </span>
              </span>
            </label>
            <label className="checkbox-row rounded-[20px] border border-[#eadfcf] bg-[#fbf7ef] p-4">
              <input
                name="whatsappEnabled"
                type="checkbox"
                defaultChecked={state.whatsappEnabled}
              />
              <span>
                <strong className="block text-sm text-[#10261d]">
                  Permitir reforco rapido por WhatsApp
                </strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  Reservado para os sinais em que minutos fazem diferenca de verdade.
                </span>
              </span>
            </label>
            <label className="checkbox-row rounded-[20px] border border-[#eadfcf] bg-[#fbf7ef] p-4 md:col-span-2">
              <input
                name="quietModeEnabled"
                type="checkbox"
                defaultChecked={state.quietModeEnabled}
              />
              <span>
                <strong className="block text-sm text-[#10261d]">
                  Preservar janela silenciosa quando nao for urgente
                </strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  Alertas importantes respeitam horario mais calmo; urgencias e criticos continuam podendo furar a janela conforme a policy.
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-4">
            {controls.map((control) => (
              <label
                key={control.eventKey}
                className="checkbox-row rounded-[22px] border border-[#eadfcf] bg-white p-5"
              >
                <input
                  name={control.eventKey}
                  type="checkbox"
                  defaultChecked={state.eventOverrides[control.eventKey]}
                />
                <span>
                  <strong className="block text-sm text-[#10261d]">{control.title}</strong>
                  <span className="mt-1 block text-sm text-[#5f6f68]">
                    {control.description}
                  </span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.12em] text-[#8e6a3b]">
                    {control.benefit}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="form-actions">
            <button className="button" type="submit">
              Salvar governanca
            </button>
            <Link className="button secondary" href="/internal/advogada/operacional">
              Voltar ao operacional
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Readiness do piloto push"
        description="A preparacao existe para reduzir retrabalho depois, nao para antecipar ativacao sem politica. O piloto continua desligado nesta fase."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PremiumFeatureCard
            eyebrow="Estado"
            title={
              pushReadiness.status === "pilot_ready"
                ? "Piloto tecnicamente pronto"
                : "Piloto bloqueado"
            }
            description={pushReadiness.summary}
          />
          <PremiumFeatureCard
            eyebrow="Cohort"
            title={`${pushReadiness.pilotInterestCount} interesse(s) registrado(s)`}
            description="A base de interesse ajuda a escolher um grupo pequeno quando o piloto puder nascer com seguranca."
          />
          <PremiumFeatureCard
            eyebrow="Inicio seguro"
            title="Documento liberado e compromisso"
            description="Esses seguem como os dois candidatos mais seguros para um piloto futuro, sem abrir uma cascata de push generico."
          />
        </div>
      </SectionCard>
    </AppFrame>
  );
}
