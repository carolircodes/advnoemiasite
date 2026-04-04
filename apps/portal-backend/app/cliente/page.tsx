import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  clientStatusLabels,
  formatPortalDateTime
} from "@/lib/domain/portal";
import { getClientWorkspace } from "@/lib/services/dashboard";

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
  appointment: { starts_at: string; status: string },
  now: Date
) {
  return (
    new Date(appointment.starts_at) >= now &&
    appointment.status !== "cancelled" &&
    appointment.status !== "completed"
  );
}

type NoticeItem = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

export const metadata: Metadata = {
  title: "Meu painel",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ClientPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const workspace = await getClientWorkspace(profile);
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : "";
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const now = new Date();
  const availableDocuments = workspace.documents.filter(
    (document) => document.status === "recebido" || document.status === "revisado"
  );
  const pendingDocuments = workspace.documents.filter(
    (document) => document.status === "pendente" || document.status === "solicitado"
  );
  const openRequests = workspace.documentRequests.filter((request) => request.status === "pending");
  const upcomingAppointments = workspace.appointments
    .filter((appointment) => isUpcomingAppointment(appointment, now))
    .slice(0, 4);
  const nextAppointment = upcomingAppointments[0] || null;
  const mainCase = workspace.cases[0] || null;
  const showOnboardingGuide =
    !workspace.events.length &&
    !workspace.documents.length &&
    !workspace.documentRequests.length &&
    !workspace.appointments.length;
  const importantNotices = [
    mainCase
      ? {
          title: `Status atual: ${mainCase.statusLabel}`,
          body: getCaseStatusSummary(mainCase.status),
          href: "#status-caso",
          cta: "Ver status do caso"
        }
      : null,
    nextAppointment
      ? {
          title: "Proxima data importante",
          body: `${formatPortalDateTime(nextAppointment.starts_at)} - ${nextAppointment.title}.`,
          href: "/agenda#proximos-compromissos",
          cta: "Abrir agenda"
        }
      : null,
    openRequests.length
      ? {
          title: "Documentos aguardando voce",
          body: `Ha ${openRequests.length} solicitacao(oes) documental(is) aberta(s) no seu portal.`,
          href: "/documentos#solicitacoes-abertas",
          cta: "Abrir documentos"
        }
      : null,
    !openRequests.length && pendingDocuments.length
      ? {
          title: "Documentos em acompanhamento",
          body: `A equipe segue acompanhando ${pendingDocuments.length} documento(s) pendente(s) ou solicitado(s).`,
          href: "/documentos",
          cta: "Ver documentos"
        }
      : null,
    workspace.events[0]
      ? {
          title: "Ultima atualizacao liberada",
          body:
            workspace.events[0].public_summary ||
            "A equipe registrou um novo andamento visivel no seu portal.",
          href: "#historico-atualizacoes",
          cta: "Ler historico"
        }
      : null
  ].filter(Boolean) as NoticeItem[];

  return (
    <>
      <ProductEventBeacon
        eventKey="client_portal_viewed"
        eventGroup="portal"
        payload={{
          hasCase: Boolean(mainCase),
          openRequests: openRequests.length,
          upcomingAppointments: upcomingAppointments.length
        }}
      />
      <AppFrame
        eyebrow="Area do cliente"
        title={`Seu caso em um painel claro, organizado e facil de acompanhar, ${profile.full_name}.`}
        description="Aqui voce encontra o status atual do caso, as proximas datas, os documentos liberados e os avisos que realmente importam no acompanhamento do dia a dia."
        utilityContent={
          <PortalSessionBanner
            role={profile.role}
            fullName={profile.full_name}
            email={profile.email}
            workspaceLabel="Portal autenticado"
            workspaceHint="Sessao ativa para acompanhar o proprio atendimento com seguranca."
          />
        }
        navigation={[
          { href: "/cliente", label: "Meu painel", active: true },
          { href: "/documentos", label: "Documentos" },
          { href: "/agenda", label: "Agenda" }
        ]}
        highlights={[
          { label: "Status do caso", value: mainCase ? mainCase.statusLabel : "Em preparacao" },
          { label: "Proximas datas", value: String(upcomingAppointments.length) },
          { label: "Documentos liberados", value: String(availableDocuments.length) },
          {
            label: "Pendencias abertas",
            value: String(openRequests.length + pendingDocuments.length)
          }
        ]}
        actions={[
          { href: "/documentos", label: "Ver documentos" },
          { href: "/agenda", label: "Ver agenda", tone: "secondary" }
        ]}
      >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? (
        <div className="success-notice">
          Primeiro acesso concluido com sucesso. Seu portal esta pronto para acompanhar o caso com mais clareza.
        </div>
      ) : null}

      <div className="grid two">
        <SectionCard
          id="status-caso"
          title="Status atual do caso"
          description="Seu andamento principal fica destacado aqui para que voce entenda rapidamente em que fase o atendimento esta."
        >
          {mainCase ? (
            <div className="stack">
              <div className="update-card featured">
                <div className="update-head">
                  <div>
                    <strong>{mainCase.title}</strong>
                    <span className="item-meta">
                      {caseAreaLabels[mainCase.area as keyof typeof caseAreaLabels]}
                    </span>
                  </div>
                  <span className="tag soft">{mainCase.statusLabel}</span>
                </div>
                <p className="update-body">{getCaseStatusSummary(mainCase.status)}</p>
                <div className="pill-row">
                  <span className="pill success">Caso ativo no portal</span>
                  <span className="pill muted">
                    Aberto em {formatPortalDateTime(mainCase.created_at)}
                  </span>
                </div>
              </div>

              <div className="support-panel">
                <div className="support-row">
                  <span className="support-label">E-mail de login</span>
                  <strong>{profile.email}</strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Status do cadastro</span>
                  <strong>
                    {
                      clientStatusLabels[
                        workspace.clientRecord.status as keyof typeof clientStatusLabels
                      ]
                    }
                  </strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Situacao atual</span>
                  <strong>{getStatusSummary(workspace.clientRecord.status)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Seu caso aparecera aqui assim que a equipe concluir o cadastro interno.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Avisos importantes"
          description="Este espaco destaca o que merece sua atencao agora, sem voce precisar procurar em varias telas."
        >
          {importantNotices.length ? (
            <div className="notice-grid">
              {importantNotices.slice(0, 4).map((notice) => (
                <Link key={`${notice.title}-${notice.href}`} href={notice.href} className="notice-card">
                  <strong>{notice.title}</strong>
                  <p>{notice.body}</p>
                  <span>{notice.cta}</span>
                </Link>
              ))}
            </div>
          ) : showOnboardingGuide ? (
            <div className="support-panel">
              <div className="support-row">
                <span className="support-label">Primeiros sinais</span>
                <strong>Seu portal foi aberto com sucesso e vai ficar mais completo conforme o caso avancar.</strong>
              </div>
              <div className="support-row">
                <span className="support-label">O que entra aqui</span>
                <strong>Status do caso, documentos, agenda e atualizacoes liberadas pela equipe.</strong>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Quando houver proxima etapa, documento pendente ou nova atualizacao, o aviso aparece aqui.
            </p>
          )}
        </SectionCard>
      </div>

      {showOnboardingGuide ? (
        <SectionCard
          title="Como acompanhar daqui pra frente"
          description="Mesmo quando o caso ainda esta no inicio, voce ja consegue entender como o portal vai organizar o atendimento."
        >
          <div className="journey-grid">
            <div className="journey-step">
              <span>1</span>
              <strong>Status do caso</strong>
              <p>Mostra a fase atual do atendimento com linguagem mais clara e menos tecnica.</p>
            </div>
            <div className="journey-step">
              <span>2</span>
              <strong>Documentos e pendencias</strong>
              <p>Concentra arquivos liberados e pedidos documentais em um so lugar.</p>
            </div>
            <div className="journey-step">
              <span>3</span>
              <strong>Agenda e datas</strong>
              <p>Reune compromissos, prazos e retornos futuros em uma leitura mais simples.</p>
            </div>
            <div className="journey-step">
              <span>4</span>
              <strong>Historico de atualizacoes</strong>
              <p>Registra os andamentos liberados pela equipe conforme o caso avancar.</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid two">
        <SectionCard
          id="proximas-datas"
          title="Proximas datas e compromissos"
          description="Compromissos futuros e proximos passos visiveis ao cliente, em ordem da data mais proxima para a mais distante."
        >
          {upcomingAppointments.length ? (
            <ul className="update-feed">
              {upcomingAppointments.map((appointment) => (
                <li key={appointment.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{appointment.title}</strong>
                      <span className="item-meta">{appointment.caseTitle}</span>
                    </div>
                    <span className="tag soft">{appointment.typeLabel}</span>
                  </div>
                  <p className="update-body">
                    {appointment.description || "Compromisso registrado pela equipe para o seu caso."}
                  </p>
                  <div className="pill-row">
                    <span className="pill success">{appointment.statusLabel}</span>
                    <span className="pill muted">
                      {formatPortalDateTime(appointment.starts_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Quando houver uma nova data importante no seu caso, ela aparecera aqui.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Documentos e pendencias"
          description="Uma leitura simples do que ja foi liberado, do que ainda esta pendente e do que a equipe solicitou."
        >
          <div className="summary-grid">
            <Link href="/documentos" className="summary-card">
              <span>Documentos disponiveis</span>
              <strong>{availableDocuments.length}</strong>
              <p>Arquivos ja liberados para consulta e download no seu portal.</p>
            </Link>
            <Link href="/documentos" className="summary-card">
              <span>Documentos pendentes</span>
              <strong>{pendingDocuments.length}</strong>
              <p>Itens que ainda dependem de envio, revisao ou retorno.</p>
            </Link>
            <Link href="/documentos#solicitacoes-abertas" className="summary-card">
              <span>Solicitacoes abertas</span>
              <strong>{openRequests.length}</strong>
              <p>Pedidos documentais em aberto, com orientacoes da equipe.</p>
            </Link>
          </div>

          {openRequests.length || pendingDocuments.length ? (
            <ul className="list">
              {openRequests.slice(0, 2).map((request) => (
                <li key={request.id}>
                  <div className="item-head">
                    <strong>{request.title}</strong>
                    <span className="tag soft">{request.statusLabel}</span>
                  </div>
                  <span className="item-meta">
                    {request.due_at
                      ? `Prazo ${formatPortalDateTime(request.due_at)}`
                      : "Sem prazo definido"}
                  </span>
                </li>
              ))}
              {pendingDocuments.slice(0, 2).map((document) => (
                <li key={document.id}>
                  <div className="item-head">
                    <strong>{document.file_name}</strong>
                    <span className="tag soft">{document.statusLabel}</span>
                  </div>
                  <span className="item-meta">{document.caseTitle}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Neste momento nao ha pendencias documentais visiveis no seu acompanhamento.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        id="historico-atualizacoes"
        title="Historico de atualizacoes"
        description="As ultimas movimentacoes liberadas pela equipe aparecem em ordem da mais recente para a mais antiga."
      >
        {workspace.events.length ? (
          <ul className="update-feed">
            {workspace.events.map((event) => (
              <li key={event.id} className="update-card featured">
                <div className="update-head">
                  <div>
                    <strong>{event.title}</strong>
                    <span className="item-meta">{event.caseTitle}</span>
                  </div>
                  <span className="tag soft">{event.eventLabel}</span>
                </div>
                <p className="update-body">
                  {event.public_summary || "Nova atualizacao registrada no seu portal."}
                </p>
                <div className="pill-row">
                  <span className="pill success">Atualizacao liberada</span>
                  <span className="pill muted">{formatPortalDateTime(event.occurred_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            Assim que a equipe registrar novas atualizacoes visiveis, elas aparecerao aqui.
          </p>
        )}
      </SectionCard>
      </AppFrame>
    </>
  );
}
