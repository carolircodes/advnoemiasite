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

const INITIAL_TARGET = 3;

async function main() {
  const [
    grantsResult,
    subscriptionsResult,
    membershipsResult,
    profilesResult
  ] = await Promise.all([
    supabase
      .from("ecosystem_access_grants")
      .select("profile_id,grant_status,access_scope,created_at")
      .in("access_scope", ["founding_beta", "founding_live"])
      .order("created_at", { ascending: true }),
    supabase
      .from("ecosystem_subscriptions")
      .select("profile_id,status,source_of_activation,payment_provider,created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("ecosystem_community_memberships")
      .select("profile_id,status,access_level,created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id,full_name,email,role,created_at")
      .eq("role", "cliente")
      .order("created_at", { ascending: true })
  ]);

  for (const result of [grantsResult, subscriptionsResult, membershipsResult, profilesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const grants = grantsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const memberships = membershipsResult.data || [];
  const profiles = profilesResult.data || [];

  const liveByProfile = new Map();
  for (const subscription of subscriptions) {
    if (subscription.payment_provider === "mercado_pago_preapproval") {
      liveByProfile.set(subscription.profile_id, subscription);
    }
  }

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

  const eligibleProfiles = profiles
    .map((profile) => {
      const grant = grantByProfile.get(profile.id) || null;
      const live = liveByProfile.get(profile.id) || null;
      const membership = membershipByProfile.get(profile.id) || null;
      const betaSubscription = subscriptions.find(
        (item) =>
          item.profile_id === profile.id && item.source_of_activation === "founding_beta"
      );

      const eligible =
        Boolean(grant && grant.grant_status === "active") &&
        !live &&
        (grant.access_scope === "founding_beta" || betaSubscription);

      if (!eligible) {
        return null;
      }

      return {
        profile_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        current_founding_state: grant?.access_scope || "founding_beta",
        community_state: membership?.status || "invited",
        recommendation: "curated_invite_for_live_authorization",
        rationale:
          "perfil fundador ativo sem assinatura live vinculada; pronto para convite manual e autorizacao recorrente controlada"
      };
    })
    .filter(Boolean)
    .slice(0, INITIAL_TARGET);

  console.log(
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        phase: "12.4",
        operation: {
          rollout_mode: "controlled_founding_live",
          initial_target: INITIAL_TARGET,
          invite_policy: "curated_invitation_only",
          eligibility:
            "founding_beta ativo com grant preservado, membership coerente e ausencia de assinatura live vigente"
        },
        candidates: eligibleProfiles
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
