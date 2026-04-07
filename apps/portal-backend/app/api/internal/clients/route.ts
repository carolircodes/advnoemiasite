import { NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import { createClientWithInvite, listLatestClients } from "@/lib/services/create-client";

export async function GET() {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const clients = await listLatestClients(20);
  return NextResponse.json({ items: clients });
}

export async function POST(request: Request) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const payload = await request.json();
    const result = await createClientWithInvite(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel criar o cliente."
      },
      { status: 400 }
    );
  }
}
