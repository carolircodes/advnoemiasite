"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ClientError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cliente.error] Falha ao renderizar rota /cliente", {
      message: error.message,
      digest: error.digest
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#10261d] sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-[32px] border border-[#f0d7d7] bg-white p-8 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
          <div className="inline-flex rounded-full border border-[#f0d7d7] bg-[#fff4f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a25555]">
            Falha controlada
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
            O shell do painel bloqueou uma falha antes que ela virasse tela branca.
          </h1>

          <p className="mt-4 text-base leading-8 text-[#5f6f68]">
            Esta rota continua com fallback local. Mesmo que modulos futuros
            falhem, a meta permanece a mesma: manter a area autenticada
            recuperavel e visivel.
          </p>

          <div className="mt-6 rounded-3xl border border-[#efe3d1] bg-[#fbf7ef] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Detalhe tecnico seguro
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-[#5f6f68]">
              {error.message || "Erro nao identificado durante a renderizacao."}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white transition hover:bg-[#7b5c31]"
            >
              Tentar novamente
            </button>

            <Link
              href="/cliente"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Reabrir painel
            </Link>

            <Link
              href="/portal/login?error=erro-carregar-dados"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Voltar ao login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
