import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "../config/env";

// Cliente Supabase para webhooks (sem dependência de cookies)
export function createWebhookSupabaseClient() {
  const env = getPublicEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
