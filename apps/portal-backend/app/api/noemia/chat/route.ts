import { NextResponse } from "next/server";

import { getCurrentProfile } from "../../../../lib/auth/guards";
import { answerNoemia } from "../../../../lib/services/noemia";
import { recordProductEvent } from "../../../../lib/services/public-intake";
import { getServerEnv } from "../../../../lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let profile: any = null;
  
  try {
    profile = await getCurrentProfile();
    const payload = await request.json();

    // Extrair contexto da Meta se presente
    const metaContext = extractMetaContext(payload);

    // Verificar se OPENAI_API_KEY está disponível
    const env = getServerEnv();
    
    // Tentar usar a API principal (agora não vai lançar erro se não tiver chave)
    try {
      const result = await answerNoemia({
        ...payload,
        metaContext // Adicionar contexto da Meta ao payload
      }, profile, request.url);

      try {
        await recordProductEvent({
          eventKey: "noemia_message_sent",
          eventGroup: "ai",
          pagePath:
            typeof payload?.currentPath === "string" ? payload.currentPath : "/noemia",
          profileId: profile?.id,
          payload: {
            metaContext,
            hasMetaContext: !!metaContext,
            source: metaContext?.origem || 'web'
          }
        });
      } catch (trackingError) {
        console.warn("⚠️ Erro ao registrar evento NoemIA:", trackingError);
      }

      return NextResponse.json(result);
    } catch (openaiError) {
      console.warn("⚠️ Falha na API OpenAI, usando fallback:", openaiError);
      
      // Fallback inteligente já implementado no answerNoemia
      const fallbackResult = await answerNoemia({
        ...payload,
        metaContext,
        fallback: true
      }, profile, request.url);

      try {
        await recordProductEvent({
          eventKey: "noemia_fallback_used",
          eventGroup: "ai",
          pagePath:
            typeof payload?.currentPath === "string" ? payload.currentPath : "/noemia",
          profileId: profile?.id,
          payload: {
            metaContext,
            hasMetaContext: !!metaContext,
            source: metaContext?.origem || 'web',
            error: openaiError instanceof Error ? openaiError.message : 'OpenAI API Error'
          }
        });
      } catch (trackingError) {
        console.warn("⚠️ Erro ao registrar evento fallback:", trackingError);
      }

      return NextResponse.json(fallbackResult);
    }
  } catch (error) {
    console.error("❌ Erro geral no endpoint NoemIA:", error);
    
    return NextResponse.json(
      {
        ok: false,
        audience: profile ? "client" : "visitor",
        answer: "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes.",
        error: "internal_error"
      },
      { status: 500 }
    );
  }
}

/**
 * Extrai contexto da Meta do payload
 */
function extractMetaContext(payload: any): MetaContext | null {
  // Verificar se há contexto da Meta no payload
  if (payload?.metaContext) {
    return payload.metaContext;
  }

  // Verificar se há parâmetros de URL com contexto
  if (payload?.urlParams) {
    return {
      tema: payload.urlParams.tema || '',
      origem: payload.urlParams.origem || 'web',
      campanha: payload.urlParams.campanha || '',
      video: payload.urlParams.video || '',
      sessionId: payload.urlParams.sessionId || '',
      timestamp: Date.now()
    };
  }

  return null;
}

// Types
interface MetaContext {
  tema: string;
  origem: string;
  campanha: string;
  video: string;
  sessionId: string;
  timestamp: number;
}
