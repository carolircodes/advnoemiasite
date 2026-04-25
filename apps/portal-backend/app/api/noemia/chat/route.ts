import { randomUUID } from "crypto";

import { NextRequest } from "next/server";

import { processNoemiaCore, type ConversationState } from "@/lib/ai/noemia-core";
import { getCurrentProfile } from "@/lib/auth/guards";
import { askNoemiaSchema } from "@/lib/domain/portal";
import {
  buildDurableRateLimitHeaders,
  consumeDurableRateLimit,
  shouldEnforceDurableProtection
} from "@/lib/http/durable-abuse-protection";
import { getClientIp } from "@/lib/http/request-guards";
import { extractAcquisitionFromRequest } from "@/lib/middleware/acquisition-middleware";
import { resolveEntryCaseArea } from "@/lib/entry-context";
import { queueGovernedNotification } from "@/lib/notifications/governed-outbox";
import { listStaffEmailRecipients } from "@/lib/notifications/outbox";
import { categorizeObservedError } from "@/lib/observability/error-categorization";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "@/lib/observability/request-observability";
import { conversationPersistence } from "@/lib/services/conversation-persistence";
import { recordProductEvent } from "@/lib/services/public-intake";
import {
  buildSiteChatMetadata,
  normalizeSiteChatOrigin,
  sendSiteChatMessage
} from "@/lib/site/site-chat-service";
import {
  clearSiteChatSessionCookie,
  readSiteChatSessionFromRequest,
  setSiteChatSessionCookie
} from "@/lib/site/site-chat-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatPayload = {
  audience: "visitor" | "client" | "staff";
  currentPath: string;
  message: string;
  sessionId?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  channel: string;
  conversationState?: unknown;
  metaContext?: MetaContext;
  urlParams?: Record<string, string>;
  pageTitle?: string;
  articleTitle?: string;
  articleSlug?: string;
  ctaLabel?: string;
  contentId?: string;
  referrer?: string;
  currentUrl?: string;
  timeOnPageSeconds?: number;
  acquisitionTags?: string[];
  [key: string]: unknown;
};

type SiteThreadContext = {
  sessionId: string;
  threadId: string;
  origin: ReturnType<typeof normalizeSiteChatOrigin>;
  messageType: string;
  shouldHandoff: boolean;
  handoffReason: string | null;
};

function buildEmptyConversationResponse() {
  return {
    ok: true,
    data: {
      threadId: null,
      threadStatus: "new",
      waitingFor: "ai",
      messages: []
    }
  };
}

