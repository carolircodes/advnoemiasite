import { NextRequest, NextResponse } from "next/server";

import { processNoemiaCore, type ConversationState } from "@/lib/ai/noemia-core";
import { getCurrentProfile } from "@/lib/auth/guards";
import { askNoemiaSchema } from "@/lib/domain/portal";
import { extractAcquisitionFromRequest } from "@/lib/middleware/acquisition-middleware";
import { recordProductEvent } from "@/lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatPayload = {
  audience: "visitor" | "client" | "staff";
  currentPath: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  channel: string;
  conversationState?: unknown;
  metaContext?: MetaContext;
  urlParams?: Record<string, string>;
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  let profile: Awaited<ReturnType<typeof getCurrentProfile>> = null;

  try {
    profile = await getCurrentProfile();
    const rawPayload = await request.json();
    const payload = normalizeChatPayload(rawPayload);
    const metaContext = extractMetaContext(payload);
    const acquisitionContext = extractAcquisitionFromRequest(request);
    const combinedContext = {
      ...(metaContext || {}),
      acquisition: acquisitionContext ?? undefined
    };

    try {
      const coreResponse = await processNoemiaCore({
        channel: resolveChannel(payload.channel, payload.currentPath, payload.audience),
        userType: resolveUserType(payload.audience, profile),
        message: payload.message,
        history: payload.history,
        context: combinedContext,
        metadata: {
          currentPath: payload.currentPath,
          url: request.url,
          acquisition_source: acquisitionContext?.source,
          acquisition_topic: acquisitionContext?.topic
        },
        profile,
        conversationState: payload.conversationState as ConversationState | undefined
      });

      const result = {
        ok: true,
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
          eventKey:
            coreResponse.source === "openai"
              ? "noemia_message_sent"
              : "noemia_fallback_used",
          eventGroup: "ai",
          pagePath: payload.currentPath || "/noemia",
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
        console.warn("[noemia.chat] Failed to record product event", trackingError);
      }

      return NextResponse.json(result);
    } catch (error) {
      console.warn("[noemia.chat] Falling back after Noemia Core error", error);

      const fallbackResult = {
        ok: true,
        audience: profile ? "client" : "visitor",
        answer: "A NoemIA esta temporariamente indisponivel. Tente novamente em alguns instantes.",
        message: "A NoemIA esta temporariamente indisponivel. Tente novamente em alguns instantes.",
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
          pagePath: payload.currentPath || "/noemia",
          profileId: profile?.id,
          payload: {
            error: error instanceof Error ? error.message : "Noemia Core Error"
          }
        });
      } catch (trackingError) {
        console.warn("[noemia.chat] Failed to record emergency fallback event", trackingError);
      }

      return NextResponse.json(fallbackResult);
    }
  } catch (error) {
    console.error("[noemia.chat] Unhandled endpoint error", error);

    return NextResponse.json(
      {
        ok: false,
        audience: profile ? "client" : "visitor",
        answer: "A NoemIA esta temporariamente indisponivel. Tente novamente em alguns instantes.",
        error: "internal_error"
      },
      { status: 500 }
    );
  }
}

function normalizeChatPayload(rawPayload: unknown): ChatPayload {
  const safeRecord =
    rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
      ? (rawPayload as Record<string, unknown>)
      : {};
  const parsed = askNoemiaSchema.parse({
    audience:
      typeof safeRecord.audience === "string"
        ? safeRecord.audience
        : typeof safeRecord.userType === "string"
          ? safeRecord.userType
          : undefined,
    currentPath: safeRecord.currentPath,
    message: safeRecord.message,
    sessionId: safeRecord.sessionId
  });

  return {
    ...safeRecord,
    audience: parsed.audience,
    currentPath: parsed.currentPath || "/noemia",
    message: parsed.message,
    history: normalizeHistory(safeRecord.history),
    channel:
      typeof safeRecord.channel === "string" ? safeRecord.channel.trim().toLowerCase() : ""
  };
}

function normalizeHistory(
  value: unknown
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is { role: "user" | "assistant"; content: string } =>
        !!item &&
        typeof item === "object" &&
        (item as { role?: unknown }).role !== undefined &&
        (item as { content?: unknown }).content !== undefined
    )
    .map((item) => ({
      role: (item.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: typeof item.content === "string" ? item.content.trim() : ""
    }))
    .filter((item) => item.content.length > 0)
    .slice(-8);
}

function resolveUserType(
  audience: "visitor" | "client" | "staff",
  profile: Awaited<ReturnType<typeof getCurrentProfile>>
) {
  if (profile?.role === "admin" || profile?.role === "advogada") {
    return "staff";
  }

  if (profile?.role === "cliente") {
    return "client";
  }

  return audience;
}

function resolveChannel(
  channel: string,
  currentPath: string,
  audience: "visitor" | "client" | "staff"
) {
  if (
    channel === "whatsapp" ||
    channel === "instagram" ||
    channel === "portal" ||
    channel === "site"
  ) {
    return channel;
  }

  if (
    currentPath.startsWith("/cliente") ||
    currentPath.startsWith("/agenda") ||
    currentPath.startsWith("/documentos")
  ) {
    return "portal";
  }

  return audience === "visitor" ? "site" : "portal";
}

function extractMetaContext(payload: ChatPayload): MetaContext | null {
  if (payload.metaContext) {
    return payload.metaContext;
  }

  if (payload.urlParams) {
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
