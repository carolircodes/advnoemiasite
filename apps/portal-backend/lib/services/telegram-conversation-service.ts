import "server-only";

import { processNoemiaCore } from "../ai/noemia-core.ts";
import { antiSpamGuard } from "./anti-spam-guard.ts";
import { conversationPersistence } from "./conversation-persistence.ts";
import { recordProductEvent } from "./public-intake.ts";
import {
  normalizeTelegramWebhookUpdate,
  sendTelegramGroupMessage,
  sendTelegramPrivateMessage
} from "../telegram/telegram-service.ts";

type GroupPolicyDecision =
  | "ignore"
  | "community_signal"
  | "founder_signal"
  | "waitlist_signal"
  | "private_redirect"
  | "operational_thread";

function nowIso() {
  return new Date().toISOString();
}

function detectTelegramIntent(text: string) {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("consulta") ||
    normalized.includes("advogada") ||
    normalized.includes("quero atendimento") ||
    normalized.includes("preciso de ajuda")
  ) {
    return "consultation";
  }

  if (
    normalized.includes("founder") ||
    normalized.includes("fundadora") ||
    normalized.includes("circulo")
  ) {
    return "founder_interest";
  }

  if (normalized.includes("waitlist") || normalized.includes("lista")) {
    return "waitlist_interest";
  }

  return "telegram_conversation";
}

function evaluateGroupPolicy(text: string, context: {
  mentionsBot: boolean;
  isReplyToBot: boolean;
  isCommand: boolean;
}) {
  const normalized = text.toLowerCase();

  if (!context.mentionsBot && !context.isReplyToBot && !context.isCommand) {
    return {
      decision: "ignore" as GroupPolicyDecision,
      rationale: "Mensagem comunitaria sem acionamento do bot."
    };
  }

  if (
    normalized.includes("founder") ||
    normalized.includes("fundadora") ||
    normalized.includes("comunidade")
  ) {
    return {
      decision: "founder_signal" as GroupPolicyDecision,
      rationale: "Sinal de densidade comunitaria ou founder detectado."
    };
  }

  if (normalized.includes("waitlist") || normalized.includes("lista")) {
    return {
      decision: "waitlist_signal" as GroupPolicyDecision,
      rationale: "Sinal de waitlist detectado no grupo."
    };
  }

  if (
    normalized.includes("me chama") ||
    normalized.includes("te chamo") ||
    normalized.includes("no privado") ||
    normalized.includes("dm")
  ) {
    return {
      decision: "private_redirect" as GroupPolicyDecision,
      rationale: "A conversa ja pede continuidade privada."
    };
  }

  if (
    normalized.includes("consulta") ||
    normalized.includes("ajuda") ||
    normalized.includes("caso") ||
    normalized.includes("advogada")
  ) {
    return {
      decision: "operational_thread" as GroupPolicyDecision,
      rationale: "Mensagem com intencao real e necessidade de operacao."
    };
  }

  return {
    decision: "community_signal" as GroupPolicyDecision,
    rationale: "Sinal comunitario relevante sem virar thread completa."
  };
}

async function createTelegramEvent(input: {
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
}) {
  await conversationPersistence.supabaseClient.from("conversation_events").insert({
    session_id: input.sessionId,
    event_type: input.eventType,
    actor_type: "system",
    event_data: input.eventData
  });
}

