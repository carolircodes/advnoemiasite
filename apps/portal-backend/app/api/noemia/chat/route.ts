import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfile } from "../../../../lib/auth/guards";
import { processNoemiaCore } from "../../../../lib/ai/noemia-core";
import { recordProductEvent } from "../../../../lib/services/public-intake";
import { getServerEnv } from "../../../../lib/config/env";
import { extractAcquisitionFromRequest } from "@/lib/middleware/acquisition-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let profile: any = null;
  
  try {
    profile = await getCurrentProfile();
    const payload = await request.json();

    // Extrair contexto da Meta se presente
    const metaContext = extractMetaContext(payload);

    // Extrair contexto de aquisição se presente
    const acquisitionContext = extractAcquisitionFromRequest(request);

    // Combinar contextos
    const combinedContext = {
  ...metaContext,
  acquisition: acquisitionContext ?? undefined
};

    // Verificar se OPENAI_API_KEY está disponível
    const env = getServerEnv();
    
    // Usar o Noemia Core centralizado
    try {
      const coreResponse = await processNoemiaCore({
        channel: payload.channel || "site",
        userType:
          payload.userType ||
          (profile?.role === "cliente"
            ? "client"
            : profile?.role !== "cliente"
              ? "staff"
              : "visitor"),
        message: payload.message,
        history: payload.history || [],
        context: combinedContext,
        metadata: { 
          currentPath: payload.currentPath,
          url: request.url,
          acquisition_source: acquisitionContext?.source,
          acquisition_topic: acquisitionContext?.topic
        },
        profile,
        conversationState: payload.conversationState
      });

      const result = {
        audience: coreResponse.audience,
        answer: coreResponse.reply,
        message: coreResponse.reply,
        actions: coreResponse.actions || [],
        meta: {
          intent: coreResponse.intent,
          profile: coreResponse.audience,
          source: coreResponse.source,
          usedFallback: coreResponse.usedFallback,
          responseTime: coreResponse.metadata.responseTime
        }
      };

      try {
        await recordProductEvent({
          eventKey: coreResponse.source === "openai" ? "noemia_message_sent" : "noemia_fallback_used",
          eventGroup: "ai",
          pagePath: typeof payload?.currentPath === "string" ? payload.currentPath : "/noemia",
          profileId: profile?.id,
          payload: {
            metaContext,
            hasMetaContext: !!metaContext,
            source: metaContext?.origem || "web",
            openaiUsed: coreResponse.metadata.openaiUsed,
            responseTime: coreResponse.metadata.responseTime,
            classification: coreResponse.metadata.classification
          }
        });
      } catch (trackingError) {
        console.warn("⚠️ Erro ao registrar evento NoemIA:", trackingError);
      }

      return NextResponse.json(result);
    } catch (error) {
      console.warn("⚠️ Erro no Noemia Core, usando fallback básico:", error);
      
      const fallbackResult = {
        audience: profile ? "client" : "visitor",
        answer: "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes.",
        message: "A NoemIA está temporariamente indisponível. Tente novamente em alguns instantes.",
        actions: [],
        meta: {
          source: "emergency_fallback",
          usedFallback: true
        }
      };

      try {
        await recordProductEvent({
          eventKey: "noemia_emergency_fallback",
          eventGroup: "ai",
          pagePath: typeof payload?.currentPath === "string" ? payload.currentPath : "/noemia",
          profileId: profile?.id,
          payload: {
            error: error instanceof Error ? error.message : "Noemia Core Error"
          }
        });
      } catch (trackingError) {
        console.warn("⚠️ Erro ao registrar evento emergência:", trackingError);
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
  if (payload?.metaContext) {
    return payload.metaContext;
  }

  if (payload?.urlParams) {
    return {
      tema: payload.urlParams.tema || "",
      origem: payload.urlParams.origem || "web",
      campanha: payload.urlParams.campanha || "",
      video: payload.urlParams.video || "",
      sessionId: payload.urlParams.sessionId || "",
      timestamp: Date.now()
    };
  }

  return null;
}

interface MetaContext {
  tema: string;
  origem: string;
  campanha: string;
  video: string;
  sessionId: string;
  timestamp: number;
}