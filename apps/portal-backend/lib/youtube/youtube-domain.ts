import {
  normalizeJourneyTaxonomy,
  serializeJourneyTaxonomy,
  type JourneyTaxonomy
} from "../journey/taxonomy.ts";

export type YouTubeAssetKind = "video" | "short";
export type YouTubeCommentSource =
  | "youtube_comment"
  | "youtube_video_comment"
  | "youtube_short_comment";
export type YouTubeCommentIntent =
  | "ignore"
  | "educational"
  | "cta_light"
  | "triage_ready"
  | "schedule_ready"
  | "human_review";
export type YouTubeResponseMode = "read_only" | "suggestion" | "active";

export type YouTubeVideoAsset = {
  channelId: string;
  videoId: string;
  kind: YouTubeAssetKind;
  title: string;
  description: string;
  publishedAt: string;
  canonicalUrl: string;
  legalTopic: string;
  campaign: string;
  campaignFamily: string;
  campaignObjective: string;
  contentStage: string;
};

export type YouTubeCommentInput = {
  commentId: string;
  parentCommentId?: string | null;
  videoId: string;
  channelId: string;
  authorChannelId: string;
  authorDisplayName: string;
  text: string;
  publishedAt: string;
  likeCount?: number | null;
  replyCount?: number | null;
  asset: YouTubeVideoAsset;
};

export type YouTubeCommentClassification = {
  source: YouTubeCommentSource;
  legalTopic: string;
  intent: YouTubeCommentIntent;
  temperature: "cold" | "warm" | "hot" | "urgent";
  urgency: "low" | "medium" | "high";
  conversionPotential: "low" | "medium" | "high";
  shouldReply: boolean;
  shouldRouteToInbox: boolean;
  shouldRouteToCrm: boolean;
  needsHumanReview: boolean;
  suggestedFollowUpTrack: string;
  recommendedAction: string;
  score: number;
  reasons: string[];
};

export type YouTubeGuardrailState = {
  recentRepliesByAuthor: number;
  recentRepliesByVideo: number;
  duplicateDetected: boolean;
  mode: YouTubeResponseMode;
  reviewRequiredByPolicy: boolean;
  maxRepliesPerWindow: number;
  authorCooldownMinutes: number;
  videoCooldownMinutes: number;
};

export type YouTubeGuardrailDecision = {
  shouldSend: boolean;
  shouldQueueReview: boolean;
  status: "blocked" | "review" | "ready";
  reason: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim();
}

function normalizeKey(value: string | null | undefined, fallback = "unknown") {
  const normalized = normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function inferAssetKind(input: {
  kind?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const value = [input.kind, input.title, input.description]
    .map((item) => normalizeText(item).toLowerCase())
    .join(" ");

  return value.includes("#short") || value.includes("short")
    ? ("short" as const)
    : ("video" as const);
}

function inferLegalTopic(text: string) {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("aposent") ||
    normalized.includes("inss") ||
    normalized.includes("beneficio") ||
    normalized.includes("bpc") ||
    normalized.includes("loas")
  ) {
    return "previdenciario";
  }

  if (
    normalized.includes("banco") ||
    normalized.includes("emprest") ||
    normalized.includes("juros") ||
    normalized.includes("desconto") ||
    normalized.includes("cartao")
  ) {
    return "consumidor_bancario";
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
    normalized.includes("dano") ||
    normalized.includes("processo")
  ) {
    return "civil";
  }

  return "geral";
}

function inferContentStage(text: string) {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("como funciona") ||
    normalized.includes("entenda") ||
    normalized.includes("direito") ||
    normalized.includes("guia")
  ) {
    return "awareness";
  }

  if (
    normalized.includes("vale a pena") ||
    normalized.includes("documento") ||
    normalized.includes("prova") ||
    normalized.includes("passo a passo")
  ) {
    return "consideration";
  }

  if (
    normalized.includes("consulta") ||
    normalized.includes("agendar") ||
    normalized.includes("contratar") ||
    normalized.includes("falar com a advogada")
  ) {
    return "decision";
  }

  return "consideration";
}

export function normalizeYouTubeAsset(input: {
  channelId: string;
  videoId: string;
  kind?: string | null;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  legalTopic?: string | null;
  campaign?: string | null;
  campaignFamily?: string | null;
  campaignObjective?: string | null;
  contentStage?: string | null;
}) {
  const title = normalizeText(input.title) || "Video do YouTube";
  const description = normalizeText(input.description);
  const kind = inferAssetKind(input);
  const legalTopic =
    normalizeKey(input.legalTopic, "") || inferLegalTopic(`${title} ${description}`);
  const campaign =
    normalizeKey(input.campaign, "") ||
    (kind === "short" ? "youtube_shorts_organic" : "youtube_videos_organic");

  const asset: YouTubeVideoAsset = {
    channelId: normalizeText(input.channelId),
    videoId: normalizeText(input.videoId),
    kind,
    title,
    description,
    publishedAt: normalizeText(input.publishedAt) || new Date().toISOString(),
    canonicalUrl: `https://www.youtube.com/watch?v=${normalizeText(input.videoId)}`,
    legalTopic,
    campaign,
    campaignFamily: normalizeKey(input.campaignFamily, "") || "youtube_organic",
    campaignObjective:
      normalizeKey(input.campaignObjective, "") || (kind === "short" ? "engagement" : "authority"),
    contentStage:
      normalizeKey(input.contentStage, "") || inferContentStage(`${title} ${description}`)
  };

  return asset;
}

