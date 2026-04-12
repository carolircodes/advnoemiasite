import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";

import PerformanceDashboard from "./dashboard";

export default async function PerformancePage() {
  const profile = await requireProfile(["advogada", "admin"]);

  return (
    <AppFrame
      eyebrow="Performance"
      title="Performance e decisao de crescimento, sem competir com a operacao principal."
      description="Esta rota continua util para comparar testes, conteudos e recomendacoes, mas agora fica enquadrada como apoio estrategico da captacao e do crescimento, conectada aos hubs oficiais do escritorio."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Performance interna"
          workspaceHint="Sessao interna ativa para interpretar performance, testes e recomendacoes sem sair do ecossistema oficial."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: "/internal/advogada/acquisition", label: "Acquisition" },
        { href: "/internal/advogada/performance", label: "Performance", active: true }
      ]}
      highlights={[
        { label: "Papel", value: "Leitura estrategica" },
        { label: "Base", value: "Captacao e conversao" },
        { label: "Destino", value: "Decisao de crescimento" },
        { label: "Uso ideal", value: "Priorizar melhorias" }
      ]}
      actions={[
        { href: "/internal/advogada/inteligencia", label: "Abrir inteligencia", tone: "secondary" },
        { href: "/internal/advogada/acquisition", label: "Abrir acquisition", tone: "secondary" },
        { href: "/internal/advogada/operacional", label: "Abrir operacional", tone: "secondary" }
      ]}
    >
      <SectionCard
        title="Como performance conversa com o fluxo oficial"
        description="Performance deixa de ser uma ilha de metricas e passa a funcionar como leitura de decisao para captacao, triagem e operacao comercial."
      >
        <div className="grid three">
          <Link className="route-card" href="/internal/advogada/acquisition">
            <span className="shortcut-kicker">Origem</span>
            <strong>Voltar para acquisition</strong>
            <span>Revise canal, tema e conteudo quando precisar entender de onde veio a variacao de performance.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/inteligencia">
            <span className="shortcut-kicker">Sintese</span>
            <strong>Abrir inteligencia do produto</strong>
            <span>Use a camada executiva para conectar desempenho, funil, automacoes e uso do portal em uma leitura unica.</span>
          </Link>
          <Link className="route-card" href="/internal/advogada/operacional">
            <span className="shortcut-kicker">Impacto humano</span>
            <strong>Ver efeito na operacao</strong>
            <span>Quando a leitura pedir follow-up, ajuste de prioridade ou resposta humana, a continuidade oficial segue no operacional.</span>
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Painel analitico de apoio"
        description="Os indicadores abaixo seguem disponiveis para comparar testes, insights e recomendacoes, mas agora enquadrados como apoio ao crescimento futuro."
      >
        <PerformanceDashboard />
      </SectionCard>
    </AppFrame>
  );
}
