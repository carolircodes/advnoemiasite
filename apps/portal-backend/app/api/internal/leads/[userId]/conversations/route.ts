import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/guards";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await requireProfile(["admin", "advogada"]);
    const { userId } = await context.params;
    const supabase = await createServerSupabaseClient();

    // Buscar conversas do usuário
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
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
