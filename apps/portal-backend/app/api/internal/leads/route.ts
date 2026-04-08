import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/guards";
import { getAllLeads } from "@/lib/services/noemia";

// Função interna de sincronização - idempotente e segura
async function syncLeadsToDatabase() {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Buscar leads reais da NoemIA (sessionContexts)
    const noemiaLeads = getAllLeads();
    
    // Transformar para o formato do banco
    const transformedLeads = noemiaLeads.map(lead => ({
      id: lead.sessionId, // Chave única: sessionId
      platform_user_id: lead.sessionId,
      username: `Session ${lead.sessionId.slice(-8)}`,
      legal_area: mapThemeToLegalArea(lead.theme),
      lead_status: mapTemperatureToStatus(lead.temperature),
      funnel_stage: mapPriorityToFunnel(lead.priority),
      urgency: lead.urgency,
      last_message: lead.lastMessage,
      last_contact_at: lead.timestamp.toISOString(),
      first_contact_at: lead.timestamp.toISOString(),
      conversation_count: 1,
      wants_human: lead.summary?.needsHumanAttention || false,
      should_schedule: lead.priority === 'high',
      summary: lead.summary?.problem || '',
      suggested_action: generateSuggestedAction(lead),
      last_response: "Resposta automática da NoemIA",
      created_at: lead.timestamp.toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Buscar leads existentes no banco para comparação
    const { data: existingLeads, error: fetchError } = await supabase
      .from("noemia_leads")
      .select("id, updated_at, created_at, lead_status, funnel_stage, urgency")
      .in("id", transformedLeads.map(l => l.id));

    if (fetchError) {
      console.error("Erro ao buscar leads existentes:", fetchError);
      return { success: false, error: fetchError };
    }

    // Criar mapa de leads existentes para lookup O(1)
    const existingLeadsMap = new Map(
      existingLeads?.map(lead => [lead.id, lead]) || []
    );

    // Separar leads novos vs existentes
    const newLeads: any[] = [];
    const leadsToUpdate: any[] = [];

    for (const lead of transformedLeads) {
      const existing = existingLeadsMap.get(lead.id);
      
      if (!existing) {
        // Lead novo - inserir
        newLeads.push(lead);
      } else {
        // Lead existe - verificar se precisa atualizar (idempotência)
        const lastUpdate = new Date(existing.updated_at).getTime();
        const noemiaUpdate = new Date(lead.last_contact_at).getTime();
        
        // Atualizar apenas se dados da NoemIA são mais recentes
        if (noemiaUpdate > lastUpdate || 
            existing.lead_status !== lead.lead_status ||
            existing.funnel_stage !== lead.funnel_stage ||
            existing.urgency !== lead.urgency) {
          
          leadsToUpdate.push({
            ...lead,
            // Manter created_at original
            created_at: existing.created_at || lead.created_at
          });
        }
      }
    }

    // Inserir novos leads (bulk operation)
    if (newLeads.length > 0) {
      const { error: insertError } = await supabase
        .from("noemia_leads")
        .insert(newLeads);

      if (insertError) {
        console.error("Erro ao inserir novos leads:", insertError);
        return { success: false, error: insertError };
      }
      
      console.log(`✅ Inseridos ${newLeads.length} novos leads`);
    }

    // Atualizar leads existentes (bulk operation)
    if (leadsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from("noemia_leads")
        .upsert(leadsToUpdate, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (updateError) {
        console.error("Erro ao atualizar leads:", updateError);
        return { success: false, error: updateError };
      }
      
      console.log(`✅ Atualizados ${leadsToUpdate.length} leads`);
    }

    return { success: true, inserted: newLeads.length, updated: leadsToUpdate.length };

  } catch (error) {
    console.error("Erro na sincronização:", error);
    return { success: false, error };
  }
}

export async function GET(request: NextRequest) {
  try {
    const profile = await requireProfile(["admin", "advogada"]);
    
    // Apenas ler dados do banco - GET idempotente
    const supabase = await createServerSupabaseClient();
    
    // Sincronização controlada (apenas se necessário)
    const syncNeeded = request.nextUrl.searchParams.get('sync') === 'true';
    if (syncNeeded) {
      const syncResult = await syncLeadsToDatabase();
      if (!syncResult.success) {
        console.error("Falha na sincronização:", syncResult.error);
        // Continuar mesmo com erro de sync para não quebrar o GET
      }
    }

    // Retornar leads do banco (leitura pura)
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
    const { id, lead_status, funnel_stage, urgency, operational_status } = body;

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
    if (operational_status) updateData.operational_status = operational_status;

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

// Funções de mapeamento
function mapThemeToLegalArea(theme?: string): string {
  const mapping: Record<string, string> = {
    'aposentadoria': 'previdenciario',
    'desconto-indevido': 'bancario',
    'pensao': 'familia',
    'divorcio': 'familia',
    'trabalhista': 'geral',
    'familia': 'familia'
  };
  return mapping[theme || ''] || 'geral';
}

function mapTemperatureToStatus(temperature?: string): string {
  const mapping: Record<string, string> = {
    'hot': 'quente',
    'warm': 'interessado',
    'cold': 'frio'
  };
  return mapping[temperature || ''] || 'frio';
}

function mapPriorityToFunnel(priority?: string): string {
  const mapping: Record<string, string> = {
    'high': 'agendamento',
    'normal': 'qualificacao'
  };
  return mapping[priority || ''] || 'contato_inicial';
}

function generateSuggestedAction(lead: any): string {
  if (lead.priority === 'high') {
    return "Contato imediato via WhatsApp - lead quente com alta urgência";
  }
  
  if (lead.temperature === 'warm') {
    return "Agendar consulta nos próximos 2 dias";
  }
  
  return "Nutrir com conteúdo relevante e agendar quando pronto";
}
