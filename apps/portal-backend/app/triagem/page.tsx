import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TriageForm } from "@/components/triage-form";

export const metadata: Metadata = {
  title: "Triagem inicial do atendimento",
  description:
    "Envie sua triagem inicial com clareza. A equipe recebe o contexto do caso de forma organizada para conduzir o proximo passo do atendimento.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/triagem"
  },
  openGraph: {
    title: "Triagem inicial | Noemia Paixao Advocacia",
    description:
      "Uma triagem guiada, clara e profissional para organizar o atendimento juridico desde o primeiro contato."
  },
  twitter: {
    title: "Triagem inicial | Noemia Paixao Advocacia",
    description:
      "Uma triagem guiada, clara e profissional para organizar o atendimento juridico desde o primeiro contato."
  }
};

export default function TriagePage() {
  return (
    <>
      <ProductEventBeacon
        eventKey="site_visit_started"
        eventGroup="traffic"
        payload={{ entryPoint: "triagem" }}
        oncePerSession
      />
      <AppFrame
        eyebrow="Triagem inicial"
        title="Uma triagem guiada para iniciar o atendimento com mais clareza e menos atrito."
        description="Voce responde em etapas curtas, a equipe recebe o contexto organizado e o proximo passo fica mais claro desde o inicio."
        navigation={[
          { href: "/", label: "Inicio" },
          { href: "/triagem", label: "Triagem", active: true },
          { href: "/noemia", label: "Noemia" },
          { href: "/auth/login", label: "Area do cliente" }
        ]}
        highlights={[
          { label: "Tempo medio", value: "Poucos minutos" },
          { label: "Retorno", value: "Com contexto organizado" },
          { label: "Fluxo", value: "Site + portal integrados" },
          { label: "Seguranca", value: "Dados persistidos" }
        ]}
        actions={[
          {
            href: "/noemia",
            label: "Tirar uma duvida antes de enviar",
            tone: "secondary",
            trackingEventKey: "cta_noemia_clicked",
            trackingEventGroup: "ai",
            trackingPayload: { location: "triagem_header" }
          },
          { href: "/auth/login", label: "Ja recebi convite", tone: "secondary" }
        ]}
      >
        <div className="split">
        <SectionCard
          title="Preencha sua triagem"
          description="Cada etapa existe para ajudar a equipe a entender seu momento com mais rapidez e conduzir o atendimento com mais criterio."
        >
          <TriageForm />
        </SectionCard>

        <div className="stack">
          <SectionCard
            title="O que acontece depois do envio"
            description="Nao e um formulario que some no sistema. Ele entra no painel interno do escritorio para acompanhamento real."
          >
            <ul className="timeline">
              <li>1. A triagem chega ao painel da equipe com status inicial e contexto do caso.</li>
              <li>2. O retorno passa a ser organizado a partir das informacoes que voce enviou.</li>
              <li>3. Se o atendimento seguir, o cadastro interno e o convite do portal sao preparados.</li>
              <li>4. No portal, voce acompanha documentos, agenda, status e atualizacoes do caso.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Como preencher melhor"
            description="Uma boa triagem deixa o primeiro retorno mais objetivo."
          >
            <ul className="priority-list">
              <li>Use a area principal que mais se aproxima do seu caso hoje.</li>
              <li>Conte o que aconteceu, qual resposta voce recebeu e o que precisa resolver.</li>
              <li>Se houver urgencia, prazo ou audiencia, sinalize isso na etapa do seu momento atual.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Compromisso de clareza"
            description="A proposta aqui e transmitir seriedade sem excesso de burocracia."
          >
            <div className="support-panel">
              <div className="support-row">
                <span className="support-label">Comunicacao</span>
                <strong>Instrucoes objetivas e proximos passos claros.</strong>
              </div>
              <div className="support-row">
                <span className="support-label">Organizacao</span>
                <strong>Triagem, cadastro, convite e portal no mesmo fluxo.</strong>
              </div>
              <div className="support-row">
                <span className="support-label">Seguranca</span>
                <strong>Dados recebidos em base persistida, com acesso controlado.</strong>
              </div>
            </div>
          </SectionCard>
        </div>
        </div>
      </AppFrame>
    </>
  );
}
