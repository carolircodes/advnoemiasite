import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const access = await requireStaffRouteAccess({
      service: "internal_lead_conversations",
      action: "read"
    });

    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: conversations, error } = await supabase
      .from("noemia_conversations")
      .select("*")
      .eq("platform_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar conversas:", error);
      return NextResponse.json(
        { error: "Erro ao buscar conversas" },
        { status: 500 }
      );
    }

    return NextResponse.json(conversations || []);
  } catch (error) {
    console.error("Erro na rota de conversas:", error);
    return jsonError(extractErrorMessage(error, "Erro interno do servidor"), 500);
  }
}
