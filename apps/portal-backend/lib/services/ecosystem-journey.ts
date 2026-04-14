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
  activeMemberships: number;
  activeSubscriptions: number;
  contentUnlocks: number;
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

export async function getClientPremiumJourney(
  profile: PortalProfile
): Promise<ClientPremiumJourneySnapshot> {
  const supabase = await createServerSupabaseClient();

  const [
    catalogResult,
    planResult,
    subscriptionResult,
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
      .select("id,name,headline,description,cadence,status,metadata")
      .eq("code", PREMIUM_JOURNEY_ANCHOR.planCode)
      .maybeSingle(),
    supabase
      .from("ecosystem_subscriptions")
      .select("id,status,cadence,current_period_ends_at,renewal_mode,metadata")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  if (subscriptionResult.error) {
    throw new Error(`Nao foi possivel carregar a assinatura beta: ${subscriptionResult.error.message}`);
  }

  if (grantResult.error) {
    throw new Error(`Nao foi possivel carregar o grant beta: ${grantResult.error.message}`);
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
  const subscription = subscriptionResult.data;
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

  const hasActiveGrant = grant?.grant_status === "active";
  const hasActiveSubscription = subscription?.status === "active";
  const hasJoinedCommunity = membership?.status === "active";

  const firstModule = track?.ecosystem_content_modules?.[0];
  const firstUnit = firstModule?.ecosystem_content_units?.[0];
  const firstAsset = firstUnit?.ecosystem_content_assets?.[0];

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
      ctaLabel: hasActiveGrant ? "Entrar na experiencia premium" : "Solicitar acesso beta",
      statusLabel: hasActiveGrant ? "Acesso beta liberado" : "Beta privado controlado",
      statusTone: getTone(hasActiveGrant, true),
      workspaceLabel: "Hub premium do ecossistema"
    },
    access: {
      hasAccess: hasActiveGrant,
      statusLabel: grant
        ? accessGrantStatusLabels[grant.grant_status as keyof typeof accessGrantStatusLabels]
        : "Sem grant ativo",
      detail: hasActiveGrant
        ? "Seu acesso foi concedido manualmente para a primeira jornada premium, sem misturar essa liberacao com o core juridico."
        : "Esta experiencia premium esta em beta privado. O portal distingue com clareza entre arquitetura pronta e acesso ainda nao liberado.",
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
          ] || "Beta privado"
        : "Beta privado",
      detail: hasActiveSubscription
        ? `Estado da jornada: ${subscriptionStatusLabels[subscription.status as keyof typeof subscriptionStatusLabels]}.`
        : "Nesta fase, o plano organiza acesso, beneficio e framing de valor sem ativar cobranca recorrente operacional."
    },
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
        ? "A trilha premium foi conectada ao grant beta e pode ser consumida com clareza, progresso e linguagem de ecossistema."
        : "A trilha existe e sustenta a jornada ancora, mas continua reservada enquanto o acesso beta nao for concedido."
    },
    community: {
      title: community?.title || "Circulo Reservado",
      statusLabel: membership
        ? communityMemberStatusLabels[
            membership.status as keyof typeof communityMemberStatusLabels
          ] || "Reserva"
        : "Convite reservado",
      detail: hasJoinedCommunity
        ? "A comunidade funciona como extensao natural da jornada premium, conectando permanencia, pertencimento e continuidade."
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
      label: "Beta privado elegante",
      detail:
        "A primeira jornada premium esta ativa com controle de acesso manual, framing nobre e escopo contido para validar valor percebido antes de qualquer abertura maior."
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
    progressResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_catalog_items")
      .select("title,subtitle,availability_status")
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.catalogSlug)
      .maybeSingle(),
    supabase
      .from("ecosystem_access_grants")
      .select("id,grant_status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_community_memberships")
      .select("id,status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_subscriptions")
      .select("id,status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_content_progress")
      .select("id,status")
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

  if (catalogResult.error || grantsResult.error || membershipsResult.error || subscriptionsResult.error || progressResult.error) {
    throw new Error("Nao foi possivel consolidar a leitura interna da jornada premium.");
  }

  const grants = grantsResult.data || [];
  const memberships = membershipsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const progressItems = progressResult.data || [];

  return {
    anchorTitle: catalogResult.data?.title || "Circulo Essencial",
    anchorSubtitle:
      catalogResult.data?.subtitle ||
      "Jornada premium inicial do ecossistema em beta privado.",
    statusLabel:
      ecosystemAvailabilityStatusLabels[
        (catalogResult.data?.availability_status || "private_beta") as keyof typeof ecosystemAvailabilityStatusLabels
      ] || "Beta privado",
    betaAudienceCount: grants.filter((item) => item.grant_status === "active").length,
    activeMemberships: memberships.filter((item) => item.status === "active").length,
    activeSubscriptions: subscriptions.filter((item) => item.status === "active").length,
    contentUnlocks: progressItems.length,
    summary:
      "A ancora premium agora tem framing, grant controlado, plano-base, trilha e comunidade conectados para um beta privado elegante."
  };
}
