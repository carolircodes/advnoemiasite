export type JourneyChannel =
  | "site"
  | "article"
  | "landing"
  | "instagram"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "whatsapp"
  | "telegram"
  | "portal"
  | "email"
  | "referral"
  | "ads"
  | "direct"
  | "unknown";

export type JourneySurface =
  | "site_home"
  | "article"
  | "topic_hub"
  | "landing_page"
  | "triage"
  | "whatsapp_chat"
  | "instagram_dm"
  | "instagram_comment"
  | "facebook_dm"
  | "youtube_video"
  | "youtube_short"
  | "youtube_comment"
  | "telegram_chat"
  | "portal"
  | "inbox"
  | "crm"
  | "appointment"
  | "payment"
  | "unknown";

export type JourneyFunnelStage =
  | "awareness"
  | "consideration"
  | "intent"
  | "triage"
  | "qualified"
  | "follow_up"
  | "appointment"
  | "conversion"
  | "retention"
  | "unknown";

export type JourneyTaxonomy = {
  channel: JourneyChannel;
  source: string;
  medium: string;
  campaign: string;
  campaignFamily: string;
  campaignObjective: string;
  legalTopic: string;
  contentFormat: string;
  contentId: string;
  contentStage: string;
  entrySurface: JourneySurface;
  conversionSurface: JourneySurface;
  primaryTouch: string;
  assistedTouches: string[];
  funnelStage: JourneyFunnelStage;
  followUpOrigin: string;
  schedulingOrigin: string;
  closingOrigin: string;
  preferredChannel: string;
};

export const EMPTY_JOURNEY_TAXONOMY: JourneyTaxonomy = {
  channel: "unknown",
  source: "unknown",
  medium: "unknown",
  campaign: "organic",
  campaignFamily: "organic",
  campaignObjective: "awareness",
  legalTopic: "unknown",
  contentFormat: "unknown",
  contentId: "unknown",
  contentStage: "unknown",
  entrySurface: "unknown",
  conversionSurface: "unknown",
  primaryTouch: "unknown",
  assistedTouches: [],
  funnelStage: "unknown",
  followUpOrigin: "unknown",
  schedulingOrigin: "unknown",
  closingOrigin: "unknown",
  preferredChannel: "unknown"
};

