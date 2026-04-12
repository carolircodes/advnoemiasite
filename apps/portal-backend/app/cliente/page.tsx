import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/lib/auth/actions";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Area do cliente",
  robots: {
    index: false,
    follow: false
  }
};

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
}

function decodeErrorMessage(value: string) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getSafeDisplayName(fullName: string | null | undefined, email: string) {
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Cliente";
}

function formatSafeDate(value: string | null | undefined) {
  if (!value) {
    return "Nao informado";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Nao informado";
  }

  return parsedDate.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function MessageBox({
  tone,
  title,
  description
}: {
  tone: "success" | "error" | "warning";
  title: string;
  description: string;
}) {
  const toneClasses = {
    success: "border-[#d5e8d8] bg-[#f4fbf4] text-[#245236]",
    error: "border-[#f0d2d2] bg-[#fff5f5] text-[#8a3f3f]",
    warning: "border-[#eadfcf] bg-[#fbf7ef] text-[#7b5c31]"
  };

  return (
    <section className={`rounded-3xl border px-5 py-4 ${toneClasses[tone]}`}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">{title}</h2>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </section>
  );
}

function InfoCard({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
      <h2 className="text-lg font-semibold text-[#10261d]">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-[#5f6f68]">{children}</div>
    </section>
  );
}

export default async function ClientPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const params = await searchParams;
  const successCode = pickFirst(params.success);
  const rawErrorCode = pickFirst(params.error);
  const decodedError = decodeErrorMessage(rawErrorCode);
  const errorMessage = getAccessMessage(decodedError) || decodedError;
  const displayName = getSafeDisplayName(profile.full_name, profile.email);
  const phoneLabel =
    typeof profile.phone === "string" && profile.phone.trim().length > 0
      ? profile.phone.trim()
      : "Nao informado";

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#10261d] sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[32px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
          <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
            Area do cliente
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d] sm:text-4xl">
            Ola, {displayName}.
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
            Esta e a versao emergencial e server-first do seu painel. Removemos
            blocos avancados e dados instaveis do carregamento inicial para
            garantir que a rota autenticada sempre abra com seguranca.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Sessao
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">Ativa</p>
              <p className="mt-2 text-sm leading-6 text-[#66766f]">
                A autenticacao do portal foi validada antes da renderizacao.
              </p>
            </div>

            <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Perfil
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">Cliente</p>
              <p className="mt-2 text-sm leading-6 text-[#66766f]">
                Nome, email e telefone sao tratados com fallback explicito.
              </p>
            </div>

            <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Estabilidade
              </p>
              <p className="mt-2 text-lg font-semibold text-[#10261d]">Prioridade total</p>
              <p className="mt-2 text-sm leading-6 text-[#66766f]">
                O conteudo detalhado do workspace foi retirado do caminho critico.
              </p>
            </div>
          </div>
        </section>

        {successCode === "primeiro-acesso-concluido" ? (
          <MessageBox
            tone="success"
            title="Primeiro acesso concluido"
            description="Seu acesso foi liberado com sucesso e o painel minimo ja esta disponivel."
          />
        ) : null}

        {errorMessage ? (
          <MessageBox
            tone="error"
            title="Alerta do portal"
            description={errorMessage}
          />
        ) : null}

        <MessageBox
          tone="warning"
          title="Modo de contingencia"
          description="Dados detalhados de caso, agenda, documentos e widgets dinamicos foram temporariamente removidos desta tela para impedir falhas silenciosas de renderizacao."
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <InfoCard title="Boas-vindas e acesso">
            <p>
              Este painel abre primeiro com o minimo necessario: autenticacao
              valida, identificacao basica da sessao e acoes seguras.
            </p>
            <p className="mt-3">
              Se algum dado adicional do seu cadastro estiver ausente ou
              invalido, a pagina continua funcionando com fallbacks em vez de
              quebrar a renderizacao.
            </p>
          </InfoCard>

          <InfoCard title="Dados basicos seguros">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                  Nome
                </dt>
                <dd className="text-sm text-[#10261d]">{displayName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                  Email
                </dt>
                <dd className="text-sm text-[#10261d]">{profile.email || "Nao informado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                  Telefone
                </dt>
                <dd className="text-sm text-[#10261d]">{phoneLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                  Primeiro acesso
                </dt>
                <dd className="text-sm text-[#10261d]">
                  {formatSafeDate(profile.first_login_completed_at)}
                </dd>
              </div>
            </dl>
          </InfoCard>
        </div>

        <InfoCard title="Links uteis e acoes seguras">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/auth/atualizar-senha"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
            >
              Atualizar senha
            </Link>

            <Link
              href="/portal/login"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Ir para o login
            </Link>

            <Link
              href="/auth/esqueci-senha"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
            >
              Redefinir senha
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] transition hover:bg-[#faf7f2]"
              >
                Encerrar sessao
              </button>
            </form>
          </div>
          <p className="mt-4">
            Esta pagina foi reduzida ao essencial para estabilidade imediata em
            producao. O objetivo desta versao e renderizar sempre algo util,
            mesmo quando o restante do workspace estiver inconsistente.
          </p>
        </InfoCard>
      </div>
    </main>
  );
}