async function handlePrivateUpdate(update: ReturnType<typeof normalizeTelegramWebhookUpdate>) {
  if (!update || !update.fromId) {
    return { ok: true, mode: "private_ignored" as const };
  }

  const externalUserId = `telegram:${update.fromId}`;
  const guard = await antiSpamGuard.shouldRespondToEvent({
    channel: "telegram",
    externalEventId: update.updateId || update.messageId,
    externalMessageId: update.messageId,
    externalUserId,
    messageText: update.text,
    isEcho: update.isBot,
    messageType: "telegram_private",
    timestamp: update.timestamp || undefined
  });

  if (!guard.shouldRespond) {
    return { ok: true, mode: "private_filtered" as const, reason: guard.reason || null };
  }

  const session = await conversationPersistence.getOrCreateSession(
    "telegram",
    externalUserId,
    update.chatId
  );
  const recent = await conversationPersistence.getRecentMessages(session.id, 10);
  const inboundAt = nowIso();

  await conversationPersistence.saveMessage(
    session.id,
    update.messageId,
    "user",
    update.text,
    "inbound",
    {
      source: "telegram_private",
      telegram_surface: "private",
      telegram_chat_id: update.chatId,
      telegram_username: update.username,
      telegram_display_name: update.fromName,
      telegram_group_title: null
    },
    {
      messageType: "telegram_private",
      senderType: "contact",
      sendStatus: "received",
      deliveryStatus: "accepted",
      isRead: false,
      receivedAt: inboundAt
    }
  );

  const intent = detectTelegramIntent(update.text);
  const handoffRequested =
    intent === "consultation" || update.text.toLowerCase().includes("humano");

  await conversationPersistence.updateSession(session.id, {
    lead_name: update.fromName || session.lead_name,
    current_intent: intent,
    last_inbound_at: inboundAt,
    last_message_at: inboundAt,
    last_message_preview: update.text.slice(0, 240),
    last_message_direction: "inbound",
    unread_count: (session.unread_count || 0) + 1,
    thread_status: handoffRequested ? "waiting_human" : "ai_active",
    waiting_for: handoffRequested ? "human" : "ai",
    owner_mode: handoffRequested ? "hybrid" : "ai",
    priority: handoffRequested ? "high" : "medium",
    handoff_state: handoffRequested ? "requested" : "none",
    handoff_reason: handoffRequested ? "telegram_private_consultation" : undefined,
    ai_enabled: true,
    next_action_hint: handoffRequested
      ? "Assumir o privado do Telegram com contexto preservado."
      : "IA respondendo no Telegram privado. Monitorar sinais de consulta e founder/waitlist.",
    follow_up_status: handoffRequested ? "pending" : "none",
    metadata: {
      ...(session.metadata || {}),
      telegram_surface: "private",
      telegram_chat_id: update.chatId,
      telegram_username: update.username,
      telegram_display_name: update.fromName,
      telegram_origin_type: "private",
      telegram_group_title: null,
      last_user_message: update.text
    }
  });

  const history = recent
    .slice()
    .reverse()
    .map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: message.content
    }))
    .slice(-8);

  const core = await processNoemiaCore({
    channel: "telegram",
    userType: "visitor",
    message: update.text,
    history,
    context: {
      source: "telegram_private",
      telegramSurface: "private",
      username: update.username || undefined,
      displayName: update.fromName || undefined
    } as any,
    metadata: {
      sessionId: session.id,
      chatId: update.chatId,
      clientId: session.client_id || undefined
    }
  });

  const sendResult = await sendTelegramPrivateMessage({
    chatId: update.chatId,
    text: core.reply
  });

  const outboundAt = nowIso();
  await conversationPersistence.saveMessage(
    session.id,
    sendResult.messageId || undefined,
    "assistant",
    core.reply,
    "outbound",
    {
      source: core.source,
      telegram_surface: "private",
      telegram_chat_id: update.chatId,
      responseSurface: "direct_message",
      intent: core.intent || null
    },
    {
      messageType: "telegram_private",
      senderType: "ai",
      sendStatus: sendResult.ok ? "sent" : "failed",
      deliveryStatus: sendResult.ok ? "accepted" : "failed",
      errorMessage: sendResult.error,
      failedAt: sendResult.ok ? null : outboundAt
    }
  );

  await conversationPersistence.updateSession(session.id, {
    current_intent: core.intent || intent,
    last_outbound_at: outboundAt,
    last_message_at: outboundAt,
    last_message_preview: core.reply.slice(0, 240),
    last_message_direction: "outbound",
    last_ai_reply_at: outboundAt,
    waiting_for: handoffRequested ? "human" : "client",
    thread_status: handoffRequested ? "handoff" : "waiting_client",
    owner_mode: handoffRequested ? "hybrid" : "ai",
    handoff_state: handoffRequested ? "active" : "none",
    handoff_to_human: handoffRequested,
    priority: handoffRequested ? "high" : "medium",
    follow_up_status: handoffRequested ? "pending" : "none",
    metadata: {
      ...(session.metadata || {}),
      telegram_surface: "private",
      telegram_chat_id: update.chatId,
      telegram_origin_type: "private",
      ai_source: core.source
    }
  });

  await createTelegramEvent({
    sessionId: session.id,
    eventType: handoffRequested ? "telegram_private_handoff_requested" : "telegram_private_replied",
    eventData: {
      summary: handoffRequested
        ? "Privado do Telegram sinalizado para handoff humano."
        : "Privado do Telegram respondido pela IA.",
      telegramSurface: "private",
      chatId: update.chatId
    }
  });

  await antiSpamGuard.markEventProcessed({
    channel: "telegram",
    externalEventId: update.updateId || update.messageId,
    externalMessageId: update.messageId,
    externalUserId,
    messageText: update.text,
    messageType: "telegram_private"
  });

  await recordProductEvent({
    eventKey: "telegram_private_inbound",
    eventGroup: "conversation",
    pagePath: "/api/telegram/webhook",
    payload: {
      sessionId: session.id,
      intent: core.intent || intent,
      handoffRequested
    }
  });

  return { ok: true, mode: "private_replied" as const, sessionId: session.id };
}

