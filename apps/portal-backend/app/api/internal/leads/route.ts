import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireProfile(["admin", "advogada"]);
    const supabase = await createServerSupabaseClient();

    // Buscar todos os leads da tabela noemia_leads
    const { data: leads, error } = await supabase
      .from("noemia_leads")
      .select("*")
      .order("last_contact_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar leads:", error);
      return NextResponse.json(
        { error: "Erro ao buscar leads" },
        { status: 500 }
      );
    }

    return NextResponse.json(leads || []);

  } catch (error) {
    console.error("Erro na rota de leads:", error);
    
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

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile(["admin", "advogada"]);
    const body = await request.json();
    const supabase = await createServerSupabaseClient();

    // Atualizar status de um lead
    const { id, lead_status, funnel_stage, urgency } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do lead é obrigatório" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (lead_status) updateData.lead_status = lead_status;
    if (funnel_stage) updateData.funnel_stage = funnel_stage;
    if (urgency) updateData.urgency = urgency;

    const { data, error } = await supabase
      .from("noemia_leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar lead:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar lead" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("Erro na rota de leads POST:", error);
    
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
