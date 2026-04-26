import type { ClientContextForAI } from "../services/client-context.ts";
import type {
  NoemiaChannel,
  NoemiaContext,
  NoemiaDomain,
  NoemiaPromptContextSummary,
  NoemiaUserType
} from "./core-types.ts";

type MinimizeNoemiaContextInput = {
  domain: NoemiaDomain;
  channel: NoemiaChannel;
  userType: NoemiaUserType;
  context?: NoemiaContext;
  clientContext?: ClientContextForAI | null;
};

type ContextBucket = Record<string, unknown>;

type MinimizeNoemiaContextResult = {
  promptContext?: NoemiaContext;
  summary: NoemiaPromptContextSummary;
};

export function minimizeNoemiaContext(
  input: MinimizeNoemiaContextInput
): MinimizeNoemiaContextResult {
  const promptContext: NoemiaContext = {};
  const sections: string[] = [];
  const inputKeys = Object.keys(input.context || {});

  const acquisition = sanitizeAcquisitionContext(input.context?.acquisition);
  if (acquisition) {
    promptContext.acquisition = acquisition;
    sections.push("acquisition");
  }

  const page = sanitizePageContext(input.context);
  if (page) {
    promptContext.page = page;
    sections.push("page");
  }

  const journey = sanitizeJourneyContext(input.context);
  if (journey) {
    promptContext.journey = journey;
    sections.push("journey");
  }

  const relationship = sanitizeClientRelationshipContext(input.clientContext);
  if (relationship) {
    promptContext.relationship = relationship;
    sections.push("relationship");
  }

  const summary: NoemiaPromptContextSummary = {
    domain: input.domain,
    channel: input.channel,
    audience: input.userType,
    sections,
    inputKeys: inputKeys.slice(0, 16),
    hasAcquisitionContext: Boolean(acquisition),
    hasClientContext: Boolean(relationship),
    hasPageContext: Boolean(page),
    hasJourneyContext: Boolean(journey)
  };

  if (sections.length === 0) {
    return {
      summary
    };
  }

  return {
    promptContext,
    summary
  };
}

export function buildPromptContextSections(context?: NoemiaContext) {
  if (!context) {
    return [];
  }

  const sections: string[] = [];

  if (isRecord(context.acquisition)) {
    const acquisitionLines = renderSection("CONTEXTO DE AQUISICAO", context.acquisition, [
      "source",
      "campaign",
      "topic",
      "content_id",
      "language_adaptation",
      "ai_context"
    ]);
    sections.push(...acquisitionLines);
  }

  if (isRecord(context.page)) {
    const pageLines = renderSection("CONTEXTO DE ENTRADA", context.page, [
      "currentPath",
      "pageTitle",
      "articleTitle",
      "articleSlug",
      "ctaLabel",
      "contentId"
    ]);
    sections.push(...pageLines);
  }

  if (isRecord(context.journey)) {
    const journeyLines = renderSection("JORNADA E SINAL OPERACIONAL", context.journey, [
      "source",
      "topic",
      "campaign",
      "timeOnPageSeconds"
    ]);
    sections.push(...journeyLines);
  }

  if (isRecord(context.relationship)) {
    const relationshipLines = renderSection("RELACIONAMENTO ATUAL", context.relationship, [
      "clientType",
      "clientName",
      "pipelineStage",
      "leadTemperature",
      "areaInterest",
      "followUpStatus",
      "sessionStage",
      "sessionIntent",
      "channelLabels",
      "summary"
    ]);
    sections.push(...relationshipLines);
  }

  return sections;
}

function sanitizeAcquisitionContext(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const acquisition = pickContextEntries(value, {
    source: 60,
    campaign: 80,
    topic: 80,
    content_id: 80,
    language_adaptation: 140,
    ai_context: 260
  });

  return Object.keys(acquisition).length > 0 ? acquisition : null;
}

function sanitizePageContext(context?: NoemiaContext) {
  if (!context) {
    return null;
  }

  const page = pickContextEntries(context as ContextBucket, {
    currentPath: 140,
    pageTitle: 120,
    articleTitle: 120,
    articleSlug: 120,
    ctaLabel: 80,
    contentId: 80
  });

  return Object.keys(page).length > 0 ? page : null;
}

