import "server-only";

import { buildContextRoutingDecision } from "./context-routing";
import { conversationPersistence } from "./conversation-persistence";
import { recordProductEvent } from "./public-intake";
import {
  buildSocialAcquisitionSnapshot,
  buildSocialAcquisitionPayload,
  trackSocialAcquisitionEvent
} from "./social-acquisition";
import { createAdminSupabaseClient } from "../supabase/admin";
import { traceOperationalEvent } from "../observability/operational-trace";
import { channelAutomationFeatures } from "../config/channel-automation-features";
import { buildWebhookEventPayloadHash } from "./webhook-idempotency";
import {
  getYouTubeCredentialState,
  getYouTubeGuardrailConfig,
  getYouTubeModeReadiness,
  getYouTubeOperationMode
} from "../youtube/youtube-config";
import {
  buildYouTubeJourneyTaxonomy,
  buildYouTubeReplyDraft,
  classifyYouTubeComment,
  evaluateYouTubeCommentGuardrails,
  normalizeYouTubeAsset,
  type YouTubeCommentInput
} from "../youtube/youtube-domain";

type RegisterYouTubeAssetInput = {
  channelId: string;
  videoId: string;
  kind?: string | null;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  legalTopic?: string | null;
  campaign?: string | null;
  campaignFamily?: string | null;
  campaignObjective?: string | null;
  contentStage?: string | null;
};

