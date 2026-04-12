import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAction } from "@/lib/auth/actions";

import { ClientSafeCard } from "./client-safe-card";

export type ClientShellProfile = {
  displayName: string;
  email: string;
  phoneLabel: string;
  firstLoginCompletedLabel: string;
};

type NoticeTone = "success" | "error" | "warning";

type ClientShellNotice = {
  tone: NoticeTone;
  title: string;
  description: string;
};

function MessageBox({
  tone,
  title,
  description
}: ClientShellNotice) {
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

function ClientShellFrame({
  children
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#10261d] sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">{children}</div>
    </main>
  );
}

export function ClientShell({
  profile,
  notices = [],
  children
}: {
  profile: ClientShellProfile;
  notices?: ClientShellNotice[];
  children?: ReactNode;
}) {
  return (
    <ClientShellFrame>
      <section className="rounded-[32px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
        <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
          Area do cliente
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d] sm:text-4xl">
          Ola, {profile.displayName}.
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
          Este shell autenticado e a parte estavel do painel. Ele nao depende
          do workspace completo, de analytics, de scripts globais ou de widgets
          dinamicos para abrir com seguranca.
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
              Shell
            </p>
            <p className="mt-2 text-lg font-semibold text-[#10261d]">Server-first</p>
            <p className="mt-2 text-sm leading-6 text-[#66766f]">
              A estrutura principal foi isolada dos modulos variaveis.
            </p>
          </div>

          <div className="rounded-3xl border border-[#ece5d9] bg-[#fcfaf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Estabilidade
            </p>
            <p className="mt-2 text-lg font-semibold text-[#10261d]">Prioridade total</p>
            <p className="mt-2 text-sm leading-6 text-[#66766f]">
              Modulos futuros poderao falhar isoladamente sem derrubar a rota.
            </p>
          </div>
        </div>
      </section>

      {notices.map((notice) => (
        <MessageBox
          key={`${notice.tone}-${notice.title}`}
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      ))}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ClientSafeCard title="Boas-vindas e acesso">
          <p>
            Este painel abre primeiro com o minimo necessario: autenticacao
            valida, identificacao basica da sessao, boundaries locais e acoes
            seguras.
          </p>
          <p className="mt-3">
            O shell termina aqui. Os modulos de caso, documentos, agenda e
            interacoes voltarao em camadas seguras, cada um com loader e
            fallback proprios.
          </p>
        </ClientSafeCard>

        <ClientSafeCard title="Dados basicos seguros">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Nome
              </dt>
              <dd className="text-sm text-[#10261d]">{profile.displayName}</dd>
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
              <dd className="text-sm text-[#10261d]">{profile.phoneLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                Primeiro acesso
              </dt>
              <dd className="text-sm text-[#10261d]">
                {profile.firstLoginCompletedLabel}
              </dd>
            </div>
          </dl>
        </ClientSafeCard>
      </div>

      {children}

      <ClientSafeCard title="Links uteis e acoes seguras">
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
          Este shell permanece util mesmo com dados vazios, ausentes ou
          inconsistentes. Os modulos futuros so entram quando conseguirem falhar
          de forma isolada e previsivel.
        </p>
      </ClientSafeCard>
    </ClientShellFrame>
  );
}

export function ClientShellLoading() {
  return (
    <ClientShellFrame>
      <section className="rounded-[32px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8">
        <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
          Area do cliente
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d] sm:text-4xl">
          Carregando shell estavel do painel.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
          Estamos preparando uma versao segura da area autenticada antes de
          qualquer modulo dinamico entrar em cena.
        </p>
      </section>

      <ClientSafeCard>
        <div className="h-4 w-40 animate-pulse rounded-full bg-[#ebe4d8]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[#f0ebe2]" />
        <div className="mt-3 h-4 w-4/5 animate-pulse rounded-full bg-[#f0ebe2]" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-3xl bg-[#fcfaf6]" />
          <div className="h-28 animate-pulse rounded-3xl bg-[#fcfaf6]" />
          <div className="h-28 animate-pulse rounded-3xl bg-[#fcfaf6]" />
        </div>
      </ClientSafeCard>
    </ClientShellFrame>
  );
}

export function ClientShellErrorState({
  message,
  actions
}: {
  message: string;
  actions?: ReactNode;
}) {
  return (
    <ClientShellFrame>
      <ClientSafeCard className="border-[#f0d7d7]">
        <div className="inline-flex rounded-full border border-[#f0d7d7] bg-[#fff4f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a25555]">
          Falha controlada
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
          O shell do painel bloqueou uma falha antes que ela virasse tela branca.
        </h1>

        <p className="mt-4 text-base leading-8 text-[#5f6f68]">
          Esta rota possui fallback local. Mesmo que um modulo futuro falhe, o
          objetivo continua sendo manter a area autenticada renderizando algo
          util e recuperavel.
        </p>

        <div className="mt-6 rounded-3xl border border-[#efe3d1] bg-[#fbf7ef] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
            Detalhe tecnico seguro
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-[#5f6f68]">
            {message || "Erro nao identificado durante a renderizacao."}
          </p>
        </div>

        {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
      </ClientSafeCard>
    </ClientShellFrame>
  );
}
