import { createWebhookSupabaseClient } from "../supabase/webhook.ts";
import { clientService } from "./client-service.ts";
import { clientIdentityService } from "./client-identity.ts";
import { isLegacySchemaFallbackAllowed } from "../schema/compatibility.ts";
import { commercialRelationshipService } from "./commercial-relationship.ts";

export interface ConversationSession {
  id: string;
  channel: 'instagram' | 'facebook' | 'whatsapp' | 'site' | 'portal' | 'telegram' | 'youtube';
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
  thread_status?:
    | 'new'
    | 'unread'
    | 'waiting_human'
    | 'waiting_client'
    | 'ai_active'
    | 'handoff'
    | 'closed'
    | 'archived';
  waiting_for?: 'human' | 'client' | 'ai' | 'none';
  owner_mode?: 'ai' | 'human' | 'hybrid';
  owner_user_id?: string;
  priority?: 'low' | 'medium' | 'high';
  unread_count?: number;
  handoff_state?: 'none' | 'requested' | 'active' | 'resolved';
  handoff_reason?: string;
  ai_enabled?: boolean;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_direction?: 'inbound' | 'outbound';
  last_human_reply_at?: string;
  last_ai_reply_at?: string;
  closed_at?: string;
  archived_at?: string;
  internal_notes?: string;
  tags?: unknown[];
  next_action_hint?: string;
  priority_source?: 'manual' | 'inferred' | 'hybrid';
  sensitivity_level?: 'low' | 'normal' | 'high';
  follow_up_status?: 'none' | 'pending' | 'due' | 'overdue' | 'resolved' | 'converted';
  follow_up_due_at?: string;
  follow_up_resolved_at?: string;
  last_status_event_at?: string;
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

export type ConversationMessageWriteOptions = {
  messageType?: string;
  senderType?: 'contact' | 'ai' | 'human' | 'system';
  sendStatus?: 'received' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveryStatus?: string | null;
  isRead?: boolean;
  readAt?: string | null;
  errorMessage?: string | null;
  attachments?: unknown[];
  receivedAt?: string | null;
  failedAt?: string | null;
};

export interface ProcessedWebhookEvent {
  id: string;
  channel: 'instagram' | 'facebook' | 'whatsapp' | 'telegram' | 'youtube';
  external_event_id: string;
  external_message_id?: string;
  external_user_id?: string;
  payload_hash?: string | null;
  response_sent_at?: string | null;
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

  private isMissingProcessedWebhookPayloadHashColumn(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error);

    return message.toLowerCase().includes("payload_hash") && message.toLowerCase().includes("column");
  }

  private isMissingProcessedWebhookResponseSentAtColumn(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error);

