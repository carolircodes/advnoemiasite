"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientIdentityService = void 0;
const webhook_1 = require("../supabase/webhook");
const client_merge_1 = require("./client-merge");
class ClientIdentityService {
    getSupabase() {
        return (0, webhook_1.createWebhookSupabaseClient)();
    }
    async getOrCreateClientAndChannel(input) {
        console.log("CLIENT_IDENTITY_START", {
            channel: input.channel,
            externalUserId: input.externalUserId,
            externalThreadId: input.externalThreadId
        });
        try {
            const supabase = this.getSupabase();
            const { data: existingChannel, error: channelError } = await supabase
                .from("client_channels")
                .select(`
          *,
          client:clients(*)
        `)
                .eq("channel", input.channel)
                .eq("external_user_id", input.externalUserId)
                .single();
            if (channelError && channelError.code !== "PGRST116") {
                console.error("CLIENT_CHANNEL_LOOKUP_ERROR", channelError);
            }
            if (existingChannel) {
                const canonicalClientId = await client_merge_1.clientMergeService.getCanonicalClientId(existingChannel.client_id);
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
            const newClientData = {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (input.channel === "whatsapp") {
                newClientData.phone = input.externalUserId;
            }
            else if (input.channel === "instagram") {
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
        }
        catch (error) {
            console.error("CLIENT_IDENTITY_ERROR", error);
            throw error;
        }
    }
    async createOrUpdatePipeline(clientId, sourceChannel, isNew = false) {
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
        }
        catch (error) {
            console.error("PIPELINE_ERROR", error);
            return { updated: false };
        }
    }
    async updateChannelLastContact(channelId) {
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
        }
        catch (error) {
            console.error("CHANNEL_UPDATE_ERROR", error);
            return false;
        }
    }
    async updatePipelineLastContact(clientId) {
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
        }
        catch (error) {
            console.error("PIPELINE_UPDATE_ERROR", error);
            return false;
        }
    }
    async linkClientToSession(sessionId, clientId) {
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
    async getClientChannels(clientId) {
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
        }
        catch (error) {
            console.error("GET_CLIENT_CHANNELS_ERROR", error);
            return [];
        }
    }
    async getClientPipeline(clientId) {
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
        }
        catch (error) {
            console.error("GET_CLIENT_PIPELINE_ERROR", error);
            return null;
        }
    }
}
exports.clientIdentityService = new ClientIdentityService();
