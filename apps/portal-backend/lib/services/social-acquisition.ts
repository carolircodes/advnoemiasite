import "server-only";

import { recordProductEvent } from "./public-intake.ts";
import {
  presentOperationalSourceLabel,
  presentOperationalThreadOriginLabel
} from "../channels/channel-presentation.ts";

export type AcquisitionEventGroup =
  | "acquisition"
  | "social_engagement"
  | "social_conversion";

export type AcquisitionEventName =
  | "comment_received"
  | "comment_replied"
  | "comment_redirect_to_dm"
  | "dm_started_from_comment"
  | "social_entry_created"
  | "content_assisted_lead"
  | "acquisition_source_resolved"
  | "topic_detected"
  | "lead_progressed_from_content"
  | "direct_conversion_signal";

export type SocialEntryType =
  | "instagram_comment"
  | "instagram_dm"
  | "instagram_comment_to_dm"
  | "facebook_comment"
  | "facebook_dm"
  | "facebook_comment_to_dm"
  | "youtube_comment"
  | "youtube_video_comment"
  | "youtube_short_comment"
  | "whatsapp_inbound"
  | "site_entry"
  | "portal_entry";

export type SocialEntryPoint =
  | "comment"
  | "direct"
  | "messenger"
  | "youtube_comment"
  | "whatsapp"
  | "site"
  | "portal";

export type DiscoveryMechanism =
  | "organic_comment"
  | "organic_direct"
  | "organic_messenger"
  | "organic_youtube_comment"
  | "organic_youtube_short_comment"
  | "whatsapp_inbound"
  | "cta_link"
  | "bio_link"
  | "site_navigation"
  | "portal_navigation"
  | "unknown";

export type SocialContentType =
  | "instagram_post"
  | "instagram_reel"
  | "instagram_comment_thread"
  | "instagram_dm_thread"
  | "facebook_post"
  | "facebook_comment_thread"
  | "facebook_messenger_thread"
  | "youtube_video"
  | "youtube_short"
  | "youtube_comment_thread"
  | "whatsapp_chat"
  | "site_page"
  | "portal_workspace"
  | "unknown";

export type DirectTransitionStatus =
  | "not_applicable"
  | "awaiting_dm"
  | "dm_started"
  | "auto_dm_supported"
  | "auto_dm_unavailable"
  | "human_review";

export type CommercialIntentSignal = "low" | "medium" | "high";

export type SocialAcquisitionSnapshot = {
  schemaVersion: "social-acquisition-v1";
  channel: "instagram" | "facebook" | "youtube" | "whatsapp" | "site" | "portal";
  source: string;
  sourceLabel: string;
  entryType: SocialEntryType;
  entryPoint: SocialEntryPoint;
  discoveryMechanism: DiscoveryMechanism;
  eventOrigin: "social" | "site" | "portal";
  topic: string;
  topicLabel: string;
  contentId: string;
  contentLabel: string;
  contentPlatformId?: string | null;
  contentType: SocialContentType;
  campaign: string;
  campaignLabel: string;
  contentOriginLabel: string;
  commercialContext: string;
  intentSignal: CommercialIntentSignal;
  recommendedOperatorAction: string;
  directTransitionStatus: DirectTransitionStatus;
  commentId?: string | null;
  firstTouchAt: string;
  lastResolvedAt: string;
};

type BuildSnapshotInput = {
  channel: "instagram" | "facebook" | "youtube" | "whatsapp";
  source: string;
  messageText: string;
  occurredAt?: string;
  commentContext?: {
    commentId?: string;
    mediaId?: string;
    contentFormat?: string;
    contentLabel?: string;
  };
  existing?: SocialAcquisitionSnapshot | null;
};

type TrackSocialEventInput = {
  eventName: AcquisitionEventName;
  eventGroup: AcquisitionEventGroup;
  snapshot: SocialAcquisitionSnapshot;
  sessionId: string;
  intakeRequestId?: string | null;
  pagePath?: string;
  payload?: Record<string, unknown>;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim();
}

function normalizeKey(value: string | null | undefined, fallback: string) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function detectTopic(messageText: string) {
  const normalized = messageText.toLowerCase();

  if (
    normalized.includes("aposent") ||
    normalized.includes("inss") ||
    normalized.includes("beneficio")
  ) {
    return "previdenciario";
  }

  if (
    normalized.includes("banco") ||
    normalized.includes("desconto") ||
    normalized.includes("emprest") ||
    normalized.includes("juros")
  ) {
    return "bancario";
  }

  if (
    normalized.includes("divor") ||
    normalized.includes("pens") ||
    normalized.includes("guarda") ||
    normalized.includes("famil")
  ) {
    return "familia";
  }

  if (
    normalized.includes("contrato") ||
    normalized.includes("indeniza") ||
    normalized.includes("dano")
  ) {
    return "civil";
  }

  return "geral";
}

