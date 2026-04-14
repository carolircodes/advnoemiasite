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
  console.error("[phase12.6-materialize] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PHASE = "12.6";
const LOT_CODE = "founding_lot_01";
const NOW = Date.now();

const cohortBlueprint = [
  {
    email: "carolinapaixaorosa@gmail.com",
    founderState: "active_founder",
    sourceChannel: "portal_founder_reference",
    eligibilityReason: "founding beta preservado e termometro principal da experiencia fundadora",
    priorityTier: "prioridade_fundadora",
    preserveExisting: true
  },
  {
    email: "advnoemiap@gmail.com",
    founderState: "active_founder",
    sourceChannel: "instagram_dm_curated",
    eligibilityReason: "afinidade alta com a proposta e entrada curada a partir de relacao direta",
    priorityTier: "lote_01_imediato"
  },
  {
    email: "noemiapadvocacia@gmail.com",
    founderState: "invited",
    sourceChannel: "whatsapp_curated",
    eligibilityReason: "aderencia alta e contexto de proximidade suficiente para convite premium",
    priorityTier: "janela_curada"
  },
  {
    email: "carolircodes@gmail.com",
    founderState: "waitlist",
    sourceChannel: "articles_private_interest",
    eligibilityReason: "sinal de desejo consistente com necessidade de observacao privada",
    priorityTier: "tier_a_waitlist"
  }
];

function isoAt(offsetMinutes = 0) {
  return new Date(NOW + offsetMinutes * 60 * 1000).toISOString();
}

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function latestRow(table, profileId) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data?.[0] || null;
}

async function latestSubscription(profileId) {
  const { data, error } = await supabase
    .from("ecosystem_subscriptions")
    .select("*")
    .eq("profile_id", profileId)
    .in("source_of_activation", ["founding_beta", "active_founder"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`ecosystem_subscriptions: ${error.message}`);
  }

  return data?.[0] || null;
}

