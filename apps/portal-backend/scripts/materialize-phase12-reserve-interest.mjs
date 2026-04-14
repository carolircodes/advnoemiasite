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
  console.error("[phase12.9-materialize] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PHASE = "12.9";
const NOW = Date.now();

const cohort = [
  {
    email: "noemiapadvocacia@gmail.com",
    full_name: "noemiapadvocacia",
    state: "active_founder",
    source_channel: "whatsapp_curated",
    priority_tier: "lote_02_imediato",
    eligibility_reason: "convite convertido em entrada fundadora com aderencia real",
    create_progress: true,
    progress_percent: 44
  },
  {
    email: "circuloessencial.editorial01@gmail.com",
    full_name: "circuloeditorial01",
    state: "active_founder",
    source_channel: "articles_editorial_bridge",
    priority_tier: "lote_02_editorial",
    eligibility_reason: "profundidade editorial e desejo qualificado para entrar no ciclo fundador",
    create_progress: true,
    progress_percent: 26
  },
  {
    email: "circuloessencial.reserva01@gmail.com",
    full_name: "circuloreserva01",
    state: "reserved_interest",
    source_channel: "site_editorial_bridge",
    priority_tier: "reserva_prioritaria_a",
    eligibility_reason: "interesse pago futuro declarado com origem editorial forte"
  },
  {
    email: "circuloessencial.reserva02@gmail.com",
    full_name: "circuloreserva02",
    state: "reserved_interest",
    source_channel: "articles_editorial_bridge",
    priority_tier: "reserva_prioritaria_a",
    eligibility_reason: "apetite de continuidade e afinidade alta com o posicionamento do Circulo"
  },
  {
    email: "circuloessencial.reserva03@gmail.com",
    full_name: "circuloreserva03",
    state: "reserved_interest",
    source_channel: "instagram_dm_curated",
    priority_tier: "reserva_prioritaria_b",
    eligibility_reason: "desejo consistente com permanencia futura e sinais de prioridade"
  },
  {
    email: "circuloessencial.waitlist01@gmail.com",
    full_name: "circulowaitlist01",
    state: "waitlist",
    source_channel: "site_curated_entry",
    priority_tier: "observacao_editorial",
    eligibility_reason: "interesse qualificado ainda em observacao"
  },
  {
    email: "circuloessencial.waitlist02@gmail.com",
    full_name: "circulowaitlist02",
    state: "waitlist",
    source_channel: "articles_private_interest",
    priority_tier: "observacao_editorial",
    eligibility_reason: "afinidade promissora vinda dos artigos"
  },
  {
    email: "circuloessencial.waitlist03@gmail.com",
    full_name: "circulowaitlist03",
    state: "waitlist",
    source_channel: "site_editorial_bridge",
    priority_tier: "observacao_curada",
    eligibility_reason: "interesse premium com necessidade de densidade antes do convite"
  }
];

function isoAt(offsetMinutes = 0) {
  return new Date(NOW + offsetMinutes * 60 * 1000).toISOString();
}

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function ensureProfile(item) {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("email", item.email)
    .limit(1);

  if (selectError) {
    throw new Error(`profiles: ${selectError.message}`);
  }

  if (existing && existing.length > 0) {
    return existing[0];
  }

  const { data: authUserData, error: authUserError } = await supabase.auth.admin.createUser({
    email: item.email,
    email_confirm: true,
    user_metadata: {
      role: "cliente",
      full_name: item.full_name,
      seeded_by: "phase12_9_reserve_interest"
    }
  });

  if (authUserError || !authUserData?.user) {
    throw new Error(`profiles auth: ${authUserError?.message || "nao foi possivel criar auth user"}`);
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: authUserData.user.id,
        email: item.email,
        full_name: item.full_name,
        role: "cliente",
        is_active: true
      },
      {
        onConflict: "id"
      }
    )
    .select("id,email,full_name,role")
    .single();

  if (error) {
    throw new Error(`profiles: ${error.message}`);
  }

  return data;
}

