function readBooleanFlag(name: string, fallback: boolean) {
  const rawValue = process.env[name];

  if (typeof rawValue !== "string") {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export const channelAutomationFeatures = {
  unifiedConversationRouter: readBooleanFlag("CHANNEL_ENABLE_UNIFIED_CONVERSATION_ROUTER", true),
  unifiedHumanHandoff: readBooleanFlag("CHANNEL_ENABLE_HUMAN_HANDOFF", true),
  unifiedMaterialRouting: readBooleanFlag("CHANNEL_ENABLE_MATERIAL_ROUTING", true),
  phase12JourneyOrchestration: readBooleanFlag("CHANNEL_ENABLE_PHASE12_JOURNEY_ORCHESTRATION", true),
  phase12ExecutiveDashboard: readBooleanFlag("CHANNEL_ENABLE_PHASE12_EXECUTIVE_DASHBOARD", true),
  phase12ExternalDispatchPreparation: readBooleanFlag(
    "CHANNEL_ENABLE_PHASE12_EXTERNAL_DISPATCH_PREPARATION",
    true
  ),
  instagramCommentPublicReply: readBooleanFlag("INSTAGRAM_ENABLE_PUBLIC_COMMENT_REPLY", true),
  instagramCommentAutoDm: readBooleanFlag("INSTAGRAM_ENABLE_COMMENT_AUTO_DM", false),
  facebookCommentPublicReply: readBooleanFlag("FACEBOOK_ENABLE_PUBLIC_COMMENT_REPLY", true),
  facebookCommentAutoDm: readBooleanFlag("FACEBOOK_ENABLE_COMMENT_AUTO_DM", false),
  instagramLeadCapture: readBooleanFlag("INSTAGRAM_ENABLE_LEAD_CAPTURE_AUTOMATION", false),
  instagramKeywordAutomation: readBooleanFlag("INSTAGRAM_ENABLE_KEYWORD_AUTOMATION", false),
  instagramCommentCampaignAutomation: readBooleanFlag(
    "INSTAGRAM_ENABLE_COMMENT_CAMPAIGN_AUTOMATION",
    false
  ),
  youtubeIngestion: readBooleanFlag("YOUTUBE_ENABLE_INGESTION", false),
  youtubeCommentSync: readBooleanFlag("YOUTUBE_ENABLE_COMMENT_SYNC", false),
  youtubeReadOnlyMode: readBooleanFlag("YOUTUBE_ENABLE_COMMENT_READ_ONLY", true),
  youtubeSuggestionMode: readBooleanFlag("YOUTUBE_ENABLE_COMMENT_SUGGESTION_MODE", true),
  youtubeActiveReply: readBooleanFlag("YOUTUBE_ENABLE_COMMENT_ACTIVE_REPLY", false),
  youtubeInboxRouting: readBooleanFlag("YOUTUBE_ENABLE_INBOX_ROUTING", true),
  youtubeCrmRouting: readBooleanFlag("YOUTUBE_ENABLE_CRM_ROUTING", true),
  youtubeHumanReviewDefault: readBooleanFlag("YOUTUBE_ENABLE_HUMAN_REVIEW_DEFAULT", true),
  disableLegacyCommentResponders: readBooleanFlag("CHANNEL_DISABLE_LEGACY_COMMENT_RESPONDERS", true),
  whatsappEmergencyFallback: readBooleanFlag("WHATSAPP_ENABLE_EMERGENCY_FALLBACK", true)
} as const;

export const channelCommercialConfig = {
  consultationWhatsappNumber:
    process.env.CHANNEL_CONSULTATION_WHATSAPP_NUMBER || "5584998566004"
} as const;
