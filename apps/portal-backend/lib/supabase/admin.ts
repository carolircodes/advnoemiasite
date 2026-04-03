import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

export function createAdminSupabaseClient() {
  const env = getServerEnv();

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
