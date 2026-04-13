/**
 * Serviço de Envio Assistido de Follow-up
 * Implementa a FASE 7 - Envio assistido pelo painel com aprovação
 */

import { createWebhookSupabaseClient } from '../supabase/webhook';
import { sendWhatsAppMessage } from '../meta/whatsapp-service';

interface SendAssistedFollowUpParams {
  clientId: string;
  pipelineId: string;
  followUpMessageId?: string;
  channel: 'whatsapp' | 'instagram';
  content: string;
  approvedBy: string;
  messageType?: string;
  originalMessageId?: string;
}

interface ClientChannel {
  id: string;
  client_id: string;
  channel: 'whatsapp' | 'instagram' | 'portal' | 'site';
  external_user_id: string;
  is_active: boolean;
  created_at: string;
  last_contact_at?: string;
}

interface FollowUpMessage {
  id: string;
  client_id: string;
  pipeline_id: string;
  message_type: string;
  content: string;
  channel: 'whatsapp' | 'instagram' | 'portal' | 'site';
  status: 'pending' | 'sent' | 'replied' | 'cancelled';
  scheduled_at?: string;
  sent_at?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
}

interface ClientPipeline {
  id: string;
  client_id: string;
  stage: string;
  lead_temperature: string;
  priority_score: number;
  follow_up_status: string;
  last_contact_at?: string;
  next_follow_up_at?: string;
  consultation_offered_at?: string;
  consultation_scheduled_at?: string;
  proposal_sent_at?: string;
  contract_pending_at?: string;
  closed_won_at?: string;
  closed_lost_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SendAssistedFollowUpResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channelUsed?: string;
  contentSent?: string;
}

class AssistedFollowUpService {
  private supabase = createWebhookSupabaseClient();

