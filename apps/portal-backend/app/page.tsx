import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";

export const metadata: Metadata = {
  title: "Atendimento juridico claro e portal do cliente",
  description:
    "Triagem inicial organizada, acompanhamento tecnico e portal seguro para documentos, agenda e atualizacoes do caso.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Noemia Paixao Advocacia | Atendimento juridico com portal do cliente",
    description:
      "Da triagem inicial ao acompanhamento continuo do caso, com comunicacao clara, organizacao e portal seguro."
  },
  twitter: {
    title: "Noemia Paixao Advocacia | Atendimento juridico com portal do cliente",
    description:
      "Da triagem inicial ao acompanhamento continuo do caso, com comunicacao clara, organizacao e portal seguro."
  }
};

const legalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  name: "Noemia Paixao Advocacia",
  description:
    "Atendimento juridico com triagem inicial, organizacao documental e portal do cliente para acompanhamento continuo.",
  areaServed: "Brasil",
  serviceType: [
    "Direito Previdenciario",
    "Direito do Consumidor Bancario",
    "Direito de Familia",
    "Direito Civil"
  ]
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(legalServiceSchema) }}
      />
      <AppFrame
        eyebrow="Atendimento juridico com portal seguro"
        title="Um fluxo juridico claro do primeiro contato ao acompanhamento continuo do caso."
        description="A triagem inicial organiza o seu atendimento com seriedade. Depois, o portal do cliente concentra documentos, agenda, atualizacoes e proximos passos em uma experiencia unica."
        navigation={[
          { href: "/", label: "Inicio", active: true },
          { href: "/triagem", label: "Triagem" },
          { href: "/auth/login", label: "Area do cliente" }
        ]}
        highlights={[
          { label: "Triagem orientada", value: "Em poucos minutos" },
          { label: "Portal seguro", value: "Documentos e agenda" },
          { label: "Atendimento humano", value: "Comunicacao clara" },
          { label: "Operacao organizada", value: "Fluxo ponta a ponta" }
        ]}
        actions={[
          {
            href: "/triagem",
            label: "Iniciar atendimento",
            trackingEventKey: "cta_start_triage_clicked",
            trackingPayload: { location: "home_hero" }
          },
          {
            href: "/auth/login",
            label: "Entrar na area do cliente",
            tone: "secondary",
            trackingEventKey: "cta_client_portal_clicked",
            trackingPayload: { location: "home_hero" }
          }
        ]}
      >
        <div className="metric-grid">
          <div className="metric-card">
            <span>Como comecamos</span>
            <strong>Triagem organizada</strong>
          </div>
          <div className="metric-card">
            <span>Como seguimos</span>
            <strong>Cadastro e convite seguros</strong>
          </div>
          <div className="metric-card">
            <span>Como voce acompanha</span>
            <strong>Portal com historico real</strong>
          </div>
          <div className="metric-card">
            <span>Como conduzimos</span>
            <strong>Clareza, metodo e previsibilidade</strong>
          </div>
        </div>

        <div className="grid two">
          <SectionCard
            title="Por que este fluxo transmite confianca"
            description="O atendimento foi desenhado para reduzir duvidas, evitar desencontro de informacoes e dar visibilidade real ao andamento."
          >
            <div className="summary-grid">
              <div className="summary-card">
                <span>Organizacao</span>
                <strong>Triagem antes do primeiro retorno</strong>
                <p>O caso chega melhor contextualizado para a equipe, sem improviso nem coleta fragmentada.</p>
              </div>
              <div className="summary-card">
                <span>Seguranca</span>
                <strong>Acesso controlado por convite</strong>
                <p>O portal nao depende de cadastro publico solto. A liberacao e feita pela equipe com fluxo protegido.</p>
              </div>
              <div className="summary-card">
                <span>Clareza</span>
                <strong>Atualizacoes, documentos e agenda no mesmo lugar</strong>
                <p>O cliente entende o que mudou, o que falta e qual e o proximo passo sem se perder.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Sinais de autoridade institucional"
            description="A comunicacao foi refinada para demonstrar metodo, condução tecnica e consistencia operacional."
          >
            <ul className="priority-list">
              <li>Atendimento conduzido com triagem inicial, retorno organizado e registro persistido do caso.</li>
              <li>Documentos, compromissos e atualizacoes acompanhados em portal seguro e autenticado.</li>
              <li>Comunicação mais objetiva, com menos ruído e mais visibilidade sobre o andamento real.</li>
              <li>Jornada pensada para reduzir hesitação antes da contratação e atrito depois do onboarding.</li>
            </ul>
          </SectionCard>
        </div>

        <SectionCard
          title="Como funciona"
          description="O site institucional e o portal agora formam uma unica experiencia, do primeiro contato ao acompanhamento continuo."
        >
          <div className="journey-grid">
            <div className="journey-step">
              <span>1</span>
              <strong>Triagem inicial</strong>
              <p>Voce envia o contexto principal do atendimento com orientacao clara e campos objetivos.</p>
            </div>
            <div className="journey-step">
              <span>2</span>
              <strong>Analise interna</strong>
              <p>A equipe recebe a triagem no painel interno e organiza o retorno com mais contexto e menos friccao.</p>
            </div>
            <div className="journey-step">
              <span>3</span>
              <strong>Cadastro e convite</strong>
              <p>Quando o atendimento segue, o cadastro interno, o caso inicial e o convite do portal sao preparados juntos.</p>
            </div>
            <div className="journey-step">
              <span>4</span>
              <strong>Acompanhamento continuo</strong>
              <p>O cliente passa a acompanhar status, documentos, agenda e atualizacoes em um ambiente seguro.</p>
            </div>
          </div>
        </SectionCard>

        <div className="grid two">
          <SectionCard
            title="Perguntas frequentes"
            description="Respostas diretas para reduzir hesitacao antes da triagem."
          >
            <div className="faq-list">
              <div className="faq-item">
                <strong>Preciso ter todos os documentos para iniciar?</strong>
                <p>Nao. A triagem serve justamente para organizar o primeiro entendimento do caso e orientar os proximos passos.</p>
              </div>
              <div className="faq-item">
                <strong>Ja recebo acesso ao portal logo de inicio?</strong>
                <p>O acesso ao portal e liberado pela equipe quando o cadastro interno e o caso inicial sao preparados.</p>
              </div>
              <div className="faq-item">
                <strong>O portal substitui o contato com a equipe?</strong>
                <p>Nao. Ele complementa o atendimento, centralizando agenda, documentos e atualizacoes com mais clareza.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Proxima acao recomendada"
            description="Se voce ainda esta no primeiro contato, a triagem e o melhor ponto de entrada."
          >
            <div className="cta-strip">
              <strong>Comece por uma triagem organizada e objetiva.</strong>
              <p>Ela ajuda a equipe a entender o contexto do caso com mais rapidez e encaminhar o atendimento com mais seguranca.</p>
              <div className="form-actions">
                <TrackedLink
                  href="/triagem"
                  className="button"
                  eventKey="cta_start_triage_clicked"
                  trackingPayload={{ location: "home_footer" }}
                >
                  Iniciar triagem
                </TrackedLink>
                <TrackedLink
                  href="/auth/login"
                  className="button secondary"
                  eventKey="cta_client_portal_clicked"
                  trackingPayload={{ location: "home_footer" }}
                >
                  Ja sou cliente
                </TrackedLink>
              </div>
            </div>
          </SectionCard>
        </div>
      </AppFrame>
    </>
  );
}
