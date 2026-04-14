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
  console.error("[phase12.7-materialize] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PHASE = "12.7";
const NOW = Date.now();

const profiles = {
  founderLead: "5f37902a-8619-479e-925d-73916304b911",
  founderGrowth: "94d78a50-f0ae-4ed5-938c-368fc7f0ff24",
  invited: "3f507a72-af19-400b-888a-b710713a5652",
  waitlist: "8d726a73-6d75-433a-9508-f99e3042f40a"
};

function isoAt(offsetMinutes = 0) {
  return new Date(NOW + offsetMinutes * 60 * 1000).toISOString();
}

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function ensureEvent(profileId, eventKey, pagePath, payload, occurredAt) {
  const { data, error } = await supabase
    .from("product_events")
    .select("id,payload")
    .eq("event_group", "ecosystem")
    .eq("event_key", eventKey)
    .eq("page_path", pagePath)
    .eq("profile_id", profileId)
    .limit(50);

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

async function updateProgress(profileId, patch) {
  const { data, error } = await supabase
    .from("ecosystem_content_progress")
    .select("*")
    .eq("profile_id", profileId)
    .limit(1);

  if (error) {
    throw new Error(`ecosystem_content_progress: ${error.message}`);
  }

  const existing = data?.[0];

  if (!existing) {
    return;
  }

  const { error: updateError } = await supabase
    .from("ecosystem_content_progress")
    .update({
      ...patch,
      metadata: {
        ...metadata(existing.metadata),
        phase: PHASE,
        source: "phase12_7_retention_maturity",
        journey: "circulo_essencial",
        maturity_mode: "retention_and_completion"
      },
      updated_at: isoAt(0)
    })
    .eq("id", existing.id);

  if (updateError) {
    throw new Error(`ecosystem_content_progress: ${updateError.message}`);
  }
}

async function bumpMembership(profileId, sourceChannel) {
  const { data, error } = await supabase
    .from("ecosystem_community_memberships")
    .select("*")
    .eq("profile_id", profileId)
    .limit(1);

  if (error) {
    throw new Error(`ecosystem_community_memberships: ${error.message}`);
  }

  const existing = data?.[0];

  if (!existing) {
    return;
  }

  const { error: updateError } = await supabase
    .from("ecosystem_community_memberships")
    .update({
      last_active_at: isoAt(-5),
      metadata: {
        ...metadata(existing.metadata),
        phase: PHASE,
        source: "phase12_7_retention_maturity",
        source_channel: sourceChannel,
        retention_routine: "weekly_founder_pulse"
      },
      updated_at: isoAt(0)
    })
    .eq("id", existing.id);

  if (updateError) {
    throw new Error(`ecosystem_community_memberships: ${updateError.message}`);
  }
}

async function main() {
  await updateProgress(profiles.founderLead, {
    status: "completed",
    progress_percent: 100,
    started_at: isoAt(-240),
    last_consumed_at: isoAt(-30),
    completed_at: isoAt(-20)
  });

  await updateProgress(profiles.founderGrowth, {
    status: "in_progress",
    progress_percent: 62,
    started_at: isoAt(-200),
    last_consumed_at: isoAt(-25),
    completed_at: null
  });

  await bumpMembership(profiles.founderLead, "portal_founder_reference");
  await bumpMembership(profiles.founderGrowth, "site_curated_entry");

  const events = [
    [profiles.founderLead, "content_completed", "/cliente/ecossistema/conteudo", "portal_founder_reference", "active_founder", -20],
    [profiles.founderLead, "member_active", "/cliente/ecossistema", "portal_founder_reference", "active_founder", -18],
    [profiles.founderLead, "community_viewed", "/cliente/ecossistema/comunidade", "portal_founder_reference", "active_founder", -16],
    [profiles.founderLead, "retention_signal", "/cliente/ecossistema", "portal_founder_reference", "active_founder", -14],
    [profiles.founderLead, "founder_engagement_score", "/cliente/ecossistema/comunidade", "articles_editorial_bridge", "active_founder", -12],
    [profiles.founderGrowth, "content_started", "/cliente/ecossistema/conteudo", "site_curated_entry", "active_founder", -28],
    [profiles.founderGrowth, "member_active", "/cliente/ecossistema", "site_curated_entry", "active_founder", -10],
    [profiles.founderGrowth, "community_viewed", "/cliente/ecossistema/comunidade", "site_curated_entry", "active_founder", -8],
    [profiles.founderGrowth, "retention_signal", "/cliente/ecossistema", "site_curated_entry", "active_founder", -6],
    [profiles.founderGrowth, "founder_engagement_score", "/cliente/ecossistema/comunidade", "site_curated_entry", "active_founder", -4],
    [profiles.invited, "premium_interest_signal", "/cliente/ecossistema/beneficios", "site_curated_entry", "invited", -24],
    [profiles.waitlist, "waitlist_interest", "/cliente/ecossistema/beneficios", "site_editorial_bridge", "waitlist", -22],
    [profiles.waitlist, "paid_interest_signal", "/cliente/ecossistema/beneficios", "articles_editorial_bridge", "waitlist", -21]
  ];

  for (const [profileId, eventKey, pagePath, sourceChannel, entryState, offset] of events) {
    await ensureEvent(
      profileId,
      eventKey,
      pagePath,
      {
        phase: PHASE,
        source: "phase12_7_retention_maturity",
        journey: "circulo_essencial",
        source_channel: sourceChannel,
        entry_state: entryState,
        weekly_pulse: true
      },
      isoAt(offset)
    );
  }

  console.log(
    JSON.stringify(
      {
        materializedAt: new Date().toISOString(),
        phase: PHASE,
        outcomes: {
          founder_completed: profiles.founderLead,
          founder_progressed: profiles.founderGrowth,
          site_motor: true,
          articles_motor: true
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.7-materialize] Failed:", error.message);
  process.exit(1);
});
