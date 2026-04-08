import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, getLeadsByPriority, getLeadsByTheme, getLeadsByUrgency, getLeadsStats, type LeadData } from '../../../../lib/services/leads-dashboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') as 'high' | 'normal' | 'all' || 'all';
    const theme = searchParams.get('theme') || 'all';
    const urgency = searchParams.get('urgency') as 'high' | 'medium' | 'low' | 'all' || 'all';

    let leads: LeadData[];

    // Aplicar filtros
    if (priority !== 'all') {
      leads = getLeadsByPriority(priority);
    } else if (theme !== 'all') {
      leads = getLeadsByTheme(theme);
    } else if (urgency !== 'all') {
      leads = getLeadsByUrgency(urgency);
    } else {
      leads = getAllLeads();
    }

    // Obter estatísticas
    const stats = getLeadsStats();

    return NextResponse.json({
      success: true,
      data: {
        leads,
        stats,
        filters: {
          priority,
          theme,
          urgency
        }
      }
    });
  } catch (error) {
    console.error('[NOEMIA_LEADS] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao carregar dados dos leads' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action } = body;

    // TODO: Implementar ações como:
    // - Marcar lead como contatado
    // - Atualizar status
    // - Adicionar notas internas
    // - Enviar para equipe

    console.log(`[NOEMIA_LEADS] Action ${action} executed for lead ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: `Ação ${action} executada para o lead ${sessionId}`
    });
  } catch (error) {
    console.error('[NOEMIA_LEADS] POST Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao executar ação no lead' 
      },
      { status: 500 }
    );
  }
}