  /**
   * Função principal de envio assistido
   */
  async sendAssistedFollowUp(params: SendAssistedFollowUpParams): Promise<SendAssistedFollowUpResult> {
    try {
      console.log('ASSISTED_SEND_START', {
        clientId: params.clientId,
        pipelineId: params.pipelineId,
        channel: params.channel,
        approvedBy: params.approvedBy,
        followUpMessageId: params.followUpMessageId
      });

      // 1. Validar se o cliente existe
      const clientValidation = await this.validateClient(params.clientId);
      if (!clientValidation.valid) {
        console.log('ASSISTED_SEND_VALIDATION_FAILED', {
          reason: 'client_invalid',
          clientId: params.clientId,
          error: clientValidation.error
        });
        return {
          success: false,
          error: clientValidation.error || 'Cliente inválido'
        };
      }

      // 2. Validar se o canal informado existe para o cliente
      const channelValidation = await this.validateClientChannel(params.clientId, params.channel);
      if (!channelValidation.valid) {
        console.log('ASSISTED_SEND_VALIDATION_FAILED', {
          reason: 'channel_invalid',
          clientId: params.clientId,
          channel: params.channel,
          error: channelValidation.error
        });
        return {
          success: false,
          error: channelValidation.error || `Canal ${params.channel} não encontrado para este cliente`
        };
      }

      console.log('ASSISTED_SEND_CHANNEL_RESOLVED', {
        clientId: params.clientId,
        channel: params.channel,
        externalUserId: channelValidation.externalUserId
      });

      // 3. Validar conteúdo
      if (!params.content || params.content.trim().length === 0) {
        console.log('ASSISTED_SEND_VALIDATION_FAILED', {
          reason: 'content_empty',
          clientId: params.clientId
        });
        return {
          success: false,
          error: 'Conteúdo da mensagem não pode estar vazio'
        };
      }

      // 4. Validar mensagem existente ou criar nova
      let followUpMessage: FollowUpMessage | null = null;
      
      if (params.followUpMessageId) {
        const messageValidation = await this.validateFollowUpMessage(params.followUpMessageId);
        if (!messageValidation.valid) {
          console.log('ASSISTED_SEND_VALIDATION_FAILED', {
            reason: 'message_invalid',
            followUpMessageId: params.followUpMessageId,
            error: messageValidation.error
          });
          return {
            success: false,
            error: messageValidation.error || 'Mensagem inválida'
          };
        }
        followUpMessage = messageValidation.message || null;
      }

      // 5. Enviar mensagem pelo canal correto
      const sendResult = await this.sendFollowUpMessage({
        channel: params.channel,
        externalUserId: channelValidation.externalUserId!,
        content: params.content
      });

      if (!sendResult.success) {
        console.log('ASSISTED_SEND_ERROR', {
          clientId: params.clientId,
          channel: params.channel,
          error: sendResult.error
        });
        return {
          success: false,
          error: sendResult.error || 'Falha ao enviar mensagem'
        };
      }

      // 6. Registrar status do envio
      const recordResult = await this.recordFollowUpSend({
        clientId: params.clientId,
        pipelineId: params.pipelineId,
        followUpMessageId: params.followUpMessageId,
        channel: params.channel,
        content: params.content,
        messageId: sendResult.messageId,
        approvedBy: params.approvedBy,
        messageType: params.messageType
      });

      if (!recordResult.success) {
        console.log('ASSISTED_SEND_RECORD_ERROR', {
          clientId: params.clientId,
          error: recordResult.error
        });
        // Mensagem foi enviada mas falhou ao registrar - não retorna erro total
      }

      // 7. Atualizar pipeline
      const pipelineResult = await this.updatePipelineAfterSend({
        clientId: params.clientId,
        pipelineId: params.pipelineId,
        channel: params.channel
      });

      if (!pipelineResult.success) {
        console.log('ASSISTED_SEND_PIPELINE_UPDATE_ERROR', {
          clientId: params.clientId,
          error: pipelineResult.error
        });
        // Mensagem foi enviada mas falhou ao atualizar pipeline - não retorna erro total
      }

      console.log('ASSISTED_SEND_SUCCESS', {
        clientId: params.clientId,
        channel: params.channel,
        messageId: sendResult.messageId,
        approvedBy: params.approvedBy
      });

      return {
        success: true,
        messageId: sendResult.messageId,
        channelUsed: params.channel,
        contentSent: params.content
      };

    } catch (error) {
      console.error('ASSISTED_SEND_EXCEPTION', {
        clientId: params.clientId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no envio assistido'
      };
    }
  }

  /**
   * Valida se o cliente existe e está ativo
   */
  private async validateClient(clientId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('noemia_leads')
        .select('id, status, merged_into')
        .eq('id', clientId)
        .single();

      if (error) {
        return { valid: false, error: 'Cliente não encontrado' };
      }

      // Verificar se está merged ou inactive
      if (data.merged_into) {
        return { valid: false, error: 'Cliente foi merged para outro registro' };
      }

      if (data.status === 'inactive') {
        return { valid: false, error: 'Cliente está inativo' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Erro ao validar cliente' };
    }
  }

  /**
   * Valida se o canal existe para o cliente
   */
  private async validateClientChannel(
    clientId: string, 
    channel: 'whatsapp' | 'instagram'
  ): Promise<{ valid: boolean; externalUserId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('client_channels')
        .select('id, external_user_id, is_active')
        .eq('client_id', clientId)
        .eq('channel', channel)
        .eq('is_active', true)
        .single();

      if (error) {
        return { valid: false, error: `Canal ${channel} não encontrado para este cliente` };
      }

      if (!data.external_user_id) {
        return { valid: false, error: `Canal ${channel} não possui identificador externo` };
      }

      return { 
        valid: true, 
        externalUserId: data.external_user_id 
      };
    } catch (error) {
      return { valid: false, error: 'Erro ao validar canal do cliente' };
    }
  }

  /**
   * Valida se a mensagem de follow-up existe e pode ser enviada
   */
  private async validateFollowUpMessage(
    followUpMessageId: string
  ): Promise<{ valid: boolean; message?: FollowUpMessage; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('follow_up_messages')
        .select('*')
        .eq('id', followUpMessageId)
        .single();

      if (error) {
        return { valid: false, error: 'Mensagem não encontrada' };
      }

      if (data.status === 'cancelled') {
        return { valid: false, error: 'Mensagem foi cancelada' };
      }

      if (data.status === 'sent') {
        return { valid: false, error: 'Mensagem já foi enviada' };
      }

      return { valid: true, message: data };
    } catch (error) {
      return { valid: false, error: 'Erro ao validar mensagem' };
    }
  }

