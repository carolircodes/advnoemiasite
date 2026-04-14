import "server-only";

import type { PortalProfile } from "../auth/guards";
import {
  accessGrantStatusLabels,
  communityMemberStatusLabels,
  contentProgressStatusLabels,
  ecosystemArchitectureBlueprint,
  ecosystemAvailabilityStatusLabels,
  ecosystemBoundaryLabels,
  ecosystemCatalogKindLabels,
  ecosystemDeliveryKindLabels,
  ecosystemEventKeys,
  ecosystemPortalWorkspaceLabels,
  ecosystemVerticalLabels,
  subscriptionCadenceLabels,
  subscriptionStatusLabels
} from "../domain/ecosystem";
import { createServerSupabaseClient } from "../supabase/server";

type ClientWorkspaceTone = "success" | "warning" | "muted" | "critical";

type ClientEcosystemCard = {
  label: string;
  value: string;
  detail: string;
  tone: ClientWorkspaceTone;
};

type ClientEcosystemZone = {
  title: string;
  status: string;
  summary: string;
  workspaceLabel: string;
  tone: ClientWorkspaceTone;
};

export type ClientEcosystemWorkspace = {
  separationNote: string;
  accessCards: ClientEcosystemCard[];
  experienceZones: ClientEcosystemZone[];
  premiumReadiness: ClientEcosystemCard[];
};

type ExecutiveMetric = {
  label: string;
  value: string;
  detail: string;
  tone: ClientWorkspaceTone;
};

type ExecutiveListItem = {
  title: string;
  detail: string;
  meta: string;
};

type ExecutiveArchitectureItem = {
  title: string;
  boundary: string;
  workspace: string;
  entersNow: boolean;
  isolateStructurally: boolean;
  summary: string;
};

export type EcosystemExecutiveOverview = {
  architecture: ExecutiveArchitectureItem[];
  ecosystemSummary: ExecutiveMetric[];
  catalogSummary: ExecutiveMetric[];
  recurrenceSummary: ExecutiveMetric[];
  contentSummary: ExecutiveMetric[];
  communitySummary: ExecutiveMetric[];
  telemetrySummary: ExecutiveMetric[];
  portalExperienceSummary: ExecutiveMetric[];
  latestCatalogItems: ExecutiveListItem[];
  latestPlans: ExecutiveListItem[];
  latestSubscriptions: ExecutiveListItem[];
  latestCommunities: ExecutiveListItem[];
  telemetryHighlights: ExecutiveListItem[];
  coreProtectionSummary: string[];
};

function formatCount(value: number | null | undefined) {
  return String(value || 0);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(date);
}

function labelFromMap<T extends Record<string, string>>(
  map: T,
  key: unknown,
  fallback = "Sem classificacao"
) {
  return typeof key === "string" && key in map ? map[key] : fallback;
}

function toneFromCounts(active: number, warning: number): ClientWorkspaceTone {
  if (warning > 0) {
    return "warning";
  }

  if (active > 0) {
    return "success";
  }

  return "muted";
}

function buildFoundationZone(
  title: string,
  status: string,
  summary: string,
  workspaceLabel: string,
  tone: ClientWorkspaceTone
): ClientEcosystemZone {
  return {
    title,
    status,
    summary,
    workspaceLabel,
    tone
  };
}

