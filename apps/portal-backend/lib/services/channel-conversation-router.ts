import type { ConversationSession } from "./conversation-persistence";

import { processNoemiaCore } from "../ai/noemia-core";
import {
  channelAutomationFeatures,
  channelCommercialConfig
} from "../config/channel-automation-features";
import { acquisitionContentService } from "./acquisition-content";
import { antiSpamGuard } from "./anti-spam-guard";
import { conversationPersistence } from "./conversation-persistence";
import { instagramCommentContext } from "./instagram-comment-context";
import {
  evaluateConversationPolicy,
  extractConversationStateFromSession
} from "./channel-conversation-policy";
import { triagePersistence, type TriageData } from "./triage-persistence";
import {
  buildInternalTriageSummary,
  buildTriageReport,
  buildUserFacingTriageSummary
} from "./triage-report";

type SupportedChannel = "instagram" | "whatsapp";
type ConversationSource = "instagram_comment" | "instagram_dm" | "whatsapp_inbound";
type MessageDirection = "reply" | "handoff" | "ignored" | "fallback";
type LeadStage = "initial" | "engaged" | "triage" | "qualified" | "handoff";
type TriageStatus = "not_started" | "in_progress" | "qualified" | "handoff";

export type ChannelConversationEvent = {
  channel: SupportedChannel;
  source: ConversationSource;
  externalUserId: string;
  messageText: string;
  externalMessageId?: string;
  externalEventId?: string;
  messageType?: string;
  isEcho?: boolean;
  timestamp?: string | number;
  commentContext?: {
    commentId: string;
    mediaId: string;
    commentText: string;
    username?: string;
  };
};

type RouterTransport = {
  sendText: (
    recipientId: string,
    messageText: string,
    context?: {
      channel: SupportedChannel;
      eventId: string;
      externalUserId: string;
      sessionId?: string | null;
      pipelineId?: string | null;
      messageType?: string | null;
      responseType?: string | null;
      responseLength?: number | null;
      reason?: string | null;
    }
  ) => Promise<boolean>;
  markAsRead?: (messageId: string) => Promise<boolean>;
  sendTypingIndicator?: (recipientId: string) => Promise<boolean>;
};

type RouterDecision = {
  direction: MessageDirection;
  sessionId: string | null;
  eventId: string;
  usedFallback: boolean;
  handoffTriggered: boolean;
  replySent: boolean;
  detectedTheme: string;
  currentIntent: string;
  leadStage: LeadStage;
  triageStatus: TriageStatus;
  materialUrl?: string;
  handoffReason?: string;
  followUpState?: FollowUpState;
  conversionSignal?: ConversionSignal;
  nextBestAction?: NextBestAction;
  logs: Record<string, unknown>;
};

type MaterialRecommendation = {
  theme: string;
  title: string;
  url: string;
  sendNow: boolean;
};

type ConversionSignal =
  | "none"
  | "curiosity"
  | "material_interest"
  | "triage_progress"
  | "consultation_intent"
  | "human_handoff";

type FollowUpState =
  | "awaiting_initial_reply"
  | "material_sent"
  | "triage_incomplete"
  | "warm_lead"
  | "qualified_waiting_reply"
  | "human_handoff_pending"
  | "closed";

type NextBestAction =
  | "answer_and_ask_one_question"
  | "send_material_and_continue"
  | "continue_triage"
  | "handoff_to_whatsapp"
  | "await_human"
  | "close";

type PriorityIntentDecision = {
  consultationIntentDetected: boolean;
  addressRequestDetected: boolean;
  whatsappHandoffRecommended: boolean;
  handoffReason?: string;
  replyOverride?: string;
  nextBestAction: NextBestAction;
  conversionSignal: ConversionSignal;
};

function logRouterEvent(
  event: string,
  data: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      data
    })
  );
}

function extractPipelineId(session: ConversationSession | null | undefined) {
  const rawPipelineId = session?.metadata?.pipelineId ?? session?.metadata?.pipeline_id;

  return typeof rawPipelineId === "string" && rawPipelineId.trim().length > 0
    ? rawPipelineId
    : null;
}

function buildRouterLogContext(args: {
  event: ChannelConversationEvent;
  eventId: string;
  session?: ConversationSession | null;
  messageType?: string | null;
  pipelineId?: string | null;
  reason?: string | null;
  responseLength?: number | null;
  responseType?: string | null;
  errorCode?: string | number | null;
  errorStatus?: number | null;
  extra?: Record<string, unknown>;
}) {
  const pipelineId = args.pipelineId ?? extractPipelineId(args.session);

  return {
    channel: args.event.channel,
    source: args.event.source,
    externalUserId: args.event.externalUserId,
    externalMessageId: args.event.externalMessageId || null,
    eventId: args.eventId,
    sessionId: args.session?.id || null,
    pipelineId,
    messageType: args.messageType ?? normalizeMessageType(args.event.messageType),
    responseType: args.responseType ?? null,
    responseLength: args.responseLength ?? null,
    reason: args.reason ?? null,
    errorCode: args.errorCode ?? null,
    errorStatus: args.errorStatus ?? null,
    ...(args.extra ?? {})
  };
}

function normalizeMessageType(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value : "text";
}