type IngestYouTubeCommentInput = {
  asset: RegisterYouTubeAssetInput;
  commentId: string;
  parentCommentId?: string | null;
  authorChannelId: string;
  authorDisplayName: string;
  text: string;
  publishedAt?: string | null;
  likeCount?: number | null;
  replyCount?: number | null;
};

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function queueYouTubeDispatch(input: {
  ruleKey: string;
  entityKey: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("automation_dispatches")
    .insert({
      rule_key: input.ruleKey,
      entity_type: "youtube_comment",
      entity_key: input.entityKey,
      metadata: input.metadata
    })
    .select("id")
    .single();

  if (isUniqueViolation(error)) {
    return null;
  }

  if (error || !data) {
    throw new Error(error?.message || "Nao foi possivel registrar o dispatch do YouTube.");
  }

  return data.id as string;
}

async function createConversationEvent(input: {
  sessionId: string;
  eventType: string;
  summary: string;
  eventData?: Record<string, unknown>;
}) {
  const supabase = createAdminSupabaseClient();
  await supabase.from("conversation_events").insert({
    session_id: input.sessionId,
    event_type: input.eventType,
    actor_type: "system",
    event_data: {
      summary: input.summary,
      ...(input.eventData || {})
    }
  });
}

function countRecentYoutubeReplies(messages: Awaited<ReturnType<typeof conversationPersistence.getRecentMessages>>) {
  return messages.filter(
    (message) =>
      message.role === "assistant" &&
      message.direction === "outbound" &&
      typeof message.metadata_json?.messageType === "string" &&
      message.metadata_json.messageType.startsWith("youtube_")
  ).length;
}

export async function registerYouTubeAsset(input: RegisterYouTubeAssetInput) {
  if (!channelAutomationFeatures.youtubeIngestion) {
    throw new Error("A ingestao do YouTube esta desativada por feature flag neste ambiente.");
  }

  const asset = normalizeYouTubeAsset(input);
  const taxonomy = buildYouTubeJourneyTaxonomy({
    asset,
    conversionSurface: "youtube_comment",
    funnelStage: asset.contentStage === "decision" ? "intent" : "awareness"
  });

  await recordProductEvent({
    eventKey: "youtube_asset_registered",
    eventGroup: "social_engagement",
    pagePath: asset.kind === "short" ? "/youtube/shorts" : "/youtube/videos",
    payload: {
      channel: "youtube",
      asset,
      journeyTaxonomy: taxonomy
    }
  });

  traceOperationalEvent(
    "info",
    "YOUTUBE_ASSET_REGISTERED",
    {
      service: "youtube_orchestration",
      action: "register_asset",
      channel: "youtube"
    },
    {
      videoId: asset.videoId,
      assetKind: asset.kind,
      legalTopic: asset.legalTopic,
      campaign: asset.campaign
    }
  );

  return {
    asset,
    taxonomy
  };
}

export async function ingestYouTubeComment(input: IngestYouTubeCommentInput) {
  if (!channelAutomationFeatures.youtubeIngestion || !channelAutomationFeatures.youtubeCommentSync) {
    throw new Error("A operacao de comentarios do YouTube esta desativada por feature flag neste ambiente.");
  }

  const credentials = getYouTubeCredentialState();
  const operationMode = getYouTubeOperationMode();
  const modeReadiness = getYouTubeModeReadiness(operationMode);
  const guardrailConfig = getYouTubeGuardrailConfig();
  const asset = normalizeYouTubeAsset(input.asset);
  const comment: YouTubeCommentInput = {
    commentId: input.commentId.trim(),
    parentCommentId: input.parentCommentId || null,
    videoId: asset.videoId,
    channelId: asset.channelId,
    authorChannelId: input.authorChannelId.trim(),
    authorDisplayName: input.authorDisplayName.trim() || "Autor do YouTube",
    text: input.text.trim(),
    publishedAt: input.publishedAt?.trim() || new Date().toISOString(),
    likeCount: input.likeCount || 0,
    replyCount: input.replyCount || 0,
    asset
  };

  const classification = classifyYouTubeComment(comment);
  const taxonomy = buildYouTubeJourneyTaxonomy({
    asset,
    source: classification.source,
    conversionSurface:
      classification.shouldRouteToInbox || classification.shouldRouteToCrm ? "inbox" : "youtube_comment",
    funnelStage:
      classification.intent === "schedule_ready"
        ? "intent"
        : classification.intent === "triage_ready"
          ? "triage"
          : "awareness",
    preferredChannel: classification.shouldRouteToCrm ? "whatsapp" : "youtube"
  });
  const routingDecision = buildContextRoutingDecision({
    score: classification.score,
    temperature: classification.temperature,
    readiness:
      classification.intent === "schedule_ready"
        ? "pronto-para-agendar"
        : classification.intent === "triage_ready"
          ? "comparando"
          : "explorando",
    topic: classification.legalTopic,
    sourceChannel: "youtube",
    funnelStage: taxonomy.funnelStage,
    preferredChannel: taxonomy.preferredChannel,
    appointmentInterest: classification.intent === "schedule_ready",
    lifecycleStage: taxonomy.funnelStage,
    metadata: {
      source: classification.source,
      medium: asset.kind === "short" ? "short_video" : "social_video",
      campaign: asset.campaign,
      theme: classification.legalTopic,
      contentId: asset.videoId,
      contentStage: asset.contentStage,
      entrySurface: asset.kind === "short" ? "youtube_short" : "youtube_video",
      conversionSurface:
        classification.shouldRouteToInbox || classification.shouldRouteToCrm ? "inbox" : "youtube_comment"
    }
  });
  const acquisitionSnapshot = buildSocialAcquisitionSnapshot({
    channel: "youtube",
    source: classification.source,
    messageText: comment.text,
    occurredAt: comment.publishedAt,
    commentContext: {
      commentId: comment.commentId,
      mediaId: comment.videoId,
      contentFormat: asset.kind,
      contentLabel: asset.title
    }
  });

  const duplicateDetected = await conversationPersistence.isEventProcessed("youtube", comment.commentId);
  const payloadHash = buildWebhookEventPayloadHash({
    channel: "youtube",
    externalMessageId: comment.commentId,
    externalUserId: comment.authorChannelId,
    messageText: comment.text,
    messageType: "youtube_comment"
  });
  const payloadHashProcessed = payloadHash
    ? await conversationPersistence.isPayloadHashProcessed("youtube", payloadHash, comment.authorChannelId)
    : false;

  if (duplicateDetected || payloadHashProcessed) {
    traceOperationalEvent(
      "info",
      "YOUTUBE_COMMENT_DUPLICATE_IGNORED",
      {
        service: "youtube_orchestration",
        action: "dedupe",
        channel: "youtube"
      },
      {
        commentId: comment.commentId,
        videoId: comment.videoId,
        duplicateDetected,
        payloadHashProcessed
      }
    );

    return {
      asset,
      comment,
      classification,
      taxonomy,
      routingDecision,
      duplicate: true
    };
  }

  const shouldOpenThread =
    classification.shouldRouteToInbox ||
    classification.shouldRouteToCrm ||
    classification.shouldReply;
  const session = shouldOpenThread
    ? await conversationPersistence.getOrCreateSession("youtube", comment.authorChannelId, comment.videoId)
    : null;
  const recentMessages = session ? await conversationPersistence.getRecentMessages(session.id, 10) : [];
  const authorReplyCount = countRecentYoutubeReplies(recentMessages);
  const guardrails = evaluateYouTubeCommentGuardrails({
    classification,
    state: {
      recentRepliesByAuthor: authorReplyCount,
      recentRepliesByVideo: 0,
      duplicateDetected: false,
      mode: guardrailConfig.mode,
      reviewRequiredByPolicy:
        !modeReadiness.satisfied ||
        (guardrailConfig.humanReviewDefault && (classification.needsHumanReview || !credentials.canReply)),
      maxRepliesPerWindow: guardrailConfig.maxRepliesPerWindow,
      authorCooldownMinutes: guardrailConfig.authorCooldownMinutes,
      videoCooldownMinutes: guardrailConfig.videoCooldownMinutes
    }
  });
  const suggestedReply = buildYouTubeReplyDraft({
    asset,
    comment,
    classification
  });

  let dispatchId: string | null = null;

  if (session) {
    await conversationPersistence.saveMessage(
      session.id,
      comment.commentId,
      "user",
      comment.text,
      "inbound",
      {
        channel: "youtube",
        source: classification.source,
        messageType: "youtube_comment",
        responseSurface: "public_comment",
        youtube: {
          commentId: comment.commentId,
          parentCommentId: comment.parentCommentId,
          videoId: comment.videoId,
          assetKind: asset.kind,
          assetTitle: asset.title,
          authorDisplayName: comment.authorDisplayName,
          canonicalUrl: asset.canonicalUrl
        },
        social_acquisition: acquisitionSnapshot,
        journeyTaxonomy: taxonomy,
        routingDecision,
        classification
      },
      {
        messageType: "youtube_comment",
        senderType: "contact",
        sendStatus: "received",
        deliveryStatus: "received"
      }
    );

    const sessionMetadata = {
      ...(session.metadata || {}),
      social_acquisition: acquisitionSnapshot,
      youtube: {
        channelId: asset.channelId,
        videoId: asset.videoId,
        assetKind: asset.kind,
        assetTitle: asset.title,
        commentId: comment.commentId,
        canonicalUrl: asset.canonicalUrl,
        operationMode: guardrailConfig.mode,
        canRead: credentials.canRead,
        canReply: credentials.canReply,
        modeReadiness
      },
      journeyTaxonomy: taxonomy,
      routingDecision,
      youtubeModeration: {
        classification,
        guardrails,
        suggestedReply,
        lastInboundAt: comment.publishedAt
      }
    };

    await conversationPersistence.updateSession(session.id, {
      case_area: classification.legalTopic,
      current_intent: classification.intent,
      lead_stage:
        classification.intent === "schedule_ready"
          ? "qualified"
          : classification.intent === "triage_ready"
            ? "triage"
            : "engaged",
      thread_status:
        classification.shouldRouteToInbox || guardrails.shouldQueueReview ? "waiting_human" : "waiting_client",
      waiting_for:
        classification.shouldRouteToInbox || guardrails.shouldQueueReview ? "human" : "client",
      owner_mode:
        classification.shouldRouteToInbox || guardrails.shouldQueueReview ? "hybrid" : "ai",
      priority:
        classification.conversionPotential === "high"
          ? "high"
          : classification.conversionPotential === "medium"
            ? "medium"
            : "low",
      ai_enabled: !guardrails.shouldQueueReview,
      last_inbound_at: comment.publishedAt,
      last_message_at: comment.publishedAt,
      last_message_preview: comment.text.slice(0, 240),
      last_message_direction: "inbound",
      next_action_hint: routingDecision.recommendedAction,
      follow_up_status:
        classification.shouldRouteToCrm || classification.shouldRouteToInbox ? "due" : "none",
      metadata: sessionMetadata
    });

    await createConversationEvent({
      sessionId: session.id,
      eventType: "youtube_comment_signal_captured",
      summary: "Comentario do YouTube capturado como sinal operacional.",
      eventData: {
        commentId: comment.commentId,
        videoId: comment.videoId,
        assetKind: asset.kind,
        classification
      }
    });

    if (classification.shouldReply) {
      await conversationPersistence.saveMessage(
        session.id,
        undefined,
        guardrails.shouldQueueReview ? "system" : "assistant",
        suggestedReply,
        "outbound",
        {
          channel: "youtube",
          source: classification.source,
          messageType: guardrails.shouldQueueReview
            ? "youtube_comment_reply_suggestion"
            : "youtube_comment_reply",
          responseSurface: "public_comment",
          guardrailStatus: guardrails.status,
          guardrailReason: guardrails.reason,
          classification,
          youtube: {
            commentId: comment.commentId,
            videoId: comment.videoId,
            assetKind: asset.kind
          }
        },
        {
          messageType: guardrails.shouldQueueReview
            ? "youtube_comment_reply_suggestion"
            : "youtube_comment_reply",
          senderType: guardrails.shouldQueueReview ? "system" : "ai",
          sendStatus: guardrails.shouldSend ? "pending" : "received",
          deliveryStatus: guardrails.shouldSend ? "queued" : "review"
        }
      );
    }

    dispatchId = await queueYouTubeDispatch({
      ruleKey:
        guardrails.shouldSend && channelAutomationFeatures.youtubeActiveReply
          ? "youtube-comment-active-reply"
          : classification.shouldRouteToCrm
            ? "youtube-comment-crm-review"
            : classification.shouldRouteToInbox || guardrails.shouldQueueReview
              ? "youtube-comment-human-review"
              : "youtube-comment-suggestion",
      entityKey: comment.commentId,
      metadata: {
        videoId: comment.videoId,
        assetKind: asset.kind,
        assetTitle: asset.title,
        commentId: comment.commentId,
        authorChannelId: comment.authorChannelId,
        authorDisplayName: comment.authorDisplayName,
        classification,
        guardrails,
        routingDecision,
        suggestedReply,
        journeyTaxonomy: taxonomy,
        socialAcquisition: buildSocialAcquisitionPayload(acquisitionSnapshot)
      }
    });

    await createConversationEvent({
      sessionId: session.id,
      eventType:
        classification.shouldRouteToInbox || classification.shouldRouteToCrm || guardrails.shouldQueueReview
          ? "youtube_comment_review_requested"
          : "youtube_comment_reply_suggested",
      summary:
        classification.shouldRouteToInbox || classification.shouldRouteToCrm || guardrails.shouldQueueReview
          ? "Comentario do YouTube encaminhado para revisao operacional."
          : "Resposta sugerida do YouTube registrada com guardrails.",
      eventData: {
        dispatchId,
        guardrails,
        suggestedReply,
        routingDecision
      }
    });
  }

  await recordProductEvent({
    eventKey: "comment_received",
    eventGroup: "social_engagement",
    pagePath: "/youtube/social",
    sessionId: session?.id,
    payload: {
      channel: "youtube",
      source: classification.source,
      asset,
      commentId: comment.commentId,
      authorChannelId: comment.authorChannelId,
        classification,
        operationMode,
        modeReadiness,
        routingDecision,
        journeyTaxonomy: taxonomy,
      dispatchId
    }
  });

  await trackSocialAcquisitionEvent({
    eventName: "comment_received",
    eventGroup: "social_engagement",
    snapshot: acquisitionSnapshot,
    sessionId: session?.id || comment.authorChannelId,
    pagePath: "/youtube/social",
    payload: {
      classification,
      routingDecision,
      dispatchId
    }
  });

  if (classification.shouldReply) {
    await trackSocialAcquisitionEvent({
      eventName: "comment_replied",
      eventGroup: "social_conversion",
      snapshot: acquisitionSnapshot,
      sessionId: session?.id || comment.authorChannelId,
      pagePath: "/youtube/social",
      payload: {
        replyMode: guardrailConfig.mode,
        guardrails,
        suggestedReply,
        dispatchId
      }
    });
  }

  await conversationPersistence.markEventProcessed(
    "youtube",
    comment.commentId,
    comment.commentId,
    comment.authorChannelId,
    payloadHash || undefined
  );

  traceOperationalEvent(
    "info",
    "YOUTUBE_COMMENT_ROUTED",
    {
      service: "youtube_orchestration",
      action: "ingest_comment",
      channel: "youtube",
      sessionId: session?.id || null
    },
    {
      commentId: comment.commentId,
      videoId: comment.videoId,
      assetKind: asset.kind,
      source: classification.source,
      intent: classification.intent,
      conversionPotential: classification.conversionPotential,
      routeToInbox: classification.shouldRouteToInbox,
      routeToCrm: classification.shouldRouteToCrm,
      guardrailStatus: guardrails.status,
      guardrailReason: guardrails.reason,
      dispatchId,
      operationMode: guardrailConfig.mode
      ,
      modeReadiness
    }
  );

  return {
    asset,
    comment,
    sessionId: session?.id || null,
    classification,
    guardrails,
    routingDecision,
    taxonomy,
    suggestedReply,
    dispatchId,
    credentialState: credentials,
    modeReadiness
  };
}
