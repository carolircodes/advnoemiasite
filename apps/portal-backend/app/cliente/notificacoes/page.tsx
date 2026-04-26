import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NotificationJourneyBeacon } from "@/components/notification-journey-beacon";
import { PushPilotControls } from "@/components/push-pilot-controls";
import {
  PremiumFeatureCard,
  PremiumSection,
  PremiumStatePanel
} from "@/components/portal/premium-experience";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getClientNotificationControls } from "@/lib/notifications/preference-catalog";
import {
  loadNotificationPreferenceState,
  saveNotificationPreferenceState
} from "@/lib/notifications/preferences";
import {
  assessPushPilotReadiness,
  getPushPilotSubscriptionStatus
} from "@/lib/notifications/push-pilot";

import { ClientShell } from "../_components/client-shell.tsx";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preferencias de notificacao",
  robots: {
    index: false,
    follow: false
  }
};

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function getSuccessMessage(code: string) {
  if (code === "preferencias-salvas") {
    return "Suas preferencias foram atualizadas. O portal continua priorizando alertas uteis, discretos e com contexto.";
  }

  return "";
}

async function saveClientNotificationPreferencesAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["cliente"]);
  const controls = getClientNotificationControls();

  await saveNotificationPreferenceState({
    actorProfile: profile,
    state: {
      audience: "client",
      timezone: "America/Fortaleza",
      quietModeEnabled: formData.get("quietModeEnabled") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
      whatsappEnabled: formData.get("whatsappEnabled") === "on",
      pushPilotInterested: formData.get("pushPilotInterested") === "on",
      eventOverrides: Object.fromEntries(
        controls.map((control) => [
          control.eventKey,
          formData.get(control.eventKey) === "on"
        ])
      ) as Record<(typeof controls)[number]["eventKey"], boolean>
    }
  });

  redirect("/cliente/notificacoes?success=preferencias-salvas");
}

