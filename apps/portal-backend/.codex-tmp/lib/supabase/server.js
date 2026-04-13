"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerSupabaseClient = createServerSupabaseClient;
require("server-only");
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
const env_1 = require("../config/env");
async function createServerSupabaseClient() {
    const cookieStore = await (0, headers_1.cookies)();
    const env = (0, env_1.getPublicEnv)();
    return (0, ssr_1.createServerClient)(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                }
                catch (_error) {
                    // Some server render paths cannot set cookies directly.
                }
            }
        }
    });
}
