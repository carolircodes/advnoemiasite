import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { EcosystemTelemetryBeacon } from "@/components/ecosystem-telemetry-beacon";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";
import { requireProfile } from "@/lib/auth/guards";
import { buildInternalEcosystemHref } from "@/lib/navigation";
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
        { label: "Beta ativo", value: String(premiumJourney.betaAudienceCount) },
        { label: "Live", value: String(premiumJourney.liveSubscribersCount) },
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
        description="A ancora inicial do ecossistema saiu da fundacao e agora opera como beta privado controlado, com grant, plano, trilha e comunidade conectados."
      >
        <div className="summary-grid compact">
          <div className="summary-card">
            <span>Oferta ancora</span>
            <strong>{premiumJourney.anchorTitle}</strong>
            <p>{premiumJourney.anchorSubtitle}</p>
            <span className="pill warning">{premiumJourney.statusLabel}</span>
          </div>
          <div className="summary-card">
            <span>Beta controlado</span>
            <strong>{premiumJourney.betaAudienceCount}</strong>
            <p>Perfis com grant ativo na primeira jornada premium.</p>
            <span className="pill success">grant ativo</span>
          </div>
          <div className="summary-card">
            <span>Assinantes live</span>
            <strong>{premiumJourney.liveSubscribersCount}</strong>
            <p>Perfis que ja iniciaram ou ativaram a assinatura recorrente operacional.</p>
            <span className="pill success">billing live</span>
          </div>
          <div className="summary-card">
            <span>Assinaturas beta</span>
            <strong>{premiumJourney.activeSubscriptions}</strong>
            <p>Assinaturas em modo manual_beta, sem cobranca recorrente operacional.</p>
            <span className="pill success">billing offline</span>
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
            <span>Risco de churn</span>
            <strong>{premiumJourney.churnRiskCount}</strong>
            <p>Assinaturas em pausa, past_due ou sinais equivalentes dentro do lifecycle recorrente.</p>
            <span className={premiumJourney.churnRiskCount > 0 ? "pill warning" : "pill muted"}>
              risco
            </span>
          </div>
        </div>
        <p className="empty-state" style={{ marginTop: "20px" }}>
          {premiumJourney.summary}
        </p>
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
