"use client";

import { useEffect, useState } from "react";

import { ProductEventBeacon } from "@/components/product-event-beacon";

type AnalyticsPeriod = "today" | "7days" | "30days";

type AnalyticsResponse = {
  ok: boolean;
  metrics: {
    totalLeads: number;
    qualifiedLeads: number;
    scheduledAppointments: number;
    conversions: number;
    conversionRate: number;
    averageResponseTimeHours: number;
    strategicContentViews: number;
    ctaClicks: number;
    automationFailures: number;
  };
  funnel: Array<{
    stage: string;
    count: number;
    dropRate: number;
  }>;
  sources: Array<{
    source: string;
    leads: number;
    qualified: number;
    conversions: number;
    conversionRate: number;
  }>;
  channels: Array<{
    channel: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }>;
  topics: Array<{
    topic: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }>;
  campaigns: Array<{
    campaign: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }>;
  content: Array<{
    contentId: string;
    views: number;
    ctaClicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  automation: {
    failedDispatches: number;
    failedNotifications: number;
  };
  period: AnalyticsPeriod;
  generatedAt: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function getTone(value: number, high: number, medium: number) {
  if (value >= high) {
    return "success";
  }

  if (value >= medium) {
    return "warning";
  }

  return "critical";
}

export default function InternalAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7days");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/analytics/acquisition?period=${period}`, {
          cache: "no-store"
        });
        const result = (await response.json().catch(() => null)) as AnalyticsResponse | null;

        if (!response.ok || !result?.ok) {
          throw new Error("Nao foi possivel carregar os indicadores agora.");
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar os indicadores agora."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="portal-root">
      <ProductEventBeacon
        eventKey="analytics_page_loaded"
        eventGroup="analytics"
        payload={{ period, surface: "internal_analytics" }}
      />

      <section className="panel">
        <div className="section-head">
          <h2>Analytics de aquisicao</h2>
          <p>
            Leitura operacional do funil real, desempenho editorial, canais de entrada e
            falhas de automacao a partir das tabelas consolidadas do backend.
          </p>
        </div>
        <div className="form-actions">
          <select value={period} onChange={(event) => setPeriod(event.currentTarget.value as AnalyticsPeriod)}>
            <option value="today">Hoje</option>
            <option value="7days">7 dias</option>
            <option value="30days">30 dias</option>
          </select>
          {data ? (
            <span className="tag soft">
              Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}
            </span>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section className="panel skeleton-card">
          <div className="skeleton-stack">
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
            <span className="skeleton-line" />
          </div>
        </section>
      ) : null}

      {error ? <div className="error-notice">{error}</div> : null}

      {data ? (
        <>
          <section className="operational-band">
            <article className="operational-band-card neutral">
              <span>Leads</span>
              <strong>{formatNumber(data.metrics.totalLeads)}</strong>
              <p>Total de triagens e capturas persistidas no periodo.</p>
            </article>
            <article
              className={`operational-band-card ${getTone(
                data.metrics.conversionRate,
                15,
                7
              )}`}
            >
              <span>Conversao</span>
              <strong>{formatPercentage(data.metrics.conversionRate)}</strong>
              <p>Percentual de leads convertidos em relacao ao total recebido.</p>
            </article>
            <article className="operational-band-card warning">
              <span>Conteudo estrategico</span>
              <strong>{formatNumber(data.metrics.strategicContentViews)}</strong>
              <p>Visualizacoes relevantes de artigos em subpasta.</p>
            </article>
            <article
              className={`operational-band-card ${
                data.metrics.automationFailures > 0 ? "critical" : "success"
              }`}
            >
              <span>Falhas de automacao</span>
              <strong>{formatNumber(data.metrics.automationFailures)}</strong>
              <p>Dispatches e notificacoes que exigem leitura operacional.</p>
            </article>
          </section>

          <section className="grid two">
            <article className="panel">
              <div className="section-head">
                <h2>Funil consolidado</h2>
                <p>Da visita relevante ate a conversao real, sem depender das tabelas legadas.</p>
              </div>
              <div className="operations-list">
                {data.funnel.map((stage) => (
                  <div key={stage.stage} className="operation-card low">
                    <div className="operation-head">
                      <strong>{stage.stage}</strong>
                      <span className="operation-kind">{formatNumber(stage.count)}</span>
                    </div>
                    <div className="operation-footer">
                      <span>Drop-off</span>
                      <span>{stage.dropRate ? `-${stage.dropRate.toFixed(1)}%` : "Base"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="section-head">
                <h2>Saude operacional</h2>
                <p>Indicadores de atendimento, resposta e automacao para suporte diario da operacao.</p>
              </div>
              <div className="summary-grid compact">
                <div className="summary-card">
                  <span>Qualificados</span>
                  <strong>{formatNumber(data.metrics.qualifiedLeads)}</strong>
                  <p>Leads que ja sairam do estado inicial e exigem sequencia comercial.</p>
                </div>
                <div className="summary-card">
                  <span>Agendamentos</span>
                  <strong>{formatNumber(data.metrics.scheduledAppointments)}</strong>
                  <p>Consultas e compromissos com status operacional relevante.</p>
                </div>
                <div className="summary-card">
                  <span>Tempo medio</span>
                  <strong>
                    {data.metrics.averageResponseTimeHours
                      ? `${data.metrics.averageResponseTimeHours}h`
                      : "N/D"}
                  </strong>
                  <p>Tempo medio entre triagem recebida e primeira revisao registrada.</p>
                </div>
                <div className="summary-card">
                  <span>CTAs clicados</span>
                  <strong>{formatNumber(data.metrics.ctaClicks)}</strong>
                  <p>Cliques em atendimento, triagem e canal de contato.</p>
                </div>
                <div className="summary-card">
                  <span>Dispatches falhos</span>
                  <strong>{formatNumber(data.automation.failedDispatches)}</strong>
                  <p>Tentativas de automacao que falharam antes da entrega final.</p>
                </div>
                <div className="summary-card">
                  <span>Notificacoes falhas</span>
                  <strong>{formatNumber(data.automation.failedNotifications)}</strong>
                  <p>Entregas que exigem leitura manual ou reprocessamento.</p>
                </div>
              </div>
            </article>
          </section>

          <section className="grid two">
            <article className="panel">
              <div className="section-head">
                <h2>Origens e canais</h2>
                <p>Volume por origem principal e por canal operacional de entrada.</p>
              </div>
              <div className="operations-list">
                {data.sources.slice(0, 6).map((source) => (
                  <div key={source.source} className="operation-card low">
                    <div className="operation-head">
                      <strong>{source.source}</strong>
                      <span className="operation-kind">{formatNumber(source.leads)} leads</span>
                    </div>
                    <div className="operation-footer">
                      <span>{formatNumber(source.conversions)} conversoes</span>
                      <span>{formatPercentage(source.conversionRate)}</span>
                    </div>
                  </div>
                ))}
                {data.channels.slice(0, 6).map((channel) => (
                  <div key={channel.channel} className="operation-card low">
                    <div className="operation-head">
                      <strong>Canal: {channel.channel}</strong>
                      <span className="operation-kind">{formatNumber(channel.leads)} leads</span>
                    </div>
                    <div className="operation-footer">
                      <span>{formatNumber(channel.conversions)} conversoes</span>
                      <span>{formatPercentage(channel.conversionRate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="section-head">
                <h2>Temas e campanhas</h2>
                <p>Leitura pratica para prioridades editoriais, campanhas e demanda juridica.</p>
              </div>
              <div className="operations-list">
                {data.topics.slice(0, 5).map((topic) => (
                  <div key={topic.topic} className="operation-card low">
                    <div className="operation-head">
                      <strong>{topic.topic}</strong>
                      <span className="operation-kind">{formatNumber(topic.leads)} leads</span>
                    </div>
                    <div className="operation-footer">
                      <span>{formatNumber(topic.conversions)} conversoes</span>
                      <span>{formatPercentage(topic.conversionRate)}</span>
                    </div>
                  </div>
                ))}
                {data.campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.campaign} className="operation-card low">
                    <div className="operation-head">
                      <strong>Campanha: {campaign.campaign}</strong>
                      <span className="operation-kind">{formatNumber(campaign.leads)} leads</span>
                    </div>
                    <div className="operation-footer">
                      <span>{formatNumber(campaign.conversions)} conversoes</span>
                      <span>{formatPercentage(campaign.conversionRate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Conteudos com melhor tracao</h2>
              <p>
                Visao editorial-operacional dos artigos que mais puxam leitura, CTA e conversao.
              </p>
            </div>
            <div className="article-index-grid">
              {data.content.slice(0, 6).map((content) => (
                <article key={content.contentId} className="article-card editorial-card">
                  <div className="article-card-meta">
                    <span className="tag soft">views {formatNumber(content.views)}</span>
                    <span className="tag soft">cta {formatNumber(content.ctaClicks)}</span>
                  </div>
                  <strong>{content.contentId}</strong>
                  <p>
                    {formatNumber(content.conversions)} conversoes registradas com taxa de{" "}
                    {formatPercentage(content.conversionRate)}.
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