type LooseRecord = Record<string, unknown> | null | undefined;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w/-]+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFirstString(record: LooseRecord, keys: string[]) {
  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value = asString(record[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function getStringArray(record: LooseRecord, keys: string[]) {
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map((item) => asString(item)).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[>,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function mapChannel(rawValue: string): JourneyChannel {
  const value = normalizeText(rawValue);

  if (!value) {
    return "unknown";
  }

  if (value.includes("instagram") || value === "ig") {
    return "instagram";
  }

  if (value.includes("facebook") || value === "meta") {
    return "facebook";
  }

  if (value.includes("youtube") || value === "yt") {
    return "youtube";
  }

  if (value.includes("tiktok") || value === "tt") {
    return "tiktok";
  }

  if (value.includes("whatsapp") || value === "wa") {
    return "whatsapp";
  }

  if (value.includes("telegram")) {
    return "telegram";
  }

  if (value.includes("portal")) {
    return "portal";
  }

  if (value.includes("email") || value.includes("newsletter")) {
    return "email";
  }

  if (value.includes("referral") || value.includes("indicacao")) {
    return "referral";
  }

  if (value.includes("ads") || value.includes("paid")) {
    return "ads";
  }

  if (value.includes("article") || value.includes("artigo")) {
    return "article";
  }

  if (value.includes("landing")) {
    return "landing";
  }

  if (value.includes("site") || value.includes("organic") || value.includes("seo")) {
    return "site";
  }

  if (value.includes("direct") || value.includes("direto")) {
    return "direct";
  }

  return "unknown";
}

function mapSurface(rawValue: string, fallbackChannel: JourneyChannel): JourneySurface {
  const value = normalizeText(rawValue);

  if (!value) {
    switch (fallbackChannel) {
      case "portal":
        return "portal";
      case "whatsapp":
        return "whatsapp_chat";
      case "telegram":
        return "telegram_chat";
      case "instagram":
        return "instagram_dm";
      case "facebook":
        return "facebook_dm";
      case "youtube":
        return "youtube_comment";
      case "article":
        return "article";
      case "landing":
        return "landing_page";
      case "site":
      default:
        return "unknown";
    }
  }

  if (value.includes("triag")) {
    return "triage";
  }

  if (value.includes("home")) {
    return "site_home";
  }

  if (value.includes("hub") || value.includes("tema")) {
    return "topic_hub";
  }

  if (value.includes("artigo") || value.includes("article")) {
    return "article";
  }

  if (value.includes("landing")) {
    return "landing_page";
  }

  if (value.includes("portal")) {
    return "portal";
  }

  if (value.includes("inbox")) {
    return "inbox";
  }

  if (value.includes("crm")) {
    return "crm";
  }

  if (value.includes("appointment") || value.includes("agenda")) {
    return "appointment";
  }

  if (value.includes("payment") || value.includes("checkout")) {
    return "payment";
  }

  if (value.includes("instagram-comment")) {
    return "instagram_comment";
  }

  if (value.includes("instagram")) {
    return "instagram_dm";
  }

  if (value.includes("facebook")) {
    return "facebook_dm";
  }

  if (value.includes("youtube-short") || value.includes("youtube_short") || value.includes("short")) {
    return "youtube_short";
  }

  if (value.includes("youtube-comment") || value.includes("youtube_comment")) {
    return "youtube_comment";
  }

  if (value.includes("youtube") || value.includes("video")) {
    return "youtube_video";
  }

  if (value.includes("telegram")) {
    return "telegram_chat";
  }

  if (value.includes("whatsapp")) {
    return "whatsapp_chat";
  }

  return "unknown";
}

function mapFunnelStage(rawValue: string): JourneyFunnelStage {
  const value = normalizeText(rawValue);

  if (!value) {
    return "unknown";
  }

  if (value.includes("awareness") || value.includes("top")) {
    return "awareness";
  }

  if (value.includes("consider")) {
    return "consideration";
  }

  if (value.includes("intent") || value.includes("lead") || value.includes("cta")) {
    return "intent";
  }

  if (value.includes("triage") || value.includes("intake")) {
    return "triage";
  }

  if (value.includes("qualif") || value.includes("review")) {
    return "qualified";
  }

  if (value.includes("follow")) {
    return "follow_up";
  }

  if (value.includes("appointment") || value.includes("schedule") || value.includes("consult")) {
    return "appointment";
  }

  if (value.includes("convert") || value.includes("payment") || value.includes("close")) {
    return "conversion";
  }

  if (value.includes("retention") || value.includes("portal")) {
    return "retention";
  }

  return "unknown";
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeJourneyTaxonomy(input: {
  event?: LooseRecord;
  metadata?: LooseRecord;
  pipeline?: LooseRecord;
  session?: LooseRecord;
  defaults?: Partial<JourneyTaxonomy>;
}): JourneyTaxonomy {
  const event = input.event || null;
  const metadata = input.metadata || null;
  const pipeline = input.pipeline || null;
  const session = input.session || null;

  const rawChannel =
    getFirstString(pipeline, ["source_channel"]) ||
    getFirstString(session, ["channel", "entryChannel"]) ||
    getFirstString(metadata, ["channel", "source", "origem"]) ||
    getFirstString(event, ["channel", "source", "origem"]);
  const channel = mapChannel(rawChannel || input.defaults?.channel || "unknown");

  const source =
    normalizeText(
      getFirstString(metadata, ["source", "origem"]) ||
        getFirstString(event, ["source", "origem"]) ||
        getFirstString(pipeline, ["source_channel"]) ||
        input.defaults?.source ||
        rawChannel ||
        "unknown"
    ) || "unknown";
  const medium =
    normalizeText(
      getFirstString(metadata, ["medium", "source_medium"]) ||
        getFirstString(event, ["medium", "source_medium"]) ||
        getFirstString(pipeline, ["source_medium"]) ||
        input.defaults?.medium ||
        "unknown"
    ) || "unknown";
  const campaign =
    normalizeText(
      getFirstString(metadata, ["campaign", "campanha", "source_campaign"]) ||
        getFirstString(event, ["campaign", "campanha", "source_campaign"]) ||
        getFirstString(pipeline, ["source_campaign"]) ||
        input.defaults?.campaign ||
        "organic"
    ) || "organic";
  const legalTopic =
    normalizeText(
      getFirstString(metadata, ["theme", "tema", "topic", "source_topic"]) ||
        getFirstString(event, ["theme", "tema", "topic", "source_topic"]) ||
        getFirstString(pipeline, ["area_interest", "source_topic"]) ||
        input.defaults?.legalTopic ||
        "unknown"
    ) || "unknown";
  const contentFormat =
    normalizeText(
      getFirstString(metadata, ["contentFormat", "content_format", "format"]) ||
        getFirstString(event, ["contentFormat", "content_format", "format"]) ||
        input.defaults?.contentFormat ||
        "unknown"
    ) || "unknown";
  const contentId =
    normalizeText(
      getFirstString(metadata, ["contentId", "content_id", "source_content_id"]) ||
        getFirstString(event, ["contentId", "content_id", "source_content_id"]) ||
        getFirstString(pipeline, ["source_content_id"]) ||
        input.defaults?.contentId ||
        "unknown"
    ) || "unknown";
  const contentStage =
    normalizeText(
      getFirstString(metadata, ["contentStage", "content_stage"]) ||
        getFirstString(event, ["contentStage", "content_stage"]) ||
        input.defaults?.contentStage ||
        "unknown"
    ) || "unknown";
  const entrySurface = mapSurface(
    getFirstString(metadata, ["entrySurface", "entry_surface", "page", "pagePath", "surface"]) ||
      getFirstString(event, ["entrySurface", "entry_surface", "page", "pagePath", "surface"]) ||
      getFirstString(session, ["entryPoint", "entry_point"]) ||
      input.defaults?.entrySurface ||
      "",
    channel
  );
  const conversionSurface = mapSurface(
    getFirstString(metadata, ["conversionSurface", "conversion_surface"]) ||
      getFirstString(event, ["conversionSurface", "conversion_surface"]) ||
      getFirstString(session, ["conversionSurface"]) ||
      input.defaults?.conversionSurface ||
      "",
    channel
  );
  const primaryTouch =
    normalizeText(
      getFirstString(metadata, ["primaryTouch", "firstTouch", "first_touch"]) ||
        getFirstString(event, ["primaryTouch", "firstTouch", "first_touch"]) ||
        input.defaults?.primaryTouch ||
        source
    ) || source;
  const assistedTouches = uniqueStrings(
    getStringArray(metadata, ["assistedTouches", "assisted_touches"])
      .concat(getStringArray(event, ["assistedTouches", "assisted_touches"]))
      .concat(input.defaults?.assistedTouches || [])
      .map((value) => normalizeText(value))
  );
  const funnelStage = mapFunnelStage(
    getFirstString(metadata, ["funnelStage", "funnel_stage"]) ||
      getFirstString(event, ["funnelStage", "funnel_stage"]) ||
      getFirstString(pipeline, ["lifecycle_stage", "stage", "conversion_stage"]) ||
      getFirstString(session, ["executiveFunnelStage", "commercialFunnelStage"]) ||
      input.defaults?.funnelStage ||
      "unknown"
  );
  const preferredChannel =
    normalizeText(
      getFirstString(metadata, ["preferredChannel", "preferredContactChannel"]) ||
        getFirstString(event, ["preferredChannel", "preferredContactChannel"]) ||
        getFirstString(pipeline, ["preferred_channel"]) ||
        input.defaults?.preferredChannel ||
        rawChannel ||
        "unknown"
    ) || "unknown";

  return {
    channel,
    source,
    medium,
    campaign,
    campaignFamily:
      normalizeText(
        getFirstString(metadata, ["campaignFamily", "campaign_family"]) ||
          getFirstString(event, ["campaignFamily", "campaign_family"]) ||
          input.defaults?.campaignFamily ||
          campaign
      ) || campaign,
    campaignObjective:
      normalizeText(
        getFirstString(metadata, ["campaignObjective", "campaign_objective"]) ||
          getFirstString(event, ["campaignObjective", "campaign_objective"]) ||
          input.defaults?.campaignObjective ||
          "awareness"
      ) || "awareness",
    legalTopic,
    contentFormat,
    contentId,
    contentStage,
    entrySurface,
    conversionSurface,
    primaryTouch,
    assistedTouches,
    funnelStage,
    followUpOrigin:
      normalizeText(
        getFirstString(metadata, ["followUpOrigin", "follow_up_origin"]) ||
          getFirstString(event, ["followUpOrigin", "follow_up_origin"]) ||
          input.defaults?.followUpOrigin ||
          primaryTouch
      ) || primaryTouch,
    schedulingOrigin:
      normalizeText(
        getFirstString(metadata, ["schedulingOrigin", "scheduling_origin"]) ||
          getFirstString(event, ["schedulingOrigin", "scheduling_origin"]) ||
          input.defaults?.schedulingOrigin ||
          primaryTouch
      ) || primaryTouch,
    closingOrigin:
      normalizeText(
        getFirstString(metadata, ["closingOrigin", "closing_origin"]) ||
          getFirstString(event, ["closingOrigin", "closing_origin"]) ||
          input.defaults?.closingOrigin ||
          primaryTouch
      ) || primaryTouch,
    preferredChannel
  };
}

export function mergeJourneyTaxonomy(...items: Array<Partial<JourneyTaxonomy> | null | undefined>) {
  const merged: JourneyTaxonomy = { ...EMPTY_JOURNEY_TAXONOMY };
  const mutableMerged = merged as Record<string, string | string[]>;

  for (const item of items) {
    if (!item) {
      continue;
    }

    for (const [key, rawValue] of Object.entries(item)) {
      const value = rawValue as unknown;

      if (Array.isArray(value)) {
        const existingValues = Array.isArray(mutableMerged[key]) ? (mutableMerged[key] as string[]) : [];
        mutableMerged[key] = uniqueStrings(
          existingValues.concat(value.map((entry) => asString(entry)).filter(Boolean))
        );
        continue;
      }

      if (typeof value === "string" && value.trim() && value !== "unknown") {
        mutableMerged[key] = value;
      }
    }
  }

  return merged;
}

export function buildJourneyTouchLabel(taxonomy: JourneyTaxonomy) {
  const parts = [taxonomy.channel, taxonomy.legalTopic, taxonomy.entrySurface].filter(
    (value) => value && value !== "unknown"
  );
  return parts.join(":") || "unknown";
}

export function serializeJourneyTaxonomy(taxonomy: JourneyTaxonomy) {
  return {
    ...taxonomy,
    assistedTouches: uniqueStrings(taxonomy.assistedTouches)
  };
}