export function inferYouTubeCommentSource(assetKind: YouTubeAssetKind): YouTubeCommentSource {
  return assetKind === "short" ? "youtube_short_comment" : "youtube_video_comment";
}

export function buildYouTubeJourneyTaxonomy(input: {
  asset: YouTubeVideoAsset;
  source?: YouTubeCommentSource;
  conversionSurface?: JourneyTaxonomy["conversionSurface"];
  funnelStage?: JourneyTaxonomy["funnelStage"];
  preferredChannel?: string | null;
}) {
  const source = input.source || inferYouTubeCommentSource(input.asset.kind);
  const medium = input.asset.kind === "short" ? "short_video" : "social_video";
  const entrySurface = input.asset.kind === "short" ? "youtube_short" : "youtube_video";

  return serializeJourneyTaxonomy(
    normalizeJourneyTaxonomy({
      metadata: {
        channel: "youtube",
        source,
        medium,
        campaign: input.asset.campaign,
        campaignFamily: input.asset.campaignFamily,
        campaignObjective: input.asset.campaignObjective,
        theme: input.asset.legalTopic,
        contentFormat: input.asset.kind,
        contentId: input.asset.videoId,
        contentStage: input.asset.contentStage,
        entrySurface,
        conversionSurface: input.conversionSurface || "inbox",
        primaryTouch: source,
        assistedTouches: ["youtube"],
        preferredChannel: input.preferredChannel || "youtube"
      },
      defaults: {
        channel: "youtube",
        legalTopic: input.asset.legalTopic,
        contentFormat: input.asset.kind,
        contentId: input.asset.videoId,
        contentStage: input.asset.contentStage,
        entrySurface,
        conversionSurface: input.conversionSurface || "inbox",
        funnelStage: input.funnelStage || "awareness",
        preferredChannel: input.preferredChannel || "youtube"
      }
    })
  );
}

export function classifyYouTubeComment(input: YouTubeCommentInput): YouTubeCommentClassification {
  const text = normalizeText(input.text).toLowerCase();
  const legalTopic = inferLegalTopic(`${input.text} ${input.asset.title} ${input.asset.description}`);
  const reasons: string[] = [];

  const highIntentSignals = [
    "quero atendimento",
    "quero contratar",
    "como agendar",
    "quero agendar",
    "consulta",
    "posso falar com a advogada",
    "whatsapp",
    "me chama",
    "preciso urgente"
  ];
  const mediumIntentSignals = [
    "me ajuda",
    "como faco",
    "como fazer",
    "isso aconteceu comigo",
    "tenho esse problema",
    "quais documentos",
    "vale a pena entrar"
  ];
  const reviewSignals = [
    "meu numero",
    "me liga",
    "telefone",
    "cpf",
    "rg",
    "email",
    "posso te passar meus dados"
  ];

  const hasHighIntent = highIntentSignals.some((signal) => text.includes(signal));
  const hasMediumIntent = mediumIntentSignals.some((signal) => text.includes(signal));
  const needsHumanReview = reviewSignals.some((signal) => text.includes(signal));
  const isUrgent = text.includes("urgente") || text.includes("hoje") || text.includes("prazo");

  let intent: YouTubeCommentIntent = "ignore";
  let temperature: YouTubeCommentClassification["temperature"] = "cold";
  let urgency: YouTubeCommentClassification["urgency"] = "low";
  let conversionPotential: YouTubeCommentClassification["conversionPotential"] = "low";
  let score = 18;

  if (hasHighIntent || isUrgent) {
    intent = isUrgent ? "human_review" : "schedule_ready";
    temperature = isUrgent ? "urgent" : "hot";
    urgency = isUrgent ? "high" : "medium";
    conversionPotential = "high";
    score = isUrgent ? 92 : 84;
    reasons.push("comentario mostra intencao comercial clara");
  } else if (hasMediumIntent) {
    intent = "triage_ready";
    temperature = "warm";
    urgency = "medium";
    conversionPotential = "medium";
    score = 66;
    reasons.push("comentario pede orientacao concreta e pode entrar em triagem");
  } else if (text.length >= 18) {
    intent = "cta_light";
    temperature = "warm";
    urgency = "low";
    conversionPotential = "medium";
    score = 48;
    reasons.push("comentario permite resposta publica com valor e CTA elegante");
  } else {
    intent = "educational";
    score = 24;
    reasons.push("comentario de baixo contexto, melhor responder com valor curto");
  }

  if (needsHumanReview) {
    intent = "human_review";
    temperature = temperature === "urgent" ? "urgent" : "hot";
    urgency = "high";
    conversionPotential = "high";
    score = Math.max(score, 90);
    reasons.push("comentario cita dados sensiveis ou pede contato direto");
  }

  const shouldReply = ["educational", "cta_light", "triage_ready", "schedule_ready", "human_review"].includes(
    intent
  );
  const shouldRouteToInbox = intent === "triage_ready" || intent === "schedule_ready" || intent === "human_review";
  const shouldRouteToCrm = intent === "schedule_ready" || intent === "human_review";

  return {
    source: inferYouTubeCommentSource(input.asset.kind),
    legalTopic,
    intent,
    temperature,
    urgency,
    conversionPotential,
    shouldReply,
    shouldRouteToInbox,
    shouldRouteToCrm,
    needsHumanReview,
    suggestedFollowUpTrack:
      intent === "schedule_ready"
        ? "appointment_completion"
        : intent === "triage_ready"
          ? "guided_triage"
          : intent === "human_review"
            ? "human_review_priority"
            : "editorial_nurture",
    recommendedAction:
      intent === "human_review"
        ? "send_to_human_review"
        : intent === "schedule_ready"
          ? "reply_with_value_and_direct_next_step"
          : intent === "triage_ready"
            ? "reply_with_value_and_triage_cta"
            : "reply_with_value_only",
    score,
    reasons
  };
}

