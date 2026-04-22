import assert from "node:assert/strict";
import test from "node:test";

import {
  presentOperationalChannelLabel,
  presentOperationalSourceLabel,
  presentOperationalThreadOriginLabel
} from "../lib/channels/channel-presentation.ts";
import { buildContextRoutingDecision } from "../lib/services/context-routing.ts";
import { buildWebhookEventPayloadHash } from "../lib/services/webhook-idempotency.ts";
import { getYouTubeOperationMode } from "../lib/youtube/youtube-config.ts";
import {
  buildYouTubeJourneyTaxonomy,
  buildYouTubeReplyDraft,
  classifyYouTubeComment,
  evaluateYouTubeCommentGuardrails,
  normalizeYouTubeAsset
} from "../lib/youtube/youtube-domain.ts";

test("youtube taxonomy normalizes video and short semantics", () => {
  const videoAsset = normalizeYouTubeAsset({
    channelId: "channel-1",
    videoId: "video-1",
    title: "Como funciona a revisao do INSS",
    description: "Guia completo"
  });
  const shortAsset = normalizeYouTubeAsset({
    channelId: "channel-1",
    videoId: "short-1",
    title: "Short: prazo do INSS",
    description: "#Short resposta rapida"
  });

  const videoTaxonomy = buildYouTubeJourneyTaxonomy({ asset: videoAsset });
  const shortTaxonomy = buildYouTubeJourneyTaxonomy({ asset: shortAsset });

  assert.equal(videoAsset.kind, "video");
  assert.equal(shortAsset.kind, "short");
  assert.equal(videoTaxonomy.channel, "youtube");
  assert.equal(videoTaxonomy.entrySurface, "youtube_video");
  assert.equal(shortTaxonomy.entrySurface, "youtube_short");
  assert.equal(shortTaxonomy.contentFormat, "short");
});

test("youtube comment classification promotes hot commercial comments to triage or agenda", () => {
  const asset = normalizeYouTubeAsset({
    channelId: "channel-1",
    videoId: "video-2",
    title: "Direitos contra descontos bancarios indevidos",
    description: "Video completo"
  });

  const classification = classifyYouTubeComment({
    commentId: "comment-1",
    videoId: asset.videoId,
    channelId: asset.channelId,
    authorChannelId: "author-1",
    authorDisplayName: "Maria Silva",
    text: "Isso aconteceu comigo. Como agendar uma consulta e falar com a advogada?",
    publishedAt: "2026-04-20T10:00:00.000Z",
    asset
  });

  assert.equal(classification.source, "youtube_video_comment");
  assert.equal(classification.intent, "schedule_ready");
  assert.equal(classification.shouldRouteToInbox, true);
  assert.equal(classification.shouldRouteToCrm, true);
  assert.equal(classification.temperature, "hot");
  assert.ok(classification.score >= 80);
});

test("youtube guardrails keep read-only and duplicate scenarios from sending blindly", () => {
  const asset = normalizeYouTubeAsset({
    channelId: "channel-1",
    videoId: "video-3",
    title: "Documentos para revisar beneficio",
    description: "Video"
  });
  const classification = classifyYouTubeComment({
    commentId: "comment-2",
    videoId: asset.videoId,
    channelId: asset.channelId,
    authorChannelId: "author-2",
    authorDisplayName: "Jose",
    text: "Tenho esse problema, pode me orientar?",
    publishedAt: "2026-04-20T10:00:00.000Z",
    asset
  });

  const readOnlyDecision = evaluateYouTubeCommentGuardrails({
    classification,
    state: {
      recentRepliesByAuthor: 0,
      recentRepliesByVideo: 0,
      duplicateDetected: false,
      mode: "read_only",
      reviewRequiredByPolicy: false,
      maxRepliesPerWindow: 3,
      authorCooldownMinutes: 180,
      videoCooldownMinutes: 60
    }
  });
  const duplicateDecision = evaluateYouTubeCommentGuardrails({
    classification,
    state: {
      recentRepliesByAuthor: 0,
      recentRepliesByVideo: 0,
      duplicateDetected: true,
      mode: "active",
      reviewRequiredByPolicy: false,
      maxRepliesPerWindow: 3,
      authorCooldownMinutes: 180,
      videoCooldownMinutes: 60
    }
  });

  assert.equal(readOnlyDecision.status, "review");
  assert.equal(readOnlyDecision.reason, "read_only_mode");
  assert.equal(duplicateDecision.status, "blocked");
  assert.equal(duplicateDecision.reason, "duplicate_comment_retry");
});

