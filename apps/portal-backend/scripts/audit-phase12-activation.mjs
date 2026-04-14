import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !key) {
  console.error("[phase12.4-audit] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function yesNo(value) {
  return value ? "sim" : "nao";
}

async function query(table, columns, configure) {
  let statement = supabase.from(table).select(columns);
  statement = configure ? configure(statement) : statement;
  const { data, error } = await statement;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data || [];
}

async function main() {
  const [
    plans,
    subscriptions,
    grants,
    memberships,
    billingEvents,
    productEvents
  ] = await Promise.all([
    query(
      "ecosystem_plan_tiers",
      "id,code,name,status,billing_provider,billing_plan_reference,billing_status",
      (q) => q.eq("code", "circulo_essencial").limit(1)
    ),
    query(
      "ecosystem_subscriptions",
      "id,status,source_of_activation,payment_provider,billing_status,renewal_mode,current_period_ends_at,next_billing_at,created_at,profile_id"
    ),
    query(
      "ecosystem_access_grants",
      "id,profile_id,grant_status,access_scope,portal_workspace,access_origin,created_at"
    ),
    query(
      "ecosystem_community_memberships",
      "id,profile_id,status,access_level,entitlement_origin,created_at"
    ),
    query(
      "ecosystem_billing_events",
      "id,profile_id,provider,provider_event_type,billing_status,provider_reference,occurred_at"
    ),
    query(
      "product_events",
      "id,event_key,event_group,page_path,profile_id,occurred_at,payload",
      (q) =>
        q
          .eq("event_group", "ecosystem")
          .in("event_key", [
            "subscription_started",
            "subscription_authorized",
            "subscription_active",
            "founding_live_activated",
            "access_granted",
            "community_access_granted",
            "content_continuity_signal",
            "recurring_revenue_signal",
            "onboarding_completed",
            "retention_signal"
          ])
    )
  ]);

  const plan = plans[0] || null;
  const foundingBetaSubscriptions = subscriptions.filter(
    (item) => item.source_of_activation === "founding_beta"
  );
  const foundingLiveSubscriptions = subscriptions.filter(
    (item) => item.source_of_activation === "founding_live"
  );
  const liveSubscriptions = subscriptions.filter(
    (item) => item.payment_provider === "mercado_pago_preapproval"
  );
  const activeLiveSubscriptions = liveSubscriptions.filter(
    (item) => item.status === "active"
  );
  const pendingAuthorizations = liveSubscriptions.filter(
    (item) =>
      item.billing_status === "pending_authorization" || item.status === "incomplete"
  );
  const foundingLiveGrants = grants.filter(
    (item) => item.access_scope === "founding_live" && item.grant_status === "active"
  );
  const activeGrants = grants.filter((item) => item.grant_status === "active");
  const activeMemberships = memberships.filter((item) => item.status === "active");
  const eligibleFoundingProfiles = new Set([
    ...foundingBetaSubscriptions.map((item) => item.profile_id),
    ...grants
      .filter(
        (item) =>
          item.grant_status === "active" &&
          ["founding_beta", "founding_live"].includes(item.access_scope)
      )
      .map((item) => item.profile_id)
  ]);
  const liveProfiles = new Set(liveSubscriptions.map((item) => item.profile_id));
  const controlledActivationCandidates = [...eligibleFoundingProfiles].filter(
    (profileId) => !liveProfiles.has(profileId)
  );

  const eventCounts = new Map();
  for (const event of productEvents) {
    eventCounts.set(event.event_key, (eventCounts.get(event.event_key) || 0) + 1);
  }

  const firstActivationPrepared =
    Boolean(plan?.billing_plan_reference) &&
    controlledActivationCandidates.length > 0;
  const firstActivationHomologated = activeLiveSubscriptions.length > 0;
  const endToEndValidated =
    firstActivationHomologated &&
    foundingLiveGrants.length > 0 &&
    activeMemberships.length > 0 &&
    billingEvents.some((item) => item.provider === "mercado_pago_preapproval");
  const betaToLivePrepared =
    foundingBetaSubscriptions.length > 0 &&
    (foundingLiveSubscriptions.length > 0 ||
      grants.some((item) => item.access_scope === "founding_beta"));
  const portalReflectsRealLife =
    productEvents.some((item) =>
      ["/cliente/ecossistema", "/cliente/ecossistema/beneficios"].includes(item.page_path)
    );
  const hubReflectsOperation =
    productEvents.some((item) => item.page_path === "/internal/advogada/ecossistema") ||
    billingEvents.length > 0;
  const telemetryActive =
    (eventCounts.get("subscription_started") || 0) > 0 ||
    (eventCounts.get("subscription_authorized") || 0) > 0 ||
    (eventCounts.get("founding_live_activated") || 0) > 0;
  const legalCoreProtected =
    Boolean(plan) &&
    plan.billing_provider === "mercado_pago_preapproval" &&
    !billingEvents.some((item) => item.provider === "mercado_pago" && item.provider_event_type === "legal_checkout");
  const phaseConcluded =
    firstActivationPrepared &&
    portalReflectsRealLife &&
    hubReflectsOperation &&
    telemetryActive &&
    legalCoreProtected;

  const summary = {
    auditedAt: new Date().toISOString(),
    phase: "12.4",
    operation: {
      initial_subscriber_target: 3,
      rollout_mode: "controlled_founding_live",
      eligibility:
        "pagadoras convidadas, founding_beta preservado e autorizacao recorrente validada com curadoria manual",
      invite_policy: "curated_invitation_only",
      founding_beta_count: foundingBetaSubscriptions.length,
      founding_live_count: foundingLiveSubscriptions.length,
      controlled_activation_candidates_count: controlledActivationCandidates.length,
      live_subscribers_count: liveSubscriptions.length,
      active_live_subscribers_count: activeLiveSubscriptions.length,
      pending_authorizations_count: pendingAuthorizations.length,
      active_grants_count: activeGrants.length,
      founding_live_grants_count: foundingLiveGrants.length,
      active_memberships_count: activeMemberships.length
    },
    telemetry: {
      subscription_started: eventCounts.get("subscription_started") || 0,
      subscription_authorized: eventCounts.get("subscription_authorized") || 0,
      subscription_active: eventCounts.get("subscription_active") || 0,
      founding_live_activated: eventCounts.get("founding_live_activated") || 0,
      access_granted: eventCounts.get("access_granted") || 0,
      community_access_granted: eventCounts.get("community_access_granted") || 0,
      content_continuity_signal: eventCounts.get("content_continuity_signal") || 0,
      recurring_revenue_signal: eventCounts.get("recurring_revenue_signal") || 0,
      onboarding_completed: eventCounts.get("onboarding_completed") || 0,
      retention_signal: eventCounts.get("retention_signal") || 0
    },
    checklist: {
      "primeira ativacao live preparada": yesNo(firstActivationPrepared),
      "primeira assinatura live efetivamente homologada": yesNo(firstActivationHomologated),
      "fluxo recorrente ponta a ponta validado": yesNo(endToEndValidated),
      "founding_beta -> founding_live preparado ou executado": yesNo(betaToLivePrepared),
      "portal refletindo assinatura live real": yesNo(portalReflectsRealLife),
      "hub interno refletindo operacao fundadora": yesNo(hubReflectsOperation),
      "telemetria registrando ativacao live": yesNo(telemetryActive),
      "core juridico preservado": yesNo(legalCoreProtected),
      "fase 12.4 concluida": yesNo(phaseConcluded)
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("[phase12.4-audit] Failed:", error.message);
  process.exit(1);
});
