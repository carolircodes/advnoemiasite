import { NextResponse } from "next/server";

import { getCurrentProfile, isStaffRole } from "@/lib/auth/guards";
import { createClientWithInvite, listLatestClients } from "@/lib/services/create-client";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Acesso interno obrigatório." }, { status: 401 });
  }

  const clients = await listLatestClients(20);
  return NextResponse.json({ items: clients });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Acesso interno obrigatório." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const result = await createClientWithInvite(payload, profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível criar o cliente."
      },
      { status: 400 }
    );
  }
}