function sanitizeJourneyContext(context?: NoemiaContext) {
  if (!context) {
    return null;
  }

  const source = asCleanString((context as ContextBucket).origem, 80);
  const topic = asCleanString((context as ContextBucket).tema, 80);
  const campaign = asCleanString((context as ContextBucket).campanha, 80);
  const timeOnPageSeconds = asSafeNumber((context as ContextBucket).timeOnPageSeconds);

  const journey: ContextBucket = {};

  if (source) {
    journey.source = source;
  }

  if (topic) {
    journey.topic = topic;
  }

  if (campaign) {
    journey.campaign = campaign;
  }

  if (typeof timeOnPageSeconds === "number") {
    journey.timeOnPageSeconds = timeOnPageSeconds;
  }

  return Object.keys(journey).length > 0 ? journey : null;
}

function sanitizeClientRelationshipContext(clientContext?: ClientContextForAI | null) {
  if (!clientContext) {
    return null;
  }

  const relationship: ContextBucket = {
    clientType: clientContext.client.is_client ? "cliente_existente" : "lead"
  };

  const clientName = asCleanString(clientContext.client.full_name, 60);
  if (clientName) {
    relationship.clientName = clientName;
  }

  const pipelineStage = asCleanString(clientContext.pipeline?.stage, 60);
  if (pipelineStage) {
    relationship.pipelineStage = pipelineStage;
  }

  const leadTemperature = asCleanString(clientContext.pipeline?.lead_temperature, 24);
  if (leadTemperature) {
    relationship.leadTemperature = leadTemperature;
  }

  const areaInterest = asCleanString(clientContext.pipeline?.area_interest, 60);
  if (areaInterest) {
    relationship.areaInterest = areaInterest;
  }

  const followUpStatus = asCleanString(clientContext.pipeline?.follow_up_status, 40);
  if (followUpStatus) {
    relationship.followUpStatus = followUpStatus;
  }

  const sessionStage = asCleanString(clientContext.session?.lead_stage, 60);
  if (sessionStage) {
    relationship.sessionStage = sessionStage;
  }

  const sessionIntent = asCleanString(clientContext.session?.current_intent, 60);
  if (sessionIntent) {
    relationship.sessionIntent = sessionIntent;
  }

  const summary = asCleanString(
    clientContext.pipeline?.summary || clientContext.session?.last_summary,
    220
  );
  if (summary) {
    relationship.summary = summary;
  }

  const channelLabels = clientContext.channels
    .slice(0, 3)
    .map((channel) => asCleanString(channel.channel, 32))
    .filter((value): value is string => Boolean(value));
  if (channelLabels.length > 0) {
    relationship.channelLabels = channelLabels;
  }

  return relationship;
}

function renderSection(title: string, source: Record<string, unknown>, preferredKeys: string[]) {
  const lines = [title + ":"];

  for (const key of preferredKeys) {
    const value = source[key];
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      const rendered = value
        .map((item) => asCleanString(item, 40))
        .filter((item): item is string => Boolean(item))
        .join(", ");
      if (rendered) {
        lines.push(`- ${labelForContextKey(key)}: ${rendered}`);
      }
      continue;
    }

    lines.push(`- ${labelForContextKey(key)}: ${String(value)}`);
  }

  return lines.length > 1 ? lines : [];
}

function pickContextEntries(
  source: ContextBucket,
  constraints: Record<string, number>
) {
  const bucket: ContextBucket = {};

  for (const [key, maxLength] of Object.entries(constraints)) {
    const value = asCleanString(source[key], maxLength);

    if (value) {
      bucket[key] = value;
    }
  }

  return bucket;
}

function labelForContextKey(key: string) {
  const labels: Record<string, string> = {
    source: "Origem",
    campaign: "Campanha",
    topic: "Tema",
    content_id: "Conteudo",
    language_adaptation: "Adaptacao de linguagem",
    ai_context: "Contexto editorial",
    currentPath: "Pagina",
    pageTitle: "Titulo da pagina",
    articleTitle: "Titulo do artigo",
    articleSlug: "Slug do artigo",
    ctaLabel: "CTA",
    contentId: "Conteudo",
    timeOnPageSeconds: "Tempo na pagina (s)",
    clientType: "Tipo de relacao",
    clientName: "Nome",
    pipelineStage: "Estagio comercial",
    leadTemperature: "Temperatura",
    areaInterest: "Area de interesse",
    followUpStatus: "Follow-up",
    sessionStage: "Estagio da sessao",
    sessionIntent: "Intencao atual",
    channelLabels: "Canais ativos",
    summary: "Resumo operacional"
  };

  return labels[key] || key;
}

function asCleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();

  if (!compact) {
    return null;
  }

  return compact.slice(0, maxLength);
}

function asSafeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0) {
    return 0;
  }

  return Math.round(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
