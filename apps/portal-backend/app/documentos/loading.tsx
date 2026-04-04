import { PortalLoadingPage } from "@/components/portal-loading";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Documentos"
      title="Carregando documentos e pendencias."
      description="Estamos reunindo uploads, solicitacoes abertas e arquivos disponiveis no portal."
      navigation={[
        { href: "/documentos", label: "Documentos", active: true },
        { href: "/agenda", label: "Agenda" }
      ]}
    />
  );
}