export function evaluateYouTubeCommentGuardrails(input: {
  classification: YouTubeCommentClassification;
  state: YouTubeGuardrailState;
}) {
  if (!input.classification.shouldReply) {
    return {
      shouldSend: false,
      shouldQueueReview: false,
      status: "blocked" as const,
      reason: "classification_says_ignore"
    };
  }

  if (input.state.duplicateDetected) {
    return {
      shouldSend: false,
      shouldQueueReview: false,
      status: "blocked" as const,
      reason: "duplicate_comment_retry"
    };
  }

  if (input.state.recentRepliesByAuthor >= input.state.maxRepliesPerWindow) {
    return {
      shouldSend: false,
      shouldQueueReview: true,
      status: "review" as const,
      reason: "author_window_limit_reached"
    };
  }

  if (input.state.recentRepliesByVideo >= input.state.maxRepliesPerWindow) {
    return {
      shouldSend: false,
      shouldQueueReview: true,
      status: "review" as const,
      reason: "video_window_limit_reached"
    };
  }

  if (
    input.state.mode === "read_only" ||
    input.state.reviewRequiredByPolicy ||
    input.classification.needsHumanReview
  ) {
    return {
      shouldSend: false,
      shouldQueueReview: true,
      status: "review" as const,
      reason:
        input.state.mode === "read_only"
          ? "read_only_mode"
          : input.classification.needsHumanReview
            ? "human_review_required"
            : "policy_review_required"
    };
  }

  if (input.state.mode === "suggestion") {
    return {
      shouldSend: false,
      shouldQueueReview: true,
      status: "review" as const,
      reason: "suggestion_mode"
    };
  }

  return {
    shouldSend: true,
    shouldQueueReview: false,
    status: "ready" as const,
    reason: "guardrails_passed"
  };
}

export function buildYouTubeReplyDraft(input: {
  asset: YouTubeVideoAsset;
  comment: Pick<YouTubeCommentInput, "text" | "authorDisplayName">;
  classification: YouTubeCommentClassification;
}) {
  const firstName = normalizeText(input.comment.authorDisplayName).split(/\s+/)[0] || "voce";
  const topicLabel =
    input.classification.legalTopic === "consumidor_bancario"
      ? "consumidor bancario"
      : input.classification.legalTopic;

  if (input.classification.intent === "schedule_ready") {
    return `${firstName}, faz sentido olhar isso com cuidado. Pelo que voce comentou, o melhor proximo passo e uma triagem objetiva para entender seu caso e indicar o caminho certo. Se quiser, eu te passo o link da triagem da equipe.`;
  }

  if (input.classification.intent === "triage_ready") {
    return `${firstName}, seu ponto e importante. Em casos de ${topicLabel}, o detalhe do contexto muda bastante a orientacao. Se quiser, eu te envio a triagem certa para organizar isso sem perder tempo.`;
  }

  if (input.classification.intent === "human_review") {
    return `${firstName}, entendi seu comentario. Para te orientar com responsabilidade, esse caso merece revisao humana antes de qualquer encaminhamento publico.`;
  }

  return `${firstName}, esse tema de ${topicLabel} costuma depender muito do contexto e dos documentos certos. A ideia do video foi justamente abrir esse caminho com clareza e sem atalhos arriscados.`;
}
