"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NotificationJourneyBeacon } from "@/components/notification-journey-beacon";
import { ProductEventBeacon } from "@/components/product-event-beacon";

type PaymentState =
  | { status: "loading" }
  | {
      status: "success";
      payment: {
        id: string;
        status: string;
        amount: number;
        metadata?: Record<string, unknown> | null;
      };
    }
  | { status: "error" };

function formatCurrency(value: number | undefined) {
  if (!value) {
    return "Valor nao informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function PaymentSuccessContent() {
  const [state, setState] = useState<PaymentState>({ status: "loading" });
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
  const externalReference = searchParams.get("external_reference");

  useEffect(() => {
    async function verify() {
      if (!paymentId && !externalReference) {
        setState({ status: "error" });
        return;
      }

      try {
        const requestUrl = new URL("/api/payment/create", window.location.origin);

        if (paymentId) {
          requestUrl.searchParams.set("payment_id", paymentId);
        }

        if (externalReference) {
          requestUrl.searchParams.set("external_reference", externalReference);
        }

        const response = await fetch(requestUrl.toString());
        const data = await response.json();

        if (data.success) {
          setState({
            status: "success",
            payment: data.payment
          });
          return;
        }

        setState({ status: "error" });
      } catch {
        setState({ status: "error" });
      }
    }

    void verify();
  }, [externalReference, paymentId]);

  const offerName = useMemo(() => {
    if (state.status !== "success") {
      return "Pagamento premium";
    }

    return (state.payment.metadata?.offer_name as string) || "Pagamento premium";
  }, [state]);

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-[#10261d] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
          <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
            Verificando pagamento
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
            Estamos confirmando sua etapa de pagamento.
          </h1>
          <p className="mt-4 text-base leading-8 text-[#5f6f68]">
            Em instantes o sistema organiza a confirmacao, a continuidade e o
            proximo passo da sua jornada premium.
          </p>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-[#10261d] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-[#efd7d7] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
          <div className="inline-flex rounded-full border border-[#efd7d7] bg-[#fff6f6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a3f3f]">
            Confirmacao indisponivel
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
            Nao conseguimos validar esse retorno agora.
          </h1>
          <p className="mt-4 text-base leading-8 text-[#5f6f68]">
            O fluxo de pagamento nao foi perdido. Voce pode voltar ao seu painel
            ou tentar novamente em instantes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/cliente")}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white"
            >
              Abrir meu painel
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d]"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-[#10261d] sm:px-6 sm:py-10">
      <NotificationJourneyBeacon completeOnViewEventKeys={["client.payment.confirmed"]} />
      <ProductEventBeacon
        eventKey="revenue_signal"
        eventGroup="revenue"
        payload={{
          payment_id: state.payment.id,
          offer_code: state.payment.metadata?.offer_code || "consultation_initial",
          offer_name: offerName,
          status: "success_return_viewed"
        }}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[32px] border border-[#d7e7dc] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
          <div className="inline-flex rounded-full border border-[#d7e7dc] bg-[#f5fbf6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#245236]">
            Pagamento confirmado
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {offerName} confirmada com sucesso.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
            O sistema ja reconheceu o pagamento e a jornada segue com contexto:
            atendimento, continuidade e proximo passo permanecem conectados no
            seu portal.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Oferta
              </p>
              <p className="mt-3 text-lg font-semibold">{offerName}</p>
            </article>
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Valor confirmado
              </p>
              <p className="mt-3 text-lg font-semibold">
                {formatCurrency(state.payment.amount)}
              </p>
            </article>
            <article className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Proximo passo
              </p>
              <p className="mt-3 text-lg font-semibold">Abrir seu acompanhamento</p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              O que acontece agora
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6f68]">
              <li>A operacao recebe a confirmacao e pode seguir sem depender de cobranca manual.</li>
              <li>A jornada continua com status claro, sem limbo entre pagamento e atendimento.</li>
              <li>Agenda, consulta ou analise seguem para o proximo passo conforme a oferta contratada.</li>
            </ul>
          </article>

          <article className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Continuar com clareza
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#5f6f68]">
              Voce pode voltar ao seu painel para acompanhar documentos, agenda
              e proximos movimentos. O contexto do pagamento permanece
              preservado no seu acompanhamento.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push("/cliente?payment=confirmed")}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white"
              >
                Abrir meu painel
              </button>
              <button
                onClick={() => router.push("/agenda")}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d]"
              >
                Ver agenda do caso
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
