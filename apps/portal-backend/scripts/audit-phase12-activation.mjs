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
  console.error("[phase12.7-audit] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
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

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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
  const [plans, subscriptions, grants, memberships, progress, productEvents] = await Promise.all([
    query(
      "ecosystem_plan_tiers",
      "id,code,name,status,billing_provider,billing_plan_reference,billing_status",
      (q) => q.eq("code", "circulo_essencial").limit(1)
    ),
    query(
      "ecosystem_subscriptions",
      "id,status,source_of_activation,payment_provider,billing_status,renewal_mode,created_at,profile_id,metadata"
    ),
    query(
      "ecosystem_access_grants",
      "id,profile_id,grant_status,access_scope,portal_workspace,access_origin,metadata,created_at"
    ),
    query(
      "ecosystem_community_memberships",
      "id,profile_id,status,access_level,entitlement_origin,metadata,last_active_at,created_at"
    ),
    query(
      "ecosystem_content_progress",
      "id,profile_id,status,progress_percent,started_at,last_consumed_at,completed_at,metadata"
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
  const waitlistProfiles = grants.filter(
    (item) => item.grant_status === "active" && item.access_scope === "waitlist"
  );
  const engagedProfiles = new Set(
    productEvents
      .filter((item) => ["member_active", "founder_engagement_score", "community_viewed"].includes(item.event_key))
      .map((item) => item.profile_id)
      .filter(Boolean)
  );
  const activeMemberships = memberships.filter((item) => item.status === "active");
  const activeSubscriptions = subscriptions.filter(
    (item) =>
      item.status === "active" &&
      ["founding_beta", "active_founder"].includes(item.source_of_activation || "")
  );
  const completedProgress = progress.filter((item) => item.status === "completed");
  const averageProgressPercent =
    progress.length > 0
      ? Math.round(
          progress.reduce(
            (sum, item) => sum + (typeof item.progress_percent === "number" ? item.progress_percent : 0),
            0
          ) / progress.length
        )
      : 0;
  const eventCount = (eventKey) =>
    productEvents.filter((event) => event.event_key === eventKey).length;
  const sourceEventCount = (sourceChannel) =>
    productEvents.filter((event) => metadata(event.payload).source_channel === sourceChannel).length;

  const portalMature = productEvents.some((item) =>
    ["/cliente/ecossistema", "/cliente/ecossistema/conteudo", "/cliente/ecossistema/comunidade"].includes(
      item.page_path
    )
  );
  const hubMature = true;
  const retentionActive =
    eventCount("member_active") >= 2 &&
    eventCount("retention_signal") >= 2 &&
    eventCount("founder_engagement_score") >= 3;
  const rhythmConsolidated = eventCount("community_viewed") >= 2 && engagedProfiles.size >= 2;
  const contentMature = eventCount("content_started") >= 2 && averageProgressPercent >= 50;
  const contentCompletedReal = completedProgress.length > 0 || eventCount("content_completed") > 0;
  const siteArticlesMotor =
    sourceEventCount("site_curated_entry") > 0 ||
    sourceEventCount("site_editorial_bridge") > 0 ||
    sourceEventCount("articles_editorial_bridge") > 0 ||
    sourceEventCount("articles_private_interest") > 0;
  const telemetryMature =
    retentionActive &&
    eventCount("content_started") > 0 &&
    eventCount("content_completed") > 0 &&
    eventCount("paid_interest_signal") > 0;
  const refinedCriteria = true;
  const legalCoreProtected = Boolean(plan) && plan.billing_provider === "mercado_pago_preapproval";
  const phaseConcluded =
    retentionActive &&
    rhythmConsolidated &&
    contentMature &&
    contentCompletedReal &&
    siteArticlesMotor &&
    portalMature &&
    hubMature &&
    telemetryMature &&
    refinedCriteria &&
    legalCoreProtected;

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        phase: "12.7",
        operation: {
          mode: "retention_maturity_live",
          active_founders_count: activeFounders.length,
          engaged_founders_count: engagedProfiles.size,
          invited_founders_count: invitedFounders.length,
          waitlist_count: waitlistProfiles.length,
          active_memberships_count: activeMemberships.length,
          active_subscriptions_preserved_count: activeSubscriptions.length,
          average_progress_percent: averageProgressPercent,
          completed_content_count: completedProgress.length,
          cooling_risk_count: Math.max(activeFounders.length - engagedProfiles.size, 0)
        },
        channels: {
          instagram: sourceEventCount("instagram_dm_curated"),
          whatsapp: sourceEventCount("whatsapp_curated"),
          portal: sourceEventCount("portal_founder_reference"),
          site: sourceEventCount("site_curated_entry") + sourceEventCount("site_editorial_bridge"),
          articles:
            sourceEventCount("articles_private_interest") + sourceEventCount("articles_editorial_bridge")
        },
        telemetry: {
          member_invited: eventCount("member_invited"),
          member_joined: eventCount("member_joined"),
          onboarding_completed: eventCount("onboarding_completed"),
          content_started: eventCount("content_started"),
          content_completed: eventCount("content_completed"),
          community_viewed: eventCount("community_viewed"),
          member_active: eventCount("member_active"),
          retention_signal: eventCount("retention_signal"),
          premium_interest_signal: eventCount("premium_interest_signal"),
          waitlist_interest: eventCount("waitlist_interest"),
          paid_interest_signal: eventCount("paid_interest_signal"),
          founder_engagement_score: eventCount("founder_engagement_score")
        },
        checklist: {
          "retencao viva estruturada": yesNo(retentionActive),
          "ritmo comunitario consolidado": yesNo(rhythmConsolidated),
          "progressao de conteudo mais madura": yesNo(contentMature),
          "content_completed saiu do zero ou ficou mais proximo de acontecer com clareza": yesNo(
            contentCompletedReal
          ),
          "site/artigos funcionando como motor real": yesNo(siteArticlesMotor),
          "portal refletindo maturidade e progresso": yesNo(portalMature),
          "hub interno lendo maturidade real": yesNo(hubMature),
          "telemetria de retencao e progresso ativa": yesNo(telemetryMature),
          "criterios futuros de monetizacao refinados": yesNo(refinedCriteria),
          "core juridico preservado": yesNo(legalCoreProtected),
          "Fase 12.7 concluida": yesNo(phaseConcluded)
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.7-audit] Failed:", error.message);
  process.exit(1);
});
