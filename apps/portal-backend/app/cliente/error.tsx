"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ClientShellErrorState } from "./_components/client-shell";

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
    <ClientShellErrorState
      message={error.message}
      actions={
        <>
          <button type="button" onClick={() => reset()} className="button">
            Tentar novamente
          </button>

          <Link href="/cliente" className="button secondary">
            Reabrir painel
          </Link>

          <Link
            href="/portal/login?error=erro-carregar-dados"
            className="button secondary"
          >
            Voltar ao login
          </Link>
        </>
      }
    />
  );
}
