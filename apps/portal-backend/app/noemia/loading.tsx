import { PortalLoadingPage } from "@/components/portal-loading";

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
        { href: "/auth/login", label: "Area do cliente" }
      ]}
    />
  );
}