    return (
      message.toLowerCase().includes("response_sent_at") &&
      message.toLowerCase().includes("column")
    );
  }

  private isUniqueViolation(error: unknown) {
    if (typeof error !== 'object' || !error) {
      return false;
    }

    const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
    return code === '23505';
  }

  // Método público para acessar supabase
  get supabaseClient() {
    return this.supabase;
  }

  // Verificar se evento já foi processado (idempotência)
  async isEventProcessed(
    channel: 'instagram' | 'facebook' | 'whatsapp' | 'telegram' | 'youtube',
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
    channel: 'instagram' | 'facebook' | 'whatsapp' | 'telegram' | 'youtube',
    externalEventId: string,
    externalMessageId?: string,
    externalUserId?: string,
    payloadHash?: string,
    responseSentAt?: string
  ): Promise<void> {
    try {
      const payload = {
        channel,
        external_event_id: externalEventId,
        external_message_id: externalMessageId,
        external_user_id: externalUserId,
        payload_hash: payloadHash || '',
        response_sent_at: responseSentAt || new Date().toISOString()
      };

      const candidates: Array<{
        label: string;
        data: Record<string, unknown>;
      }> = [
        {
          label: 'full_payload',
          data: payload
        },
        {
          label: 'without_external_user_id',
          data: (() => {
            const { external_user_id: _externalUserId, ...safePayload } = payload;
            return safePayload;
          })()
        },
        {
          label: 'without_payload_hash',
          data: (() => {
            const { payload_hash: _payloadHash, ...safePayload } = payload;
            return safePayload;
          })()
        },
        {
          label: 'without_response_sent_at',
          data: (() => {
            const { response_sent_at: _responseSentAt, ...safePayload } = payload;
            return safePayload;
          })()
        },
        {
          label: 'minimal_legacy_payload',
          data: (() => {
            const {
              external_user_id: _externalUserId,
              payload_hash: _payloadHash,
              response_sent_at: _responseSentAt,
              ...safePayload
            } = payload;
            return safePayload;
          })()
        }
      ];

      for (const candidate of candidates) {
        const { error } = await this.supabase
          .from('processed_webhook_events')
          .insert(candidate.data);

        if (!error) {
          if (candidate.label !== 'full_payload') {
            console.warn('PROCESSED_EVENT_MARKED_WITH_FALLBACK_PAYLOAD', {
              channel,
              externalEventId,
              strategy: candidate.label
            });
          }

          return;
        }

        if (this.isUniqueViolation(error)) {
          console.log('PROCESSED_EVENT_ALREADY_MARKED', {
            channel,
            externalEventId,
            strategy: candidate.label
          });
          return;
        }

        const missingExternalUserId = this.isMissingProcessedWebhookExternalUserIdColumn(error);
        const missingPayloadHash = this.isMissingProcessedWebhookPayloadHashColumn(error);
        const missingResponseSentAt = this.isMissingProcessedWebhookResponseSentAtColumn(error);

        const isExpectedLegacyDrift =
          (candidate.label === 'full_payload' &&
            (missingExternalUserId || missingPayloadHash || missingResponseSentAt)) ||
          (candidate.label === 'without_external_user_id' &&
            (missingPayloadHash || missingResponseSentAt)) ||
          (candidate.label === 'without_payload_hash' &&
            (missingExternalUserId || missingResponseSentAt)) ||
          (candidate.label === 'without_response_sent_at' &&
            (missingExternalUserId || missingPayloadHash));

        if (isExpectedLegacyDrift) {
          if (!isLegacySchemaFallbackAllowed()) {
            console.error('PROCESSED_EVENT_SCHEMA_DRIFT_BLOCKED', {
              channel,
              externalEventId,
              strategy: candidate.label,
              missingExternalUserId,
              missingPayloadHash,
              missingResponseSentAt
            });
            throw error;
          }

          console.warn('PROCESSED_EVENT_SCHEMA_DRIFT_RETRY', {
            channel,
            externalEventId,
            strategy: candidate.label,
            missingExternalUserId,
            missingPayloadHash,
            missingResponseSentAt
          });
          continue;
        }

        console.error('ERROR_MARKING_EVENT_PROCESSED_PRIMARY', {
          channel,
          externalEventId,
          strategy: candidate.label,
          error
        });
        return;
      }

      console.error('ERROR_MARKING_EVENT_PROCESSED_AFTER_FALLBACKS', {
        channel,
        externalEventId,
        attemptedStrategies: candidates.map((candidate) => candidate.label)
      });
    } catch (error) {
      console.error('ERROR_MARKING_EVENT_PROCESSED_FATAL:', {
        channel,
        externalEventId,
        error
      });
    }
  }

  async isPayloadHashProcessed(
    channel: 'instagram' | 'facebook' | 'whatsapp' | 'telegram' | 'youtube',
    payloadHash: string,
    externalUserId?: string
  ): Promise<boolean> {
    if (!payloadHash.trim()) {
      return false;
    }

    try {
      let query = this.supabase
        .from('processed_webhook_events')
        .select('id')
        .eq('channel', channel)
        .eq('payload_hash', payloadHash)
        .limit(1);

      if (externalUserId?.trim()) {
        query = query.eq('external_user_id', externalUserId.trim());
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        if (this.isMissingProcessedWebhookPayloadHashColumn(error)) {
          console.warn('PROCESSED_EVENT_PAYLOAD_HASH_UNAVAILABLE', {
            channel,
            hasExternalUserId: Boolean(externalUserId?.trim())
          });
          return false;
        }

        throw error;
      }

      return Boolean(data?.id);
    } catch (error) {
      console.error('ERROR_CHECKING_EVENT_PAYLOAD_HASH_PROCESSED:', error);
      return false;
    }
  }

  // Obter ou criar sessão de conversação (Fase 2.3 - Integrado com clientIdentityService)
  async getOrCreateSession(
    channel: 'instagram' | 'facebook' | 'whatsapp' | 'site' | 'portal' | 'telegram' | 'youtube',
    externalUserId: string,
    externalThreadId?: string
  ): Promise<ConversationSession> {
    try {
      // Fase 2.2 - Para WhatsApp/Instagram, tratar como visitor/lead sem criar client
      // Isso evita o erro de profile_id NOT NULL na tabela clients
      let clientIdentity = null;
      
      // Apenas o portal autenticado tenta resolver client_id automaticamente.
      // Site, WhatsApp e Instagram permanecem como leads/visitantes até qualificação real.
      if (channel === 'portal') {
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
        if (!existingSession.client_id && clientIdentity && channel === 'portal') {
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
        } else if (
          channel === 'whatsapp' ||
          channel === 'instagram' ||
          channel === 'facebook' ||
          channel === 'site' ||
          channel === 'telegram' ||
          channel === 'youtube'
        ) {
          console.log('VISITOR_SESSION_MAINTAINED', {
            sessionId: existingSession.id,
            channel,
            externalUserId,
            reason: 'Lead session maintained without client_id until qualification'
          });
        }
        
        try {
          await commercialRelationshipService.ensureSessionCommercialLink(existingSession.id);
        } catch (linkError) {
          console.warn('COMMERCIAL_THREAD_LINK_ERROR', {
            sessionId: existingSession.id,
            channel,
            externalUserId,
            reason: linkError instanceof Error ? linkError.message : String(linkError)
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

      // Apenas o portal autenticado nasce com client_id automático.
      if (clientIdentity && channel === 'portal') {
        newSessionData.client_id = clientIdentity.client.id;
        
        console.log('CLIENT_LINKED_TO_NEW_SESSION', {
          clientId: clientIdentity.client.id,
          channelId: clientIdentity.clientChannel.id,
          channel,
          externalUserId
        });
      } else if (
        channel === 'whatsapp' ||
        channel === 'instagram' ||
        channel === 'facebook' ||
        channel === 'site' ||
        channel === 'telegram' ||
        channel === 'youtube'
      ) {
        console.log('VISITOR_SESSION_CREATED', {
          channel,
          externalUserId,
          reason: 'Lead session created without client_id until qualification'
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

      try {
        await commercialRelationshipService.ensureSessionCommercialLink(newSession.id);
      } catch (linkError) {
        console.warn('COMMERCIAL_THREAD_LINK_ERROR', {
          sessionId: newSession.id,
          channel,
          externalUserId,
          reason: linkError instanceof Error ? linkError.message : String(linkError)
        });
      }

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
          if (!isLegacySchemaFallbackAllowed()) {
            console.error('SESSION_UPDATE_METADATA_SCHEMA_DRIFT_BLOCKED', {
              sessionId,
              reason: 'metadata_column_missing'
            });
            throw error;
          }

          const { metadata: _metadata, ...safePayload } = payload;

          console.warn('SESSION_UPDATE_METADATA_SCHEMA_DRIFT', {
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

          console.error('ERROR_UPDATING_SESSION_SECONDARY_AFTER_METADATA_RETRY:', {
            sessionId,
            reason: 'metadata_column_missing',
            error: retryError
          });
          throw retryError;
        }

        console.error('ERROR_UPDATING_SESSION_PRIMARY:', {
          sessionId,
          error
        });
        throw error;
      }
    } catch (error) {
      console.error('ERROR_UPDATING_SESSION_FATAL:', {
        sessionId,
        error
      });
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
    metadata?: Record<string, any>,
    options: ConversationMessageWriteOptions = {}
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('conversation_messages')
        .insert({
          session_id: sessionId,
          external_message_id: externalMessageId,
          role,
          content,
          direction,
          metadata_json: metadata || {},
          message_type: options.messageType || 'text',
          sender_type:
            options.senderType ||
            (role === 'user'
              ? 'contact'
              : role === 'system'
                ? 'system'
                : 'ai'),
          send_status:
            options.sendStatus ||
            (direction === 'inbound' ? 'received' : externalMessageId ? 'sent' : 'pending'),
          delivery_status: options.deliveryStatus || null,
          is_read: options.isRead ?? direction === 'outbound',
          read_at: options.readAt ?? (direction === 'outbound' ? now : null),
          error_message: options.errorMessage || null,
          attachments: options.attachments || [],
          received_at: options.receivedAt ?? (direction === 'inbound' ? now : null),
          failed_at: options.failedAt || null
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
