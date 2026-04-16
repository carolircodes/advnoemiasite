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
  channel: "whatsapp" | "instagram" | "facebook" | "site" | "portal" | "telegram";
  external_user_id: string;
  external_thread_id?: string;
  last_contact_at: string;
  created_at: string;
  updated_at: string;
}

export interface ClientPipeline {
  id: string;
  client_id: string;
  stage:
    | "new_lead"
    | "contacted"
    | "qualified"
    | "proposal"
    | "negotiation"
    | "closed_won"
    | "closed_lost";
  lead_temperature: "cold" | "warm" | "hot";
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
  channel: "whatsapp" | "instagram" | "facebook" | "site" | "portal" | "telegram";
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
  private getSupabase() {
    return createWebhookSupabaseClient();
  }

  async getOrCreateClientAndChannel(
    input: GetOrCreateClientAndChannelInput
  ): Promise<GetOrCreateClientAndChannelOutput> {
    console.log("CLIENT_IDENTITY_START", {
      channel: input.channel,
      externalUserId: input.externalUserId,
      externalThreadId: input.externalThreadId
    });

    try {
      const supabase = this.getSupabase();
      const { data: existingChannel, error: channelError } = await supabase
        .from("client_channels")
        .select(
          `
          *,
          client:clients(*)
        `
        )
        .eq("channel", input.channel)
        .eq("external_user_id", input.externalUserId)
        .single();

      if (channelError && channelError.code !== "PGRST116") {
        console.error("CLIENT_CHANNEL_LOOKUP_ERROR", channelError);
      }

      if (existingChannel) {
        const canonicalClientId = await clientMergeService.getCanonicalClientId(
          existingChannel.client_id
        );

        let client = existingChannel.client;
        if (canonicalClientId !== existingChannel.client_id) {
          const { data: canonicalClient } = await supabase
            .from("clients")
            .select("*")
            .eq("id", canonicalClientId)
            .single();

          if (canonicalClient) {
            client = canonicalClient;
          }
        }

        console.log("CLIENT_CHANNEL_FOUND", {
          channelId: existingChannel.id,
          originalClientId: existingChannel.client_id,
          canonicalClientId,
          channel: input.channel,
          externalUserId: input.externalUserId
        });

        await this.updateChannelLastContact(existingChannel.id);
        const pipelineUpdated = await this.updatePipelineLastContact(canonicalClientId);

        return {
          client,
          clientChannel: existingChannel,
          isNewClient: false,
          isNewChannel: false,
          pipelineUpdated
        };
      }

      console.log("CLIENT_CHANNEL_NOT_FOUND - CREATING NEW");

      const newClientData: Record<string, unknown> = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (input.channel === "whatsapp") {
        newClientData.phone = input.externalUserId;
      } else if (input.channel === "instagram") {
        newClientData.instagram_id = input.externalUserId;
      }

      if (input.name) {
        newClientData.name = input.name;
      }
      if (input.email) {
        newClientData.email = input.email;
      }

      const { data: newClient, error: clientCreateError } = await supabase
        .from("clients")
        .insert(newClientData)
        .select()
        .single();

      if (clientCreateError) {
        console.error("CLIENT_CREATE_ERROR", clientCreateError);
        throw clientCreateError;
      }

      const { data: newChannel, error: channelCreateError } = await supabase
        .from("client_channels")
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
        console.error("CLIENT_CHANNEL_CREATE_ERROR", channelCreateError);
        throw channelCreateError;
      }

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
      console.error("CLIENT_IDENTITY_ERROR", error);
      throw error;
    }
  }

  private async createOrUpdatePipeline(
    clientId: string,
    sourceChannel: string,
    isNew = false
  ): Promise<{ pipeline?: ClientPipeline; updated: boolean }> {
    try {
      const supabase = this.getSupabase();
      const { data: existingPipeline, error: findError } = await supabase
        .from("client_pipeline")
        .select("*")
        .eq("client_id", clientId)
        .single();

      if (findError && findError.code !== "PGRST116") {
        console.error("PIPELINE_LOOKUP_ERROR", findError);
      }

      const now = new Date().toISOString();

      if (existingPipeline) {
        const { data: updatedPipeline, error: updateError } = await supabase
          .from("client_pipeline")
          .update({
            last_contact_at: now,
            updated_at: now
          })
          .eq("client_id", clientId)
          .select()
          .single();

        if (updateError) {
          console.error("PIPELINE_UPDATE_ERROR", updateError);
        }

        return { pipeline: updatedPipeline, updated: !!updatedPipeline };
      }

      if (isNew) {
        const { data: newPipeline, error: createError } = await supabase
          .from("client_pipeline")
          .insert({
            client_id: clientId,
            stage: "new_lead",
            lead_temperature: "cold",
            source_channel: sourceChannel,
            first_contact_at: now,
            last_contact_at: now
          })
          .select()
          .single();

        if (createError) {
          console.error("PIPELINE_CREATE_ERROR", createError);
          throw createError;
        }

        return { pipeline: newPipeline, updated: true };
      }

      return { updated: false };
    } catch (error) {
      console.error("PIPELINE_ERROR", error);
      return { updated: false };
    }
  }

  private async updateChannelLastContact(channelId: string): Promise<boolean> {
    try {
      const { error } = await this.getSupabase()
        .from("client_channels")
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", channelId);

      if (error) {
        console.error("CHANNEL_UPDATE_ERROR", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("CHANNEL_UPDATE_ERROR", error);
      return false;
    }
  }

  private async updatePipelineLastContact(clientId: string): Promise<boolean> {
    try {
      const { error } = await this.getSupabase()
        .from("client_pipeline")
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("client_id", clientId);

      if (error) {
        console.error("PIPELINE_UPDATE_ERROR", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("PIPELINE_UPDATE_ERROR", error);
      return false;
    }
  }

  async linkClientToSession(sessionId: string, clientId: string): Promise<void> {
    console.log("CLIENT_LINK_TO_SESSION", {
      sessionId,
      clientId
    });

    const { error } = await this.getSupabase()
      .from("conversation_sessions")
      .update({
        client_id: clientId,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (error) {
      console.error("CLIENT_LINK_TO_SESSION_ERROR", error);
      throw error;
    }
  }

  async getClientChannels(clientId: string): Promise<ClientChannel[]> {
    try {
      const { data, error } = await this.getSupabase()
        .from("client_channels")
        .select("*")
        .eq("client_id", clientId)
        .order("last_contact_at", { ascending: false });

      if (error) {
        console.error("GET_CLIENT_CHANNELS_ERROR", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("GET_CLIENT_CHANNELS_ERROR", error);
      return [];
    }
  }

  async getClientPipeline(clientId: string): Promise<ClientPipeline | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from("client_pipeline")
        .select("*")
        .eq("client_id", clientId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("GET_CLIENT_PIPELINE_ERROR", error);
      }

      return data;
    } catch (error) {
      console.error("GET_CLIENT_PIPELINE_ERROR", error);
      return null;
    }
  }
}

export const clientIdentityService = new ClientIdentityService();
