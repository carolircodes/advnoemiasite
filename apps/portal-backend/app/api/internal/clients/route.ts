import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
import { createClientWithInvite, listLatestClients } from "@/lib/services/create-client";

export async function GET() {
  const access = await requireStaffRouteAccess({
    service: "internal_clients",
    action: "list"
  });

  if (!access.ok) {
    return access.response;
  }

  const clients = await listLatestClients(20);
  return NextResponse.json({ items: clients });
}

export async function POST(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_clients",
    action: "create"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await request.json();
    const result = await createClientWithInvite(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: extractErrorMessage(error, "Nao foi possivel criar o cliente.")
      },
      { status: 400 }
    );
  }
}
