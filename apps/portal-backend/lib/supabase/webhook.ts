import { createClient } from "@supabase/supabase-js";
import { getAdminEnv } from "../config/env";

// Cliente Supabase para webhooks (server-side com service role)
export function createWebhookSupabaseClient() {
  const env = getAdminEnv();

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
