import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { isStaffRole, requireProfile } from "@/lib/auth/guards";
import { getClientWorkspace, getStaffOverview } from "@/lib/services/dashboard";

export default async function DocumentsPage() {
  const profile = await requireProfile(["cliente", "advogada", "admin"]);

  if (isStaffRole(profile.role)) {
    const overview = await getStaffOverview();

    return (
      <AppFrame
        eyebrow="Documentos"
        title="Visão interna de documentos e solicitações."
        description="A área está pronta para receber upload real, versionamento e automações futuras de notificação."
      >
        <SectionCard
          title="Sinais operacionais"
          description="Enquanto o módulo completo não entra, a equipe já acompanha eventos e fila de comunicação a partir da mesma base."
        >
          <ul className="list">
            <li>{overview.latestCases.length} casos recentes associados a documentos futuros.</li>
            <li>{overview.pendingNotifications} e-mails aguardando processamento.</li>
            <li>Os próximos passos naturais são storage, assinatura e versionamento.</li>
          </ul>
        </SectionCard>
      </AppFrame>
    );
  }

  const workspace = await getClientWorkspace(profile);

  return (
    <AppFrame
      eyebrow="Documentos"
      title="Arquivos disponíveis para o cliente."
      description="Os documentos vinculados ao caso ficam concentrados nesta área."
    >
      <SectionCard
        title="Documentos do portal"
        description="Somente documentos liberados ao cliente aparecem aqui."
      >
        {workspace.documents.length ? (
          <ul className="list">
            {workspace.documents.map((document) => (
              <li key={document.id}>
                <div className="item-head">
                  <strong>{document.file_name}</strong>
                  <span className="tag soft">{document.category}</span>
                </div>
                <span className="item-meta">{document.visibility}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Nenhum documento foi liberado ao cliente até o momento.</p>
        )}
      </SectionCard>
    </AppFrame>
  );
}

