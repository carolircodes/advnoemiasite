import type { ReactNode } from "react";
import Link from "next/link";

import { PremiumFeatureCard, PremiumStatePanel, PremiumSurface } from "@/components/portal/premium-experience";
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
  const eyebrowByTone = {
    success: "Operacao confirmada",
    error: "Falha controlada",
    warning: "Atencao importante"
  } as const;

  return (
    <PremiumStatePanel
      tone={tone}
      eyebrow={eyebrowByTone[tone]}
      title={title}
      description={description}
    />
  );
}

function ClientShellFrame({
  children
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-6 text-[#10261d] sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
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
      <PremiumSurface className="overflow-hidden rounded-[34px] border-[rgba(142,106,59,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.95))] p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
              Area do cliente
            </div>

            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-[#10261d] sm:text-4xl">
              Ola, {profile.displayName}.
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6f68]">
              Este portal foi organizado para mostrar com clareza o momento do seu
              atendimento, o que ja foi conduzido pela equipe e o que ainda pede
              sua participacao, sem ruido e sem perder o contexto juridico.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <PremiumFeatureCard
                eyebrow="Sessao"
                title="Acesso validado"
                description="Seu acompanhamento esta protegido neste ambiente e permanece acessivel com leitura clara."
              />
              <PremiumFeatureCard
                eyebrow="Acompanhamento"
                title="Resumo objetivo"
                description="Agenda, documentos, pagamentos e historico aparecem com prioridade de leitura."
              />
              <PremiumFeatureCard
                eyebrow="Proximo passo"
                title="Acao sem ambiguidades"
                description="O portal destaca primeiro o que depende de voce e o que a equipe ja conduziu."
              />
            </div>
          </div>

          <PremiumSurface tone="neutral" className="self-start rounded-[30px] bg-[rgba(252,249,244,0.92)]">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
                  Leitura executiva
                </p>
                <h2 className="mt-3 font-serif text-2xl font-semibold tracking-[-0.03em] text-[#10261d]">
                  Seu portal foi desenhado para transmitir seguranca.
                </h2>
              </div>
              <p className="text-sm leading-7 text-[#5f6f68]">
                Quando algum bloco estiver indisponivel, o restante do ambiente
                continua util e coerente. A experiencia preserva continuidade,
                linguagem humana e contexto de atendimento.
              </p>
              <div className="premium-inline-stat">
                <span>Perfil identificado</span>
                <strong>{profile.email || "Email protegido"}</strong>
              </div>
              <div className="premium-inline-stat">
                <span>Primeiro acesso</span>
                <strong>{profile.firstLoginCompletedLabel}</strong>
              </div>
            </div>
          </PremiumSurface>
        </div>
      </PremiumSurface>

      {notices.map((notice) => (
        <MessageBox
          key={`${notice.tone}-${notice.title}`}
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      ))}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ClientSafeCard title="Boas-vindas e continuidade do atendimento">
          <p>
            Esta area abre com prioridade no que realmente ajuda voce a se orientar:
            etapa atual, pendencias, documentos, agenda e historico do atendimento.
          </p>
          <p className="mt-3">
            Se algum dado estiver temporariamente indisponivel, o restante do
            portal continua funcionando para manter a leitura clara, segura e sem
            perda de contexto.
          </p>
        </ClientSafeCard>

        <ClientSafeCard title="Dados essenciais protegidos">
          <dl className="space-y-4">
            <div className="premium-definition-row">
              <dt>Nome</dt>
              <dd>{profile.displayName}</dd>
            </div>
            <div className="premium-definition-row">
              <dt>Email</dt>
              <dd>{profile.email || "Nao informado"}</dd>
            </div>
            <div className="premium-definition-row">
              <dt>Telefone</dt>
              <dd>{profile.phoneLabel}</dd>
            </div>
            <div className="premium-definition-row">
              <dt>Primeiro acesso</dt>
              <dd>{profile.firstLoginCompletedLabel}</dd>
            </div>
          </dl>
        </ClientSafeCard>
      </div>

      {children}

      <ClientSafeCard title="Acoes seguras e proximos atalhos">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/auth/atualizar-senha"
            className="button"
          >
            Atualizar senha
          </Link>

          <Link href="/portal/login" className="button secondary">
            Ir para o login
          </Link>

          <Link href="/auth/esqueci-senha" className="button secondary">
            Redefinir senha
          </Link>

          <form action={logoutAction}>
            <button type="submit" className="button secondary">
              Encerrar sessao
            </button>
          </form>
        </div>
        <p className="mt-4">
          Se algum modulo estiver temporariamente vazio ou indisponivel, o
          portal continua mostrando o restante do acompanhamento com clareza,
          sem interromper a continuidade do caso.
        </p>
      </ClientSafeCard>
    </ClientShellFrame>
  );
}

export function ClientShellLoading() {
  return (
    <ClientShellFrame>
      <PremiumStatePanel
        tone="neutral"
        eyebrow="Area do cliente"
        title="Estamos preparando seu painel."
        description="Organizamos primeiro os blocos que ajudam voce a se orientar: atendimento, documentos, agenda e proximos passos."
      />

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
      <PremiumStatePanel
        tone="error"
        eyebrow="Falha controlada"
        title="Nao foi possivel carregar todo o painel agora."
        description="O portal protege esta area para evitar tela em branco. Tente novamente em instantes ou use os atalhos abaixo para retomar o acesso."
        detail={
          <div className="rounded-3xl border border-[#efe3d1] bg-[#fbf7ef] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Detalhe tecnico seguro
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-[#5f6f68]">
              {message || "Erro nao identificado durante a renderizacao."}
            </p>
          </div>
        }
        actions={actions}
      />
    </ClientShellFrame>
  );
}
