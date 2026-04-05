import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/guards";
import { answerNoemia } from "@/lib/services/noemia";
import { recordProductEvent } from "@/lib/services/public-intake";
import { getServerEnv } from "@/lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const profile = await getCurrentProfile();

    // Verificar se OPENAI_API_KEY está disponível
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      console.warn("[noemia.chat] OPENAI_API_KEY não configurada, usando fallback");
      const { POST: fallbackHandler } = await import("./fallback");
      return fallbackHandler(request);
    }

    // Tentar usar a API principal
    try {
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
    } catch (apiError) {
      // Se a API principal falhar, usar fallback
      console.warn("[noemia.chat] API principal falhou, usando fallback:", apiError);
      
      const { POST: fallbackHandler } = await import("./fallback");
      return fallbackHandler(request);
    }
  } catch (error) {
    // Tratamento de erro mais amigável
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    console.error("[noemia.chat] Erro geral na API:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Mensagens amigáveis para erros comuns
    const friendlyMessages: Record<string, string> = {
      "Faca login como cliente para receber respostas baseadas no seu portal.": 
        "Para usar a NoemIA com contexto do seu caso, faça login como cliente no portal.",
      "Faca login com um perfil interno para receber apoio operacional da Noemia.": 
        "Para usar a NoemIA operacional, faça login com um perfil interno autorizado.",
      "A Noemia ainda nao foi configurada neste ambiente. Defina OPENAI_API_KEY e OPENAI_MODEL no .env.local.": 
        "A NoemIA está em modo de configuração. Tente novamente em instantes ou contate o suporte técnico.",
      "Nao foi possivel gerar a resposta da Noemia agora.": 
        "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes."
    };

    const friendlyMessage = friendlyMessages[errorMessage] || friendlyMessages["Nao foi possivel gerar a resposta da Noemia agora."];

    return NextResponse.json(
      {
        ok: false,
        error: friendlyMessage,
        technicalError: errorMessage, // Para debug
        fallbackMode: true
      },
      { status: 200 } // Mudar para 200 para não quebrar o frontend
    );
  }
}
