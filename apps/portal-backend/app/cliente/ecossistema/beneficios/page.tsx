import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import { TrackedLink } from "@/components/tracked-link";
import { requireProfile } from "@/lib/auth/guards";
import { getClientProfileSummary } from "@/lib/services/client-workspace";
import { getClientPremiumJourney } from "@/lib/services/ecosystem-journey";

import { ClientSafeCard } from "../../_components/client-safe-card";
import { ClientShell } from "../../_components/client-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos e beneficios",
  robots: {
    index: false,
    follow: false
  }
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
}

export default async function ClientEcosystemBenefitsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const params = await searchParams;
  const success = pickFirst(params.success);
  const error = pickFirst(params.error);
  const [profileSummary, journey] = await Promise.all([
    getClientProfileSummary(profile),
    getClientPremiumJourney(profile)
  ]);

  return (
    <ClientShell
      profile={profileSummary.data}
      notices={[
        success
          ? {
              tone: "success",
              title: "Assinatura atualizada",
              description:
                "A camada recorrente foi sincronizada com sucesso e o entitlement premium ja refletiu o novo estado da assinatura."
            }
          : error
            ? {
                tone: "error",
                title: "Leitura da assinatura",
                description: error
              }
            : {
                tone: "warning",
                title: "Operacao fundadora",
                description:
                  "Esta area organiza billing, beneficios e acesso do Circulo Essencial como ativacao fundadora controlada, sem misturar a assinatura com o fluxo juridico principal."
              }
      ]}
    >
      <EcosystemTelemetryBeacon
        eventKey="plan_viewed"
        payload={{
          surface: "client_ecosystem_benefits",
          page: "/cliente/ecossistema/beneficios",
          journey: "circulo_essencial"
        }}
      />
      {!journey.access.hasAccess ? (
        <EcosystemTelemetryBeacon
          eventKey="subscription_interest"
          payload={{
            surface: "client_ecosystem_benefits",
            page: "/cliente/ecossistema/beneficios",
            journey: "circulo_essencial"
          }}
        />
      ) : null}
      {journey.access.hasAccess ? (
        <EcosystemTelemetryBeacon
          eventKey="subscription_authorized"
          payload={{
            surface: "client_ecosystem_benefits",
            page: "/cliente/ecossistema/beneficios",
            journey: "circulo_essencial"
          }}
        />
      ) : null}

      <ClientSafeCard title="Planos e beneficios do Circulo Essencial">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Plano</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.plan.name}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.plan.headline}</p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Cadencia modelada</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.plan.cadenceLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              A recorrencia agora roda em camada propria, com billing recorrente separado do checkout juridico e liberacao fundadora sob curadoria.
            </p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Status</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.plan.statusLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.plan.detail}</p>
          </article>
        </div>
      </ClientSafeCard>

      <ClientSafeCard title="Gestao elegante da assinatura">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Lifecycle</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.lifecycleLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.subscription.detail}</p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Billing</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.billingLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.subscription.nextBillingLabel}</p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Politica fundadora</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.foundingLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              A migracao do beta preserva beneficios fundadores, rastreabilidade do entitlement e a historia da primeira fundadora.
            </p>
          </article>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {journey.subscription.canStartLive ? (
            <TrackedLink
              href={journey.subscription.startHref}
              eventKey="subscription_started"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_benefits", target: "start_live" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              Ativar assinatura live
            </TrackedLink>
          ) : null}
          {journey.subscription.canPause ? (
            <TrackedLink
              href={journey.subscription.pauseHref}
              eventKey="subscription_paused"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_benefits", target: "pause" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Pausar
            </TrackedLink>
          ) : null}
          {journey.subscription.canResume ? (
            <TrackedLink
              href={journey.subscription.resumeHref}
              eventKey="access_restored"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_benefits", target: "resume" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Retomar
            </TrackedLink>
          ) : null}
          {journey.subscription.canCancel ? (
            <TrackedLink
              href={journey.subscription.cancelHref}
              eventKey="subscription_canceled"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_benefits", target: "cancel" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Cancelar
            </TrackedLink>
          ) : null}
          <TrackedLink
            href={journey.subscription.syncHref}
            eventKey="retention_signal"
            eventGroup="ecosystem"
            trackingPayload={{ surface: "client_ecosystem_benefits", target: "sync" }}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
          >
            Sincronizar status
          </TrackedLink>
        </div>
      </ClientSafeCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClientSafeCard title="Onboarding premium do primeiro ciclo">
          <ul className="space-y-4">
            <li className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              Confirmacao elegante da autorizacao recorrente com linguagem de entrada fundadora.
            </li>
            <li className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              Acesso imediato ao hub, conteudo inaugural e comunidade reservada do Circulo.
            </li>
            <li className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              Continuidade apresentada como permanencia premium, nao como mera cobranca mensal.
            </li>
          </ul>
        </ClientSafeCard>

        <ClientSafeCard title="Beneficios ativos nesta primeira jornada">
          <ul className="space-y-4">
            <li className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              Biblioteca premium inicial conectada ao grant controlado.
            </li>
            <li className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              Trilha inaugural com progresso rastreado por unidade.
            </li>
            <li className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              Entrada curada na comunidade reservada do Circulo.
            </li>
          </ul>
        </ClientSafeCard>

        <ClientSafeCard title="Politica de ativacao controlada">
          <p>
            O acesso beta e live acontece por grant manual, convite ou checkout autorizado dentro de uma curadoria interna enxuta. Isso preserva a sobriedade da marca, evita abertura precoce e impede que a camada premium contamine o fluxo juridico principal.
          </p>
          <p className="mt-3">
            O portal mostra com elegancia a diferenca entre plano modelado, autorizacao recorrente, acesso concedido e experiencia fundadora ainda reservada.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href={journey.links.hub}
              eventKey="product_selected"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_benefits", target: "hub" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Voltar ao hub premium
            </TrackedLink>
            <TrackedLink
              href={journey.links.content}
              eventKey={journey.access.hasAccess ? "content_unlocked" : "product_selected"}
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_benefits", target: "content" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              Abrir conteudo premium
            </TrackedLink>
          </div>
        </ClientSafeCard>
      </div>
    </ClientShell>
  );
}
