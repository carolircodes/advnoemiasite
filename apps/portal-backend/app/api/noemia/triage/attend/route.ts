import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "../../../../../lib/auth/api-authorization";
import { triagePersistence } from "../../../../../lib/services/triage-persistence";

export async function POST(request: Request) {
  try {
    const access = await requireStaffRouteAccess({
      service: "noemia_triage",
      action: "attend"
    });

    if (!access.ok) {
      return access.response;
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "sessionId e obrigatorio"
        },
        { status: 400 }
      );
    }

    await triagePersistence.markAsAttendedByHuman(
      sessionId,
      access.profile.full_name || access.profile.email || "sistema"
    );

    return NextResponse.json({
      success: true,
      message: "Triagem marcada como atendida com sucesso",
      sessionId,
      attendedBy: access.profile.full_name || access.profile.email || "sistema"
    });
  } catch (error) {
    console.error("ERROR_MARKING_AS_ATTENDED:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao marcar triagem como atendida"
      },
      { status: 500 }
    );
  }
}
