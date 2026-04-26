import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "../../../../../lib/auth/api-authorization.ts";
import { triagePersistence } from "../../../../../lib/services/triage-persistence.ts";

export async function GET(request: Request) {
  try {
    const access = await requireStaffRouteAccess({
      service: "noemia_triage",
      action: "report"
    });

    if (!access.ok) {
      return access.response;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const report = await triagePersistence.generateTriageReport(days);

    return NextResponse.json({
      success: true,
      data: report,
      period: `Ultimos ${days} dias`
    });
  } catch (error) {
    console.error("ERROR_GENERATING_REPORT:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao gerar relatorio",
        data: null
      },
      { status: 500 }
    );
  }
}