export async function GET(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "noemia_chat_sync",
    channel: "site"
  });
  try {
    const trustedSession = readSiteChatSessionFromRequest(request);

    if (!trustedSession.ok) {
      if (trustedSession.reason === "misconfigured") {
        logObservedRequest("error", "NOEMIA_CHAT_SYNC_MISCONFIGURED", observation, {
          flow: "noemia_chat_sync",
          channel: "site",
          outcome: "failed",
          status: 503,
          errorCategory: "configuration"
        });
        return createObservedJsonResponse(
          observation,
          {
            ok: false,
            error: "site_chat_session_not_configured"
          },
          { status: 503 }
        );
      }

      logObservedRequest("warn", "NOEMIA_CHAT_SYNC_INVALID_SESSION", observation, {
        flow: "noemia_chat_sync",
        channel: "site",
        outcome: "denied",
        status: 200,
        errorCategory: "authentication",
        reason: trustedSession.reason
      });

      const response = createObservedJsonResponse(
        observation,
        buildEmptyConversationResponse()
      );

      if (trustedSession.reason === "invalid") {
        clearSiteChatSessionCookie(response);
      }

      return response;
    }

    const { data: session } = await conversationPersistence.supabaseClient
      .from("conversation_sessions")
      .select("*")
      .eq("channel", "site")
      .eq("external_user_id", trustedSession.sessionId)
      .maybeSingle();

    if (!session) {
      logObservedRequest("info", "NOEMIA_CHAT_SYNC_EMPTY", observation, {
        flow: "noemia_chat_sync",
        channel: "site",
        outcome: "success",
        status: 200
      });
      return createObservedJsonResponse(observation, buildEmptyConversationResponse());
    }

    const messages = await conversationPersistence.getRecentMessages(session.id, 50);

    logObservedRequest("info", "NOEMIA_CHAT_SYNC_LOADED", observation, {
      flow: "noemia_chat_sync",
      channel: "site",
      outcome: "success",
      status: 200,
      threadId: session.id
    });

    return createObservedJsonResponse(observation, {
      ok: true,
      data: {
        threadId: session.id,
        threadStatus: session.thread_status || "new",
        waitingFor: session.waiting_for || "ai",
        messages: messages
          .slice()
          .reverse()
          .map((message) => ({
            id: message.id,
            role: message.direction === "inbound" ? "user" : "assistant",
            content: message.content,
            senderType: (message as { sender_type?: string }).sender_type || null,
            createdAt: message.created_at
          }))
      }
    });
  } catch (error) {
    logObservedRequest("error", "NOEMIA_CHAT_SYNC_FAILED", observation, {
      flow: "noemia_chat_sync",
      channel: "site",
      outcome: "failed",
      status: 500,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);
    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "internal_error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "noemia_chat",
    channel: "site"
  });
  let profile: Awaited<ReturnType<typeof getCurrentProfile>> = null;
  const rateLimit = await consumeDurableRateLimit({
    bucket: "noemia-chat",
    key: `${getClientIp(request)}:${request.headers.get("x-product-session-id") || "anon"}`,
    limit: 18,
    windowMs: 5 * 60 * 1000
  });

  if (rateLimit.mode !== "durable" && shouldEnforceDurableProtection()) {
    logObservedRequest("error", "NOEMIA_CHAT_DURABLE_PROTECTION_UNAVAILABLE", observation, {
      flow: "noemia_chat",
      channel: "site",
      outcome: "failed",
      status: 503,
      errorCategory: "fallback",
      runtimeState: rateLimit.mode
    });
    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        audience: "visitor",
        answer: "A NoemIA esta temporariamente indisponivel. Tente novamente em instantes.",
        error: "durable_protection_unavailable"
      },
      {
        status: 503,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  if (!rateLimit.ok) {
    logObservedRequest("warn", "NOEMIA_CHAT_RATE_LIMITED", observation, {
      flow: "noemia_chat",
      channel: "site",
      outcome: "failed",
      status: 429,
      errorCategory: "rate_limit"
    });
    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        audience: "visitor",
        answer: "A NoemIA esta recebendo muitas mensagens agora. Tente novamente em instantes.",
        error: "rate_limited"
      },
      {
        status: 429,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  try {
    profile = await getCurrentProfile();
    const rawPayload = await request.json();
    const payload = normalizeChatPayload(rawPayload);
    const resolvedChannel = resolveChannel(payload.channel, payload.currentPath, payload.audience);
    const trustedSiteSession =
      resolvedChannel === "site" ? readSiteChatSessionFromRequest(request) : null;
    const metaContext = extractMetaContext(payload);
    const acquisitionContext = extractAcquisitionFromRequest(request);
    const combinedContext = {
      ...(metaContext || {}),
      acquisition: acquisitionContext ?? undefined
    };

    if (resolvedChannel === "site" && trustedSiteSession && !trustedSiteSession.ok && trustedSiteSession.reason === "misconfigured") {
      logObservedRequest("error", "NOEMIA_CHAT_SITE_SESSION_MISCONFIGURED", observation, {
        flow: "noemia_chat",
        channel: resolvedChannel,
        outcome: "failed",
        status: 503,
        errorCategory: "configuration"
      });
      return createObservedJsonResponse(
        observation,
        {
          ok: false,
          audience: "visitor",
          answer: "O chat do site nao esta configurado com seguranca neste ambiente.",
          error: "site_chat_session_not_configured"
        },
        {
          status: 503,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    const siteContext =
      resolvedChannel === "site"
        ? await hydrateSiteThreadContext({
            payload,
            profile,
            metaContext,
            acquisitionContext,
            request,
            trustedSessionId:
              trustedSiteSession && trustedSiteSession.ok ? trustedSiteSession.sessionId : null
          })
        : null;

    if (siteContext?.shouldHandoff) {
      logObservedRequest("warn", "NOEMIA_CHAT_HANDOFF_REQUESTED", observation, {
        flow: "noemia_chat",
        channel: resolvedChannel,
        outcome: "degraded",
        status: 200,
        errorCategory: "boundary",
        threadId: siteContext.threadId,
        handoffReason: siteContext.handoffReason
      });
    }

    try {
      const coreResponse = await processNoemiaCore({
        channel: resolvedChannel,
        userType: resolveUserType(payload.audience, profile),
        message: payload.message,
        history: payload.history,
        context: combinedContext,
        metadata: {
          currentPath: payload.currentPath,
          url: request.url,
          acquisition_source: acquisitionContext?.source,
          acquisition_topic: acquisitionContext?.topic,
          site_session_id: siteContext?.sessionId || null,
          site_thread_id: siteContext?.threadId || null
        },
        profile,
        conversationState: payload.conversationState as ConversationState | undefined
      });

      if (siteContext) {
        await persistSiteOutboundMessage(siteContext, coreResponse.reply, coreResponse.intent || null, {
          source: coreResponse.source,
          usedFallback: coreResponse.usedFallback,
          responseTime: coreResponse.metadata.responseTime,
          classification: coreResponse.metadata.classification
        });
      }

      const result = {
        ok: true,
        audience: coreResponse.audience,
        answer: coreResponse.reply,
        message: coreResponse.reply,
        actions: coreResponse.actions || [],
        sessionId: siteContext?.sessionId || payload.sessionId || null,
        threadId: siteContext?.threadId || null,
        meta: {
          intent: coreResponse.intent,
          profile: coreResponse.audience,
          source: coreResponse.source,
          usedFallback: coreResponse.usedFallback,
          responseTime: coreResponse.metadata.responseTime,
          domain: coreResponse.metadata.domain || null,
          policyMode: coreResponse.metadata.policyMode || null,
          promptVersion: coreResponse.metadata.promptVersion || null,
          contextSummary: coreResponse.metadata.contextSummary || null,
          handoffRequested: siteContext?.shouldHandoff || false,
          handoffReason: siteContext?.handoffReason || null
        }
      };

      try {
        await recordProductEvent({
          eventKey:
            resolvedChannel === "site"
              ? "noemia_site_chat_message"
              : coreResponse.source === "openai"
                ? "noemia_message_sent"
                : "noemia_fallback_used",
          eventGroup: resolvedChannel === "site" ? "lead" : "ai",
          pagePath: payload.currentPath || "/noemia",
          profileId: profile?.id,
          sessionId: siteContext?.sessionId || payload.sessionId,
          payload: {
            metaContext,
            hasMetaContext: !!metaContext,
            source: metaContext?.origem || acquisitionContext?.source || "web",
            openaiUsed: coreResponse.metadata.openaiUsed,
            responseTime: coreResponse.metadata.responseTime,
            classification: coreResponse.metadata.classification,
            channel: resolvedChannel,
            threadId: siteContext?.threadId || null,
            siteOrigin: siteContext?.origin || null
          }
        });
      } catch (trackingError) {
        logObservedRequest("warn", "NOEMIA_CHAT_PRODUCT_EVENT_DEGRADED", observation, {
          flow: "noemia_chat",
          channel: resolvedChannel,
          outcome: "degraded",
          status: 200,
          errorCategory: "provider"
        }, trackingError);
      }

      logObservedRequest("info", "NOEMIA_CHAT_SUCCEEDED", observation, {
        flow: "noemia_chat",
        channel: resolvedChannel,
        outcome: "success",
        status: 200,
        threadId: siteContext?.threadId || null,
        source: coreResponse.source,
        usedFallback: coreResponse.usedFallback
      });

      const response = createObservedJsonResponse(observation, result, {
        headers: buildDurableRateLimitHeaders(rateLimit)
      });

      if (siteContext) {
        setSiteChatSessionCookie(response, siteContext.sessionId);
      }

      return response;
    } catch (error) {
      logObservedRequest("warn", "NOEMIA_CHAT_CORE_FALLBACK", observation, {
        flow: "noemia_chat",
        channel: resolvedChannel,
        outcome: "degraded",
        status: 200,
        errorCategory: "fallback"
      }, error);

      const fallbackMessage =
        "A NoemIA esta temporariamente indisponivel. Tente novamente em alguns instantes.";

      if (siteContext) {
        await persistSiteOutboundMessage(siteContext, fallbackMessage, "emergency_fallback", {
          source: "emergency_fallback",
          usedFallback: true
        });
      }

      const fallbackResult = {
        ok: true,
        audience: profile ? "client" : "visitor",
        answer: fallbackMessage,
        message: fallbackMessage,
        actions: [],
        sessionId: siteContext?.sessionId || payload.sessionId || null,
        threadId: siteContext?.threadId || null,
        meta: {
          source: "emergency_fallback",
          usedFallback: true,
          handoffRequested: siteContext?.shouldHandoff || false,
          handoffReason: siteContext?.handoffReason || null
        }
      };

      try {
        await recordProductEvent({
          eventKey: "noemia_emergency_fallback",
          eventGroup: "ai",
          pagePath: payload.currentPath || "/noemia",
          profileId: profile?.id,
          sessionId: siteContext?.sessionId || payload.sessionId,
          payload: {
            channel: resolvedChannel,
            threadId: siteContext?.threadId || null,
            error: error instanceof Error ? error.message : "Noemia Core Error"
          }
        });
      } catch (trackingError) {
        logObservedRequest("warn", "NOEMIA_CHAT_FALLBACK_EVENT_DEGRADED", observation, {
          flow: "noemia_chat",
          channel: resolvedChannel,
          outcome: "degraded",
          status: 200,
          errorCategory: "provider"
        }, trackingError);
      }

      const response = createObservedJsonResponse(observation, fallbackResult, {
        headers: buildDurableRateLimitHeaders(rateLimit)
      });

      if (siteContext) {
        setSiteChatSessionCookie(response, siteContext.sessionId);
      }

      return response;
    }
  } catch (error) {
    logObservedRequest("error", "NOEMIA_CHAT_FAILED", observation, {
      flow: "noemia_chat",
      channel: "site",
      outcome: "failed",
      status: 500,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);

    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        audience: profile ? "client" : "visitor",
        answer: "A NoemIA esta temporariamente indisponivel. Tente novamente em alguns instantes.",
        error: "internal_error"
      },
      {
        status: 500,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }
}

async function hydrateSiteThreadContext(input: {
  payload: ChatPayload;
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
  metaContext: MetaContext | null;
  acquisitionContext: ReturnType<typeof extractAcquisitionFromRequest>;
  request: NextRequest;
  trustedSessionId: string | null;
}): Promise<SiteThreadContext> {
  const origin = normalizeSiteChatOrigin({
    audience: input.payload.audience,
    currentPath: input.payload.currentPath,
    currentUrl:
      input.payload.currentUrl ||
      input.request.headers.get("origin") ||
      input.request.url,
    pageTitle: input.payload.pageTitle,
    articleTitle: input.payload.articleTitle,
    articleSlug: input.payload.articleSlug,
    ctaLabel: input.payload.ctaLabel,
    campaign:
      input.payload.metaContext?.campanha ||
      input.payload.urlParams?.campanha ||
      input.acquisitionContext?.campaign,
    topic:
      input.payload.metaContext?.tema ||
      input.payload.urlParams?.tema ||
      input.acquisitionContext?.topic,
    source:
      input.payload.metaContext?.origem ||
      input.payload.urlParams?.origem ||
      input.acquisitionContext?.source ||
      "site",
    contentId: input.payload.contentId || input.acquisitionContext?.content_id,
    sessionId: input.trustedSessionId,
    referrer: input.payload.referrer || input.request.headers.get("referer"),
    timeOnPageSeconds: input.payload.timeOnPageSeconds,
    acquisitionTags: input.acquisitionContext?.acquisition_tags || input.payload.acquisitionTags,
    utmSource:
      asString(input.payload.urlParams?.utm_source) ||
      asString(input.acquisitionContext?.acquisition_metadata?.utm_source),
    utmMedium:
      asString(input.payload.urlParams?.utm_medium) ||
      asString(input.acquisitionContext?.acquisition_metadata?.utm_medium),
    utmCampaign:
      asString(input.payload.urlParams?.utm_campaign) ||
      asString(input.acquisitionContext?.acquisition_metadata?.utm_campaign),
    utmContent:
      asString(input.payload.urlParams?.utm_content) ||
      asString(input.acquisitionContext?.acquisition_metadata?.utm_content),
    utmTerm:
      asString(input.payload.urlParams?.utm_term) ||
      asString(input.acquisitionContext?.acquisition_metadata?.utm_term),
    leadName: asString(input.profile?.full_name),
    email: asString(input.profile?.email),
    identifiedProfileId: input.profile?.id || null
  });

  const session = await conversationPersistence.getOrCreateSession("site", origin.sessionId, origin.sessionId);
  const existingMetadata =
    session.metadata && typeof session.metadata === "object" ? session.metadata : {};
  const eventId = `site_inbound:${randomUUID()}`;
  const handoffDecision = evaluateSiteHandoff(input.payload.message);
  const now = new Date().toISOString();
  const siteMetadata = buildSiteChatMetadata(origin);
  const mergedMetadata = {
    ...existingMetadata,
    ...siteMetadata,
    channel: "site",
    source: "site_chat",
    entry_origin: {
      source: origin.source,
      pagePath: origin.pagePath,
      ctaLabel: origin.ctaLabel,
      articleTitle: origin.articleTitle,
      campaign: origin.campaign,
      topic: origin.topic,
      contentId: origin.contentId
    },
    last_user_message: input.payload.message,
    acquisition: input.acquisitionContext || undefined,
    meta_context: input.metaContext || undefined,
    last_site_event_id: eventId,
    site_handoff_reason: handoffDecision.reason
  };

  await conversationPersistence.saveMessage(
    session.id,
    `site_inbound_${randomUUID()}`,
    "user",
    input.payload.message,
    "inbound",
    {
      ...siteMetadata,
      eventId,
      source: "site_chat",
      acquisitionSource: origin.source,
      pagePath: origin.pagePath,
      ctaLabel: origin.ctaLabel,
      articleTitle: origin.articleTitle,
      campaign: origin.campaign,
      topic: origin.topic,
      visitorStage: origin.visitorStage
    },
    {
      messageType: "site_chat",
      senderType: "contact",
      sendStatus: "received",
      deliveryStatus: "accepted",
      isRead: false,
      receivedAt: now
    }
  );

  await conversationPersistence.updateSession(session.id, {
    lead_name:
      asString(input.profile?.full_name) ||
      asString(existingMetadata?.displayName) ||
      session.lead_name,
    lead_stage:
      origin.visitorStage === "authenticated_client"
        ? "qualified"
        : handoffDecision.hot
          ? "engaged"
          : session.lead_stage || "initial",
    case_area: origin.caseArea || resolveEntryCaseArea({ tema: origin.topic || "" }) || undefined,
    current_intent: handoffDecision.intent,
    handoff_to_human: handoffDecision.shouldHandoff,
    last_inbound_at: now,
    last_message_at: now,
    last_message_preview: input.payload.message.slice(0, 240),
    last_message_direction: "inbound",
    thread_status: handoffDecision.shouldHandoff ? "waiting_human" : "ai_active",
    waiting_for: handoffDecision.shouldHandoff ? "human" : "ai",
    owner_mode: handoffDecision.shouldHandoff ? "hybrid" : "ai",
    priority: handoffDecision.hot ? "high" : origin.visitorStage === "known_lead" ? "medium" : "low",
    unread_count: (session.unread_count || 0) + 1,
    handoff_state: handoffDecision.shouldHandoff ? "active" : "none",
    handoff_reason: handoffDecision.reason || undefined,
    ai_enabled: true,
    next_action_hint: handoffDecision.shouldHandoff
      ? "Assumir a conversa do site com contexto de origem preservado e decidir o proximo passo humano."
      : "IA respondendo no site. Monitorar evolucao e intervir se houver sensibilidade, consulta ou lead quente.",
    priority_source: "inferred",
    sensitivity_level: handoffDecision.shouldHandoff ? "high" : "normal",
    follow_up_status: handoffDecision.shouldHandoff ? "pending" : "none",
    last_status_event_at: now,
    metadata: mergedMetadata
  });

  await createConversationEvent({
    sessionId: session.id,
    eventType: "site_context_captured",
    eventData: {
      summary: "Contexto de origem do site capturado e anexado a thread.",
      pagePath: origin.pagePath,
      ctaLabel: origin.ctaLabel,
      articleTitle: origin.articleTitle,
      campaign: origin.campaign,
      topic: origin.topic,
      source: origin.source,
      visitorStage: origin.visitorStage
    }
  });

  if (handoffDecision.shouldHandoff) {
    await createConversationEvent({
      sessionId: session.id,
      eventType: "site_handoff_requested",
      eventData: {
        summary: "Handoff do site solicitado por sensibilidade, intencao ou aquecimento do lead.",
        reason: handoffDecision.reason,
        intent: handoffDecision.intent
      }
    });

    const staffRecipients = await listStaffEmailRecipients();
    for (const recipient of staffRecipients) {
      await queueGovernedNotification({
        eventKey: "operations.handoff.human",
        channel: "email",
        recipientProfileId: recipient.profileId,
        recipientAddress: recipient.email,
        subject: `Handoff humano no site: ${origin.pagePath || "nova conversa"}`,
        templateKey: "triage-urgent",
        payload: {
          fullName: "Visitante",
          caseAreaLabel: origin.topic || "Site",
          urgencyLabel: "Alta",
          stageLabel: "Handoff aguardando humano",
          contactEmail: "",
          contactPhone: "",
          caseSummary: handoffDecision.reason || "Conversa precisa de retomada humana.",
          submittedAtLabel: new Date().toISOString(),
          destinationPath: "/internal/advogada/atendimento"
        },
        relatedTable: "conversation_threads",
        relatedId: session.id,
        actionLabel: "Abrir inbox",
        actionPath: "/internal/advogada/atendimento",
        decisionContext: {
          source: "site_chat",
          intent: handoffDecision.intent,
          threadId: session.id,
          messagePreview: input.payload.message.slice(0, 220)
        }
      });
    }
  }

  return {
    sessionId: origin.sessionId,
    threadId: session.id,
    origin,
    messageType: "site_chat",
    shouldHandoff: handoffDecision.shouldHandoff,
    handoffReason: handoffDecision.reason
  };
}

async function persistSiteOutboundMessage(
  context: SiteThreadContext,
  replyText: string,
  intent: string | null,
  diagnostics: {
    source: string;
    usedFallback: boolean;
    responseTime?: number | null;
    classification?: unknown;
  }
) {
  const session = await conversationPersistence.getOrCreateSession("site", context.sessionId, context.sessionId);
  const sendResult = await sendSiteChatMessage(replyText, {
    sessionId: context.sessionId,
    threadId: context.threadId,
    origin: context.origin
  });
  const now = new Date().toISOString();
  const metadata = buildSiteChatMetadata(context.origin);

  await conversationPersistence.saveMessage(
    context.threadId,
    sendResult.messageId,
    "assistant",
    replyText,
    "outbound",
    {
      ...metadata,
      source: diagnostics.source,
      intent,
      usedFallback: diagnostics.usedFallback,
      responseTime: diagnostics.responseTime || null,
      classification: diagnostics.classification || null
    },
    {
      messageType: "site_chat",
      senderType: "ai",
      sendStatus: "sent",
      deliveryStatus: sendResult.status,
      isRead: true,
      readAt: now,
      receivedAt: now
    }
  );

  await conversationPersistence.updateSession(context.threadId, {
    current_intent: intent || undefined,
    handoff_to_human: context.shouldHandoff,
    last_outbound_at: now,
    last_message_at: now,
    last_message_preview: replyText.slice(0, 240),
    last_message_direction: "outbound",
    last_ai_reply_at: now,
    thread_status: context.shouldHandoff ? "waiting_human" : "waiting_client",
    waiting_for: context.shouldHandoff ? "human" : "client",
    owner_mode: context.shouldHandoff ? "hybrid" : "ai",
    priority: context.shouldHandoff ? "high" : "medium",
    handoff_state: context.shouldHandoff ? "active" : "none",
    handoff_reason: context.handoffReason || undefined,
    ai_enabled: true,
    follow_up_status: context.shouldHandoff ? "pending" : "none",
    next_action_hint: context.shouldHandoff
      ? "Handoff do site aberto. Revisar origem, CTA e intencao antes de assumir."
      : "Aguardar resposta do visitante no site e monitorar aquecimento da oportunidade.",
    last_status_event_at: now,
    metadata: {
      ...((session.metadata && typeof session.metadata === "object" ? session.metadata : {}) || {}),
      site_origin: buildSiteChatMetadata(context.origin).site_origin,
      source: "site_chat",
      last_ai_source: diagnostics.source,
      last_ai_response_time: diagnostics.responseTime || null,
      last_ai_used_fallback: diagnostics.usedFallback
    }
  });
}

async function createConversationEvent(input: {
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
}) {
  await conversationPersistence.supabaseClient.from("conversation_events").insert({
    session_id: input.sessionId,
    event_type: input.eventType,
    actor_type: "system",
    event_data: input.eventData
  });
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
    sessionId: parsed.sessionId,
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
      origem: payload.urlParams.origem || payload.urlParams.source || "web",
      campanha: payload.urlParams.campanha || payload.urlParams.utm_campaign || "",
      video: payload.urlParams.video || "",
      sessionId: payload.urlParams.sessionId || payload.sessionId || "",
      timestamp: Date.now()
    };
  }

  return null;
}

function evaluateSiteHandoff(message: string) {
  const normalized = message.toLowerCase();
  const explicitHuman =
    normalized.includes("advogada") ||
    normalized.includes("humano") ||
    normalized.includes("atendente") ||
    normalized.includes("quero falar com alguem");
  const sensitive =
    normalized.includes("urgente") ||
    normalized.includes("prazo") ||
    normalized.includes("audiencia") ||
    normalized.includes("bloqueio") ||
    normalized.includes("violencia") ||
    normalized.includes("amea") ||
    normalized.includes("pris");
  const consultationIntent =
    normalized.includes("consulta") ||
    normalized.includes("agendar") ||
    normalized.includes("contratar") ||
    normalized.includes("quero atendimento");
  const hot = sensitive || consultationIntent || explicitHuman;

  return {
    shouldHandoff: hot,
    hot,
    reason: explicitHuman
      ? "pedido_humano_site"
      : sensitive
        ? "situacao_sensivel_site"
        : consultationIntent
          ? "consulta_intencao_site"
          : null,
    intent: consultationIntent ? "consultation" : explicitHuman ? "handoff" : "site_chat"
  };
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

interface MetaContext {
  tema: string;
  origem: string;
  campanha: string;
  video: string;
  sessionId: string;
  timestamp: number;
}
