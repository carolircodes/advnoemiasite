import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { isPortalRole, type PortalRole } from "@/lib/domain/portal";
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

export function getDefaultDestinationForProfile(
  profile: Pick<PortalProfile, "role" | "first_login_completed_at">
) {
  if (profile.role === "cliente" && !profile.first_login_completed_at) {
    return "/auth/primeiro-acesso";
  }

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

function inferRoleFromAuthUser(user: User): PortalRole {
  const metadataRole = user.user_metadata?.role;
  return isPortalRole(metadataRole) ? metadataRole : "cliente";
}

function inferFullNameFromAuthUser(user: User) {
  const metadataFullName = user.user_metadata?.full_name;

  if (typeof metadataFullName === "string" && metadataFullName.trim().length >= 3) {
    return metadataFullName.trim();
  }

  return user.email?.split("@")[0] || "Usuario do portal";
}

export async function ensureProfileForUser(user: User) {
  const existingProfile = await getProfileById(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email || "",
        full_name: inferFullNameFromAuthUser(user),
        role: inferRoleFromAuthUser(user),
        is_active: true
      },
      {
        onConflict: "id"
      }
    )
    .select(
      "id,email,full_name,phone,role,is_active,invited_at,first_login_completed_at"
    )
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Nao foi possivel sincronizar o perfil autenticado."
    );
  }

  return data as PortalProfile;
}

export async function getCurrentProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return ensureProfileForUser(user);
}

export async function requireProfile(allowedRoles?: PortalRole[]) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect("/auth/login?error=acesso-restrito");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(getDefaultDestinationForProfile(profile));
  }

  return profile;
}
