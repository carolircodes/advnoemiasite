import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "../../../../../lib/auth/api-authorization.ts";
import { triagePersistence } from "../../../../../lib/services/triage-persistence.ts";

export async function GET() {
  try {
    const access = await requireStaffRouteAccess({
      service: "noemia_triage",
      action: "list_all"
    });

    if (!access.ok) {
      return access.response;
    }

    const triages = await triagePersistence.getTriageForHumanAttention(100);

    return NextResponse.json({
      success: true,
      data: triages,
      count: triages.length
    });
  } catch (error) {
    console.error("ERROR_GETTING_ALL_TRIAGE:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar triagens",
        data: []
      },
      { status: 500 }
    );
  }
}
