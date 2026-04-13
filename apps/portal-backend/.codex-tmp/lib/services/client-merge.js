"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientMergeService = void 0;
const webhook_1 = require("../supabase/webhook");
class ClientMergeService {
    getSupabase() {
        return (0, webhook_1.createWebhookSupabaseClient)();
    }
    async mergeClients(input) {
        console.log("CLIENT_MERGE_START", {
            sourceClientId: input.sourceClientId,
            targetClientId: input.targetClientId,
            reason: input.reason,
            mergeBy: input.mergeBy
        });
        const result = {
            success: false,
            mergedClientId: input.sourceClientId,
            targetClientId: input.targetClientId,
            movedChannels: 0,
            movedSessions: 0,
            movedPipeline: false,
            errors: []
        };
        try {
            const supabase = this.getSupabase();
            const { data: sourceClient, error: sourceError } = await supabase
                .from("clients")
                .select("*")
                .eq("id", input.sourceClientId)
                .eq("merge_status", "active")
                .single();
            if (sourceError || !sourceClient) {
                result.errors?.push("Source client not found or not active");
                return result;
            }
            const { data: targetClient, error: targetError } = await supabase
                .from("clients")
                .select("*")
                .eq("id", input.targetClientId)
                .eq("merge_status", "active")
                .single();
            if (targetError || !targetClient) {
                result.errors?.push("Target client not found or not active");
                return result;
            }
            const conflictCheck = await this.checkChannelConflicts(input.sourceClientId, input.targetClientId);
            if (conflictCheck.hasConflicts) {
                result.errors?.push(`Channel conflicts detected: ${conflictCheck.conflicts.join(", ")}`);
                return result;
            }
            const channelsResult = await this.moveClientChannels(input.sourceClientId, input.targetClientId);
            result.movedChannels = channelsResult.moved;
            const sessionsResult = await this.moveConversationSessions(input.sourceClientId, input.targetClientId);
            result.movedSessions = sessionsResult.moved;
            const pipelineResult = await this.moveClientPipeline(input.sourceClientId, input.targetClientId);
            result.movedPipeline = pipelineResult.moved;
            const { error: mergeError } = await supabase
                .from("clients")
                .update({
                merged_into_client_id: input.targetClientId,
                merge_status: "merged",
                updated_at: new Date().toISOString()
            })
                .eq("id", input.sourceClientId);
            if (mergeError) {
                result.errors?.push("Failed to mark source client as merged");
                return result;
            }
            result.success = true;
            console.log("CLIENT_MERGE_COMPLETED", {
                sourceClientId: input.sourceClientId,
                targetClientId: input.targetClientId,
                movedChannels: result.movedChannels,
                movedSessions: result.movedSessions,
                movedPipeline: result.movedPipeline
            });
            return result;
        }
        catch (error) {
            console.error("CLIENT_MERGE_ERROR", error);
            result.errors?.push(error instanceof Error ? error.message : String(error));
            return result;
        }
    }
    async linkChannelToExistingClient(input) {
        console.log("CHANNEL_LINK_START", {
            clientId: input.clientId,
            channel: input.channel,
            externalUserId: input.externalUserId,
            externalThreadId: input.externalThreadId
        });
        try {
            const supabase = this.getSupabase();
            const { data: client, error: clientError } = await supabase
                .from("clients")
                .select("*")
                .eq("id", input.clientId)
                .eq("merge_status", "active")
                .single();
            if (clientError || !client) {
                return {
                    success: false,
                    action: "error",
                    error: "Client not found or not active"
                };
            }
            const { data: existingChannel, error: channelError } = await supabase
                .from("client_channels")
                .select("*")
                .eq("channel", input.channel)
                .eq("external_user_id", input.externalUserId)
                .eq("is_active", true)
                .single();
            if (channelError && channelError.code !== "PGRST116") {
                return {
                    success: false,
                    action: "error",
                    error: "Error checking existing channel"
                };
            }
            if (!existingChannel) {
                const { data: newChannel, error: createError } = await supabase
                    .from("client_channels")
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
                        action: "error",
                        error: "Failed to create channel link"
                    };
                }
                console.log("CHANNEL_LINK_CREATED", {
                    channelId: newChannel.id,
                    clientId: input.clientId,
                    channel: input.channel,
                    externalUserId: input.externalUserId
                });
                return {
                    success: true,
                    action: "linked",
                    clientId: input.clientId,
                    channelId: newChannel.id
                };
            }
            if (existingChannel.client_id === input.clientId) {
                return {
                    success: true,
                    action: "linked",
                    clientId: input.clientId,
                    channelId: existingChannel.id
                };
            }
            console.log("CHANNEL_LINK_CONFLICT", {
                existingClientId: existingChannel.client_id,
                requestedClientId: input.clientId,
                channel: input.channel,
                externalUserId: input.externalUserId
            });
            return {
                success: false,
                action: "conflict",
                conflictWithClientId: existingChannel.client_id
            };
        }
        catch (error) {
            console.error("CHANNEL_LINK_ERROR", error);
            return {
                success: false,
                action: "error",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async getCanonicalClientId(clientId) {
        try {
            const { data, error } = await this.getSupabase().rpc("get_canonical_client_id", {
                client_uuid: clientId
            });
            if (error) {
                console.error("GET_CANONICAL_CLIENT_ERROR", error);
                return clientId;
            }
            console.log("CLIENT_CANONICAL_RESOLVED", {
                originalClientId: clientId,
                canonicalClientId: data
            });
            return data || clientId;
        }
        catch (error) {
            console.error("GET_CANONICAL_CLIENT_ERROR", error);
            return clientId;
        }
    }
    async checkChannelConflicts(sourceClientId, targetClientId) {
        try {
            const supabase = this.getSupabase();
            const { data: sourceChannels, error: sourceError } = await supabase
                .from("client_channels")
                .select("channel, external_user_id")
                .eq("client_id", sourceClientId)
                .eq("is_active", true);
            if (sourceError || !sourceChannels) {
                return { hasConflicts: false, conflicts: [] };
            }
            const conflicts = [];
            for (const channel of sourceChannels) {
                const { data: existingChannel } = await supabase
                    .from("client_channels")
                    .select("id")
                    .eq("client_id", targetClientId)
                    .eq("channel", channel.channel)
                    .eq("external_user_id", channel.external_user_id)
                    .eq("is_active", true)
                    .single();
                if (existingChannel) {
                    conflicts.push(`${channel.channel}:${channel.external_user_id}`);
                }
            }
            return { hasConflicts: conflicts.length > 0, conflicts };
        }
        catch (error) {
            console.error("CHECK_CHANNEL_CONFLICTS_ERROR", error);
            return { hasConflicts: true, conflicts: ["error_checking_conflicts"] };
        }
    }
    async moveClientChannels(sourceClientId, targetClientId) {
        try {
            const { error } = await this.getSupabase()
                .from("client_channels")
                .update({ client_id: targetClientId })
                .eq("client_id", sourceClientId);
            if (error) {
                console.error("MOVE_CLIENT_CHANNELS_ERROR", error);
                return { moved: 0 };
            }
            return { moved: 1 };
        }
        catch (error) {
            console.error("MOVE_CLIENT_CHANNELS_ERROR", error);
            return { moved: 0 };
        }
    }
    async moveConversationSessions(sourceClientId, targetClientId) {
        try {
            const { error } = await this.getSupabase()
                .from("conversation_sessions")
                .update({ client_id: targetClientId })
                .eq("client_id", sourceClientId);
            if (error) {
                console.error("MOVE_CONVERSATION_SESSIONS_ERROR", error);
                return { moved: 0 };
            }
            return { moved: 1 };
        }
        catch (error) {
            console.error("MOVE_CONVERSATION_SESSIONS_ERROR", error);
            return { moved: 0 };
        }
    }
    async moveClientPipeline(sourceClientId, targetClientId) {
        try {
            const supabase = this.getSupabase();
            const { data: targetPipeline } = await supabase
                .from("client_pipeline")
                .select("id")
                .eq("client_id", targetClientId)
                .single();
            if (targetPipeline) {
                await supabase.from("client_pipeline").delete().eq("client_id", sourceClientId);
                return { moved: false };
            }
            const { error } = await supabase
                .from("client_pipeline")
                .update({ client_id: targetClientId })
                .eq("client_id", sourceClientId);
            if (error) {
                console.error("MOVE_CLIENT_PIPELINE_ERROR", error);
                return { moved: false };
            }
            return { moved: true };
        }
        catch (error) {
            console.error("MOVE_CLIENT_PIPELINE_ERROR", error);
            return { moved: false };
        }
    }
    async getClientCanonicalChannels(clientId) {
        try {
            const canonicalClientId = await this.getCanonicalClientId(clientId);
            const { data, error } = await this.getSupabase()
                .from("client_channels")
                .select("*")
                .eq("client_id", canonicalClientId)
                .eq("is_active", true)
                .order("last_contact_at", { ascending: false });
            if (error) {
                console.error("GET_CLIENT_CANONICAL_CHANNELS_ERROR", error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error("GET_CLIENT_CANONICAL_CHANNELS_ERROR", error);
            return [];
        }
    }
    async getClientCanonicalPipeline(clientId) {
        try {
            const canonicalClientId = await this.getCanonicalClientId(clientId);
            const { data, error } = await this.getSupabase()
                .from("client_pipeline")
                .select("*")
                .eq("client_id", canonicalClientId)
                .single();
            if (error && error.code !== "PGRST116") {
                console.error("GET_CLIENT_CANONICAL_PIPELINE_ERROR", error);
            }
            return data;
        }
        catch (error) {
            console.error("GET_CLIENT_CANONICAL_PIPELINE_ERROR", error);
            return null;
        }
    }
}
exports.clientMergeService = new ClientMergeService();
