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
  console.error("[phase12.9-prepare] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function main() {
  const [grantsResult, membershipsResult, subscriptionsResult, progressResult, profilesResult] =
    await Promise.all([
      supabase
        .from("ecosystem_access_grants")
        .select("profile_id,grant_status,access_scope,access_origin,metadata,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("ecosystem_community_memberships")
        .select("profile_id,status,access_level,entitlement_origin,metadata,last_active_at,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("ecosystem_subscriptions")
        .select("profile_id,status,source_of_activation,payment_provider,metadata,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("ecosystem_content_progress")
        .select("profile_id,status,progress_percent,completed_at,metadata")
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id,full_name,email,role,created_at")
        .eq("role", "cliente")
        .order("created_at", { ascending: true })
    ]);

  for (const result of [
    grantsResult,
    membershipsResult,
    subscriptionsResult,
    progressResult,
    profilesResult
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const grants = grantsResult.data || [];
  const memberships = membershipsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const progressItems = progressResult.data || [];
  const profiles = profilesResult.data || [];

  const progressByProfile = new Map(progressItems.map((item) => [item.profile_id, item]));
  const membershipByProfile = new Map(memberships.map((item) => [item.profile_id, item]));
  const grantByProfile = new Map(grants.map((item) => [item.profile_id, item]));
  const subscriptionByProfile = new Map(subscriptions.map((item) => [item.profile_id, item]));

  const candidates = profiles.map((profile) => {
    const grant = grantByProfile.get(profile.id) || null;
    const membership = membershipByProfile.get(profile.id) || null;
    const subscription = subscriptionByProfile.get(profile.id) || null;
    const progress = progressByProfile.get(profile.id) || null;
    const grantMetadata = metadata(grant?.metadata);
    const membershipMetadata = metadata(membership?.metadata);
    const founderState =
      grant?.grant_status === "active" &&
      ["founding_beta", "active_founder", "founding_live"].includes(grant.access_scope)
        ? "active_founder"
        : grant?.access_scope === "reserved_interest"
          ? "reserved_interest"
          : membership?.status === "invited"
            ? "invited"
            : grant?.access_scope === "waitlist"
              ? "waitlist"
              : "deferred";

    return {
      profile_id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      founder_state: founderState,
      source_channel:
        grantMetadata.source_channel ||
        membershipMetadata.source_channel ||
        grant?.access_origin ||
        membership?.entitlement_origin ||
        "curadoria_interna",
      progress_percent: progress?.progress_percent || 0,
      content_status: progress?.status || "not_started",
      recommendation:
        founderState === "active_founder"
          ? "deepen_social_density"
          : founderState === "reserved_interest"
            ? "promote_priority_reserve"
            : founderState === "invited"
              ? "convert_invite"
              : founderState === "waitlist"
                ? "densify_waitlist"
                : "hold_in_curated_observation"
    };
  });

  console.log(
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        phase: "12.9",
        operation: {
          mode: "reserve_interest_density",
          objective: "transformar desejo em reserva qualificada e aproximar a comunidade dos thresholds de monetizacao"
        },
        states: {
          active_founder: candidates.filter((item) => item.founder_state === "active_founder").length,
          invited: candidates.filter((item) => item.founder_state === "invited").length,
          waitlist: candidates.filter((item) => item.founder_state === "waitlist").length,
          reserved_interest: candidates.filter((item) => item.founder_state === "reserved_interest").length
        },
        candidates
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.9-prepare] Failed:", error.message);
  process.exit(1);
});
