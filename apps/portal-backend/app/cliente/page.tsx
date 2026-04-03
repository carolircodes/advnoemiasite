import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getClientWorkspace } from "@/lib/services/dashboard";

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
  const nextAppointment = workspace.appointments[0];

  return (
    <AppFrame
      eyebrow="Área do cliente"
      title={`Bem-vindo, ${profile.full_name}.`}
      description="Este painel já consome a estrutura real de autenticação e dados do novo portal."
      actions={[
        { href: "/documentos", label: "Meus documentos", tone: "secondary" },
        { href: "/agenda", label: "Minha agenda", tone: "secondary" }
      ]}
    >
      {success ? (
        <div className="success-notice">
          Acesso atualizado com sucesso. O portal já está pronto para próximos envios
          automáticos por e-mail.
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
          <span>Atualizações</span>
          <strong>{workspace.events.length}</strong>
        </div>
        <div className="metric-card">
          <span>Próximo compromisso</span>
          <strong>{nextAppointment ? "Agendado" : "Sem agenda"}</strong>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Andamento do caso"
          description="As atualizações futuras registradas pela equipe podem gerar notificações automáticas por e-mail."
        >
          {workspace.cases.length ? (
            <ul className="list">
              {workspace.cases.map((caseItem) => (
                <li key={caseItem.id}>
                  <div className="item-head">
                    <strong>{caseItem.title}</strong>
                    <span className="tag soft">{caseItem.status}</span>
                  </div>
                  <span className="item-meta">{caseItem.area}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Seu caso será exibido aqui assim que a equipe concluir o cadastro interno.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Acesso e suporte"
          description="O e-mail continua sendo o identificador principal do portal."
        >
          <ul className="timeline">
            <li>E-mail de login: {profile.email}</li>
            <li>Status do cadastro: {workspace.clientRecord.status}</li>
            <li>Observações internas liberadas para acompanhamento futuro.</li>
          </ul>
          <div className="form-actions">
            <Link className="button" href="/auth/esqueci-senha">
              Recuperar senha
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Últimas atualizações visíveis ao cliente"
        description="Somente os eventos preparados para a área do cliente aparecem aqui."
      >
        {workspace.events.length ? (
          <ul className="list">
            {workspace.events.map((event) => (
              <li key={event.id}>
                <div className="item-head">
                  <strong>{event.title}</strong>
                  <span className="tag soft">{event.eventLabel}</span>
                </div>
                <span className="item-meta">
                  {event.public_summary || "Atualização registrada no portal."}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Assim que a equipe registrar novos eventos, eles ficarão visíveis neste painel.</p>
        )}
      </SectionCard>
    </AppFrame>
  );
}
