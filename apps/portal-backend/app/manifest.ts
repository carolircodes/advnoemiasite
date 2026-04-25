import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Juridico Noemia Paixao Advocacia",
    short_name: "Portal Noemia",
    description:
      "Portal seguro para acompanhar atendimento juridico, documentos, agenda, pagamentos e a continuidade do caso.",
    start_url: "/cliente",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ee",
    theme_color: "#f7f4ee",
    lang: "pt-BR",
    categories: ["business", "productivity", "finance"],
    shortcuts: [
      {
        name: "Meu painel",
        short_name: "Painel",
        description: "Abrir a area do cliente com prioridade no acompanhamento atual.",
        url: "/cliente"
      },
      {
        name: "Agenda",
        short_name: "Agenda",
        description: "Consultar compromissos e proximos passos do caso.",
        url: "/agenda"
      },
      {
        name: "Documentos",
        short_name: "Documentos",
        description: "Acompanhar documentos, pendencias e envios do caso.",
        url: "/documentos"
      }
    ]
  };
}
