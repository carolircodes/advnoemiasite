import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
import {
  cancelCaseAppointment,
  listLatestAppointments,
  registerCaseAppointment,
  updateCaseAppointment
} from "@/lib/services/manage-appointments";

export async function GET() {
  const access = await requireStaffRouteAccess({
    service: "internal_appointments",
    action: "list"
  });

  if (!access.ok) {
    return access.response;
  }

  const items = await listLatestAppointments(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_appointments",
    action: "create"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await request.json();
    const result = await registerCaseAppointment(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: extractErrorMessage(error, "Nao foi possivel registrar o compromisso.")
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_appointments",
    action: "update"
  });

  if (!access.ok) {
    return access.response;
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
        error: extractErrorMessage(error, "Nao foi possivel atualizar o compromisso.")
      },
      { status: 400 }
    );
  }
}
