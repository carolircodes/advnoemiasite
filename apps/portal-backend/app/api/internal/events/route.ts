import { NextResponse } from "next/server";

import { getCurrentProfile, isStaffRole } from "@/lib/auth/guards";
import { listLatestCaseEvents, registerPortalEvent } from "@/lib/services/register-event";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Acesso interno obrigatório." }, { status: 401 });
  }

  const items = await listLatestCaseEvents(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Acesso interno obrigatório." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const result = await registerPortalEvent(payload, profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível registrar o evento."
      },
      { status: 400 }
    );
  }
}

