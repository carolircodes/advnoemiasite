import { NextRequest, NextResponse } from "next/server";
import { createWebhookSupabaseClient } from "../../../../../lib/supabase/webhook";

export async function GET() {
  try {
    const supabase = createWebhookSupabaseClient();
    
    const { data: campaigns, error } = await supabase
      .from('comment_keyword_campaigns')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('ERROR_GETTING_CAMPAIGNS:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch campaigns',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaigns: campaigns || [],
      count: campaigns?.length || 0
    });

  } catch (error) {
    console.log('EXCEPTION_GETTING_CAMPAIGNS:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
