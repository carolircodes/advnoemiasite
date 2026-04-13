"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_CLIENT_LOGIN_PATH = exports.CLIENT_LOGIN_PATH = void 0;
exports.normalizeNextPath = normalizeNextPath;
exports.isStaffRole = isStaffRole;
exports.isInternalPath = isInternalPath;
exports.isInternalApiPath = isInternalApiPath;
exports.isClientPortalPath = isClientPortalPath;
exports.isSharedPortalPath = isSharedPortalPath;
exports.isProtectedPortalPath = isProtectedPortalPath;
exports.getDefaultDestinationForProfile = getDefaultDestinationForProfile;
exports.canAccessPortalPath = canAccessPortalPath;
exports.buildLoginRedirectPath = buildLoginRedirectPath;
exports.buildAccessDeniedPath = buildAccessDeniedPath;
exports.getPostAuthDestination = getPostAuthDestination;
exports.getAccessMessage = getAccessMessage;
exports.CLIENT_LOGIN_PATH = "/portal/login";
exports.LEGACY_CLIENT_LOGIN_PATH = "/auth/login";
function matchesPrefix(pathname, basePath) {
    return pathname === basePath || pathname.startsWith(`${basePath}/`);
}
function normalizeNextPath(next) {
    if (!next || !next.startsWith("/") || next.startsWith("//")) {
        return null;
    }
    return next;
}
function isStaffRole(role) {
    return role === "admin" || role === "advogada";
}
function isInternalPath(pathname) {
    return matchesPrefix(pathname, "/internal");
}
function isInternalApiPath(pathname) {
    return matchesPrefix(pathname, "/api/internal");
}
function isClientPortalPath(pathname) {
    return matchesPrefix(pathname, "/cliente");
}
function isSharedPortalPath(pathname) {
    return matchesPrefix(pathname, "/documentos") || matchesPrefix(pathname, "/agenda");
}
function isProtectedPortalPath(pathname) {
    return (isInternalPath(pathname) ||
        isInternalApiPath(pathname) ||
        isClientPortalPath(pathname) ||
        isSharedPortalPath(pathname));
}
function getDefaultDestinationForProfile(profile) {
    if (profile.role === "cliente" && !profile.first_login_completed_at) {
        return "/auth/primeiro-acesso";
    }
    return isStaffRole(profile.role) ? "/internal/advogada" : "/cliente";
}
function canAccessPortalPath(profile, pathname) {
    const normalizedPath = normalizeNextPath(pathname) || pathname;
    const needsFirstAccess = profile.role === "cliente" && !profile.first_login_completed_at;
    if (matchesPrefix(normalizedPath, "/auth/primeiro-acesso")) {
        return profile.role === "cliente";
    }
    if (matchesPrefix(normalizedPath, "/auth/atualizar-senha")) {
        return true;
    }
    if (needsFirstAccess) {
        return false;
    }
    if (isInternalPath(normalizedPath) || isInternalApiPath(normalizedPath)) {
        return isStaffRole(profile.role);
    }
    if (isClientPortalPath(normalizedPath)) {
        return profile.role === "cliente";
    }
    if (isSharedPortalPath(normalizedPath)) {
        return profile.role === "cliente" || isStaffRole(profile.role);
    }
    return true;
}
function appendErrorParam(pathname, error) {
    const separator = pathname.includes("?") ? "&" : "?";
    return `${pathname}${separator}error=${encodeURIComponent(error)}`;
}
function buildLoginRedirectPath(nextPath, error = "login-obrigatorio") {
    const params = new URLSearchParams({
        error
    });
    const normalizedNext = normalizeNextPath(nextPath);
    if (normalizedNext) {
        params.set("next", normalizedNext);
    }
    return `${exports.CLIENT_LOGIN_PATH}?${params.toString()}`;
}
function buildAccessDeniedPath(profile) {
    const error = profile.role === "cliente" && !profile.first_login_completed_at
        ? "primeiro-acesso-obrigatorio"
        : "acesso-negado";
    return appendErrorParam(getDefaultDestinationForProfile(profile), error);
}
function getPostAuthDestination(profile, requestedPath) {
    const normalizedNext = normalizeNextPath(requestedPath);
    if (!normalizedNext) {
        return getDefaultDestinationForProfile(profile);
    }
    if (canAccessPortalPath(profile, normalizedNext)) {
        return normalizedNext;
    }
    return buildAccessDeniedPath(profile);
}
function getAccessMessage(error) {
    switch (error) {
        case "login-obrigatorio":
            return "Faca login para continuar no portal.";
        case "auth-indisponivel":
            return "A autenticacao do portal esta temporariamente indisponivel. Tente novamente em instantes.";
        case "acesso-negado":
            return "Voce nao tem permissao para acessar esta area.";
        case "acesso-restrito":
            return "Seu perfil nao esta autorizado a acessar o portal.";
        case "perfil-inativo":
            return "Seu perfil esta inativo. Fale com a equipe responsavel.";
        case "primeiro-acesso-obrigatorio":
            return "Conclua o primeiro acesso antes de entrar nesta area.";
        default:
            return "";
    }
}
