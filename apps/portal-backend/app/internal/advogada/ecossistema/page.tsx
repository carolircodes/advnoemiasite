import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { buildInternalEcosystemHref } from "@/lib/navigation";
import { getCommunityOperationsBlueprint } from "@/lib/services/ecosystem-community-operations";
import { getInternalPremiumJourneySnapshot } from "@/lib/services/ecosystem-journey";
import { getEcosystemExecutiveOverview } from "@/lib/services/ecosystem-platform";

function toneClass(tone: "success" | "warning" | "muted" | "critical") {
  switch (tone) {
    case "success":
      return "pill success";
    case "warning":
      return "pill warning";
    case "critical":
      return "pill critical";
    default:
      return "pill muted";
  }
}

export default async function EcosystemPage() {
  const profile = await requireProfile(["advogada", "admin"]);
  const [overview, premiumJourney] = await Promise.all([
    getEcosystemExecutiveOverview(45),
    getInternalPremiumJourneySnapshot()
  ]);
  const operations = getCommunityOperationsBlueprint();
  const firstCatalogItem = overview.latestCatalogItems[0] || null;

  return (
    <AppFrame
      eyebrow="Ecossistema"
      title="Base executiva da expansao premium do imperio."
      description="Esta area existe para separar o que e juridico do que pertence ao ecossistema premium. Aqui entram catalogo, recorrencia, acesso, conteudo, comunidade e leitura de retencao sem contaminar o cockpit principal."
      utilityContent={
        <PortalSessionBanner
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          workspaceLabel="Fase 12 ativa"
          workspaceHint="Sessao interna protegida para modelar catalogo, planos, acesso, conteudo premium, comunidade e recorrencia."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/operacional", label: "Operacional" },
        { href: "/internal/advogada/inteligencia", label: "Inteligencia" },
        { href: buildInternalEcosystemHref(), label: "Ecossistema", active: true }
      ]}
      highlights={[
        { label: "Arquitetura", value: `${overview.architecture.length} camadas` },
        { label: "Oferta ancora", value: premiumJourney.anchorTitle },
        { label: "Founders ativos", value: String(premiumJourney.activeFoundersCount) },
        { label: "Engajados", value: String(premiumJourney.engagedFoundersCount) },
        { label: "Convites", value: String(premiumJourney.invitedFoundersCount) },
        { label: "Aceites", value: String(premiumJourney.acceptedInvitesCount) },
        { label: "Waitlist", value: String(premiumJourney.waitlistCount) },
        { label: "Telemetria", value: overview.telemetrySummary[0]?.value || "0" }
      ]}
      actions={[
        {
          href: "#arquitetura-oficial",
          label: "Ver arquitetura",
          trackingEventKey: "product_viewed",
          trackingEventGroup: "ecosystem",
          trackingPayload: { surface: "internal_ecosystem_hub", section: "architecture" }
        },
        {
          href: "#catalogo-premium",
          label: "Abrir catalogo",
          tone: "secondary",
          trackingEventKey: "product_selected",
          trackingEventGroup: "ecosystem",
          trackingPayload: { surface: "internal_ecosystem_hub", section: "catalog" }
        },
        {
          href: "#telemetria-expansao",
          label: "Abrir telemetria",
          tone: "secondary",
          trackingEventKey: "recurring_revenue_signal",
          trackingEventGroup: "ecosystem",
          trackingPayload: { surface: "internal_ecosystem_hub", section: "telemetry" }
        }
      ]}
    >
      <EcosystemTelemetryBeacon
        eventKey="product_viewed"
        payload={{ surface: "internal_ecosystem_hub", page: "/internal/advogada/ecossistema" }}
      />

      <SectionCard
        title="Primeira jornada premium ativa"
        description="A ancora inicial do ecossistema agora opera como comunidade fundadora gratuita, privada e curada, com grants, onboarding, trilha e comunidade conectados."
      >
        <div className="summary-grid compact">
          <div className="summary-card">
            <span>Oferta ancora</span>
            <strong>{premiumJourney.anchorTitle}</strong>
            <p>{premiumJourney.anchorSubtitle}</p>
            <span className="pill warning">{premiumJourney.statusLabel}</span>
          </div>
          <div className="summary-card">
            <span>Founders ativos</span>
            <strong>{premiumJourney.activeFoundersCount}</strong>
            <p>Perfis com acesso fundador ativo dentro da operacao gratuita e privada.</p>
            <span className="pill success">grant ativo</span>
          </div>
          <div className="summary-card">
            <span>Convites pendentes</span>
            <strong>{premiumJourney.invitedFoundersCount}</strong>
            <p>Entradas curatoriais ainda em fase de convite ou onboarding inicial.</p>
            <span className="pill warning">convite</span>
          </div>
          <div className="summary-card">
            <span>Waitlist qualificada</span>
            <strong>{premiumJourney.waitlistCount}</strong>
            <p>Perfis em observacao para entrada futura, sem abrir aquisicao massiva.</p>
            <span className="pill muted">espera elegante</span>
          </div>
          <div className="summary-card">
            <span>Convites aceitos</span>
            <strong>{premiumJourney.acceptedInvitesCount}</strong>
            <p>Entradas que ja sairam do convite e viraram movimento fundador materializado.</p>
            <span className="pill success">entrada real</span>
          </div>
          <div className="summary-card">
            <span>Interesse premium</span>
            <strong>{premiumJourney.premiumInterestCount}</strong>
            <p>Sinais de desejo e atencao em torno da proposta fundadora.</p>
            <span className="pill success">desejo</span>
          </div>
          <div className="summary-card">
            <span>Prontidao paga futura</span>
            <strong>{premiumJourney.paidInterestCount}</strong>
            <p>Sinais de interesse numa futura camada paga, sem ativar cobranca agora.</p>
            <span className="pill warning">monetizacao depois</span>
          </div>
          <div className="summary-card">
            <span>Assinaturas preservadas</span>
            <strong>{premiumJourney.activeSubscriptions}</strong>
            <p>Arquitetura de assinatura pronta e preservada, mas dormente neste momento estrategico.</p>
            <span className="pill muted">dormente</span>
          </div>
          <div className="summary-card">
            <span>Conteudo desbloqueado</span>
            <strong>{premiumJourney.contentUnlocks}</strong>
            <p>Trilha inaugural liberada para a audiencia beta controlada.</p>
            <span className="pill success">conteudo ligado</span>
          </div>
          <div className="summary-card">
            <span>Comunidade conectada</span>
            <strong>{premiumJourney.activeMemberships}</strong>
            <p>Membros ativos na extensao comunitaria da jornada ancora.</p>
            <span className="pill success">membership ativo</span>
          </div>
          <div className="summary-card">
            <span>Grants ativos</span>
            <strong>{premiumJourney.activeGrants}</strong>
            <p>Acessos premium ativos refletidos de forma rastreavel no portal e no billing.</p>
            <span className="pill success">grant sincronizado</span>
          </div>
          <div className="summary-card">
            <span>Onboarding concluido</span>
            <strong>{premiumJourney.onboardingCompletedCount}</strong>
            <p>Entradas fundadoras que ja viraram experiencia recebida, nao apenas acesso liberado.</p>
            <span className="pill success">entrada nobre</span>
          </div>
          <div className="summary-card">
            <span>Sinais iniciais de retencao</span>
            <strong>{premiumJourney.retentionSignalCount}</strong>
            <p>Leituras precoces de continuidade para a operacao fundadora crescer com disciplina.</p>
            <span className="pill success">retencao</span>
          </div>
          <div className="summary-card">
            <span>Engajamento fundador</span>
            <strong>{premiumJourney.founderEngagementEvents}</strong>
            <p>Interacoes que fortalecem pertencimento, consumo e desejo dentro da comunidade privada.</p>
            <span className="pill success">engajamento</span>
          </div>
          <div className="summary-card">
            <span>Founders engajados</span>
            <strong>{premiumJourney.engagedFoundersCount}</strong>
            <p>Perfis com sinais reais de retorno e presenca viva no ciclo atual.</p>
            <span className="pill success">ritmo</span>
          </div>
          <div className="summary-card">
            <span>Conteudo concluido</span>
            <strong>{premiumJourney.completedContentCount}</strong>
            <p>Conclusoes reais da trilha inaugural como prova de valor percebido.</p>
            <span className="pill success">conclusao</span>
          </div>
          <div className="summary-card">
            <span>Progresso medio</span>
            <strong>{premiumJourney.averageProgressPercent}%</strong>
            <p>Leitura agregada de avancos concretos da jornada fundadora.</p>
            <span className="pill success">progresso</span>
          </div>
          <div className="summary-card">
            <span>Risco de esfriamento</span>
            <strong>{premiumJourney.coolingRiskCount}</strong>
            <p>Founders ativos sem sinais equivalentes de retorno no ciclo recente.</p>
            <span className="pill warning">atencao</span>
          </div>
        </div>
        <p className="empty-state" style={{ marginTop: "20px" }}>
          {premiumJourney.summary}
        </p>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Operacao Curada De Entrada"
          description="A curadoria deixa de ser ideia solta e passa a ter lote, estados, capacidade e regras de aprovacao."
        >
          <div className="summary-grid compact">
            <div className="summary-card">
              <span>Lote maximo</span>
              <strong>{operations.entryPolicy.lotSize}</strong>
              <p>Capacidade maxima por rodada de entrada para manter a experiencia nobre.</p>
            </div>
            <div className="summary-card">
              <span>Convites simultaneos</span>
              <strong>{operations.entryPolicy.maxConcurrentInvites}</strong>
              <p>Limite operacional para preservar onboarding, acompanhamento e leitura qualitativa.</p>
            </div>
            <div className="summary-card">
              <span>Estados curatoriais</span>
              <strong>{operations.entryPolicy.founderStates.join(" | ")}</strong>
              <p>Convite, founder ativo, waitlist e deferred agora formam a malha oficial da operacao.</p>
            </div>
          </div>
          <ul className="update-feed" style={{ marginTop: "20px" }}>
            {operations.entryPolicy.approvalLogic.map((rule) => (
              <li key={rule} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>Regra de aprovacao</strong>
                    <span className="item-meta">Entrada pequena e premium</span>
                  </div>
                  <span className="tag soft">Curadoria</span>
                </div>
                <p className="update-body">{rule}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Canais Prioritarios"
          description="A comunidade passa a receber trafego qualificado com ponte pratica e sem abrir geral."
        >
          <ul className="update-feed">
            {operations.channelBridges.map((channel) => (
              <li key={channel.channel} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{channel.label}</strong>
                    <span className="item-meta">{channel.entryMode}</span>
                  </div>
                  <span className="tag soft">{channel.telemetryEvent}</span>
                </div>
                <p className="update-body">
                  {channel.curationRule}. CTA: {channel.ctaLabel}.
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Origem Dos Interessados"
        description="A leitura executiva agora mostra de onde a comunidade esta sendo povoada e quais canais estao realmente alimentando o Circulo com aderencia."
      >
        <div className="summary-grid compact">
          {premiumJourney.sourceSummary.map((source) => (
            <div key={source.label} className="summary-card">
              <span>{source.label}</span>
              <strong>{source.count}</strong>
              <p>Registros curatoriais, grants, memberships e subscriptions ligados a esta origem.</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Maturidade De Conteudo E Retencao"
        description="A leitura executiva agora acompanha nao so entrada, mas permanencia, progresso e conclusao."
      >
        <div className="summary-grid compact">
          {operations.retentionRoutines.map((routine) => (
            <div key={routine.label} className="summary-card">
              <span>{routine.label}</span>
              <strong>{routine.cadence}</strong>
              <p>{routine.objective}</p>
            </div>
          ))}
          <div className="summary-card">
            <span>Site como motor</span>
            <strong>{premiumJourney.siteOriginCount}</strong>
            <p>Registros curatoriais ligados a entradas, desejo ou progresso vindos do site.</p>
          </div>
          <div className="summary-card">
            <span>Artigos como motor</span>
            <strong>{premiumJourney.articlesOriginCount}</strong>
            <p>Registros curatoriais e sinais editoriais ligados a artigos e pontes de profundidade.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="arquitetura-oficial"
        title="Arquitetura oficial do ecossistema"
        description="Cada camada agora declara fronteira, workspace e momento de entrada. Isso encerra a fase de ideias soltas e inaugura a fase de plataforma modular."
      >
        <ul className="update-feed">
          {overview.architecture.map((item) => (
            <li key={item.title} className="update-card">
              <div className="update-head">
                <div>
                  <strong>{item.title}</strong>
                  <span className="item-meta">
                    {item.boundary} - {item.workspace}
                  </span>
                </div>
                <span className={`tag soft`}>{item.entersNow ? "Entra agora" : "Entra depois"}</span>
              </div>
              <p className="update-body">{item.summary}</p>
              <div className="pill-row">
                <span className={item.isolateStructurally ? "pill warning" : "pill muted"}>
                  {item.isolateStructurally ? "Isolamento estrutural exigido" : "Integracao controlada"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          id="catalogo-premium"
          title="Catalogo, planos e recorrencia"
          description="O ecossistema agora tem base propria para oferta, beneficio, status de assinatura e grant de acesso."
        >
          <div className="summary-grid compact">
            {[...overview.catalogSummary, ...overview.recurrenceSummary].map((item) => (
              <div key={item.label} className="summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
                <span className={toneClass(item.tone)}>{item.tone}</span>
              </div>
            ))}
          </div>

          {overview.latestCatalogItems.length ? (
            <ul className="update-feed" style={{ marginTop: "20px" }}>
              {overview.latestCatalogItems.map((item) => (
                <li key={`${item.title}-${item.meta}`} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{item.title}</strong>
                      <span className="item-meta">{item.meta}</span>
                    </div>
                    <span className="tag soft">Catalogo</span>
                  </div>
                  <p className="update-body">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              O catalogo ainda nao ganhou os primeiros registros, mas a arquitetura ja esta pronta para nascer sem gambiarra.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Conteudo premium e comunidade"
          description="A area educacional e a comunidade deixam de ser puxadinho e passam a ter estrutura semantica, progresso, membership e telemetria."
        >
          <div className="summary-grid compact">
            {[...overview.contentSummary, ...overview.communitySummary].map((item) => (
              <div key={item.label} className="summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
                <span className={toneClass(item.tone)}>{item.tone}</span>
              </div>
            ))}
          </div>

          <div className="grid two" style={{ marginTop: "20px" }}>
            <div className="summary-card">
              <span>Ultimos planos</span>
              <strong>{overview.latestPlans[0]?.title || "Sem plano publicado"}</strong>
              <p>{overview.latestPlans[0]?.detail || "A leitura de planos aparece aqui assim que a camada ganhar registros."}</p>
            </div>
            <div className="summary-card">
              <span>Ultima comunidade</span>
              <strong>{overview.latestCommunities[0]?.title || "Sem comunidade ativa"}</strong>
              <p>{overview.latestCommunities[0]?.detail || "A base de comunidade foi criada para nascer com onboarding, status e saida."}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Criterios De Futura Monetizacao"
        description="A cobranca futura so entra quando a comunidade provar vida, desejo e maturidade suficientes."
      >
        <div className="summary-grid compact">
          {operations.monetizationCriteria.map((criterion) => (
            <div key={criterion.label} className="summary-card">
              <span>{criterion.label}</span>
              <strong>{criterion.threshold}</strong>
              <p>{criterion.reason}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Checkpoint Executivo De Monetizacao"
        description="Este painel compara a maturidade atual com os thresholds alvo para decidir o timing da futura cobranca."
      >
        <div className="summary-grid compact">
          {operations.readinessThresholds.map((threshold) => (
            <div key={threshold.key} className="summary-card">
              <span>{threshold.label}</span>
              <strong>{threshold.target} {threshold.unit}</strong>
              <p>{threshold.reason}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Cenarios De Evolucao"
        description="A decisao de monetizacao nao e binaria por impulso: ela precisa respeitar risco, marca e densidade comunitaria."
      >
        <div className="summary-grid compact">
          {operations.monetizationScenarios.map((scenario) => (
            <div key={scenario.id} className="summary-card">
              <span>Cenario {scenario.id}</span>
              <strong>{scenario.title}</strong>
              <p>{scenario.advantage}</p>
              <p>{scenario.risk}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          id="telemetria-expansao"
          title="Telemetria de retencao, recorrencia e valor continuo"
          description="A expansao premium ja nasce com leitura executiva propria para produto, plano, conteudo, comunidade, retencao e receita recorrente."
        >
          <div className="summary-grid compact">
            {overview.telemetrySummary.map((item) => (
              <div key={item.label} className="summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
                <span className={toneClass(item.tone)}>{item.tone}</span>
              </div>
            ))}
          </div>

          {overview.telemetryHighlights.length ? (
            <ul className="update-feed" style={{ marginTop: "20px" }}>
              {overview.telemetryHighlights.map((item) => (
                <li key={`${item.title}-${item.meta}`} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{item.title}</strong>
                      <span className="item-meta">{item.meta}</span>
                    </div>
                    <span className="tag soft">Expansao</span>
                  </div>
                  <p className="update-body">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              A camada de eventos ja esta preparada. Assim que os sinais premium comecarem a nascer, eles entram aqui sem poluir a leitura do core.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Protecao do core principal"
          description="A Fase 12 foi desenhada para expandir receita e experiencia sem reabrir problemas da Fase 11 nem baguncar o cockpit juridico."
        >
          <ul className="update-feed">
            {overview.coreProtectionSummary.map((item) => (
              <li key={item} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>Protecao estrutural</strong>
                    <span className="item-meta">Core juridico preservado</span>
                  </div>
                  <span className="tag soft">Obrigatorio</span>
                </div>
                <p className="update-body">{item}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Portal multicamada"
        description="O portal agora pode crescer em experiencias diferentes sem virar um shopping aleatorio."
      >
        <div className="summary-grid compact">
          {overview.portalExperienceSummary.map((item) => (
            <div key={item.label} className="summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
              <span className={toneClass(item.tone)}>{item.tone}</span>
            </div>
          ))}
        </div>

        <div className="grid three" style={{ marginTop: "20px" }}>
          <Link className="route-card" href="/cliente">
            <span className="shortcut-kicker">Core</span>
            <strong>Area juridica do cliente</strong>
            <span>Segue como cockpit protegido do atendimento, sem misturar assinatura ou produto educacional.</span>
          </Link>
          <div className="route-card">
            <span className="shortcut-kicker">Premium</span>
            <strong>Conteudo, planos e comunidade</strong>
            <span>Agora possuem workspace proprio e semantica de acesso para nascer com elegancia.</span>
          </div>
          <div className="route-card">
            <span className="shortcut-kicker">Escala</span>
            <strong>{firstCatalogItem ? firstCatalogItem.title : "Catalogo de expansao"}</strong>
            <span>
              {firstCatalogItem
                ? firstCatalogItem.detail
                : "A camada de catalogo aguarda apenas o preenchimento das primeiras ofertas oficiais."}
            </span>
          </div>
        </div>
      </SectionCard>
    </AppFrame>
  );
}
