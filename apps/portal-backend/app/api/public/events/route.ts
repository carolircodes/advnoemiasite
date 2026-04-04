import { NextResponse } from "next/server";

import { recordProductEvent } from "@/lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await recordProductEvent(payload);

    return NextResponse.json(
      {
        ok: true,
        eventId: result.id
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar o evento agora."
      },
      { status: 400 }
    );
  }
}
