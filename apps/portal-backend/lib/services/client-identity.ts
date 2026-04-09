import { createWebhookSupabaseClient } from "../supabase/webhook";
import { clientMergeService } from "./client-merge";

export interface Client {
  id: string;
  name?: string;
  phone?: string;
  instagram_id?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientChannel {
  id: string;
  client_id: string;
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal';
  external_user_id: string;
  external_thread_id?: string;
  is_active: boolean;
  last_contact_at: string;
  created_at: string;
  updated_at: string;
}

export interface ClientPipeline {
  id: string;
  client_id: string;
  stage: 'new_lead' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  lead_temperature: 'cold' | 'warm' | 'hot';
  source_channel: string;
  assigned_to?: string;
  priority: number;
  tags: string[];
  notes?: string;
  first_contact_at: string;
  last_contact_at: string;
  next_follow_up_at?: string;
  converted_to_client_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GetOrCreateClientAndChannelInput {
  channel: 'whatsapp' | 'instagram' | 'site' | 'portal';
  externalUserId: string;
  externalThreadId?: string;
  name?: string;
  email?: string;
}

export interface GetOrCreateClientAndChannelOutput {
  client: Client;
  clientChannel: ClientChannel;
  isNewClient: boolean;
  isNewChannel: boolean;
  pipeline?: ClientPipeline;
  pipelineUpdated: boolean;
}

class ClientIdentityService {
  private supabase = createWebhookSupabaseClient();

  // Fase 2.1 - Função principal getOrCreateClientAndChannel
  async getOrCreateClientAndChannel(input: GetOrCreateClientAndChannelInput): Promise<GetOrCreateClientAndChannelOutput> {
    console.log('CLIENT_IDENTITY_START', {
      channel: input.channel,
      externalUserId: input.externalUserId,
      externalThreadId: input.externalThreadId
    });

    try {
      // 1. Procurar em client_channels por channel + external_user_id
      const { data: existingChannel, error: channelError } = await this.supabase
        .from('client_channels')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('channel', input.channel)
        .eq('external_user_id', input.externalUserId)
        .eq('is_active', true)
        .single();

      if (channelError && channelError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('CLIENT_CHANNEL_LOOKUP_ERROR', channelError);
      }

      // 2. Se encontrar canal existente
      if (existingChannel) {
        // Fase 3.6 - Resolver cliente canônico (caso tenha sido mergeado)
        const canonicalClientId = await clientMergeService.getCanonicalClientId(existingChannel.client_id);
        
        // Se o cliente foi mergeado, buscar dados do cliente canônico
        let client = existingChannel.client;
        if (canonicalClientId !== existingChannel.client_id) {
          const { data: canonicalClient } = await this.supabase
            .from('clients')
            .select('*')
            .eq('id', canonicalClientId)
            .single();
          
          if (canonicalClient) {
            client = canonicalClient;
          }
        }

        console.log('CLIENT_CHANNEL_FOUND', {
          channelId: existingChannel.id,
          originalClientId: existingChannel.client_id,
          canonicalClientId,
          channel: input.channel,
          externalUserId: input.externalUserId
        });

        // Atualizar last_contact_at
        await this.updateChannelLastContact(existingChannel.id);

        // Atualizar pipeline last_contact_at (usando cliente canônico)
        const pipelineUpdated = await this.updatePipelineLastContact(canonicalClientId);

        return {
          client,
          clientChannel: existingChannel,
          isNewClient: false,
          isNewChannel: false,
          pipelineUpdated
        };
      }

      // 3. Se NÃO encontrar, criar novo fluxo
      console.log('CLIENT_CHANNEL_NOT_FOUND - CREATING NEW');

      // 3.1 Criar novo client
      const newClientData: any = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Preencher campos específicos do canal
      if (input.channel === 'whatsapp') {
        newClientData.phone = input.externalUserId;
      } else if (input.channel === 'instagram') {
        newClientData.instagram_id = input.externalUserId;
      }

      // Campos opcionais
      if (input.name) {
        newClientData.name = input.name;
      }
      if (input.email) {
        newClientData.email = input.email;
      }

      const { data: newClient, error: clientCreateError } = await this.supabase
        .from('clients')
        .insert(newClientData)
        .select()
        .single();

      if (clientCreateError) {
        console.error('CLIENT_CREATE_ERROR', clientCreateError);
        throw clientCreateError;
      }

      console.log('CLIENT_CREATED', {
        clientId: newClient.id,
        channel: input.channel,
        externalUserId: input.externalUserId
      });

      // 3.2 Criar vínculo client_channels
      const { data: newChannel, error: channelCreateError } = await this.supabase
        .from('client_channels')
        .insert({
          client_id: newClient.id,
          channel: input.channel,
          external_user_id: input.externalUserId,
          external_thread_id: input.externalThreadId,
          last_contact_at: new Date().toISOString()
        })
        .select()
        .single();

      if (channelCreateError) {
        console.error('CLIENT_CHANNEL_CREATE_ERROR', channelCreateError);
        throw channelCreateError;
      }

      console.log('CLIENT_CHANNEL_CREATED', {
        channelId: newChannel.id,
        clientId: newClient.id,
        channel: input.channel,
        externalUserId: input.externalUserId
      });

      // 3.3 Criar pipeline
      const pipeline = await this.createOrUpdatePipeline(newClient.id, input.channel, true);

      return {
        client: newClient,
        clientChannel: newChannel,
        isNewClient: true,
        isNewChannel: true,
        pipeline: pipeline.pipeline,
        pipelineUpdated: pipeline.updated
      };

    } catch (error) {
      console.error('CLIENT_IDENTITY_ERROR', error);
      throw error;
    }
  }

