"use server";

import { redirect } from "next/navigation";

import { CLIENT_LOGIN_PATH } from "@/lib/auth/access-control";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(`${CLIENT_LOGIN_PATH}?success=sessao-encerrada`);
}
