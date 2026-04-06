import { NextResponse } from "next/server";

import { getCurrentProfile } from "../../../../lib/auth/guards";
import { answerNoemia } from "../../../../lib/services/noemia";
import { recordProductEvent } from "../../../../lib/services/public-intake";
import { getServerEnv } from "../../../../lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const profile = await getCurrentProfile();

    // Verificar se OPENAI_API_KEY está disponível
    const env = getServerEnv();
    
    // Tentar usar a API principal (agora não vai lançar erro se não tiver chave)
    try {
      const result = await answerNoemia(payload, profile, request.url);

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
      console.error("[noemia.chat] API principal falhou:", apiError);
      
      const { POST: fallbackHandler } = await import("./fallback");
      return fallbackHandler(request);
    }
  } catch (error) {
    // Tratamento de erro premium - logs técnicos no servidor, mensagem amigável para usuário
    console.error("[noemia.chat] Erro geral na API:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    // Mensagens amigáveis premium para erros comuns
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

    const friendlyMessage = friendlyMessages[errorMessage] || 
      "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes.";

    return NextResponse.json(
      {
        ok: true, // Mantém ok:true para não quebrar fluxo do frontend
        audience: "visitor",
        answer: friendlyMessage
      },
      { status: 200 }
    );
  }
}
