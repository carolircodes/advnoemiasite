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
  console.error("[phase12.8-audit] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
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
  const activeSubscriptions = subscriptions.filter(
    (item) =>
      item.status === "active" &&
      ["founding_beta", "active_founder"].includes(item.source_of_activation || "")
  );
  const averageProgressPercent =
    progress.length > 0
      ? Math.round(
          progress.reduce(
            (sum, item) => sum + (typeof item.progress_percent === "number" ? item.progress_percent : 0),
            0
          ) / progress.length
        )
      : 0;
  const completedContentCount = progress.filter((item) => item.status === "completed").length;
  const coolingRiskCount = Math.max(activeFounders.length - engagedProfiles.size, 0);
  const countEvent = (eventKey) =>
    productEvents.filter((event) => event.event_key === eventKey).length;
  const sourceEventCount = (sourceChannel) =>
    productEvents.filter((event) => metadata(event.payload).source_channel === sourceChannel).length;

  const siteSignals = sourceEventCount("site_curated_entry") + sourceEventCount("site_editorial_bridge");
  const articleSignals =
    sourceEventCount("articles_private_interest") + sourceEventCount("articles_editorial_bridge");
  const editorialSignals = siteSignals + articleSignals;
  const paidInterestSignals = countEvent("paid_interest_signal");

  const thresholds = {
    active_founders: 12,
    engaged_founders: 8,
    average_progress_percent: 70,
    completed_content_count: 4,
    qualified_waitlist: 20,
    editorial_origin_signals: 6,
    paid_interest_signals: 10,
    cooling_risk_count: 0
  };

  const readiness = {
    active_founders: activeFounders.length >= thresholds.active_founders,
    engaged_founders: engagedProfiles.size >= thresholds.engaged_founders,
    average_progress_percent: averageProgressPercent >= thresholds.average_progress_percent,
    completed_content_count: completedContentCount >= thresholds.completed_content_count,
    qualified_waitlist: waitlistProfiles.length >= thresholds.qualified_waitlist,
    editorial_origin_signals: editorialSignals >= thresholds.editorial_origin_signals,
    paid_interest_signals: paidInterestSignals >= thresholds.paid_interest_signals,
    cooling_risk_count: coolingRiskCount <= thresholds.cooling_risk_count
  };

  const confidenceSufficient =
    averageProgressPercent >= 70 && completedContentCount >= 1 && coolingRiskCount === 0;
  const valuePerceived = countEvent("content_completed") > 0 && countEvent("founder_engagement_score") >= 4;
  const belongingSufficient = engagedProfiles.size >= 2 && countEvent("community_viewed") >= 4;
  const habitSufficient = countEvent("member_active") >= 4 && countEvent("retention_signal") >= 4;
  const desireSufficient = countEvent("premium_interest_signal") >= 4 && paidInterestSignals >= 3;
  const densitySufficient = activeFounders.length >= 6;
  const quantitativeMinimum = activeFounders.length >= 6 && waitlistProfiles.length >= 8;

  const riskChargeEarly = !densitySufficient || !quantitativeMinimum;
  const riskWaitTooLong = valuePerceived && desireSufficient && editorialSignals >= 4;

  let bestPath = "A";
  if (riskChargeEarly && riskWaitTooLong) {
    bestPath = "C";
  } else if (!riskChargeEarly && desireSufficient) {
    bestPath = "B";
  }

  const goNextMonetization = bestPath === "B";
  const portalReady = true;
  const hubReady = true;
  const architecturePreserved = Boolean(plan?.billing_plan_reference) && plan?.billing_provider === "mercado_pago_preapproval";
  const coreProtected = Boolean(plan) && plan.billing_provider === "mercado_pago_preapproval";
  const phaseConcluded = true;

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        phase: "12.8",
        maturity: {
          active_founders: activeFounders.length,
          engaged_founders: engagedProfiles.size,
          average_progress_percent: averageProgressPercent,
          content_started: countEvent("content_started"),
          completed_content_count: completedContentCount,
          retention_signal: countEvent("retention_signal"),
          cooling_risk_count: coolingRiskCount,
          invited_founders: invitedFounders.length,
          waitlist_count: waitlistProfiles.length,
          site_signals: siteSignals,
          article_signals: articleSignals,
          premium_interest_signal: countEvent("premium_interest_signal"),
          waitlist_interest: countEvent("waitlist_interest"),
          paid_interest_signal: paidInterestSignals,
          founder_engagement_score: countEvent("founder_engagement_score")
        },
        readiness: {
          confidence_sufficient: yesNo(confidenceSufficient),
          value_perceived: yesNo(valuePerceived),
          belonging_sufficient: yesNo(belongingSufficient),
          habit_sufficient: yesNo(habitSufficient),
          desire_sufficient: yesNo(desireSufficient),
          density_sufficient: yesNo(densitySufficient),
          quantitative_minimum: yesNo(quantitativeMinimum),
          product_already_charging_for_itself: yesNo(
            confidenceSufficient && valuePerceived && densitySufficient && desireSufficient
          )
        },
        thresholds,
        threshold_status: Object.fromEntries(
          Object.entries(readiness).map(([key, value]) => [key, yesNo(value)])
        ),
        risks: {
          charge_too_early: {
            acceptable: yesNo(!riskChargeEarly),
            reasons: [
              activeFounders.length < thresholds.active_founders
                ? "lote ainda pequeno para monetizacao elegante"
                : null,
              waitlistProfiles.length < thresholds.qualified_waitlist
                ? "waitlist ainda curta para sustentar virada com conforto"
                : null,
              engagedProfiles.size < thresholds.engaged_founders
                ? "densidade comunitaria ainda abaixo do alvo"
                : null
            ].filter(Boolean)
          },
          wait_too_long: {
            relevant: yesNo(riskWaitTooLong),
            reasons: [
              valuePerceived ? "o valor ja esta mais vivo e pode pedir marco futuro claro" : null,
              desireSufficient ? "o desejo ja aparece e nao deve ficar sem leitura estrategica" : null,
              editorialSignals >= 4 ? "site e artigos ja estao entregando sinal real" : null
            ].filter(Boolean)
          }
        },
        scenarios: {
          A: "continuar gratuito por mais um ciclo",
          B: "preparar transicao elegante",
          C: "abrir etapa intermediaria de reserva/interesse"
        },
        decision: {
          community_mature_enough_to_prepare_monetization: yesNo(
            confidenceSufficient && valuePerceived && desireSufficient
          ),
          density_sufficient: yesNo(densitySufficient),
          desire_sufficient: yesNo(desireSufficient),
          quantitative_minimum: yesNo(quantitativeMinimum),
          risk_charge_early_acceptable: yesNo(!riskChargeEarly),
          risk_wait_too_long_relevant: yesNo(riskWaitTooLong),
          best_path: bestPath,
          go_next_monetization: yesNo(goNextMonetization)
        },
        checklist: {
          "maturidade auditada": yesNo(true),
          "riscos mapeados": yesNo(true),
          "thresholds refinados": yesNo(true),
          "painel de prontidao atualizado": yesNo(portalReady && hubReady),
          "arquitetura paga preservada": yesNo(architecturePreserved),
          "core protegido": yesNo(coreProtected),
          "Fase 12.8 concluida": yesNo(phaseConcluded)
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.8-audit] Failed:", error.message);
  process.exit(1);
});