  /**
   * Envia mensagem pelo canal específico
   */
  private async sendFollowUpMessage(params: {
    channel: 'whatsapp' | 'instagram';
    externalUserId: string;
    content: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (params.channel === 'whatsapp') {
        return await this.sendFollowUpViaWhatsApp(params.externalUserId, params.content);
      } else if (params.channel === 'instagram') {
        return await this.sendFollowUpViaInstagram(params.externalUserId, params.content);
      } else {
        return { success: false, error: `Canal ${params.channel} não suportado` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem'
      };
    }
  }

  /**
   * Envia follow-up via WhatsApp
   */
  private async sendFollowUpViaWhatsApp(
    phoneNumber: string,
    content: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await sendWhatsAppMessage(phoneNumber, content);
      
      if (result.success) {
        console.log('FOLLOW_UP_WHATSAPP_SENT', {
          phoneNumber,
          messageId: result.messageId,
          contentLength: content.length
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar WhatsApp'
      };
    }
  }

  /**
   * Envia follow-up via Instagram
   */
  private async sendFollowUpViaInstagram(
    userId: string,
    content: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
      const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

      if (!INSTAGRAM_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
        return { success: false, error: 'Credenciais do Instagram não configuradas' };
      }

      const apiUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/messages`;
      
      const payload = {
        recipient: { 
          id: userId 
        },
        message: { 
          text: content 
        },
        messaging_type: "RESPONSE",
        access_token: INSTAGRAM_ACCESS_TOKEN
      };

      console.log('FOLLOW_UP_INSTAGRAM_SENDING', {
        userId,
        contentLength: content.length,
        apiUrl
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Instagram API Error: ${errorData.error?.message || response.statusText}`);
      }

      const responseData = await response.json();
      const messageId = responseData.message_id;

      console.log('FOLLOW_UP_INSTAGRAM_SENT', {
        userId,
        messageId,
        contentLength: content.length
      });

      return {
        success: true,
        messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar Instagram'
      };
    }
  }

  /**
   * Registra o envio da mensagem
   */
  private async recordFollowUpSend(params: {
    clientId: string;
    pipelineId: string;
    followUpMessageId?: string;
    channel: 'whatsapp' | 'instagram';
    content: string;
    messageId?: string;
    approvedBy: string;
    messageType?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Se existe uma mensagem pré-programada, atualiza ela
      if (params.followUpMessageId) {
        const { error } = await this.supabase
          .from('follow_up_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            channel: params.channel,
            content: params.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.followUpMessageId);

        if (error) {
          return { success: false, error: 'Erro ao atualizar mensagem existente' };
        }

        console.log('FOLLOW_UP_MESSAGE_MARKED_SENT', {
          followUpMessageId: params.followUpMessageId,
          messageId: params.messageId,
          approvedBy: params.approvedBy
        });
      } else {
        // Criar novo registro de mensagem enviada
        const { error } = await this.supabase
          .from('follow_up_messages')
          .insert({
            client_id: params.clientId,
            pipeline_id: params.pipelineId,
            message_type: params.messageType || 'assisted_send',
            content: params.content,
            channel: params.channel,
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_message_id: params.messageId,
            approved_by: params.approvedBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          return { success: false, error: 'Erro ao criar registro de mensagem' };
        }

        console.log('FOLLOW_UP_MESSAGE_CREATED', {
          clientId: params.clientId,
          pipelineId: params.pipelineId,
          messageId: params.messageId,
          approvedBy: params.approvedBy
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao registrar envio'
      };
    }
  }

  /**
   * Atualiza pipeline após envio
   */
  private async updatePipelineAfterSend(params: {
    clientId: string;
    pipelineId: string;
    channel: 'whatsapp' | 'instagram';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Atualizar informações básicas do pipeline
      const updateData: any = {
        follow_up_status: 'sent',
        last_contact_at: new Date().toISOString(),
        last_contact_channel: params.channel,
        updated_at: new Date().toISOString()
      };

      // Regra conservadora: se estava new_lead e houve follow-up, pode ir para engaged
      const { data: currentPipeline } = await this.supabase
        .from('client_pipeline')
        .select('stage')
        .eq('id', params.pipelineId)
        .single();

      if (currentPipeline?.stage === 'new_lead') {
        updateData.stage = 'engaged';
        console.log('PIPELINE_STAGE_UPDATED', {
          pipelineId: params.pipelineId,
          oldStage: 'new_lead',
          newStage: 'engaged'
        });
      }

      const { error } = await this.supabase
        .from('client_pipeline')
        .update(updateData)
        .eq('id', params.pipelineId);

      if (error) {
        return { success: false, error: 'Erro ao atualizar pipeline' };
      }

      console.log('PIPELINE_UPDATED_AFTER_SEND', {
        pipelineId: params.pipelineId,
        clientId: params.clientId,
        channel: params.channel,
        followUpStatus: 'sent'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar pipeline'
      };
    }
  }

  /**
   * Obtém canais disponíveis para um cliente
   */
  async getClientAvailableChannels(clientId: string): Promise<{
    success: boolean;
    channels: Array<{ channel: string; externalUserId: string; lastContactAt?: string }>;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('client_channels')
        .select('channel, external_user_id, last_contact_at')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .in('channel', ['whatsapp', 'instagram']);

      if (error) {
        return { success: false, channels: [], error: 'Erro ao buscar canais do cliente' };
      }

      const channels = (data || []).map(item => ({
        channel: item.channel,
        externalUserId: item.external_user_id,
        lastContactAt: item.last_contact_at
      }));

      return { success: true, channels };
    } catch (error) {
      return {
        success: false,
        channels: [],
        error: error instanceof Error ? error.message : 'Erro ao buscar canais'
      };
    }
  }

  /**
   * Obtém mensagens de follow-up pendentes para um cliente
   */
  async getClientPendingFollowUps(clientId: string): Promise<{
    success: boolean;
    messages: FollowUpMessage[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('follow_up_messages')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, messages: [], error: 'Erro ao buscar mensagens pendentes' };
      }

      return { success: true, messages: data || [] };
    } catch (error) {
      return {
        success: false,
        messages: [],
        error: error instanceof Error ? error.message : 'Erro ao buscar mensagens'
      };
    }
  }
}

export const assistedFollowUpService = new AssistedFollowUpService();
export type { SendAssistedFollowUpParams, SendAssistedFollowUpResult };
