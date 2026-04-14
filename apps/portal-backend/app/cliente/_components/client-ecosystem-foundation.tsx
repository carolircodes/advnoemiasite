import { TrackedLink } from "@/components/tracked-link";
import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import type { ClientPremiumJourneySnapshot } from "@/lib/services/ecosystem-journey";
import type { ClientEcosystemWorkspace } from "@/lib/services/ecosystem-platform";

import { ClientSafeCard } from "./client-safe-card";

function getToneClasses(tone: "success" | "warning" | "muted" | "critical") {
  switch (tone) {
    case "success":
      return {
        card: "border-[#d7e7dc] bg-[#f5fbf6]",
        pill: "bg-[#e7f4ea] text-[#245236]"
      };
    case "warning":
      return {
        card: "border-[#eadfcf] bg-[#fbf7ef]",
        pill: "bg-[#f5ead6] text-[#7b5c31]"
      };
    case "critical":
      return {
        card: "border-[#efd7d7] bg-[#fff6f6]",
        pill: "bg-[#f9e7e7] text-[#8a3f3f]"
      };
    default:
      return {
        card: "border-[#ece5d9] bg-[#fcfaf6]",
        pill: "bg-[#eef1ee] text-[#4f625d]"
      };
  }
}

export function ClientEcosystemFoundation({
  workspace,
  journey
}: {
  workspace: ClientEcosystemWorkspace;
  journey: ClientPremiumJourneySnapshot;
}) {
  return (
    <>
      <EcosystemTelemetryBeacon
        eventKey="product_viewed"
        payload={{ surface: "client_ecosystem_foundation", page: "/cliente" }}
      />

      <ClientSafeCard title="Camadas premium do portal">
        <div className="rounded-[28px] border border-[#e7e0d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.96))] p-5">
          <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
            Ecossistema premium
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#10261d]">
            {journey.anchor.title}
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            {journey.anchor.subtitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">
            {journey.anchor.description}
          </p>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">{workspace.separationNote}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getToneClasses(journey.anchor.statusTone).pill}`}
            >
              {journey.anchor.statusLabel}
            </span>
            <span className="inline-flex rounded-full bg-[#eef1ee] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f625d]">
              {journey.anchor.workspaceLabel}
            </span>
            <span className="inline-flex rounded-full bg-[#f3ede2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b5c31]">
              {journey.beta.label}
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href={journey.links.hub}
              eventKey="product_selected"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_foundation", target: "hub" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              {journey.anchor.ctaLabel}
            </TrackedLink>
            <TrackedLink
              href={journey.links.benefits}
              eventKey="plan_viewed"
              eventGroup="ecosystem"
              trackingPayload={{ surface: "client_ecosystem_foundation", target: "benefits" }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Ver beneficios e acesso
            </TrackedLink>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {workspace.accessCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-[24px] border p-5 ${getToneClasses(card.tone).card}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                {card.label}
              </p>
              <p className="mt-3 text-lg font-semibold text-[#10261d]">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{card.detail}</p>
            </article>
          ))}
        </div>
      </ClientSafeCard>

      {journey.access.hasAccess ? (
        <ClientSafeCard title="Jornada premium ativada">
          <EcosystemTelemetryBeacon
            eventKey="access_granted"
            payload={{ surface: "client_ecosystem_foundation", page: "/cliente" }}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <article className={`rounded-[24px] border p-5 ${getToneClasses(journey.access.tone).card}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Acesso
              </p>
              <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.access.statusLabel}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.access.detail}</p>
            </article>
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Conteudo inaugural
              </p>
              <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.content.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.content.detail}</p>
            </article>
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Comunidade conectada
              </p>
              <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.community.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.community.detail}</p>
            </article>
          </div>
        </ClientSafeCard>
      ) : null}

      <ClientSafeCard title="Recorrencia premium em transicao elegante">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Assinatura
            </p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.lifecycleLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.subscription.detail}</p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Billing
            </p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.billingLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{journey.subscription.nextBillingLabel}</p>
          </article>
          <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Fundacao
            </p>
            <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.subscription.foundingLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
              A camada premium preserva quem entrou cedo enquanto organiza billing e entitlement em lifecycle proprio.
            </p>
          </article>
        </div>
      </ClientSafeCard>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ClientSafeCard title="Experiencias multicamada">
          <div className="space-y-4">
            {workspace.experienceZones.map((zone) => (
              <article
                key={`${zone.title}-${zone.workspaceLabel}`}
                className={`rounded-[24px] border p-5 ${getToneClasses(zone.tone).card}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#10261d]">{zone.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{zone.summary}</p>
                  </div>
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getToneClasses(zone.tone).pill}`}
                  >
                    {zone.status}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="inline-flex rounded-full bg-[#eef1ee] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f625d]">
                    {zone.workspaceLabel}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </ClientSafeCard>

        <ClientSafeCard title="Prontidao do ecossistema">
          <div className="space-y-4">
            <article className="rounded-[24px] border border-[#eadfcf] bg-[#fbf7ef] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Politica de beta
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[#10261d]">{journey.beta.label}</p>
                </div>
                <span className="inline-flex rounded-full bg-[#f5ead6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b5c31]">
                  controle
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5f6f68]">{journey.beta.detail}</p>
            </article>
            {workspace.premiumReadiness.map((card) => (
              <article
                key={card.label}
                className={`rounded-[24px] border p-5 ${getToneClasses(card.tone).card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                      {card.label}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[#10261d]">{card.value}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getToneClasses(card.tone).pill}`}
                  >
                    {card.tone}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5f6f68]">{card.detail}</p>
              </article>
            ))}
          </div>
        </ClientSafeCard>
      </div>
    </>
  );
}
