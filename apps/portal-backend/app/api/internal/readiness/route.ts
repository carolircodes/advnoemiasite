import { NextResponse } from "next/server";

import { requireInternalOperatorAccess } from "@/lib/auth/api-authorization";
import { buildBackendReadinessReport } from "@/lib/diagnostics/backend-readiness";

export async function GET(request: Request) {
  const access = await requireInternalOperatorAccess({
    request,
    service: "internal_readiness",
    action: "read",
    errorMessage: "diagnostics_require_internal_access"
  });

  if (!access.ok) {
    return access.response;
  }

  return NextResponse.json({
    ok: true,
    actor: access.actor,
    readiness: await buildBackendReadinessReport()
  });
}
