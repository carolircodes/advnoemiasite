import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  clientStatusLabels,
  formatPortalDateTime,
} from "@/lib/domain/portal";
import { getClientWorkspace } from "@/lib/services/dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type NoticeItem = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function asRecord<T extends object>(value: T | null | undefined) {
  return value && typeof value === "object" ? value : null;
}

function safePortalDateTime(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  try {
    return formatPortalDateTime(value);
  } catch {
    return fallback;
  }
}

export const metadata: Metadata = {
  title: "Meu painel",
  robots: {
    index: false,
    follow: false,
  },
};

function getStatusSummary(status: string) {
  if (status === "aguardando-primeiro-acesso") {
    return "Seu cadastro ja foi criado e aguarda a conclusao do primeiro acesso.";
  }

  if (status === "convite-enviado") {
    return "Seu convite inicial ja foi emitido e o portal esta pronto para uso.";
  }

  return "Seu cadastro esta sincronizado com a base real do portal.";
}

function getCaseStatusSummary(status: string) {
  switch (status) {
    case "triagem":
      return "A equipe esta reunindo as informacoes iniciais do atendimento.";
    case "documentos":
      return "Seu caso esta em fase de organizacao documental e conferencia do material.";
    case "analise":
      return "A documentacao ja entrou em analise para definir os proximos passos.";
    case "em-andamento":
      return "O caso esta em acompanhamento ativo pela equipe.";
    case "aguardando-retorno":
      return "Ha um retorno, resposta ou providencia pendente para seguir o fluxo.";
    case "concluido":
      return "O acompanhamento principal deste caso foi concluido.";
    default:
      return "A equipe segue acompanhando o seu caso pelo portal.";
  }
}

function isUpcomingAppointment(
  appointment: { starts_at?: string | null; status?: string | null },
  now: Date
) {
  if (!appointment?.starts_at) return false;

  return (
    new Date(appointment.starts_at) >= now &&
    appointment.status !== "cancelled" &&
    appointment.status !== "completed"
  );
}

