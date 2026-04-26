import { NextRequest, NextResponse } from "next/server";

import { assertRouteSecret } from "@/lib/http/route-secret";
import { shouldExposeChannelValidationErrors } from "@/lib/http/webhook-security";
import { telegramConversationService } from "@/lib/services/telegram-conversation";

export async function POST(request: NextRequest) {
  try {
    const access = assertRouteSecret({
      request,
      expectedSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
      secretName: "TELEGRAM_WEBHOOK_SECRET",
      errorMessage: "Webhook do Telegram nao autorizado.",
      headerNames: [
        "x-telegram-bot-api-secret-token",
        "x-telegram-webhook-secret"
      ],
      allowLocalWithoutSecret: true
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

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
    const errorMessage =
      error instanceof Error ? error.message : "Nao foi possivel processar o webhook do Telegram.";

    return NextResponse.json(
      {
        error: "Nao foi possivel processar o webhook do Telegram.",
        detail: shouldExposeChannelValidationErrors() ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
