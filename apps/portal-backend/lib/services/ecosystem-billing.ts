import "server-only";

import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from "mercadopago";

import type { PortalProfile } from "../auth/guards.ts";
import { getServerEnv } from "../config/env.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";
import { PREMIUM_JOURNEY_ANCHOR } from "./ecosystem-journey.ts";

type LifecycleAction = "pause" | "resume" | "cancel" | "sync";

type SubscriptionRow = {
  id: string;
  profile_id: string;
  plan_tier_id: string;
  status: string;
  renewal_mode: string;
  cadence: string;
  payment_provider: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  trial_ends_at: string | null;
  paused_at: string | null;
  canceled_at: string | null;
  cancel_at: string | null;
  billing_status: string | null;
  billing_provider_reference: string | null;
  billing_provider_plan_reference: string | null;
  source_of_activation: string | null;
  renewal_due_at: string | null;
  next_billing_at: string | null;
  last_billing_event_at: string | null;
  billing_metadata: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

type BillingPlanRow = {
  id: string;
  code: string;
  name: string;
  headline: string;
  description: string | null;
  cadence: string;
  price_amount: number | null;
  currency_code: string;
  billing_provider: string | null;
  billing_plan_reference: string | null;
  billing_status: string | null;
  billing_metadata: Record<string, unknown> | null;
  grace_period_days?: number | null;
};

type BillingPlanBootstrapResult = {
  providerPlanId: string;
  providerStatus: string;
};

type CheckoutStartResult = {
  checkoutUrl: string;
  subscriptionId: string;
  providerReference: string;
  providerPlanReference: string;
  foundingTransition: boolean;
};

type SyncResult = {
  subscriptionId: string;
  previousStatus: string | null;
  nextStatus: string;
  billingStatus: string;
  accessGrantStatus: string;
  membershipStatus: string;
};

const BILLING_PROVIDER = "mercado_pago_preapproval";
const PLAN_REASON = "Circulo Essencial | assinatura premium do ecossistema";
const ACTIVATION_PHASE = "12.4";

function createMercadoPagoClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado para recorrencia premium.");
  }

  return new MercadoPagoConfig({
    accessToken
  });
}

