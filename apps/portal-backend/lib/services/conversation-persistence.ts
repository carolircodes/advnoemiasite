import { createWebhookSupabaseClient } from "../supabase/webhook";
import { clientService } from "./client-service";
import { clientIdentityService } from "./client-identity";

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
  client_id?: string; // Fase 1.2 - Vínculo com tabela unificada de clientes
  metadata?: Record<string, any>;
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
  private supabase = createWebhookSupabaseClient();

  private isMissingMetadataColumnError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error);
    return message.toLowerCase().includes("metadata") && message.toLowerCase().includes("column");
  }

  private isMissingProcessedWebhookExternalUserIdColumn(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error);

    return (
      message.toLowerCase().includes("external_user_id") &&
      message.toLowerCase().includes("column")
    );
  }

  // Método público para acessar supabase
  get supabaseClient() {
    return this.supabase;
  }

  // Verificar se evento já foi processado (idempotência)
  async isEventProcessed(
    channel: 'instagram' | 'whatsapp',
    externalEventId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
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
      const payload = {
        channel,
        external_event_id: externalEventId,
        external_message_id: externalMessageId,
        external_user_id: externalUserId,
        payload_hash: payloadHash || ''
      };

      const { error } = await this.supabase
        .from('processed_webhook_events')
        .insert(payload);

      if (error) {
        if (this.isMissingProcessedWebhookExternalUserIdColumn(error)) {
          const { external_user_id: _externalUserId, ...safePayload } = payload;

          console.warn('PROCESSED_EVENT_EXTERNAL_USER_ID_SKIPPED', {
            channel,
            externalEventId
          });

          const { error: retryError } = await this.supabase
            .from('processed_webhook_events')
            .insert(safePayload);

          if (!retryError) {
            return;
          }

          console.error('ERROR_MARKING_EVENT_PROCESSED_AFTER_RETRY:', retryError);
          return;
        }

        console.error('ERROR_MARKING_EVENT_PROCESSED:', error);
      }
    } catch (error) {
      console.error('ERROR_MARKING_EVENT_PROCESSED:', error);
    }
  }

  // Obter ou criar sessão de conversação (Fase 2.3 - Integrado com clientIdentityService)
  async getOrCreateSession(
    channel: 'instagram' | 'whatsapp' | 'site' | 'portal',
    externalUserId: string,
    externalThreadId?: string
  ): Promise<ConversationSession> {
    try {
      // Fase 2.2 - Para WhatsApp/Instagram, tratar como visitor/lead sem criar client
      // Isso evita o erro de profile_id NOT NULL na tabela clients
      let clientIdentity = null;
      
      // Apenas tentar criar client para canais que não sejam WhatsApp/Instagram
      // pois esses canais devem tratar usuários como visitors até conversão
      if (channel !== 'whatsapp' && channel !== 'instagram') {
        try {
          clientIdentity = await clientIdentityService.getOrCreateClientAndChannel({
            channel,
            externalUserId,
            externalThreadId
          });
          
          console.log('CLIENT_IDENTITY_PROCESSED', {
            clientId: clientIdentity.client.id,
            channelId: clientIdentity.clientChannel.id,
            isNewClient: clientIdentity.isNewClient,
            isNewChannel: clientIdentity.isNewChannel,
            pipelineUpdated: clientIdentity.pipelineUpdated
          });
        } catch (identityError) {
          console.error('CLIENT_IDENTITY_ERROR', identityError);
          // Continuar sem client_id para não quebrar o fluxo
        }
      } else {
        console.log('VISITOR_FLOW_SKIP_CLIENT_CREATION', {
          channel,
          externalUserId,
          reason: 'WhatsApp/Instagram users treated as visitors until conversion'
        });
      }

      // Tentar encontrar sessão existente
      const { data: existingSession, error: findError } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('channel', channel)
        .eq('external_user_id', externalUserId)
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('ERROR_FINDING_SESSION:', findError);
      }

      if (existingSession) {
        // Fase 2.3 - Se sessão existe mas não tem client_id, vincular agora (apenas para não WhatsApp/Instagram)
        // WhatsApp/Instagram devem permanecer como visitors até conversão manual
        if (!existingSession.client_id && clientIdentity && channel !== 'whatsapp' && channel !== 'instagram') {
          try {
            await clientIdentityService.linkClientToSession(existingSession.id, clientIdentity.client.id);
            
            // Atualizar objeto local com client_id
            existingSession.client_id = clientIdentity.client.id;
            
            console.log('CLIENT_LINKED_TO_EXISTING_SESSION', {
              sessionId: existingSession.id,
              clientId: clientIdentity.client.id,
              channel,
              externalUserId
            });
          } catch (linkError) {
            console.error('ERROR_LINKING_CLIENT_TO_EXISTING_SESSION', linkError);
            // Continuar sem client_id para não quebrar o fluxo
          }
        } else if (channel === 'whatsapp' || channel === 'instagram') {
          console.log('VISITOR_SESSION_MAINTAINED', {
            sessionId: existingSession.id,
            channel,
            externalUserId,
            reason: 'WhatsApp/Instagram session maintained without client_id'
          });
        }
        
        return existingSession;
      }

      // Criar nova sessão
      let newSessionData: any = {
        channel,
        external_user_id: externalUserId,
        external_thread_id: externalThreadId,
        lead_stage: 'initial'
      };

      // Fase 2.3 - Apenas vincular client_id para canais que não são WhatsApp/Instagram
      // WhatsApp/Instagram permanecem como visitors até conversão
      if (clientIdentity && channel !== 'whatsapp' && channel !== 'instagram') {
        newSessionData.client_id = clientIdentity.client.id;
        
        console.log('CLIENT_LINKED_TO_NEW_SESSION', {
          clientId: clientIdentity.client.id,
          channelId: clientIdentity.clientChannel.id,
          channel,
          externalUserId
        });
      } else if (channel === 'whatsapp' || channel === 'instagram') {
        console.log('VISITOR_SESSION_CREATED', {
          channel,
          externalUserId,
          reason: 'WhatsApp/Instagram session created without client_id'
        });
      }

      const { data: newSession, error: createError } = await this.supabase
        .from('conversation_sessions')
        .insert(newSessionData)
        .select()
        .single();

      if (createError) {
        console.error('ERROR_CREATING_SESSION:', createError);
        throw createError;
      }

      console.log('CONVERSATION_SESSION_CREATED', {
        channel,
        externalUserId,
        sessionId: newSession.id,
        clientId: newSession.client_id
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
      const payload = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('conversation_sessions')
        .update(payload)
        .eq('id', sessionId);

      if (error) {
        if ('metadata' in payload && this.isMissingMetadataColumnError(error)) {
          const { metadata: _metadata, ...safePayload } = payload;

          console.warn('SESSION_UPDATE_METADATA_SKIPPED', {
            sessionId,
            reason: 'metadata_column_missing'
          });

          const { error: retryError } = await this.supabase
            .from('conversation_sessions')
            .update(safePayload)
            .eq('id', sessionId);

          if (!retryError) {
            return;
          }

          console.error('ERROR_UPDATING_SESSION_AFTER_METADATA_RETRY:', retryError);
          throw retryError;
        }

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
      const { error } = await this.supabase
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
      const { data, error } = await this.supabase
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
      const cutoffTime = new Date(Date.now() - secondsThreshold * 1000).toISOString();

      const { data, error } = await this.supabase
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
