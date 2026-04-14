import "server-only";

import type { PortalProfile } from "../auth/guards";
import {
  accessGrantStatusLabels,
  communityMemberStatusLabels,
  ecosystemAvailabilityStatusLabels,
  subscriptionCadenceLabels,
  subscriptionStatusLabels
} from "../domain/ecosystem";
import { createServerSupabaseClient } from "../supabase/server";

export const PREMIUM_JOURNEY_ANCHOR = {
  catalogSlug: "biblioteca-estrategica-premium",
  planCode: "circulo_essencial",
  reservePlanCode: "circulo_reserva",
  trackSlug: "trilha-clareza-estrategica",
  communitySlug: "circulo-reservado"
} as const;

type JourneyTone = "success" | "warning" | "muted" | "critical";

type PremiumSubscriptionSnapshot = {
  hasLiveProvider: boolean;
  lifecycleLabel: string;
  billingLabel: string;
  foundingLabel: string;
  detail: string;
  nextBillingLabel: string;
  canStartLive: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  providerLabel: string;
  startHref: string;
  pauseHref: string;
  resumeHref: string;
  cancelHref: string;
  syncHref: string;
};

export type ClientPremiumJourneySnapshot = {
  anchor: {
    title: string;
    subtitle: string;
    tagline: string;
    description: string;
    ctaLabel: string;
    statusLabel: string;
    statusTone: JourneyTone;
    workspaceLabel: string;
  };
  access: {
    hasAccess: boolean;
    statusLabel: string;
    detail: string;
    tone: JourneyTone;
  };
  plan: {
    name: string;
    headline: string;
    cadenceLabel: string;
    statusLabel: string;
    detail: string;
  };
  subscription: PremiumSubscriptionSnapshot;
  content: {
    title: string;
    unitTitle: string;
    assetTitle: string;
    unlocked: boolean;
    statusLabel: string;
    detail: string;
  };
  community: {
    title: string;
    statusLabel: string;
    detail: string;
    joined: boolean;
  };
  links: {
    hub: string;
    benefits: string;
    content: string;
    community: string;
  };
  beta: {
    label: string;
    detail: string;
  };
};

export type InternalPremiumJourneySnapshot = {
  anchorTitle: string;
  anchorSubtitle: string;
  statusLabel: string;
  betaAudienceCount: number;
  foundingLiveCount: number;
  liveSubscribersCount: number;
  pendingAuthorizationsCount: number;
  pausedSubscribersCount: number;
  churnRiskCount: number;
  activeMemberships: number;
  activeSubscriptions: number;
  activeGrants: number;
  contentUnlocks: number;
  onboardingCompletedCount: number;
  retentionSignalCount: number;
  summary: string;
};

function getTone(active: boolean, preview: boolean): JourneyTone {
  if (active) {
    return "success";
  }

  if (preview) {
    return "warning";
  }

  return "muted";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sem data definida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(date);
}

function getBillingLabel(status: string | null | undefined) {
  switch ((status || "").toLowerCase()) {
    case "authorized":
      return "Billing autorizado";
    case "pending_authorization":
      return "Autorizacao pendente";
    case "paused":
      return "Billing pausado";
    case "canceled":
      return "Billing cancelado";
    case "beta_manual":
      return "Curadoria fundadora";
    case "live_ready":
      return "Billing live pronto";
    default:
      return status ? status.replaceAll("_", " ") : "Billing em preparacao";
  }
}