test("youtube labels stay premium and distinct from instagram and facebook", () => {
  assert.equal(presentOperationalChannelLabel("youtube"), "YouTube");
  assert.equal(presentOperationalSourceLabel("youtube_short_comment"), "Comentario de Short do YouTube");
  assert.equal(
    presentOperationalThreadOriginLabel({ entryType: "youtube_video_comment" }),
    "Comentario relevante em video do YouTube"
  );
  assert.equal(presentOperationalChannelLabel("instagram"), "Instagram Direct");
  assert.equal(presentOperationalChannelLabel("facebook"), "Facebook Messenger");
});

test("youtube routing still plugs into the omnichannel decision layer", () => {
  const decision = buildContextRoutingDecision({
    score: 82,
    temperature: "hot",
    readiness: "pronto-para-agendar",
    topic: "previdenciario",
    sourceChannel: "youtube",
    funnelStage: "intent",
    preferredChannel: "whatsapp",
    appointmentInterest: true,
    lifecycleStage: "appointment",
    metadata: {
      source: "youtube_video_comment",
      medium: "social_video",
      contentId: "video-9",
      contentStage: "decision"
    }
  });

  assert.equal(decision.taxonomy.channel, "youtube");
  assert.equal(decision.priorityChannel, "whatsapp");
  assert.equal(decision.followUpTrack, "appointment_completion");
});

test("youtube payload hash stays stable for comment retries", () => {
  const first = buildWebhookEventPayloadHash({
    channel: "youtube",
    externalMessageId: "comment-55",
    externalUserId: "author-55",
    messageText: "Tenho esse problema",
    messageType: "youtube_comment"
  });
  const retry = buildWebhookEventPayloadHash({
    channel: "youtube",
    externalMessageId: "comment-55",
    externalUserId: "author-55",
    messageText: "  Tenho   esse problema ",
    messageType: "youtube_comment"
  });

  assert.equal(first, retry);
});

test("youtube reply drafts stay contextual and non-generic", () => {
  const asset = normalizeYouTubeAsset({
    channelId: "channel-1",
    videoId: "video-4",
    title: "Descontos indevidos em beneficio",
    description: "Video"
  });
  const classification = classifyYouTubeComment({
    commentId: "comment-3",
    videoId: asset.videoId,
    channelId: asset.channelId,
    authorChannelId: "author-3",
    authorDisplayName: "Carla",
    text: "Tenho esse problema, como faço?",
    publishedAt: "2026-04-20T10:00:00.000Z",
    asset
  });
  const reply = buildYouTubeReplyDraft({
    asset,
    comment: {
      text: "Tenho esse problema, como faço?",
      authorDisplayName: "Carla"
    },
    classification
  });

  assert.match(reply, /Carla/);
  assert.ok(reply.length > 40);
});

test("youtube operation mode prefers suggestion before active reply", () => {
  const originalActive = process.env.YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY;
  const originalSuggestion = process.env.YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE;

  process.env.YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY = "false";
  process.env.YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE = "true";
  assert.equal(getYouTubeOperationMode(), "suggestion");

  process.env.YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY = "true";
  process.env.YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE = "true";
  assert.equal(getYouTubeOperationMode(), "active");

  process.env.YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY = originalActive;
  process.env.YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE = originalSuggestion;
});