function formatTopicLabel(topic: string) {
  const labels: Record<string, string> = {
    previdenciario: "Previdenciario",
    bancario: "Consumidor bancario",
    familia: "Familia",
    civil: "Civil",
    geral: "Geral"
  };

  return labels[topic] || "Geral";
}

function inferIntentSignal(messageText: string): CommercialIntentSignal {
  const normalized = messageText.toLowerCase();

  if (
    normalized.includes("quero contratar") ||
    normalized.includes("quero falar com a advogada") ||
    normalized.includes("quero agendar") ||
    normalized.includes("consulta")
  ) {
    return "high";
  }

  if (
    normalized.includes("me ajuda") ||
    normalized.includes("preciso") ||
    normalized.includes("me orienta") ||
    normalized.includes("como faco") ||
    normalized.includes("como fazer")
  ) {
    return "medium";
  }

  return "low";
}

function inferCommercialContext(topic: string, entryType: SocialEntryType) {
  if (entryType === "instagram_comment" || entryType === "facebook_comment") {
    return `captacao_social_publica_${topic}`;
  }

  if (
    entryType === "youtube_comment" ||
    entryType === "youtube_video_comment" ||
    entryType === "youtube_short_comment"
  ) {
    return `captacao_youtube_publica_${topic}`;
  }

  if (
    entryType === "instagram_comment_to_dm" ||
    entryType === "facebook_comment_to_dm"
  ) {
    return `continuacao_social_privada_${topic}`;
  }

  if (entryType === "instagram_dm" || entryType === "facebook_dm") {
    return `captacao_social_privada_${topic}`;
  }

  if (entryType === "whatsapp_inbound") {
    return `entrada_comercial_whatsapp_${topic}`;
  }

  return `entrada_${topic}`;
}

function inferOperatorAction(
  entryType: SocialEntryType,
  intentSignal: CommercialIntentSignal
) {
  if (entryType === "instagram_comment" || entryType === "facebook_comment") {
    return intentSignal === "high"
      ? "responder com brevidade premium e convidar para direct"
      : "acolher em publico sem aprofundar";
  }

  if (
    entryType === "youtube_comment" ||
    entryType === "youtube_video_comment" ||
    entryType === "youtube_short_comment"
  ) {
    return intentSignal === "high"
      ? "responder com valor e CTA elegante para triagem ou agenda"
      : "responder com valor curto e preservar o tom editorial";
  }

  if (
    entryType === "instagram_comment_to_dm" ||
    entryType === "facebook_comment_to_dm"
  ) {
    return "continuar triagem no direct preservando o contexto do comentario";
  }

  if (entryType === "instagram_dm" || entryType === "facebook_dm") {
    return "continuar triagem no direct";
  }

  if (entryType === "whatsapp_inbound") {
    return "seguir triagem comercial no WhatsApp";
  }

  return "qualificar origem e contexto antes do proximo passo";
}

function inferSourceLabel(source: string) {
  return presentOperationalSourceLabel(source, source);
}

function inferEntryDefinition(
  channel: "instagram" | "facebook" | "youtube" | "whatsapp",
  source: string
): {
  entryType: SocialEntryType;
  entryPoint: SocialEntryPoint;
  discoveryMechanism: DiscoveryMechanism;
  contentType: SocialContentType;
  eventOrigin: "social" | "site" | "portal";
  contentOriginLabel: string;
} {
  if (channel === "instagram" && source === "instagram_comment") {
    return {
      entryType: "instagram_comment",
      entryPoint: "comment",
      discoveryMechanism: "organic_comment",
      contentType: "instagram_comment_thread",
      eventOrigin: "social",
      contentOriginLabel: "Conteudo organico com comentario publico"
    };
  }

  if (channel === "instagram") {
    return {
      entryType: "instagram_dm",
      entryPoint: "direct",
      discoveryMechanism: "organic_direct",
      contentType: "instagram_dm_thread",
      eventOrigin: "social",
      contentOriginLabel: presentOperationalThreadOriginLabel({
        entryType: "instagram_dm"
      })
    };
  }

  if (channel === "facebook" && source === "facebook_comment") {
    return {
      entryType: "facebook_comment",
      entryPoint: "comment",
      discoveryMechanism: "organic_comment",
      contentType: "facebook_comment_thread",
      eventOrigin: "social",
      contentOriginLabel: "Conteudo organico da pagina com comentario publico"
    };
  }

  if (channel === "facebook") {
    return {
      entryType: "facebook_dm",
      entryPoint: "messenger",
      discoveryMechanism: "organic_messenger",
      contentType: "facebook_messenger_thread",
      eventOrigin: "social",
      contentOriginLabel: presentOperationalThreadOriginLabel({
        entryType: "facebook_dm"
      })
    };
  }

  if (channel === "youtube") {
    const isShort = source === "youtube_short_comment";

    return {
      entryType:
        source === "youtube_comment"
          ? "youtube_comment"
          : isShort
            ? "youtube_short_comment"
            : "youtube_video_comment",
      entryPoint: "youtube_comment",
      discoveryMechanism: isShort
        ? "organic_youtube_short_comment"
        : "organic_youtube_comment",
      contentType: isShort ? "youtube_short" : "youtube_video",
      eventOrigin: "social",
      contentOriginLabel: isShort
        ? "Short organico com comentario publico"
        : "Video organico com comentario publico"
    };
  }

  return {
    entryType: "whatsapp_inbound",
    entryPoint: "whatsapp",
    discoveryMechanism: "whatsapp_inbound",
    contentType: "whatsapp_chat",
    eventOrigin: "social",
    contentOriginLabel: "Entrada direta no WhatsApp"
  };
}

