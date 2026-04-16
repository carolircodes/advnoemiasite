type IdentityChannel = "instagram" | "facebook" | "whatsapp" | "site" | "portal" | "telegram";

export type LeadIdentityStatus = "resolved" | "provisional" | "pending";
export type LeadIdentitySource =
  | "profile"
  | "client_full_name"
  | "client_name"
  | "session_lead_name"
  | "platform_display_name"
  | "conversation_reply"
  | "metadata_display_name"
  | "platform_username"
  | "metadata_username"
  | "external_id";

type IdentityCandidate = {
  value: string;
  source: LeadIdentitySource;
  status: Exclude<LeadIdentityStatus, "pending">;
  score: number;
};

type ResolveLeadIdentityInput = {
  channel: IdentityChannel;
  externalUserId: string;
  profileFullName?: string | null;
  clientFullName?: string | null;
  clientName?: string | null;
  conversationName?: string | null;
  sessionLeadName?: string | null;
  metadataDisplayName?: string | null;
  metadataUsername?: string | null;
  platformDisplayName?: string | null;
  platformUsername?: string | null;
};

export type ResolvedLeadIdentity = {
  displayName: string;
  status: LeadIdentityStatus;
  source: LeadIdentitySource;
  sourceLabel: string;
  statusLabel: string;
  canonicalName: string | null;
  provisionalLabel: string | null;
};

type LeadIdentityUpdateInput = {
  channel: IdentityChannel;
  externalUserId: string;
  currentLeadName?: string | null;
  metadata?: Record<string, unknown> | null;
  platformDisplayName?: string | null;
  platformUsername?: string | null;
  messageText?: string | null;
  historyCount?: number;
};

export type LeadIdentityUpdateResult = {
  leadName: string | null;
  metadata: Record<string, unknown>;
  resolvedIdentity: ResolvedLeadIdentity;
  nameWasUpgraded: boolean;
  shouldAskForName: boolean;
  extractedName: string | null;
};

const NAME_PLACEHOLDERS = new Set([
  "contato sem nome",
  "nome pendente",
  "sem nome",
  "visitante",
  "visitor",
  "unknown",
  "undefined",
  "null",
  "lead",
  "cliente",
  "contato",
  "usuario",
  "usuário"
]);

