import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "../../../../../lib/auth/api-authorization";
import { triagePersistence } from "../../../../../lib/services/triage-persistence";

export async function GET() {
  try {
    const access = await requireStaffRouteAccess({
      service: "noemia_triage",
      action: "list_needs_attention"
    });

    if (!access.ok) {
      return access.response;
    }

    const needsAttention = await triagePersistence.getTriageForHumanAttention(50);

    return NextResponse.json({
      success: true,
      data: needsAttention,
      count: needsAttention.length
    });
  } catch (error) {
    console.error("ERROR_GETTING_NEEDS_ATTENTION:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar triagens que precisam de atencao",
        data: []
      },
      { status: 500 }
    );
  }
}
