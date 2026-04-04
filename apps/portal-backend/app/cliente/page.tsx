import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
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
  const nextAppointment = workspace.appointments[0];

  return (
    <AppFrame
      eyebrow="Area do cliente"
      title={`Bem-vindo, ${profile.full_name}.`}
      description="Este painel mostra o acompanhamento real do seu caso com base persistida, atualizacoes ordenadas e preparo para notificacoes por e-mail."
      actions={[
        { href: "/documentos", label: "Meus documentos", tone: "secondary" },
        { href: "/agenda", label: "Minha agenda", tone: "secondary" }
      ]}
    >
      {error ? <div className="error-notice">{error}</div> : null}
      {success ? (
        <div className="success-notice">
          Acesso atualizado com sucesso. Seu portal ja esta pronto para receber novas atualizacoes de caso.
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span>Casos vinculados</span>
          <strong>{workspace.cases.length}</strong>
        </div>
        <div className="metric-card">
          <span>Documentos</span>
          <strong>{workspace.documents.length}</strong>
        </div>
        <div className="metric-card">
          <span>Atualizacoes visiveis</span>
          <strong>{workspace.events.length}</strong>
        </div>
        <div className="metric-card">
          <span>Proximo compromisso</span>
          <strong>
            {nextAppointment ? formatPortalDateTime(nextAppointment.starts_at) : "Sem agenda"}
          </strong>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Seus casos"
          description="A equipe registra atualizacoes reais no mesmo caso que aparece aqui no portal."
        >
          {workspace.cases.length ? (
            <ul className="update-feed compact">
              {workspace.cases.map((caseItem) => (
                <li key={caseItem.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{caseItem.title}</strong>
                      <span className="item-meta">
                        {caseAreaLabels[caseItem.area as keyof typeof caseAreaLabels]}
                      </span>
                    </div>
                    <span className="tag soft">{caseItem.statusLabel}</span>
                  </div>
                  <span className="item-meta">
                    Aberto em {formatPortalDateTime(caseItem.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Seu caso aparecera aqui assim que a equipe concluir o cadastro interno.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Acesso e suporte"
          description="Seu e-mail continua sendo o identificador principal do portal."
        >
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
          <div className="form-actions">
            <Link className="button" href="/auth/esqueci-senha">
              Recuperar senha
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Historico de atualizacoes"
        description="Somente as atualizacoes liberadas pela equipe para acompanhamento do cliente aparecem aqui, da mais recente para a mais antiga."
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
                  <span className="pill success">Visivel no portal</span>
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
  );
}
