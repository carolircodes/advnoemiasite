import Link from "next/link";

import { ClientSafeCard } from "./client-safe-card";
import type { ClientPortalPremiumProjection } from "@/lib/services/premium-operational-model";

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

export function ClientPremiumWorkspace({
  projection
}: {
  projection: ClientPortalPremiumProjection;
}) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="order-2 lg:order-1">
          <ClientSafeCard title="Onde seu atendimento esta agora">
          <div className="rounded-[28px] border border-[#e7e0d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.96))] p-5">
            <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
              Etapa atual
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#10261d]">
              {projection.stageLabel}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#5f6f68]">
              {projection.stageDetail}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {projection.statusCards.map((card) => {
              const toneClasses = getToneClasses(card.tone);

              return (
                <article
                  key={card.label}
                  className={`rounded-[24px] border p-5 ${toneClasses.card}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[#10261d]">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{card.detail}</p>
                </article>
              );
            })}
          </div>
          </ClientSafeCard>
        </div>

        <div className="order-1 lg:order-2">
          <ClientSafeCard title="Proximo passo com clareza">
          <div className={`rounded-[28px] border p-5 ${getToneClasses(projection.nextStep.tone).card}`}>
            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getToneClasses(projection.nextStep.tone).pill}`}>
              {projection.nextStep.ownerLabel}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#10261d]">
              {projection.nextStep.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#5f6f68]">
              {projection.nextStep.detail}
            </p>
          </div>

          <div className="mt-5 rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Continuidade do portal
            </p>
            <p className="mt-3 text-sm leading-7 text-[#5f6f68]">
              {projection.consistencyNote}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/documentos"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              Ver documentos e solicitacoes
            </Link>
            <Link
              href="/agenda"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Ver agenda e compromissos
            </Link>
          </div>
          </ClientSafeCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <ClientSafeCard title="O que pede sua atencao">
          {projection.attentionItems.length ? (
            <div className="space-y-4">
              {projection.attentionItems.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-[24px] border p-5 ${getToneClasses(item.tone).card}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#10261d]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{item.detail}</p>
                    </div>
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getToneClasses(item.tone).pill}`}>
                      {item.meta}
                    </div>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={item.href}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-5 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-[#5f6f68]">
              Nenhuma acao imediata do seu lado no momento. O portal continua monitorando documentos, agenda e andamento para avisar quando algo mudar.
            </p>
          )}
        </ClientSafeCard>

        <ClientSafeCard title="Linha do acompanhamento">
          {projection.timeline.length ? (
            <div className="space-y-4">
              {projection.timeline.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                        {item.kind}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-[#10261d]">{item.title}</h3>
                    </div>
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getToneClasses(item.tone).pill}`}>
                      {item.meta[0]}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#5f6f68]">{item.detail}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.meta.slice(1).map((meta) => (
                      <span
                        key={`${item.id}-${meta}`}
                        className="inline-flex rounded-full bg-[#eef1ee] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f625d]"
                      >
                        {meta}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link
                      href={item.href}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-5 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-[#5f6f68]">
              Assim que a equipe publicar um novo andamento, documento ou compromisso, ele aparecera aqui em ordem cronologica para manter o acompanhamento claro.
            </p>
          )}
        </ClientSafeCard>
      </div>

      <ClientSafeCard title="Leitura executiva do seu portal">
        <div className="grid gap-4 md:grid-cols-3">
          {projection.strategicCards.map((card) => (
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
    </>
  );
}
