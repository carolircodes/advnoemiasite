import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getAdminEnv } from "../config/env";

export function createAdminSupabaseClient() {
  const env = getAdminEnv();

  // Privileged client for server-side flows only.
  // Route or service boundaries must validate auth/secret before reaching here.
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