async function ensureUpdateOrInsert(table, existingRow, insertPayload, updatePayload) {
  if (existingRow) {
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", existingRow.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await supabase
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data;
}

async function ensureEvent(profileId, eventKey, pagePath, payload, occurredAt) {
  const { data, error } = await supabase
    .from("product_events")
    .select("id,payload")
    .eq("event_group", "ecosystem")
    .eq("event_key", eventKey)
    .eq("page_path", pagePath)
    .eq("profile_id", profileId)
    .limit(20);

  if (error) {
    throw new Error(`product_events: ${error.message}`);
  }

  const exists = (data || []).some((item) => metadata(item.payload).phase === PHASE);

  if (exists) {
    return;
  }

  const { error: insertError } = await supabase.from("product_events").insert({
    event_key: eventKey,
    event_group: "ecosystem",
    page_path: pagePath,
    profile_id: profileId,
    payload,
    occurred_at: occurredAt
  });

  if (insertError) {
    throw new Error(`product_events: ${insertError.message}`);
  }
}

async function ensureContentProgress(profileId, trackId, moduleId, unitId, baseMetadata) {
  const { data, error } = await supabase
    .from("ecosystem_content_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("track_id", trackId)
    .limit(1);

  if (error) {
    throw new Error(`ecosystem_content_progress: ${error.message}`);
  }

  const existing = data?.[0] || null;

  if (existing) {
    const { error: updateError } = await supabase
      .from("ecosystem_content_progress")
      .update({
        status: "in_progress",
        progress_percent: 18,
        started_at: isoAt(-70),
        last_consumed_at: isoAt(-10),
        metadata: {
          ...metadata(existing.metadata),
          ...baseMetadata,
          source: "phase12_6_curated_lot"
        },
        updated_at: isoAt(0)
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`ecosystem_content_progress: ${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from("ecosystem_content_progress").insert({
    profile_id: profileId,
    track_id: trackId,
    module_id: moduleId,
    unit_id: unitId,
    status: "in_progress",
    progress_percent: 18,
    started_at: isoAt(-70),
    last_consumed_at: isoAt(-10),
    metadata: {
      ...baseMetadata,
      source: "phase12_6_curated_lot"
    }
  });

  if (insertError) {
    throw new Error(`ecosystem_content_progress: ${insertError.message}`);
  }
}

async function main() {
  const [
    catalogResult,
    planResult,
    trackResult,
    moduleResult,
    unitResult,
    communityResult,
    profilesResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_catalog_items")
      .select("id,slug")
      .eq("slug", "biblioteca-estrategica-premium")
      .single(),
    supabase
      .from("ecosystem_plan_tiers")
      .select("id,code")
      .eq("code", "circulo_essencial")
      .single(),
    supabase
      .from("ecosystem_content_tracks")
      .select("id,slug")
      .eq("slug", "trilha-clareza-estrategica")
      .single(),
    supabase
      .from("ecosystem_content_modules")
      .select("id,track_id")
      .eq("track_id", "8f1d559e-ee8f-4c86-8abb-66b9c67dcd9a")
      .single(),
    supabase
      .from("ecosystem_content_units")
      .select("id,module_id")
      .eq("module_id", "9b9c88d9-2b2c-4e9b-937f-c51656c1407f")
      .single(),
    supabase
      .from("ecosystem_communities")
      .select("id,slug")
      .eq("slug", "circulo-reservado")
      .single(),
    supabase
      .from("profiles")
      .select("id,full_name,email")
      .in(
        "email",
        cohortBlueprint.map((item) => item.email)
      )
  ]);

  for (const result of [
    catalogResult,
    planResult,
    trackResult,
    moduleResult,
    unitResult,
    communityResult,
    profilesResult
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const catalog = catalogResult.data;
  const plan = planResult.data;
  const track = trackResult.data;
  const module = moduleResult.data;
  const unit = unitResult.data;
  const community = communityResult.data;
  const profiles = profilesResult.data || [];
  const profileByEmail = new Map(profiles.map((item) => [item.email, item]));
  const preparedProfiles = [];

  for (const blueprint of cohortBlueprint) {
    const profile = profileByEmail.get(blueprint.email);

    if (!profile) {
      continue;
    }

    const baseMetadata = {
      phase: PHASE,
      lot_code: LOT_CODE,
      journey: "circulo_essencial",
      source_channel: blueprint.sourceChannel,
      entry_state: blueprint.founderState,
      priority_tier: blueprint.priorityTier,
      eligibility_reason: blueprint.eligibilityReason,
      controlled_curated_growth: true
    };

    if (blueprint.founderState === "active_founder") {
      const existingSubscription = await latestSubscription(profile.id);
      const subscription = await ensureUpdateOrInsert(
        "ecosystem_subscriptions",
        existingSubscription,
        {
          profile_id: profile.id,
          plan_tier_id: plan.id,
          origin_catalog_item_id: catalog.id,
          status: "active",
          cadence: "monthly",
          renewal_mode: "manual_beta",
          payment_provider: null,
          current_period_started_at: isoAt(-90),
          current_period_ends_at: isoAt(60 * 24 * 30),
          metadata: {
            ...baseMetadata,
            source: "phase12_6_curated_lot",
            billing_live: false,
            entitlement_source: blueprint.preserveExisting ? "founding_beta" : "active_founder"
          },
          billing_status: "beta_manual",
          source_of_activation: blueprint.preserveExisting ? "founding_beta" : "active_founder",
          renewal_cycle: 1,
          renewal_due_at: isoAt(60 * 24 * 30),
          next_billing_at: isoAt(60 * 24 * 30),
          last_billing_event_at: isoAt(-90),
          billing_metadata: {
            phase: PHASE,
            transition: blueprint.preserveExisting ? "founder_preserved" : "founder_curated_activation"
          }
        },
        {
          metadata: {
            ...metadata(existingSubscription?.metadata),
            ...baseMetadata,
            source: "phase12_6_curated_lot"
          },
          updated_at: isoAt(0),
          last_billing_event_at: isoAt(0),
          source_of_activation: blueprint.preserveExisting ? "founding_beta" : "active_founder"
        }
      );

      const existingGrant = await latestRow("ecosystem_access_grants", profile.id);
      await ensureUpdateOrInsert(
        "ecosystem_access_grants",
        existingGrant,
        {
          profile_id: profile.id,
          catalog_item_id: catalog.id,
          subscription_id: subscription.id,
          source_type: "manual_curated",
          grant_status: "active",
          portal_workspace: "ecosystem_hub",
          access_scope: blueprint.preserveExisting ? "founding_beta" : "active_founder",
          starts_at: isoAt(-90),
          metadata: {
            ...baseMetadata,
            source: "phase12_6_curated_lot",
            entry_moment: isoAt(-90)
          },
          last_synced_at: isoAt(0),
          access_origin: blueprint.preserveExisting ? "founding_beta" : blueprint.sourceChannel
        },
        {
          grant_status: "active",
          portal_workspace: "ecosystem_hub",
          access_scope: blueprint.preserveExisting ? "founding_beta" : "active_founder",
          metadata: {
            ...metadata(existingGrant?.metadata),
            ...baseMetadata,
            source: "phase12_6_curated_lot"
          },
          updated_at: isoAt(0),
          last_synced_at: isoAt(0),
          access_origin: blueprint.preserveExisting ? "founding_beta" : blueprint.sourceChannel
        }
      );

      const existingMembership = await latestRow("ecosystem_community_memberships", profile.id);
      await ensureUpdateOrInsert(
        "ecosystem_community_memberships",
        existingMembership,
        {
          profile_id: profile.id,
          community_id: community.id,
          subscription_id: subscription.id,
          status: "active",
          access_level: blueprint.preserveExisting ? "founding_beta" : "active_founder",
          joined_at: isoAt(-80),
          last_active_at: isoAt(-5),
          metadata: {
            ...baseMetadata,
            source: "phase12_6_curated_lot",
            onboarding_window: "premium_founder"
          },
          entitlement_origin: blueprint.preserveExisting ? "founding_beta" : blueprint.sourceChannel
        },
        {
          status: "active",
          access_level: blueprint.preserveExisting ? "founding_beta" : "active_founder",
          last_active_at: isoAt(-5),
          metadata: {
            ...metadata(existingMembership?.metadata),
            ...baseMetadata,
            source: "phase12_6_curated_lot"
          },
          updated_at: isoAt(0),
          entitlement_origin: blueprint.preserveExisting ? "founding_beta" : blueprint.sourceChannel
        }
      );

      await ensureContentProgress(profile.id, track.id, module.id, unit.id, baseMetadata);

      const founderEvents = blueprint.preserveExisting
        ? [
            ["member_active", "/cliente/ecossistema", isoAt(-5)],
            ["founder_engagement_score", "/cliente/ecossistema/comunidade", isoAt(-4)],
            ["community_viewed", "/cliente/ecossistema/comunidade", isoAt(-3)]
          ]
        : [
            ["member_invited", "/cliente/ecossistema/beneficios", isoAt(-85)],
            ["member_joined", "/cliente/ecossistema/comunidade", isoAt(-80)],
            ["onboarding_completed", "/cliente/ecossistema", isoAt(-60)],
            ["content_started", "/cliente/ecossistema/conteudo", isoAt(-40)],
            ["community_viewed", "/cliente/ecossistema/comunidade", isoAt(-20)],
            ["member_active", "/cliente/ecossistema", isoAt(-10)],
            ["founder_engagement_score", "/cliente/ecossistema/comunidade", isoAt(-5)],
            ["retention_signal", "/cliente/ecossistema", isoAt(-2)]
          ];

      for (const [eventKey, pagePath, occurredAt] of founderEvents) {
        await ensureEvent(
          profile.id,
          eventKey,
          pagePath,
          {
            phase: PHASE,
            lot_code: LOT_CODE,
            journey: "circulo_essencial",
            source_channel: blueprint.sourceChannel,
            entry_state: blueprint.founderState,
            controlled: true
          },
          occurredAt
        );
      }
    }

    if (blueprint.founderState === "invited") {
      const existingMembership = await latestRow("ecosystem_community_memberships", profile.id);
      await ensureUpdateOrInsert(
        "ecosystem_community_memberships",
        existingMembership,
        {
          profile_id: profile.id,
          community_id: community.id,
          subscription_id: null,
          status: "invited",
          access_level: "invited_founder",
          joined_at: isoAt(-30),
          metadata: {
            ...baseMetadata,
            source: "phase12_6_curated_lot",
            invite_window: "active"
          },
          entitlement_origin: blueprint.sourceChannel
        },
        {
          status: "invited",
          access_level: "invited_founder",
          metadata: {
            ...metadata(existingMembership?.metadata),
            ...baseMetadata,
            source: "phase12_6_curated_lot"
          },
          updated_at: isoAt(0),
          entitlement_origin: blueprint.sourceChannel
        }
      );

      for (const [eventKey, pagePath, occurredAt] of [
        ["member_invited", "/cliente/ecossistema/beneficios", isoAt(-30)],
        ["premium_interest_signal", "/cliente/ecossistema", isoAt(-28)]
      ]) {
        await ensureEvent(
          profile.id,
          eventKey,
          pagePath,
          {
            phase: PHASE,
            lot_code: LOT_CODE,
            journey: "circulo_essencial",
            source_channel: blueprint.sourceChannel,
            entry_state: blueprint.founderState,
            controlled: true
          },
          occurredAt
        );
      }
    }

    if (blueprint.founderState === "waitlist") {
      const existingGrant = await latestRow("ecosystem_access_grants", profile.id);
      await ensureUpdateOrInsert(
        "ecosystem_access_grants",
        existingGrant,
        {
          profile_id: profile.id,
          catalog_item_id: catalog.id,
          subscription_id: null,
          source_type: "manual_curated",
          grant_status: "active",
          portal_workspace: "ecosystem_hub",
          access_scope: "waitlist",
          starts_at: isoAt(-20),
          metadata: {
            ...baseMetadata,
            source: "phase12_6_curated_lot",
            waitlist_status: "observacao_privada",
            future_invitation_bridge: true
          },
          last_synced_at: isoAt(0),
          access_origin: blueprint.sourceChannel
        },
        {
          grant_status: "active",
          access_scope: "waitlist",
          metadata: {
            ...metadata(existingGrant?.metadata),
            ...baseMetadata,
            source: "phase12_6_curated_lot",
            waitlist_status: "observacao_privada",
            future_invitation_bridge: true
          },
          updated_at: isoAt(0),
          last_synced_at: isoAt(0),
          access_origin: blueprint.sourceChannel
        }
      );

      for (const [eventKey, pagePath, occurredAt] of [
        ["waitlist_interest", "/cliente/ecossistema/beneficios", isoAt(-18)],
        ["premium_interest_signal", "/cliente/ecossistema", isoAt(-16)],
        ["paid_interest_signal", "/cliente/ecossistema/beneficios", isoAt(-14)]
      ]) {
        await ensureEvent(
          profile.id,
          eventKey,
          pagePath,
          {
            phase: PHASE,
            lot_code: LOT_CODE,
            journey: "circulo_essencial",
            source_channel: blueprint.sourceChannel,
            entry_state: blueprint.founderState,
            controlled: true
          },
          occurredAt
        );
      }
    }

    preparedProfiles.push({
      profile_id: profile.id,
      email: profile.email,
      founder_state: blueprint.founderState,
      source_channel: blueprint.sourceChannel,
      priority_tier: blueprint.priorityTier
    });
  }

  console.log(
    JSON.stringify(
      {
        materializedAt: new Date().toISOString(),
        phase: PHASE,
        lot_code: LOT_CODE,
        prepared_profiles: preparedProfiles
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.6-materialize] Failed:", error.message);
  process.exit(1);
});
