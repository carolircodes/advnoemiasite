import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { 
  extractAcquisitionParams, 
  createAcquisitionContext, 
  logAcquisitionEvent,
  generateAIContext,
  adaptLanguageForTopic
} from '@/lib/acquisition/acquisition-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const body = await request.json();
    const { name, email, phone, message, ...otherData } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Nome, email e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const acquisitionData = extractAcquisitionParams(searchParams);
    
    const acquisitionContext = createAcquisitionContext(acquisitionData);
    
    const aiContext = generateAIContext(acquisitionContext);
    const languageAdaptation = adaptLanguageForTopic(acquisitionContext.topic);

    const { data: lead, error: leadError } = await supabase
      .from('noemia_leads')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ''),
        message: message || '',
        status: 'new',
        lead_status: 'new',
        funnel_stage: 'top',
        urgency: 'medium',

        source: acquisitionContext.source,
        campaign: acquisitionContext.campaign,
        topic: acquisitionContext.topic,
        content_id: acquisitionContext.content_id,
        acquisition_metadata: acquisitionContext.acquisition_metadata,
        acquisition_tags: acquisitionContext.acquisition_tags,
        utm_source: acquisitionContext.utm_source,
        utm_medium: acquisitionContext.utm_medium,
        utm_campaign: acquisitionContext.utm_campaign,
        utm_term: acquisitionContext.utm_term,
        utm_content: acquisitionContext.utm_content,

        metadata: {
          ...otherData,
          acquisition_context: {
            ai_context: aiContext,
            language_adaptation: languageAdaptation,
            detected_at: new Date().toISOString()
          }
        },

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (leadError) {
      console.error('ACQUISITION_TRACKING: Erro ao criar lead:', leadError);
      return NextResponse.json(
        { error: 'Erro ao criar lead' },
        { status: 500 }
      );
    }

    try {
      await logAcquisitionEvent({
        lead_id: lead.id,
        event_type: 'lead_created',
        metadata: {
          acquisition_data: acquisitionData,
          ai_context: aiContext,
          language_adaptation: languageAdaptation,
          user_agent: request.headers.get('user-agent'),
          referer: request.headers.get('referer')
        }
      });
    } catch (eventError) {
      console.error('ACQUISITION_TRACKING: Erro ao registrar evento (não crítico):', eventError);
    }

    console.log('ACQUISITION_TRACKING: Lead criado com sucesso:', {
      leadId: lead.id,
      source: acquisitionContext.source,
      topic: acquisitionContext.topic,
      campaign: acquisitionContext.campaign,
      hasAIContext: !!aiContext,
      hasLanguageAdaptation: !!languageAdaptation
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        topic: lead.topic,
        campaign: lead.campaign,
        acquisition_tags: lead.acquisition_tags
      },
      acquisition_context: {
        source: acquisitionContext.source,
        topic: acquisitionContext.topic,
        campaign: acquisitionContext.campaign,
        ai_context: aiContext,
        language_adaptation: languageAdaptation
      },
      message: 'Lead criado com sucesso'
    });

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Erro geral ao criar lead:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const { getAcquisitionInsights } = require('@/lib/acquisition/acquisition-service');
    const insights = await getAcquisitionInsights(startDate, endDate);

    if (!insights) {
      return NextResponse.json(
        { error: 'Erro ao buscar insights' },
        { status: 500 }
      );
    }

    const processedInsights = {
      total_events: insights.length,
      events_by_type: insights.reduce((acc: any, event: any) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {}),
      events_by_source: insights.reduce((acc: any, event: any) => {
        if (event.source) {
          acc[event.source] = (acc[event.source] || 0) + 1;
        }
        return acc;
      }, {}),
      events_by_topic: insights.reduce((acc: any, event: any) => {
        if (event.topic) {
          acc[event.topic] = (acc[event.topic] || 0) + 1;
        }
        return acc;
      }, {}),
      events_by_campaign: insights.reduce((acc: any, event: any) => {
        if (event.campaign) {
          acc[event.campaign] = (acc[event.campaign] || 0) + 1;
        }
        return acc;
      }, {}),
      recent_events: insights.slice(0, 10)
    };

    return NextResponse.json({
      success: true,
      insights: processedInsights,
      period: {
        start_date: startDate,
        end_date: endDate
      }
    });

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Erro ao buscar insights:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}