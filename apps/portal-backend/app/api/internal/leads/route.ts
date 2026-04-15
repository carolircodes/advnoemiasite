import { NextRequest, NextResponse } from "next/server";

import { requireProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const leadStatusAliases: Record<string, string> = {
  new: "curioso"
};

const funnelStageAliases: Record<string, string> = {
  top: "contato_inicial",
  middle: "qualificacao",
  bottom: "agendamento"
};

const urgencyAliases: Record<string, string> = {
  low: "baixa",
  medium: "media",
  high: "alta"
};

function normalizeWorkspaceLead(record: Record<string, unknown>) {
  return {
    ...record,
    lead_status:
      typeof record.lead_status === "string"
        ? leadStatusAliases[record.lead_status] || record.lead_status
        : "curioso",
    funnel_stage:
      typeof record.funnel_stage === "string"
        ? funnelStageAliases[record.funnel_stage] || record.funnel_stage
        : "contato_inicial",
    urgency:
      typeof record.urgency === "string"
        ? urgencyAliases[record.urgency] || record.urgency
        : "media"
  };
}

export async function GET() {
  try {
    await requireProfile(["admin", "advogada"]);

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("noemia_leads")
      .select("*")
      .order("last_contact_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar leads:", error);
      return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 });
    }

    return NextResponse.json(Array.isArray(data) ? data.map(normalizeWorkspaceLead) : []);
  } catch (error) {
    console.error("Erro na rota de leads:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile(["admin", "advogada"]);

    const body = await request.json();
    const { id, lead_status, funnel_stage, urgency, operational_status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do lead Ã© obrigatÃ³rio" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (lead_status) updateData.lead_status = lead_status;
    if (funnel_stage) updateData.funnel_stage = funnel_stage;
    if (urgency) updateData.urgency = urgency;
    if (operational_status) updateData.operational_status = operational_status;

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("noemia_leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar lead:", error);
      return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro na rota de leads POST:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
