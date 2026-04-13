"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ProductEventBeacon } from "@/components/product-event-beacon";

function getFailureReason(status: string) {
  switch (status) {
    case "rejected":
      return "O pagamento foi rejeitado pela instituicao financeira ou pelo metodo escolhido.";
    case "cancelled":
      return "O checkout foi interrompido antes da confirmacao.";
    default:
      return "A confirmacao nao aconteceu neste momento.";
  }
}

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("collection_status") || "failed";

  const reason = useMemo(() => getFailureReason(status), [status]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-[#10261d]">
      <ProductEventBeacon
        eventKey="payment_failed"
        eventGroup="revenue"
        payload={{
          payment_id: paymentId || "",
          status
        }}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[32px] border border-[#efd7d7] bg-white p-8 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
          <div className="inline-flex rounded-full border border-[#efd7d7] bg-[#fff6f6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a3f3f]">
            Pagamento nao concluido
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em]">
            A jornada de pagamento precisa ser retomada.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
            {reason} O sistema manteve o contexto da oferta para facilitar uma
            nova tentativa ou apoio humano sem perder a continuidade.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Como recuperar essa jornada
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6f68]">
              <li>Gerar um novo checkout com o mesmo contexto da oferta.</li>
              <li>Tentar outro metodo de pagamento, como Pix.</li>
              <li>Seguir com apoio humano se a cobranca precisar de orientacao adicional.</li>
            </ul>
          </article>

          <article className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Continuar com seguranca
            </h2>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push("/noemia?retry_payment=true")}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => router.push("/noemia")}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d]"
              >
                Voltar ao atendimento
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={null}>
      <PaymentFailureContent />
    </Suspense>
  );
}
