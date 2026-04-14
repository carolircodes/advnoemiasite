import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import { TrackedLink } from "@/components/tracked-link";
import { requireProfile } from "@/lib/auth/guards";
import { getCommunityOperationsBlueprint } from "@/lib/services/ecosystem-community-operations";
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
  const operations = getCommunityOperationsBlueprint();

  return (
    <ClientShell
      profile={profileSummary.data}
      notices={[
        {
          tone: journey.access.hasAccess ? "success" : "warning",
          title: journey.access.hasAccess ? "Founder ativo no Circulo" : "Entrada privada em curadoria",
          description: journey.access.hasAccess
            ? "Seu portal agora reconhece uma jornada fundadora gratuita, com acesso, conteudo e comunidade conectados sem tocar no core juridico."
            : "A jornada premium inaugural ja existe com framing, workspace e semantica de acesso. A entrada continua curada, pequena e sofisticada."
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
          eventKey="member_active"
          payload={{
            surface: "client_ecosystem_hub",
            page: "/cliente/ecossistema",
            journey: "circulo_essencial"
          }}
        />
      ) : null}
      {journey.access.hasAccess ? (
        <EcosystemTelemetryBeacon
          eventKey="onboarding_completed"
          payload={{
            surface: "client_ecosystem_hub",
            page: "/cliente/ecossistema",
            journey: "circulo_essencial"
          }}
        />
      ) : null}
      {!journey.access.hasAccess ? (
        <EcosystemTelemetryBeacon
          eventKey="waitlist_interest"
          payload={{
            surface: "client_ecosystem_hub",
            page: "/cliente/ecossistema",
            journey: "circulo_essencial"
          }}
        />
      ) : null}
      <EcosystemTelemetryBeacon
        eventKey="premium_interest_signal"
        payload={{
          surface: "client_ecosystem_hub",
          page: "/cliente/ecossistema",
          journey: "circulo_essencial"
        }}
      />

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
            <span className="inline-flex rounded-full bg-[#eef4ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#456055]">
              Gratuito, privado e fundador
            </span>
          </div>
        </div>
      </ClientSafeCard>

      <ClientSafeCard title="Posicionamento fundador do Circulo Essencial">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Momento</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.lifecycleLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.subscription.detail}</p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Monetizacao</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.billingLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              {journey.subscription.providerLabel}. {journey.subscription.nextBillingLabel}
            </p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Status fundador</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.foundingLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              O beneficio de quem entrou cedo permanece separado da camada juridica e protegido enquanto a futura camada paga fica preservada para depois.
            </p>
          </article>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <TrackedLink
            href={journey.links.benefits}
            eventKey="premium_interest_signal"
            eventGroup="ecosystem"
            trackingPayload={{ surface: "client_ecosystem_hub", target: "benefits" }}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
          >
            Ver beneficios do founder
          </TrackedLink>
          <TrackedLink
            href={journey.links.community}
            eventKey="founder_engagement_score"
            eventGroup="ecosystem"
            trackingPayload={{ surface: "client_ecosystem_hub", target: "community" }}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
          >
            Fortalecer pertencimento
          </TrackedLink>
          {!journey.access.hasAccess ? (
            <TrackedLink
              href={journey.links.benefits}
              eventKey="waitlist_interest"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_hub", target: "waitlist" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Entrar na lista privada
            </TrackedLink>
          ) : null}
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

      <ClientSafeCard title="Experiencia fundadora">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Entrada</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">Curadoria antes de escala</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              Os primeiros membros entram como selecao cuidadosa, nao como abertura massiva.
            </p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Onboarding</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">Acesso com contexto</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              Framing, trilha e comunidade aparecem como uma unica recepcao premium e legivel.
            </p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Continuidade</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">Retencao desde o primeiro ciclo</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              A experiencia ja nasce preparada para medir permanencia, valor percebido, desejo e sinais de prontidao para monetizacao futura.
            </p>
          </article>
        </div>
      </ClientSafeCard>

      <ClientSafeCard title="Entrada Curada E Lista Privada">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Politica de entrada</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">
              Lotes de ate {operations.entryPolicy.lotSize} founders
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              No maximo {operations.entryPolicy.maxConcurrentInvites} convites simultaneos para manter onboarding cuidadoso.
            </p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Estados curatoriais</p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">
              {operations.entryPolicy.founderStates.join(" | ")}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              A curadoria diferencia convite, founder ativo, waitlist e deferimento sem perder elegancia.
            </p>
          </article>
        </div>
        <div className="mt-5 rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">Lista privada</p>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">{operations.waitlistPolicy.experienceRule}</p>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">{operations.waitlistPolicy.upgradeRule}</p>
        </div>
      </ClientSafeCard>

      <ClientSafeCard title="Ritmo Vivo Do Circulo">
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
              A camada de plano organiza a experiencia premium gratuita e preserva a monetizacao futura sem poluir o portal com urgencia barata.
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
