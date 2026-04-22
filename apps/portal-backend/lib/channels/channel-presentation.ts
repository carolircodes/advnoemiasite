const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram Direct",
  facebook: "Facebook Messenger",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  portal: "Portal",
  site: "Site"
};

const SOURCE_LABELS: Record<string, string> = {
  instagram_comment: "Comentario do Instagram",
  instagram_dm: "Instagram Direct",
  instagram_comment_to_dm: "Comentario do Instagram convertido em Direct",
  facebook_comment: "Comentario do Facebook",
  facebook_dm: "Facebook Messenger",
  facebook_comment_to_dm: "Comentario do Facebook convertido em Messenger",
  youtube_comment: "Comentario do YouTube",
  youtube_video_comment: "Comentario de video do YouTube",
  youtube_short_comment: "Comentario de Short do YouTube",
  youtube_video: "Video do YouTube",
  youtube_short: "Short do YouTube",
  youtube_entry: "Entrada via YouTube",
  youtube_conversion: "Conversao via YouTube",
  whatsapp_inbound: "WhatsApp inbound",
  site_entry: "Chat do site",
  portal_entry: "Entrada pelo portal",
  social_dm: "Conversa social privada",
  fallback: "Fallback operacional",
  internal_inbox: "Resposta humana pelo painel"
};

const THREAD_ORIGIN_LABELS: Record<string, string> = {
  instagram_comment: "Comentario relevante do Instagram",
  instagram_dm: "Instagram Direct oficial",
  instagram_comment_to_dm: "Comentario do Instagram convertido em Direct",
  facebook_comment: "Comentario relevante do Facebook",
  facebook_dm: "Facebook Messenger oficial",
  facebook_comment_to_dm: "Comentario do Facebook convertido em Messenger",
  youtube_comment: "Comentario relevante do YouTube",
  youtube_video_comment: "Comentario relevante em video do YouTube",
  youtube_short_comment: "Comentario relevante em Short do YouTube"
};

function normalizeKey(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function resolveOperationalLabel(token: string | null | undefined) {
  const normalized = normalizeKey(token);

  if (!normalized) {
    return null;
  }

  return SOURCE_LABELS[normalized] || CHANNEL_LABELS[normalized] || THREAD_ORIGIN_LABELS[normalized] || null;
}

export function presentOperationalChannelLabel(
  channel: string | null | undefined,
  fallback = "Canal nao identificado"
) {
  return resolveOperationalLabel(channel) || fallback;
}

export function presentOperationalSourceLabel(
  source: string | null | undefined,
  fallback = "Origem nao identificada"
) {
  return resolveOperationalLabel(source) || fallback;
}

export function presentOperationalThreadOriginLabel(input: {
  entryType?: string | null;
  channel?: string | null;
  fallback?: string;
}) {
  const entryType = normalizeKey(input.entryType);

  if (entryType && THREAD_ORIGIN_LABELS[entryType]) {
    return THREAD_ORIGIN_LABELS[entryType];
  }

  if (normalizeKey(input.channel) === "facebook") {
    return "Facebook Messenger oficial";
  }

  if (normalizeKey(input.channel) === "instagram") {
    return "Instagram Direct oficial";
  }

  if (normalizeKey(input.channel) === "youtube") {
    return "Entrada oficial via YouTube";
  }

  return input.fallback || "Thread operacional";
}
