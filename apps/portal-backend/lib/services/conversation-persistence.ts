import { createServerSupabaseClient } from "../supabase/server";

export interface ConversationSession {
  id: string;
  channel: 'instagram' | 'whatsapp' | 'site' | 'portal';
  external_user_id: string;
  external_thread_id?: string;
  lead_name?: string;
  lead_stage?: string;
  case_area?: string;
  current_intent?: string;
  last_summary?: string;
  handoff_to_human?: boolean;
  last_inbound_at?: string;
  last_outbound_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  external_message_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  direction: 'inbound' | 'outbound';
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface ProcessedWebhookEvent {
  id: string;
  channel: 'instagram' | 'whatsapp';
  external_event_id: string;
  external_message_id?: string;
  external_user_id?: string;
  payload_hash: string;
  processed_at: string;
}

class ConversationPersistenceService {
  private supabase = createServerSupabaseClient();

  // Verificar se evento já foi processado (idempotência)
  async isEventProcessed(
    channel: 'instagram' | 'whatsapp',
    externalEventId: string
  ): Promise<boolean> {
    try {
      const supabase = await this.supabase;
      const { data, error } = await supabase
        .from('processed_webhook_events')
        .select('id')
        .eq('channel', channel)
        .eq('external_event_id', externalEventId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('ERROR_CHECKING_EVENT_PROCESSED:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('ERROR_CHECKING_EVENT_PROCESSED:', error);
      return false;
    }
  }

  // Marcar evento como processado
  async markEventProcessed(
    channel: 'instagram' | 'whatsapp',
    externalEventId: string,
    externalMessageId?: string,
    externalUserId?: string,
    payloadHash?: string
  ): Promise<void> {
    try {
      const supabase = await this.supabase;
      const { error } = await supabase
        .from('processed_webhook_events')
        .insert({
          channel,
          external_event_id: externalEventId,
          external_message_id: externalMessageId,
          external_user_id: externalUserId,
          payload_hash: payloadHash || ''
        });

      if (error) {
        console.error('ERROR_MARKING_EVENT_PROCESSED:', error);
      }
    } catch (error) {
      console.error('ERROR_MARKING_EVENT_PROCESSED:', error);
    }
  }

  // Obter ou criar sessão de conversação
  async getOrCreateSession(
    channel: 'instagram' | 'whatsapp' | 'site' | 'portal',
    externalUserId: string,
    externalThreadId?: string
  ): Promise<ConversationSession> {
    try {
      const client = await this.supabase;
      // Tentar encontrar sessão existente
      const { data: existingSession, error: findError } = await client
        .from('conversation_sessions')
        .select('*')
        .eq('channel', channel)
        .eq('external_user_id', externalUserId)
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('ERROR_FINDING_SESSION:', findError);
      }

      if (existingSession) {
        return existingSession;
      }

      // Criar nova sessão
      const { data: newSession, error: createError } = await client
        .from('conversation_sessions')
        .insert({
          channel,
          external_user_id: externalUserId,
          external_thread_id: externalThreadId,
          lead_stage: 'initial'
        })
        .select()
        .single();

      if (createError) {
        console.error('ERROR_CREATING_SESSION:', createError);
        throw createError;
      }

      console.log('CONVERSATION_SESSION_CREATED', {
        channel,
        externalUserId,
        sessionId: newSession.id
      });

      return newSession;
    } catch (error) {
      console.error('ERROR_GET_OR_CREATE_SESSION:', error);
      throw error;
    }
  }

  // Atualizar sessão com informações da conversação
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<ConversationSession, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    try {
      const supabase = await this.supabase;
      const { error } = await supabase
        .from('conversation_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('ERROR_UPDATING_SESSION:', error);
        throw error;
      }
    } catch (error) {
      console.error('ERROR_UPDATING_SESSION:', error);
      throw error;
    }
  }

  // Salvar mensagem da conversação
  async saveMessage(
    sessionId: string,
    externalMessageId: string | undefined,
    role: 'user' | 'assistant' | 'system',
    content: string,
    direction: 'inbound' | 'outbound',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = await this.supabase;
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          session_id: sessionId,
          external_message_id: externalMessageId,
          role,
          content,
          direction,
          metadata_json: metadata || {}
        });

      if (error) {
        console.error('ERROR_SAVING_MESSAGE:', error);
        throw error;
      }
    } catch (error) {
      console.error('ERROR_SAVING_MESSAGE:', error);
      throw error;
    }
  }

  // Obter histórico de mensagens recentes
  async getRecentMessages(
    sessionId: string,
    limit: number = 20
  ): Promise<ConversationMessage[]> {
    try {
      const supabase = await this.supabase;
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('ERROR_GETTING_RECENT_MESSAGES:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('ERROR_GETTING_RECENT_MESSAGES:', error);
      return [];
    }
  }

  // Verificar se houve resposta recente (anti-spam)
  async hasRecentResponse(
    sessionId: string,
    secondsThreshold: number = 15
  ): Promise<boolean> {
    try {
      const supabase = await this.supabase;
      const cutoffTime = new Date(Date.now() - secondsThreshold * 1000).toISOString();

      const { data, error } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('session_id', sessionId)
        .eq('direction', 'outbound')
        .gte('created_at', cutoffTime)
        .limit(1);

      if (error) {
        console.error('ERROR_CHECKING_RECENT_RESPONSE:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('ERROR_CHECKING_RECENT_RESPONSE:', error);
      return false;
    }
  }

  // Gerar resumo automático da conversação
  async generateConversationSummary(
    sessionId: string,
    messages: ConversationMessage[]
  ): Promise<string> {
    try {
      // Se tiver poucas mensagens, não precisa resumir
      if (messages.length <= 6) {
        return '';
      }

      // Extrair as mensagens mais recentes para contexto
      const recentMessages = messages
        .slice(0, 8)
        .reverse()
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Gerar resumo simples baseado em palavras-chave
      const userMessages = messages.filter(msg => msg.role === 'user');
      const lastUserMessage = userMessages[0]?.content || '';
      
      // Detectar área jurídica baseada nas mensagens
      const text = userMessages.map(msg => msg.content).join(' ').toLowerCase();
      let detectedArea = 'geral';
      
      if (text.includes('aposentadoria') || text.includes('inss') || text.includes('benefício')) {
        detectedArea = 'previdenciário';
      } else if (text.includes('banco') || text.includes('empréstimo') || text.includes('cobrança')) {
        detectedArea = 'bancário';
      } else if (text.includes('divórcio') || text.includes('pensão') || text.includes('guarda')) {
        detectedArea = 'família';
      } else if (text.includes('contrato') || text.includes('dano') || text.includes('indenização')) {
        detectedArea = 'civil';
      }

      const summary = `Cliente com caso aparentemente na área ${detectedArea}. Última mensagem: "${lastUserMessage.substring(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"`;
      
      // Atualizar resumo na sessão
      await this.updateSession(sessionId, {
        last_summary: summary,
        case_area: detectedArea
      });

      return summary;
    } catch (error) {
      console.error('ERROR_GENERATING_SUMMARY:', error);
      return '';
    }
  }
}

export const conversationPersistence = new ConversationPersistenceService();
