import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAcquisitionEvent } from '@/lib/acquisition/acquisition-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { lead_id, event_type, metadata = {} } = body;

    // Validar campos obrigatórios
    if (!lead_id || !event_type) {
      return NextResponse.json(
        { error: 'lead_id e event_type são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipos de eventos permitidos
    const validEventTypes = ['lead_created', 'first_message_sent', 'qualified', 'scheduled', 'converted'];
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: 'Tipo de evento inválido' },
        { status: 400 }
      );
    }

    // Registrar evento
    await logAcquisitionEvent({
      lead_id,
      event_type,
      metadata
    });

    console.log('ACQUISITION_TRACKING: Evento registrado manualmente:', {
      lead_id,
      event_type,
      metadata
    });

    return NextResponse.json({
      success: true,
      message: 'Evento registrado com sucesso'
    });

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Erro ao registrar evento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Método GET para buscar eventos de um lead específico
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!leadId) {
      return NextResponse.json(
        { error: 'lead_id é obrigatório' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('acquisition_events')
      .select(`
        id,
        event_type,
        source,
        campaign,
        topic,
        content_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        metadata,
        created_at
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('ACQUISITION_TRACKING: Erro ao buscar eventos:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar eventos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      total: events?.length || 0
    });

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Erro geral ao buscar eventos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
