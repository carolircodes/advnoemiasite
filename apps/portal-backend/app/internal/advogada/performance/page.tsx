import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";

import PerformanceDashboard from "./dashboard";

export default async function PerformancePage() {
  const profile = await requireProfile(["advogada", "admin"]);
  const intelligence = await getBusinessIntelligenceOverview(30);
  const strongestSource = intelligence.acquisition.bySource[0] || null;
  const weakestSource =
    intelligence.acquisition.bySource
      .filter((item) => item.visits >= 3)
      .sort((left, right) => left.visitToSubmitRate - right.visitToSubmitRate)[0] || null;
  const strongestTheme = intelligence.acquisition.byTopic[0] || null;

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
        { label: "Melhor origem", value: strongestSource?.label || "Sem base suficiente" },
        { label: "Abandono de triagem", value: `${intelligence.summary.triageAbandonmentRate}%` },
        { label: "Ativacao no portal", value: `${intelligence.summary.portalActivationRate}%` },
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

      <div className="grid two">
        <SectionCard
          title="Perguntas de crescimento que este painel responde"
          description="Performance so vira camada de decisao quando ajuda a responder o que escalar, o que corrigir e onde o funil perde forca."
        >
          <div className="summary-grid compact">
            <div className="summary-card">
              <span>De onde vem a melhor tracao</span>
              <strong>{strongestSource?.label || "Sem base suficiente"}</strong>
              <p>
                {strongestSource
                  ? `${strongestSource.triageSubmitted} triagem(ns) e ${strongestSource.clientsCreated} cliente(s) no periodo.`
                  : "Assim que houver volume suficiente, a melhor origem aparece aqui."}
              </p>
              <span className="item-meta">
                {strongestSource ? `${strongestSource.triageToClientRate}% triagem para cliente` : "Aguardando base"}
              </span>
            </div>
            <div className="summary-card">
              <span>Onde o funil perde forca</span>
              <strong>{weakestSource?.label || "Sem ruptura dominante"}</strong>
              <p>
                {weakestSource
                  ? `${weakestSource.visitToSubmitRate}% visita para triagem nesta origem.`
                  : "Quando uma origem com volume perder forca, ela sobe aqui para revisao."}
              </p>
              <span className="item-meta">
                {weakestSource ? "Pede revisao de CTA, promessa e friccao." : "Fluxo sem alerta dominante"}
              </span>
            </div>
            <div className="summary-card">
              <span>Qual tema avanca melhor</span>
              <strong>{strongestTheme?.label || "Sem tema dominante"}</strong>
              <p>
                {strongestTheme
                  ? `${strongestTheme.clientsCreated} cliente(s) ja vieram desse tema no periodo.`
                  : "Os temas mais fortes aparecem aqui quando a cadeia origem para cliente ganha volume."}
              </p>
              <span className="item-meta">
                {strongestTheme ? `${strongestTheme.triageToClientRate}% triagem para cliente` : "Aguardando base"}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Automacao que ajuda a escalar"
          description="Crescimento sustentavel depende de menos trabalho manual cego e mais trilhas automaticas que empurram o funil com seguranca."
        >
          <div className="summary-grid compact">
            <div className="summary-card">
              <span>Fila automatica</span>
              <strong>{intelligence.automation.pendingQueue}</strong>
              <p>Itens pendentes ou com falha que ainda dependem de execucao na fila automatica.</p>
            </div>
            <div className="summary-card">
              <span>Alertas de triagem</span>
              <strong>{intelligence.automation.triageAlerts}</strong>
              <p>Disparos automaticos que colocam triagens novas ou urgentes no radar do time.</p>
            </div>
            <div className="summary-card">
              <span>Lembretes ativos</span>
              <strong>{intelligence.automation.inviteReminders + intelligence.automation.documentReminders + intelligence.automation.appointmentReminders}</strong>
              <p>Convites, documentos e compromissos ja entram em trilhas automaticas para reduzir esquecimento manual.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Decisoes que o funil pede agora"
        description="Em vez de mostrar so numero, este bloco destaca onde o escritorio deve agir para melhorar conversao, ativacao e qualidade do crescimento."
      >
        {intelligence.suggestions.length ? (
          <div className="notice-grid">
            {intelligence.suggestions.map((item) => (
              <Link key={item.title} href={item.href} className="notice-card">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <span>Abrir area relacionada</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            Nenhuma decisao critica se destacou agora. O painel volta a sugerir mudanca assim que uma origem, tema ou etapa do funil sair da faixa esperada.
          </p>
        )}
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
