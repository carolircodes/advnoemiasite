import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  buildAccessDeniedPath,
  buildLoginRedirectPath,
  getDefaultDestinationForProfile,
  isStaffRole
} from "./access-control";
import { isPortalRole, type PortalRole } from "../domain/portal";
import { createAdminSupabaseClient } from "../supabase/admin";
import { createServerSupabaseClient } from "../supabase/server";

export { getDefaultDestinationForProfile, isStaffRole } from "./access-control";

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
  let supabase;

  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "ZodError" ||
        error.message.includes("NEXT_PUBLIC_APP_URL") ||
        error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
        error.message.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
        error.message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
        error.message.includes("Supabase nao configurado corretamente"))
    ) {
      console.warn("[auth.getCurrentProfile] Auth env unavailable, falling back to visitor mode", {
        message: error.message
      });

      return null;
    }

    throw error;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,phone,role,is_active,invited_at,first_login_completed_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Nao foi possivel carregar o perfil autenticado: ${error.message}`);
  }

  return (data as PortalProfile | null) || null;
}

export async function requireProfile(allowedRoles?: PortalRole[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(buildLoginRedirectPath(null, "login-obrigatorio"));
  }

  if (!profile.is_active) {
    redirect(buildLoginRedirectPath(null, "perfil-inativo"));
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(buildAccessDeniedPath(profile));
  }

  return profile;
}

export async function requireInternalApiProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      ok: false as const,
      status: 401,
      error: "Faca login para acessar a API interna."
    };
  }

  if (!profile.is_active) {
    return {
      ok: false as const,
      status: 403,
      error: "Seu perfil do portal esta inativo."
    };
  }

  if (!isStaffRole(profile.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas perfis internos autorizados podem acessar esta API."
    };
  }

  return {
    ok: true as const,
    profile
  };
}

export async function assertStaffActor(actorProfileId: string) {
  const profile = await getProfileById(actorProfileId);

  if (!profile || !profile.is_active || !isStaffRole(profile.role)) {
    throw new Error(
      "Apenas perfis internos ativos e autorizados podem executar esta operacao."
    );
  }

  return profile;
}