  // Criar ou atualizar pipeline do cliente
  private async createOrUpdatePipeline(
    clientId: string, 
    sourceChannel: string, 
    isNew: boolean = false
  ): Promise<{ pipeline?: ClientPipeline; updated: boolean }> {
    try {
      // Verificar se pipeline já existe
      const { data: existingPipeline, error: findError } = await this.supabase
        .from('client_pipeline')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('PIPELINE_LOOKUP_ERROR', findError);
      }

      const now = new Date().toISOString();

      if (existingPipeline) {
        // Atualizar last_contact_at do pipeline existente
        const { data: updatedPipeline, error: updateError } = await this.supabase
          .from('client_pipeline')
          .update({
            last_contact_at: now,
            updated_at: now
          })
          .eq('client_id', clientId)
          .select()
          .single();

        if (updateError) {
          console.error('PIPELINE_UPDATE_ERROR', updateError);
        } else {
          console.log('PIPELINE_UPDATED', {
            pipelineId: updatedPipeline.id,
            clientId,
            lastContactAt: now
          });
        }

        return { pipeline: updatedPipeline, updated: !!updatedPipeline };
      } else if (isNew) {
        // Criar novo pipeline
        const { data: newPipeline, error: createError } = await this.supabase
          .from('client_pipeline')
          .insert({
            client_id: clientId,
            stage: 'new_lead',
            lead_temperature: 'cold',
            source_channel: sourceChannel,
            first_contact_at: now,
            last_contact_at: now
          })
          .select()
          .single();

        if (createError) {
          console.error('PIPELINE_CREATE_ERROR', createError);
          throw createError;
        }

        console.log('PIPELINE_CREATED', {
          pipelineId: newPipeline.id,
          clientId,
          stage: 'new_lead',
          sourceChannel
        });

        return { pipeline: newPipeline, updated: true };
      }

      return { updated: false };
    } catch (error) {
      console.error('PIPELINE_ERROR', error);
      return { updated: false };
    }
  }

  // Atualizar last_contact_at do canal
  private async updateChannelLastContact(channelId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('client_channels')
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', channelId);

      if (error) {
        console.error('CHANNEL_UPDATE_ERROR', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('CHANNEL_UPDATE_ERROR', error);
      return false;
    }
  }

  // Atualizar last_contact_at do pipeline
  private async updatePipelineLastContact(clientId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('client_pipeline')
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId);

      if (error) {
        console.error('PIPELINE_UPDATE_ERROR', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('PIPELINE_UPDATE_ERROR', error);
      return false;
    }
  }

  // Método para vincular cliente a sessão existente
  async linkClientToSession(sessionId: string, clientId: string): Promise<void> {
    console.log('CLIENT_LINK_TO_SESSION', {
      sessionId,
      clientId
    });

    try {
      const { error } = await this.supabase
        .from('conversation_sessions')
        .update({ 
          client_id: clientId,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('CLIENT_LINK_TO_SESSION_ERROR', error);
        throw error;
      }

      console.log('CLIENT_LINKED_TO_SESSION', {
        sessionId,
        clientId
      });

    } catch (error) {
      console.error('CLIENT_LINK_TO_SESSION_ERROR', error);
      throw error;
    }
  }

  // Buscar todos os canais de um cliente
  async getClientChannels(clientId: string): Promise<ClientChannel[]> {
    try {
      const { data, error } = await this.supabase
        .from('client_channels')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('last_contact_at', { ascending: false });

      if (error) {
        console.error('GET_CLIENT_CHANNELS_ERROR', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('GET_CLIENT_CHANNELS_ERROR', error);
      return [];
    }
  }

  // Buscar pipeline do cliente
  async getClientPipeline(clientId: string): Promise<ClientPipeline | null> {
    try {
      const { data, error } = await this.supabase
        .from('client_pipeline')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('GET_CLIENT_PIPELINE_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('GET_CLIENT_PIPELINE_ERROR', error);
      return null;
    }
  }
}

export const clientIdentityService = new ClientIdentityService();
