import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
import { listLatestCaseEvents, registerPortalEvent } from "@/lib/services/register-event";

export async function GET() {
  const access = await requireStaffRouteAccess({
    service: "internal_events",
    action: "list"
  });

  if (!access.ok) {
    return access.response;
  }

  const items = await listLatestCaseEvents(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_events",
    action: "create"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await request.json();
    const result = await registerPortalEvent(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: extractErrorMessage(error, "Nao foi possivel registrar o evento.")
      },
      { status: 400 }
    );
  }
}
