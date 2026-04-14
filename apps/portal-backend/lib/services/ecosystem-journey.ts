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
import { getCommunityOperationsBlueprint } from "./ecosystem-community-operations";

export const PREMIUM_JOURNEY_ANCHOR = {
  catalogSlug: "biblioteca-estrategica-premium",
  planCode: "circulo_essencial",
  reservePlanCode: "circulo_reserva",
  trackSlug: "trilha-clareza-estrategica",
  communitySlug: "circulo-reservado"
} as const;

type JourneyTone = "success" | "warning" | "muted" | "critical";
type EntryStage =
  | "active_founder"
  | "invited"
  | "waitlist"
  | "reserved_interest"
  | "deferred"
  | "open_interest";

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
    progressPercent: number;
    completionLabel: string;
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
  entry: {
    stage: EntryStage;
    label: string;
    detail: string;
    statusLabel: string;
    originLabel: string;
    eligibilityLabel: string;
    nextStepLabel: string;
    priorityLabel: string;
    ctaLabel: string;
  };
  reserve: {
    statusLabel: string;
    ladderPosition: string;
    microcopy: string;
    curatorReason: string;
    advancementTiming: string;
    invitationLogic: string;
    prioritySignals: string[];
  };
  paidInterest: {
    headline: string;
    statusLabel: string;
    detail: string;
    nextMove: string;
    signals: string[];
  };
  socialProof: {
    headline: string;
    detail: string;
    markers: string[];
  };
};

export type InternalPremiumJourneySnapshot = {
  anchorTitle: string;
  anchorSubtitle: string;
  statusLabel: string;
  invitedFoundersCount: number;
  activeFoundersCount: number;
  waitlistCount: number;
  reservedInterestCount: number;
  acceptedInvitesCount: number;
  premiumInterestCount: number;
  paidInterestCount: number;
  founderEngagementEvents: number;
  engagedFoundersCount: number;
  activeMemberships: number;
  activeSubscriptions: number;
  activeGrants: number;
  contentUnlocks: number;
  completedContentCount: number;
  averageProgressPercent: number;
  onboardingCompletedCount: number;
  retentionSignalCount: number;
  coolingRiskCount: number;
  siteOriginCount: number;
  articlesOriginCount: number;
  reservedPrioritySignals: number;
  monetizationReadinessSignals: number;
  waitlistQualifiedCount: number;
  editorialOriginCount: number;
  socialDensityScore: number;
  thresholdDistanceSummary: Array<{
    label: string;
    current: number;
    target: number;
    gap: number;
  }>;
  sourceSummary: Array<{
    label: string;
    count: number;
  }>;
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

function readMetadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function prettifyOrigin(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Curadoria interna";
  }

  return value.replaceAll("_", " ");
}

function narrativeValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
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
  const operations = getCommunityOperationsBlueprint();

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
      .select("id,grant_status,access_scope,starts_at,ends_at,metadata,access_origin")
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
      .select("id,status,access_level,last_active_at,metadata,entitlement_origin")
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
  const grantMetadata = readMetadataRecord(grant?.metadata);
  const membershipMetadata = readMetadataRecord(membership?.metadata);
  const subscriptionMetadata = readMetadataRecord(effectiveSubscription?.metadata);
  const founderStage: EntryStage =
    hasActiveGrant &&
    ["founding_beta", "active_founder", "founding_live"].includes(founderAccessScope)
      ? "active_founder"
      : membership?.status === "invited"
        ? "invited"
        : founderAccessScope === "reserved_interest"
          ? "reserved_interest"
        : founderAccessScope === "waitlist"
          ? "waitlist"
          : grantMetadata.entry_state === "deferred"
            ? "deferred"
            : "open_interest";
  const founderOrigin =
    grantMetadata.source_channel ||
    membershipMetadata.source_channel ||
    subscriptionMetadata.source_channel ||
    grant?.access_origin ||
    membership?.entitlement_origin ||
    effectiveSubscription?.source_of_activation ||
    "curadoria_interna";
  const founderPriority =
    grantMetadata.priority_tier ||
    membershipMetadata.priority_tier ||
    subscriptionMetadata.priority_tier ||
    (founderStage === "active_founder"
      ? "prioridade_fundadora"
      : founderStage === "invited"
        ? "janela_curada"
        : founderStage === "reserved_interest"
          ? "prioridade_reservada"
        : founderStage === "waitlist"
          ? "observacao_privada"
          : "avaliacao");
  const founderEligibility = narrativeValue(
    grantMetadata.eligibility_reason ||
      membershipMetadata.eligibility_reason ||
      subscriptionMetadata.eligibility_reason,
    founderStage === "active_founder"
      ? "afinidade alta, entrada aprovada e onboarding em andamento"
      : founderStage === "invited"
        ? "afinidade confirmada e janela de entrada reservada"
        : founderStage === "reserved_interest"
          ? "desejo pago declarado e prioridade curatorial para a proxima chamada"
        : founderStage === "waitlist"
          ? "desejo validado com entrada ainda em observacao"
          : "interesse detectado, aguardando aderencia ao lote"
  );
  const entryLabelMap: Record<EntryStage, string> = {
    active_founder: "Founder ativo",
    invited: "Convite curado aberto",
    waitlist: "Lista privada em andamento",
    reserved_interest: "Reserva prioritaria",
    deferred: "Entrada adiada com elegancia",
    open_interest: "Observacao inicial"
  };
  const entryDetailMap: Record<EntryStage, string> = {
    active_founder:
      "Seu acesso ja foi materializado com grant, membership e onboarding premium ligados ao Circulo Essencial.",
    invited:
      "Seu convite ja existe dentro do lote atual, com entrada pequena, cuidadosa e sem abertura geral.",
    reserved_interest:
      "Seu interesse ja subiu para uma reserva prioritaria, sinalizando apetite real por continuidade futura sem ativar cobranca agora.",
    waitlist:
      "Seu interesse ja entrou na observacao privada do Circulo, com prioridade e contexto preservados.",
    deferred:
      "Seu interesse foi reconhecido, mas a entrada ficou reservada para um momento de aderencia operacional melhor.",
    open_interest:
      "O Circulo continua privado. O portal apresenta o valor da comunidade sem forcar acesso precoce."
  };
  const nextStepMap: Record<EntryStage, string> = {
    active_founder: "Aprofundar onboarding, consumir a trilha inaugural e voltar ao ritual semanal.",
    invited: "Concluir a entrada fundadora pelo portal e ativar a primeira experiencia comunitaria.",
    reserved_interest:
      "Fortalecer sinais de permanencia e aguardar a proxima chamada curada com prioridade alta.",
    waitlist: "Aguardar avaliacao curatorial e fortalecer sinais reais de afinidade e participacao.",
    deferred: "Manter o interesse aquecido pelos canais certos ate surgir aderencia para um lote futuro.",
    open_interest: "Entrar na lista privada com elegancia e deixar o desejo ser lido antes da liberacao."
  };
  const ctaMap: Record<EntryStage, string> = {
    active_founder: "Entrar na experiencia fundadora",
    invited: "Aceitar convite fundador",
    reserved_interest: "Manter prioridade reservada",
    waitlist: "Acompanhar lista privada",
    deferred: "Manter interesse qualificado",
    open_interest: "Pedir observacao curada"
  };
  const reserveStageMap: Record<EntryStage, string> = {
    active_founder: "Founder ativa",
    invited: "Convite reservado",
    waitlist: "Waitlist qualificada",
    reserved_interest: "Reserva prioritaria",
    deferred: "Observacao adiada",
    open_interest: "Interesse inicial"
  };
  const reserveDescriptor =
    operations.reservePolicy.curationStates.find((state) => {
      if (founderStage === "active_founder") {
        return state.key === "active_founder";
      }

      if (founderStage === "invited") {
        return state.key === "invited";
      }

      if (founderStage === "reserved_interest") {
        return state.key === "reserved_priority";
      }

      if (founderStage === "waitlist") {
        return state.key === "qualified_waitlist";
      }

      return state.key === "interested";
    }) || operations.reservePolicy.curationStates[0];

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
      ctaLabel: ctaMap[founderStage],
      statusLabel:
        founderStage === "active_founder"
          ? "Founder ativo em acesso gratuito privado"
          : founderStage === "invited"
            ? "Convite fundador em aberto"
            : founderStage === "reserved_interest"
              ? "Reserva prioritaria em andamento"
            : founderStage === "waitlist"
              ? "Lista privada em observacao"
              : "Private beta com entrada curada",
      statusTone: getTone(hasActiveGrant, true),
      workspaceLabel: "Hub premium do ecossistema"
    },
    access: {
      hasAccess: hasActiveGrant,
      statusLabel:
        founderStage === "reserved_interest"
          ? "Reserva prioritaria"
          : founderStage === "waitlist"
          ? "Waitlist privada"
          : founderStage === "invited"
            ? "Convite fundador"
            : grant
              ? accessGrantStatusLabels[grant.grant_status as keyof typeof accessGrantStatusLabels]
              : "Sem grant ativo",
      detail: hasActiveGrant
        ? `Seu acesso fundador esta ativo com escopo ${founderAccessScope}, preservando comunidade, conteudo e valor percebido sem ativar cobranca agora.`
        : founderStage === "invited"
          ? "Seu convite ja esta reservado no lote atual. O proximo passo e concluir a entrada com a mesma linguagem premium usada para os founders ja ativos."
          : founderStage === "reserved_interest"
            ? "Seu interesse ja foi promovido para a camada de reserva prioritaria, sinalizando continuidade e apetite por uma futura chamada fundadora paga."
          : founderStage === "waitlist"
            ? "Seu interesse esta materializado na lista privada com prioridade curatorial, sem prometer entrada imediata nem transformar a experiencia em fila generica."
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
        : "A trilha existe como ativo fundador reservado, liberado apenas via curadoria para aumentar desejo e coerencia.",
      progressPercent: progress?.progress_percent || 0,
      completionLabel:
        progress?.status === "completed"
          ? "Jornada inaugural concluida"
          : progress?.status === "in_progress"
            ? `Progresso atual: ${progress?.progress_percent || 0}%`
            : "Primeiro passo aguardando inicio"
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
    },
    entry: {
      stage: founderStage,
      label: entryLabelMap[founderStage],
      detail: entryDetailMap[founderStage],
      statusLabel: founderStage.replaceAll("_", " "),
      originLabel: prettifyOrigin(founderOrigin),
      eligibilityLabel: founderEligibility,
      nextStepLabel: nextStepMap[founderStage],
      priorityLabel: prettifyOrigin(founderPriority),
      ctaLabel: ctaMap[founderStage]
    },
    reserve: {
      statusLabel: reserveStageMap[founderStage],
      ladderPosition: reserveDescriptor.label,
      microcopy: reserveDescriptor.microcopy,
      curatorReason: reserveDescriptor.curatorReason,
      advancementTiming: reserveDescriptor.promotionTiming,
      invitationLogic: operations.reservePolicy.invitationLogic,
      prioritySignals: operations.waitlistPolicy.prioritySignals
    },
    paidInterest: {
      headline: operations.paidInterestPolicy.headline,
      statusLabel:
        founderStage === "reserved_interest"
          ? "Interesse futuro pago materializado"
          : founderStage === "active_founder"
            ? "Continuidade futura em prova"
            : "Interesse futuro pago em leitura",
      detail:
        founderStage === "reserved_interest"
          ? "Seu interesse ja foi reconhecido como prioridade para a proxima chamada fundadora, sem ativar cobranca agora."
          : founderStage === "active_founder"
            ? "Seu uso e retorno ajudam a provar que a futura cobranca pode nascer com valor e desejo reais."
            : "O portal separa curiosidade de vontade concreta de permanecer quando o plano fundador futuro abrir.",
      nextMove:
        founderStage === "reserved_interest"
          ? "Seguir presente e alinhada para converter prioridade reservada em convite curado no lote certo."
          : founderStage === "active_founder"
            ? "Continuar voltando, consumindo e reforcando a prova social viva da comunidade."
            : "Fortalecer origem, afinidade e sinais de permanencia antes de qualquer convite.",
      signals: operations.paidInterestPolicy.explicitSignals.map((signal) => signal.label)
    },
    socialProof: {
      headline: "A prova do Circulo cresce pela vida da comunidade, nao por barulho comercial.",
      detail:
        founderStage === "active_founder"
          ? "Seu progresso, sua presenca e seu retorno semanal viram parte da densidade social que sustenta a futura monetizacao."
          : "A reserva existe para proteger uma comunidade viva e desejada, nao para encenar escassez vazia.",
      markers: operations.socialDensityLevers.map((lever) => lever.visibleProof)
    }
  };
}