function normalizeText(value: string | undefined | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildDeterministicEventId(event: ChannelConversationEvent) {
  const explicitId = normalizeText(event.externalEventId);
  if (explicitId) {
    return explicitId;
  }

  const messageId = normalizeText(event.externalMessageId);
  if (messageId) {
    return messageId;
  }

  if (event.source === "instagram_comment" && event.commentContext?.commentId) {
    return `instagram_comment:${event.commentContext.commentId}`;
  }

  return `${event.channel}:${event.source}:${event.externalUserId}:${normalizeText(event.messageText)}`;
}

function detectThemeFromText(messageText: string) {
  const normalizedMessage = messageText.toLowerCase();

  if (
    normalizedMessage.includes("aposent") ||
    normalizedMessage.includes("inss") ||
    normalizedMessage.includes("beneficio") ||
    normalizedMessage.includes("benefício") ||
    normalizedMessage.includes("loas") ||
    normalizedMessage.includes("bpc")
  ) {
    return "previdenciario";
  }

  if (
    normalizedMessage.includes("banco") ||
    normalizedMessage.includes("desconto") ||
    normalizedMessage.includes("juros") ||
    normalizedMessage.includes("emprest") ||
    normalizedMessage.includes("cartao") ||
    normalizedMessage.includes("cartão")
  ) {
    return "bancario";
  }

  if (
    normalizedMessage.includes("divor") ||
    normalizedMessage.includes("pens") ||
    normalizedMessage.includes("guarda") ||
    normalizedMessage.includes("famil")
  ) {
    return "familia";
  }

  if (
    normalizedMessage.includes("contrato") ||
    normalizedMessage.includes("indeniza") ||
    normalizedMessage.includes("dano")
  ) {
    return "civil";
  }

  return "geral";
}

function inferLeadStage(
  session: ConversationSession,
  messageText: string,
  handoffTriggered: boolean
): LeadStage {
  if (handoffTriggered) {
    return "handoff";
  }

  const normalizedMessage = messageText.toLowerCase();

  if (
    normalizedMessage.includes("quero contratar") ||
    normalizedMessage.includes("agendar") ||
    normalizedMessage.includes("consulta") ||
    normalizedMessage.includes("advogada")
  ) {
    return "qualified";
  }

  if (
    normalizedMessage.includes("meu caso") ||
    normalizedMessage.includes("aconteceu") ||
    normalizedMessage.includes("preciso resolver") ||
    normalizedMessage.includes("problema")
  ) {
    return "triage";
  }

  return (session.lead_stage as LeadStage | undefined) || "engaged";
}

function inferTriageStatus(leadStage: LeadStage, handoffTriggered: boolean): TriageStatus {
  if (handoffTriggered) {
    return "handoff";
  }

  if (leadStage === "qualified") {
    return "qualified";
  }

  if (leadStage === "triage" || leadStage === "engaged") {
    return "in_progress";
  }

  return "not_started";
}

function shouldUseUnsupportedFallback(event: ChannelConversationEvent) {
  if (event.source === "instagram_comment") {
    return false;
  }

  return normalizeMessageType(event.messageType) !== "text";
}

function buildUnsupportedFallback(channel: SupportedChannel) {
  if (channel === "instagram") {
    return "No momento, este atendimento funciona melhor por mensagem escrita. Me conta por texto, em uma frase, o principal problema que voce quer resolver.";
  }

  return "No momento, este atendimento funciona melhor por mensagem escrita. Me conta por texto, em uma frase, o principal problema que voce quer resolver.";
}

function buildSafeFallbackReply() {
  return "Tive uma falha temporaria para continuar daqui sem assumir algo errado. Pode reformular em uma frase curta o principal problema que voce quer resolver?";
}

function buildHandoffReply(reason: string) {
  return `Entendi. Vou encaminhar seu atendimento para a advogada humana com prioridade, sem perder o contexto da conversa. Motivo registrado: ${reason}.`;
}

function buildWhatsappHandoffReply(reason: string) {
  const phone = channelCommercialConfig.consultationWhatsappNumber;

  if (reason === "address_request_with_consult_intent") {
    return `Os detalhes do local e do endereco da consulta sao alinhados diretamente com a advogada no momento do agendamento, para te orientar da forma correta conforme o seu atendimento. Para seguir com isso agora, o ideal e continuar pelo WhatsApp ${phone}. Por la, a continuidade do atendimento e o agendamento sao feitos diretamente.`;
  }

  return `Perfeito. Para dar continuidade e alinhar seu atendimento diretamente com a advogada, o ideal e seguir pelo WhatsApp ${phone}. Por la, voces conseguem organizar o atendimento da forma correta.`;
}

function detectConsultationIntent(messageText: string) {
  const normalizedMessage = messageText.toLowerCase();
  return (
    normalizedMessage.includes("quero marcar consulta") ||
    normalizedMessage.includes("como agendo") ||
    normalizedMessage.includes("como agendar") ||
    normalizedMessage.includes("quero falar com a advogada") ||
    normalizedMessage.includes("me passa o whatsapp") ||
    normalizedMessage.includes("quero atendimento") ||
    normalizedMessage.includes("quero dar entrada") ||
    normalizedMessage.includes("quero seguir com isso") ||
    normalizedMessage.includes("quero ver minha situacao com ela") ||
    normalizedMessage.includes("quero ver minha situação com ela") ||
    normalizedMessage.includes("consulta") ||
    normalizedMessage.includes("agendamento")
  );
}

function detectAddressRequest(messageText: string) {
  const normalizedMessage = messageText.toLowerCase();
  return (
    normalizedMessage.includes("onde fica") ||
    normalizedMessage.includes("qual e o endereco") ||
    normalizedMessage.includes("qual é o endereço") ||
    normalizedMessage.includes("onde e o escritorio") ||
    normalizedMessage.includes("onde é o escritório") ||
    normalizedMessage.includes("onde atende") ||
    normalizedMessage.includes("qual local da consulta") ||
    normalizedMessage.includes("endereco") ||
    normalizedMessage.includes("endereço") ||
    normalizedMessage.includes("local da consulta")
  );
}

function buildPriorityIntentDecision(messageText: string): PriorityIntentDecision {
  const consultationIntentDetected = detectConsultationIntent(messageText);
  const addressRequestDetected = detectAddressRequest(messageText);
  const whatsappHandoffRecommended = false;

  if (consultationIntentDetected || addressRequestDetected) {
    return {
      consultationIntentDetected,
      addressRequestDetected,
      whatsappHandoffRecommended,
      handoffReason: consultationIntentDetected ? "consultation_requested" : "address_requested",
      nextBestAction: "continue_triage",
      conversionSignal: "consultation_intent"
    };
  }

  return {
    consultationIntentDetected,
    addressRequestDetected,
    whatsappHandoffRecommended: false,
    nextBestAction: "answer_and_ask_one_question",
    conversionSignal: "none"
  };
}

function detectNeedForHumanHandoff(
  messageText: string,
  recentMessages: Array<{ role: "user" | "assistant"; content: string; metadata?: Record<string, unknown> }>,
  session: ConversationSession,
  detectedTheme: string,
  priorityIntentDecision: PriorityIntentDecision
) {
  const normalizedMessage = messageText.toLowerCase();
  const reasons: string[] = [];

  if (priorityIntentDecision.handoffReason) {
    reasons.push(priorityIntentDecision.handoffReason);
  }

  if (
    normalizedMessage.includes("urgente") ||
    normalizedMessage.includes("agora") ||
    normalizedMessage.includes("hoje") ||
    normalizedMessage.includes("emergencia") ||
    normalizedMessage.includes("emergência")
  ) {
    reasons.push("urgencia_alta");
  }

  if (
    normalizedMessage.includes("advogada") ||
    normalizedMessage.includes("humano") ||
    normalizedMessage.includes("sua mae") ||
    normalizedMessage.includes("sua mãe") ||
    normalizedMessage.includes("quero falar com alguem") ||
    normalizedMessage.includes("quero falar com alguém")
  ) {
    reasons.push("pedido_explicito_de_humano");
  }

  if (
    normalizedMessage.includes("quero contratar") ||
    normalizedMessage.includes("fechar contrato") ||
    normalizedMessage.includes("quanto custa") ||
    normalizedMessage.includes("quero agendar") ||
    normalizedMessage.includes("consulta")
  ) {
    reasons.push("intencao_clara_de_contratacao");
  }

  if (
    normalizedMessage.includes("nao entendeu") ||
    normalizedMessage.includes("não entendeu") ||
    normalizedMessage.includes("voce nao ajuda") ||
    normalizedMessage.includes("você não ajuda") ||
    normalizedMessage.includes("isso nao respondeu") ||
    normalizedMessage.includes("isso não respondeu")
  ) {
    reasons.push("falha_de_entendimento");
  }

  if (
    normalizedMessage.includes("prisao") ||
    normalizedMessage.includes("prisão") ||
    normalizedMessage.includes("bloquearam minha conta") ||
    normalizedMessage.includes("violencia") ||
    normalizedMessage.includes("violência") ||
    normalizedMessage.includes("ameaça") ||
    normalizedMessage.includes("ameaça")
  ) {
    reasons.push("situacao_sensivel_ou_complexa");
  }

  if (detectedTheme === "bancario" && normalizedMessage.includes("descontando")) {
    reasons.push("caso_bancario_com_prejuizo_ativo");
  }

  const recentFallbacks = recentMessages.filter((message) => {
    if (message.role !== "assistant") {
      return false;
    }

    const source = message.metadata?.source;
    return source === "fallback" || source === "triage";
  }).length;

  if (recentFallbacks >= 1 && reasons.includes("falha_de_entendimento")) {
    reasons.push("falha_repetida_de_compreensao");
  }

  if (session.handoff_to_human) {
    reasons.push("handoff_ja_ativo");
  }

  return {
    shouldHandoff: reasons.length > 0,
    reason: reasons[0] || ""
  };
}

function selectRecommendedMaterial(
  event: ChannelConversationEvent,
  detectedTheme: string,
  session: ConversationSession
): MaterialRecommendation | null {
  if (!channelAutomationFeatures.unifiedMaterialRouting) {
    return null;
  }

  const trigger = acquisitionContentService.detectTriggers(event.messageText, event.channel)[0];
  const theme = trigger?.theme || (detectedTheme as Parameters<typeof materialLinkByTheme>[0]);
  const link = materialLinkByTheme(theme);

  if (!link) {
    return null;
  }

  const normalizedMessage = event.messageText.toLowerCase();
  const askedForMaterial =
    normalizedMessage.includes("link") ||
    normalizedMessage.includes("guia") ||
    normalizedMessage.includes("material") ||
    normalizedMessage.includes("passo a passo") ||
    normalizedMessage.includes("documento") ||
    event.source === "instagram_comment";

  const lastMaterialUrl =
    typeof session.metadata?.last_material_url === "string"
      ? session.metadata.last_material_url
      : "";

  if (!askedForMaterial || lastMaterialUrl === link.url) {
    return null;
  }

  return {
    theme,
    title: link.title,
    url: link.url,
    sendNow: true
  };
}

function materialLinkByTheme(theme: string) {
  const normalizedTheme = theme.toLowerCase();
  const links: Record<string, { title: string; url: string }> = {
    previdenciario: {
      title: "Guia de aposentadoria",
      url: "https://advnoemiapaixao.com.br/triagem.html?origem=instagram-previdenciario"
    },
    bancario: {
      title: "Orientacao inicial sobre descontos e banco",
      url: "https://advnoemiapaixao.com.br/triagem.html?origem=instagram-bancario"
    },
    familia: {
      title: "Orientacao inicial sobre familia",
      url: "https://advnoemiapaixao.com.br/triagem.html?origem=instagram-familia"
    },
    civil: {
      title: "Orientacao inicial sobre direito civil",
      url: "https://advnoemiapaixao.com.br/triagem.html?origem=instagram-civil"
    },
    geral: {
      title: "Triagem inicial do escritorio",
      url: "https://advnoemiapaixao.com.br/triagem.html?origem=atendimento-canais"
    }
  };

  return links[normalizedTheme] || links.geral;
}

function appendMaterialToReply(reply: string, material: MaterialRecommendation | null) {
  if (!material || !material.sendNow) {
    return reply;
  }

  return `${reply}\n\nSeparei um material que pode te ajudar justamente nesse ponto: ${material.url}\n\nSe fizer sentido, me diz o que mais pesa hoje na sua situacao para eu te orientar no proximo passo.`;
}

function inferFollowUpState(
  leadStage: LeadStage,
  handoffTriggered: boolean,
  materialSent: boolean,
  consultationIntentDetected: boolean
): FollowUpState {
  if (handoffTriggered) {
    return "human_handoff_pending";
  }

  if (consultationIntentDetected || leadStage === "qualified") {
    return "qualified_waiting_reply";
  }

  if (materialSent) {
    return "material_sent";
  }

  if (leadStage === "triage") {
    return "triage_incomplete";
  }

  if (leadStage === "engaged") {
    return "warm_lead";
  }

  return "awaiting_initial_reply";
}

function buildSessionSummaryPayload(args: {
  detectedTheme: string;
  leadStage: LeadStage;
  triageStatus: TriageStatus;
  followUpState: FollowUpState;
  conversionSignal: ConversionSignal;
  nextBestAction: NextBestAction;
  materialSent: boolean;
  handoffTriggered: boolean;
  handoffReason?: string;
  conversationState?: string;
  consultationStage?: string;
}) {
  return [
    `theme=${args.detectedTheme}`,
    `leadStage=${args.leadStage}`,
    `triageStatus=${args.triageStatus}`,
    `conversationState=${args.conversationState || "ai_active"}`,
    `consultationStage=${args.consultationStage || "not_offered"}`,
    `followUpState=${args.followUpState}`,
    `conversionSignal=${args.conversionSignal}`,
    `nextBestAction=${args.nextBestAction}`,
    `materialSent=${args.materialSent ? "yes" : "no"}`,
    `handoffTriggered=${args.handoffTriggered ? "yes" : "no"}`,
    `handoffReason=${args.handoffReason || "none"}`
  ].join(" | ");
}

function extractTriageData(
  messageText: string,
  detectedTheme: string,
  leadStage: LeadStage,
  handoffReason?: string
): TriageData {
  const normalizedMessage = messageText.toLowerCase();

  return {
    area: detectedTheme,
    problema_principal: messageText,
    timeframe:
      normalizedMessage.includes("hoje") || normalizedMessage.includes("agora")
        ? "imediato"
        : normalizedMessage.includes("mes")
          ? "meses"
          : normalizedMessage.includes("ano")
            ? "anos"
            : undefined,
    acontecendo_agora:
      normalizedMessage.includes("agora") ||
      normalizedMessage.includes("ainda") ||
      normalizedMessage.includes("continuando"),
    objetivo_cliente:
      leadStage === "qualified" || handoffReason
        ? "atendimento_humano"
        : "orientacao_inicial",
    nivel_urgencia:
      normalizedMessage.includes("urgente") || normalizedMessage.includes("agora")
        ? "alta"
        : leadStage === "qualified"
          ? "media"
          : "baixa",
    prejuizo_ativo:
      normalizedMessage.includes("desconto") ||
      normalizedMessage.includes("bloque") ||
      normalizedMessage.includes("preju"),
    palavras_chave: messageText
      .split(/\s+/)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 3)
      .slice(0, 8),
    completude: leadStage === "qualified" ? 80 : leadStage === "triage" ? 55 : 25
  };
}

