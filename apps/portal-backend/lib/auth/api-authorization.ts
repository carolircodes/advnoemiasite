import { NextResponse } from "next/server.js";

import type { PortalProfile } from "./guards.ts";
import { assertRouteSecret } from "../http/route-secret.ts";

type StaffAccessPayload =
  | {
      ok: true;
      profile: PortalProfile;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

type StaffAccessResolver = () => Promise<StaffAccessPayload>;

type AccessDenied = {
  ok: false;
  status: number;
  error: string;
  response: NextResponse;
};

type StaffAccess = {
  ok: true;
  actor: "staff";
  profile: PortalProfile;
};

type SecretAccess = {
  ok: true;
  actor: "internal-secret";
  secretName: string;
  source: string;
};

export type RouteAccessResult = AccessDenied | StaffAccess | SecretAccess;
export type StaffRouteAccessResult = AccessDenied | StaffAccess;

async function loadDefaultStaffAccess(): Promise<StaffAccessPayload> {
  const module = await import("./guards.ts");
  return module.requireInternalApiProfile();
}

function buildDeniedResponse(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function traceDeniedAccess(
  service: string,
  action: string,
  status: number,
  error: string
) {
  void import("../observability/operational-trace.ts")
    .then(({ traceOperationalEvent }) => {
      traceOperationalEvent(
        status >= 500 ? "error" : "warn",
        "API_ACCESS_DENIED",
        {
          service,
          action
        },
        {
          status,
          error
        }
      );
    })
    .catch(() => {
      console.warn("[api.authorization] Failed to emit access trace", {
        service,
        action,
        status
      });
    });
}

function deniedAccess(
  service: string,
  action: string,
  status: number,
  error: string
): AccessDenied {
  traceDeniedAccess(service, action, status, error);

  return {
    ok: false,
    status,
    error,
    response: buildDeniedResponse(status, error)
  };
}

export async function requireStaffRouteAccess(options: {
  service: string;
  action: string;
  resolveStaffAccess?: StaffAccessResolver;
}): Promise<StaffRouteAccessResult> {
  const resolveStaffAccess = options.resolveStaffAccess || loadDefaultStaffAccess;
  const access = await resolveStaffAccess();

  if (!access.ok) {
    return deniedAccess(
      options.service,
      options.action,
      access.status,
      access.error
    );
  }

  return {
    ok: true,
    actor: "staff",
    profile: access.profile
  };
}

export async function requireRouteSecretOrStaffAccess(options: {
  request: Request;
  service: string;
  action: string;
  expectedSecret: string | undefined;
  secretName: string;
  errorMessage: string;
  headerNames?: string[];
  queryParamNames?: string[];
  allowLocalWithoutSecret?: boolean;
  allowStaffFallback?: boolean;
  resolveStaffAccess?: StaffAccessResolver;
}): Promise<RouteAccessResult> {
  const secretAccess = assertRouteSecret({
    request: options.request,
    expectedSecret: options.expectedSecret,
    secretName: options.secretName,
    errorMessage: options.errorMessage,
    headerNames: options.headerNames,
    queryParamNames: options.queryParamNames,
    allowLocalWithoutSecret: options.allowLocalWithoutSecret
  });

  if (secretAccess.ok) {
    return {
      ok: true,
      actor: "internal-secret",
      secretName: options.secretName,
      source: secretAccess.source
    };
  }

  if (options.allowStaffFallback) {
    const staffAccess = await requireStaffRouteAccess({
      service: options.service,
      action: options.action,
      resolveStaffAccess: options.resolveStaffAccess
    });

    if (staffAccess.ok) {
      return staffAccess;
    }

    if (staffAccess.status !== 401 || secretAccess.status === 503) {
      return deniedAccess(
        options.service,
        options.action,
        staffAccess.status,
        staffAccess.error
      );
    }
  }

  return deniedAccess(
    options.service,
    options.action,
    secretAccess.status,
    secretAccess.error
  );
}

export async function requireInternalOperatorAccess(options: {
  request: Request;
  service: string;
  action: string;
  errorMessage?: string;
  resolveStaffAccess?: StaffAccessResolver;
}): Promise<RouteAccessResult> {
  return requireRouteSecretOrStaffAccess({
    request: options.request,
    service: options.service,
    action: options.action,
    expectedSecret: process.env.INTERNAL_API_SECRET?.trim(),
    secretName: "INTERNAL_API_SECRET",
    errorMessage: options.errorMessage || "internal_route_requires_operator_access",
    headerNames: ["x-internal-api-secret"],
    allowStaffFallback: true,
    resolveStaffAccess: options.resolveStaffAccess
  });
}
