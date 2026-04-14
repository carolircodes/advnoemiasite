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
  waitlistMode: boolean;
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
  invitedFoundersCount: number;
  activeFoundersCount: number;
  waitlistCount: number;
  premiumInterestCount: number;
  paidInterestCount: number;
  founderEngagementEvents: number;
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
    case "beta_manual":
      return "Comunidade fundadora gratuita";
    case "live_ready":
      return "Arquitetura paga preservada";
    default:
      return status ? status.replaceAll("_", " ") : "Monetizacao futura preservada";
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
  const lifecycleLabel = betaFounding
    ? "Founder ativo"
    : effectiveSubscription
      ? subscriptionStatusLabels[
          effectiveSubscription.status as keyof typeof subscriptionStatusLabels
        ] || "Jornada estruturada"
      : "Acesso privado em curadoria";

  return {
    hasLiveProvider,
    lifecycleLabel,
    billingLabel: getBillingLabel(liveBillingStatus || betaSubscription?.billing_status || null),
    foundingLabel: betaFounding
      ? "Founding beta preservado"
      : hasLiveProvider
        ? "Assinante live"
        : "Entrada privada em avaliacao",
    detail: hasLiveProvider
      ? "A arquitetura de recorrencia permanece pronta, mas a decisao estrategica agora e manter o Circulo Essencial gratuito, privado e fundador ate que o desejo e a confianca amadurecam."
      : betaFounding
        ? "A jornada fundadora continua gratuita por enquanto, com curadoria alta, valor crescente e monetizacao futura preservada em estado dormente."
        : "A camada premium permanece privada, com entrada curada, waitlist elegante e possibilidade de evolucao futura para oferta paga.",
    nextBillingLabel: effectiveSubscription?.next_billing_at
      ? `Arquitetura recorrente preservada ate ${formatDate(effectiveSubscription.next_billing_at)}`
      : "Sem cobranca ativa no momento",
    canStartLive: false,
    canPause: false,
    canResume: false,
    canCancel: false,
    providerLabel: hasLiveProvider ? "Recorrencia preservada" : "Curadoria fundadora",
    startHref: "/cliente/ecossistema/beneficios",
    pauseHref: "/cliente/ecossistema/beneficios",
    resumeHref: "/cliente/ecossistema/beneficios",
    cancelHref: "/cliente/ecossistema/beneficios",
    syncHref: "/cliente/ecossistema/beneficios",
    waitlistMode: !betaFounding && !hasLiveProvider
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
  const founderAccessScope = grant?.access_scope || "waitlist";
  const founderMembershipLevel = membership?.access_level || "waitlist";

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
        "Comunidade fundadora gratuita, privada e curada do ecossistema.",
      tagline:
        "Uma camada reservada para pertencimento, clareza estrategica e valor antes da cobranca.",
      description:
        catalog?.description ||
        "O Circulo Essencial organiza acesso fundador, conteudo, comunidade e desejo futuro pago em uma experiencia gratuita, privada e altamente curada.",
      ctaLabel: hasActiveGrant
        ? "Entrar na experiencia fundadora"
        : "Entrar na lista privada",
      statusLabel: hasActiveGrant
        ? "Founder ativo em acesso gratuito privado"
        : "Private beta com entrada curada",
      statusTone: getTone(hasActiveGrant, true),
      workspaceLabel: "Hub premium do ecossistema"
    },
    access: {
      hasAccess: hasActiveGrant,
      statusLabel: grant
        ? accessGrantStatusLabels[grant.grant_status as keyof typeof accessGrantStatusLabels]
        : "Sem grant ativo",
      detail: hasActiveGrant
        ? `Seu acesso fundador esta ativo com escopo ${founderAccessScope}, preservando comunidade, conteudo e valor percebido sem ativar cobranca agora.`
        : "Esta experiencia premium continua protegida por curadoria, waitlist elegante e gating semantico entre founder ativo, convidado e interesse futuro.",
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
        ? `Estado da jornada: ${subscription.lifecycleLabel}. Gratuito agora, privado por curadoria e com monetizacao futura preservada.`
        : "A arquitetura paga permanece pronta, mas fica dormente enquanto a comunidade fundadora valida desejo, permanencia e valor percebido."
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
        ? "A trilha premium agora conversa com a experiencia fundadora gratuita, com continuidade de consumo e percepcao de valor preservadas."
        : "A trilha existe como ativo fundador reservado, liberado apenas via curadoria para aumentar desejo e coerencia."
    },
    community: {
      title: community?.title || "Circulo Reservado",
      statusLabel: membership
        ? communityMemberStatusLabels[
            membership.status as keyof typeof communityMemberStatusLabels
          ] || "Reserva"
        : "Convite reservado",
      detail: hasJoinedCommunity
        ? `A comunidade acompanha a experiencia fundadora como camada de permanencia, onboarding e pertencimento. Nivel atual: ${founderMembershipLevel}.`
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
      label: hasActiveGrant ? "Founder privado ativo" : "Entrada em curadoria",
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
      .from("product_events")
      .select("id,event_key")
      .eq("event_group", "ecosystem")
      .in("event_key", [
        "member_invited",
        "onboarding_completed",
        "retention_signal",
        "premium_interest_signal",
        "paid_interest_signal",
        "founder_engagement_score"
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
    telemetryResult.error
  ) {
    throw new Error("Nao foi possivel consolidar a leitura interna da jornada premium.");
  }

  const grants = grantsResult.data || [];
  const memberships = membershipsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const progressItems = progressResult.data || [];
  const telemetryEvents = telemetryResult.data || [];
  const invitedFoundersCount = memberships.filter((item) => item.status === "invited").length;
  const activeFoundersCount = grants.filter(
    (item) =>
      item.grant_status === "active" &&
      ["founding_beta", "active_founder", "founding_live"].includes(item.access_scope)
  ).length;
  const waitlistCount = grants.filter((item) => item.access_scope === "waitlist").length;
  const activeGrants = grants.filter((item) => item.grant_status === "active").length;
  const onboardingCompletedCount = telemetryEvents.filter(
    (item) => item.event_key === "onboarding_completed"
  ).length;
  const retentionSignalCount = telemetryEvents.filter(
    (item) => item.event_key === "retention_signal"
  ).length;
  const premiumInterestCount = telemetryEvents.filter(
    (item) => item.event_key === "premium_interest_signal"
  ).length;
  const paidInterestCount = telemetryEvents.filter(
    (item) => item.event_key === "paid_interest_signal"
  ).length;
  const founderEngagementEvents = telemetryEvents.filter(
    (item) => item.event_key === "founder_engagement_score"
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
    invitedFoundersCount,
    activeFoundersCount,
    waitlistCount,
    premiumInterestCount,
    paidInterestCount,
    founderEngagementEvents,
    activeMemberships: memberships.filter((item) => item.status === "active").length,
    activeSubscriptions: subscriptions.filter((item) => item.status === "active").length,
    activeGrants,
    contentUnlocks: progressItems.length,
    onboardingCompletedCount,
    retentionSignalCount,
    summary:
      "O Circulo Essencial agora enxerga founder ativo, convites, onboarding, valor consumido, retencao, desejo e prontidao futura para monetizacao como uma unica jornada executiva."
  };
}
