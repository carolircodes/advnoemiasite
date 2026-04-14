import type { ClientEcosystemWorkspace } from "@/lib/services/ecosystem-platform";
import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";

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
  workspace
}: {
  workspace: ClientEcosystemWorkspace;
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
            O portal agora esta pronto para crescer em multiplas experiencias.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#5f6f68]">
            {workspace.separationNote}
          </p>
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