export function getSocialAcquisitionFromMetadata(
  metadata: Record<string, unknown> | undefined
) {
  const candidate = metadata?.social_acquisition;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate as SocialAcquisitionSnapshot;
}

export function promoteCommentSnapshotToDm(
  snapshot: SocialAcquisitionSnapshot
): SocialAcquisitionSnapshot {
  if (
    snapshot.entryType !== "instagram_comment" &&
    snapshot.entryType !== "facebook_comment"
  ) {
    return snapshot;
  }

  const isFacebook = snapshot.channel === "facebook";

  return {
    ...snapshot,
    source: isFacebook ? "facebook_comment_to_dm" : "instagram_comment_to_dm",
    sourceLabel: isFacebook
      ? presentOperationalSourceLabel("facebook_comment_to_dm")
      : presentOperationalSourceLabel("instagram_comment_to_dm"),
    entryType: isFacebook ? "facebook_comment_to_dm" : "instagram_comment_to_dm",
    entryPoint: isFacebook ? "messenger" : "direct",
    discoveryMechanism: isFacebook ? "organic_messenger" : "organic_direct",
    contentType: isFacebook ? "facebook_messenger_thread" : "instagram_dm_thread",
    contentOriginLabel: presentOperationalThreadOriginLabel({
      entryType: isFacebook ? "facebook_comment_to_dm" : "instagram_comment_to_dm"
    }),
    commercialContext: inferCommercialContext(
      snapshot.topic,
      isFacebook ? "facebook_comment_to_dm" : "instagram_comment_to_dm"
    ),
    recommendedOperatorAction:
      "continuar triagem no direct preservando o contexto do comentario",
    directTransitionStatus: "dm_started",
    lastResolvedAt: new Date().toISOString()
  };
}