export default async function ClientNotificationPreferencesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile(["cliente"]);
  const params = await searchParams;
  const success = typeof params.success === "string" ? getSuccessMessage(params.success) : "";
  const [{ state, source }, pushReadiness, pushSubscriptionStatus] = await Promise.all([
    loadNotificationPreferenceState(profile),
    assessPushPilotReadiness(),
    getPushPilotSubscriptionStatus(profile.id)
  ]);
  const controls = getClientNotificationControls();

  return (
    <ClientShell
      profile={{
        displayName: profile.full_name,
        email: profile.email,
        phoneLabel: profile.phone || "Nao informado",
        firstLoginCompletedLabel: formatDateLabel(profile.first_login_completed_at)
      }}
      notices={
        success
          ? [
              {
                tone: "success",
                title: "Preferencias salvas",
                description: success
              }
            ]
          : []
      }
    >
      <NotificationJourneyBeacon />

      <PremiumSection
        eyebrow="Notificacoes governadas"
        title="Controle simples para receber o que realmente ajuda."
        description="Esta area foi desenhada para manter voce informado quando houver utilidade real, sem transformar seu portal em uma fila de alertas frios."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PremiumFeatureCard
            eyebrow="Agora"
            title="Poucos alertas, melhor timing"
            description="Compromissos, documentos, pagamento e proximo passo continuam priorizados pelo que gera acao clara."
          />
          <PremiumFeatureCard
            eyebrow="Noite"
            title={state.quietModeEnabled ? "Janela silenciosa ativa" : "Janela silenciosa pausada"}
            description="Alertas importantes respeitam horario mais calmo; urgencias reais continuam protegidas pela policy."
          />
          <PremiumFeatureCard
            eyebrow="Piloto futuro"
            title={state.pushPilotInterested ? "Interesse no piloto registrado" : "Piloto ainda em preparo"}
            description="Push web continua desligado por padrao. Quando entrar, vai com cohort pequeno e apenas para eventos de alto valor."
          />
        </div>
      </PremiumSection>

      {source === "default" ? (
        <PremiumStatePanel
          tone="warning"
          eyebrow="Defaults seguros"
          title="Voce ainda esta usando a configuracao recomendada."
          description="Ela privilegia clareza, horario mais silencioso a noite e poucos gatilhos com valor real. Se quiser, ajuste apenas o que muda sua rotina."
        />
      ) : null}

      <SectionCard
        title="Minhas preferencias"
        description="Voce nao precisa configurar tudo. Ajuste apenas o que te ajuda a responder melhor quando houver um passo claro a seguir."
      >
        <form action={saveClientNotificationPreferencesAction} className="stack">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="checkbox-row rounded-[20px] border border-[#eadfcf] bg-[#fbf7ef] p-4">
              <input name="emailEnabled" type="checkbox" defaultChecked={state.emailEnabled} />
              <span>
                <strong className="block text-sm text-[#10261d]">Receber por e-mail</strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  Canal principal para alertas com contexto, CTA e retomada segura.
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
                <strong className="block text-sm text-[#10261d]">Aceitar agilidade por WhatsApp</strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  Usado apenas quando a policy considerar que velocidade faz diferenca real.
                </span>
              </span>
            </label>
            <label className="checkbox-row rounded-[20px] border border-[#eadfcf] bg-[#fbf7ef] p-4">
              <input
                name="quietModeEnabled"
                type="checkbox"
                defaultChecked={state.quietModeEnabled}
              />
              <span>
                <strong className="block text-sm text-[#10261d]">Preferir horario mais silencioso a noite</strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  O portal segura lembretes e retornos suaves na janela noturna para preservar tranquilidade.
                </span>
              </span>
            </label>
            <label className="checkbox-row rounded-[20px] border border-[#eadfcf] bg-[#fbf7ef] p-4">
              <input
                name="pushPilotInterested"
                type="checkbox"
                defaultChecked={state.pushPilotInterested}
              />
              <span>
                <strong className="block text-sm text-[#10261d]">Quero entrar no piloto controlado de push</strong>
                <span className="mt-1 block text-sm text-[#5f6f68]">
                  Ainda nao esta ativo. Este sinal apenas registra interesse para um piloto pequeno e governado.
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
                  <span className="mt-1 block text-sm text-[#5f6f68]">{control.description}</span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.12em] text-[#8e6a3b]">
                    {control.benefit}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="form-actions">
            <button className="button" type="submit">
              Salvar preferencias
            </button>
            <Link className="button secondary" href="/cliente">
              Voltar ao painel
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Piloto push controlado"
        description="Quando estiver ativo, ele continua pequeno, reversivel e reservado para alertas que merecem chegar rapido."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PremiumFeatureCard
            eyebrow="Status"
            title={pushReadiness.status === "pilot_ready" ? "Piloto tecnicamente pronto" : "Piloto ainda bloqueado"}
            description={pushReadiness.summary}
          />
          <PremiumFeatureCard
            eyebrow="Candidatos seguros"
            title="Compromisso e documento liberado"
            description="Se o piloto nascer, ele comeca apenas por esses dois eventos de alto valor e baixa ambiguidade."
          />
          <PremiumFeatureCard
            eyebrow="Regra"
            title="Sem ativacao ampla agora"
            description="Mesmo com interesse registrado, o envio continua desligado ate subscription, VAPID e service worker estarem prontos com governanca."
          />
        </div>
        <div className="mt-5">
          <PushPilotControls
            activationFlag={pushReadiness.activationFlag}
            readinessStatus={pushReadiness.status}
            readinessSummary={pushReadiness.summary}
            pushPilotInterested={state.pushPilotInterested}
            vapidPublicKey={process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY || null}
            initialSubscriptionStatus={pushSubscriptionStatus}
          />
        </div>
      </SectionCard>
    </ClientShell>
  );
}
