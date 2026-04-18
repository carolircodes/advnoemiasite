import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "../../../../../lib/auth/api-authorization";
import { triagePersistence } from "../../../../../lib/services/triage-persistence";

export async function GET() {
  try {
    const access = await requireStaffRouteAccess({
      service: "noemia_triage",
      action: "list_hot_leads"
    });

    if (!access.ok) {
      return access.response;
    }

    const hotLeads = await triagePersistence.getHotLeads(50);

    return NextResponse.json({
      success: true,
      data: hotLeads,
      count: hotLeads.length
    });
  } catch (error) {
    console.error("ERROR_GETTING_HOT_LEADS:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar hot leads",
        data: []
      },
      { status: 500 }
    );
  }
}
