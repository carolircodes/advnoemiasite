import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin";
import { antiSpamGuard } from "./anti-spam-guard";
import { conversationPersistence } from "./conversation-persistence";
import { processNoemiaCore } from "../ai/noemia-core";
import { recordProductEvent } from "./public-intake";
import {
  normalizeTelegramWebhookUpdate,
  sendTelegramGroupMessage,
  sendTelegramPrivateMessage
} from "../telegram/telegram-service";

type GroupSignalKind =
  | "irrelevant"
  | "community"
  | "intent"
  | "help_request"
  | "move_to_private"
  | "founder_signal"
  | "waitlist_signal"
  | "opportunity"
  | "follow_up_signal"
  | "community_event";

type TelegramConversationResult = {
  ok: boolean;
  mode: "private" | "group" | "ignored";
  sessionId?: string | null;
  replySent?: boolean;
  signalKind?: GroupSignalKind | null;
};

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mergeMetadata(
  current: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
) {
  return {
    ...(current || {}),
    ...patch
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))
  );
}

function sanitizePreview(text: string) {
  return text.trim().slice(0, 240);
}

function toHistory(messages: Awaited<ReturnType<typeof conversationPersistence.getRecentMessages>>) {
  return messages
    .slice()
    .reverse()
    .map((message) => ({
      role: (message.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: message.content
    }))
    .slice(-8);
}

function classifyGroupSignal(text: string, flags: {
  mentionsBot: boolean;
  isReplyToBot: boolean;
  isCommand: boolean;
}) {
  const lowered = text.toLowerCase();

  const founderSignal = /\bfounder\b|\bfundador\b|\bfundadora\b/.test(lowered);
  const waitlistSignal = /\bwaitlist\b|lista de espera|quero entrar|quero participar/.test(lowered);
  const asksForPrivate =
    /\bdm\b|direct|privado|privada|me chama|me chame|chama no privado|falar no privado/.test(lowered);
  const legalNeed =
    /consulta|advogada|juridic|processo|aposentadoria|inss|beneficio|divorcio|guarda|banco|indenizacao|preciso de ajuda|socorro|urgente/.test(
      lowered
    );
  const opportunity =
    /quero resolver|quero agendar|podem me orientar|como funciona|quanto custa|qual o valor|preciso conversar/.test(
      lowered
    );
  const helpRequest = /ajuda|duvida|alguem pode|podem me ajudar|me orienta|me orientar/.test(lowered);
  const communityEvent = /encontro|live|aula|material|conteudo|artigo|biblioteca|portal/.test(lowered);
  const targeted = flags.mentionsBot || flags.isReplyToBot || flags.isCommand;

  if (!targeted && !founderSignal && !waitlistSignal && !asksForPrivate && !legalNeed && !opportunity && !helpRequest) {
    return {
      kind: communityEvent ? ("community" as const) : ("irrelevant" as const),
      relevant: false,
      shouldCreateThread: false,
      shouldMoveToPrivate: false,
      shouldAutoReply: false,
      priority: "low" as const,
      followUpStatus: "none" as const
    };
  }

  if (founderSignal) {
    return {
      kind: "founder_signal" as const,
      relevant: true,
      shouldCreateThread: true,
      shouldMoveToPrivate: true,
      shouldAutoReply: true,
      priority: "high" as const,
      followUpStatus: "due" as const
    };
  }

  if (waitlistSignal) {
    return {
      kind: "waitlist_signal" as const,
      relevant: true,
      shouldCreateThread: true,
      shouldMoveToPrivate: true,
      shouldAutoReply: true,
      priority: "medium" as const,
      followUpStatus: "pending" as const
    };
  }

  if (asksForPrivate) {
    return {
      kind: "move_to_private" as const,
      relevant: true,
      shouldCreateThread: true,
      shouldMoveToPrivate: true,
      shouldAutoReply: true,
      priority: "medium" as const,
      followUpStatus: "pending" as const
    };
  }

  if (helpRequest || flags.isCommand) {
    return {
      kind: "help_request" as const,
      relevant: true,
      shouldCreateThread: true,
      shouldMoveToPrivate: legalNeed || opportunity,
      shouldAutoReply: true,
      priority: legalNeed ? ("high" as const) : ("medium" as const),
      followUpStatus: legalNeed ? ("due" as const) : ("pending" as const)
    };
  }

  if (opportunity || legalNeed) {
    return {
      kind: opportunity ? ("opportunity" as const) : ("intent" as const),
      relevant: true,
      shouldCreateThread: true,
      shouldMoveToPrivate: true,
      shouldAutoReply: true,
      priority: opportunity ? ("high" as const) : ("medium" as const),
      followUpStatus: "due" as const
    };
  }

  return {
    kind: communityEvent ? ("community_event" as const) : ("follow_up_signal" as const),
    relevant: true,
    shouldCreateThread: true,
    shouldMoveToPrivate: false,
    shouldAutoReply: targeted,
    priority: "low" as const,
    followUpStatus: "pending" as const
  };
}

class TelegramConversationService {
  private supabase = createAdminSupabaseClient();

  async handleWebhookUpdate(rawUpdate: unknown): Promise<TelegramConversationResult> {
    const update = normalizeTelegramWebhookUpdate(rawUpdate);

    if (!update || !update.text || update.isBot) {
      return { ok: true, mode: "ignored" };
    }

    if (update.chatType === "private") {
      return this.handlePrivateMessage(update);
    }

    if (update.chatType === "group" || update.chatType === "supergroup") {
      return this.handleGroupMessage(update);
    }

    return { ok: true, mode: "ignored" };
  }

  private async handlePrivateMessage(
    update: NonNullable<ReturnType<typeof normalizeTelegramWebhookUpdate>>
  ): Promise<TelegramConversationResult> {
    const externalUserId = `telegram:${update.fromId || update.chatId}`;
    const guard = await antiSpamGuard.shouldRespondToEvent({
      channel: "telegram",
      externalEventId: update.updateId || update.messageId,
      externalMessageId: update.messageId || undefined,
      externalUserId,
      messageText: update.text,
      isEcho: false,
      messageType: "telegram_private",
      timestamp: update.timestamp || undefined
    });

    if (!guard.shouldRespond) {
      return { ok: true, mode: "ignored" };
    }

    const session = await conversationPersistence.getOrCreateSession(
      "telegram",
      externalUserId,
      update.chatId
    );

    const existingMetadata = safeObject(session.metadata);
    const telegramMetadata = mergeMetadata(safeObject(existingMetadata.telegram), {
      surface: "private",
      chatId: update.chatId,
      username: update.username,
      fromId: update.fromId,
      chatTitle: update.chatTitle,
      lastInboundMessageId: update.messageId,
      lastInboundAt: update.timestamp ? new Date(update.timestamp * 1000).toISOString() : new Date().toISOString()
    });

    const inboundAt = update.timestamp
      ? new Date(update.timestamp * 1000).toISOString()
      : new Date().toISOString();

    await conversationPersistence.saveMessage(
      session.id,
      update.messageId || undefined,
      "user",
      update.text,
      "inbound",
      {
        channel: "telegram",
        responseSurface: "telegram_private",
        source: "telegram_private",
        telegramSurface: "private",
        telegramChatId: update.chatId,
        telegramUsername: update.username,
        telegramFromId: update.fromId
      },
      {
        messageType: "telegram_private",
        senderType: "contact",
        sendStatus: "received",
        isRead: false,
        receivedAt: inboundAt
      }
    );

    const history = toHistory(await conversationPersistence.getRecentMessages(session.id, 12));
    const aiResult = await processNoemiaCore({
      channel: "telegram",
      userType: "visitor",
      message: update.text,
      history,
      metadata: {
        sessionId: session.id,
        externalUserId,
        telegramSurface: "private",
        telegramChatId: update.chatId
      },
      context: {
        acquisition: {
          source: "telegram_private",
          topic: "telegram_conversational"
        }
      }
    });

    const sendResult = await sendTelegramPrivateMessage({
      chatId: update.chatId,
      text: aiResult.reply
    });

    const now = new Date().toISOString();

    await conversationPersistence.saveMessage(
      session.id,
      sendResult.messageId || undefined,
      "assistant",
      aiResult.reply,
      "outbound",
      {
        channel: "telegram",
        source: "telegram_private_ai",
        responseSurface: "telegram_private",
        telegramSurface: "private",
        sendMode: "ai"
      },
      {
        messageType: "telegram_private",
        senderType: "ai",
        sendStatus: sendResult.ok ? "sent" : "failed",
        deliveryStatus: sendResult.status,
        isRead: true,
        readAt: now,
        errorMessage: sendResult.error,
        failedAt: sendResult.ok ? null : now
      }
    );

    await conversationPersistence.updateSession(session.id, {
      metadata: mergeMetadata(existingMetadata, {
        telegram: telegramMetadata,
        acquisition: {
          sourceLabel: "Telegram privado",
          channelLabel: "Telegram"
        }
      }),
      lead_name: update.fromName || session.lead_name,
      last_inbound_at: inboundAt,
      last_outbound_at: now,
      last_message_at: now,
      last_message_preview: sanitizePreview(aiResult.reply),
      last_message_direction: "outbound",
      last_ai_reply_at: now,
      thread_status: sendResult.ok ? "waiting_client" : "waiting_human",
      waiting_for: sendResult.ok ? "client" : "human",
      owner_mode: sendResult.ok ? "ai" : "human",
      handoff_state: sendResult.ok ? "resolved" : "requested",
      unread_count: 1,
      follow_up_status: sendResult.ok ? "pending" : "due",
      next_action_hint: sendResult.ok
        ? "Aguardar continuidade no Telegram privado ou assumir manualmente se houver sensibilidade."
        : "Falha no envio pelo Telegram privado. Assumir manualmente a thread."
    });

    await this.supabase.from("conversation_events").insert([
      {
        session_id: session.id,
        event_type: "telegram_private_inbound",
        actor_type: "system",
        event_data: {
          summary: "Mensagem privada do Telegram persistida na inbox.",
          surface: "private",
          chatId: update.chatId,
          username: update.username
        }
      },
      {
        session_id: session.id,
        event_type: sendResult.ok ? "telegram_private_ai_replied" : "telegram_private_ai_failed",
        actor_type: "ai",
        actor_label: "NoemIA",
        event_data: {
          summary: sendResult.ok
            ? "IA respondeu no privado do Telegram."
            : "IA tentou responder no privado do Telegram, mas o envio falhou.",
          messageId: sendResult.messageId,
          error: sendResult.error
        }
      }
    ]);

    await recordProductEvent({
      eventKey: "telegram_private_thread_started",
      eventGroup: "conversation",
      pagePath: "/telegram/private",
      payload: {
        sessionId: session.id,
        externalUserId,
        username: update.username,
        aiReplied: sendResult.ok
      }
    });

    await antiSpamGuard.markEventProcessed({
      channel: "telegram",
      externalEventId: update.updateId || update.messageId,
      externalMessageId: update.messageId || undefined,
      externalUserId,
      messageText: update.text
    });

    return {
      ok: true,
      mode: "private",
      sessionId: session.id,
      replySent: sendResult.ok,
      signalKind: null
    };
  }

  private async handleGroupMessage(
    update: NonNullable<ReturnType<typeof normalizeTelegramWebhookUpdate>>
  ): Promise<TelegramConversationResult> {
    const externalUserId = `telegram_group:${update.chatId}:${update.fromId || "unknown"}`;
    const alreadyProcessed = await conversationPersistence.isEventProcessed(
      "telegram",
      update.updateId || update.messageId
    );

    if (alreadyProcessed) {
      return { ok: true, mode: "ignored" };
    }

    const classification = classifyGroupSignal(update.text, {
      mentionsBot: update.mentionsBot,
      isReplyToBot: update.isReplyToBot,
      isCommand: update.isCommand
    });

    await recordProductEvent({
      eventKey: classification.relevant
        ? "telegram_group_relevant_signal"
        : "telegram_group_community_message",
      eventGroup: "community",
      pagePath: "/telegram/group",
      payload: {
        chatId: update.chatId,
        messageId: update.messageId,
        signalKind: classification.kind,
        mentionsBot: update.mentionsBot,
        isReplyToBot: update.isReplyToBot,
        isCommand: update.isCommand
      }
    });

    if (!classification.shouldCreateThread) {
      await conversationPersistence.markEventProcessed(
        "telegram",
        update.updateId || update.messageId,
        update.messageId || undefined,
        externalUserId
      );
      return {
        ok: true,
        mode: "ignored",
        signalKind: classification.kind
      };
    }

    const session = await conversationPersistence.getOrCreateSession(
      "telegram",
      externalUserId,
      update.chatId
    );

    const existingMetadata = safeObject(session.metadata);
    const telegramMetadata = mergeMetadata(safeObject(existingMetadata.telegram), {
      surface: "group",
      chatId: update.chatId,
      groupTitle: update.chatTitle,
      username: update.username,
      fromId: update.fromId,
      relevance: classification.kind,
      shouldMoveToPrivate: classification.shouldMoveToPrivate,
      lastInboundMessageId: update.messageId
    });

    const now = new Date().toISOString();

    await conversationPersistence.saveMessage(
      session.id,
      update.messageId || undefined,
      "user",
      update.text,
      "inbound",
      {
        channel: "telegram",
        responseSurface: "telegram_group",
        source: "telegram_group",
        telegramSurface: "group",
        telegramChatId: update.chatId,
        telegramGroupTitle: update.chatTitle,
        telegramRelevance: classification.kind,
        telegramShouldMoveToPrivate: classification.shouldMoveToPrivate
      },
      {
        messageType: "telegram_group_signal",
        senderType: "contact",
        sendStatus: "received",
        isRead: false,
        receivedAt: now
      }
    );

    const labels = uniqueStrings([
      classification.kind === "founder_signal" ? "founder" : null,
      classification.kind === "waitlist_signal" ? "waitlist" : null,
      classification.shouldMoveToPrivate ? "move_private" : null,
      "telegram_group"
    ]);

    await conversationPersistence.updateSession(session.id, {
      metadata: mergeMetadata(existingMetadata, {
        telegram: telegramMetadata,
        acquisition: {
          sourceLabel: "Telegram grupo curado",
          channelLabel: "Telegram"
        },
        community: {
          source: "telegram_group",
          relevance: classification.kind
        }
      }),
      lead_name: update.fromName || session.lead_name,
      thread_status: "waiting_human",
      waiting_for: "human",
      owner_mode: "hybrid",
      priority: classification.priority,
      unread_count: Math.max((session.unread_count || 0) + 1, 1),
      handoff_state: "requested",
      handoff_reason: classification.shouldMoveToPrivate
        ? "telegram_group_move_private"
        : "telegram_group_signal_review",
      follow_up_status: classification.followUpStatus,
      next_action_hint: classification.shouldMoveToPrivate
        ? "Avaliar resposta publica minima e puxar continuidade para o Telegram privado."
        : "Revisar sinal relevante do grupo curado e decidir resposta humana."
    });

    if (labels.length > 0) {
      await conversationPersistence.updateSession(session.id, {
        tags: labels
      });
    }

    const events: Array<{
      session_id: string;
      event_type: string;
      actor_type: "system" | "ai" | "human";
      actor_label?: string;
      event_data: Record<string, unknown>;
    }> = [
      {
        session_id: session.id,
        event_type: "telegram_group_signal_captured",
        actor_type: "system",
        event_data: {
          summary: "Mensagem relevante do grupo curado virou sinal operacional.",
          signalKind: classification.kind,
          shouldMoveToPrivate: classification.shouldMoveToPrivate,
          chatTitle: update.chatTitle
        }
      }
    ];

    let replySent = false;
    if (classification.shouldAutoReply) {
      const replyText = classification.shouldMoveToPrivate
        ? "Recebi seu ponto. Para preservar contexto e privacidade, seguimos melhor no privado com o bot. Me chame em @AdvNoemia_bot e a equipe acompanha por la."
        : "Recebi seu ponto aqui no grupo. Vou deixar esse sinal visivel para a equipe acompanhar com criterio.";

      const replyResult = await sendTelegramGroupMessage({
        chatId: update.chatId,
        text:
          update.username && !replyText.includes(`@${update.username}`)
            ? `@${update.username} ${replyText}`
            : replyText,
        replyToMessageId: update.messageId || null
      });

      replySent = replyResult.ok;

      await conversationPersistence.saveMessage(
        session.id,
        replyResult.messageId || undefined,
        "assistant",
        replyText,
        "outbound",
        {
          channel: "telegram",
          source: "telegram_group_guardrail",
          responseSurface: "telegram_group",
          telegramSurface: "group"
        },
        {
          messageType: "telegram_group_signal",
          senderType: "ai",
          sendStatus: replyResult.ok ? "sent" : "failed",
          deliveryStatus: replyResult.status,
          isRead: true,
          readAt: now,
          errorMessage: replyResult.error,
          failedAt: replyResult.ok ? null : now
        }
      );

      events.push({
        session_id: session.id,
        event_type: classification.shouldMoveToPrivate
          ? "telegram_group_redirected_private"
          : "telegram_group_guardrail_sent",
        actor_type: "ai",
        actor_label: "NoemIA",
        event_data: {
          summary: classification.shouldMoveToPrivate
            ? "Grupo recebeu orientacao elegante para continuidade no privado."
            : "Grupo recebeu resposta curta de moderacao operacional.",
          signalKind: classification.kind,
          replySent: replyResult.ok
        }
      });
    }

    await this.supabase.from("conversation_events").insert(events);

    if (classification.kind === "founder_signal") {
      await recordProductEvent({
        eventKey: "telegram_founder_signal",
        eventGroup: "ecosystem",
        pagePath: "/telegram/group",
        payload: { sessionId: session.id, chatId: update.chatId }
      });
    }

    if (classification.kind === "waitlist_signal") {
      await recordProductEvent({
        eventKey: "telegram_waitlist_signal",
        eventGroup: "ecosystem",
        pagePath: "/telegram/group",
        payload: { sessionId: session.id, chatId: update.chatId }
      });
    }

    await conversationPersistence.markEventProcessed(
      "telegram",
      update.updateId || update.messageId,
      update.messageId || undefined,
      externalUserId
    );

    return {
      ok: true,
      mode: "group",
      sessionId: session.id,
      replySent,
      signalKind: classification.kind
    };
  }
}

export const telegramConversationService = new TelegramConversationService();