function buildSubscriptionSnapshot(args: {
  betaSubscription: any | null;
  liveSubscription: any | null;
  effectiveSubscription: any | null;
}) {
  const { betaSubscription, liveSubscription, effectiveSubscription } = args;
  const liveStatus = liveSubscription?.status || null;
  const liveBillingStatus = liveSubscription?.billing_status || null;
  const betaFounding = betaSubscription?.source_of_activation === "founding_beta";
  const hasLiveProvider = liveSubscription?.payment_provider === "mercado_pago_preapproval";
  const canPause = liveStatus === "active";
  const canResume = liveStatus === "paused" || liveStatus === "past_due";
  const canCancel = ["active", "paused", "past_due", "trialing"].includes(liveStatus || "");
  const canStartLive = !hasLiveProvider || liveStatus === "incomplete";
  const lifecycleLabel = effectiveSubscription
    ? subscriptionStatusLabels[
        effectiveSubscription.status as keyof typeof subscriptionStatusLabels
      ] || "Assinatura estruturada"
    : "Sem assinatura live";

  return {
    hasLiveProvider,
    lifecycleLabel,
    billingLabel: getBillingLabel(liveBillingStatus || betaSubscription?.billing_status || null),
    foundingLabel: betaFounding
      ? hasLiveProvider && liveStatus === "active"
        ? "Fundadora migrada para live"
        : "Beneficio fundador preservado"
      : hasLiveProvider
        ? "Assinante live"
        : "Sem status fundador",
    detail: hasLiveProvider
      ? liveStatus === "active"
      ? "A assinatura recorrente do Circulo Essencial agora roda em lifecycle operacional proprio, com billing separado do core juridico."
      : liveStatus === "paused"
          ? "A assinatura live esta pausada. O entitlement premium segue congelado sem contaminar a camada juridica."
          : liveStatus === "canceled"
            ? "A assinatura live foi cancelada e a continuidade premium passa a obedecer o fim do ciclo configurado."
            : "A transicao para billing live ja foi iniciada dentro de uma operacao fundadora controlada e aguarda autorizacao final da assinatura."
      : betaFounding
        ? "A jornada fundadora continua protegida enquanto a migracao elegante para live acontece."
        : "A camada de assinatura real ainda nao foi iniciada para este perfil.",
    nextBillingLabel: effectiveSubscription?.next_billing_at
      ? `Proxima leitura de ciclo: ${formatDate(effectiveSubscription.next_billing_at)}`
      : effectiveSubscription?.renewal_due_at
        ? `Renovacao prevista: ${formatDate(effectiveSubscription.renewal_due_at)}`
        : "Sem proxima cobranca registrada",
    canStartLive,
    canPause,
    canResume,
    canCancel,
    providerLabel: hasLiveProvider ? "Mercado Pago Recorrente" : "Transicao curada",
    startHref: "/api/ecosystem/subscription/start",
    pauseHref: "/api/ecosystem/subscription/manage?action=pause",
    resumeHref: "/api/ecosystem/subscription/manage?action=resume",
    cancelHref: "/api/ecosystem/subscription/manage?action=cancel",
    syncHref: "/api/ecosystem/subscription/manage?action=sync"
  };
}

