import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { isStaffRole, requireProfile } from "@/lib/auth/guards";
import { getClientWorkspace, getStaffOverview } from "@/lib/services/dashboard";

export default async function AgendaPage() {
  const profile = await requireProfile(["cliente", "advogada", "admin"]);

  if (isStaffRole(profile.role)) {
    const overview = await getStaffOverview();

    return (
      <AppFrame
        eyebrow="Agenda"
        title="Agenda e compromissos futuros do portal."
        description="A estrutura já está pronta para registrar agendamentos e gerar notificações por e-mail em próximas etapas."
      >
        <SectionCard
          title="Camada pronta para evolução"
          description="O backend já distingue eventos de agendamento e pode alimentar notificações assim que o serviço externo for conectado."
        >
          <ul className="list">
            {overview.latestEvents.length ? (
              overview.latestEvents.map((event) => (
                <li key={event.id}>
                  <div className="item-head">
                    <strong>{event.title}</strong>
                    <span className="tag soft">{event.eventLabel}</span>
                  </div>
                  <span className="item-meta">{event.occurred_at}</span>
                </li>
              ))
            ) : (
              <li>Nenhum evento operacional foi registrado ainda.</li>
            )}
          </ul>
        </SectionCard>
      </AppFrame>
    );
  }

  const workspace = await getClientWorkspace(profile);

  return (
    <AppFrame
      eyebrow="Agenda"
      title="Compromissos do cliente"
      description="Quando a equipe registrar novos horários, eles aparecerão aqui e poderão gerar lembretes futuros."
    >
      <SectionCard
        title="Próximos agendamentos"
        description="Compromissos vinculados ao seu atendimento jurídico."
      >
        {workspace.appointments.length ? (
          <ul className="list">
            {workspace.appointments.map((appointment) => (
              <li key={appointment.id}>
                <div className="item-head">
                  <strong>{appointment.mode}</strong>
                  <span className="tag soft">{appointment.status}</span>
                </div>
                <span className="item-meta">{appointment.starts_at}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Ainda não há agendamentos vinculados ao seu caso.</p>
        )}
      </SectionCard>
    </AppFrame>
  );
}
