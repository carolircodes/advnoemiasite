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
  console.error("[phase12.1-telemetry] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const basePayload = {
  phase: "12.4",
  controlled: true,
  source: "phase12_4_smoke_test"
};

const events = [
  {
    event_key: "subscription_started",
    event_group: "ecosystem",
    page_path: "/cliente/ecossistema/beneficios",
    payload: {
      ...basePayload,
      surface: "client_ecosystem_founder_activation"
    }
  },
  {
    event_key: "founding_live_activated",
    event_group: "ecosystem",
    page_path: "/internal/advogada/ecossistema",
    payload: {
      ...basePayload,
      surface: "internal_ecosystem_hub",
      section: "founding_live"
    }
  }
];

async function main() {
  const { data, error } = await supabase
    .from("product_events")
    .insert(events)
    .select("id,event_key,event_group,occurred_at");

  if (error) {
    throw new Error(error.message);
  }

  console.log(JSON.stringify({ inserted: data || [] }, null, 2));
}

main().catch((error) => {
  console.error("[phase12.1-telemetry] Failed:", error.message);
  process.exit(1);
});
