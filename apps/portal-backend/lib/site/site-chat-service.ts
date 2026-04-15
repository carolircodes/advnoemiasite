import "server-only";

import { randomUUID } from "crypto";

import { normalizeEntryContextValue, resolveEntryCaseArea } from "../entry-context";
import type { CaseArea } from "../domain/portal";

export type SiteChatOriginInput = {
  audience?: "visitor" | "client" | "staff";
  currentPath?: string | null;
  currentUrl?: string | null;
  pageTitle?: string | null;
  articleTitle?: string | null;
  articleSlug?: string | null;
  ctaLabel?: string | null;
  campaign?: string | null;
  topic?: string | null;
  source?: string | null;
  contentId?: string | null;
  sessionId?: string | null;
  referrer?: string | null;
  timeOnPageSeconds?: number | null;
  acquisitionTags?: string[] | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  leadName?: string | null;
  email?: string | null;
  phone?: string | null;
  identifiedProfileId?: string | null;
  identifiedClientId?: string | null;
};

export type SiteChatOrigin = {
  sessionId: string;
  pagePath: string;
  currentUrl: string | null;
  pageTitle: string | null;
  articleTitle: string | null;
  articleSlug: string | null;
  ctaLabel: string | null;
  campaign: string | null;
  topic: string | null;
  source: string | null;
  contentId: string | null;
  referrer: string | null;
  timeOnPageSeconds: number | null;
  acquisitionTags: string[];
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  visitorStage: "anonymous_visitor" | "known_lead" | "authenticated_client" | "staff";
  caseArea: CaseArea | null;
};

export type SiteChatSendResult = {
  ok: boolean;
  messageId: string;
  status: "accepted";
  rawStatus: "persisted_internal";
  error?: string | null;
  metadata: {
    channel: "site";
    surface: "site_chat";
    sessionId: string | null;
    threadId: string | null;
    visitorStage: string | null;
    pagePath: string | null;
    ctaLabel: string | null;
    sourceLabel: string | null;
  };
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeTags(value: string[] | null | undefined) {
  return Array.from(
    new Set(
      (value || [])
        .map((item) => normalizeEntryContextValue(item))
        .filter((item) => item.length > 0)
    )
  );
}

export function buildSiteSessionId(seed?: string | null) {
  const normalized = asString(seed);
  return normalized || randomUUID();
}

export function inferSiteVisitorStage(input: SiteChatOriginInput) {
  if (input.audience === "staff") {
    return "staff" as const;
  }

  if (input.audience === "client" || input.identifiedClientId || input.identifiedProfileId) {
    return "authenticated_client" as const;
  }

  if (input.leadName || input.email || input.phone) {
    return "known_lead" as const;
  }

  return "anonymous_visitor" as const;
}

export function normalizeSiteChatOrigin(input: SiteChatOriginInput): SiteChatOrigin {
  const topic = normalizeEntryContextValue(input.topic);
  const visitorStage = inferSiteVisitorStage(input);
  const pagePath = asString(input.currentPath) || "/";
  const source =
    normalizeEntryContextValue(input.source) ||
    (pagePath.startsWith("/cliente") ? "portal" : "site");

  return {
    sessionId: buildSiteSessionId(input.sessionId),
    pagePath,
    currentUrl: asString(input.currentUrl),
    pageTitle: asString(input.pageTitle),
    articleTitle: asString(input.articleTitle),
    articleSlug: normalizeEntryContextValue(input.articleSlug),
    ctaLabel: asString(input.ctaLabel),
    campaign:
      normalizeEntryContextValue(input.campaign) || normalizeEntryContextValue(input.utmCampaign),
    topic,
    source,
    contentId: asString(input.contentId),
    referrer: asString(input.referrer),
    timeOnPageSeconds:
      typeof input.timeOnPageSeconds === "number" && Number.isFinite(input.timeOnPageSeconds)
        ? Math.max(0, Math.round(input.timeOnPageSeconds))
        : null,
    acquisitionTags: normalizeTags(input.acquisitionTags),
    utmSource: normalizeEntryContextValue(input.utmSource),
    utmMedium: normalizeEntryContextValue(input.utmMedium),
    utmCampaign: normalizeEntryContextValue(input.utmCampaign),
    utmContent: normalizeEntryContextValue(input.utmContent),
    utmTerm: normalizeEntryContextValue(input.utmTerm),
    visitorStage,
    caseArea: resolveEntryCaseArea({ tema: topic || "" })
  };
}

export function buildSiteChatMetadata(origin: SiteChatOrigin) {
  return {
    source: "site_chat",
    responseSurface: "site_chat",
    channel: "site",
    site_origin: {
      sessionId: origin.sessionId,
      pagePath: origin.pagePath,
      currentUrl: origin.currentUrl,
      pageTitle: origin.pageTitle,
      articleTitle: origin.articleTitle,
      articleSlug: origin.articleSlug,
      ctaLabel: origin.ctaLabel,
      campaignLabel: origin.campaign,
      topicLabel: origin.topic,
      sourceLabel: origin.source,
      contentId: origin.contentId,
      referrer: origin.referrer,
      timeOnPageSeconds: origin.timeOnPageSeconds,
      acquisitionTags: origin.acquisitionTags,
      utmSource: origin.utmSource,
      utmMedium: origin.utmMedium,
      utmCampaign: origin.utmCampaign,
      utmContent: origin.utmContent,
      utmTerm: origin.utmTerm,
      visitorStage: origin.visitorStage
    }
  };
}

export async function sendSiteChatMessage(
  messageText: string,
  context?: {
    sessionId?: string | null;
    threadId?: string | null;
    origin?: Partial<SiteChatOrigin> | null;
  }
): Promise<SiteChatSendResult> {
  const messageId = `site_msg_${randomUUID()}`;
  const origin = context?.origin || null;

  return {
    ok: true,
    messageId,
    status: "accepted",
    rawStatus: "persisted_internal",
    error: null,
    metadata: {
      channel: "site",
      surface: "site_chat",
      sessionId: context?.sessionId || null,
      threadId: context?.threadId || null,
      visitorStage: origin?.visitorStage || null,
      pagePath: origin?.pagePath || null,
      ctaLabel: origin?.ctaLabel || null,
      sourceLabel: origin?.source || null
    }
  };
}
