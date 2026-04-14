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
  title: "Comunidade premium",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ClientEcosystemCommunityPage() {
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
      <EcosystemTelemetryBeacon
        eventKey="community_viewed"
        payload={{
          surface: "client_ecosystem_community",
          page: "/cliente/ecossistema/comunidade",
          journey: "circulo_essencial"
        }}
      />
      {journey.community.joined ? (
        <EcosystemTelemetryBeacon
          eventKey="member_active"
          payload={{
            surface: "client_ecosystem_community",
            page: "/cliente/ecossistema/comunidade",
            journey: "circulo_essencial"
          }}
        />
      ) : null}
      <EcosystemTelemetryBeacon
        eventKey="founder_engagement_score"
        payload={{
          surface: "client_ecosystem_community",
          page: "/cliente/ecossistema/comunidade",
          journey: "circulo_essencial"
        }}
      />

      <ClientSafeCard title="Sala Reservada do Circulo">
        <div className="rounded-[28px] border border-[#e7e0d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.96))] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Comunidade conectada a jornada
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
            {journey.community.statusLabel}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">{journey.community.detail}</p>
        </div>
      </ClientSafeCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClientSafeCard title="Papel da comunidade">
          <p>
            A comunidade foi desenhada como extensao natural do Circulo Essencial: um espaco de continuidade e pertencimento premium, gratuito por enquanto, conectado ao conteudo e sem se confundir com o atendimento juridico principal.
          </p>
          <p className="mt-3">
            Entrada, permanencia e saida seguem semantica propria para preservar elegancia, previsibilidade, desejo e fronteira clara entre core e ecossistema.
          </p>
        </ClientSafeCard>

        <ClientSafeCard title={journey.community.joined ? "Membership ativo" : "Entrada reservada"}>
          <p>
            {journey.community.joined
              ? "Seu membership comunitario ja esta ativo como parte da primeira jornada fundadora gratuita."
              : "A comunidade continua reservada e sera liberada em conjunto com o grant fundador, mantendo a ativacao sob controle."}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <TrackedLink
              href={journey.links.hub}
              eventKey="product_selected"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_community", target: "hub" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Voltar ao hub premium
            </TrackedLink>
            <TrackedLink
              href={journey.links.content}
              eventKey={journey.access.hasAccess ? "content_started" : "product_selected"}
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_community", target: "content" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              Abrir trilha premium
            </TrackedLink>
          </div>
        </ClientSafeCard>
      </div>

      <ClientSafeCard title="Rituais Da Comunidade">
        <div className="grid gap-4 md:grid-cols-3">
          {operations.valueLoops.map((loop) => (
            <article
              key={loop.loop}
              className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                {loop.cadence}
              </p>
              <p className="mt-3 text-lg font-semibold text-[#10261d]">{loop.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{loop.detail}</p>
            </article>
          ))}
        </div>
      </ClientSafeCard>
    </ClientShell>
  );
}