export function buildSocialAcquisitionSnapshot(
  input: BuildSnapshotInput
): SocialAcquisitionSnapshot {
  const topic = detectTopic(input.messageText);
  const entry = inferEntryDefinition(input.channel, input.source);
  const now = input.occurredAt || new Date().toISOString();
  const intentSignal = inferIntentSignal(input.messageText);
  const contentPlatformId = input.commentContext?.mediaId || input.existing?.contentPlatformId || null;
  const contentId =
    input.existing?.contentId ||
    (contentPlatformId
      ? `${input.channel}_content_${normalizeKey(contentPlatformId, "unknown")}`
      : `${input.channel}_${entry.entryPoint}_${normalizeKey(topic, "geral")}`);

  const snapshot: SocialAcquisitionSnapshot = {
    schemaVersion: "social-acquisition-v1",
    channel: input.channel,
    source: input.source,
    sourceLabel: inferSourceLabel(input.source),
    entryType: entry.entryType,
    entryPoint: entry.entryPoint,
    discoveryMechanism: entry.discoveryMechanism,
    eventOrigin: entry.eventOrigin,
    topic,
    topicLabel: formatTopicLabel(topic),
    contentId,
    contentLabel:
      input.commentContext?.contentLabel ||
      input.existing?.contentLabel ||
      (contentPlatformId
        ? `Conteudo ${contentPlatformId}`
        : `Entrada ${entry.entryPoint} ${formatTopicLabel(topic)}`),
    contentPlatformId,
    contentType: entry.contentType,
    campaign:
      input.existing?.campaign ||
      (input.channel === "instagram" && input.source === "instagram_comment"
        ? "instagram_organic_comment_capture"
        : input.channel === "instagram"
          ? "instagram_direct_conversation"
          : input.channel === "facebook" && input.source === "facebook_comment"
            ? "facebook_organic_comment_capture"
            : input.channel === "facebook"
              ? "facebook_messenger_conversation"
              : input.channel === "youtube" && input.source === "youtube_short_comment"
                ? "youtube_shorts_comment_capture"
                : input.channel === "youtube"
                  ? "youtube_video_comment_capture"
              : "whatsapp_inbound_conversation"),
    campaignLabel:
      input.existing?.campaignLabel ||
      (input.channel === "instagram" && input.source === "instagram_comment"
        ? "Instagram comentario organico"
        : input.channel === "instagram"
          ? "Instagram direct"
          : input.channel === "facebook" && input.source === "facebook_comment"
            ? "Facebook comentario organico"
            : input.channel === "facebook"
              ? "Facebook Messenger"
              : input.channel === "youtube" && input.source === "youtube_short_comment"
                ? "YouTube Shorts"
                : input.channel === "youtube"
                  ? "YouTube videos"
          : "WhatsApp inbound"),
    contentOriginLabel: entry.contentOriginLabel,
    commercialContext: inferCommercialContext(topic, entry.entryType),
    intentSignal,
    recommendedOperatorAction: inferOperatorAction(entry.entryType, intentSignal),
    directTransitionStatus:
      (input.channel === "instagram" && input.source === "instagram_comment") ||
      (input.channel === "facebook" && input.source === "facebook_comment")
        ? "awaiting_dm"
        : input.channel === "youtube"
          ? "human_review"
        : "not_applicable",
    commentId: input.commentContext?.commentId || input.existing?.commentId || null,
    firstTouchAt: input.existing?.firstTouchAt || now,
    lastResolvedAt: now
  };

  if (
    (
      input.existing?.entryType === "instagram_comment" &&
      input.source === "instagram_dm"
    ) ||
    (
      input.existing?.entryType === "facebook_comment" &&
      input.source === "facebook_dm"
    )
  ) {
    return promoteCommentSnapshotToDm({
      ...input.existing,
      topic,
      topicLabel: formatTopicLabel(topic),
      intentSignal,
      recommendedOperatorAction: inferOperatorAction(
        input.channel === "facebook" ? "facebook_comment_to_dm" : "instagram_comment_to_dm",
        intentSignal
      )
    });
  }

  return snapshot;
}

export function buildSocialAcquisitionPayload(snapshot: SocialAcquisitionSnapshot) {
  return {
    acquisitionVersion: snapshot.schemaVersion,
    sourceChannel: snapshot.channel,
    source: snapshot.source,
    sourceLabel: snapshot.sourceLabel,
    entryType: snapshot.entryType,
    entryPoint: snapshot.entryPoint,
    discoveryMechanism: snapshot.discoveryMechanism,
    eventOrigin: snapshot.eventOrigin,
    topic: snapshot.topic,
    topicLabel: snapshot.topicLabel,
    contentId: snapshot.contentId,
    contentLabel: snapshot.contentLabel,
    contentPlatformId: snapshot.contentPlatformId,
    contentType: snapshot.contentType,
    campaign: snapshot.campaign,
    campaignLabel: snapshot.campaignLabel,
    contentOriginLabel: snapshot.contentOriginLabel,
    commercialContext: snapshot.commercialContext,
    intentSignal: snapshot.intentSignal,
    recommendedOperatorAction: snapshot.recommendedOperatorAction,
    directTransitionStatus: snapshot.directTransitionStatus,
    commentId: snapshot.commentId,
    firstTouchAt: snapshot.firstTouchAt,
    lastResolvedAt: snapshot.lastResolvedAt
  };
}

export async function trackSocialAcquisitionEvent(input: TrackSocialEventInput) {
  try {
    return await recordProductEvent({
      eventKey: input.eventName,
      eventGroup: input.eventGroup,
      pagePath:
        input.pagePath ||
        (input.snapshot.channel === "instagram"
          ? "/instagram/social"
          : input.snapshot.channel === "facebook"
            ? "/facebook/social"
            : input.snapshot.channel === "youtube"
              ? "/youtube/social"
              : input.snapshot.channel === "whatsapp"
                ? "/whatsapp/inbound"
                : "/social/acquisition"),
      sessionId: input.sessionId,
      intakeRequestId: input.intakeRequestId || undefined,
      payload: {
        ...buildSocialAcquisitionPayload(input.snapshot),
        ...(input.payload || {})
      }
    });
  } catch (error) {
    console.warn("[social-acquisition] failed to track event", {
      eventName: input.eventName,
      sessionId: input.sessionId,
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
