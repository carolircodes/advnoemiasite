import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";

import AcquisitionDashboard from "./dashboard";

export default async function AcquisitionPage() {
  const profile = await requireProfile(["advogada", "admin"]);

  return (
    <AppFrame
      eyebrow="Acquisition"
      title="Leitura de captacao alinhada ao fluxo oficial do escritorio."
      description="Esta area continua valiosa para entender origem, tema e performance da captacao, mas agora fica claramente posicionada como apoio estrategico da operacao, e nao como dashboard paralelo."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Leitura de captacao"
          workspaceHint="Sessao interna ativa para entender origem de leads e conectar essa leitura aos hubs oficiais."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/operacional", label: "Operacional" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: "/internal/advogada/acquisition", label: "Acquisition", active: true }
      ]}
      highlights={[
        { label: "Papel", value: "Leitura de origem" },
        { label: "Entrada", value: "Lead e triagem" },
        { label: "Destino", value: "Cliente e caso" },
        { label: "Uso ideal", value: "Decisao de captacao" }
      ]}
      actions={[
        { href: "/internal/advogada/inteligencia", label: "Abrir inteligencia", tone: "secondary" },
        { href: "/internal/advogada/operacional", label: "Abrir operacional", tone: "secondary" },
        { href: "/internal/advogada#triagens-recebidas", label: "Ver triagens", tone: "secondary" }
      ]}
    >
      <SectionCard
        title="Como esta leitura entra no fluxo oficial"
        description="Acquisition deixa de competir com a operacao e passa a servir como leitura de origem para priorizar tema, canal e contexto que chegam ao time."
      >
        <div className="grid three">
          <Link className="route-card" href="/internal/advogada#triagens-recebidas">
            <span className="shortcut-kicker">Entrada</span>
            <strong>Triagens recebidas</strong>
            <span>Use a leitura de captacao para entender que tipo de demanda esta entrando antes de revisar a fila operacional.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/operacional">
            <span className="shortcut-kicker">Operacao humana</span>
            <strong>Painel operacional</strong>
            <span>Quando o lead pede follow-up, consulta ou contato humano, a continuidade oficial segue no hub operacional.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/inteligencia">
            <span className="shortcut-kicker">Sintese executiva</span>
            <strong>Inteligencia do produto</strong>
            <span>Para leitura mais consolidada do funil e das automacoes, use o hub de inteligencia como camada executiva.</span>
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Painel analitico de apoio"
        description="Os dados abaixo continuam disponiveis para leitura detalhada de campanha, conteudo e origem, mas agora dentro de um enquadramento oficial do escritorio."
      >
        <AcquisitionDashboard />
      </SectionCard>
    </AppFrame>
  );
}
