import { PortalLoadingPage } from "../../components/portal-loading.tsx";
import { CLIENT_LOGIN_PATH } from "../../lib/auth/access-control.ts";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Atendimento"
      title="Preparando o atendimento inteligente do escritorio."
      description="Estamos direcionando voce para a entrada oficial de atendimento na home."
      navigation={[
        { href: "/", label: "Inicio" },
        { href: "/#atendimento", label: "Atendimento", active: true },
        { href: "/#como-funciona", label: "Como funciona" },
        { href: CLIENT_LOGIN_PATH, label: "Area do cliente" }
      ]}
    />
  );
}
