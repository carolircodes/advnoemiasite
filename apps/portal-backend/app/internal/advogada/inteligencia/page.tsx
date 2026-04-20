import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import {
  InstitutionalStatCard,
  StrategicPanel
} from "@/components/portal/module-primitives";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";
import { getOmnichannelOverview } from "@/lib/services/omnichannel-intelligence";
import { getRevenueIntelligenceOverview } from "@/lib/services/revenue-intelligence";

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

function formatPaymentStatus(status: string) {
  switch (status) {
    case "approved":
      return "Receita confirmada";
    case "pending":
      return "Pagamento em andamento";
    case "failed":
      return "Tentativa sem aprovação";
    case "abandoned":
      return "Checkout interrompido";
    default:
      return "Status financeiro em leitura";
  }
}

function formatOfferKind(kind: string) {
  switch (kind) {
    case "main":
      return "Oferta principal";
    case "premium":
      return "Camada premium";
    case "continuity":
      return "Continuidade";
    default:
      return "Oferta ativa";
  }
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
  const omnichannel = await getOmnichannelOverview(selectedDays);
  const revenue = await getRevenueIntelligenceOverview(selectedDays);
  const executiveSignals = [
    {
      eyebrow: "Receita confirmada",
      title: `R$ ${revenue.summary.revenueConfirmed.toFixed(2)}`,
      description:
        "Valor já convertido em receita real dentro da janela analisada, sem depender de leitura manual de checkout.",
      meta: `${revenue.summary.approvedCount} pagamento(s) aprovado(s)`,
      tone: "success" as const
    },
    {
      eyebrow: "Gargalo monetizável",
      title: `${revenue.summary.paymentFollowUpNeeded} follow-up(s) de pagamento`,
      description:
        "Mostra onde a receita já foi oferecida, mas ainda depende de retomada humana ou framing adicional para fechar.",
      meta:
        revenue.summary.paymentFollowUpNeeded > 0
          ? "Pede ação comercial"
          : "Sem travas dominantes",
      tone:
        revenue.summary.paymentFollowUpNeeded > 0
          ? ("warning" as const)
          : ("default" as const)
    },
    {
      eyebrow: "Conversão núcleo",
      title: formatRate(intelligence.summary.triageToClientRate),
      description:
        "Conecta triagem enviada, cadastro interno e ativação real do portal para mostrar se a operação está convertendo com consistência.",
      meta: `${intelligence.days} dias em análise`,
      tone: "accent" as const
    }
  ];

  return (
    <AppFrame
      eyebrow="Inteligência do produto"
      title="Leitura executiva de funil, receita e crescimento."
      description="Esta visão junta conversão, operação, receita e uso real do portal para mostrar onde o fluxo avança, onde trava e o que merece decisão executiva."
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
        { href: "/internal/advogada/ecossistema", label: "Ecossistema" },
        { href: "/internal/advogada/operacional", label: "CRM" }
      ]}
      highlights={[
        { label: "Periodo", value: `${intelligence.days} dias` },
        { label: "Triagem -> cliente", value: formatRate(intelligence.summary.triageToClientRate) },
        { label: "Receita confirmada", value: `R$ ${revenue.summary.revenueConfirmed.toFixed(2)}` },
        { label: "Em formacao", value: `R$ ${revenue.summary.revenueInFormation.toFixed(2)}` }
      ]}
      actions={[
        { href: "/internal/advogada", label: "Voltar ao painel", tone: "secondary" },
        { href: "/noemia", label: "Abrir Noemia", tone: "secondary" }
      ]}
    >
      <SectionCard
        title="Orquestracao omnichannel e loops fechados"
        description="A Fase 12 conecta canal, campanha, conteudo, triagem, follow-up, agenda e fechamento numa leitura unica para growth e operacao."
      >
        <div className="summary-grid">
          <div className="summary-card">
            <span>Canal mais quente</span>
            <strong>{omnichannel.executiveSummary.hottestChannel}</strong>
            <p>Combina volume, qualidade comercial e velocidade de resposta no mesmo corte.</p>
          </div>
          <div className="summary-card">
            <span>Tema com melhor sinal</span>
            <strong>{omnichannel.executiveSummary.hottestTheme}</strong>
            <p>Ajuda a sincronizar editorial, distribuicao, atendimento e agenda.</p>
          </div>
          <div className="summary-card">
            <span>Campanha lider</span>
            <strong>{omnichannel.executiveSummary.strongestCampaign}</strong>
            <p>Mostra onde insistir quando a cadeia canal para fechamento esta forte.</p>
          </div>
          <div className="summary-card">
            <span>Conteudo que mais aquece</span>
            <strong>{omnichannel.executiveSummary.bestContent}</strong>
            <p>Diferencia leitura vazia de conteudo com impacto real em lead e conversao.</p>
          </div>
          <div className="summary-card">
            <span>SLA mais lento</span>
            <strong>{omnichannel.executiveSummary.slowestChannel}</strong>
            <p>Explicita onde a operacao ainda perde timing depois da entrada do lead.</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Canais, temas e campanhas por qualidade"
          description="Leitura para decidir onde insistir, onde corrigir e onde redistribuir energia nacional."
        >
          <div className="stack">
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Canais</span>
              <ul className="list">
                {omnichannel.channels.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <div className="item-head">
                      <strong>{item.label}</strong>
                      <span className="tag soft">{item.volume} lead(s)</span>
                    </div>
                    <span className="item-meta">
                      {item.hotLeads} quente(s), {item.appointments} agenda(s), {item.conversions} conversao(oes)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Temas</span>
              <ul className="list">
                {omnichannel.themes.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <div className="item-head">
                      <strong>{item.label}</strong>
                      <span className="tag soft">Score medio {item.averageScore}</span>
                    </div>
                    <span className="item-meta">
                      {item.hotLeads} quente(s) e {item.conversions} conversao(oes)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Campanhas</span>
              <ul className="list">
                {omnichannel.campaigns.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <div className="item-head">
                      <strong>{item.label}</strong>
                      <span className="tag soft">{item.conversions} conversao(oes)</span>
                    </div>
                    <span className="item-meta">
                      {item.volume} lead(s), {item.hotLeads} quente(s), {item.responseHours ?? "sem base"}h de resposta
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Conteudo, retomadas e automacoes"
          description="A maquina fica auditavel quando conteudo, follow-up e fila automatica passam a conversar no mesmo dashboard."
        >
          <div className="stack">
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Conteudos com impacto real</span>
              <ul className="list">
                {omnichannel.contents.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <div className="item-head">
                      <strong>{item.label}</strong>
                      <span className="tag soft">{item.conversions} conversao(oes)</span>
                    </div>
                    <span className="item-meta">
                      {item.qualifiedReads} leitura(s) qualificada(s), {item.ctaClicks} CTA(s), {item.hotLeads} quente(s)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Follow-up por resultado</span>
              <ul className="list">
                {omnichannel.followUpsByResult.slice(0, 5).map((item) => (
                  <li key={item.result}>
                    <div className="item-head">
                      <strong>{item.result}</strong>
                      <span className="tag soft">{item.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="subtle-panel stack">
              <span className="shortcut-kicker">Saude de automacao</span>
              <ul className="list">
                {omnichannel.automationHealth.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <div className="item-head">
                      <strong>{item.key}</strong>
                      <span className="tag soft">{item.total} disparo(s)</span>
                    </div>
                    <span className="item-meta">
                      {item.failed} falha(s) e {item.queued} item(ns) na fila
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid two">
        <SectionCard
          title="Abandono, score e prontidao"
          description="Mostra onde o funil ainda perde forca e onde a operacao deve agir primeiro."
        >
          <div className="summary-grid compact">
            {omnichannel.abandonmentByStage.slice(0, 4).map((item) => (
              <div key={item.stage} className="summary-card">
                <span>Abandono em {item.stage}</span>
                <strong>{item.count}</strong>
                <p>Jornadas que ainda travam antes da qualificacao ou agenda.</p>
              </div>
            ))}
            {omnichannel.scoreBands.map((item) => (
              <div key={item.band} className="summary-card">
                <span>Score {item.band}</span>
                <strong>{item.leads}</strong>
                <p>{item.conversions} conversao(oes) dentro desse intervalo.</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Roteamento explicito por contexto"
          description="Score, prontidao e origem agora viram acao legivel em vez de heuristica dispersa."
        >
          <ul className="update-feed">
            {omnichannel.routingActions.slice(0, 6).map((item) => (
              <li key={item.action} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{item.action}</strong>
                    <span className="item-meta">Acao sugerida pelo motor de contexto</span>
                  </div>
                  <span className="tag soft">{item.total} lead(s)</span>
                </div>
                <p className="update-body">
                  {item.converted} conversao(oes) vieram de jornadas que passaram por esta recomendacao.
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Leitura executiva da inteligência"
        description="O módulo passa a abrir com uma camada decisória clara: receita confirmada, travas monetizáveis e conversão núcleo aparecem antes do detalhamento analítico."
      >
        <div className="grid three">
          {executiveSignals.map((signal) => (
            <InstitutionalStatCard
              key={signal.eyebrow}
              eyebrow={signal.eyebrow}
              title={signal.title}
              description={signal.description}
              meta={signal.meta}
              tone={signal.tone}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Arquitetura de receita do imperio"
        description="A monetizacao agora fica organizada por camadas: o que e nuclear, o que entra agora, o que expande depois e o que merece identidade propria no futuro."
      >
        <div className="grid two">
          {revenue.architecture.map((item) => (
            <article key={item.layer} className="summary-card">
              <span>{item.title}</span>
              <strong>
                {item.moment === "now"
                  ? "Entra agora"
                  : item.moment === "next"
                    ? "Proxima camada"
                    : "Expansao futura"}
              </strong>
              <p>{item.summary}</p>
              <span className="item-meta">
                {item.scope === "main_brand" ? "Dentro da operacao principal" : "Pode virar marca separada no futuro"}
              </span>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Ofertas e jornadas de compra"
        description="O escritorio passa a separar claramente a oferta principal de consulta, a analise premium e as camadas de continuidade que destravam receita com mais governanca."
      >
        <div className="grid three">
          {revenue.nowOffers.concat(revenue.nextOffers).map((offer) => (
            <article key={offer.code} className="route-card">
              <span className="shortcut-kicker">{offer.shortLabel}</span>
              <strong>{offer.name}</strong>
              <span>{offer.description}</span>
              <p>{offer.premiumPositioning}</p>
              <span>
                {offer.defaultAmount ? `Base de cobranca: R$ ${offer.defaultAmount.toFixed(2)}` : "Camada sem preco ativo agora"}
              </span>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Receita, checkout e gargalos"
        description="Leitura executiva da camada de monetizacao para saber onde a pessoa aceita oferta, onde inicia checkout e onde a receita realmente fecha."
      >
        <div className="summary-grid">
          <div className="summary-card">
            <span>Ofertas apresentadas</span>
            <strong>{revenue.summary.offersPresented}</strong>
            <p>Momentos em que o sistema posicionou uma oferta monetizavel com contexto.</p>
          </div>
          <div className="summary-card">
            <span>Checkout iniciado</span>
            <strong>{revenue.summary.checkoutStarted}</strong>
            <p>Jornadas que realmente entraram no fluxo de pagamento.</p>
          </div>
          <div className="summary-card">
            <span>Pagamento pendente</span>
            <strong>{revenue.summary.pendingCount}</strong>
            <p>Dinheiro em andamento que ainda pode travar sem follow-up.</p>
          </div>
          <div className="summary-card">
            <span>Pagamento aprovado</span>
            <strong>{revenue.summary.approvedCount}</strong>
            <p>Receita confirmada com continuidade operacional pronta.</p>
          </div>
          <div className="summary-card">
            <span>Falhas e abandono</span>
            <strong>{revenue.summary.failedCount + revenue.summary.checkoutAbandoned}</strong>
            <p>Etapas que pedem recuperacao de checkout ou novo framing de valor.</p>
          </div>
          <div className="summary-card">
            <span>Follow-up de pagamento</span>
            <strong>{revenue.summary.paymentFollowUpNeeded}</strong>
            <p>Jornadas que ja merecem retomada humana ou automatizada.</p>
          </div>
        </div>
        <div className="summary-grid compact">
          <div className="summary-card">
            <span>Receita em formacao</span>
            <strong>R$ {revenue.summary.revenueInFormation.toFixed(2)}</strong>
            <p>Valor que ja entrou em checkout e ainda nao confirmou fechamento.</p>
          </div>
          <div className="summary-card">
            <span>Receita confirmada</span>
            <strong>R$ {revenue.summary.revenueConfirmed.toFixed(2)}</strong>
            <p>Valor efetivamente aprovado no periodo analisado.</p>
          </div>
          <div className="summary-card">
            <span>Tempo medio checkout para aprovacao</span>
            <strong>
              {revenue.summary.averageCheckoutToApprovedHours === null
                ? "Sem base"
                : `${revenue.summary.averageCheckoutToApprovedHours}h`}
            </strong>
            <p>Leitura inicial do ritmo entre intencao de compra e receita confirmada.</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Ofertas que mais fecham"
          description="Comparacao objetiva entre oferta apresentada, checkout iniciado, pendencia e receita confirmada."
        >
          {revenue.offerBreakdown.length ? (
            <ul className="update-feed">
              {revenue.offerBreakdown.map((item) => (
                <li key={item.code} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{item.label}</strong>
                      <span className="item-meta">{item.layerLabel}</span>
                    </div>
                    <span className="tag soft">{formatOfferKind(item.kind)}</span>
                  </div>
                  <div className="pill-row">
                    <span className="pill muted">{item.presented} oferta(s)</span>
                    <span className="pill warning">{item.checkoutStarted} checkout(s)</span>
                    <span className="pill success">{item.approved} aprovado(s)</span>
                  </div>
                  <p className="update-body">
                    Receita confirmada: R$ {item.revenueConfirmed.toFixed(2)}. Em formacao: R$ {item.revenueInFormation.toFixed(2)}.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">A camada de receita passa a aparecer aqui conforme as ofertas entram em uso real.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Caminhos de monetizacao"
          description="A leitura abaixo mostra qual jornada gera mais checkout e fechamento, para evitar monetizacao cega."
        >
          {revenue.monetizationPaths.length ? (
            <ul className="list">
              {revenue.monetizationPaths.map((item) => (
                <li key={item.path}>
                  <div className="item-head">
                    <strong>{item.label}</strong>
                    <span className="tag soft">{item.approved} aprovado(s)</span>
                  </div>
                  <span className="item-meta">
                    {item.presented} oferta(s) apresentadas e {item.checkoutStarted} checkout(s) iniciados.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os caminhos de monetizacao aparecerao aqui conforme os eventos de receita crescerem.</p>
          )}
        </SectionCard>
      </div>

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
          title="Receita recente e continuidade"
          description="Cada pagamento recente aparece com oferta, status e sinal de follow-up para nao deixar dinheiro em limbo."
        >
          {revenue.latestPayments.length ? (
            <ul className="update-feed">
              {revenue.latestPayments.map((payment) => (
                <li key={payment.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{payment.offerLabel}</strong>
                      <span className="item-meta">{payment.pathLabel}</span>
                    </div>
                    <span className="tag soft">{formatPaymentStatus(payment.status)}</span>
                  </div>
                  <div className="pill-row">
                    <span className="pill muted">{payment.amountLabel}</span>
                    <span className={`pill ${payment.followUpNeeded ? "warning" : payment.status === "approved" ? "success" : "muted"}`}>
                      {payment.followUpNeeded ? "Pede follow-up" : payment.status === "approved" ? "Receita confirmada" : "Em andamento"}
                    </span>
                  </div>
                  <p className="update-body">
                    Criado em {new Date(payment.createdAt).toLocaleString("pt-BR")}.
                    {payment.statusDetail ? ` Detalhe: ${payment.statusDetail}.` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Os pagamentos recentes entrarao aqui assim que a camada de monetizacao ganhar volume.</p>
          )}
        </SectionCard>

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
          title="Foco executivo do período"
          description="Esta síntese separa o que é crescimento real, o que é leitura de produto e o que já virou risco operacional."
        >
          <div className="grid three">
            <StrategicPanel
              eyebrow="Growth"
              title="Fluxo de entrada e ativação"
              description="A triagem só tem valor estratégico quando avança até cliente e ativa o portal sem perda de contexto."
            >
              <div className="pill-row">
                <span className="pill muted">
                  Triagem → cliente: {formatRate(intelligence.summary.triageToClientRate)}
                </span>
                <span className="pill muted">
                  Ativação: {formatRate(intelligence.summary.portalActivationRate)}
                </span>
              </div>
            </StrategicPanel>

            <StrategicPanel
              eyebrow="Receita"
              title="Dinheiro em formação"
              description="A camada financeira fica mais legível quando separa receita confirmada de checkouts que ainda podem esfriar."
            >
              <div className="pill-row">
                <span className="pill success">
                  Confirmada: R$ {revenue.summary.revenueConfirmed.toFixed(2)}
                </span>
                <span className="pill warning">
                  Em formação: R$ {revenue.summary.revenueInFormation.toFixed(2)}
                </span>
              </div>
            </StrategicPanel>

            <StrategicPanel
              eyebrow="Automação"
              title="Fila preventiva em operação"
              description="Mostra quando lembretes e alertas já estão protegendo a operação antes que o gargalo apareça no cockpit principal."
            >
              <div className="pill-row">
                <span className="pill muted">{intelligence.automation.dispatches} disparo(s)</span>
                <span className="pill muted">{intelligence.automation.pendingQueue} na fila</span>
              </div>
            </StrategicPanel>
          </div>
        </SectionCard>

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
          {intelligence.suggestions.length || revenue.suggestions.length ? (
            <div className="notice-grid">
              {intelligence.suggestions.concat(revenue.suggestions).map((item) => (
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