export async function getClientPremiumJourney(
  profile: PortalProfile
): Promise<ClientPremiumJourneySnapshot> {
  const supabase = await createServerSupabaseClient();

  const [
    catalogResult,
    planResult,
    subscriptionsResult,
    grantResult,
    trackResult,
    progressResult,
    communityResult,
    membershipResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_catalog_items")
      .select("id,title,subtitle,description,availability_status,portal_workspace,metadata")
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.catalogSlug)
      .maybeSingle(),
    supabase
      .from("ecosystem_plan_tiers")
      .select(
        "id,name,headline,description,cadence,status,metadata,billing_provider,billing_status,billing_plan_reference"
      )
      .eq("code", PREMIUM_JOURNEY_ANCHOR.planCode)
      .maybeSingle(),
    supabase
      .from("ecosystem_subscriptions")
      .select(
        "id,status,cadence,current_period_ends_at,renewal_mode,metadata,payment_provider,billing_status,billing_provider_reference,source_of_activation,renewal_due_at,next_billing_at,billing_metadata"
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("ecosystem_access_grants")
      .select("id,grant_status,access_scope,starts_at,ends_at,metadata")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ecosystem_content_tracks")
      .select(
        "id,title,subtitle,description,status,metadata,ecosystem_content_modules(id,title,ecosystem_content_units(id,title,ecosystem_content_assets(id,title)))"
      )
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.trackSlug)
      .maybeSingle(),
    supabase
      .from("ecosystem_content_progress")
      .select("id,status,progress_percent,completed_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ecosystem_communities")
      .select("id,title,description,status,onboarding_copy,metadata")
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.communitySlug)
      .maybeSingle(),
    supabase
      .from("ecosystem_community_memberships")
      .select("id,status,access_level,last_active_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (catalogResult.error) {
    throw new Error(`Nao foi possivel carregar a oferta premium: ${catalogResult.error.message}`);
  }

  if (planResult.error) {
    throw new Error(`Nao foi possivel carregar o plano premium: ${planResult.error.message}`);
  }

  if (subscriptionsResult.error) {
    throw new Error(`Nao foi possivel carregar a assinatura premium: ${subscriptionsResult.error.message}`);
  }

  if (grantResult.error) {
    throw new Error(`Nao foi possivel carregar o grant premium: ${grantResult.error.message}`);
  }

  if (trackResult.error) {
    throw new Error(`Nao foi possivel carregar a trilha premium: ${trackResult.error.message}`);
  }

  if (progressResult.error) {
    throw new Error(`Nao foi possivel carregar o progresso premium: ${progressResult.error.message}`);
  }

  if (communityResult.error) {
    throw new Error(`Nao foi possivel carregar a comunidade premium: ${communityResult.error.message}`);
  }

  if (membershipResult.error) {
    throw new Error(`Nao foi possivel carregar o membership premium: ${membershipResult.error.message}`);
  }

  const catalog = catalogResult.data;
  const plan = planResult.data;
  const subscriptions = subscriptionsResult.data || [];
  const grant = grantResult.data;
  const track = trackResult.data as
    | {
        title: string;
        subtitle?: string | null;
        description?: string | null;
        status: string;
        ecosystem_content_modules?: Array<{
          title: string;
          ecosystem_content_units?: Array<{
            title: string;
            ecosystem_content_assets?: Array<{ title: string }>;
          }>;
        }>;
      }
    | null;
  const progress = progressResult.data;
  const community = communityResult.data;
  const membership = membershipResult.data;
  const betaSubscription =
    subscriptions.find((item) => item.source_of_activation === "founding_beta") || null;
  const liveSubscription =
    subscriptions.find((item) => item.payment_provider === "mercado_pago_preapproval") || null;
  const effectiveSubscription =
    liveSubscription ||
    subscriptions.find((item) => ["active", "trialing", "paused", "past_due"].includes(item.status)) ||
    betaSubscription ||
    subscriptions[0] ||
    null;

  const hasActiveGrant = grant?.grant_status === "active";
  const hasActiveSubscription =
    effectiveSubscription?.status === "active" || effectiveSubscription?.status === "trialing";
  const hasJoinedCommunity = membership?.status === "active";

  const firstModule = track?.ecosystem_content_modules?.[0];
  const firstUnit = firstModule?.ecosystem_content_units?.[0];
  const firstAsset = firstUnit?.ecosystem_content_assets?.[0];
  const subscription = buildSubscriptionSnapshot({
    betaSubscription,
    liveSubscription,
    effectiveSubscription
  });

  return {
    anchor: {
      title: catalog?.title || "Circulo Essencial",
      subtitle:
        catalog?.subtitle ||
        "Jornada premium inicial do ecossistema em beta privado e controlado.",
      tagline:
        "Uma camada reservada para clareza estrategica, leitura curada e continuidade premium.",
      description:
        catalog?.description ||
        "A primeira jornada premium organiza catalogo, plano, acesso, conteudo e comunidade em uma experiencia privada, nobre e controlada.",
      ctaLabel: subscription.canStartLive
        ? "Ativar assinatura fundadora"
        : hasActiveGrant
          ? "Entrar na experiencia premium"
          : "Solicitar acesso beta",
      statusLabel: hasActiveGrant
        ? subscription.hasLiveProvider
          ? "Assinatura premium ativa"
          : "Acesso fundador preservado"
        : "Beta privado controlado",
      statusTone: getTone(hasActiveGrant, true),
      workspaceLabel: "Hub premium do ecossistema"
    },
    access: {
      hasAccess: hasActiveGrant,
      statusLabel: grant
        ? accessGrantStatusLabels[grant.grant_status as keyof typeof accessGrantStatusLabels]
        : "Sem grant ativo",
      detail: hasActiveGrant
        ? subscription.hasLiveProvider
          ? "O acesso premium agora e sustentado por assinatura recorrente, grants vivos e rastreabilidade de fundador, sem tocar no core juridico."
          : "Seu acesso fundador continua ativo enquanto a transicao controlada para billing live e conduzida com elegancia."
        : "Esta experiencia premium continua protegida por gating semantico entre beta, assinatura live e ausencia de acesso.",
      tone: getTone(hasActiveGrant, true)
    },
    plan: {
      name: plan?.name || "Circulo Essencial",
      headline:
        plan?.headline ||
        "Entrada privada e controlada no ecossistema premium.",
      cadenceLabel: plan
        ? subscriptionCadenceLabels[plan.cadence as keyof typeof subscriptionCadenceLabels]
        : "Mensal",
      statusLabel: plan
        ? ecosystemAvailabilityStatusLabels[
            plan.status as keyof typeof ecosystemAvailabilityStatusLabels
          ] || "Publicado"
        : "Publicado",
      detail: hasActiveSubscription
        ? `Estado da jornada: ${subscription.lifecycleLabel}. ${subscription.nextBillingLabel}.`
        : "O plano agora sustenta billing, entitlement, pausas, cancelamento e continuidade premium dentro da propria camada do ecossistema."
    },
    subscription,
    content: {
      title: track?.title || "Trilha de Clareza Estrategica",
      unitTitle: firstUnit?.title || "Boas-vindas Curadas",
      assetTitle: firstAsset?.title || "Mapa de leitura premium",
      unlocked: hasActiveGrant,
      statusLabel: hasActiveGrant
        ? progress?.status === "completed"
          ? "Conteudo concluido"
          : progress?.status === "in_progress"
            ? "Conteudo em progresso"
            : "Conteudo liberado"
        : "Conteudo reservado",
      detail: hasActiveGrant
        ? "A trilha premium agora conversa com a assinatura, com grants e continuidade de consumo preservados."
        : "A trilha existe como parte da assinatura ancora, mas continua reservada enquanto o entitlement nao estiver ativo."
    },
    community: {
      title: community?.title || "Circulo Reservado",
      statusLabel: membership
        ? communityMemberStatusLabels[
            membership.status as keyof typeof communityMemberStatusLabels
          ] || "Reserva"
        : "Convite reservado",
      detail: hasJoinedCommunity
        ? "A comunidade acompanha a assinatura como camada de permanencia, onboarding e pertencimento, sem virar puxadinho."
        : community?.onboarding_copy ||
          "A comunidade nasce como sala reservada da jornada ancora, com entrada controlada e sem ruir a sobriedade da marca.",
      joined: hasJoinedCommunity
    },
    links: {
      hub: "/cliente/ecossistema",
      benefits: "/cliente/ecossistema/beneficios",
      content: "/cliente/ecossistema/conteudo",
      community: "/cliente/ecossistema/comunidade"
    },
    beta: {
      label: subscription.foundingLabel,
      detail: subscription.detail
    }
  };
}

