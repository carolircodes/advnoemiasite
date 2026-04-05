import { PortalLoadingPage } from "../../components/portal-loading";
import { CLIENT_LOGIN_PATH } from "../../lib/auth/access-control";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Noemia"
      title="Carregando a assistente do portal."
      description="Estamos preparando o contexto correto para orientar a jornada do atendimento."
      navigation={[
        { href: "/", label: "Inicio" },
        { href: "/triagem", label: "Triagem" },
        { href: "/noemia", label: "Noemia", active: true },
        { href: CLIENT_LOGIN_PATH, label: "Area do cliente" }
      ]}
    />
  );
}