async function saveTriageAndHandoff(
  session: ConversationSession,
  event: ChannelConversationEvent,
  detectedTheme: string,
  leadStage: LeadStage,
  handoffReason?: string,
  conversationState?: {
    collectedData?: any;
    triageCompleteness?: number;
    conversationStatus?: string;
    triageStage?: string;
    consultationStage?: string;
    contactPreferences?: {
      channel?: string;
      period?: string;
      urgency?: string;
      availability?: string;
    };
    lawyerNotificationGenerated?: boolean;
  } | null,
  conversationPolicy?: {
    state: string;
    triageStage: string;
    explanationStage: string;
    consultationStage: string;
    handoffStatus: string;
    handoffAllowed: boolean;
    handoffBlocked: boolean;
    handoffReason: string | null;
    handoffReasonCode: string | null;
    legitimateHandoff: boolean;
    schedulingComplete: boolean;
    readyForLawyer: boolean;
    aiActiveOnChannel: boolean;
    operationalHandoffRecorded: boolean;
    lawyerNotificationGenerated: boolean;
    humanFollowUpPending: boolean;
    followUpReady: boolean;
  },
  pipelineId?: string | null,
  nextBestAction?: string
) {
  try {
    const report = buildTriageReport({
      channel: event.channel,
      source: event.source,
      sessionId: session.id,
      pipelineId: pipelineId || null,
      messageText: event.messageText,
      detectedTheme,
      leadStage,
      nextBestAction: nextBestAction || null,
      handoffReason: conversationPolicy?.handoffReason || handoffReason || null,
      handoffReasonCode: conversationPolicy?.handoffReasonCode || null,
      conversationState: conversationState || null,
      conversationPolicy: conversationPolicy || null,
      schedulingPreferences: conversationState?.contactPreferences || null
    });

    const triageData = {
      ...extractTriageData(event.messageText, detectedTheme, leadStage, handoffReason),
      conversation_status: conversationPolicy?.state || conversationState?.conversationStatus,
      triage_stage: conversationPolicy?.triageStage || conversationState?.triageStage,
      explanation_stage: conversationPolicy?.explanationStage,
      consultation_stage: conversationPolicy?.consultationStage || conversationState?.consultationStage,
      scheduling_preferences: conversationState?.contactPreferences,
      ai_activity: {
        channel_active: conversationPolicy?.aiActiveOnChannel ?? true,
        operational_handoff_recorded: conversationPolicy?.operationalHandoffRecorded ?? false,
        human_followup_pending: conversationPolicy?.humanFollowUpPending ?? false,
        follow_up_ready: conversationPolicy?.followUpReady ?? false,
        lawyer_notification_generated:
          conversationPolicy?.lawyerNotificationGenerated ??
          conversationState?.lawyerNotificationGenerated ??
          false
      },
      handoff_policy: {
        status: conversationPolicy?.handoffStatus || undefined,
        allowed: conversationPolicy?.handoffAllowed || false,
        blocked: conversationPolicy?.handoffBlocked || false,
        reason: conversationPolicy?.handoffReason || handoffReason || null,
        reason_code: conversationPolicy?.handoffReasonCode || null,
        legitimate: conversationPolicy?.legitimateHandoff || false,
        recorded: conversationPolicy?.operationalHandoffRecorded || false
      },
      report
    } satisfies TriageData;

    await triagePersistence.saveTriageData(session.id, triageData, {
      channel: event.channel,
      userId: event.externalUserId,
      isHotLead: leadStage === "qualified" || Boolean(conversationPolicy?.readyForLawyer),
      needsHumanAttention: Boolean(
        conversationPolicy?.handoffAllowed || conversationPolicy?.humanFollowUpPending
      ),
      handoffReason,
      internalSummary: buildInternalTriageSummary({
        channel: event.channel,
        source: event.source,
        sessionId: session.id,
        pipelineId: pipelineId || null,
        messageText: event.messageText,
        detectedTheme,
        leadStage,
        nextBestAction: nextBestAction || null,
        handoffReason: conversationPolicy?.handoffReason || handoffReason || null,
        handoffReasonCode: conversationPolicy?.handoffReasonCode || null,
        conversationState: conversationState || null,
        conversationPolicy: conversationPolicy || null,
        schedulingPreferences: conversationState?.contactPreferences || null
      }),
      userFriendlySummary: buildUserFacingTriageSummary({
        channel: event.channel,
        source: event.source,
        sessionId: session.id,
        pipelineId: pipelineId || null,
        messageText: event.messageText,
        detectedTheme,
        leadStage,
        nextBestAction: nextBestAction || null,
        handoffReason: conversationPolicy?.handoffReason || handoffReason || null,
        handoffReasonCode: conversationPolicy?.handoffReasonCode || null,
        conversationState: conversationState || null,
        conversationPolicy: conversationPolicy || null,
        schedulingPreferences: conversationState?.contactPreferences || null
      }),
      conversationStatus: conversationPolicy?.state,
      explanationStage: conversationPolicy?.explanationStage,
      consultationStage: conversationPolicy?.consultationStage,
      reportData: triageData.report,
      lawyerNotificationGenerated:
        conversationPolicy?.lawyerNotificationGenerated ??
        conversationState?.lawyerNotificationGenerated,
      aiActiveOnChannel: conversationPolicy?.aiActiveOnChannel,
      operationalHandoffRecorded: conversationPolicy?.operationalHandoffRecorded,
      humanFollowUpPending: conversationPolicy?.humanFollowUpPending,
      followUpReady: conversationPolicy?.followUpReady
    });

    logRouterEvent("TRIAGE_REPORT_SAVED", {
      sessionId: session.id,
      channel: event.channel,
      source: event.source,
      pipelineId: pipelineId || null,
      eventId: event.externalEventId || event.externalMessageId || null,
      reason: conversationPolicy?.state || "triage_saved",
      schedulingComplete: conversationPolicy?.schedulingComplete || false,
      lawyerNotificationGenerated: conversationState?.lawyerNotificationGenerated || false
    });
  } catch (error) {
    logRouterEvent(
      "CHANNEL_ROUTER_TRIAGE_PERSISTENCE_ERROR",
      {
        sessionId: session.id,
        channel: event.channel,
        source: event.source,
        error: error instanceof Error ? error.message : String(error)
      },
      "warn"
    );
  }
}

