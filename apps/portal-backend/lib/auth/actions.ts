"use server";

import { redirect } from "next/navigation";

import { CLIENT_LOGIN_PATH } from "../../lib/auth/access-control.ts";
import {
  getAuthEnvDiagnostics,
  isAuthEnvConfigurationError
} from "../../lib/config/env.ts";
import { createServerSupabaseClient } from "../../lib/supabase/server.ts";

export async function logoutAction() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    redirect(`${CLIENT_LOGIN_PATH}?success=sessao-encerrada`);
  } catch (error) {
    console.error("[auth.logout] Failed to terminate session", {
      message: error instanceof Error ? error.message : String(error),
      authEnv: getAuthEnvDiagnostics()
    });

    const code = isAuthEnvConfigurationError(error) ? "auth-indisponivel" : "erro-encerrar-sessao";
    redirect(`${CLIENT_LOGIN_PATH}?error=${code}`);
  }
}
