import "server-only";

import { redirect } from "next/navigation";

import type { PortalRole } from "@/lib/domain/portal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PortalProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: PortalRole;
  is_active: boolean;
  invited_at: string | null;
  first_login_completed_at: string | null;
};

export function isStaffRole(role: PortalRole) {
  return role === "admin" || role === "advogada";
}

export function getDefaultDestinationForRole(profile: Pick<PortalProfile, "role">) {
  return isStaffRole(profile.role) ? "/internal/advogada" : "/cliente";
}

export async function getProfileById(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,phone,role,is_active,invited_at,first_login_completed_at"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o perfil: ${error.message}`);
  }

  return data as PortalProfile | null;
}

export async function getCurrentProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getProfileById(user.id);
}

export async function requireProfile(allowedRoles?: PortalRole[]) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect("/auth/login?error=acesso-restrito");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(getDefaultDestinationForRole(profile));
  }

  return profile;
}
