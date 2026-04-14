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

export default async function ClientEcosystemBenefitsPage() {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const [profileSummary, journey] = await Promise.all([
    getClientProfileSummary(profile),
    getClientPremiumJourney(profile)
  ]);

  return (
    <ClientShell profile={profileSummary.data}>
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
              A recorrencia esta semanticamente pronta, mas a cobranca operacional continua fora de escopo nesta fase.
            </p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Status</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.plan.statusLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.plan.detail}</p>
          </article>
        </div>
      </ClientSafeCard>

      <div className="grid gap-6 lg:grid-cols-2">
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
            O acesso beta acontece por grant manual e curadoria interna. Isso preserva a sobriedade da marca, evita abertura precoce e impede que a camada premium contamine o fluxo juridico principal.
          </p>
          <p className="mt-3">
            O portal mostra com elegancia a diferenca entre plano modelado, acesso concedido e experiencia ainda reservada.
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
