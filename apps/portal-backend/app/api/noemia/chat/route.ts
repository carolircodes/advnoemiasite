import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/guards";
import { answerNoemia } from "@/lib/services/noemia";
import { recordProductEvent } from "@/lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const profile = await getCurrentProfile();
    const result = await answerNoemia(payload, profile);

    try {
      await recordProductEvent({
        eventKey: "noemia_message_sent",
        eventGroup: "ai",
        pagePath:
          typeof payload?.currentPath === "string" ? payload.currentPath : "/noemia",
        profileId: profile?.id,
        payload: {
          audience: result.audience
        }
      });
    } catch (trackingError) {
      console.error("[noemia.chat] Failed to record product event", {
        profileId: profile?.id || null,
        message: trackingError instanceof Error ? trackingError.message : String(trackingError)
      });
    }

    return NextResponse.json(
      {
        ok: true,
        audience: result.audience,
        answer: result.answer
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel gerar a resposta da Noemia agora."
      },
      { status: 400 }
    );
  }
}
