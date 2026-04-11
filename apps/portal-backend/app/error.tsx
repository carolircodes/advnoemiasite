"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app.error] Unhandled route error", {
      message: error.message,
      digest: error.digest
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-[#10261d] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-[#f0ebe5] bg-white p-8 shadow-[0_24px_72px_rgba(16,38,29,0.06)] sm:p-10">
          <div className="inline-flex rounded-full border border-[#f4dfd6] bg-[#fff6f3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#b35c43]">
            Falha detectada
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d] sm:text-4xl">
            Nao foi possivel concluir o carregamento do portal.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[#66766f]">
            A falha foi registrada. Voce pode tentar novamente agora ou voltar para a rota
            de login do portal.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white transition hover:bg-[#7b5c31]"
            >
              Tentar novamente
            </button>

            <Link
              href="/portal/login"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Voltar para o login
            </Link>
          </div>

          {process.env.NODE_ENV === "development" ? (
            <details className="mt-6 rounded-2xl border border-[#ece5d9] bg-[#fcfaf6] p-4 text-sm text-[#5f6f68]">
              <summary className="cursor-pointer font-semibold text-[#10261d]">
                Detalhes tecnicos
              </summary>
              <p className="mt-3 break-words font-mono text-xs leading-6">
                {error.message}
              </p>
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}
