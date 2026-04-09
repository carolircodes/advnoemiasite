import { createWebhookSupabaseClient } from '../supabase/webhook';

interface InstagramMessage {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  from?: { id: string };
  to?: { id: string };
  type?: string;
}

interface InstagramEvent {
  sender?: { id: string };
  recipient?: { id: string };
  message?: InstagramMessage;
}

class InstagramMessageGuard {
  private supabase = createWebhookSupabaseClient();

  // Verificar se evento deve ser ignorado
  async shouldIgnoreEvent(
    event: InstagramEvent,
    sessionId?: string
  ): Promise<{ shouldIgnore: boolean; reason?: string }> {
    const messageId = event.message?.mid;
    const messageText = event.message?.text?.trim();
    const isEcho = event.message?.is_echo === true;

    // 1. Ignorar mensagens echo (próprias mensagens da conta)
    if (isEcho) {
      console.log('INSTAGRAM_EVENT_IGNORED_ECHO: Mensagem echo detectada');
      return { shouldIgnore: true, reason: 'echo_message' };
    }

    // 2. Ignorar se sender/recipient indicar mensagem da própria conta
    if (event.sender?.id === event.recipient?.id) {
      console.log('INSTAGRAM_EVENT_IGNORED_SELF: Mensagem para si mesmo');
      return { shouldIgnore: true, reason: 'self_message' };
    }

    // 3. Ignorar se não tiver texto útil
    if (!messageText || messageText.length === 0) {
      console.log('INSTAGRAM_EVENT_IGNORED_NO_TEXT: Sem texto útil');
      return { shouldIgnore: true, reason: 'no_text' };
    }

    // 4. Ignorar se não tiver message ID
    if (!messageId) {
      console.log('INSTAGRAM_EVENT_IGNORED_NO_MID: Sem message ID');
      return { shouldIgnore: true, reason: 'no_mid' };
    }

    // 5. Verificar idempotência por MID
    const wasProcessed = await this.wasMessageProcessed(messageId);
    if (wasProcessed) {
      console.log('INSTAGRAM_EVENT_IGNORED_DUPLICATE_MID: MID já processado');
      return { shouldIgnore: true, reason: 'duplicate_mid' };
    }

    // 6. Verificar duplicidade de conteúdo na mesma sessão (últimas 2 horas)
    if (sessionId) {
      const isDuplicateContent = await this.isDuplicateContentInSession(
        sessionId,
        messageText,
        event.sender?.id
      );
      
      if (isDuplicateContent) {
        console.log('INSTAGRAM_EVENT_IGNORED_DUPLICATE_CONTENT: Conteúdo duplicado na sessão');
        return { shouldIgnore: true, reason: 'duplicate_content' };
      }
    }

    // 7. Verificar se é replay antigo de thread
    const isOldReplay = await this.isOldThreadReply(messageId, event.sender?.id);
    if (isOldReplay) {
      console.log('INSTAGRAM_EVENT_IGNORED_REPLAY: Replay antigo de thread');
      return { shouldIgnore: true, reason: 'old_replay' };
    }

    // 8. Verificar se fallback de texto já foi enviado recentemente para mesma sessão
    if (sessionId) {
      const fallbackSentRecently = await this.wasFallbackSentRecently(sessionId);
      if (fallbackSentRecently) {
        console.log('INSTAGRAM_FALLBACK_BLOCKED_REPEAT: Fallback já enviado recentemente');
        return { shouldIgnore: true, reason: 'fallback_recent' };
      }
    }

    return { shouldIgnore: false };
  }

  // Verificar se MID já foi processado
  private async wasMessageProcessed(messageId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('processed_webhook_events')
        .select('id')
        .eq('channel', 'instagram')
        .eq('external_message_id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('ERROR_CHECKING_MID_PROCESSED:', error);
        return true; // Em caso de erro, assume que já foi processado
      }

      return !!data;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_MID_PROCESSED:', error);
      return true;
    }
  }

  // Verificar duplicidade de conteúdo na mesma sessão (últimas 2 horas)
  private async isDuplicateContentInSession(
    sessionId: string,
    messageText: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('conversation_messages')
        .select('content, created_at')
        .eq('session_id', sessionId)
        .eq('direction', 'inbound')
        .eq('role', 'user')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.log('ERROR_CHECKING_DUPLICATE_CONTENT:', error);
        return false;
      }

      // Normalizar texto para comparação
      const normalizedMessage = messageText.toLowerCase().trim();
      
      return data?.some(msg => 
        msg.content.toLowerCase().trim() === normalizedMessage
      ) || false;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_DUPLICATE_CONTENT:', error);
      return false;
    }
  }

  // Verificar se é replay antigo de thread (mais de 24 horas)
  private async isOldThreadReply(messageId: string, userId?: string): Promise<boolean> {
    try {
      // Para Instagram, consideramos replay antigo se o MID for muito antigo
      // Esta é uma implementação simplificada
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('processed_webhook_events')
        .select('processed_at')
        .eq('channel', 'instagram')
        .eq('external_message_id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('ERROR_CHECKING_OLD_THREAD:', error);
        return false;
      }

      if (!data) {
        return false; // Primeira vez que vemos este MID
      }

      return data.processed_at < oneDayAgo;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_OLD_THREAD:', error);
      return false;
    }
  }

  // Verificar se fallback foi enviado recentemente (última hora)
  private async wasFallbackSentRecently(sessionId: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('conversation_messages')
        .select('content, created_at')
        .eq('session_id', sessionId)
        .eq('direction', 'outbound')
        .eq('role', 'assistant')
        .ilike('content', '%este atendimento está habilitado apenas para mensagens escritas%')
        .gte('created_at', oneHourAgo)
        .limit(1);

      if (error) {
        console.log('ERROR_CHECKING_FALLBACK_RECENT:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_FALLBACK_RECENT:', error);
      return false;
    }
  }

  // Marcar mensagem como processada
  async markMessageAsProcessed(
    messageId: string,
    userId?: string,
    responseSent: boolean = false
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('processed_webhook_events')
        .insert({
          channel: 'instagram',
          external_event_id: `msg_${messageId}_${Date.now()}`,
          external_message_id: messageId,
          external_user_id: userId,
          payload_hash: messageId, // Simplificado
          processed_at: new Date().toISOString(),
          response_sent_at: responseSent ? new Date().toISOString() : null
        });

      if (error) {
        console.log('ERROR_MARKING_MESSAGE_PROCESSED:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.log('EXCEPTION_MARKING_MESSAGE_PROCESSED:', error);
      return false;
    }
  }

  // Verificar se deve usar fallback de "mensagens escritas"
  shouldUseTextOnlyFallback(messageType?: string, messageText?: string): boolean {
    // Só usar fallback para formatos não suportados
    const supportedTypes = ['text'];
    
    if (messageType && !supportedTypes.includes(messageType)) {
      console.log('INSTAGRAM_FALLBACK_TRIGGERED: Tipo não suportado', messageType);
      return true;
    }

    // Se não tiver texto, mas tiver outro tipo, usar fallback
    if (!messageText?.trim() && messageType && messageType !== 'text') {
      console.log('INSTAGRAM_FALLBACK_TRIGGERED: Sem texto mas tem conteúdo não-texto');
      return true;
    }

    return false;
  }
}

export const instagramMessageGuard = new InstagramMessageGuard();
