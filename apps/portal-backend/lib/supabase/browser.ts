"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("As variaveis publicas do Supabase nao foram configuradas.");
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
