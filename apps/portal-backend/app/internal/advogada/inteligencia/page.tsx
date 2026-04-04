import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value.trim() : fallback;
}

function formatRate(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "Sem base suficiente";
  }

  return `${value.toFixed(1)}%`;
}

export default async function IntelligencePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const params = searchParams ? await searchParams : {};
  const selectedDays = Number.parseInt(getStringParam(params.days, "30"), 10);
  const intelligence = await getBusinessIntelligenceOverview(selectedDays);

  return (
    <AppFrame
      eyebrow="Inteligencia do produto"
      title="Leitura simples do funil, das automacoes e do uso real do portal."
      description="Esta visao junta conversao, operacao e uso do portal para mostrar onde o fluxo avanca, onde trava e o que ja esta sendo tratado automaticamente."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Inteligencia interna protegida"
          workspaceHint="Sessao interna ativa para leitura de BI, funil e automacoes."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia", active: true },
        { href: "/documentos", label: "Documentos" },
        { href: "/agenda", label: "Agenda" }
      ]}
      highlights={[
        { label: "Periodo", value: `${intelligence.days} dias` },
        { label: "Triagem -> cliente", value: formatRate(intelligence.summary.triageToClientRate) },
        { label: "Cliente -> portal", value: formatRate(intelligence.summary.portalActivationRate) },
        { label: "Fila automatica", value: String(intelligence.automation.pendingQueue) }
      ]}
      actions={[
        { href: "/internal/advogada", label: "Voltar ao painel", tone: "secondary" },
        { href: "/noemia", label: "Abrir Noemia", tone: "secondary" }
      ]}
    >
      <SectionCard
        title="Janela de analise"
        description="Troque o periodo para comparar conversao, uso do portal e disparos automaticos sem perder o contexto operacional."
      >
        <div className="form-actions">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/internal/advogada/inteligencia?days=${days}`}
              className={days === intelligence.days ? "button" : "button secondary"}
            >
              Ultimos {days} dias
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Funil de conversao"
        description="Da primeira visita ao primeiro acesso no portal, com base em eventos reais, triagens vinculadas e cadastros convertidos."
      >
        <div className="funnel-grid">
          {intelligence.funnel.map((step) => (
            <article key={step.key} className="funnel-card">
              <span>{step.label}</span>
              <strong>{step.count}</strong>
              <small>
                {step.conversionFromPrevious === null
                  ? "Base inicial"
                  : `${formatRate(step.conversionFromPrevious)} da etapa anterior`}
              </small>
              <em>
                {step.conversionFromStart === null
                  ? "Sem base inicial"
                  : `${formatRate(step.conversionFromStart)} do topo do funil`}
              </em>
            </article>
          ))}
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <span>Abandono de triagem</span>
            <strong>{intelligence.summary.triageAbandonmentCount}</strong>
            <p>{formatRate(intelligence.summary.triageAbandonmentRate)} dos inicios nao chegaram ao envio.</p>
          </div>
          <div className="summary-card">
            <span>Conversao em cliente</span>
            <strong>{formatRate(intelligence.summary.triageToClientRate)}</strong>
            <p>Triagens que efetivamente viraram cadastro interno com caso e convite.</p>
          </div>
          <div className="summary-card">
            <span>Ativacao no portal</span>
            <strong>{formatRate(intelligence.summary.portalActivationRate)}</strong>
            <p>Clientes convertidos que chegaram a concluir a entrada no portal.</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Uso do portal"
          description="Sinais objetivos de como os clientes estao usando a area segura no dia a dia."
        >
          <div className="metric-grid">
            <div className="metric-card">
              <span>Clientes ativos no portal</span>
              <strong>{intelligence.portalUsage.activeClients}</strong>
            </div>
            <div className="metric-card">
              <span>Painel visualizado</span>
              <strong>{intelligence.portalUsage.dashboardViews}</strong>
            </div>
            <div className="metric-card">
              <span>Documentos acessados</span>
              <strong>{intelligence.portalUsage.documentViews}</strong>
            </div>
            <div className="metric-card">
              <span>Mensagens para Noemia</span>
              <strong>{intelligence.portalUsage.noemiaMessages}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Automacoes em operacao"
          description="Lembretes e alertas que agora entram na fila automaticamente sem depender de acompanhamento manual."
        >
          <div className="summary-grid">
            <div className="summary-card">
              <span>Triagens urgentes</span>
              <strong>{intelligence.triage.urgentCount}</strong>
              <p>Entradas com urgencia alta continuam destacadas para a equipe.</p>
            </div>
            <div className="summary-card">
              <span>Clientes sem acesso</span>
              <strong>{intelligence.automation.clientsAwaitingFirstAccess}</strong>
              <p>Lembretes de convite passam a ser gerados depois da janela definida.</p>
            </div>
            <div className="summary-card">
              <span>Pendencias documentais</span>
              <strong>{intelligence.automation.overdueDocumentRequests}</strong>
              <p>Solicitacoes atrasadas ou estagnadas entram na trilha de lembrete.</p>
            </div>
            <div className="summary-card">
              <span>Compromissos proximos</span>
              <strong>{intelligence.automation.upcomingAppointments}</strong>
              <p>Itens nas proximas 48 horas ja entram no radar automatico.</p>
            </div>
          </div>
          <p className="item-meta">
            Disparos de automacao no periodo: {intelligence.automation.dispatches}. Notificacoes
            automaticas ainda na fila: {intelligence.automation.pendingQueue}.
          </p>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Onde o interesse esta chegando"
          description="Areas que mais entram na triagem para ajudar na leitura comercial e operacional."
        >
          {intelligence.triage.byArea.length ? (
            <ul className="list">
              {intelligence.triage.byArea.map((item) => (
                <li key={item.key}>
                  <div className="item-head">
                    <strong>{item.label}</strong>
                    <span className="tag soft">{item.count} triagem(ns)</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Ainda nao ha triagens suficientes para compor esta leitura.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Eventos mais registrados"
          description="Leitura rapida do que esta acontecendo com mais frequencia no produto."
        >
          {intelligence.eventBreakdown.length ? (
            <ul className="list">
              {intelligence.eventBreakdown.map((item) => (
                <li key={item.key}>
                  <div className="item-head">
                    <strong>{item.label}</strong>
                    <span className="tag soft">{item.count} evento(s)</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os eventos de produto passarao a aparecer aqui conforme o uso crescer.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Acoes sugeridas"
          description="Sugestoes simples, geradas a partir do estado real do produto e da operacao."
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
              Nenhuma acao critica se destacou neste periodo. O painel volta a sugerir os proximos
              passos quando surgir alguma prioridade.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Eventos recentes"
          description="Ultimos sinais coletados do site, da triagem, do portal e da Noemia."
        >
          {intelligence.recentEvents.length ? (
            <ul className="update-feed">
              {intelligence.recentEvents.map((event) => (
                <li key={event.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{event.label}</strong>
                      <span className="item-meta">{event.pagePath || "Evento server-side"}</span>
                    </div>
                    <span className="tag soft">{event.eventGroup}</span>
                  </div>
                  <span className="item-meta">{event.occurredAtLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Ainda nao houve eventos suficientes no periodo selecionado.</p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
