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
  console.error("[phase12.1-audit] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const tables = [
  "ecosystem_catalog_items",
  "ecosystem_plan_tiers",
  "ecosystem_plan_benefits",
  "ecosystem_access_grants",
  "ecosystem_subscriptions",
  "ecosystem_content_tracks",
  "ecosystem_content_modules",
  "ecosystem_content_units",
  "ecosystem_content_assets",
  "ecosystem_content_progress",
  "ecosystem_communities",
  "ecosystem_community_memberships"
];

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact" })
    .limit(1);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count || 0;
}

async function latestRows(table, columns, limit = 3) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data || [];
}

async function main() {
  const counts = {};

  for (const table of tables) {
    counts[table] = await countRows(table);
  }

  const [catalogItems, plans, tracks, communities, productEvents] = await Promise.all([
    latestRows(
      "ecosystem_catalog_items",
      "slug,title,availability_status,portal_workspace,legal_boundary"
    ),
    latestRows("ecosystem_plan_tiers", "code,name,status,cadence,portal_workspace"),
    latestRows("ecosystem_content_tracks", "slug,title,status,portal_workspace"),
    latestRows("ecosystem_communities", "slug,title,status,portal_workspace"),
    supabase
      .from("product_events")
      .select("event_key,event_group,occurred_at,payload")
      .in("event_group", ["ecosystem", "revenue"])
      .order("occurred_at", { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (error) {
          throw new Error(`product_events: ${error.message}`);
        }

        return data || [];
      })
  ]);

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        counts,
        samples: {
          catalogItems,
          plans,
          tracks,
          communities,
          productEvents
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[phase12.1-audit] Failed:", error.message);
  process.exit(1);
});
