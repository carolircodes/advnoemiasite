import { NextRequest, NextResponse } from "next/server";
import { createWebhookSupabaseClient } from "../../../../../lib/supabase/webhook";

export async function GET() {
  try {
    const supabase = createWebhookSupabaseClient();
    
    const { data: events, error } = await supabase
      .from('comment_keyword_events')
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
      completed: events?.filter((e: any) => e.processing_status === 'completed').length || 0,
      failed: events?.filter((e: any) => e.processing_status === 'failed').length || 0,
      pending: events?.filter((e: any) => e.processing_status === 'pending').length || 0,
      processing: events?.filter((e: any) => e.processing_status === 'processing').length || 0,
      publicReplied: events?.filter((e: any) => e.public_replied).length || 0,
      dmSent: events?.filter((e: any) => e.dm_sent).length || 0,
      uniqueUsers: new Set(events?.map((e: any) => e.external_user_id) || []).size,
      uniqueMedia: new Set(events?.map((e: any) => e.media_id) || []).size
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
