import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
import { traceOperationalEvent } from "@/lib/observability/operational-trace";
import { getSchemaCompatibilityReportForSurface } from "@/lib/schema/compatibility";
import { telegramDistributionService } from "@/lib/services/telegram-distribution";

async function ensureTelegramDistributionSchema() {
  const report = await getSchemaCompatibilityReportForSurface("internal_telegram_distribution");

  if (report.ok) {
    return null;
  }

  const missing = report.missing.map((entry) => ({
    table: entry.table,
    columns: entry.columns
  }));

  traceOperationalEvent("error", "TELEGRAM_DISTRIBUTION_SCHEMA_INCOMPATIBLE", {
    service: "internal_telegram_distribution",
    action: "schema_guard"
  }, {
    surface: "internal_telegram_distribution",
    schemaVersion: report.schemaVersion,
    missing
  });

  return NextResponse.json(
    {
      error:
        "A distribuicao editorial do Telegram ainda nao pode operar neste ambiente porque o schema phase 13 esta incompleto.",
      code: "schema_incompatible",
      surface: "internal_telegram_distribution",
      schemaVersion: report.schemaVersion,
      missing
    },
    { status: 503 }
  );
}

export async function GET() {
  const access = await requireStaffRouteAccess({
    service: "internal_telegram_distribution",
    action: "overview"
  });

  if (!access.ok) {
    return access.response;
  }

  const schemaResponse = await ensureTelegramDistributionSchema();
  if (schemaResponse) {
    return schemaResponse;
  }

  try {
    const overview = await telegramDistributionService.getOverview();
    return NextResponse.json({ ok: true, data: overview });
  } catch (error) {
    return NextResponse.json(
      {
        error: extractErrorMessage(error, "Nao foi possivel carregar a distribuicao do Telegram.")
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_telegram_distribution",
    action: "publish"
  });

  if (!access.ok) {
    return access.response;
  }

  const schemaResponse = await ensureTelegramDistributionSchema();
  if (schemaResponse) {
    return schemaResponse;
  }

  try {
    const payload = await request.json();
    const result = await telegramDistributionService.publishPost(payload, {
      id: access.profile.id,
      name: access.profile.full_name
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        error: extractErrorMessage(error, "Nao foi possivel publicar na distribuicao do Telegram.")
      },
      { status: 400 }
    );
  }
}
