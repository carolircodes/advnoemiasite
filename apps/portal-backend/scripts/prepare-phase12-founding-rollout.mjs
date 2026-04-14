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
  console.error("[phase12.4-founding-rollout] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const INITIAL_TARGET = 5;

async function main() {
  const [grantsResult, membershipsResult, subscriptionsResult, profilesResult] =
    await Promise.all([
      supabase
        .from("ecosystem_access_grants")
        .select("profile_id,grant_status,access_scope,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("ecosystem_community_memberships")
        .select("profile_id,status,access_level,last_active_at,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("ecosystem_subscriptions")
        .select("profile_id,status,source_of_activation,payment_provider,created_at")
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
    profilesResult
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const grants = grantsResult.data || [];
  const memberships = membershipsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const profiles = profilesResult.data || [];

  const membershipByProfile = new Map();
  for (const membership of memberships) {
    if (!membershipByProfile.has(membership.profile_id)) {
      membershipByProfile.set(membership.profile_id, membership);
    }
  }

  const grantByProfile = new Map();
  for (const grant of grants) {
    if (!grantByProfile.has(grant.profile_id)) {
      grantByProfile.set(grant.profile_id, grant);
    }
  }

  const candidates = profiles
    .map((profile) => {
      const grant = grantByProfile.get(profile.id) || null;
      const membership = membershipByProfile.get(profile.id) || null;
      const founderSubscription = subscriptions.find(
        (item) =>
          item.profile_id === profile.id && item.source_of_activation === "founding_beta"
      );

      if (!grant || grant.grant_status !== "active") {
        return null;
      }

      const founderState =
        grant.access_scope === "waitlist"
          ? "waitlist"
          : membership?.status === "invited"
            ? "invited"
            : "active_founder";

      return {
        profile_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        founder_state: founderState,
        grant_scope: grant.access_scope,
        membership_state: membership?.status || "invited",
        subscription_reference: founderSubscription?.source_of_activation || "manual_founder",
        recommendation:
          founderState === "active_founder"
            ? "preserve_and_deepen_value"
            : founderState === "invited"
              ? "complete_onboarding"
              : "nurture_waitlist_desire"
      };
    })
    .filter(Boolean)
    .slice(0, INITIAL_TARGET);

  console.log(
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        phase: "12.4-reoriented",
        operation: {
          mode: "free_private_founding",
          initial_target: INITIAL_TARGET,
          invite_policy: "curated_invitation_only",
          eligibility:
            "founder com grant ativo, entrada curada e comunidade privada sem cobranca ativa"
        },
        candidates
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.4-founding-rollout] Failed:", error.message);
  process.exit(1);
});
