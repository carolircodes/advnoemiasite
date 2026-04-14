import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import { TrackedLink } from "@/components/tracked-link";
import { requireProfile } from "@/lib/auth/guards";
import { getCommunityOperationsBlueprint } from "@/lib/services/ecosystem-community-operations";
import { getClientProfileSummary } from "@/lib/services/client-workspace";
import { getClientPremiumJourney } from "@/lib/services/ecosystem-journey";

import { ClientSafeCard } from "../../_components/client-safe-card";
import { ClientShell } from "../../_components/client-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conteudo premium",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ClientEcosystemContentPage() {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const [profileSummary, journey] = await Promise.all([
    getClientProfileSummary(profile),
    getClientPremiumJourney(profile)
  ]);
  const operations = getCommunityOperationsBlueprint();

  return (
    <ClientShell profile={profileSummary.data}>
      {journey.access.hasAccess ? (
        <>
          <EcosystemTelemetryBeacon
            eventKey="content_unlocked"
            payload={{
              surface: "client_ecosystem_content",
              page: "/cliente/ecossistema/conteudo",
              journey: "circulo_essencial"
            }}
          />
          <EcosystemTelemetryBeacon
            eventKey="content_started"
            payload={{
              surface: "client_ecosystem_content",
              page: "/cliente/ecossistema/conteudo",
              journey: "circulo_essencial"
            }}
          />
          <EcosystemTelemetryBeacon
            eventKey="member_active"
            payload={{
              surface: "client_ecosystem_content",
              page: "/cliente/ecossistema/conteudo",
              journey: "circulo_essencial"
            }}
          />
          <EcosystemTelemetryBeacon
            eventKey="founder_engagement_score"
            payload={{
              surface: "client_ecosystem_content",
              page: "/cliente/ecossistema/conteudo",
              journey: "circulo_essencial"
            }}
          />
        </>
      ) : (
        <>
          <EcosystemTelemetryBeacon
            eventKey="product_viewed"
            payload={{
              surface: "client_ecosystem_content_locked",
              page: "/cliente/ecossistema/conteudo",
              journey: "circulo_essencial"
            }}
          />
          <EcosystemTelemetryBeacon
            eventKey="premium_interest_signal"
            payload={{
              surface: "client_ecosystem_content_locked",
              page: "/cliente/ecossistema/conteudo",
              journey: "circulo_essencial"
            }}
          />
        </>
      )}

      <ClientSafeCard title="Biblioteca de Clareza Estrategica">
        <div className="rounded-[28px] border border-[#e7e0d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.96))] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Estado do conteudo
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
            {journey.content.statusLabel}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">{journey.content.detail}</p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            {journey.content.completionLabel}
          </p>
        </div>
      </ClientSafeCard>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ClientSafeCard title="Trilha inaugural">
          <p className="text-lg font-semibold text-[#10261d]">{journey.content.title}</p>
          <p className="mt-2 text-sm leading-7 text-[#5f6f68]">
            A jornada premium inicial abre com uma unidade reservada que posiciona a cliente dentro do ecossistema, com framing de continuidade, leitura curada e valor percebido crescente.
          </p>
          <div className="mt-5 rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Primeira unidade</p>
            <p className="mt-2 text-base font-semibold text-[#10261d]">{journey.content.unitTitle}</p>
            <p className="mt-2 text-sm text-[#5f6f68]">Material de apoio: {journey.content.assetTitle}</p>
          </div>
        </ClientSafeCard>

        <ClientSafeCard title={journey.access.hasAccess ? "Consumo liberado" : "Acesso ainda reservado"}>
          <p>
            {journey.access.hasAccess
              ? "Seu grant fundador ja libera esta trilha. O progresso fica rastreado por unidade, preservando a sensacao de experiencia premium real."
              : `A trilha ja esta pronta e conectada ao plano ancora, mas continua reservada. Estado atual: ${journey.entry.label}.`}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <TrackedLink
              href={journey.links.benefits}
              eventKey="plan_viewed"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_content", target: "benefits" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Ver beneficios da jornada
            </TrackedLink>
            <TrackedLink
              href={journey.links.community}
              eventKey="community_viewed"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_content", target: "community" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              Abrir comunidade conectada
            </TrackedLink>
          </div>
        </ClientSafeCard>
      </div>

      <ClientSafeCard title="Progressao E Retorno">
        <div className="grid gap-4 md:grid-cols-3">
          {operations.contentCheckpoints.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                {item.milestone}
              </p>
              <p className="mt-3 text-lg font-semibold text-[#10261d]">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{item.detail}</p>
            </article>
          ))}
        </div>
      </ClientSafeCard>
    </ClientShell>
  );
}