const NON_NAME_WORDS = new Set([
  "aposentadoria",
  "aposentado",
  "problema",
  "banco",
  "familia",
  "família",
  "consulta",
  "urgente",
  "ajuda",
  "documentos",
  "previdenciario",
  "previdenciário",
  "outro",
  "assunto",
  "caso",
  "quero",
  "preciso",
  "gostaria",
  "sobre"
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function titleCaseName(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function isProbablyNameToken(token: string) {
  const normalized = stripAccents(token).toLowerCase();
  return token.length >= 2 && !NON_NAME_WORDS.has(normalized);
}

export function sanitizeHumanName(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value.replace(/[|()[\]{}<>]/g, " "));
  if (!normalized) {
    return null;
  }

  const lowered = stripAccents(normalized).toLowerCase();
  if (NAME_PLACEHOLDERS.has(lowered)) {
    return null;
  }

  if (/\d/.test(normalized)) {
    return null;
  }

  if (/[@_./\\:#]/.test(normalized)) {
    return null;
  }

  if (normalized.length < 2 || normalized.length > 60) {
    return null;
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.replace(/[^A-Za-zÀ-ÿ'-]/g, ""))
    .filter(Boolean);

  if (tokens.length === 0 || tokens.length > 4) {
    return null;
  }

  if (tokens.some((token) => token.length < 2) || tokens.every((token) => !isProbablyNameToken(token))) {
    return null;
  }

  return titleCaseName(tokens.join(" "));
}

function sanitizeUsername(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value.replace(/^@+/, ""));
  if (!normalized) {
    return null;
  }

  if (!/^[A-Za-z0-9._]{2,40}$/.test(normalized)) {
    return null;
  }

  return `@${normalized}`;
}

function scoreCandidate(source: LeadIdentitySource, status: Exclude<LeadIdentityStatus, "pending">) {
  const base =
    source === "profile"
      ? 100
      : source === "client_full_name"
        ? 96
        : source === "client_name"
          ? 92
          : source === "session_lead_name"
            ? 88
            : source === "platform_display_name"
              ? 84
              : source === "conversation_reply"
                ? 82
                : source === "metadata_display_name"
                  ? 76
                  : source === "platform_username"
                    ? 50
                    : source === "metadata_username"
                      ? 44
                      : 12;

  return status === "resolved" ? base : base - 20;
}

function buildCandidate(
  rawValue: string | null | undefined,
  source: LeadIdentitySource
): IdentityCandidate | null {
  const name = sanitizeHumanName(rawValue);
  if (name) {
    return {
      value: name,
      source,
      status: "resolved",
      score: scoreCandidate(source, "resolved")
    };
  }

  if (source === "platform_username" || source === "metadata_username") {
    const username = sanitizeUsername(rawValue);
    if (username) {
      return {
        value: username,
        source,
        status: "provisional",
        score: scoreCandidate(source, "provisional")
      };
    }
  }

  if (source === "platform_display_name" || source === "metadata_display_name") {
    const username = sanitizeUsername(rawValue);
    if (username) {
      return {
        value: username,
        source: source === "platform_display_name" ? "platform_username" : "metadata_username",
        status: "provisional",
        score: scoreCandidate(
          source === "platform_display_name" ? "platform_username" : "metadata_username",
          "provisional"
        )
      };
    }
  }

  return null;
}

function compareCandidates(current: IdentityCandidate | null, next: IdentityCandidate | null) {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  if (next.score > current.score) {
    return next;
  }

  if (next.score === current.score && next.value.length > current.value.length) {
    return next;
  }

  return current;
}

export function buildOperationalContactLabel(channel: IdentityChannel, externalUserId: string, username?: string | null) {
  const safeUsername = sanitizeUsername(username);
  if (safeUsername) {
    return safeUsername;
  }

  if (channel === "whatsapp") {
    const digits = externalUserId.replace(/\D/g, "");
    const tail = digits ? digits.slice(-4) : externalUserId.slice(-4);
    return `WhatsApp • final ${tail || "sem id"}`;
  }

  if (channel === "instagram") {
    return `Instagram • ${externalUserId.slice(0, 10)}`;
  }

  if (channel === "facebook") {
    return `Facebook • ${externalUserId.slice(0, 10)}`;
  }

  if (channel === "site") {
    return "Visitante do site";
  }

  if (channel === "telegram") {
    return `Telegram • ${externalUserId.slice(0, 10)}`;
  }

  return externalUserId;
}

export function getIdentitySourceLabel(source: LeadIdentitySource) {
  switch (source) {
    case "profile":
      return "perfil confirmado";
    case "client_full_name":
    case "client_name":
      return "cadastro comercial";
    case "session_lead_name":
      return "nome salvo na conversa";
    case "platform_display_name":
      return "nome vindo do canal";
    case "conversation_reply":
      return "nome informado na conversa";
    case "metadata_display_name":
      return "identificacao salva";
    case "platform_username":
    case "metadata_username":
      return "identificador do canal";
    default:
      return "contato operacional";
  }
}

export function getIdentityStatusLabel(status: LeadIdentityStatus) {
  switch (status) {
    case "resolved":
      return "nome confirmado";
    case "provisional":
      return "identificacao parcial";
    default:
      return "nome pendente";
  }
}

export function resolveLeadIdentity(input: ResolveLeadIdentityInput): ResolvedLeadIdentity {
  let best: IdentityCandidate | null = null;

  best = compareCandidates(best, buildCandidate(input.profileFullName, "profile"));
  best = compareCandidates(best, buildCandidate(input.clientFullName, "client_full_name"));
  best = compareCandidates(best, buildCandidate(input.clientName, "client_name"));
  best = compareCandidates(best, buildCandidate(input.conversationName, "conversation_reply"));
  best = compareCandidates(best, buildCandidate(input.sessionLeadName, "session_lead_name"));
  best = compareCandidates(best, buildCandidate(input.platformDisplayName, "platform_display_name"));
  best = compareCandidates(best, buildCandidate(input.metadataDisplayName, "metadata_display_name"));
  best = compareCandidates(best, buildCandidate(input.platformUsername, "platform_username"));
  best = compareCandidates(best, buildCandidate(input.metadataUsername, "metadata_username"));

  if (!best) {
    return {
      displayName: "Nome pendente",
      status: "pending",
      source: "external_id",
      sourceLabel: getIdentitySourceLabel("external_id"),
      statusLabel: getIdentityStatusLabel("pending"),
      canonicalName: null,
      provisionalLabel: null
    };
  }

  return {
    displayName: best.value,
    status: best.status,
    source: best.source,
    sourceLabel: getIdentitySourceLabel(best.source),
    statusLabel: getIdentityStatusLabel(best.status),
    canonicalName: best.status === "resolved" ? best.value : null,
    provisionalLabel: best.status === "provisional" ? best.value : null
  };
}

function hasRecentNameRequest(metadata: Record<string, unknown>) {
  const requestedAt = typeof metadata.identity_name_requested_at === "string"
    ? Date.parse(metadata.identity_name_requested_at)
    : Number.NaN;

  if (Number.isNaN(requestedAt)) {
    return false;
  }

  return Date.now() - requestedAt < 12 * 60 * 60 * 1000;
}

export function extractLeadNameFromMessage(
  message: string | null | undefined,
  options: { askedForName?: boolean } = {}
) {
  if (typeof message !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(message);
  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:meu nome (?:é|e)|me chamo|chamo-me|eu sou|sou a|sou o|pode me chamar de)\s+([A-Za-zÀ-ÿ'-]{2,}(?:\s+[A-Za-zÀ-ÿ'-]{2,}){0,2})/i,
    /(?:quem fala é|aqui é)\s+([A-Za-zÀ-ÿ'-]{2,}(?:\s+[A-Za-zÀ-ÿ'-]{2,}){0,2})/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = sanitizeHumanName(match?.[1]);
    if (candidate) {
      return candidate;
    }
  }

  if (options.askedForName && normalized.length <= 32 && !/[?!.,:;\/\\]/.test(normalized)) {
    return sanitizeHumanName(normalized);
  }

  return null;
}

function shouldAskForName(
  resolvedIdentity: ResolvedLeadIdentity,
  metadata: Record<string, unknown>,
  historyCount: number
) {
  if (resolvedIdentity.status === "resolved") {
    return false;
  }

  if (hasRecentNameRequest(metadata)) {
    return false;
  }

  return historyCount <= 6;
}

export function buildLeadIdentityUpdate(input: LeadIdentityUpdateInput): LeadIdentityUpdateResult {
  const metadata =
    input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {};
  const extractedName = extractLeadNameFromMessage(input.messageText, {
    askedForName: hasRecentNameRequest(metadata)
  });

  const currentResolved = resolveLeadIdentity({
    channel: input.channel,
    externalUserId: input.externalUserId,
    sessionLeadName: input.currentLeadName,
    metadataDisplayName:
      typeof metadata.displayName === "string" ? metadata.displayName : null,
    metadataUsername:
      typeof metadata.username === "string"
        ? metadata.username
        : typeof metadata.instagram_username === "string"
          ? metadata.instagram_username
          : typeof metadata.telegram_username === "string"
            ? metadata.telegram_username
            : null,
    platformDisplayName: input.platformDisplayName,
    platformUsername: input.platformUsername
  });

  const incomingResolved = resolveLeadIdentity({
    channel: input.channel,
    externalUserId: input.externalUserId,
    conversationName: extractedName,
    sessionLeadName: input.currentLeadName,
    metadataDisplayName: typeof metadata.displayName === "string" ? metadata.displayName : null,
    metadataUsername:
      input.platformUsername ||
      (typeof metadata.username === "string"
        ? metadata.username
        : typeof metadata.instagram_username === "string"
          ? metadata.instagram_username
          : typeof metadata.telegram_username === "string"
            ? metadata.telegram_username
            : null),
    platformDisplayName: input.platformDisplayName,
    platformUsername: input.platformUsername
  });

  const shouldUpgradeLeadName =
    incomingResolved.canonicalName !== null &&
    incomingResolved.canonicalName !== sanitizeHumanName(input.currentLeadName) &&
    (currentResolved.canonicalName === null ||
      incomingResolved.displayName.length > (currentResolved.canonicalName || "").length ||
      currentResolved.source === "platform_display_name" ||
      currentResolved.source === "metadata_display_name");

  if (input.platformDisplayName) {
    metadata.displayName = incomingResolved.displayName;
  } else if (incomingResolved.status === "resolved") {
    metadata.displayName = incomingResolved.displayName;
  } else if (incomingResolved.provisionalLabel) {
    metadata.displayName = incomingResolved.provisionalLabel;
  }

  if (input.platformUsername) {
    metadata.username = sanitizeUsername(input.platformUsername);
  }

  metadata.identity_status = incomingResolved.status;
  metadata.identity_source = incomingResolved.source;
  metadata.identity_updated_at = new Date().toISOString();

  if (incomingResolved.status === "resolved") {
    metadata.identity_resolved_at = new Date().toISOString();
    delete metadata.identity_name_requested_at;
  }

  const shouldPrompt = shouldAskForName(incomingResolved, metadata, input.historyCount || 0);

  return {
    leadName: shouldUpgradeLeadName ? incomingResolved.canonicalName : sanitizeHumanName(input.currentLeadName),
    metadata,
    resolvedIdentity: incomingResolved,
    nameWasUpgraded: shouldUpgradeLeadName,
    shouldAskForName: shouldPrompt,
    extractedName
  };
}

export function buildLeadNamePrompt() {
  return "Para organizar seu atendimento com mais precisão, como posso te chamar?";
}
