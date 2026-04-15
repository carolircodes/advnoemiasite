import { conversationPersistence, ConversationMessage } from './conversation-persistence';

export interface WebhookEvent {
  channel: 'instagram' | 'whatsapp' | 'telegram';
  externalEventId?: string;
  externalMessageId?: string;
  externalUserId: string;
  messageText?: string;
  isEcho?: boolean;
  messageType?: string;
  timestamp?: number;
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

  // Verificar se deve responder ao evento
  async shouldRespondToEvent(event: WebhookEvent): Promise<GuardResult> {
    console.log('ANTI_SPAM_GUARD_START', {
      channel: event.channel,
      externalUserId: event.externalUserId,
      externalEventId: event.externalEventId,
      externalMessageId: event.externalMessageId,
      messageLength: event.messageText?.length || 0
    });

    // 1. Verificar se é mensagem própria (echo)
    if (event.isEcho) {
      console.log('EVENT_IGNORED_SELF_MESSAGE: Ignoring own message');
      return {
        shouldRespond: false,
        reason: 'self_message',
        isSelfMessage: true
      };
    }

    // 2. Verificar se há texto útil
    if (!event.messageText || !event.messageText.trim()) {
      console.log('EVENT_IGNORED_NO_TEXT: No useful text content');
      return {
        shouldRespond: false,
        reason: 'no_text',
        isUnsupported: true
      };
    }

    // 3. Verificar comprimento da mensagem
    if (event.messageText.length < AntiSpamGuard.MIN_MESSAGE_LENGTH) {
      console.log('EVENT_IGNORED_TOO_SHORT: Message too short');
      return {
        shouldRespond: false,
        reason: 'too_short'
      };
    }

    if (event.messageText.length > AntiSpamGuard.MAX_MESSAGE_LENGTH) {
      console.log('EVENT_IGNORED_TOO_LONG: Message too long');
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
        console.log('EVENT_IGNORED_DUPLICATE: Event already processed', {
          channel: event.channel,
          externalEventId: event.externalEventId
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
      console.error('ERROR_GETTING_SESSION_FOR_GUARD:', error);
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
      console.log('EVENT_IGNORED_RECENT_RESPONSE: Response sent recently', {
        sessionId: session.id,
        debounceSeconds: AntiSpamGuard.DEBOUNCE_SECONDS
      });
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
        console.log('EVENT_IGNORED_REPEATED_CONTENT: Similar message without deterministic message id');
        return {
          shouldRespond: false,
          reason: 'repeated_content',
          sessionExists: true
        };
      }
    }

    console.log('ANTI_SPAM_GUARD_PASSED', {
      sessionId: session.id,
      channel: event.channel,
      externalUserId: event.externalUserId
    });

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
    if (event.externalEventId) {
      await conversationPersistence.markEventProcessed(
        event.channel,
        event.externalEventId,
        event.externalMessageId,
        event.externalUserId
      );
    }
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
