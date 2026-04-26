import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";

import AcquisitionDashboard from "./dashboard.tsx";

export default async function AcquisitionPage() {
  const profile = await requireProfile(["advogada", "admin"]);
  const intelligence = await getBusinessIntelligenceOverview(30);
  const topSource = intelligence.acquisition.bySource[0] || null;
  const topCampaign = intelligence.acquisition.byCampaign[0] || null;
  const topTopic = intelligence.acquisition.byTopic[0] || null;
  const strongestContent = intelligence.acquisition.byContent[0] || null;
  const weakestTopic =
    intelligence.acquisition.byTopic
      .filter((item) => item.visits >= 3)
      .sort((left, right) => left.triageToClientRate - right.triageToClientRate)[0] || null;

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
        { label: "Melhor origem", value: topSource?.label || "Sem base suficiente" },
        { label: "Triagem para cliente", value: `${intelligence.summary.triageToClientRate}%` },
        { label: "Fila automatica", value: String(intelligence.automation.pendingQueue) },
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

      <div className="grid two">
        <SectionCard
          title="Motores de origem mais fortes"
          description="Os cards abaixo mostram onde a captacao ja esta virando triagem e cliente com mais consistencia."
        >
          <div className="summary-grid compact">
            <div className="summary-card">
              <span>Origem mais forte</span>
              <strong>{topSource?.label || "Sem base suficiente"}</strong>
              <p>
                {topSource
                  ? `${topSource.triageSubmitted} triagem(ns) e ${topSource.clientsCreated} cliente(s) no periodo.`
                  : "Assim que houver volume rastreado suficiente, a melhor origem aparece aqui."}
              </p>
              <span className="item-meta">
                {topSource
                  ? `${topSource.visitToSubmitRate}% visita para triagem | ${topSource.triageToClientRate}% triagem para cliente`
                  : "Aguardando historico"}
              </span>
            </div>
            <div className="summary-card">
              <span>Campanha mais produtiva</span>
              <strong>{topCampaign?.label || "Sem campanha destacada"}</strong>
              <p>
                {topCampaign
                  ? `${topCampaign.triageSubmitted} triagem(ns) e ${topCampaign.clientsCreated} cliente(s) vinculados.`
                  : "Quando o tracking de campanha ganhar volume, a melhor leitura aparece aqui."}
              </p>
              <span className="item-meta">
                {topCampaign ? `${topCampaign.triageToClientRate}% avancaram para cliente` : "Aguardando base"}
              </span>
            </div>
            <div className="summary-card">
              <span>Tema com mais potencial</span>
              <strong>{topTopic?.label || "Sem tema dominante"}</strong>
              <p>
                {topTopic
                  ? `${topTopic.triageSubmitted} triagem(ns) para este tema no periodo.`
                  : "Os temas passam a aparecer aqui conforme origem e triagem se consolidam."}
              </p>
              <span className="item-meta">
                {topTopic ? `${topTopic.clientsCreated} cliente(s) vieram desse tema` : "Aguardando base"}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Leituras que pedem acao"
          description="Quando a captacao gera sinal forte, o sistema deve sugerir o proximo movimento em vez de deixar a equipe apenas observando."
        >
          {intelligence.suggestions.length ? (
            <div className="notice-grid">
              {intelligence.suggestions.slice(0, 4).map((item) => (
                <Link key={item.title} href={item.href} className="notice-card">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <span>Abrir area relacionada</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Nenhuma leitura critica se destacou agora. A camada de acquisition volta a sugerir o proximo movimento quando a origem perder forca ou ganhar tracao relevante.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Origem, triagem e cliente"
        description="Esta leitura transforma acquisition em motor real: mostra quais origens atraem, quais geram triagem e quais realmente ajudam a abrir cliente."
      >
        {intelligence.acquisition.bySource.length ? (
          <ul className="update-feed">
            {intelligence.acquisition.bySource.map((item) => (
              <li key={item.key} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{item.label}</strong>
                    <span className="item-meta">
                      {item.visits} visita(s) rastreadas, {item.ctas} clique(s) no CTA
                    </span>
                  </div>
                  <span className="tag soft">{item.clientsCreated} cliente(s)</span>
                </div>
                <div className="pill-row">
                  <span className="pill muted">{item.triageStarted} triagem(ns) iniciadas</span>
                  <span className="pill warning">{item.triageSubmitted} triagem(ns) enviadas</span>
                  <span className="pill success">{item.triageToClientRate}% triagem para cliente</span>
                </div>
                <p className="update-body">
                  {item.visitToSubmitRate}% das visitas dessa origem avancaram ate triagem enviada. Isso ajuda a decidir onde insistir, onde corrigir e onde escalar.
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            Ainda nao ha volume rastreado suficiente por origem para compor esta leitura ponta a ponta.
          </p>
        )}
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Temas que merecem insistencia ou correcao"
          description="Aqui a equipe separa tema que avanca bem de tema que gera atencao, mas perde forca antes de virar cliente."
        >
          {intelligence.acquisition.byTopic.length ? (
            <ul className="update-feed">
              {intelligence.acquisition.byTopic.slice(0, 4).map((item) => (
                <li key={item.key} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{item.label}</strong>
                      <span className="item-meta">
                        {item.visits} visita(s) | {item.triageSubmitted} triagem(ns) enviadas
                      </span>
                    </div>
                    <span className="tag soft">{item.clientsCreated} cliente(s)</span>
                  </div>
                  <p className="update-body">
                    {item.key === weakestTopic?.key
                      ? "Tema com procura inicial, mas fechamento mais fraco. Vale revisar promessa, qualificador e passagem para humano."
                      : "Tema com sinal saudavel para insistir quando o escritorio precisar puxar captacao mais qualificada."}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Ainda nao ha base suficiente por tema para orientar insistencia ou correcao.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Conteudos com melhor progressao"
          description="A comparacao abaixo ajuda a decidir quais conteudos merecem continuar, ganhar distribuicao ou mudar abordagem."
        >
          {intelligence.acquisition.byContent.length ? (
            <div className="summary-grid compact">
              <div className="summary-card">
                <span>Conteudo mais promissor</span>
                <strong>{strongestContent?.label || "Sem conteudo dominante"}</strong>
                <p>
                  {strongestContent
                    ? `${strongestContent.triageSubmitted} triagem(ns) e ${strongestContent.clientsCreated} cliente(s) no periodo.`
                    : "A leitura por conteudo aparece aqui conforme o tracking amadurece."}
                </p>
              </div>
              {intelligence.acquisition.byContent.slice(1, 4).map((item) => (
                <div key={item.key} className="summary-card">
                  <span>{item.label}</span>
                  <strong>{item.visitToSubmitRate}%</strong>
                  <p>
                    {item.clientsCreated > 0
                      ? `${item.clientsCreated} cliente(s) vieram deste conteudo.`
                      : "Chama atencao, mas ainda pede melhor progressao no funil."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Ainda nao ha comparacao confiavel entre conteudos nesta janela.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Painel analitico de apoio"
        description="Os dados abaixo continuam disponiveis para leitura detalhada de campanha, conteudo e origem, mas agora dentro de um enquadramento oficial do escritorio."
      >
        <AcquisitionDashboard />
      </SectionCard>
    </AppFrame>
  );
}
