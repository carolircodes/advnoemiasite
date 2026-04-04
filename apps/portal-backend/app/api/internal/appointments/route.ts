import { NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import {
  cancelCaseAppointment,
  listLatestAppointments,
  registerCaseAppointment,
  updateCaseAppointment
} from "@/lib/services/manage-appointments";

export async function GET() {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const items = await listLatestAppointments(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const payload = await request.json();
    const result = await registerCaseAppointment(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel registrar o compromisso."
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const payload = await request.json();
    const action = payload?.action === "cancel" ? "cancel" : "update";
    const result =
      action === "cancel"
        ? await cancelCaseAppointment(payload, access.profile.id)
        : await updateCaseAppointment(payload, access.profile.id);

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel atualizar o compromisso."
      },
      { status: 400 }
    );
  }
}
