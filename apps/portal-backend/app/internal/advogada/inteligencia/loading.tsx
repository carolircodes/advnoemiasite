import { PortalLoadingPage } from "@/components/portal-loading";

export default function Loading() {
  return (
    <PortalLoadingPage
      eyebrow="Inteligencia do produto"
      title="Carregando o funil, as automacoes e o uso do portal."
      description="Estamos organizando os dados reais do site, da triagem e do portal para montar a leitura operacional."
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia", active: true },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" }
      ]}
    />
  );
}
