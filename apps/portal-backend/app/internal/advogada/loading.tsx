import { PortalLoadingPage } from "@/components/portal-loading";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Painel da advogada"
      title="Carregando a operacao do escritorio."
      description="Estamos organizando clientes, casos, compromissos, documentos e notificacoes do portal."
      navigation={[
        { href: "/internal/advogada", label: "Painel", active: true },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" }
      ]}
    />
  );
}
