"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn("Variáveis do Supabase não configuradas. Usando fallback seguro.");
    // Retornar cliente nulo ou mock para não quebrar o build
    return null;
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
