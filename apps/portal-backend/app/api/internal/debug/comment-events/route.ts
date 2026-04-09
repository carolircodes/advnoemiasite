import { NextRequest, NextResponse } from "next/server";
import { createWebhookSupabaseClient } from "../../../../../lib/supabase/webhook";

export async function GET() {
  try {
    const supabase = createWebhookSupabaseClient();
    
    const { data: events, error } = await supabase
      .from('keyword_automation_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('ERROR_GETTING_COMMENT_EVENTS:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch comment events',
        details: error.message 
      }, { status: 500 });
    }

    // Estatísticas
    const stats = {
      total: events?.length || 0,
      completed: events?.length || 0, // Todos estão completos na nova tabela
      failed: 0, // Não temos campo de status na nova tabela
      pending: 0, // Não temos campo de status na nova tabela
      processing: 0, // Não temos campo de status na nova tabela
      publicReplied: 0, // Não temos campo de public reply na nova tabela
      dmSent: events?.filter((e: any) => e.dm_sent).length || 0,
      uniqueUsers: new Set(events?.map((e: any) => e.user_id) || []).size,
      uniqueMedia: new Set(events?.map((e: any) => e.comment_id) || []).size
    };

    return NextResponse.json({
      success: true,
      events: events || [],
      stats,
      count: events?.length || 0
    });

  } catch (error) {
    console.log('EXCEPTION_GETTING_COMMENT_EVENTS:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
