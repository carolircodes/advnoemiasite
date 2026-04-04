import { PortalLoadingPage } from "@/components/portal-loading";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Agenda"
      title="Carregando compromissos e proximos passos."
      description="Estamos reunindo a agenda visivel, o historico recente e as alteracoes do atendimento."
      navigation={[
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda", active: true }
      ]}
    />
  );
}
