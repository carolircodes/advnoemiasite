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
    console.error("[cliente.error] Falha ao renderizar rota autenticada /cliente", {
      message: error.message,
      digest: error.digest
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-[#10261d] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-[#e7e0d5] bg-white p-8 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
        <div className="inline-flex rounded-full border border-[#f0d7d7] bg-[#fff4f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a25555]">
          Erro no painel
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
          Nao foi possivel carregar seu painel agora.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[#5f6f68]">
          Aplicamos um fallback explicito para evitar tela branca silenciosa na area autenticada.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
          <Link
            href="/portal/login?error=erro-carregar-dados"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
}
