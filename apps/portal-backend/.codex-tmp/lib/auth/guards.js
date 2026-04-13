"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStaffRole = exports.getDefaultDestinationForProfile = void 0;
exports.getProfileById = getProfileById;
exports.ensureProfileForUser = ensureProfileForUser;
exports.getCurrentProfile = getCurrentProfile;
exports.requireProfile = requireProfile;
exports.requireInternalApiProfile = requireInternalApiProfile;
exports.assertStaffActor = assertStaffActor;
require("server-only");
const navigation_1 = require("next/navigation");
const access_control_1 = require("./access-control");
const portal_1 = require("../domain/portal");
const env_1 = require("../config/env");
const admin_1 = require("../supabase/admin");
const server_1 = require("../supabase/server");
var access_control_2 = require("./access-control");
Object.defineProperty(exports, "getDefaultDestinationForProfile", { enumerable: true, get: function () { return access_control_2.getDefaultDestinationForProfile; } });
Object.defineProperty(exports, "isStaffRole", { enumerable: true, get: function () { return access_control_2.isStaffRole; } });
async function getProfileById(profileId) {
    const supabase = (0, admin_1.createAdminSupabaseClient)();
    const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,role,is_active,invited_at,first_login_completed_at")
        .eq("id", profileId)
        .maybeSingle();
    if (error) {
        throw new Error(`Não foi possível carregar o perfil: ${error.message}`);
    }
    return data;
}
function inferRoleFromAuthUser(user) {
    const metadataRole = user.user_metadata?.role;
    return (0, portal_1.isPortalRole)(metadataRole) ? metadataRole : "cliente";
}
function inferFullNameFromAuthUser(user) {
    const metadataFullName = user.user_metadata?.full_name;
    if (typeof metadataFullName === "string" && metadataFullName.trim().length >= 3) {
        return metadataFullName.trim();
    }
    return user.email?.split("@")[0] || "Usuario do portal";
}
async function ensureProfileForUser(user) {
    const existingProfile = await getProfileById(user.id);
    if (existingProfile) {
        return existingProfile;
    }
    const supabase = (0, admin_1.createAdminSupabaseClient)();
    const { data, error } = await supabase
        .from("profiles")
        .upsert({
        id: user.id,
        email: user.email || "",
        full_name: inferFullNameFromAuthUser(user),
        role: inferRoleFromAuthUser(user),
        is_active: true
    }, {
        onConflict: "id"
    })
        .select("id,email,full_name,phone,role,is_active,invited_at,first_login_completed_at")
        .single();
    if (error || !data) {
        throw new Error(error?.message || "Nao foi possivel sincronizar o perfil autenticado.");
    }
    return data;
}
async function loadCurrentProfile(options) {
    let supabase;
    try {
        supabase = await (0, server_1.createServerSupabaseClient)();
    }
    catch (error) {
        if (options.allowVisitorFallback && (0, env_1.isPublicAuthEnvConfigurationError)(error)) {
            console.warn("[auth.getCurrentProfile] Auth env unavailable, falling back to visitor mode", {
                message: error instanceof Error ? error.message : String(error),
                authEnv: (0, env_1.getAuthEnvDiagnostics)()
            });
            return null;
        }
        throw error;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return null;
    }
    const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,role,is_active,invited_at,first_login_completed_at")
        .eq("id", user.id)
        .maybeSingle();
    if (error) {
        throw new Error(`Nao foi possivel carregar o perfil autenticado: ${error.message}`);
    }
    return data || null;
}
async function getCurrentProfile() {
    return loadCurrentProfile({ allowVisitorFallback: true });
}
async function getRequiredCurrentProfile() {
    return loadCurrentProfile({ allowVisitorFallback: false });
}
async function requireProfile(allowedRoles) {
    let profile;
    try {
        profile = await getRequiredCurrentProfile();
    }
    catch (error) {
        if ((0, env_1.isPublicAuthEnvConfigurationError)(error)) {
            console.error("[auth.requireProfile] Auth unavailable for protected route", {
                message: error instanceof Error ? error.message : String(error),
                authEnv: (0, env_1.getAuthEnvDiagnostics)()
            });
            (0, navigation_1.redirect)((0, access_control_1.buildLoginRedirectPath)(null, "auth-indisponivel"));
        }
        throw error;
    }
    if (!profile) {
        (0, navigation_1.redirect)((0, access_control_1.buildLoginRedirectPath)(null, "login-obrigatorio"));
    }
    if (!profile.is_active) {
        (0, navigation_1.redirect)((0, access_control_1.buildLoginRedirectPath)(null, "perfil-inativo"));
    }
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
        (0, navigation_1.redirect)((0, access_control_1.buildAccessDeniedPath)(profile));
    }
    return profile;
}
async function requireInternalApiProfile() {
    let profile;
    try {
        profile = await getRequiredCurrentProfile();
    }
    catch (error) {
        if ((0, env_1.isPublicAuthEnvConfigurationError)(error)) {
            return {
                ok: false,
                status: 503,
                error: "Autenticacao do portal indisponivel no momento."
            };
        }
        throw error;
    }
    if (!profile) {
        return {
            ok: false,
            status: 401,
            error: "Faca login para acessar a API interna."
        };
    }
    if (!profile.is_active) {
        return {
            ok: false,
            status: 403,
            error: "Seu perfil do portal esta inativo."
        };
    }
    if (!(0, access_control_1.isStaffRole)(profile.role)) {
        return {
            ok: false,
            status: 403,
            error: "Apenas perfis internos autorizados podem acessar esta API."
        };
    }
    return {
        ok: true,
        profile
    };
}
async function assertStaffActor(actorProfileId) {
    const profile = await getProfileById(actorProfileId);
    if (!profile || !profile.is_active || !(0, access_control_1.isStaffRole)(profile.role)) {
        throw new Error("Apenas perfis internos ativos e autorizados podem executar esta operacao.");
    }
    return profile;
}