export async function getInternalPremiumJourneySnapshot(): Promise<InternalPremiumJourneySnapshot> {
  const supabase = await createServerSupabaseClient();
  const operations = getCommunityOperationsBlueprint();

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
      .select("id,grant_status,access_scope,metadata,access_origin")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_community_memberships")
      .select("id,status,access_level,metadata,entitlement_origin")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_subscriptions")
      .select("id,status,source_of_activation,payment_provider,billing_status,metadata")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ecosystem_content_progress")
      .select("id,status,progress_percent")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("product_events")
      .select("id,event_key")
      .eq("event_group", "ecosystem")
      .in("event_key", [
        "member_invited",
        "member_joined",
        "onboarding_completed",
        "retention_signal",
        "premium_interest_signal",
        "paid_interest_signal",
        "reserved_priority_signal",
        "monetization_readiness_signal",
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
  const reservedInterestCount = grants.filter(
    (item) => item.access_scope === "reserved_interest"
  ).length;
  const activeGrants = grants.filter((item) => item.grant_status === "active").length;
  const completedContentCount = progressItems.filter((item) => item.status === "completed").length;
  const totalProgressPercent = progressItems.reduce(
    (sum, item) => sum + (typeof item.progress_percent === "number" ? item.progress_percent : 0),
    0
  );
  const averageProgressPercent =
    progressItems.length > 0 ? Math.round(totalProgressPercent / progressItems.length) : 0;
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
  const reservedPrioritySignals = telemetryEvents.filter(
    (item) => item.event_key === "reserved_priority_signal"
  ).length;
  const monetizationReadinessSignals = telemetryEvents.filter(
    (item) => item.event_key === "monetization_readiness_signal"
  ).length;
  const founderEngagementEvents = telemetryEvents.filter(
    (item) => item.event_key === "founder_engagement_score"
  ).length;
  const engagedFoundersCount = Math.min(
    activeFoundersCount,
    telemetryEvents.filter(
      (item) =>
        item.event_key === "founder_engagement_score" || item.event_key === "member_active"
    ).length
  );
  const acceptedInvitesCount = telemetryEvents.filter(
    (item) => item.event_key === "member_joined"
  ).length;
  const coolingRiskCount = Math.max(activeFoundersCount - engagedFoundersCount, 0);
  const sourceCounts = new Map<string, number>();
  const incrementSource = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) {
      return;
    }

    sourceCounts.set(value, (sourceCounts.get(value) || 0) + 1);
  };

  for (const grant of grants) {
    const metadata = readMetadataRecord(grant.metadata);
    incrementSource(metadata.source_channel || grant.access_origin);
  }

  for (const membership of memberships) {
    const metadata = readMetadataRecord(membership.metadata);
    incrementSource(metadata.source_channel || membership.entitlement_origin);
  }

  for (const subscription of subscriptions) {
    const metadata = readMetadataRecord(subscription.metadata);
    incrementSource(metadata.source_channel || subscription.source_of_activation);
  }

  const siteOriginCount =
    (sourceCounts.get("site_curated_entry") || 0) + (sourceCounts.get("site_editorial_bridge") || 0);
  const articlesOriginCount =
    (sourceCounts.get("articles_private_interest") || 0) +
    (sourceCounts.get("articles_editorial_bridge") || 0);
  const waitlistQualifiedCount = waitlistCount + reservedInterestCount;
  const editorialOriginCount = siteOriginCount + articlesOriginCount;
  const socialDensityScore =
    activeFoundersCount * 4 +
    engagedFoundersCount * 5 +
    completedContentCount * 3 +
    reservedInterestCount * 2 +
    founderEngagementEvents +
    retentionSignalCount;
  const readinessCurrent: Record<string, number> = {
    active_founders: activeFoundersCount,
    engaged_founders: engagedFoundersCount,
    average_progress_percent: averageProgressPercent,
    completed_content_count: completedContentCount,
    qualified_waitlist: waitlistQualifiedCount,
    editorial_origin_signals: editorialOriginCount,
    paid_interest_signals: paidInterestCount,
    cooling_risk_count: coolingRiskCount
  };
  const thresholdDistanceSummary = operations.readinessThresholds.map((threshold) => {
    const current = readinessCurrent[threshold.key] ?? 0;
    return {
      label: threshold.label,
      current,
      target: threshold.target,
      gap: Math.max(threshold.target - current, 0)
    };
  });

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
    reservedInterestCount,
    acceptedInvitesCount,
    premiumInterestCount,
    paidInterestCount,
    reservedPrioritySignals,
    monetizationReadinessSignals,
    founderEngagementEvents,
    engagedFoundersCount,
    activeMemberships: memberships.filter((item) => item.status === "active").length,
    activeSubscriptions: subscriptions.filter((item) => item.status === "active").length,
    activeGrants,
    contentUnlocks: progressItems.length,
    completedContentCount,
    averageProgressPercent,
    onboardingCompletedCount,
    retentionSignalCount,
    coolingRiskCount,
    siteOriginCount,
    articlesOriginCount,
    waitlistQualifiedCount,
    editorialOriginCount,
    socialDensityScore,
    thresholdDistanceSummary,
    sourceSummary: Array.from(sourceCounts.entries())
      .map(([label, count]) => ({
        label: prettifyOrigin(label),
        count
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5),
    summary:
      "O Circulo Essencial agora enxerga founder ativo, convites, waitlist, reserva prioritaria, paid interest, densidade social, onboarding, valor consumido, retencao, desejo e prontidao futura para monetizacao como uma unica jornada executiva."
  };
}
