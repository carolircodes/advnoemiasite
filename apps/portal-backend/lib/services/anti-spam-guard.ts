import { traceOperationalEvent } from "../observability/operational-trace";
import { conversationPersistence, ConversationMessage } from './conversation-persistence';
import { buildWebhookEventPayloadHash } from "./webhook-idempotency";

export interface WebhookEvent {
  channel: 'instagram' | 'facebook' | 'whatsapp' | 'telegram' | 'youtube';
  externalEventId?: string;
  externalMessageId?: string;
  externalUserId: string;
  messageText?: string;
  isEcho?: boolean;
  messageType?: string;
  timestamp?: number;
  source?: string;
  threadKey?: string;
  providerEventType?: string;
  assetId?: string;
  commentId?: string;
}

export interface GuardResult {
  shouldRespond: boolean;
  reason?: string;
  sessionExists?: boolean;
  hasRecentResponse?: boolean;
  isDuplicate?: boolean;
  isSelfMessage?: boolean;
  isUnsupported?: boolean;
}

class AntiSpamGuard {
  private static readonly DEBOUNCE_SECONDS = 15;
  private static readonly MAX_MESSAGE_LENGTH = 5000;
  private static readonly MIN_MESSAGE_LENGTH = 1;

  private log(
    level: "info" | "warn" | "error",
    event: string,
    webhookEvent: WebhookEvent,
    metadata: Record<string, unknown> = {},
    sessionId?: string | null
  ) {
    traceOperationalEvent(
      level,
      event,
      {
        service: "anti_spam_guard",
        action: event.toLowerCase(),
        eventId: webhookEvent.externalEventId || webhookEvent.externalMessageId || null,
        sessionId: sessionId || null,
        channel: webhookEvent.channel,
        outcome: metadata.shouldRespond === true ? "allowed" : "blocked",
        decisionState: typeof metadata.reason === "string" ? metadata.reason : null
      },
      {
        externalUserId: webhookEvent.externalUserId,
        externalMessageId: webhookEvent.externalMessageId || null,
        externalEventId: webhookEvent.externalEventId || null,
        messageType: webhookEvent.messageType || "text",
        source: webhookEvent.source || null,
        threadKey: webhookEvent.threadKey || null,
        providerEventType: webhookEvent.providerEventType || null,
        assetId: webhookEvent.assetId || null,
        commentId: webhookEvent.commentId || null,
        messageLength: webhookEvent.messageText?.length || 0,
        ...metadata
      }
    );
  }

