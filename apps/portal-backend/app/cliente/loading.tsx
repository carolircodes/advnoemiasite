import { PortalLoadingPage } from "@/components/portal-loading";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Area do cliente"
      title="Carregando seu acompanhamento."
      description="Estamos reunindo status, documentos, datas importantes e atualizacoes do seu caso."
      navigation={[
        { href: "/cliente", label: "Meu painel", active: true },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" }
      ]}
    />
  );
}
