import type {
  NoemiaChannel,
  NoemiaDomain,
  NoemiaPolicyMode,
  NoemiaUserType
} from "./core-types";

const NOEMIA_PROMPT_VERSION = "2026-04-phase4";

export function getNoemiaPromptVersion() {
  return NOEMIA_PROMPT_VERSION;
}

export function resolveNoemiaDomain(input: {
  channel: NoemiaChannel;
  userType: NoemiaUserType;
  metadata?: Record<string, unknown>;
}): NoemiaDomain {
  const explicitDomain = input.metadata?.noemiaDomain;

  if (typeof explicitDomain === "string" && isNoemiaDomain(explicitDomain)) {
    return explicitDomain;
  }

  if (input.channel === "instagram" || input.channel === "facebook") {
    const surface = input.metadata?.source;

    if (surface === "comment" || surface === "instagram_comment" || surface === "facebook_comment") {
      return "channel_comment";
    }
  }

  if (input.channel === "portal") {
    return input.userType === "staff" ? "internal_operational" : "portal_support";
  }

  if (
    input.channel === "whatsapp" ||
    input.channel === "instagram" ||
    input.channel === "facebook" ||
    input.channel === "telegram"
  ) {
    return "commercial_conversion";
  }

  return "public_site_chat";
}

export function resolveNoemiaPolicyMode(domain: NoemiaDomain): NoemiaPolicyMode {
  switch (domain) {
    case "commercial_conversion":
      return "commercial";
    case "internal_operational":
      return "internal";
    case "channel_comment":
      return "channel_automation";
    case "portal_support":
    case "public_site_chat":
    default:
      return "public";
  }
}

export function shouldLoadClientContext(domain: NoemiaDomain) {
  return domain === "commercial_conversion" || domain === "portal_support";
}

export function shouldAutoUpdateCommercialPipeline(domain: NoemiaDomain) {
  return domain === "commercial_conversion";
}

export function shouldPersistTriage(domain: NoemiaDomain) {
  return domain === "public_site_chat" || domain === "commercial_conversion";
}

function isNoemiaDomain(value: string): value is NoemiaDomain {
  return [
    "public_site_chat",
    "portal_support",
    "commercial_conversion",
    "internal_operational",
    "channel_comment"
  ].includes(value);
}
