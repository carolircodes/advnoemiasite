type ProductEventGroup = "traffic" | "content" | "conversion" | "analytics";

type FunnelStage =
  | "page_view"
  | "content_view"
  | "cta_click"
  | "whatsapp_click"
  | "form_started"
  | "form_submitted"
  | "lead_created"
  | "lead_qualified"
  | "appointment_started"
  | "appointment_completed"
  | "dashboard_view";

type EventDefinition = {
  eventKey: string;
  eventGroup: ProductEventGroup;
  funnelStage: FunnelStage;
  description: string;
};

const PRODUCT_EVENT_DEFINITIONS = [
  {
    eventKey: "site_visit_started",
    eventGroup: "traffic",
    funnelStage: "page_view",
    description: "Primeira visualizacao relevante da home."
  },
  {
    eventKey: "strategic_content_list_viewed",
    eventGroup: "content",
    funnelStage: "content_view",
    description: "Lista de artigos estrategicos visualizada."
  },
  {
    eventKey: "strategic_content_viewed",
    eventGroup: "content",
    funnelStage: "content_view",
    description: "Artigo estrategico visualizado."
  },
  {
    eventKey: "cta_start_attendance_clicked",
    eventGroup: "conversion",
    funnelStage: "cta_click",
    description: "Clique para iniciar atendimento."
  },
  {
    eventKey: "cta_client_portal_clicked",
    eventGroup: "conversion",
    funnelStage: "cta_click",
    description: "Clique para area do cliente."
  },
  {
    eventKey: "cta_start_triage_clicked",
    eventGroup: "conversion",
    funnelStage: "cta_click",
    description: "Clique para iniciar triagem."
  },
  {
    eventKey: "strategic_content_cta_clicked",
    eventGroup: "conversion",
    funnelStage: "cta_click",
    description: "Clique em CTA de artigo estrategico."
  },
  {
    eventKey: "whatsapp_channel_clicked",
    eventGroup: "conversion",
    funnelStage: "whatsapp_click",
    description: "Clique para WhatsApp."
  },
  {
    eventKey: "triage_started",
    eventGroup: "conversion",
    funnelStage: "form_started",
    description: "Inicio de triagem."
  },
  {
    eventKey: "triage_submitted",
    eventGroup: "conversion",
    funnelStage: "form_submitted",
    description: "Triagem enviada."
  },
  {
    eventKey: "lead_created",
    eventGroup: "conversion",
    funnelStage: "lead_created",
    description: "Lead criado."
  },
  {
    eventKey: "lead_qualified",
    eventGroup: "conversion",
    funnelStage: "lead_qualified",
    description: "Lead qualificado."
  },
  {
    eventKey: "appointment_started",
    eventGroup: "conversion",
    funnelStage: "appointment_started",
    description: "Agendamento iniciado."
  },
  {
    eventKey: "appointment_completed",
    eventGroup: "conversion",
    funnelStage: "appointment_completed",
    description: "Agendamento concluido."
  },
  {
    eventKey: "analytics_page_loaded",
    eventGroup: "analytics",
    funnelStage: "dashboard_view",
    description: "Dashboard interno de analytics visualizado."
  }
] as const satisfies readonly EventDefinition[];

export type ProductEventKey = (typeof PRODUCT_EVENT_DEFINITIONS)[number]["eventKey"];
export type ProductEventPayload = Record<string, unknown>;

const PRODUCT_EVENT_DEFINITION_MAP = new Map<string, EventDefinition>(
  PRODUCT_EVENT_DEFINITIONS.map((item) => [item.eventKey, item])
);

const PAYLOAD_KEY_ALIASES: Record<string, string> = {
  campaign: "campaign",
  utm_campaign: "campaign",
  medium: "medium",
  utm_medium: "medium",
  origem: "source",
  source: "source",
  source_channel: "channel",
  channel: "channel",
  tema: "topic",
  topic: "topic",
  utm_term: "term",
  term: "term",
  content_id: "contentId",
  contentId: "contentId",
  utm_content: "contentVariant",
  contentVariant: "contentVariant",
  entryPoint: "entryPoint",
  referrer: "referrer",
  landingPage: "landingPage",
  currentPath: "currentPath",
  pageTitle: "pageTitle",
  legalArea: "legalArea",
  caseArea: "legalArea",
  urgencyLevel: "urgencyLevel",
  preferredContactPeriod: "preferredContactPeriod",
  articleSlug: "articleSlug"
};

