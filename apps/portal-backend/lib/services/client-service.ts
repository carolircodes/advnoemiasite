import { createWebhookSupabaseClient } from "../supabase/webhook.ts";

export interface Client {
  id: string;
  name?: string;
  phone?: string;
  instagram_id?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface GetOrCreateClientInput {
  channel: 'whatsapp' | 'instagram';
  externalUserId: string;
  name?: string;
  email?: string;
}

class ClientService {
  private supabase = createWebhookSupabaseClient();

  // Fase 1.3 - Função central getOrCreateClient
  async getOrCreateClient(input: GetOrCreateClientInput): Promise<Client> {
    console.log('CLIENT_LOOKUP_START', {
      channel: input.channel,
      externalUserId: input.externalUserId
    });

    try {
      let existingClient: Client | null = null;

      // REGRAS DE BUSCA POR CANAL
      if (input.channel === 'whatsapp') {
        // WhatsApp: procurar por phone == externalUserId
        const { data, error } = await this.supabase
          .from('clients')
          .select('*')
          .eq('phone', input.externalUserId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          console.error('CLIENT_LOOKUP_ERROR', error);
        }

        existingClient = data;
      } else if (input.channel === 'instagram') {
        // Instagram: procurar por instagram_id == externalUserId
        const { data, error } = await this.supabase
          .from('clients')
          .select('*')
          .eq('instagram_id', input.externalUserId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          console.error('CLIENT_LOOKUP_ERROR', error);
        }

        existingClient = data;
      }

      // SE ENCONTRADO → RETORNAR
      if (existingClient) {
        console.log('CLIENT_FOUND', {
          clientId: existingClient.id,
          channel: input.channel,
          externalUserId: input.externalUserId
        });

        return existingClient;
      }

      // SE NÃO ENCONTRADO → CRIAR NOVO
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

      const { data: createdClient, error: createError } = await this.supabase
        .from('clients')
        .insert(newClientData)
        .select()
        .single();

      if (createError) {
        console.error('CLIENT_CREATE_ERROR', createError);
        throw createError;
      }

      console.log('CLIENT_CREATED', {
        clientId: createdClient.id,
        channel: input.channel,
        externalUserId: input.externalUserId,
        phone: createdClient.phone,
        instagram_id: createdClient.instagram_id
      });

      return createdClient;

    } catch (error) {
      console.error('CLIENT_SERVICE_ERROR', error);
      throw error;
    }
  }

  // Método para vincular cliente a sessão existente
  async linkClientToSession(sessionId: string, clientId: string): Promise<void> {
    console.log('CLIENT_LINK_TO_SESSION_START', {
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

  // Método para buscar cliente por qualquer campo
  async findClientByIdentifier(identifier: string): Promise<Client | null> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .or(`phone.eq.${identifier},instagram_id.eq.${identifier},email.eq.${identifier}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('FIND_CLIENT_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('FIND_CLIENT_ERROR', error);
      return null;
    }
  }

  // Método para atualizar dados do cliente
  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        console.error('UPDATE_CLIENT_ERROR', error);
        throw error;
      }

      console.log('CLIENT_UPDATED', {
        clientId,
        updates: Object.keys(updates)
      });

      return data;
    } catch (error) {
      console.error('UPDATE_CLIENT_ERROR', error);
      throw error;
    }
  }
}

export const clientService = new ClientService();
