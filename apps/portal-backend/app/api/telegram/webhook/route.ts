import { NextRequest, NextResponse } from "next/server";

import { telegramConversationService } from "@/lib/services/telegram-conversation";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await telegramConversationService.handleWebhookUpdate(payload);

    return NextResponse.json(
      {
        ok: true,
        data: result
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel processar o webhook do Telegram."
      },
      { status: 500 }
    );
  }
}
