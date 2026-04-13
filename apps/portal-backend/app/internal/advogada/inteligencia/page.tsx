import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { getBusinessIntelligenceOverview } from "@/lib/services/intelligence";
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

export default async function IntelligencePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["advogada", "admin"]);
  const params = searchParams ? await searchParams : {};
  const selectedDays = Number.parseInt(getStringParam(params.days, "30"), 10);
  const intelligence = await getBusinessIntelligenceOverview(selectedDays);
  const revenue = await getRevenueIntelligenceOverview(selectedDays);

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
        { label: "Receita confirmada", value: `R$ ${revenue.summary.revenueConfirmed.toFixed(2)}` },
        { label: "Em formacao", value: `R$ ${revenue.summary.revenueInFormation.toFixed(2)}` }
      ]}
      actions={[
        { href: "/internal/advogada", label: "Voltar ao painel", tone: "secondary" },
        { href: "/noemia", label: "Abrir Noemia", tone: "secondary" }
      ]}
    >
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
                    <span className="tag soft">{item.kind}</span>
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
                    <span className="tag soft">{payment.status}</span>
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