function Pill({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-[#d9c39c] bg-[#f7efe1] text-[#8e6a3b]"
          : "border-[#ddd6ca] bg-white text-[#41524b]",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[28px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#10261d]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66766f] sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function ClientPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  let workspace: Awaited<ReturnType<typeof getClientWorkspace>>;

  try {
    workspace = await getClientWorkspace(profile);
  } catch (error) {
    console.error("[cliente.page] Erro ao carregar workspace do cliente", {
      profileId: profile.id,
      profileEmail: profile.email,
      error: error instanceof Error ? error.message : String(error),
    });

    if (
      error instanceof Error &&
      error.message.includes("Nao foi possivel localizar o cadastro do cliente")
    ) {
      redirect("/auth/primeiro-acesso");
    }

    redirect("/portal/login?error=erro-carregar-dados");
  }

  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : "";
  const rawError =
    typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;

  const now = new Date();

  const documents = asArray(workspace.documents);
  const documentRequests = asArray(workspace.documentRequests);
  const appointments = asArray(workspace.appointments);
  const cases = asArray(workspace.cases);
  const events = asArray(workspace.events);
  const clientRecord = asRecord(workspace.clientRecord);

  const availableDocuments = documents.filter(
    (document) =>
      document &&
      (document.status === "recebido" || document.status === "revisado")
  );

  const pendingDocuments = documents.filter(
    (document) =>
      document &&
      (document.status === "pendente" || document.status === "solicitado")
  );

  const openRequests = documentRequests.filter(
    (request) => request && request.status === "pending"
  );

  const upcomingAppointments = appointments
    .filter((appointment) => appointment && isUpcomingAppointment(appointment, now))
    .slice(0, 4);

  const nextAppointment = upcomingAppointments[0] ?? null;
  const mainCase = cases[0] ?? null;

  const recentEvents = events.slice(0, 5);

  const importantNotices = [
    mainCase && mainCase.statusLabel
      ? {
          title: `Status atual: ${mainCase.statusLabel}`,
          body: getCaseStatusSummary(mainCase.status ?? ""),
          href: "#status-caso",
          cta: "Ver status do caso",
        }
      : null,
    nextAppointment?.starts_at
      ? {
          title: "Proxima data importante",
          body: `${safePortalDateTime(nextAppointment.starts_at, "Data nao informada")} - ${
            nextAppointment.title ?? "Compromisso agendado"
          }.`,
          href: "#agenda",
          cta: "Abrir agenda",
        }
      : null,
    openRequests.length > 0
      ? {
          title: "Documentos aguardando voce",
          body: `Ha ${openRequests.length} solicitacao(oes) documental(is) aberta(s) no seu portal.`,
          href: "#documentos",
          cta: "Abrir documentos",
        }
      : null,
    openRequests.length === 0 && pendingDocuments.length > 0
      ? {
          title: "Documentos em acompanhamento",
          body: `A equipe segue acompanhando ${pendingDocuments.length} documento(s) pendente(s) ou solicitado(s).`,
          href: "#documentos",
          cta: "Ver documentos",
        }
      : null,
    recentEvents.length > 0 && recentEvents[0]
      ? {
          title: "Ultima atualizacao liberada",
          body:
            recentEvents[0].public_summary ||
            "A equipe registrou um novo andamento visivel no seu portal.",
          href: "#historico-atualizacoes",
          cta: "Ler historico",
        }
      : null,
  ].filter(Boolean) as NoticeItem[];

  const clientStatus =
    clientRecord?.status &&
    clientStatusLabels[
      clientRecord.status as keyof typeof clientStatusLabels
    ]
      ? clientStatusLabels[clientRecord.status as keyof typeof clientStatusLabels]
      : "Cadastro ativo";

  const caseArea =
    mainCase?.area &&
    caseAreaLabels[mainCase.area as keyof typeof caseAreaLabels]
      ? caseAreaLabels[mainCase.area as keyof typeof caseAreaLabels]
      : "Atendimento juridico";

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#10261d]">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="rounded-[32px] border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <Pill active>Meu painel</Pill>
            <a href="#documentos" className="no-underline">
              <Pill>Documentos</Pill>
            </a>
            <a href="#agenda" className="no-underline">
              <Pill>Agenda</Pill>
            </a>
          </div>

          <div className="mt-6 inline-flex rounded-full border border-[#eadfcf] bg-[#fbf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e6a3b]">
            Area do cliente
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#10261d] sm:text-5xl lg:text-6xl">
                Seu acompanhamento em um ambiente claro, seguro e organizado.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f6f68] sm:text-lg">
                Reunimos status do caso, documentos, datas importantes e
                atualizacoes liberadas pela equipe em um unico lugar.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Cadastro
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#10261d]">
                    {clientStatus}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    {getStatusSummary(clientRecord?.status ?? "")}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Documentos
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#10261d]">
                    {availableDocuments.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    disponivel(is) para consulta no portal.
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Solicitacoes
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#10261d]">
                    {openRequests.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    pendencia(s) aberta(s) aguardando retorno.
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Proximo passo
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#10261d]">
                    {nextAppointment?.starts_at
                      ? safePortalDateTime(nextAppointment.starts_at, "Sem data futura")
                      : "Sem data futura"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    {nextAppointment?.title || "Aguardando novo agendamento."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#e7e0d5] bg-[linear-gradient(180deg,#fffdf9_0%,#f8f4ec_100%)] p-6 sm:p-7">
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.02em] text-[#10261d]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8e6a3b]" />
                Avisos importantes
              </h2>

              <div className="mt-6 space-y-4">
                {importantNotices.length > 0 ? (
                  importantNotices.map((notice) => (
                    <a
                      key={`${notice.title}-${notice.href}`}
                      href={notice.href}
                      className="block rounded-[22px] border border-[#eadfce] bg-white px-5 py-4 no-underline transition hover:border-[#d7c29b] hover:shadow-[0_12px_30px_rgba(16,38,29,0.05)]"
                    >
                      <p className="text-sm font-semibold text-[#10261d]">
                        {notice.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
                        {notice.body}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[#8e6a3b]">
                        {notice.cta}
                      </p>
                    </a>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-[#eadfce] bg-white px-5 py-4">
                    <p className="text-sm font-semibold text-[#10261d]">
                      Tudo em ordem por aqui
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
                      Assim que houver novas datas, documentos ou atualizacoes,
                      elas aparecerao neste painel.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[22px] border border-[#dde7df] bg-[#f7fbf8] p-5">
                <p className="text-sm font-semibold text-[#10261d]">
                  Dados de acesso
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-sm leading-6 text-[#5f6f68]">{profile.email}</p>
              </div>
            </div>
          </div>

          {success === "primeiro-acesso-concluido" ? (
            <div className="mt-8 rounded-[24px] border border-[#dbe8de] bg-[#f5fbf6] px-5 py-4">
              <p className="text-sm font-semibold text-[#215637]">
                Primeiro acesso concluido com sucesso.
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4e6a57]">
                Seu ambiente foi liberado e o painel ja esta pronto para uso.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-8 rounded-[24px] border border-[#f0caca] bg-[#fff4f4] px-5 py-4">
              <p className="text-sm font-semibold text-[#8a3b3b]">
                Nao foi possivel concluir uma acao no portal.
              </p>
              <p className="mt-1 text-sm leading-6 text-[#915151]">{error}</p>
            </div>
          ) : null}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <Section
              id="status-caso"
              title="Status do caso"
              subtitle="Visao principal do acompanhamento e da etapa atual do atendimento."
            >
              {mainCase ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fcfaf6] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                          Caso principal
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-[#10261d]">
                          {mainCase.title || "Caso em acompanhamento"}
                        </h3>
                      </div>

                      <span className="inline-flex items-center rounded-full border border-[#dcc7a1] bg-[#f8eedb] px-3 py-1 text-sm font-semibold text-[#8e6a3b]">
                        {mainCase.statusLabel || "Em andamento"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-[#ece5d9] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                          Area
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#10261d]">
                          {caseArea}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-[#ece5d9] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                          Resumo
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
                          {getCaseStatusSummary(mainCase.status || "")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#ddd3c4] bg-[#fcfaf6] p-5">
                  <p className="text-sm font-semibold text-[#10261d]">
                    Seu caso ainda nao apareceu no painel.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    Seu caso aparecera aqui assim que a equipe concluir o
                    cadastro interno.
                  </p>
                </div>
              )}
            </Section>

            <Section
              id="historico-atualizacoes"
              title="Historico de atualizacoes"
              subtitle="Os registros liberados pela equipe aparecem aqui em ordem da mais recente."
            >
              {recentEvents.length > 0 ? (
                <div className="space-y-4">
                  {recentEvents.map((event, index) => (
                    <div
                      key={`${event.id ?? index}-${event.occurred_at ?? index}`}
                      className="rounded-[22px] border border-[#ece5d9] bg-[#fcfaf6] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#10261d]">
                          Atualizacao {index + 1}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                          {event.occurred_at
                            ? safePortalDateTime(event.occurred_at, "Sem data registrada")
                            : "Sem data registrada"}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5f6f68]">
                        {event.public_summary ||
                          "A equipe registrou um novo andamento visivel no portal."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#ddd3c4] bg-[#fcfaf6] p-5">
                  <p className="text-sm font-semibold text-[#10261d]">
                    Ainda nao ha atualizacoes publicadas.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    Assim que a equipe liberar novos andamentos, eles aparecerao
                    aqui para consulta.
                  </p>
                </div>
              )}
            </Section>
          </div>

          <div className="space-y-8">
            <Section
              id="documentos"
              title="Documentos e solicitacoes"
              subtitle="Arquivos disponiveis para consulta e pendencias abertas no seu atendimento."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Disponiveis
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
                    {availableDocuments.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    documento(s) pronto(s) para consulta.
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#ece5d9] bg-[#fcfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
                    Solicitacoes abertas
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#10261d]">
                    {openRequests.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    pedido(s) aguardando retorno seu.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {documents.length > 0 ? (
                  documents.slice(0, 5).map((document, index) => (
                    <div
                      key={`${document.id ?? index}-${document.file_name ?? index}`}
                      className="rounded-[20px] border border-[#ece5d9] bg-white px-4 py-4"
                    >
                      <p className="text-sm font-semibold text-[#10261d]">
                        {document.file_name || document.description || "Documento sem titulo"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#66766f]">
                        Status: {document.status || "Sem status"}.
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#ddd3c4] bg-[#fcfaf6] p-5">
                    <p className="text-sm font-semibold text-[#10261d]">
                      Nenhum documento disponivel no momento.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#66766f]">
                      Quando a equipe anexar materiais ao seu atendimento, eles
                      aparecerao aqui.
                    </p>
                  </div>
                )}
              </div>
            </Section>

            <Section
              id="agenda"
              title="Agenda e proximos passos"
              subtitle="Datas importantes e compromissos futuros relacionados ao atendimento."
            >
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment, index) => (
                    <div
                      key={`${appointment.id ?? index}-${appointment.starts_at ?? index}`}
                      className="rounded-[20px] border border-[#ece5d9] bg-[#fcfaf6] p-5"
                    >
                      <p className="text-sm font-semibold text-[#10261d]">
                        {appointment.title || "Compromisso agendado"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#66766f]">
                        {appointment.starts_at
                          ? safePortalDateTime(appointment.starts_at, "Data nao informada")
                          : "Data nao informada"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#ddd3c4] bg-[#fcfaf6] p-5">
                  <p className="text-sm font-semibold text-[#10261d]">
                    Nenhuma data futura cadastrada.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66766f]">
                    Assim que houver novos compromissos, eles aparecerao aqui.
                  </p>
                </div>
              )}
            </Section>

            <Section
              title="Acesso e suporte"
              subtitle="Atalhos uteis para continuidade do seu acompanhamento."
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/portal/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8e6a3b] px-6 text-sm font-semibold text-white no-underline transition hover:bg-[#7b5c31]"
                >
                  Ir para o login
                </Link>

                <Link
                  href="/auth/esqueci-senha"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8d2c8] bg-white px-6 text-sm font-semibold text-[#10261d] no-underline transition hover:bg-[#faf7f2]"
                >
                  Redefinir senha
                </Link>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
