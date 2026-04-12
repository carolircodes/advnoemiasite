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
  instagramLeadCapture: readBooleanFlag("INSTAGRAM_ENABLE_LEAD_CAPTURE_AUTOMATION", false),
  instagramKeywordAutomation: readBooleanFlag("INSTAGRAM_ENABLE_KEYWORD_AUTOMATION", false),
  instagramCommentCampaignAutomation: readBooleanFlag(
    "INSTAGRAM_ENABLE_COMMENT_CAMPAIGN_AUTOMATION",
    false
  ),
  disableLegacyCommentResponders: readBooleanFlag("CHANNEL_DISABLE_LEGACY_COMMENT_RESPONDERS", true),
  whatsappEmergencyFallback: readBooleanFlag("WHATSAPP_ENABLE_EMERGENCY_FALLBACK", true)
} as const;