function normalizeText(value: unknown, maxLength = 160) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const lower = value.toLowerCase();

    if (
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("bearer")
    ) {
      return "[REDACTED]";
    }

    return value.slice(0, 240);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]);

    return Object.fromEntries(sanitizedEntries);
  }

  return undefined;
}

export function getProductEventDefinitions() {
  return PRODUCT_EVENT_DEFINITIONS;
}

export function getProductEventDefinition(eventKey: string) {
  return PRODUCT_EVENT_DEFINITION_MAP.get(eventKey) || null;
}

export function isKnownProductEventKey(eventKey: string): eventKey is ProductEventKey {
  return PRODUCT_EVENT_DEFINITION_MAP.has(eventKey);
}

export function normalizeProductEventPayload(payload: ProductEventPayload = {}) {
  const normalized: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(payload)) {
    const nextKey = PAYLOAD_KEY_ALIASES[key] || key;
    const sanitized =
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("password")
        ? "[REDACTED]"
        : sanitizeValue(rawValue);

    if (typeof sanitized === "undefined") {
      continue;
    }

    normalized[nextKey] = sanitized;
  }

  return normalized;
}

export function normalizeProductEventInput(input: {
  eventKey: string;
  eventGroup?: string;
  pagePath?: string;
  sessionId?: string;
  intakeRequestId?: string;
  payload?: ProductEventPayload;
}) {
  const definition = getProductEventDefinition(input.eventKey);
  const payload = normalizeProductEventPayload(input.payload || {});

  const source =
    normalizeText(payload.source) ||
    normalizeText(payload.channel) ||
    normalizeText(payload.entryPoint) ||
    "direct";
  const campaign = normalizeText(payload.campaign);
  const medium =
    normalizeText(payload.medium) ||
    (campaign ? "campaign" : undefined) ||
    "organic";
  const topic = normalizeText(payload.topic) || normalizeText(payload.legalArea);
  const contentId = normalizeText(payload.contentId) || normalizeText(payload.articleSlug);
  const normalizedPagePath = normalizeText(input.pagePath || payload.currentPath || payload.landingPage, 300) || "/";

  return {
    eventKey: definition?.eventKey || input.eventKey.trim().slice(0, 120),
    eventGroup: definition?.eventGroup || normalizeText(input.eventGroup, 80) || "conversion",
    funnelStage: definition?.funnelStage || null,
    pagePath: normalizedPagePath,
    sessionId: normalizeText(input.sessionId, 160),
    intakeRequestId: normalizeText(input.intakeRequestId, 160),
    payload: {
      ...payload,
      source,
      medium,
      campaign: campaign || null,
      topic: topic || null,
      contentId: contentId || null
    }
  };
}

export function buildBrowserEventPayload(input: {
  payload?: ProductEventPayload;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  searchParams?: URLSearchParams;
}) {
  const urlParams = input.searchParams || new URLSearchParams();
  const payload = normalizeProductEventPayload({
    ...input.payload,
    currentPath: input.pagePath,
    pageTitle: input.pageTitle,
    referrer: normalizeText(input.referrer, 240),
    source: urlParams.get("source") || urlParams.get("origem") || undefined,
    medium: urlParams.get("utm_medium") || urlParams.get("medium") || undefined,
    campaign:
      urlParams.get("campaign") ||
      urlParams.get("campanha") ||
      urlParams.get("utm_campaign") ||
      undefined,
    topic: urlParams.get("topic") || urlParams.get("tema") || undefined,
    term: urlParams.get("utm_term") || undefined,
    contentId: urlParams.get("content_id") || urlParams.get("utm_content") || undefined,
    landingPage: input.pagePath
  });

  return payload;
}
