import { FormSubmitButton } from "@/components/form-submit-button";
import { logoutAction } from "../lib/auth/actions";
import type { PortalRole } from "../lib/domain/portal";

const roleLabels: Record<PortalRole, string> = {
  admin: "Administração interna",
  advogada: "Área interna",
  cliente: "Portal do cliente"
};

type PortalSessionBannerProps = {
  role: PortalRole;
  fullName: string;
  email: string;
  workspaceLabel?: string;
  workspaceHint?: string;
};

export function PortalSessionBanner({
  role,
  fullName,
  email,
  workspaceLabel,
  workspaceHint
}: PortalSessionBannerProps) {
  const label = workspaceLabel || roleLabels[role];
  const hint =
    workspaceHint ||
    (role === "cliente"
      ? "Sessão autenticada para acompanhar o próprio atendimento."
      : "Sessão protegida para operação interna do escritório.");

  return (
    <div className="session-strip">
      <div className="session-copy">
        <span className="session-label">{label}</span>
        <strong>{fullName}</strong>
        <span className="session-meta">
          {email} - {hint}
        </span>
      </div>
      <form action={logoutAction} className="session-action">
        <FormSubmitButton tone="secondary" pendingLabel="Saindo do portal...">
          Encerrar sessão
        </FormSubmitButton>
      </form>
    </div>
  );
}