export async function getInternalPremiumJourneySnapshot(): Promise<InternalPremiumJourneySnapshot> {
  const supabase = await createServerSupabaseClient();

  const [
    catalogResult,
    grantsResult,
    membershipsResult,
    subscriptionsResult,
    progressResult,
    billingEventsResult,
    telemetryResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_catalog_items")
      .select("title,subtitle,availability_status")
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.catalogSlug)
      .maybeSingle(),
    supabase
      .from("ecosystem_access_grants")
      .select("id,grant_status,access_scope")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_community_memberships")
      .select("id,status,access_level")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_subscriptions")
      .select("id,status,source_of_activation,payment_provider,billing_status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_content_progress")
      .select("id,status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_billing_events")
      .select("id,billing_status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("product_events")
      .select("id,event_key")
      .eq("event_group", "ecosystem")
      .in("event_key", [
        "subscription_authorized",
        "founding_live_activated",
        "onboarding_completed",
        "retention_signal"
      ])
      .order("occurred_at", { ascending: false })
      .limit(400)
  ]);

  if (
    catalogResult.error ||
    grantsResult.error ||
    membershipsResult.error ||
    subscriptionsResult.error ||
    progressResult.error ||
    billingEventsResult.error ||
    telemetryResult.error
  ) {
    throw new Error("Nao foi possivel consolidar a leitura interna da jornada premium.");
  }

  const grants = grantsResult.data || [];
  const memberships = membershipsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const progressItems = progressResult.data || [];
  const billingEvents = billingEventsResult.data || [];
  const telemetryEvents = telemetryResult.data || [];
  const betaAudienceCount = subscriptions.filter(
    (item) => item.source_of_activation === "founding_beta"
  ).length;
  const foundingLiveCount = grants.filter((item) => item.access_scope === "founding_live").length;
  const liveSubscribersCount = subscriptions.filter(
    (item) =>
      item.payment_provider === "mercado_pago_preapproval" &&
      ["active", "trialing", "incomplete", "paused", "past_due"].includes(item.status)
  ).length;
  const pendingAuthorizationsCount = subscriptions.filter(
    (item) =>
      item.payment_provider === "mercado_pago_preapproval" &&
      (item.billing_status === "pending_authorization" || item.status === "incomplete")
  ).length;
  const pausedSubscribersCount = subscriptions.filter((item) => item.status === "paused").length;
  const churnRiskCount =
    subscriptions.filter((item) => item.status === "past_due" || item.billing_status === "past_due").length +
    billingEvents.filter((item) => item.billing_status === "past_due").length;
  const activeGrants = grants.filter((item) => item.grant_status === "active").length;
  const onboardingCompletedCount = telemetryEvents.filter(
    (item) => item.event_key === "onboarding_completed"
  ).length;
  const retentionSignalCount = telemetryEvents.filter(
    (item) => item.event_key === "retention_signal"
  ).length;

  return {
    anchorTitle: catalogResult.data?.title || "Circulo Essencial",
    anchorSubtitle:
      catalogResult.data?.subtitle ||
      "Jornada premium inicial do ecossistema em beta privado.",
    statusLabel:
      ecosystemAvailabilityStatusLabels[
        (catalogResult.data?.availability_status || "private_beta") as keyof typeof ecosystemAvailabilityStatusLabels
      ] || "Beta privado",
    betaAudienceCount,
    foundingLiveCount,
    liveSubscribersCount,
    pendingAuthorizationsCount,
    pausedSubscribersCount,
    churnRiskCount,
    activeMemberships: memberships.filter((item) => item.status === "active").length,
    activeSubscriptions: subscriptions.filter((item) => item.status === "active").length,
    activeGrants,
    contentUnlocks: progressItems.length,
    onboardingCompletedCount,
    retentionSignalCount,
    summary:
      "O Circulo Essencial agora enxerga beta fundador, autorizacao live, ativacao fundadora, grants, memberships, onboarding e retencao inicial como uma unica jornada executiva."
  };
}