async function handleGroupUpdate(update: ReturnType<typeof normalizeTelegramWebhookUpdate>) {
  if (!update || !update.fromId) {
    return { ok: true, mode: "group_ignored" as const };
  }

  const policy = evaluateGroupPolicy(update.text, {
    mentionsBot: update.mentionsBot,
    isReplyToBot: update.isReplyToBot,
    isCommand: update.isCommand
  });

  if (policy.decision === "ignore") {
    return { ok: true, mode: "group_ignored" as const };
  }

  const externalUserId = `telegram_group:${update.chatId}:${update.fromId}`;
  const session = await conversationPersistence.getOrCreateSession(
    "telegram",
    externalUserId,
    update.chatId
  );
  const inboundAt = nowIso();

  await conversationPersistence.saveMessage(
    session.id,
    update.messageId,
    "user",
    update.text,
    "inbound",
    {
      source: "telegram_group",
      telegram_surface: "group",
      telegram_chat_id: update.chatId,
      telegram_group_title: update.chatTitle,
      telegram_username: update.username,
      telegram_display_name: update.fromName,
      telegram_group_policy: policy.decision,
      telegram_group_rationale: policy.rationale,
      responseSurface: "public_comment"
    },
    {
      messageType: "telegram_group_signal",
      senderType: "contact",
      sendStatus: "received",
      deliveryStatus: "accepted",
      isRead: false,
      receivedAt: inboundAt
    }
  );

  const needsPrivateRedirect =
    policy.decision === "private_redirect" || policy.decision === "operational_thread";
  let groupReply: string | null = null;

  if (needsPrivateRedirect) {
    groupReply =
      "Recebi seu ponto. Para te orientar com mais cuidado e sem expor detalhes aqui no grupo, me chama no privado do bot e eu continuo com voce por la.";

    await sendTelegramGroupMessage({
      chatId: update.chatId,
      text: groupReply,
      replyToMessageId: update.messageId
    });
  }

  await conversationPersistence.updateSession(session.id, {
    lead_name: update.fromName || session.lead_name,
    current_intent: detectTelegramIntent(update.text),
    last_inbound_at: inboundAt,
    last_message_at: inboundAt,
    last_message_preview: update.text.slice(0, 240),
    last_message_direction: "inbound",
    unread_count: (session.unread_count || 0) + 1,
    thread_status:
      policy.decision === "operational_thread" ? "waiting_human" : "unread",
    waiting_for:
      policy.decision === "operational_thread" ? "human" : "none",
    owner_mode:
      policy.decision === "operational_thread" ? "hybrid" : "human",
    priority:
      policy.decision === "operational_thread" || policy.decision === "founder_signal"
        ? "high"
        : "medium",
    handoff_state:
      policy.decision === "operational_thread" ? "requested" : "none",
    handoff_reason:
      policy.decision === "operational_thread" ? "telegram_group_operational_signal" : undefined,
    ai_enabled: policy.decision === "operational_thread",
    next_action_hint: needsPrivateRedirect
      ? "Conduzir a continuidade no privado do Telegram e preservar o grupo como espaco curado."
      : "Ler o sinal comunitario e decidir se gera nota, follow-up ou observacao interna.",
    follow_up_status:
      policy.decision === "operational_thread" ||
      policy.decision === "waitlist_signal" ||
      policy.decision === "founder_signal"
        ? "pending"
        : "none",
    metadata: {
      ...(session.metadata || {}),
      telegram_surface: "group",
      telegram_chat_id: update.chatId,
      telegram_group_title: update.chatTitle,
      telegram_origin_type: "group",
      telegram_group_policy: policy.decision,
      telegram_group_rationale: policy.rationale,
      telegram_username: update.username,
      telegram_display_name: update.fromName
    }
  });

  await createTelegramEvent({
    sessionId: session.id,
    eventType:
      policy.decision === "operational_thread"
        ? "telegram_group_operational_signal"
        : policy.decision === "founder_signal"
          ? "telegram_group_founder_signal"
          : policy.decision === "waitlist_signal"
            ? "telegram_group_waitlist_signal"
            : "telegram_group_community_signal",
    eventData: {
      summary:
        policy.decision === "operational_thread"
          ? "Mensagem relevante do grupo virou sinal operacional na central."
          : "Mensagem do grupo registrada como sinal curado do Telegram.",
      telegramSurface: "group",
      groupTitle: update.chatTitle,
      policyDecision: policy.decision,
      rationale: policy.rationale,
      redirectedToPrivate: needsPrivateRedirect,
      groupReply
    }
  });

  await recordProductEvent({
    eventKey:
      policy.decision === "founder_signal"
        ? "telegram_founder_signal"
        : policy.decision === "waitlist_signal"
          ? "telegram_waitlist_signal"
          : policy.decision === "operational_thread"
            ? "telegram_readiness_signal"
            : "telegram_premium_signal",
    eventGroup: "conversation",
    pagePath: "/api/telegram/webhook",
    payload: {
      sessionId: session.id,
      policyDecision: policy.decision,
      groupTitle: update.chatTitle
    }
  });

  await antiSpamGuard.markEventProcessed({
    channel: "telegram",
    externalEventId: update.updateId || update.messageId,
    externalMessageId: update.messageId,
    externalUserId,
    messageText: update.text,
    messageType: "telegram_group_signal"
  });

  return { ok: true, mode: "group_processed" as const, sessionId: session.id };
}

export async function processTelegramWebhookUpdate(rawUpdate: unknown) {
  const update = normalizeTelegramWebhookUpdate(rawUpdate);

  if (!update || !update.messageId || !update.chatId || update.isBot) {
    return { ok: true, mode: "ignored" as const };
  }

  if (update.chatType === "private") {
    return handlePrivateUpdate(update);
  }

  if (update.chatType === "group" || update.chatType === "supergroup") {
    return handleGroupUpdate(update);
  }

  return { ok: true, mode: "non_conversational_surface" as const };
}
