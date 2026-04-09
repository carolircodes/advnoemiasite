import { createWebhookSupabaseClient } from "../supabase/webhook";
import { clientIdentityService } from "./client-identity";

export interface MergeClientsInput {
  sourceClientId: string;
  targetClientId: string;
  reason?: string;
  mergeBy?: string; // Quem executou o merge (staff_id, system, etc)
}

export interface MergeClientsOutput {
  success: boolean;
  mergedClientId: string;
  targetClientId: string;
  movedChannels: number;
  movedSessions: number;
  movedPipeline: boolean;
  errors?: string[];
}

export interface LinkChannelToExistingClientInput {
  clientId: string;
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal';
  externalUserId: string;
  externalThreadId?: string;
  linkBy?: string;
}

export interface LinkChannelToExistingClientOutput {
  success: boolean;
  action: 'linked' | 'merged' | 'conflict' | 'error';
  clientId?: string;
  channelId?: string;
  mergedFromClientId?: string;
  conflictWithClientId?: string;
  error?: string;
}

class ClientMergeService {
  private supabase = createWebhookSupabaseClient();

  // Fase 3.1 - Função principal mergeClients
  async mergeClients(input: MergeClientsInput): Promise<MergeClientsOutput> {
    console.log('CLIENT_MERGE_START', {
      sourceClientId: input.sourceClientId,
      targetClientId: input.targetClientId,
      reason: input.reason,
      mergeBy: input.mergeBy
    });

    const result: MergeClientsOutput = {
      success: false,
      mergedClientId: input.sourceClientId,
      targetClientId: input.targetClientId,
      movedChannels: 0,
      movedSessions: 0,
      movedPipeline: false,
      errors: []
    };

    try {
      // Validar que os clientes existem e estão ativos
      const { data: sourceClient, error: sourceError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', input.sourceClientId)
        .eq('merge_status', 'active')
        .single();

      if (sourceError || !sourceClient) {
        result.errors?.push('Source client not found or not active');
        return result;
      }

      const { data: targetClient, error: targetError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', input.targetClientId)
        .eq('merge_status', 'active')
        .single();

      if (targetError || !targetClient) {
        result.errors?.push('Target client not found or not active');
        return result;
      }

      // Verificar se não há conflito de canais
      const conflictCheck = await this.checkChannelConflicts(input.sourceClientId, input.targetClientId);
      if (conflictCheck.hasConflicts) {
        result.errors?.push(`Channel conflicts detected: ${conflictCheck.conflicts.join(', ')}`);
        return result;
      }

      // 1. Mover client_channels
      const channelsResult = await this.moveClientChannels(input.sourceClientId, input.targetClientId);
      result.movedChannels = channelsResult.moved;

      // 2. Mover conversation_sessions
      const sessionsResult = await this.moveConversationSessions(input.sourceClientId, input.targetClientId);
      result.movedSessions = sessionsResult.moved;

      // 3. Mover client_pipeline
      const pipelineResult = await this.moveClientPipeline(input.sourceClientId, input.targetClientId);
      result.movedPipeline = pipelineResult.moved;

      // 4. Marcar source client como merged
      const { error: mergeError } = await this.supabase
        .from('clients')
        .update({
          merged_into_client_id: input.targetClientId,
          merge_status: 'merged',
          updated_at: new Date().toISOString()
        })
        .eq('id', input.sourceClientId);

      if (mergeError) {
        result.errors?.push('Failed to mark source client as merged');
        return result;
      }

      result.success = true;

      console.log('CLIENT_MERGE_COMPLETED', {
        sourceClientId: input.sourceClientId,
        targetClientId: input.targetClientId,
        movedChannels: result.movedChannels,
        movedSessions: result.movedSessions,
        movedPipeline: result.movedPipeline
      });

      return result;

    } catch (error) {
      console.error('CLIENT_MERGE_ERROR', error);
      result.errors?.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  // Fase 3.3 - Função de vinculação manual entre canais
  async linkChannelToExistingClient(input: LinkChannelToExistingClientInput): Promise<LinkChannelToExistingClientOutput> {
    console.log('CHANNEL_LINK_START', {
      clientId: input.clientId,
      channel: input.channel,
      externalUserId: input.externalUserId,
      externalThreadId: input.externalThreadId
    });

    try {
      // Verificar se cliente existe e está ativo
      const { data: client, error: clientError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', input.clientId)
        .eq('merge_status', 'active')
        .single();

      if (clientError || !client) {
        return {
          success: false,
          action: 'error',
          error: 'Client not found or not active'
        };
      }

      // Verificar se já existe client_channels com esse channel + external_user_id
      const { data: existingChannel, error: channelError } = await this.supabase
        .from('client_channels')
        .select('*')
        .eq('channel', input.channel)
        .eq('external_user_id', input.externalUserId)
        .eq('is_active', true)
        .single();

      if (channelError && channelError.code !== 'PGRST116') {
        return {
          success: false,
          action: 'error',
          error: 'Error checking existing channel'
        };
      }

      // Se não existe, criar vinculo
      if (!existingChannel) {
        const { data: newChannel, error: createError } = await this.supabase
          .from('client_channels')
          .insert({
            client_id: input.clientId,
            channel: input.channel,
            external_user_id: input.externalUserId,
            external_thread_id: input.externalThreadId,
            last_contact_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return {
            success: false,
            action: 'error',
            error: 'Failed to create channel link'
          };
        }

        console.log('CHANNEL_LINK_CREATED', {
          channelId: newChannel.id,
          clientId: input.clientId,
          channel: input.channel,
          externalUserId: input.externalUserId
        });

        return {
          success: true,
          action: 'linked',
          clientId: input.clientId,
          channelId: newChannel.id
        };
      }

      // Se já existe e pertence ao mesmo cliente
      if (existingChannel.client_id === input.clientId) {
        return {
          success: true,
          action: 'linked',
          clientId: input.clientId,
          channelId: existingChannel.id
        };
      }

      // Se já existe e pertence a outro cliente - CONFLITO
      console.log('CHANNEL_LINK_CONFLICT', {
        existingClientId: existingChannel.client_id,
        requestedClientId: input.clientId,
        channel: input.channel,
        externalUserId: input.externalUserId
      });

      return {
        success: false,
        action: 'conflict',
        conflictWithClientId: existingChannel.client_id
      };

    } catch (error) {
      console.error('CHANNEL_LINK_ERROR', error);
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Fase 3.4 - Função de busca de cliente canônico
  async getCanonicalClientId(clientId: string): Promise<string> {
    try {
      // Usar função SQL para resolver cadeias de merge
      const { data, error } = await this.supabase
        .rpc('get_canonical_client_id', { client_uuid: clientId });

      if (error) {
        console.error('GET_CANONICAL_CLIENT_ERROR', error);
        return clientId; // Fallback para o ID original
      }

      console.log('CLIENT_CANONICAL_RESOLVED', {
        originalClientId: clientId,
        canonicalClientId: data
      });

      return data || clientId;
    } catch (error) {
      console.error('GET_CANONICAL_CLIENT_ERROR', error);
      return clientId; // Fallback para o ID original
    }
  }

  // Métodos auxiliares para merge
  private async checkChannelConflicts(sourceClientId: string, targetClientId: string): Promise<{ hasConflicts: boolean; conflicts: string[] }> {
    try {
      // Buscar canais do source
      const { data: sourceChannels, error: sourceError } = await this.supabase
        .from('client_channels')
        .select('channel, external_user_id')
        .eq('client_id', sourceClientId)
        .eq('is_active', true);

      if (sourceError || !sourceChannels) {
        return { hasConflicts: false, conflicts: [] };
      }

      // Verificar se target já tem algum desses canais
      const conflicts: string[] = [];
      
      for (const channel of sourceChannels) {
        const { data: existingChannel } = await this.supabase
          .from('client_channels')
          .select('id')
          .eq('client_id', targetClientId)
          .eq('channel', channel.channel)
          .eq('external_user_id', channel.external_user_id)
          .eq('is_active', true)
          .single();

        if (existingChannel) {
          conflicts.push(`${channel.channel}:${channel.external_user_id}`);
        }
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      console.error('CHECK_CHANNEL_CONFLICTS_ERROR', error);
      return { hasConflicts: true, conflicts: ['error_checking_conflicts'] };
    }
  }

  private async moveClientChannels(sourceClientId: string, targetClientId: string): Promise<{ moved: number }> {
    try {
      const { error } = await this.supabase
        .from('client_channels')
        .update({ client_id: targetClientId })
        .eq('client_id', sourceClientId);

      if (error) {
        console.error('MOVE_CLIENT_CHANNELS_ERROR', error);
        return { moved: 0 };
      }

      return { moved: 1 }; // Simplificado - em produção retornar count real
    } catch (error) {
      console.error('MOVE_CLIENT_CHANNELS_ERROR', error);
      return { moved: 0 };
    }
  }

  private async moveConversationSessions(sourceClientId: string, targetClientId: string): Promise<{ moved: number }> {
    try {
      const { error } = await this.supabase
        .from('conversation_sessions')
        .update({ client_id: targetClientId })
        .eq('client_id', sourceClientId);

      if (error) {
        console.error('MOVE_CONVERSATION_SESSIONS_ERROR', error);
        return { moved: 0 };
      }

      return { moved: 1 }; // Simplificado - em produção retornar count real
    } catch (error) {
      console.error('MOVE_CONVERSATION_SESSIONS_ERROR', error);
      return { moved: 0 };
    }
  }

  private async moveClientPipeline(sourceClientId: string, targetClientId: string): Promise<{ moved: boolean }> {
    try {
      // Verificar se target já tem pipeline
      const { data: targetPipeline } = await this.supabase
        .from('client_pipeline')
        .select('id')
        .eq('client_id', targetClientId)
        .single();

      if (targetPipeline) {
        // Target já tem pipeline, apenas remover o do source
        await this.supabase
          .from('client_pipeline')
          .delete()
          .eq('client_id', sourceClientId);
        
        return { moved: false };
      }

      // Mover pipeline do source para target
      const { error } = await this.supabase
        .from('client_pipeline')
        .update({ client_id: targetClientId })
        .eq('client_id', sourceClientId);

      if (error) {
        console.error('MOVE_CLIENT_PIPELINE_ERROR', error);
        return { moved: false };
      }

      return { moved: true };
    } catch (error) {
      console.error('MOVE_CLIENT_PIPELINE_ERROR', error);
      return { moved: false };
    }
  }

  // Método para buscar todos os canais de um cliente (resolvendo merge)
  async getClientCanonicalChannels(clientId: string): Promise<any[]> {
    try {
      const canonicalClientId = await this.getCanonicalClientId(clientId);
      
      const { data, error } = await this.supabase
        .from('client_channels')
        .select('*')
        .eq('client_id', canonicalClientId)
        .eq('is_active', true)
        .order('last_contact_at', { ascending: false });

      if (error) {
        console.error('GET_CLIENT_CANONICAL_CHANNELS_ERROR', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('GET_CLIENT_CANONICAL_CHANNELS_ERROR', error);
      return [];
    }
  }

  // Método para buscar pipeline canônico
  async getClientCanonicalPipeline(clientId: string): Promise<any> {
    try {
      const canonicalClientId = await this.getCanonicalClientId(clientId);
      
      const { data, error } = await this.supabase
        .from('client_pipeline')
        .select('*')
        .eq('client_id', canonicalClientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('GET_CLIENT_CANONICAL_PIPELINE_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('GET_CLIENT_CANONICAL_PIPELINE_ERROR', error);
      return null;
    }
  }
}

export const clientMergeService = new ClientMergeService();