  // Verificar se deve responder ao evento
  async shouldRespondToEvent(event: WebhookEvent): Promise<GuardResult> {
    this.log("info", "ANTI_SPAM_GUARD_START", event);

    // 1. Verificar se é mensagem própria (echo)
    if (event.isEcho) {
      this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
        reason: "self_message",
        shouldRespond: false
      });
      return {
        shouldRespond: false,
        reason: 'self_message',
        isSelfMessage: true
      };
    }

    // 2. Verificar se há texto útil
    if (!event.messageText || !event.messageText.trim()) {
      this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
        reason: "no_text",
        shouldRespond: false
      });
      return {
        shouldRespond: false,
        reason: 'no_text',
        isUnsupported: true
      };
    }

    // 3. Verificar comprimento da mensagem
    if (event.messageText.length < AntiSpamGuard.MIN_MESSAGE_LENGTH) {
      this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
        reason: "too_short",
        shouldRespond: false
      });
      return {
        shouldRespond: false,
        reason: 'too_short'
      };
    }

    if (event.messageText.length > AntiSpamGuard.MAX_MESSAGE_LENGTH) {
      this.log("warn", "ANTI_SPAM_GUARD_BLOCKED", event, {
        reason: "too_long",
        shouldRespond: false
      });
      return {
        shouldRespond: false,
        reason: 'too_long'
      };
    }

    // 4. Verificar duplicidade por event ID
    if (event.externalEventId) {
      const isDuplicate = await conversationPersistence.isEventProcessed(
        event.channel,
        event.externalEventId
      );

      if (isDuplicate) {
        this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
          reason: "duplicate",
          shouldRespond: false,
          duplicateBy: "external_event_id"
        });
        return {
          shouldRespond: false,
          reason: 'duplicate',
          isDuplicate: true
        };
      }
    }

    // 5. Obter ou criar sessão
    let session;
    try {
      session = await conversationPersistence.getOrCreateSession(
        event.channel,
        event.externalUserId
      );
    } catch (error) {
      this.log("error", "ANTI_SPAM_GUARD_SESSION_ERROR", event, {
        reason: "session_error",
        shouldRespond: false,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        shouldRespond: false,
        reason: 'session_error'
      };
    }

    // 6. Verificar se houve resposta recente (debounce)
    const hasRecentResponse = await conversationPersistence.hasRecentResponse(
      session.id,
      AntiSpamGuard.DEBOUNCE_SECONDS
    );

    if (hasRecentResponse) {
      this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
        reason: "recent_response",
        shouldRespond: false,
        debounceSeconds: AntiSpamGuard.DEBOUNCE_SECONDS
      }, session.id);
      return {
        shouldRespond: false,
        reason: 'recent_response',
        sessionExists: true,
        hasRecentResponse: true
      };
    }

    // 7. Verificar repetição de conteúdo apenas quando não houver ID determinístico.
    // Para WhatsApp/Instagram, o message id deve ser a fonte principal de idempotência.
    if (!event.externalMessageId) {
      const recentMessages = await conversationPersistence.getRecentMessages(session.id, 5);
      const isRepeatedContent = this.checkRepeatedContent(event.messageText, recentMessages);

      if (isRepeatedContent) {
        this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
          reason: "repeated_content",
          shouldRespond: false,
          duplicateBy: "session_content_similarity"
        }, session.id);
        return {
          shouldRespond: false,
          reason: 'repeated_content',
          sessionExists: true
        };
      }
    }

    const payloadHash = buildWebhookEventPayloadHash({
      channel: event.channel,
      externalEventId: event.externalEventId,
      externalMessageId: event.externalMessageId,
      externalUserId: event.externalUserId,
      messageText: event.messageText,
      messageType: event.messageType,
      source: event.source,
      threadKey: event.threadKey,
      providerEventType: event.providerEventType,
      assetId: event.assetId,
      commentId: event.commentId,
      timestamp: event.timestamp
    });
    if (payloadHash) {
      const isDuplicatePayload = await conversationPersistence.isPayloadHashProcessed(
        event.channel,
        payloadHash,
        event.externalUserId
      );

      if (isDuplicatePayload) {
        this.log("info", "ANTI_SPAM_GUARD_BLOCKED", event, {
          reason: "duplicate_retry",
          shouldRespond: false,
          duplicateBy: "payload_hash"
        }, session.id);
        return {
          shouldRespond: false,
          reason: 'duplicate_retry',
          isDuplicate: true
        };
      }
    }

    this.log("info", "ANTI_SPAM_GUARD_PASSED", event, {
      shouldRespond: true,
      debounceSeconds: AntiSpamGuard.DEBOUNCE_SECONDS
    }, session.id);

    return {
      shouldRespond: true,
      sessionExists: true,
      hasRecentResponse: false,
      isDuplicate: false,
      isSelfMessage: false,
      isUnsupported: false
    };
  }

  // Verificar se conteúdo é repetido
  private checkRepeatedContent(
    currentMessage: string,
    recentMessages: ConversationMessage[]
  ): boolean {
    if (recentMessages.length === 0) {
      return false;
    }

    const currentText = currentMessage.toLowerCase().trim();
    
    // Verificar mensagens anteriores do usuário
    const userMessages = recentMessages.filter(msg => msg.role === 'user');
    
    for (const msg of userMessages) {
      const previousText = msg.content.toLowerCase().trim();
      
      // Similaridade exata
      if (previousText === currentText) {
        return true;
      }
      
      // Similaridade alta (>90%)
      if (this.calculateSimilarity(currentText, previousText) > 0.9) {
        return true;
      }
    }

    return false;
  }

  // Calcular similaridade entre duas strings (algoritmo simplificado)
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Distância de Levenshtein simplificada
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Marcar evento como processado após resposta bem-sucedida
  async markEventProcessed(event: WebhookEvent): Promise<void> {
    const payloadHash = buildWebhookEventPayloadHash({
      channel: event.channel,
      externalEventId: event.externalEventId,
      externalMessageId: event.externalMessageId,
      externalUserId: event.externalUserId,
      messageText: event.messageText,
      messageType: event.messageType,
      source: event.source,
      threadKey: event.threadKey,
      providerEventType: event.providerEventType,
      assetId: event.assetId,
      commentId: event.commentId,
      timestamp: event.timestamp
    });
    const resolvedEventId =
      event.externalEventId ||
      event.externalMessageId ||
      (payloadHash ? `payload:${event.channel}:${payloadHash}` : null);

    if (!resolvedEventId) {
      this.log("warn", "ANTI_SPAM_GUARD_MARK_SKIPPED", event, {
        reason: "missing_durable_event_identity",
        shouldRespond: true
      });
      return;
    }

    await conversationPersistence.markEventProcessed(
      event.channel,
      resolvedEventId,
      event.externalMessageId,
      event.externalUserId,
      payloadHash || undefined
    );

    this.log("info", "ANTI_SPAM_GUARD_MARKED_PROCESSED", event, {
      reason: "marked_processed",
      shouldRespond: true,
      resolvedEventId,
      payloadHashPresent: Boolean(payloadHash)
    });
  }

  // Obter estatísticas do guard
  getGuardStats(): {
    debounceSeconds: number;
    maxMessageLength: number;
    minMessageLength: number;
  } {
    return {
      debounceSeconds: AntiSpamGuard.DEBOUNCE_SECONDS,
      maxMessageLength: AntiSpamGuard.MAX_MESSAGE_LENGTH,
      minMessageLength: AntiSpamGuard.MIN_MESSAGE_LENGTH
    };
  }
}

export const antiSpamGuard = new AntiSpamGuard();