async function latestByProfile(table, profileId) {
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

async function ensureUpsert(table, existingRow, insertPayload, updatePayload) {
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

async function main() {
  const [catalogResult, planResult, communityResult, trackResult, moduleResult, unitResult] =
    await Promise.all([
      supabase
        .from("ecosystem_catalog_items")
        .select("id")
        .eq("slug", "biblioteca-estrategica-premium")
        .single(),
      supabase
        .from("ecosystem_plan_tiers")
        .select("id")
        .eq("code", "circulo_essencial")
        .single(),
      supabase
        .from("ecosystem_communities")
        .select("id")
        .eq("slug", "circulo-reservado")
        .single(),
      supabase
        .from("ecosystem_content_tracks")
        .select("id")
        .eq("slug", "trilha-clareza-estrategica")
        .single(),
      supabase
        .from("ecosystem_content_modules")
        .select("id")
        .eq("track_id", "8f1d559e-ee8f-4c86-8abb-66b9c67dcd9a")
        .single(),
      supabase
        .from("ecosystem_content_units")
        .select("id")
        .eq("module_id", "9b9c88d9-2b2c-4e9b-937f-c51656c1407f")
        .single()
    ]);

  for (const result of [
    catalogResult,
    planResult,
    communityResult,
    trackResult,
    moduleResult,
    unitResult
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const prepared = [];

  for (const item of cohort) {
    const profile = await ensureProfile(item);
    const baseMetadata = {
      phase: PHASE,
      source: "phase12_9_reserve_interest",
      journey: "circulo_essencial",
      entry_state: item.state,
      source_channel: item.source_channel,
      priority_tier: item.priority_tier,
      eligibility_reason: item.eligibility_reason,
      reserve_layer: true
    };

    if (item.state === "active_founder") {
      const existingSubscription = await latestByProfile("ecosystem_subscriptions", profile.id);
      const subscription = await ensureUpsert(
        "ecosystem_subscriptions",
        existingSubscription,
        {
          profile_id: profile.id,
          plan_tier_id: planResult.data.id,
          origin_catalog_item_id: catalogResult.data.id,
          status: "active",
          cadence: "monthly",
          renewal_mode: "manual_beta",
          payment_provider: null,
          current_period_started_at: isoAt(-120),
          current_period_ends_at: isoAt(60 * 24 * 30),
          metadata: {
            ...baseMetadata,
            entitlement_source: "active_founder",
            billing_live: false
          },
          billing_status: "beta_manual",
          source_of_activation: "active_founder",
          renewal_cycle: 1,
          renewal_due_at: isoAt(60 * 24 * 30),
          next_billing_at: isoAt(60 * 24 * 30)
        },
        {
          status: "active",
          source_of_activation: "active_founder",
          metadata: {
            ...metadata(existingSubscription?.metadata),
            ...baseMetadata
          },
          updated_at: isoAt(0)
        }
      );

      const existingGrant = await latestByProfile("ecosystem_access_grants", profile.id);
      await ensureUpsert(
        "ecosystem_access_grants",
        existingGrant,
        {
          profile_id: profile.id,
          catalog_item_id: catalogResult.data.id,
          subscription_id: subscription.id,
          source_type: "manual_curated",
          grant_status: "active",
          portal_workspace: "ecosystem_hub",
          access_scope: "active_founder",
          starts_at: isoAt(-120),
          last_synced_at: isoAt(0),
          access_origin: item.source_channel,
          metadata: {
            ...baseMetadata,
            density_wave: "phase12_9"
          }
        },
        {
          grant_status: "active",
          access_scope: "active_founder",
          last_synced_at: isoAt(0),
          access_origin: item.source_channel,
          metadata: {
            ...metadata(existingGrant?.metadata),
            ...baseMetadata,
            density_wave: "phase12_9"
          },
          updated_at: isoAt(0)
        }
      );

      const existingMembership = await latestByProfile("ecosystem_community_memberships", profile.id);
      await ensureUpsert(
        "ecosystem_community_memberships",
        existingMembership,
        {
          profile_id: profile.id,
          community_id: communityResult.data.id,
          subscription_id: subscription.id,
          status: "active",
          access_level: "active_founder",
          joined_at: isoAt(-110),
          last_active_at: isoAt(-10),
          entitlement_origin: item.source_channel,
          metadata: {
            ...baseMetadata,
            social_density: "live"
          }
        },
        {
          status: "active",
          access_level: "active_founder",
          last_active_at: isoAt(-10),
          entitlement_origin: item.source_channel,
          metadata: {
            ...metadata(existingMembership?.metadata),
            ...baseMetadata,
            social_density: "live"
          },
          updated_at: isoAt(0)
        }
      );

      if (item.create_progress) {
        const existingProgress = await latestByProfile("ecosystem_content_progress", profile.id);
        await ensureUpsert(
          "ecosystem_content_progress",
          existingProgress,
          {
            profile_id: profile.id,
            track_id: trackResult.data.id,
            module_id: moduleResult.data.id,
            unit_id: unitResult.data.id,
            status: "in_progress",
            progress_percent: item.progress_percent,
            started_at: isoAt(-100),
            last_consumed_at: isoAt(-15),
            metadata: {
              ...baseMetadata,
              progress_wave: "phase12_9"
            }
          },
          {
            status: "in_progress",
            progress_percent: item.progress_percent,
            last_consumed_at: isoAt(-15),
            metadata: {
              ...metadata(existingProgress?.metadata),
              ...baseMetadata,
              progress_wave: "phase12_9"
            },
            updated_at: isoAt(0)
          }
        );
      }

      for (const [eventKey, pagePath, offset] of [
        ["member_joined", "/cliente/ecossistema/comunidade", -90],
        ["onboarding_completed", "/cliente/ecossistema", -80],
        ["content_started", "/cliente/ecossistema/conteudo", -70],
        ["member_active", "/cliente/ecossistema", -30],
        ["community_viewed", "/cliente/ecossistema/comunidade", -20],
        ["founder_engagement_score", "/cliente/ecossistema/comunidade", -15],
        ["retention_signal", "/cliente/ecossistema", -10],
        ["monetization_readiness_signal", "/internal/advogada/ecossistema", -5]
      ]) {
        await ensureEvent(
          profile.id,
          eventKey,
          pagePath,
          {
            ...baseMetadata,
            density_signal: true
          },
          isoAt(offset)
        );
      }
    }

    if (item.state === "reserved_interest" || item.state === "waitlist") {
      const existingGrant = await latestByProfile("ecosystem_access_grants", profile.id);
      const accessScope = item.state;
      await ensureUpsert(
        "ecosystem_access_grants",
        existingGrant,
        {
          profile_id: profile.id,
          catalog_item_id: catalogResult.data.id,
          subscription_id: null,
          source_type: "manual_curated",
          grant_status: "active",
          portal_workspace: "ecosystem_hub",
          access_scope: accessScope,
          starts_at: isoAt(-50),
          last_synced_at: isoAt(0),
          access_origin: item.source_channel,
          metadata: {
            ...baseMetadata,
            future_invitation_bridge: true
          }
        },
        {
          grant_status: "active",
          access_scope: accessScope,
          last_synced_at: isoAt(0),
          access_origin: item.source_channel,
          metadata: {
            ...metadata(existingGrant?.metadata),
            ...baseMetadata,
            future_invitation_bridge: true
          },
          updated_at: isoAt(0)
        }
      );

      const eventTriples =
        item.state === "reserved_interest"
          ? [
              ["premium_interest_signal", "/cliente/ecossistema/beneficios", -40],
              ["paid_interest_signal", "/cliente/ecossistema/beneficios", -35],
              ["reserved_priority_signal", "/cliente/ecossistema/beneficios", -30],
              ["monetization_readiness_signal", "/internal/advogada/ecossistema", -25]
            ]
          : [
              ["premium_interest_signal", "/cliente/ecossistema", -40],
              ["waitlist_interest", "/cliente/ecossistema/beneficios", -35],
              ["paid_interest_signal", "/cliente/ecossistema/beneficios", -30]
            ];

      for (const [eventKey, pagePath, offset] of eventTriples) {
        await ensureEvent(
          profile.id,
          eventKey,
          pagePath,
          {
            ...baseMetadata,
            reserve_signal: item.state === "reserved_interest"
          },
          isoAt(offset)
        );
      }
    }

    prepared.push({
      email: profile.email,
      state: item.state,
      source_channel: item.source_channel
    });
  }

  console.log(
    JSON.stringify(
      {
        materializedAt: new Date().toISOString(),
        phase: PHASE,
        prepared
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.9-materialize] Failed:", error.message);
  process.exit(1);
});