function getBaseUrl() {
  const env = getServerEnv();
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

function safeNow() {
  return new Date().toISOString();
}

function asJson(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toMoney(value: number | null | undefined) {
  if (typeof value !== "number") {
    return 0;
  }

  return Number(value.toFixed(2));
}

function cadenceToMercadoPago(cadence: string) {
  switch (cadence) {
    case "monthly":
      return { frequency: 1, frequency_type: "months" };
    case "quarterly":
      return { frequency: 3, frequency_type: "months" };
    case "semiannual":
      return { frequency: 6, frequency_type: "months" };
    case "annual":
      return { frequency: 12, frequency_type: "months" };
    default:
      return { frequency: 1, frequency_type: "months" };
  }
}

function mapPreapprovalStatus(providerStatus: string | null | undefined) {
  switch ((providerStatus || "").toLowerCase()) {
    case "authorized":
    case "active":
      return { subscriptionStatus: "active", billingStatus: "authorized" };
    case "paused":
      return { subscriptionStatus: "paused", billingStatus: "paused" };
    case "cancelled":
    case "canceled":
      return { subscriptionStatus: "canceled", billingStatus: "canceled" };
    case "pending":
    case "pending_charges":
    case "in_process":
      return { subscriptionStatus: "incomplete", billingStatus: "pending_authorization" };
    default:
      return { subscriptionStatus: "incomplete", billingStatus: providerStatus || "unknown" };
  }
}

function shouldKeepAccessUntilPeriodEnd(subscription: SubscriptionRow) {
  if (subscription.status !== "canceled" && subscription.status !== "expired") {
    return false;
  }

  if (!subscription.current_period_ends_at) {
    return false;
  }

  return new Date(subscription.current_period_ends_at).getTime() > Date.now();
}

function deriveEntitlementState(subscription: SubscriptionRow) {
  if (subscription.status === "active" || subscription.status === "trialing") {
    return {
      accessGrantStatus: "active",
      membershipStatus: "active"
    };
  }

  if (shouldKeepAccessUntilPeriodEnd(subscription)) {
    return {
      accessGrantStatus: "active",
      membershipStatus: "active"
    };
  }

  if (subscription.status === "paused" || subscription.status === "past_due" || subscription.status === "incomplete") {
    return {
      accessGrantStatus: "paused",
      membershipStatus: "paused"
    };
  }

  return {
    accessGrantStatus: "expired",
    membershipStatus: "left"
  };
}

function deriveFoundingAccessScope(subscription: SubscriptionRow, existingScope?: string | null) {
  const source = subscription.source_of_activation || "";

  if (source.includes("founding") || existingScope === "founding_beta" || existingScope === "founding_live") {
    return subscription.payment_provider === BILLING_PROVIDER ? "founding_live" : "founding_beta";
  }

  return "live_subscriber";
}

async function insertBillingEvent(input: {
  subscriptionId?: string | null;
  profileId?: string | null;
  planTierId?: string | null;
  provider: string;
  providerEventType: string;
  providerStatus?: string | null;
  billingStatus?: string | null;
  providerReference?: string | null;
  externalReference?: string | null;
  amount?: number | null;
  currencyCode?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createAdminSupabaseClient();

  await supabase.from("ecosystem_billing_events").insert({
    subscription_id: input.subscriptionId || null,
    profile_id: input.profileId || null,
    plan_tier_id: input.planTierId || null,
    provider: input.provider,
    provider_event_type: input.providerEventType,
    provider_status: input.providerStatus || null,
    billing_status: input.billingStatus || null,
    provider_reference: input.providerReference || null,
    external_reference: input.externalReference || null,
    amount: input.amount ?? null,
    currency_code: input.currencyCode || "BRL",
    payload: input.payload || {}
  });
}

async function insertRecurringTelemetry(input: {
  profileId?: string | null;
  eventKey: string;
  pagePath: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = createAdminSupabaseClient();

  await supabase.from("product_events").insert({
    event_key: input.eventKey,
    event_group: "ecosystem",
    profile_id: input.profileId || null,
    page_path: input.pagePath,
    payload: input.payload || {}
  });
}

async function getAnchorEntities() {
  const supabase = createAdminSupabaseClient();

  const [catalogResult, planResult, communityResult] = await Promise.all([
    supabase
      .from("ecosystem_catalog_items")
      .select("id,slug,title")
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.catalogSlug)
      .single(),
    supabase
      .from("ecosystem_plan_tiers")
      .select(
        "id,code,name,headline,description,cadence,price_amount,currency_code,billing_provider,billing_plan_reference,billing_status,billing_metadata,grace_period_days"
      )
      .eq("code", PREMIUM_JOURNEY_ANCHOR.planCode)
      .single(),
    supabase
      .from("ecosystem_communities")
      .select("id,slug,title")
      .eq("slug", PREMIUM_JOURNEY_ANCHOR.communitySlug)
      .single()
  ]);

  if (catalogResult.error || planResult.error || communityResult.error) {
    throw new Error("Nao foi possivel carregar a ancora premium para recorrencia.");
  }

  return {
    catalog: catalogResult.data,
    plan: planResult.data as BillingPlanRow,
    community: communityResult.data
  };
}

async function resolvePlanInitPoint(planReference: string) {
  const mercadopago = createMercadoPagoClient();
  const providerPlan = new PreApprovalPlan(mercadopago);
  const response = await providerPlan.get({
    preApprovalPlanId: planReference
  });

  return response.init_point || null;
}

export async function ensureCirculoEssencialBillingPlan(): Promise<BillingPlanBootstrapResult> {
  const supabase = createAdminSupabaseClient();
  const mercadopago = createMercadoPagoClient();
  const { plan } = await getAnchorEntities();
  const providerPlan = new PreApprovalPlan(mercadopago);
  const baseUrl = getBaseUrl();
  const cadence = cadenceToMercadoPago(plan.cadence);
  const amount = toMoney(plan.price_amount);

  let providerPlanId = plan.billing_plan_reference || "";
  let providerStatus = "authorized";
  let providerInitPoint =
    typeof plan.billing_metadata?.init_point === "string"
      ? plan.billing_metadata.init_point
      : null;

  if (!providerPlanId) {
    const response = await providerPlan.create({
      body: {
        reason: PLAN_REASON,
        status: "active",
        back_url: `${baseUrl}/cliente/ecossistema/beneficios`,
        auto_recurring: {
          ...cadence,
          transaction_amount: amount,
          currency_id: plan.currency_code || "BRL"
        }
      }
    });

    if (!response.id) {
      throw new Error("Mercado Pago nao retornou o id do plano recorrente.");
    }

    providerPlanId = response.id;
    providerStatus = response.status || "active";
    providerInitPoint = response.init_point || null;
  } else if (!providerInitPoint) {
    providerInitPoint = await resolvePlanInitPoint(providerPlanId);
  }

  const nextMetadata = {
    ...(plan.billing_metadata || {}),
    phase: ACTIVATION_PHASE,
    provider_plan_ready: true,
    anchor_subscription_plan: true,
    init_point: providerInitPoint
  };

  const { error } = await supabase
    .from("ecosystem_plan_tiers")
    .update({
      billing_provider: BILLING_PROVIDER,
      billing_plan_reference: providerPlanId,
      billing_status: "live_ready",
      billing_activated_at: safeNow(),
      billing_metadata: nextMetadata,
      metadata: {
        ...asJson(plan.billing_metadata),
        phase: ACTIVATION_PHASE,
        billing_mode: "operational_live"
      }
    })
    .eq("id", plan.id);

  if (error) {
    throw new Error(`Nao foi possivel salvar o plano recorrente: ${error.message}`);
  }

  return {
    providerPlanId,
    providerStatus
  };
}

async function getLatestAnchorSubscriptions(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { plan } = await getAnchorEntities();
  const { data, error } = await supabase
    .from("ecosystem_subscriptions")
    .select("*")
    .eq("profile_id", profileId)
    .eq("plan_tier_id", plan.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Nao foi possivel carregar as assinaturas da ancora: ${error.message}`);
  }

  return (data || []) as SubscriptionRow[];
}

export async function startCirculoEssencialSubscriptionCheckout(
  profile: PortalProfile
): Promise<CheckoutStartResult> {
  const supabase = createAdminSupabaseClient();
  const { plan } = await getAnchorEntities();
  const billingPlan = await ensureCirculoEssencialBillingPlan();
  const subscriptions = await getLatestAnchorSubscriptions(profile.id);
  const foundingBeta = subscriptions.find((item) => item.source_of_activation === "founding_beta");
  const checkoutUrl =
    typeof plan.billing_metadata?.init_point === "string"
      ? plan.billing_metadata.init_point
      : await resolvePlanInitPoint(billingPlan.providerPlanId);

  if (!checkoutUrl) {
    throw new Error("Mercado Pago nao retornou init_point para o plano recorrente live.");
  }

  await insertBillingEvent({
    subscriptionId: null,
    profileId: profile.id,
    planTierId: plan.id,
    provider: BILLING_PROVIDER,
    providerEventType: "checkout_ready",
    providerStatus: "live_ready",
    billingStatus: "checkout_ready",
    providerReference: billingPlan.providerPlanId,
    externalReference: null,
    amount: toMoney(plan.price_amount),
    currencyCode: plan.currency_code,
    payload: {
      phase: ACTIVATION_PHASE,
      init_point: checkoutUrl,
      founding_transition: Boolean(foundingBeta),
      operation_mode: "controlled_founding_live"
    }
  });

  await insertRecurringTelemetry({
    profileId: profile.id,
    eventKey: "subscription_interest",
    pagePath: "/cliente/ecossistema/beneficios",
    payload: {
      phase: ACTIVATION_PHASE,
      journey: "circulo_essencial",
      founding_transition: Boolean(foundingBeta),
      provider: BILLING_PROVIDER,
      operation_mode: "controlled_founding_live"
    }
  });

  return {
    checkoutUrl,
    subscriptionId: foundingBeta?.id || "",
    providerReference: billingPlan.providerPlanId,
    providerPlanReference: billingPlan.providerPlanId,
    foundingTransition: Boolean(foundingBeta)
  };
}

export async function syncSubscriptionEntitlementsById(
  subscriptionId: string,
  source: string
): Promise<SyncResult> {
  const supabase = createAdminSupabaseClient();
  const { catalog, community, plan } = await getAnchorEntities();
  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from("ecosystem_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (subscriptionError || !subscriptionData) {
    throw new Error(subscriptionError?.message || "Assinatura nao encontrada para sincronizacao.");
  }

  const subscription = subscriptionData as SubscriptionRow;
  const entitlement = deriveEntitlementState(subscription);
  const { data: grantData } = await supabase
    .from("ecosystem_access_grants")
    .select("id,grant_status,access_scope,metadata")
    .eq("profile_id", subscription.profile_id)
    .eq("catalog_item_id", catalog.id)
    .maybeSingle();
  const { data: membershipData } = await supabase
    .from("ecosystem_community_memberships")
    .select("id,status,access_level,metadata")
    .eq("profile_id", subscription.profile_id)
    .eq("community_id", community.id)
    .maybeSingle();

  const accessScope = deriveFoundingAccessScope(subscription, grantData?.access_scope || null);
  const membershipLevel =
    accessScope === "founding_live" ? "founding_live" : accessScope === "founding_beta" ? "founding_beta" : "member";

  if (grantData?.id) {
    await supabase
      .from("ecosystem_access_grants")
      .update({
        subscription_id: subscription.id,
        source_type: BILLING_PROVIDER,
        grant_status: entitlement.accessGrantStatus,
        access_scope: accessScope,
        access_origin: "subscription_lifecycle",
        last_synced_at: safeNow(),
        ends_at:
          entitlement.accessGrantStatus === "expired"
            ? subscription.current_period_ends_at || safeNow()
            : null,
        metadata: {
          ...asJson(grantData.metadata),
          phase: ACTIVATION_PHASE,
          entitlement_source: source,
          billing_status: subscription.billing_status,
          live_subscription_id: subscription.id
        }
      })
      .eq("id", grantData.id);
  } else {
    await supabase.from("ecosystem_access_grants").insert({
      profile_id: subscription.profile_id,
      catalog_item_id: catalog.id,
      subscription_id: subscription.id,
      source_type: BILLING_PROVIDER,
      grant_status: entitlement.accessGrantStatus,
      portal_workspace: "ecosystem_hub",
      access_scope: accessScope,
      starts_at: safeNow(),
      ends_at:
        entitlement.accessGrantStatus === "expired"
          ? subscription.current_period_ends_at || safeNow()
          : null,
      access_origin: "subscription_lifecycle",
      last_synced_at: safeNow(),
      metadata: {
        phase: ACTIVATION_PHASE,
        entitlement_source: source,
        billing_status: subscription.billing_status,
        live_subscription_id: subscription.id
      }
    });
  }

  if (membershipData?.id) {
    await supabase
      .from("ecosystem_community_memberships")
      .update({
        subscription_id: subscription.id,
        status: entitlement.membershipStatus,
        access_level: membershipLevel,
        entitlement_origin: "subscription_lifecycle",
        left_at: entitlement.membershipStatus === "left" ? safeNow() : null,
        metadata: {
          ...asJson(membershipData.metadata),
          phase: ACTIVATION_PHASE,
          entitlement_source: source,
          live_subscription_id: subscription.id
        }
      })
      .eq("id", membershipData.id);
  } else {
    await supabase.from("ecosystem_community_memberships").insert({
      profile_id: subscription.profile_id,
      community_id: community.id,
      subscription_id: subscription.id,
      status: entitlement.membershipStatus,
      access_level: membershipLevel,
      joined_at: entitlement.membershipStatus === "active" ? safeNow() : null,
      entitlement_origin: "subscription_lifecycle",
      metadata: {
        phase: ACTIVATION_PHASE,
        entitlement_source: source,
        live_subscription_id: subscription.id
      }
    });
  }

  if (grantData?.grant_status !== entitlement.accessGrantStatus) {
    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey:
        entitlement.accessGrantStatus === "active"
          ? grantData?.grant_status && grantData.grant_status !== "scheduled"
            ? "access_restored"
            : "access_granted"
          : "access_revoked",
      pagePath: "/cliente/ecossistema",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id,
        next_grant_status: entitlement.accessGrantStatus,
        access_scope: accessScope
      }
    });
  }

  if (entitlement.accessGrantStatus === "active") {
    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey: accessScope === "founding_live" ? "founding_live_activated" : "access_granted",
      pagePath: "/cliente/ecossistema",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id,
        access_scope: accessScope,
        source
      }
    });
  }

  if (membershipData?.status !== entitlement.membershipStatus && entitlement.membershipStatus === "active") {
    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey: membershipData?.status ? "member_retained" : "member_joined",
      pagePath: "/cliente/ecossistema/comunidade",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id
      }
    });
  }

  if (entitlement.membershipStatus === "active") {
    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey: "community_access_granted",
      pagePath: "/cliente/ecossistema/comunidade",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id,
        access_level: membershipLevel,
        source
      }
    });
  }

  if (subscription.status === "active") {
    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey: "content_continuity_signal",
      pagePath: "/cliente/ecossistema/conteudo",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id
      }
    });

    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey: "onboarding_completed",
      pagePath: "/cliente/ecossistema",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id,
        operation_mode: "controlled_founding_live"
      }
    });

    await insertRecurringTelemetry({
      profileId: subscription.profile_id,
      eventKey: "retention_signal",
      pagePath: "/cliente/ecossistema",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: subscription.id,
        retention_stage: "initial_founder_window"
      }
    });
  }

  return {
    subscriptionId: subscription.id,
    previousStatus: grantData?.grant_status || null,
    nextStatus: subscription.status,
    billingStatus: subscription.billing_status || "unknown",
    accessGrantStatus: entitlement.accessGrantStatus,
    membershipStatus: entitlement.membershipStatus
  };
}

export async function syncSubscriptionFromPreapprovalId(
  preapprovalId: string,
  source = "webhook"
) {
  const supabase = createAdminSupabaseClient();
  const mercadopago = createMercadoPagoClient();
  const preApproval = new PreApproval(mercadopago);
  const providerSubscription = await preApproval.get({ id: preapprovalId });
  const providerReference = providerSubscription.id || preapprovalId;
  const externalReference = providerSubscription.external_reference || null;

  let lookup = await supabase
    .from("ecosystem_subscriptions")
    .select("*")
    .eq("billing_provider_reference", providerReference)
    .maybeSingle();

  if (!lookup.data && externalReference) {
    lookup = await supabase
      .from("ecosystem_subscriptions")
      .select("*")
      .eq("external_reference", externalReference)
      .maybeSingle();
  }

  if (lookup.error) {
    throw new Error("Falha ao buscar assinatura recorrente para sincronizacao.");
  }

  let lookupData = (lookup.data || null) as SubscriptionRow | null;

  if (!lookupData) {
    const { plan, catalog } = await getAnchorEntities();
    const providerEmail = (providerSubscription.payer_email || "").trim().toLowerCase();
    const { data: profile } = providerEmail
      ? await supabase
          .from("profiles")
          .select("id,email")
          .ilike("email", providerEmail)
          .maybeSingle()
      : { data: null };

    if (!profile?.id) {
      throw new Error("Nao foi possivel localizar o perfil para a assinatura recorrente recebida do provedor.");
    }

    const { data: foundingBeta } = await supabase
      .from("ecosystem_subscriptions")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("plan_tier_id", plan.id)
      .eq("source_of_activation", "founding_beta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const mapped = mapPreapprovalStatus(providerSubscription.status);
    const { data: inserted, error: insertError } = await supabase
      .from("ecosystem_subscriptions")
      .insert({
        profile_id: profile.id,
        plan_tier_id: plan.id,
        origin_catalog_item_id: catalog.id,
        status: mapped.subscriptionStatus,
        cadence: plan.cadence,
        renewal_mode: "provider_managed",
        payment_provider: BILLING_PROVIDER,
        external_reference: externalReference,
        current_period_started_at: mapped.subscriptionStatus === "active" ? safeNow() : null,
        current_period_ends_at: providerSubscription.next_payment_date || null,
        billing_status: mapped.billingStatus,
        billing_provider_reference: providerReference,
        billing_provider_plan_reference: plan.billing_plan_reference,
        source_of_activation: foundingBeta?.id ? "founding_live" : "live_checkout",
        renewal_due_at: providerSubscription.next_payment_date || null,
        next_billing_at: providerSubscription.next_payment_date || null,
        last_billing_event_at: safeNow(),
        billing_metadata: {
          phase: ACTIVATION_PHASE,
          provider_status: providerSubscription.status || mapped.billingStatus,
          payer_email: providerSubscription.payer_email || null
        },
        metadata: {
          phase: ACTIVATION_PHASE,
          founding_transition: Boolean(foundingBeta?.id),
          founding_benefits_preserved: Boolean(foundingBeta?.id)
        }
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message || "Nao foi possivel materializar a assinatura live a partir do provedor.");
    }

    lookupData = inserted as SubscriptionRow;
  }

  const current = lookupData as SubscriptionRow;
  const previousStatus = current.status;
  const mapped = mapPreapprovalStatus(providerSubscription.status);
  const nextBillingDate = providerSubscription.next_payment_date || current.next_billing_at;
  const nextPeriodStart =
    mapped.subscriptionStatus === "active" && current.current_period_started_at
      ? current.current_period_started_at
      : mapped.subscriptionStatus === "active"
        ? safeNow()
        : current.current_period_started_at;

  const { error } = await supabase
    .from("ecosystem_subscriptions")
    .update({
      status: mapped.subscriptionStatus,
      payment_provider: BILLING_PROVIDER,
      billing_status: mapped.billingStatus,
      billing_provider_reference: providerReference,
      source_of_activation:
        current.source_of_activation === "founding_beta" ? "founding_live" : current.source_of_activation || "live_checkout",
      current_period_started_at: nextPeriodStart,
      current_period_ends_at: nextBillingDate,
      renewal_due_at: nextBillingDate,
      next_billing_at: nextBillingDate,
      paused_at: mapped.subscriptionStatus === "paused" ? safeNow() : null,
      canceled_at: mapped.subscriptionStatus === "canceled" ? safeNow() : null,
      last_billing_event_at: safeNow(),
      billing_metadata: {
        ...asJson(current.billing_metadata),
        phase: ACTIVATION_PHASE,
        provider_status: providerSubscription.status || mapped.billingStatus,
        provider_next_payment_date: providerSubscription.next_payment_date || null,
        source
      },
      metadata: {
        ...asJson(current.metadata),
        phase: ACTIVATION_PHASE,
        live_provider_connected: true
      }
    })
    .eq("id", current.id);

  if (error) {
    throw new Error(`Nao foi possivel atualizar a assinatura recorrente: ${error.message}`);
  }

  const synced = await syncSubscriptionEntitlementsById(current.id, source);
  const eventKey =
    mapped.subscriptionStatus === "active"
      ? previousStatus === "active"
        ? "subscription_renewed"
        : "subscription_active"
      : mapped.subscriptionStatus === "paused"
        ? "subscription_paused"
        : mapped.subscriptionStatus === "canceled"
          ? "subscription_canceled"
          : "churn_risk";

  await insertBillingEvent({
    subscriptionId: current.id,
    profileId: current.profile_id,
    planTierId: current.plan_tier_id,
    provider: BILLING_PROVIDER,
    providerEventType: source,
    providerStatus: providerSubscription.status || null,
    billingStatus: mapped.billingStatus,
    providerReference,
    externalReference,
    payload: {
      phase: ACTIVATION_PHASE,
      source,
      next_payment_date: providerSubscription.next_payment_date || null
    }
  });

  if (mapped.billingStatus === "authorized") {
    await insertRecurringTelemetry({
      profileId: current.profile_id,
      eventKey: "subscription_authorized",
      pagePath: "/cliente/ecossistema/beneficios",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: current.id,
        provider_status: providerSubscription.status || mapped.billingStatus
      }
    });
  }

  await insertRecurringTelemetry({
    profileId: current.profile_id,
    eventKey,
    pagePath: "/cliente/ecossistema/beneficios",
    payload: {
      phase: ACTIVATION_PHASE,
      journey: "circulo_essencial",
      subscription_id: current.id,
      provider_status: providerSubscription.status || mapped.billingStatus
    }
  });

  if (mapped.subscriptionStatus === "active") {
    await insertRecurringTelemetry({
      profileId: current.profile_id,
      eventKey: "recurring_revenue_signal",
      pagePath: "/internal/advogada/ecossistema",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: current.id,
        provider: BILLING_PROVIDER
      }
    });
  }

  if (mapped.subscriptionStatus === "past_due" || mapped.billingStatus === "past_due") {
    await insertRecurringTelemetry({
      profileId: current.profile_id,
      eventKey: "churn_risk",
      pagePath: "/internal/advogada/ecossistema",
      payload: {
        phase: ACTIVATION_PHASE,
        journey: "circulo_essencial",
        subscription_id: current.id,
        risk: "past_due"
      }
    });
  }

  return synced;
}

export async function applyCirculoEssencialLifecycleAction(
  profile: PortalProfile,
  action: LifecycleAction
) {
  const mercadopago = createMercadoPagoClient();
  const preApproval = new PreApproval(mercadopago);
  const subscriptions = await getLatestAnchorSubscriptions(profile.id);
  const liveSubscription = subscriptions.find(
    (item) => item.payment_provider === BILLING_PROVIDER && item.billing_provider_reference
  );

  if (!liveSubscription?.billing_provider_reference) {
    throw new Error("Nao existe assinatura live conectada ao provedor para esta acao.");
  }

  if (action !== "sync") {
    const targetStatus =
      action === "pause" ? "paused" : action === "resume" ? "authorized" : "cancelled";

    await preApproval.update({
      id: liveSubscription.billing_provider_reference,
      body: {
        status: targetStatus
      }
    });
  }

  return syncSubscriptionFromPreapprovalId(
    liveSubscription.billing_provider_reference,
    action
  );
}