export async function getClientEcosystemWorkspace(
  profile: PortalProfile
): Promise<ClientEcosystemWorkspace> {
  const supabase = await createServerSupabaseClient();

  const [
    accessGrantsResult,
    subscriptionsResult,
    communityMembershipsResult,
    progressResult,
    catalogResult,
    plansResult,
    communitiesResult,
    tracksResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_access_grants")
      .select("id,grant_status,portal_workspace,access_scope,starts_at,ends_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ecosystem_subscriptions")
      .select(
        "id,status,cadence,current_period_ends_at,paused_at,canceled_at,plan_tier_id,ecosystem_plan_tiers(name)"
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ecosystem_community_memberships")
      .select("id,status,last_active_at,community_id,ecosystem_communities(title)")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ecosystem_content_progress")
      .select("id,status,progress_percent,completed_at,track_id,ecosystem_content_tracks(title)")
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("ecosystem_catalog_items")
      .select("id,title,availability_status,catalog_kind,portal_workspace")
      .in("availability_status", ["private_beta", "published"])
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("ecosystem_plan_tiers")
      .select("id,name,status,cadence")
      .in("status", ["private_beta", "published"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ecosystem_communities")
      .select("id,title,status,portal_workspace")
      .in("status", ["private_beta", "published"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ecosystem_content_tracks")
      .select("id,title,status,portal_workspace")
      .in("status", ["private_beta", "published"])
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (accessGrantsResult.error) {
    throw new Error(
      `Nao foi possivel carregar os acessos do ecossistema: ${accessGrantsResult.error.message}`
    );
  }

  if (subscriptionsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as assinaturas do ecossistema: ${subscriptionsResult.error.message}`
    );
  }

  if (communityMembershipsResult.error) {
    throw new Error(
      `Nao foi possivel carregar a comunidade premium: ${communityMembershipsResult.error.message}`
    );
  }

  if (progressResult.error) {
    throw new Error(
      `Nao foi possivel carregar o progresso premium: ${progressResult.error.message}`
    );
  }

  const accessGrants = accessGrantsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const communityMemberships = communityMembershipsResult.data || [];
  const progressItems = progressResult.data || [];
  const catalogItems = catalogResult.data || [];
  const publishedPlans = plansResult.data || [];
  const publishedCommunities = communitiesResult.data || [];
  const publishedTracks = tracksResult.data || [];

  const activeAccess = accessGrants.filter((item) => item.grant_status === "active");
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const pausedSubscriptions = subscriptions.filter((item) => item.status === "paused");
  const activeCommunities = communityMemberships.filter((item) => item.status === "active");
  const progressStarted = progressItems.filter((item) => item.status === "in_progress");
  const progressCompleted = progressItems.filter((item) => item.status === "completed");

  return {
    separationNote:
      "O portal agora reconhece duas linguas com fronteira clara: acompanhamento juridico no core e experiencias premium no ecossistema, sem misturar caso, assinatura, conteudo e comunidade no mesmo estado operacional.",
    accessCards: [
      {
        label: "Acessos premium ativos",
        value: formatCount(activeAccess.length),
        detail:
          activeAccess.length > 0
            ? "Seus acessos premium ficam separados do atendimento juridico e respeitam plano, compra ou curadoria."
            : "Nenhum acesso premium ativo agora. A arquitetura ja esta pronta para liberar materiais, trilhas e comunidade com controle real.",
        tone: toneFromCounts(activeAccess.length, 0)
      },
      {
        label: "Planos e recorrencia",
        value: formatCount(activeSubscriptions.length),
        detail:
          activeSubscriptions.length > 0
            ? `${pausedSubscriptions.length} pausa(s) e status de ciclo ficam rastreados sem afetar o portal juridico.`
            : "A camada de planos ja suporta interesse, ativacao, pausa e cancelamento sem improviso de cobranca.",
        tone:
          pausedSubscriptions.length > 0
            ? "warning"
            : toneFromCounts(activeSubscriptions.length, 0)
      },
      {
        label: "Conteudos em progresso",
        value: formatCount(progressStarted.length),
        detail:
          progressStarted.length > 0 || progressCompleted.length > 0
            ? `${progressCompleted.length} item(ns) concluido(s) com progresso rastreado por trilha e unidade.`
            : "A fundacao educacional ja esta pronta para acompanhar desbloqueio, consumo e conclusao.",
        tone: toneFromCounts(progressStarted.length + progressCompleted.length, 0)
      },
      {
        label: "Comunidades premium",
        value: formatCount(activeCommunities.length),
        detail:
          activeCommunities.length > 0
            ? "Seu status comunitario fica desacoplado do atendimento juridico principal."
            : "A estrutura de comunidade ja existe com status de membro, entrada, pausa e saida.",
        tone: toneFromCounts(activeCommunities.length, 0)
      }
    ],
    experienceZones: [
      buildFoundationZone(
        "Area juridica principal",
        "Ativa e protegida",
        "Casos, documentos, agenda e leitura operacional seguem como centro confiavel do atendimento.",
        ecosystemPortalWorkspaceLabels.legal_client,
        "success"
      ),
      buildFoundationZone(
        "Hub premium do ecossistema",
        catalogItems.length ? "Preparado para publicar" : "Fundacao concluida",
        catalogItems.length
          ? `${catalogItems.length} oferta(s) publicavel(is) ja podem nascer sem virar shopping improvisado.`
          : "Catalogo, recorrencia, conteudo e comunidade foram separados para escalar com elegancia.",
        ecosystemPortalWorkspaceLabels.ecosystem_hub,
        "warning"
      ),
      buildFoundationZone(
        "Planos e beneficios",
        publishedPlans.length ? "Arquitetura pronta" : "Fundacao pronta",
        publishedPlans.length
          ? `${publishedPlans.length} plano(s) com linguagem, beneficios e cadencia ja podem ser organizados com controle.`
          : "Planos, beneficios e jornada de renovacao/cancelamento ja possuem semantica oficial.",
        ecosystemPortalWorkspaceLabels.plans_benefits,
        "warning"
      ),
      buildFoundationZone(
        "Conteudo premium",
        publishedTracks.length ? "Base de conteudo ligada" : "Base educacional pronta",
        publishedTracks.length
          ? `${publishedTracks.length} trilha(s) podem ser liberadas por compra, plano ou curadoria.`
          : "A camada educacional agora tem trilhas, modulos, unidades, materiais e progresso sem contaminar o caso juridico.",
        ecosystemPortalWorkspaceLabels.premium_content,
        "warning"
      ),
      buildFoundationZone(
        "Comunidade premium",
        publishedCommunities.length ? "Entrada estruturada" : "Fundacao comunitaria pronta",
        publishedCommunities.length
          ? `${publishedCommunities.length} comunidade(s) podem ser vinculadas a plano, conteudo e acompanhamento.`
          : "A comunidade futura nasce com status, acesso e ciclo de membro definidos desde o inicio.",
        ecosystemPortalWorkspaceLabels.community,
        "warning"
      )
    ],
    premiumReadiness: [
      {
        label: "Catalogo estruturado",
        value: formatCount(catalogItems.length),
        detail: "Produtos, materiais, trilhas, comunidades e ofertas vivem em um catalogo proprio.",
        tone: catalogItems.length > 0 ? "success" : "warning"
      },
      {
        label: "Planos publicados",
        value: formatCount(publishedPlans.length),
        detail: "Recorrencia ganhou semantica de plano, beneficio, ciclo e status.",
        tone: publishedPlans.length > 0 ? "success" : "warning"
      },
      {
        label: "Trilhas publicaveis",
        value: formatCount(publishedTracks.length),
        detail: "A camada educacional ja pode nascer dentro do portal premium, sem invadir o core.",
        tone: publishedTracks.length > 0 ? "success" : "warning"
      },
      {
        label: "Comunidades publicaveis",
        value: formatCount(publishedCommunities.length),
        detail: "A base comunitaria agora conversa com plano, conteudo e acesso de forma limpa.",
        tone: publishedCommunities.length > 0 ? "success" : "warning"
      }
    ]
  };
}

export async function getEcosystemExecutiveOverview(days = 45): Promise<EcosystemExecutiveOverview> {
  const supabase = await createServerSupabaseClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    catalogResult,
    plansResult,
    benefitsResult,
    subscriptionsResult,
    accessResult,
    tracksResult,
    modulesResult,
    unitsResult,
    assetsResult,
    progressResult,
    communitiesResult,
    membershipsResult,
    telemetryResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_catalog_items")
      .select(
        "id,title,vertical,catalog_kind,delivery_kind,access_model,availability_status,portal_workspace,legal_boundary,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_plan_tiers")
      .select("id,name,cadence,status,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ecosystem_plan_benefits")
      .select("id,title,status,plan_tier_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_subscriptions")
      .select(
        "id,status,cadence,current_period_ends_at,profile_id,plan_tier_id,created_at,source_of_activation,payment_provider,billing_status,ecosystem_plan_tiers(name)"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_access_grants")
      .select(
        "id,grant_status,portal_workspace,access_scope,profile_id,catalog_item_id,created_at,ecosystem_catalog_items(title)"
      )
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("ecosystem_content_tracks")
      .select("id,title,status,access_model,portal_workspace,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ecosystem_content_modules")
      .select("id,title,status,track_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_content_units")
      .select("id,title,status,unit_type,module_id,created_at")
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("ecosystem_content_assets")
      .select("id,title,asset_type,unit_id,created_at")
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("ecosystem_content_progress")
      .select(
        "id,status,progress_percent,completed_at,profile_id,track_id,created_at,ecosystem_content_tracks(title)"
      )
      .order("updated_at", { ascending: false })
      .limit(400),
    supabase
      .from("ecosystem_communities")
      .select("id,title,status,access_model,portal_workspace,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ecosystem_community_memberships")
      .select(
        "id,status,access_level,last_active_at,profile_id,community_id,created_at,ecosystem_communities(title)"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("product_events")
      .select("id,event_key,event_group,page_path,occurred_at,payload")
      .gte("occurred_at", since)
      .in("event_key", [...ecosystemEventKeys])
      .order("occurred_at", { ascending: false })
      .limit(1000)
  ]);

  const resultMap = [
    ["catalogo", catalogResult],
    ["planos", plansResult],
    ["beneficios", benefitsResult],
    ["assinaturas", subscriptionsResult],
    ["acessos", accessResult],
    ["trilhas", tracksResult],
    ["modulos", modulesResult],
    ["unidades", unitsResult],
    ["assets", assetsResult],
    ["progresso", progressResult],
    ["comunidades", communitiesResult],
    ["membros", membershipsResult],
    ["telemetria", telemetryResult]
  ] as const;

  for (const [label, result] of resultMap) {
    if (result.error) {
      throw new Error(
        `Nao foi possivel carregar ${label} da Fase 12: ${result.error.message}`
      );
    }
  }

  const catalogItems = catalogResult.data || [];
  const plans = plansResult.data || [];
  const benefits = benefitsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const accessGrants = accessResult.data || [];
  const tracks = tracksResult.data || [];
  const modules = modulesResult.data || [];
  const units = unitsResult.data || [];
  const assets = assetsResult.data || [];
  const progressItems = progressResult.data || [];
  const communities = communitiesResult.data || [];
  const memberships = membershipsResult.data || [];
  const telemetryEvents = telemetryResult.data || [];

  const publishedCatalog = catalogItems.filter(
    (item) => item.availability_status === "published" || item.availability_status === "private_beta"
  );
  const isolatedCatalog = catalogItems.filter(
    (item) => item.legal_boundary === "adjacent_ecosystem" || item.legal_boundary === "isolated_future_vertical"
  );
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const pausedSubscriptions = subscriptions.filter((item) => item.status === "paused");
  const liveSubscriptions = subscriptions.filter(
    (item) => item.payment_provider === "mercado_pago_preapproval"
  );
  const pendingAuthorizations = subscriptions.filter(
    (item) =>
      item.payment_provider === "mercado_pago_preapproval" &&
      (item.billing_status === "pending_authorization" || item.status === "incomplete")
  );
  const foundingSubscriptions = subscriptions.filter(
    (item) => item.source_of_activation === "founding_beta"
  );
  const foundingLiveSubscriptions = subscriptions.filter(
    (item) => item.source_of_activation === "founding_live"
  );
  const pastDueSubscriptions = subscriptions.filter(
    (item) => item.status === "past_due" || item.billing_status === "past_due"
  );
  const activeGrants = accessGrants.filter((item) => item.grant_status === "active");
  const foundingLiveGrants = accessGrants.filter((item) => item.access_scope === "founding_live");
  const completedProgress = progressItems.filter((item) => item.status === "completed");
  const activeMemberships = memberships.filter((item) => item.status === "active");

  const telemetryCounts = new Map<string, number>();
  for (const key of ecosystemEventKeys) {
    telemetryCounts.set(key, 0);
  }
  for (const item of telemetryEvents) {
    telemetryCounts.set(item.event_key, (telemetryCounts.get(item.event_key) || 0) + 1);
  }

  const contentStarted = telemetryCounts.get("content_started") || 0;
  const contentCompleted = telemetryCounts.get("content_completed") || 0;
  const contentCompletionRate =
    contentStarted > 0 ? (contentCompleted / contentStarted) * 100 : 0;

  const architecture = ecosystemArchitectureBlueprint.map((item) => ({
    title: item.title,
    boundary: ecosystemBoundaryLabels[item.boundary],
    workspace: ecosystemPortalWorkspaceLabels[item.workspace],
    entersNow: item.entersNow,
    isolateStructurally: item.isolateStructurally,
    summary: item.summary
  }));

  return {
    architecture,
    ecosystemSummary: [
      {
        label: "Camadas oficiais do ecossistema",
        value: formatCount(architecture.length),
        detail:
          "A expansao agora foi quebrada em camadas oficiais com fronteira, workspace e momento de entrada.",
        tone: "success"
      },
      {
        label: "Itens adjacentes ao core",
        value: formatCount(isolatedCatalog.length),
        detail:
          "Tudo o que pertence ao ecossistema adjacente ja pode crescer sem poluir caso, agenda, pagamentos e command center juridico.",
        tone: isolatedCatalog.length > 0 ? "success" : "warning"
      },
      {
        label: "Ofertas publicaveis",
        value: formatCount(publishedCatalog.length),
        detail:
          "A plataforma ja separa fundacao, beta privado e publicado para evitar lancamento caotico.",
        tone: publishedCatalog.length > 0 ? "success" : "warning"
      }
    ],
    catalogSummary: [
      {
        label: "Catalogo premium",
        value: formatCount(catalogItems.length),
        detail: `${publishedCatalog.length} item(ns) em beta ou publicado(s) com tipo de entrega e modelo de acesso.`,
        tone: catalogItems.length > 0 ? "success" : "warning"
      },
      {
        label: "Tipos de oferta",
        value: formatCount(new Set(catalogItems.map((item) => item.catalog_kind)).size),
        detail: "Servico, plano, material, trilha, comunidade e produto digital agora falam linguas distintas, mas compativeis.",
        tone: catalogItems.length > 0 ? "success" : "warning"
      },
      {
        label: "Beneficios mapeados",
        value: formatCount(benefits.length),
        detail: "Planos ja conseguem declarar beneficios com acesso, entrega e prioridade sem improviso.",
        tone: benefits.length > 0 ? "success" : "warning"
      }
    ],
    recurrenceSummary: [
      {
        label: "Planos cadastrados",
        value: formatCount(plans.length),
        detail:
          `${plans.filter((item) => item.status === "published" || item.status === "private_beta").length} plano(s) prontos para ganhar ativacao real.`,
        tone: plans.length > 0 ? "success" : "warning"
      },
      {
        label: "Assinaturas mapeadas",
        value: formatCount(subscriptions.length),
        detail:
          `${activeSubscriptions.length} ativa(s), ${pausedSubscriptions.length} pausada(s), ${liveSubscriptions.length} live e sem misturar recorrencia com pagamento transacional do core.`,
        tone: subscriptions.length > 0 ? "success" : "warning"
      },
      {
        label: "Acessos concedidos",
        value: formatCount(accessGrants.length),
        detail:
          `${activeGrants.length} grant(s) ativo(s) por plano, compra ou curadoria com trilha propria de expiracao.`,
        tone: accessGrants.length > 0 ? "success" : "warning"
      },
      {
        label: "Transicao beta -> live",
        value: formatCount(foundingLiveSubscriptions.length),
        detail:
          `${foundingSubscriptions.length} fundador(es) beta preservados, ${pendingAuthorizations.length} autorizacao(oes) pendente(s) e ${pastDueSubscriptions.length} sinal(is) de risco no lifecycle recorrente.`,
        tone:
          foundingLiveSubscriptions.length > 0
            ? "success"
            : pendingAuthorizations.length > 0 || pastDueSubscriptions.length > 0
              ? "warning"
              : "muted"
      },
      {
        label: "Founding live habilitado",
        value: formatCount(foundingLiveGrants.length),
        detail:
          `${activeMemberships.length} membership(s) ativa(s) e grants sincronizados para a experiencia fundadora real.`,
        tone: foundingLiveGrants.length > 0 ? "success" : "warning"
      }
    ],
    contentSummary: [
      {
        label: "Trilhas premium",
        value: formatCount(tracks.length),
        detail: `${modules.length} modulo(s), ${units.length} unidade(s) e ${assets.length} material(is) de apoio estruturados.`,
        tone: tracks.length > 0 ? "success" : "warning"
      },
      {
        label: "Progresso rastreado",
        value: formatCount(progressItems.length),
        detail: `${completedProgress.length} conclusao(oes) registradas com semantica de progresso continuo.`,
        tone: progressItems.length > 0 ? "success" : "warning"
      },
      {
        label: "Conclusao de conteudo",
        value: formatPercent(contentCompletionRate),
        detail:
          "Telemetria de conteudo ja consegue medir inicio e conclusao sem poluir os eventos do atendimento juridico.",
        tone: contentStarted > 0 ? "success" : "muted"
      }
    ],
    communitySummary: [
      {
        label: "Comunidades configuradas",
        value: formatCount(communities.length),
        detail:
          `${communities.filter((item) => item.status === "published" || item.status === "private_beta").length} comunidade(s) podem ser liberadas com status e onboarding.`,
        tone: communities.length > 0 ? "success" : "warning"
      },
      {
        label: "Membros rastreados",
        value: formatCount(memberships.length),
        detail:
          `${activeMemberships.length} membro(s) ativos, com status de pausa, saida e atividade sem virar puxadinho.`,
        tone: memberships.length > 0 ? "success" : "warning"
      },
      {
        label: "Sinal de retencao comunitaria",
        value: formatCount(telemetryCounts.get("member_active") || 0),
        detail: "A camada comunitaria ja consegue medir entrada e atividade para futura retencao.",
        tone: (telemetryCounts.get("member_active") || 0) > 0 ? "success" : "muted"
      }
    ],
    telemetrySummary: [
      {
        label: "Eventos de expansao",
        value: formatCount(telemetryEvents.length),
        detail: `Janela de ${days} dia(s) com leitura de produto, plano, conteudo, comunidade, retencao e receita recorrente.`,
        tone: telemetryEvents.length > 0 ? "success" : "warning"
      },
      {
        label: "Interesse em recorrencia",
        value: formatCount(
          (telemetryCounts.get("subscription_interest") || 0) +
            (telemetryCounts.get("plan_viewed") || 0)
        ),
        detail: "Visualizacao de plano e sinal de interesse ja entram em leitura executiva separada do checkout juridico.",
        tone:
          (telemetryCounts.get("subscription_interest") || 0) > 0 ||
          (telemetryCounts.get("plan_viewed") || 0) > 0
            ? "success"
            : "muted"
      },
      {
        label: "Ativacoes fundadoras",
        value: formatCount(
          (telemetryCounts.get("subscription_authorized") || 0) +
            (telemetryCounts.get("founding_live_activated") || 0) +
            (telemetryCounts.get("onboarding_completed") || 0)
        ),
        detail:
          "A operacao fundadora agora le autorizacao, ativacao live e onboarding como uma unica jornada recorrente controlada.",
        tone:
          (telemetryCounts.get("subscription_authorized") || 0) > 0 ||
          (telemetryCounts.get("founding_live_activated") || 0) > 0 ||
          (telemetryCounts.get("onboarding_completed") || 0) > 0
            ? "success"
            : "warning"
      },
      {
        label: "Sinais de risco",
        value: formatCount(
          (telemetryCounts.get("churn_risk") || 0) +
            (telemetryCounts.get("subscription_canceled") || 0)
        ),
        detail: "Churn e cancelamento ganharam trilha propria para a expansao nao nascer cega.",
        tone:
          (telemetryCounts.get("churn_risk") || 0) > 0 ||
          (telemetryCounts.get("subscription_canceled") || 0) > 0
            ? "warning"
            : "muted"
      }
    ],
    portalExperienceSummary: [
      {
        label: "Workspaces preparados",
        value: formatCount(
          new Set([
            ...catalogItems.map((item) => item.portal_workspace),
            ...tracks.map((item) => item.portal_workspace),
            ...communities.map((item) => item.portal_workspace),
            ...accessGrants.map((item) => item.portal_workspace)
          ]).size
        ),
        detail:
          "O portal agora pode crescer em hubs diferentes: juridico, conteudo premium, planos e beneficios, comunidade e hub do ecossistema.",
        tone: "success"
      },
      {
        label: "Separacao semantica",
        value: formatCount(
          catalogItems.filter((item) => item.legal_boundary === "adjacent_ecosystem").length
        ),
        detail:
          "A expansao passou a declarar explicitamente quando algo e core, adjacente ou vertical futura isolada.",
        tone: "success"
      },
      {
        label: "Itens ainda em fundacao",
        value: formatCount(
          catalogItems.filter((item) => item.availability_status === "foundation").length +
            plans.filter((item) => item.status === "foundation").length +
            tracks.filter((item) => item.status === "foundation").length +
            communities.filter((item) => item.status === "foundation").length
        ),
        detail: "A fase atual prepara a base sem forcar publicacao precoce ou shopping baguncado.",
        tone: "warning"
      }
    ],
    latestCatalogItems: catalogItems.slice(0, 6).map((item) => ({
      title: item.title,
      detail: `${labelFromMap(ecosystemCatalogKindLabels, item.catalog_kind)} em ${labelFromMap(
        ecosystemVerticalLabels,
        item.vertical
      )}.`,
      meta: [
        labelFromMap(ecosystemAvailabilityStatusLabels, item.availability_status),
        labelFromMap(ecosystemDeliveryKindLabels, item.delivery_kind)
      ].join(" | ")
    })),
    latestPlans: plans.slice(0, 6).map((item) => ({
      title: item.name,
      detail: `${labelFromMap(subscriptionCadenceLabels, item.cadence)} com status ${labelFromMap(
        ecosystemAvailabilityStatusLabels,
        item.status
      )}.`,
      meta: item.published_at ? `Publicado em ${formatDate(item.published_at)}` : "Ainda em estruturacao"
    })),
    latestSubscriptions: subscriptions.slice(0, 6).map((item) => ({
      title:
        (item.ecosystem_plan_tiers as { name?: string } | null)?.name || "Assinatura premium",
      detail: `${labelFromMap(subscriptionStatusLabels, item.status)} com cadencia ${labelFromMap(
        subscriptionCadenceLabels,
        item.cadence
      )}.`,
      meta: item.current_period_ends_at
        ? `Ciclo ate ${formatDate(item.current_period_ends_at)}`
        : "Sem fim de ciclo definido"
    })),
    latestCommunities: memberships.slice(0, 6).map((item) => ({
      title:
        (item.ecosystem_communities as { title?: string } | null)?.title || "Comunidade premium",
      detail: `${labelFromMap(communityMemberStatusLabels, item.status)} com nivel ${item.access_level}.`,
      meta: item.last_active_at ? `Ativo em ${formatDate(item.last_active_at)}` : "Sem atividade registrada"
    })),
    telemetryHighlights: telemetryEvents.slice(0, 8).map((item) => ({
      title: item.event_key.replaceAll("_", " "),
      detail: item.page_path || "Sem rota informada",
      meta: formatDate(item.occurred_at)
    })),
    coreProtectionSummary: [
      "Catalogo, recorrencia, conteudo e comunidade vivem em tabelas proprias do ecossistema, fora de clients, cases, appointments, documents e payments.",
      "Workspaces do portal agora distinguem area juridica, conteudo premium, planos e beneficios, comunidade e hub do ecossistema.",
      "Telemetria de expansao usa eventos proprios para nao contaminar a leitura executiva do core juridico.",
      "Planos e assinaturas nao reutilizam a tabela de pagamentos do atendimento principal, preservando consulta e servico juridico como receita transacional distinta.",
      "A arquitetura declara fronteira legal explicita entre core, ecossistema adjacente e verticais futuras isoladas."
    ]
  };
}
