"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ProductEventBeacon } from "@/components/product-event-beacon";

function PaymentPendingContent() {
  const [countdown, setCountdown] = useState(45);
  const [payment, setPayment] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
  const externalReference = searchParams.get("external_reference");

  async function checkStatus() {
    if (!paymentId && !externalReference) {
      return;
    }

    const requestUrl = new URL("/api/payment/create", window.location.origin);

    if (paymentId) {
      requestUrl.searchParams.set("payment_id", paymentId);
    }

    if (externalReference) {
      requestUrl.searchParams.set("external_reference", externalReference);
    }

    const response = await fetch(requestUrl.toString());
    const data = await response.json();

    if (!data.success) {
      return;
    }

    setPayment(data.payment);

    const redirectParams = new URLSearchParams();

    if (paymentId) {
      redirectParams.set("payment_id", paymentId);
    }

    if (externalReference) {
      redirectParams.set("external_reference", externalReference);
    }

    if (data.payment.status === "approved") {
      router.push(`/pagamento/sucesso?${redirectParams.toString()}`);
    } else if (data.payment.status === "rejected") {
      redirectParams.set("collection_status", "rejected");
      router.push(`/pagamento/falha?${redirectParams.toString()}`);
    }
  }

  useEffect(() => {
    void checkStatus();

    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          void checkStatus();
          return 45;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [externalReference, paymentId, router]);

  const offerName = useMemo(
    () => (payment?.metadata?.offer_name as string) || "Etapa premium",
    [payment]
  );

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-[#10261d]">
      <ProductEventBeacon
        eventKey="payment_pending"
        eventGroup="revenue"
        payload={{
          payment_id: paymentId || "",
          offer_code: payment?.metadata?.offer_code || "consultation_initial",
          offer_name: offerName,
          status: "pending_return_viewed"
        }}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[32px] border border-[#eadfcf] bg-white p-8 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
          <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7b5c31]">
            Pagamento em andamento
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em]">
            Estamos acompanhando a confirmacao de {offerName.toLowerCase()}.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
            Seu checkout foi iniciado e o sistema continua verificando a
            confirmacao para liberar a continuidade sem ruído.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Status
              </p>
              <p className="mt-3 text-lg font-semibold">Pagamento pendente</p>
            </article>
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Nova verificacao
              </p>
              <p className="mt-3 text-lg font-semibold">{countdown}s</p>
            </article>
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Proximo movimento
              </p>
              <p className="mt-3 text-lg font-semibold">Confirmar e continuar</p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              O que fazer agora
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6f68]">
              <li>Finalize o Pix ou aguarde a operadora se estiver usando cartao.</li>
              <li>O sistema continua monitorando a confirmacao sem perder o contexto da oferta.</li>
              <li>Se a confirmacao demorar demais, a operacao pode retomar o fluxo com follow-up.</li>
            </ul>
          </article>

          <article className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Continuar acompanhando
            </h2>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => void checkStatus()}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white"
              >
                Verificar status agora
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

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPendingContent />
    </Suspense>
  );
}