async function safeSaveMessage(
  sessionId: string,
  externalMessageId: string | undefined,
  role: "user" | "assistant" | "system",
  content: string,
  direction: "inbound" | "outbound",
  metadata?: Record<string, unknown>
) {
  try {
    await conversationPersistence.saveMessage(
      sessionId,
      externalMessageId,
      role,
      content,
      direction,
      metadata
    );
    return true;
  } catch (error) {
    logRouterEvent(
      "CHANNEL_ROUTER_SAVE_MESSAGE_ERROR",
      {
        sessionId,
        role,
        direction,
        error: error instanceof Error ? error.message : String(error)
      },
      "warn"
    );
    return false;
  }
}

async function safeUpdateSession(
  sessionId: string,
  updates: Partial<Omit<ConversationSession, "id" | "created_at" | "updated_at">>
) {
  try {
    await conversationPersistence.updateSession(sessionId, updates);
    return true;
  } catch (error) {
    logRouterEvent(
      "CHANNEL_ROUTER_UPDATE_SESSION_ERROR",
      {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      },
      "warn"
    );
    return false;
  }
}

export async function processChannelConversationEvent(
  event: ChannelConversationEvent,
  transport: RouterTransport
): Promise<RouterDecision> {
  const eventId = buildDeterministicEventId(event);
  const messageType = normalizeMessageType(event.messageType);

  logRouterEvent("CHANNEL_ROUTER_START", {
    channel: event.channel,
    source: event.source,
    eventId,
    externalMessageId: event.externalMessageId || null,
    externalUserId: event.externalUserId,
    messageType
  });
  try {
    if (!channelAutomationFeatures.unifiedConversationRouter) {
      logRouterEvent(
        "CHANNEL_ROUTER_EARLY_RETURN",
        buildRouterLogContext({
          event,
          eventId,
          messageType,
          reason: "router_disabled"
        }),
        "warn"
      );

      return {
        direction: "ignored",
        sessionId: null,
        eventId,
        usedFallback: false,
        handoffTriggered: false,
        replySent: false,
        detectedTheme: "geral",
        currentIntent: "router_disabled",
        leadStage: "initial",
        triageStatus: "not_started",
        logs: {
          reason: "router_disabled"
        }
      };
    }

    if (shouldUseUnsupportedFallback(event)) {
      const unsupportedReply = buildUnsupportedFallback(event.channel);

      logRouterEvent(
        "CHANNEL_ROUTER_EARLY_RETURN",
        buildRouterLogContext({
          event,
          eventId,
          messageType,
          reason: "unsupported_message",
          responseType: "text",
          responseLength: unsupportedReply.length
        }),
        "warn"
      );

      const sent = await transport.sendText(event.externalUserId, unsupportedReply, {
        channel: event.channel,
        eventId,
        externalUserId: event.externalUserId,
        sessionId: null,
        pipelineId: null,
        messageType,
        responseType: "text",
        responseLength: unsupportedReply.length,
        reason: "unsupported_message"
      });

      if (sent) {
        await antiSpamGuard.markEventProcessed({
          channel: event.channel,
          externalEventId: eventId,
          externalMessageId: event.externalMessageId,
          externalUserId: event.externalUserId,
          messageText: event.messageText,
          messageType
        });
      } else {
        logRouterEvent(
          "CHANNEL_ROUTER_RESPONSE_SKIPPED",
          buildRouterLogContext({
            event,
            eventId,
            messageType,
            reason: "unsupported_message_send_failed",
            responseType: "text",
            responseLength: unsupportedReply.length
          }),
          "warn"
        );
      }

      return {
        direction: "fallback",
        sessionId: null,
        eventId,
        usedFallback: true,
        handoffTriggered: false,
        replySent: sent,
        detectedTheme: "geral",
        currentIntent: "unsupported_message",
        leadStage: "initial",
        triageStatus: "not_started",
        logs: {
          reason: "unsupported_message",
          messageType
        }
      };
    }

    const guardResult = await antiSpamGuard.shouldRespondToEvent({
      channel: event.channel,
      externalEventId: eventId,
      externalMessageId: event.externalMessageId,
      externalUserId: event.externalUserId,
      messageText: event.messageText,
      isEcho: event.isEcho,
      messageType
    });

    if (!guardResult.shouldRespond) {
      logRouterEvent(
        "CHANNEL_ROUTER_EARLY_RETURN",
        buildRouterLogContext({
          event,
          eventId,
          messageType,
          reason: guardResult.reason || "guard_blocked"
        }),
        "info"
      );

      return {
        direction: "ignored",
        sessionId: null,
        eventId,
        usedFallback: false,
        handoffTriggered: false,
        replySent: false,
        detectedTheme: "geral",
        currentIntent: "guard_blocked",
        leadStage: "initial",
        triageStatus: "not_started",
        logs: {
          reason: guardResult.reason || "guard_blocked"
        }
      };
    }

    if (event.externalMessageId && transport.markAsRead) {
      await transport.markAsRead(event.externalMessageId);
    }

    if (transport.sendTypingIndicator && event.source !== "instagram_comment") {
      await transport.sendTypingIndicator(event.externalUserId);
    }

    let session = await conversationPersistence.getOrCreateSession(event.channel, event.externalUserId);
    const isCommentSource = event.source === "instagram_comment" && !!event.commentContext;
    let sessionConversationState = extractConversationStateFromSession(session);
    let initialConversationPolicy = evaluateConversationPolicy({
      channel: event.channel,
      session,
      conversationState: sessionConversationState,
      messageText: event.messageText
    });

    if (initialConversationPolicy.sessionNeedsNormalization) {
      const normalizedMetadata = {
        ...(session.metadata || {}),
        ...(initialConversationPolicy.metadata || {}),
        handoff_already_active: false,
        ai_active_on_channel: true,
        last_handoff_reason: null,
        session_state_normalized_at: new Date().toISOString(),
        session_state_normalized_reason: initialConversationPolicy.normalizationReason
      };

      await safeUpdateSession(session.id, {
        handoff_to_human: false,
        metadata: normalizedMetadata
      });

      session = {
        ...session,
        handoff_to_human: false,
        metadata: normalizedMetadata
      };
      sessionConversationState = extractConversationStateFromSession(session);
      initialConversationPolicy = evaluateConversationPolicy({
        channel: event.channel,
        session,
        conversationState: sessionConversationState,
        messageText: event.messageText
      });

      logRouterEvent(
        "SESSION_STATE_NORMALIZED",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          reason: initialConversationPolicy.normalizationReason || "residual_handoff_state",
          extra: {
            oldState: "handoff_active",
            newState: initialConversationPolicy.state,
            handoffBlocked: true
          }
        }),
        "warn"
      );
    }

    const handoffAlreadyActive = Boolean(session.handoff_to_human);
    let pipelineId = extractPipelineId(session);

    if (handoffAlreadyActive && initialConversationPolicy.legitimateHandoff) {
      logRouterEvent(
        "POST_HANDOFF_MESSAGE_RECEIVED",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          pipelineId,
          reason: "handoff_active"
        })
      );
      logRouterEvent(
        "AI_CONTINUES_AFTER_HANDOFF",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          pipelineId,
          reason: "channel_remains_ai_active"
        })
      );
    }

  if (isCommentSource) {
    const commentContext = event.commentContext!;

    session = await instagramCommentContext.createSessionWithCommentContext(event.externalUserId, {
      source: "instagram_comment",
      media_id: commentContext.mediaId,
      keyword: detectThemeFromText(commentContext.commentText),
      theme: detectThemeFromText(commentContext.commentText),
      area: detectThemeFromText(commentContext.commentText),
      campaign_id: "unified_router_comment",
      comment_id: commentContext.commentId,
      comment_text: commentContext.commentText,
      detected_topic: detectThemeFromText(commentContext.commentText),
      detected_keywords: commentContext.commentText
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean)
      .slice(0, 5),
      priority: "medium",
      intent_level: "medium",
      confidence: 0.7
    });
    pipelineId = extractPipelineId(session);
  } else {
    await safeSaveMessage(session.id, event.externalMessageId, "user", event.messageText, "inbound", {
      channel: event.channel,
      source: event.source,
      eventId,
      externalUserId: event.externalUserId,
      externalMessageId: event.externalMessageId,
      messageType
    });
  }

    logRouterEvent(
      "CHANNEL_ROUTER_PRE_CONTEXT",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        extra: {
          handoffAlreadyActive,
          isCommentSource
        }
      })
    );

  const recentMessages = await conversationPersistence.getRecentMessages(session.id, 12);
  const history = recentMessages
    .reverse()
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content
    }));

  const conversationSummary = await conversationPersistence.generateConversationSummary(
    session.id,
    recentMessages
  );

  const priorityIntentDecision = buildPriorityIntentDecision(event.messageText);
  const baseTheme = isCommentSource
    ? detectThemeFromText(event.commentContext?.commentText || event.messageText)
    : detectThemeFromText(event.messageText);

  const materialRecommendation = selectRecommendedMaterial(event, baseTheme, session);
  const baseContext = {
    router: {
      channel: event.channel,
      source: event.source,
      eventId,
      messageId: event.externalMessageId || null,
      sessionId: session.id,
      commentId: event.commentContext?.commentId || null
    },
    conversationPolicy: {
      order:
        "reconhecer o que a pessoa disse -> responder minimamente o tema -> mostrar utilidade -> conduzir para a proxima etapa -> fazer apenas uma pergunta essencial -> enviar material so quando fizer sentido -> aproximar de triagem ou handoff",
      style: [
        "acolhedora",
        "clara",
        "segura",
        "elegante",
        "objetiva",
        "uma_pergunta_por_vez"
      ],
      donts: [
        "nao soar fria",
        "nao despejar links cedo demais",
        "nao parecer script barato",
        "nao fazer triagem interrogatoria",
        "nao usar juridiques sem necessidade"
      ]
    },
    channel: event.channel,
    origin: event.source,
    originalComment: event.commentContext
      ? {
          id: event.commentContext.commentId,
          text: event.commentContext.commentText,
          mediaId: event.commentContext.mediaId
        }
      : null,
    currentMessage: event.messageText,
    historySummary: conversationSummary,
    funnelStage: session.lead_stage || "initial",
    triageStatus: session.current_intent || "unknown",
    handoffStatus: session.handoff_to_human ? "active" : "available",
    recommendedMaterial: materialRecommendation,
    commercialRouting: {
      consultationWhatsappNumber: channelCommercialConfig.consultationWhatsappNumber,
      consultationIntentDetected: priorityIntentDecision.consultationIntentDetected,
      addressRequestDetected: priorityIntentDecision.addressRequestDetected,
      whatsappHandoffRecommended: priorityIntentDecision.whatsappHandoffRecommended
    },
    acquisition: materialRecommendation
      ? {
          source: event.source,
          topic: materialRecommendation.theme,
          content_id: materialRecommendation.title,
          ai_context: `Use o tema ${materialRecommendation.theme} como contexto principal. Se fizer sentido, conduza a conversa para triagem e mencione o material apenas uma vez.`,
          language_adaptation:
            event.channel === "instagram"
              ? "leve, acolhedora e natural para DM/comentario"
              : "objetiva, clara e humana para WhatsApp"
        }
        : {
          source: event.source,
          topic: baseTheme
        }
  };

  const preparedContext = isCommentSource
    ? await instagramCommentContext.enrichNoemiaContext(session.id, baseContext)
    : baseContext;

  logRouterEvent(
    "CHANNEL_ROUTER_PRE_NOEMIA",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      extra: {
        historyCount: history.length,
        baseTheme,
        handoffAlreadyActive
      }
    })
  );

  const coreResponse = await processNoemiaCore({
    channel: event.channel,
    userType: "visitor",
    message: event.messageText,
    history,
    context: preparedContext,
    metadata: {
      sessionId: session.id,
      userId: event.externalUserId,
      eventId,
      externalMessageId: event.externalMessageId,
      source: event.source,
      pipelineId
    },
    conversationState: sessionConversationState || undefined
  });

  logRouterEvent(
    "CHANNEL_ROUTER_POST_NOEMIA",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      responseType: "text",
      responseLength: normalizeText(coreResponse.reply).length,
      extra: {
        noemiaSource: coreResponse.source,
        usedFallback: coreResponse.usedFallback,
        openaiUsed: coreResponse.metadata.openaiUsed
      }
    })
  );

  const detectedTheme = coreResponse.metadata.classification?.theme || baseTheme;
  const conversationState = coreResponse.metadata.conversationState || sessionConversationState || null;
  const conversationPolicy = evaluateConversationPolicy({
    channel: event.channel,
    session,
    conversationState,
    messageText: event.messageText
  });

  logRouterEvent(
    "CONVERSATION_POLICY_EVALUATED",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      reason: conversationPolicy.state,
      extra: {
        oldState: session.metadata?.conversation_policy_state || session.lead_stage || "unknown",
        newState: conversationPolicy.state,
        triageStage: conversationPolicy.triageStage,
        explanationStage: conversationPolicy.explanationStage,
        consultationStage: conversationPolicy.consultationStage
      }
    })
  );

  logRouterEvent(
    "HANDOFF_POLICY_EVALUATED",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      reason: conversationPolicy.handoffReason || conversationPolicy.handoffStatus,
      extra: {
        oldState: session.handoff_to_human ? "handoff_active" : "ai_active",
        newState: conversationPolicy.handoffStatus,
        handoffAllowed: conversationPolicy.handoffAllowed,
        handoffBlocked: conversationPolicy.handoffBlocked,
        schedulingComplete: conversationPolicy.schedulingComplete,
        lawyerNotificationGenerated: conversationPolicy.lawyerNotificationGenerated,
        aiActiveOnChannel: conversationPolicy.aiActiveOnChannel
      }
    })
  );

  if (conversationPolicy.handoffBlocked) {
    logRouterEvent(
      "HANDOFF_BLOCKED_AS_PREMATURE",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        reason: conversationPolicy.handoffReason || "premature_handoff_blocked",
        extra: {
          oldState: session.handoff_to_human ? "handoff_active" : "ai_active",
          newState: conversationPolicy.state,
          schedulingComplete: conversationPolicy.schedulingComplete
        }
      }),
      "warn"
    );
  }

  const handoffDecision = {
    shouldHandoff: conversationPolicy.handoffAllowed,
    reason: conversationPolicy.handoffReason || ""
  };

  const leadStage: LeadStage =
    conversationPolicy.state === "consultation_ready" ||
    conversationPolicy.state === "lawyer_notified" ||
    conversationPolicy.state === "handed_off_to_lawyer"
      ? "qualified"
      : conversationPolicy.state === "consultation_offer" ||
          conversationPolicy.state === "explanation_in_progress" ||
          conversationPolicy.state === "scheduling_in_progress" ||
          conversationPolicy.state === "scheduling_preference_captured" ||
          conversationPolicy.state === "triage_in_progress"
        ? "triage"
        : (session.lead_stage as LeadStage | undefined) || "engaged";
  const triageStatus: TriageStatus =
    conversationPolicy.triageStage === "completed" ||
    conversationPolicy.state === "consultation_ready" ||
    conversationPolicy.state === "lawyer_notified" ||
    conversationPolicy.state === "handed_off_to_lawyer"
      ? "qualified"
      : conversationPolicy.triageStage === "not_started"
        ? "not_started"
        : "in_progress";
  const materialSent = !!materialRecommendation?.sendNow;
  const followUpState: FollowUpState =
    conversationPolicy.humanFollowUpPending
      ? "human_handoff_pending"
      : conversationPolicy.state === "consultation_ready" ||
          conversationPolicy.state === "consultation_offer" ||
          conversationPolicy.state === "scheduling_in_progress" ||
          conversationPolicy.state === "scheduling_preference_captured"
        ? "qualified_waiting_reply"
        : leadStage === "triage"
          ? "triage_incomplete"
          : materialSent
            ? "material_sent"
            : "awaiting_initial_reply";
  const conversionSignal: ConversionSignal =
    conversationPolicy.operationalHandoffRecorded
      ? "human_handoff"
      : conversationPolicy.consultationStage !== "not_offered"
        ? "consultation_intent"
        : materialSent
          ? "material_interest"
          : leadStage === "triage"
            ? "triage_progress"
            : "curiosity";
  const nextBestAction: NextBestAction =
    conversationPolicy.nextBestAction === "handoff_to_lawyer"
      ? "await_human"
      : conversationPolicy.nextBestAction === "await_human_follow_up"
        ? "await_human"
        : conversationPolicy.nextBestAction === "continue_explanation"
          ? "answer_and_ask_one_question"
        : conversationPolicy.nextBestAction === "collect_scheduling_preferences" ||
            conversationPolicy.nextBestAction === "offer_consultation" ||
            conversationPolicy.nextBestAction === "continue_triage" ||
            conversationPolicy.nextBestAction === "finalize_consultation"
          ? "continue_triage"
          : "answer_and_ask_one_question";
  let replyText = appendMaterialToReply(coreResponse.reply, materialRecommendation);
  let direction: MessageDirection = coreResponse.usedFallback ? "fallback" : "reply";

  logRouterEvent(
    "TRIAGE_STAGE_UPDATED",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      reason: conversationPolicy.triageStage,
      extra: {
        oldState: session.metadata?.triage_stage || null,
        newState: conversationPolicy.triageStage
      }
    })
  );

  logRouterEvent(
    "CONSULTATION_STAGE_UPDATED",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      reason: conversationPolicy.consultationStage,
      extra: {
        oldState: session.metadata?.consultation_stage || null,
        newState: conversationPolicy.consultationStage,
        schedulingComplete: conversationPolicy.schedulingComplete
      }
    })
  );

  logRouterEvent(
    "EXPLANATION_STAGE_UPDATED",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      reason: conversationPolicy.explanationStage,
      extra: {
        oldState: session.metadata?.explanation_stage || null,
        newState: conversationPolicy.explanationStage
      }
    })
  );

  if (conversationState?.contactPreferences?.availability) {
    logRouterEvent(
      "SCHEDULING_PREFERENCE_CAPTURED",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        reason: conversationState.contactPreferences.availability,
        extra: {
          schedulingComplete: conversationPolicy.schedulingComplete
        }
      })
    );
  }

  if (conversationPolicy.readyForLawyer) {
    logRouterEvent(
      "CONSULTATION_READY_FOR_LAWYER",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        reason: conversationPolicy.handoffReason || "consultation_ready",
        extra: {
          schedulingComplete: conversationPolicy.schedulingComplete,
          lawyerNotificationGenerated: conversationPolicy.lawyerNotificationGenerated
        }
      })
    );
  }

  if (!normalizeText(replyText)) {
    logRouterEvent(
      "CHANNEL_ROUTER_RESPONSE_SKIPPED",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        reason: "empty_reply_generated"
      }),
      "warn"
    );

    replyText = buildSafeFallbackReply();
    direction = "fallback";
  }

  const mergedMetadata = {
    ...(session.metadata || {}),
    router_last_event_id: eventId,
    router_last_source: event.source,
    router_last_theme: detectedTheme,
    router_last_decision: direction,
    handoff_already_active: session.handoff_to_human === true,
    last_material_url: materialRecommendation?.url || session.metadata?.last_material_url || null,
    last_handoff_reason: handoffDecision.reason || session.metadata?.last_handoff_reason || null,
    handoff_reason_code: conversationPolicy.handoffReasonCode,
    conversation_state: conversationState,
    conversation_policy_state: conversationPolicy.state,
    triage_stage: conversationPolicy.triageStage,
    explanation_stage: conversationPolicy.explanationStage,
    consultation_stage: conversationPolicy.consultationStage,
    handoff_status: conversationPolicy.handoffStatus,
    scheduling_complete: conversationPolicy.schedulingComplete,
    ready_for_lawyer: conversationPolicy.readyForLawyer,
    lawyer_notification_generated:
      conversationPolicy.handoffAllowed || conversationPolicy.lawyerNotificationGenerated,
    ai_active_on_channel: conversationPolicy.aiActiveOnChannel,
    operational_handoff_recorded:
      conversationPolicy.handoffAllowed || conversationPolicy.operationalHandoffRecorded,
    human_followup_pending: conversationPolicy.humanFollowUpPending,
    follow_up_ready: conversationPolicy.followUpReady,
    last_router_at: new Date().toISOString()
  };
  const sessionSummary = buildSessionSummaryPayload({
    detectedTheme,
    leadStage,
    triageStatus,
    conversationState: conversationPolicy.state,
    consultationStage: conversationPolicy.consultationStage,
    followUpState,
    conversionSignal,
    nextBestAction,
    materialSent,
    handoffTriggered: handoffDecision.shouldHandoff,
    handoffReason: handoffDecision.reason
  });

  let finalReplyText = replyText;

  logRouterEvent(
    "CHANNEL_ROUTER_PRE_OUTBOUND_SEND",
    buildRouterLogContext({
      event,
      eventId,
      session,
      messageType,
      pipelineId,
      responseType: "text",
      responseLength: finalReplyText.length,
      reason: direction
    })
  );

  let sent = await transport.sendText(event.externalUserId, finalReplyText, {
    channel: event.channel,
    eventId,
    externalUserId: event.externalUserId,
    sessionId: session.id,
    pipelineId,
    messageType,
    responseType: "text",
    responseLength: finalReplyText.length,
    reason: direction
  });
  let finalUsedFallback = coreResponse.usedFallback;
  let finalDirection = direction;

  if (!sent && channelAutomationFeatures.whatsappEmergencyFallback) {
    const safeFallback = buildSafeFallbackReply();

    logRouterEvent(
      "CHANNEL_ROUTER_PRE_OUTBOUND_SEND",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        responseType: "text",
        responseLength: safeFallback.length,
        reason: "emergency_fallback"
      }),
      "warn"
    );

    const fallbackSent = await transport.sendText(event.externalUserId, safeFallback, {
      channel: event.channel,
      eventId,
      externalUserId: event.externalUserId,
      sessionId: session.id,
      pipelineId,
      messageType,
      responseType: "text",
      responseLength: safeFallback.length,
      reason: "emergency_fallback"
    });

    if (fallbackSent) {
      finalReplyText = safeFallback;
      finalUsedFallback = true;
      finalDirection = "fallback";
      sent = true;
    }
  }

  if (sent) {
    await safeSaveMessage(session.id, undefined, "assistant", finalReplyText, "outbound", {
      channel: event.channel,
      source: finalUsedFallback ? "fallback" : coreResponse.source,
      route: "channel_conversation_router",
      eventId,
      usedFallback: finalUsedFallback,
      handoffTriggered: handoffDecision.shouldHandoff,
      handoffReason: handoffDecision.reason || null,
      handoffAlreadyActive,
      conversationPolicyState: conversationPolicy.state,
      consultationStage: conversationPolicy.consultationStage,
      triageStage: conversationPolicy.triageStage,
      explanationStage: conversationPolicy.explanationStage,
      schedulingComplete: conversationPolicy.schedulingComplete,
      materialUrl: materialRecommendation?.url || null,
      triageStatus,
      leadStage,
      followUpState,
      conversionSignal,
      nextBestAction,
      materialSent,
      consultationIntentDetected: priorityIntentDecision.consultationIntentDetected,
      addressRequestDetected: priorityIntentDecision.addressRequestDetected,
      whatsappHandoffRecommended: priorityIntentDecision.whatsappHandoffRecommended,
      handoffPhoneUsed: channelCommercialConfig.consultationWhatsappNumber,
      responseTime: coreResponse.metadata.responseTime,
      classification: coreResponse.metadata.classification
    });

    await safeUpdateSession(session.id, {
      lead_stage: leadStage,
      case_area: detectedTheme || session.case_area,
      current_intent:
        conversationPolicy.state || coreResponse.intent || session.current_intent || "conversation",
      handoff_to_human:
        conversationPolicy.handoffAllowed || conversationPolicy.operationalHandoffRecorded,
      last_inbound_at: new Date().toISOString(),
      last_outbound_at: new Date().toISOString(),
      last_summary: sessionSummary,
      metadata: mergedMetadata
    });

    logRouterEvent(
      "PANEL_STATE_UPDATED",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        reason: conversationPolicy.state,
        extra: {
          oldState: session.metadata?.conversation_policy_state || null,
          newState: conversationPolicy.state,
          consultationStage: conversationPolicy.consultationStage,
          handoffAllowed: conversationPolicy.handoffAllowed,
          aiActiveOnChannel: conversationPolicy.aiActiveOnChannel
        }
      })
    );

    if (conversationPolicy.handoffAllowed || conversationPolicy.operationalHandoffRecorded) {
      logRouterEvent(
        "LAWYER_HANDOFF_TRIGGERED",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          pipelineId,
          reason: conversationPolicy.handoffReason || "consultation_ready",
          extra: {
            oldState: session.metadata?.conversation_policy_state || null,
            newState: conversationPolicy.operationalHandoffRecorded
              ? "handed_off_to_lawyer"
              : "lawyer_notified",
            schedulingComplete: conversationPolicy.schedulingComplete,
            lawyerNotificationGenerated: conversationPolicy.lawyerNotificationGenerated
          }
        })
      );
      logRouterEvent(
        "HANDOFF_RECORDED_WITHOUT_AI_SHUTDOWN",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          pipelineId,
          reason: conversationPolicy.handoffReason || "operational_handoff_recorded",
          extra: {
            aiActiveOnChannel: conversationPolicy.aiActiveOnChannel
          }
        })
      );
      logRouterEvent(
        "LAWYER_NOTIFIED_AI_STILL_ACTIVE",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          pipelineId,
          reason: conversationPolicy.handoffReason || "lawyer_notified",
          extra: {
            lawyerNotificationGenerated: true,
            aiActiveOnChannel: conversationPolicy.aiActiveOnChannel
          }
        })
      );
    }

    if (handoffAlreadyActive || conversationPolicy.operationalHandoffRecorded) {
      logRouterEvent(
        "POST_HANDOFF_RESPONSE_SENT",
        buildRouterLogContext({
          event,
          eventId,
          session,
          messageType,
          pipelineId,
          reason: finalDirection
        })
      );
    }

    await saveTriageAndHandoff(
      {
        ...session,
        metadata: mergedMetadata
      },
      event,
      detectedTheme,
      leadStage,
      handoffDecision.reason,
      conversationState,
      conversationPolicy,
      pipelineId,
      nextBestAction
    );

    await antiSpamGuard.markEventProcessed({
      channel: event.channel,
      externalEventId: eventId,
      externalMessageId: event.externalMessageId,
      externalUserId: event.externalUserId,
      messageText: event.messageText,
      messageType
    });
  } else {
    logRouterEvent(
      "CHANNEL_ROUTER_RESPONSE_SKIPPED",
      buildRouterLogContext({
        event,
        eventId,
        session,
        messageType,
        pipelineId,
        responseType: "text",
        responseLength: finalReplyText.length,
        reason: "outbound_send_failed"
      }),
      "error"
    );
  }

  logRouterEvent("CHANNEL_ROUTER_COMPLETED", {
    channel: event.channel,
    source: event.source,
    sessionId: session.id,
    eventId,
    direction: finalDirection,
    detectedTheme,
    currentIntent: coreResponse.intent || "conversation",
    leadStage,
    triageStatus,
    followUpState,
    conversionSignal,
    nextBestAction,
    usedFallback: finalUsedFallback,
    handoffTriggered: handoffDecision.shouldHandoff,
    handoffReason: handoffDecision.reason || null,
    handoffAlreadyActive,
    conversationPolicyState: conversationPolicy.state,
    consultationStage: conversationPolicy.consultationStage,
    triageStage: conversationPolicy.triageStage,
    explanationStage: conversationPolicy.explanationStage,
    schedulingComplete: conversationPolicy.schedulingComplete,
    lawyerNotificationGenerated: conversationPolicy.lawyerNotificationGenerated,
    aiActiveOnChannel: conversationPolicy.aiActiveOnChannel,
    operationalHandoffRecorded: conversationPolicy.operationalHandoffRecorded,
    materialUrl: materialRecommendation?.url || null,
    replySent: sent,
    consultationIntentDetected: priorityIntentDecision.consultationIntentDetected,
    addressRequestDetected: priorityIntentDecision.addressRequestDetected,
    whatsappHandoffRecommended: priorityIntentDecision.whatsappHandoffRecommended,
    handoffPhoneUsed: channelCommercialConfig.consultationWhatsappNumber
  });

  return {
    direction: finalDirection,
    sessionId: session.id,
    eventId,
    usedFallback: finalUsedFallback,
    handoffTriggered: handoffDecision.shouldHandoff,
    replySent: sent,
    detectedTheme,
    currentIntent: coreResponse.intent || "conversation",
    leadStage,
    triageStatus,
    followUpState,
    conversionSignal,
    nextBestAction,
    materialUrl: materialRecommendation?.url,
    handoffReason: handoffDecision.reason,
    logs: {
      source: coreResponse.source,
      openaiUsed: coreResponse.metadata.openaiUsed,
      responseTime: coreResponse.metadata.responseTime,
      consultationIntentDetected: priorityIntentDecision.consultationIntentDetected,
      addressRequestDetected: priorityIntentDecision.addressRequestDetected,
      whatsappHandoffRecommended: priorityIntentDecision.whatsappHandoffRecommended,
      handoffPhoneUsed: channelCommercialConfig.consultationWhatsappNumber,
      handoffAlreadyActive
    }
  };
  } catch (error) {
    logRouterEvent(
      "CHANNEL_ROUTER_FATAL",
      buildRouterLogContext({
        event,
        eventId,
        messageType,
        reason: error instanceof Error ? error.message : String(error)
      }),
      "error"
    );

    throw error;
  }
}
