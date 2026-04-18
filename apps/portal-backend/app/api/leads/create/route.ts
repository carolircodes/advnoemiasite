import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import {
  adaptLanguageForTopic,
  createAcquisitionContext,
  extractAcquisitionParams,
  generateAIContext,
  getAcquisitionInsights,
  logAcquisitionEvent
} from "@/lib/acquisition/acquisition-service";
import {
  buildDurableRateLimitHeaders,
  consumeDurableRateLimit
} from "@/lib/http/durable-abuse-protection";
import { extractErrorMessage } from "@/lib/http/api-response";
import { getClientIp, parseJsonBody } from "@/lib/http/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const createLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(8).max(30),
    message: z.string().trim().max(4000).optional().default("")
  })
  .passthrough();

export async function POST(request: NextRequest) {
  const rateLimit = await consumeDurableRateLimit({
    bucket: "lead-create",
    key: `${getClientIp(request)}:${request.headers.get("x-product-session-id") || "anon"}`,
    limit: 6,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "lead_create_rate_limited" },
      {
        status: 429,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  try {
    const parsedBody = await parseJsonBody(request, createLeadSchema, {
      invalidBodyError: "invalid_lead_request"
    });

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const supabase = createAdminSupabaseClient();
    const { name, email, phone, message, ...otherData } = parsedBody.data;
    const { searchParams } = new URL(request.url);
    const acquisitionData = extractAcquisitionParams(searchParams);
    const acquisitionContext = createAcquisitionContext(acquisitionData);
    const aiContext = generateAIContext(acquisitionContext);
    const languageAdaptation = adaptLanguageForTopic(acquisitionContext.topic);

    const { data: lead, error: leadError } = await supabase
      .from("noemia_leads")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ""),
        message,
        status: "new",
        lead_status: "curioso",
        funnel_stage: "contato_inicial",
        urgency: "media",
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
      .select("id,status")
      .single();

    if (leadError || !lead) {
      console.error("ACQUISITION_TRACKING: failed to create lead", {
        message: leadError?.message || "unknown_error"
      });

      return NextResponse.json(
        { ok: false, error: "Nao foi possivel registrar o lead agora." },
        {
          status: 500,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    try {
      await logAcquisitionEvent({
        lead_id: lead.id,
        event_type: "lead_created",
        metadata: {
          acquisition_data: acquisitionData,
          ai_context: aiContext,
          language_adaptation: languageAdaptation,
          user_agent: request.headers.get("user-agent"),
          referer: request.headers.get("referer")
        }
      });
    } catch (eventError) {
      console.error("ACQUISITION_TRACKING: failed to log acquisition event", {
        leadId: lead.id,
        message: extractErrorMessage(eventError, "unknown_error")
      });
    }

    return NextResponse.json(
      {
        ok: true,
        lead: {
          id: lead.id,
          status: lead.status
        },
        message: "Lead criado com sucesso"
      },
      {
        status: 201,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  } catch (error) {
    console.error("ACQUISITION_TRACKING: unhandled lead creation error", {
      message: extractErrorMessage(error, "Erro interno do servidor")
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno do servidor"
      },
      {
        status: 500,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "leads_create",
    action: "acquisition_insights"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const insights = await getAcquisitionInsights(startDate || undefined, endDate || undefined);

    if (!insights) {
      return NextResponse.json(
        { error: "Erro ao buscar insights" },
        { status: 500 }
      );
    }

    const processedInsights = {
      total_events: insights.length,
      events_by_type: insights.reduce<Record<string, number>>((accumulator, event) => {
        accumulator[event.event_type] = (accumulator[event.event_type] || 0) + 1;
        return accumulator;
      }, {}),
      events_by_source: insights.reduce<Record<string, number>>((accumulator, event) => {
        if (event.source) {
          accumulator[event.source] = (accumulator[event.source] || 0) + 1;
        }
        return accumulator;
      }, {}),
      events_by_topic: insights.reduce<Record<string, number>>((accumulator, event) => {
        if (event.topic) {
          accumulator[event.topic] = (accumulator[event.topic] || 0) + 1;
        }
        return accumulator;
      }, {}),
      events_by_campaign: insights.reduce<Record<string, number>>((accumulator, event) => {
        if (event.campaign) {
          accumulator[event.campaign] = (accumulator[event.campaign] || 0) + 1;
        }
        return accumulator;
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
    console.error("ACQUISITION_TRACKING: failed to load insights", {
      message: extractErrorMessage(error, "Erro interno do servidor")
    });

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
