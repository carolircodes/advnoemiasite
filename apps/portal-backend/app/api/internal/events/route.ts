import { NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import { listLatestCaseEvents, registerPortalEvent } from "@/lib/services/register-event";

export async function GET() {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const items = await listLatestCaseEvents(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const payload = await request.json();
    const result = await registerPortalEvent(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel registrar o evento."
      },
      { status: 400 }
    );
  }
}
