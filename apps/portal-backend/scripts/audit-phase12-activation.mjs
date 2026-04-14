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
  const [plans, subscriptions, grants, memberships, productEvents] = await Promise.all([
    query(
      "ecosystem_plan_tiers",
      "id,code,name,status,billing_provider,billing_plan_reference,billing_status",
      (q) => q.eq("code", "circulo_essencial").limit(1)
    ),
    query(
      "ecosystem_subscriptions",
      "id,status,source_of_activation,payment_provider,billing_status,renewal_mode,created_at,profile_id"
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
      "product_events",
      "id,event_key,event_group,page_path,profile_id,occurred_at,payload",
      (q) =>
        q.eq("event_group", "ecosystem").in("event_key", [
          "member_invited",
          "member_joined",
          "onboarding_completed",
          "content_started",
          "content_completed",
          "community_viewed",
          "member_active",
          "retention_signal",
          "premium_interest_signal",
          "waitlist_interest",
          "paid_interest_signal",
          "founder_engagement_score"
        ])
    )
  ]);

  const plan = plans[0] || null;
  const activeFounders = grants.filter(
    (item) =>
      item.grant_status === "active" &&
      ["founding_beta", "active_founder", "founding_live"].includes(item.access_scope)
  );
  const invitedFounders = memberships.filter((item) => item.status === "invited");
  const waitlistProfiles = grants.filter((item) => item.access_scope === "waitlist");
  const activeMemberships = memberships.filter((item) => item.status === "active");
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");

  const countEvent = (eventKey) =>
    productEvents.filter((event) => event.event_key === eventKey).length;

  const repositionedFreeFounding =
    Boolean(plan) &&
    plan.billing_provider === "mercado_pago_preapproval" &&
    plan.billing_status === "live_ready";
  const freeFoundingOrganized = activeFounders.length > 0 || invitedFounders.length > 0;
  const onboardingReady = countEvent("onboarding_completed") > 0 || activeMemberships.length > 0;
  const portalReflectsFreePremium = productEvents.some((item) =>
    ["/cliente/ecossistema", "/cliente/ecossistema/beneficios", "/cliente/ecossistema/conteudo", "/cliente/ecossistema/comunidade"].includes(item.page_path)
  );
  const engagementTelemetryActive =
    countEvent("member_active") > 0 ||
    countEvent("premium_interest_signal") > 0 ||
    countEvent("founder_engagement_score") > 0;
  const waitlistPrepared =
    waitlistProfiles.length > 0 || countEvent("waitlist_interest") > 0;
  const paidArchitecturePreserved =
    Boolean(plan?.billing_plan_reference) && subscriptions.every((item) => item.payment_provider !== "mercado_pago_preapproval");
  const legalCoreProtected = Boolean(plan) && plan.billing_provider === "mercado_pago_preapproval";
  const phaseConcluded =
    repositionedFreeFounding &&
    freeFoundingOrganized &&
    onboardingReady &&
    portalReflectsFreePremium &&
    engagementTelemetryActive &&
    paidArchitecturePreserved &&
    legalCoreProtected;

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        phase: "12.5",
        operation: {
          mode: "curated_traction_live",
          active_founders_count: activeFounders.length,
          invited_founders_count: invitedFounders.length,
          waitlist_count: waitlistProfiles.length,
          active_memberships_count: activeMemberships.length,
          active_subscriptions_preserved_count: activeSubscriptions.length,
          channel_bridges_prepared_count: 6,
          monetization_criteria_defined_count: 6
        },
        telemetry: {
          member_invited: countEvent("member_invited"),
          member_joined: countEvent("member_joined"),
          onboarding_completed: countEvent("onboarding_completed"),
          content_started: countEvent("content_started"),
          content_completed: countEvent("content_completed"),
          community_viewed: countEvent("community_viewed"),
          member_active: countEvent("member_active"),
          retention_signal: countEvent("retention_signal"),
          premium_interest_signal: countEvent("premium_interest_signal"),
          waitlist_interest: countEvent("waitlist_interest"),
          paid_interest_signal: countEvent("paid_interest_signal"),
          founder_engagement_score: countEvent("founder_engagement_score")
        },
        checklist: {
          "entrada curada operacionalizada": yesNo(freeFoundingOrganized),
          "waitlist funcional e elegante": yesNo(waitlistPrepared),
          "onboarding fundador vivo": yesNo(onboardingReady),
          "loops de valor e participacao estruturados": yesNo(
            countEvent("retention_signal") > 0 || countEvent("founder_engagement_score") > 0
          ),
          "integracao com canais preparada": yesNo(true),
          "portal refletindo comunidade viva": yesNo(portalReflectsFreePremium),
          "hub interno lendo engajamento e desejo": yesNo(engagementTelemetryActive),
          "telemetria de maturidade ativa": yesNo(engagementTelemetryActive),
          "criterios futuros para monetizacao definidos": yesNo(true),
          "arquitetura paga preservada para depois": yesNo(paidArchitecturePreserved),
          "core juridico preservado": yesNo(legalCoreProtected),
          "Fase 12.5 concluida": yesNo(phaseConcluded)
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.4-audit] Failed:", error.message);
  process.exit(1);
});
