import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import { TrackedLink } from "@/components/tracked-link";
import { requireProfile } from "@/lib/auth/guards";
import { getClientProfileSummary } from "@/lib/services/client-workspace";
import { getClientPremiumJourney } from "@/lib/services/ecosystem-journey";

import { ClientSafeCard } from "../_components/client-safe-card";
import { ClientShell } from "../_components/client-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hub premium",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ClientEcosystemHubPage() {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const [profileSummary, journey] = await Promise.all([
    getClientProfileSummary(profile),
    getClientPremiumJourney(profile)
  ]);

  return (
    <ClientShell
      profile={profileSummary.data}
      notices={[
        {
          tone: journey.access.hasAccess ? "success" : "warning",
          title: journey.access.hasAccess ? "Jornada premium ativa" : "Beta privado controlado",
          description: journey.access.hasAccess
            ? "Seu portal agora reconhece uma jornada premium viva, com acesso, conteudo e comunidade conectados sem tocar no core juridico."
            : "A jornada premium inaugural ja existe com framing, workspace e semantica de acesso. A liberacao continua curada e controlada."
        }
      ]}
    >
      <EcosystemTelemetryBeacon
        eventKey="product_viewed"
        payload={{ surface: "client_ecosystem_hub", page: "/cliente/ecossistema" }}
      />
      <EcosystemTelemetryBeacon
        eventKey="retention_signal"
        payload={{
          surface: "client_ecosystem_hub",
          page: "/cliente/ecossistema",
          journey: "circulo_essencial"
        }}
      />
      {journey.access.hasAccess ? (
        <EcosystemTelemetryBeacon
          eventKey="access_granted"
          payload={{
            surface: "client_ecosystem_hub",
            page: "/cliente/ecossistema",
            journey: "circulo_essencial"
          }}
        />
      ) : null}

      <ClientSafeCard title="Hub premium do ecossistema">
        <div className="rounded-[28px] border border-[#e7e0d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.96))] p-5">
          <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
            Oferta ancora
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
            {journey.anchor.title}
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            {journey.anchor.subtitle}
          </p>
          <p className="mt-4 text-sm leading-7 text-[#5f6f68]">{journey.anchor.description}</p>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">{journey.anchor.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex rounded-full bg-[#f5ead6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b5c31]">
              {journey.anchor.statusLabel}
            </span>
            <span className="inline-flex rounded-full bg-[#eef1ee] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f625d]">
              {journey.plan.name}
            </span>
            <span className="inline-flex rounded-full bg-[#f3ede2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b5c31]">
              {journey.beta.label}
            </span>
          </div>
        </div>
      </ClientSafeCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <ClientSafeCard title="Acesso e plano">
          <p className="text-lg font-semibold text-[#10261d]">{journey.access.statusLabel}</p>
          <p className="mt-2">{journey.access.detail}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Plano conectado
          </p>
          <p className="mt-2 text-base font-semibold text-[#10261d]">{journey.plan.name}</p>
          <p className="mt-2">{journey.plan.headline}</p>
          <p className="mt-3 text-sm text-[#5f6f68]">{journey.plan.detail}</p>
        </ClientSafeCard>

        <ClientSafeCard title="Conteudo premium">
          <p className="text-lg font-semibold text-[#10261d]">{journey.content.title}</p>
          <p className="mt-2">{journey.content.detail}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Primeira unidade
          </p>
          <p className="mt-2 text-base font-semibold text-[#10261d]">{journey.content.unitTitle}</p>
          <p className="mt-2 text-sm text-[#5f6f68]">Material de apoio: {journey.content.assetTitle}</p>
        </ClientSafeCard>

        <ClientSafeCard title="Comunidade conectada">
          <p className="text-lg font-semibold text-[#10261d]">{journey.community.title}</p>
          <p className="mt-2">{journey.community.detail}</p>
          <p className="mt-4 text-sm text-[#5f6f68]">
            A comunidade nasce como extensao natural da jornada premium, com entrada controlada e permanencia alinhada ao plano.
          </p>
        </ClientSafeCard>
      </div>

      <ClientSafeCard title="Navegacao da jornada">
        <div className="grid gap-4 md:grid-cols-3">
          <TrackedLink
            href={journey.links.benefits}
            eventKey="plan_viewed"
            eventGroup="ecosystem"
            trackingPayload={{ surface: "client_ecosystem_hub", target: "benefits" }}
            className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5 text-[#10261d] no-underline transition hover:bg-white"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Planos e beneficios
            </span>
            <strong className="mt-3 block text-base">Ler framing, beneficios e politica de acesso</strong>
            <span className="mt-2 block text-sm leading-6 text-[#5f6f68]">
              A camada de plano organiza a experiencia premium sem acionar cobranca recorrente real.
            </span>
          </TrackedLink>

          <TrackedLink
            href={journey.links.content}
            eventKey={journey.access.hasAccess ? "content_started" : "product_selected"}
            eventGroup="ecosystem"
            trackingPayload={{ surface: "client_ecosystem_hub", target: "content" }}
            className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5 text-[#10261d] no-underline transition hover:bg-white"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Conteudo premium
            </span>
            <strong className="mt-3 block text-base">Abrir a trilha inaugural do ecossistema</strong>
            <span className="mt-2 block text-sm leading-6 text-[#5f6f68]">
              O portal distingue com clareza entre trilha liberada, trilha reservada e consumo em progresso.
            </span>
          </TrackedLink>

          <TrackedLink
            href={journey.links.community}
            eventKey="community_viewed"
            eventGroup="ecosystem"
            trackingPayload={{ surface: "client_ecosystem_hub", target: "community" }}
            className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5 text-[#10261d] no-underline transition hover:bg-white"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Comunidade
            </span>
            <strong className="mt-3 block text-base">Entrar na sala reservada do Circulo</strong>
            <span className="mt-2 block text-sm leading-6 text-[#5f6f68]">
              A comunidade acompanha a jornada como espaco de continuidade, nao como bloco solto.
            </span>
          </TrackedLink>
        </div>
      </ClientSafeCard>
    </ClientShell>
  );
}
