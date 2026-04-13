"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookSupabaseClient = createWebhookSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
// Cliente Supabase para webhooks (server-side com service role)
function createWebhookSupabaseClient() {
    const env = (0, env_1.getAdminEnv)();
    return (0, supabase_js_1.createClient)(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
