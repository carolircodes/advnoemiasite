/**
 * Serviço para processar respostas de follow-ups
 * Implementa a FASE 7.6 - Preparar estrutura para registro de respostas futuras
 */

import { createWebhookSupabaseClient } from '../supabase/webhook';
import { recordProductEvent } from './public-intake';

interface FollowUpResponse {
  id: string;
  follow_up_message_id: string;
  client_id: string;
  pipeline_id: string;
  channel: 'whatsapp' | 'instagram';
  external_message_id: string;
  response_content: string;
  response_type: 'text' | 'media' | 'interactive';
  received_at: string;
  processed_at?: string;
  created_at: string;
}

interface FollowUpMessage {
  id: string;
  client_id: string;
  pipeline_id: string;
  external_message_id?: string;
  channel: 'whatsapp' | 'instagram';
  status: 'sent' | 'replied' | 'cancelled';
  sent_at?: string;
  replied_at?: string;
  content: string;
  message_type: string;
  created_at: string;
  updated_at: string;
}

class FollowUpResponseHandler {
  private supabase = createWebhookSupabaseClient();

  /**
   * Processa resposta recebida e associa ao follow-up correspondente
   */
  async processFollowUpResponse(params: {
    clientId: string;
    channel: 'whatsapp' | 'instagram';
    externalMessageId: string;
    responseContent: string;
    responseType: 'text' | 'media' | 'interactive';
    receivedAt: string;
  }): Promise<{ success: boolean; followUpUpdated?: boolean; followUpMessageId?: string; error?: string }> {
    try {
      console.log('FOLLOW_UP_RESPONSE_PROCESSING', {
        clientId: params.clientId,
        channel: params.channel,
        externalMessageId: params.externalMessageId,
        responseLength: params.responseContent.length
      });

      // 1. Buscar follow-ups enviados recentemente para este cliente no mesmo canal
      const recentFollowUps = await this.findRecentSentFollowUps(
        params.clientId,
        params.channel,
        params.externalMessageId
      );

      if (recentFollowUps.length === 0) {
        console.log('FOLLOW_UP_RESPONSE_NO_MATCH', {
          clientId: params.clientId,
          channel: params.channel,
          externalMessageId: params.externalMessageId
        });
        return { success: true, followUpUpdated: false };
      }

      // 2. Encontrar o follow-up mais provável (baseado em tempo e canal)
      const targetFollowUp = this.selectBestMatch(recentFollowUps, params.receivedAt);

      if (!targetFollowUp) {
        console.log('FOLLOW_UP_RESPONSE_NO_BEST_MATCH', {
          clientId: params.clientId,
          channel: params.channel
        });
        return { success: true, followUpUpdated: false };
      }

      // 3. Registrar a resposta
      const responseRecord = await this.recordResponse({
        followUpMessageId: targetFollowUp.id,
        clientId: params.clientId,
        pipelineId: targetFollowUp.pipeline_id,
        channel: params.channel,
        externalMessageId: params.externalMessageId,
        responseContent: params.responseContent,
        responseType: params.responseType,
        receivedAt: params.receivedAt
      });

      if (!responseRecord.success) {
        return { success: false, error: responseRecord.error };
      }

      // 4. Atualizar status do follow-up para 'replied'
      const updateResult = await this.markFollowUpAsReplied(targetFollowUp.id, params.receivedAt);

      console.log('FOLLOW_UP_RESPONSE_PROCESSED', {
        followUpMessageId: targetFollowUp.id,
        clientId: params.clientId,
        channel: params.channel,
        responseRecordId: responseRecord.responseId,
        followUpUpdated: updateResult
      });

      try {
        await recordProductEvent({
          eventKey: 'reengaged',
          eventGroup: 'revenue_funnel',
          intakeRequestId: params.clientId,
          payload: {
            pipelineId: targetFollowUp.pipeline_id,
            channel: params.channel,
            followUpMessageId: targetFollowUp.id,
            responseType: params.responseType
          }
        });
      } catch (trackingError) {
        console.error('FOLLOW_UP_REENGAGED_EVENT_ERROR', trackingError);
      }

      return { 
        success: true, 
        followUpUpdated: updateResult,
        followUpMessageId: targetFollowUp.id
      };

    } catch (error) {
      console.error('FOLLOW_UP_RESPONSE_EXCEPTION', {
        clientId: params.clientId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar resposta'
      };
    }
  }

  /**
   * Busca follow-ups enviados recentemente para o cliente no canal especificado
   */
  private async findRecentSentFollowUps(
    clientId: string,
    channel: 'whatsapp' | 'instagram',
    externalMessageId?: string
  ): Promise<FollowUpMessage[]> {
    try {
      // Buscar follow-ups enviados nos últimos 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      let query = this.supabase
        .from('follow_up_messages')
        .select('*')
        .eq('client_id', clientId)
        .eq('channel', channel)
        .eq('status', 'sent')
        .gte('sent_at', sevenDaysAgo)
        .order('sent_at', { ascending: false });

      // Se houver external_message_id, tentar match exato
      if (externalMessageId) {
        query = query.eq('external_message_id', externalMessageId);
      }

      const { data, error } = await query.limit(10);

      if (error) {
        console.log('FOLLOW_UP_RESPONSE_QUERY_ERROR', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('FOLLOW_UP_RESPONSE_QUERY_EXCEPTION', error);
      return [];
    }
  }

  /**
   * Seleciona o melhor match baseado em critérios de tempo e relevância
   */
  private selectBestMatch(followUps: FollowUpMessage[], responseReceivedAt: string): FollowUpMessage | null {
    if (followUps.length === 0) return null;
    if (followUps.length === 1) return followUps[0];

    // Critérios de seleção:
    // 1. Match exato de external_message_id (se disponível)
    // 2. Follow-up mais recente
    // 3. Follow-up enviado nas últimas 24 horas

    const responseTime = new Date(responseReceivedAt).getTime();
    const twentyFourHoursAgo = responseTime - (24 * 60 * 60 * 1000);

    // Filtrar follow-ups enviados nas últimas 24 horas
    const recentFollowUps = followUps.filter(fu => {
      if (!fu.sent_at) return false;
      const sentTime = new Date(fu.sent_at).getTime();
      return sentTime >= twentyFourHoursAgo;
    });

    // Se houver follow-ups recentes, usar o mais recente
    if (recentFollowUps.length > 0) {
      return recentFollowUps[0];
    }

    // Caso contrário, usar o mais recente geral
    return followUps[0];
  }

  /**
   * Registra a resposta no banco de dados
   */
  private async recordResponse(params: {
    followUpMessageId: string;
    clientId: string;
    pipelineId: string;
    channel: 'whatsapp' | 'instagram';
    externalMessageId: string;
    responseContent: string;
    responseType: 'text' | 'media' | 'interactive';
    receivedAt: string;
  }): Promise<{ success: boolean; responseId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('follow_up_responses')
        .insert({
          follow_up_message_id: params.followUpMessageId,
          client_id: params.clientId,
          pipeline_id: params.pipelineId,
          channel: params.channel,
          external_message_id: params.externalMessageId,
          response_content: params.responseContent,
          response_type: params.responseType,
          received_at: params.receivedAt,
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: 'Erro ao registrar resposta' };
      }

      return { success: true, responseId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao registrar resposta'
      };
    }
  }

  /**
   * Marca follow-up como respondido
   */
  private async markFollowUpAsReplied(
    followUpMessageId: string,
    repliedAt: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('follow_up_messages')
        .update({
          status: 'replied',
          replied_at: repliedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', followUpMessageId);

      if (error) {
        console.log('FOLLOW_UP_RESPONSE_UPDATE_ERROR', error);
        return false;
      }

      // Atualizar pipeline se necessário
      await this.updatePipelineAfterReply(followUpMessageId);

      return true;
    } catch (error) {
      console.log('FOLLOW_UP_RESPONSE_UPDATE_EXCEPTION', error);
      return false;
    }
  }

  /**
   * Atualiza pipeline após resposta do cliente
   */
  private async updatePipelineAfterReply(followUpMessageId: string): Promise<void> {
    try {
      // Buscar informações do follow-up
      const { data: followUp } = await this.supabase
        .from('follow_up_messages')
        .select('pipeline_id, client_id')
        .eq('id', followUpMessageId)
        .single();

      if (!followUp) return;

      // Atualizar informações do pipeline
      const updateData: any = {
        last_client_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Se estava em engaged e respondeu, pode avançar para warm_lead
      const { data: currentPipeline } = await this.supabase
        .from('client_pipeline')
        .select('stage')
        .eq('id', followUp.pipeline_id)
        .single();

      if (currentPipeline?.stage === 'engaged') {
        updateData.stage = 'warm_lead';
        console.log('PIPELINE_STAGE_UPDATED_AFTER_REPLY', {
          pipelineId: followUp.pipeline_id,
          oldStage: 'engaged',
          newStage: 'warm_lead'
        });
      }

      await this.supabase
        .from('client_pipeline')
        .update(updateData)
        .eq('id', followUp.pipeline_id);

    } catch (error) {
      console.log('PIPELINE_UPDATE_AFTER_REPLY_ERROR', error);
    }
  }

  /**
   * Obtém estatísticas de respostas de follow-ups
   */
  async getFollowUpResponseStats(clientId?: string): Promise<{
    totalSent: number;
    totalReplied: number;
    replyRate: number;
    averageResponseTime?: number;
    channelStats: Record<string, { sent: number; replied: number }>;
  }> {
    try {
      let query = this.supabase
        .from('follow_up_messages')
        .select('id, status, channel, sent_at, replied_at');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error || !data) {
        return {
          totalSent: 0,
          totalReplied: 0,
          replyRate: 0,
          channelStats: {}
        };
      }

      const stats = data.reduce((acc, msg) => {
        const channel = msg.channel || 'unknown';
        
        if (!acc.channelStats[channel]) {
          acc.channelStats[channel] = { sent: 0, replied: 0 };
        }

        if (msg.status === 'sent' || msg.status === 'replied') {
          acc.totalSent++;
          acc.channelStats[channel].sent++;
        }

        if (msg.status === 'replied') {
          acc.totalReplied++;
          acc.channelStats[channel].replied++;
        }

        return acc;
      }, {
        totalSent: 0,
        totalReplied: 0,
        replyRate: 0,
        channelStats: {} as Record<string, { sent: number; replied: number }>
      });

      stats.replyRate = stats.totalSent > 0 ? (stats.totalReplied / stats.totalSent) * 100 : 0;

      return stats;
    } catch (error) {
      console.error('FOLLOW_UP_RESPONSE_STATS_ERROR', error);
      return {
        totalSent: 0,
        totalReplied: 0,
        replyRate: 0,
        channelStats: {}
      };
    }
  }

  /**
   * Obtém respostas recentes para um cliente
   */
  async getClientRecentResponses(clientId: string, limit: number = 10): Promise<{
    success: boolean;
    responses: FollowUpResponse[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('follow_up_responses')
        .select('*')
        .eq('client_id', clientId)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, responses: [], error: 'Erro ao buscar respostas' };
      }

      return { success: true, responses: data || [] };
    } catch (error) {
      return {
        success: false,
        responses: [],
        error: error instanceof Error ? error.message : 'Erro ao buscar respostas'
      };
    }
  }
}

export const followUpResponseHandler = new FollowUpResponseHandler();
export type { FollowUpResponse, FollowUpMessage };
