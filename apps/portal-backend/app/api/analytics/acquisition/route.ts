import { NextRequest, NextResponse } from "next/server";
import { createWebhookSupabaseClient } from "@/lib/supabase/webhook";
import { getCurrentProfile } from "@/lib/auth/guards";

// Tipos para os dados de analytics
interface AnalyticsMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  scheduledAppointments: number;
  conversions: number;
  conversionRate: number;
  averageResponseTime: number;
}

interface FunnelData {
  stage: string;
  count: number;
  dropRate: number;
}

interface SourcePerformance {
  source: string;
  leads: number;
  qualified: number;
  scheduled: number;
  converted: number;
  conversionRate: number;
}

interface TopicPerformance {
  topic: string;
  leads: number;
  conversions: number;
  conversionRate: number;
}

interface CampaignPerformance {
  campaign: string;
  leads: number;
  conversions: number;
  conversionRate: number;
}

interface ContentPerformance {
  contentId: string;
  leadsGenerated: number;
  conversions: number;
  conversionRate: number;
}

interface AnalyticsResponse {
  metrics: AnalyticsMetrics;
  funnel: FunnelData[];
  sources: SourcePerformance[];
  topics: TopicPerformance[];
  campaigns: CampaignPerformance[];
  content: ContentPerformance[];
  period: string;
  generatedAt: string;
}

function logEvent(event: string, data?: unknown, level: "info" | "warn" | "error" = "info") {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      data: data ?? null,
    })
  );
}

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "7days":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "30days":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const profile = await getCurrentProfile();

    if (!profile || !["staff", "admin"].includes(profile.role)) {
      logEvent(
        "ANALYTICS_ACCESS_DENIED",
        {
          userId: profile?.id,
          role: profile?.role,
        },
        "warn"
      );

      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7days";

    logEvent("ANALYTICS_ACCESS_GRANTED", {
      userId: profile.id,
      role: profile.role,
      period,
    });

    const supabase = createWebhookSupabaseClient();
    const { start, end } = getDateRange(period);

    // Buscar métricas principais
    const { data: leadsData, error: leadsError } = await supabase
      .from("noemia_leads")
      .select("*")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (leadsError) {
      logEvent(
        "ANALYTICS_LEADS_QUERY_ERROR",
        {
          error: leadsError.message,
        },
        "error"
      );

      return NextResponse.json({ error: "Erro ao buscar dados de leads" }, { status: 500 });
    }

    // Buscar eventos de aquisição
    const { data: eventsData, error: eventsError } = await supabase
      .from("acquisition_events")
      .select("*")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (eventsError) {
      logEvent(
        "ANALYTICS_EVENTS_QUERY_ERROR",
        {
          error: eventsError.message,
        },
        "error"
      );

      return NextResponse.json({ error: "Erro ao buscar dados de eventos" }, { status: 500 });
    }

    // Processar métricas
    const metrics: AnalyticsMetrics = {
      totalLeads: leadsData?.length || 0,
      qualifiedLeads: eventsData?.filter((e) => e.event_type === "qualified").length || 0,
      scheduledAppointments: eventsData?.filter((e) => e.event_type === "scheduled").length || 0,
      conversions: eventsData?.filter((e) => e.event_type === "converted").length || 0,
      conversionRate: 0,
      averageResponseTime: 0, // TODO: Calcular tempo médio de resposta
    };

    // Calcular taxa de conversão
    if (metrics.totalLeads > 0) {
      metrics.conversionRate = (metrics.conversions / metrics.totalLeads) * 100;
    }

    // Processar dados do funil
    const funnelStages = [
      { event: "lead_created", label: "Leads Criados" },
      { event: "qualified", label: "Qualificados" },
      { event: "scheduled", label: "Agendados" },
      { event: "converted", label: "Convertidos" },
    ];

    const funnel: FunnelData[] = [];
    let previousCount = 0;

    funnelStages.forEach((stage, index) => {
      const count = eventsData?.filter((e) => e.event_type === stage.event).length || 0;
      const dropRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;

      funnel.push({
        stage: stage.label,
        count,
        dropRate: index > 0 ? dropRate : 0,
      });

      previousCount = count;
    });

    // Processar performance por origem
    const sourceMap = new Map<string, SourcePerformance>();

    eventsData?.forEach((event) => {
      if (!event.source) return;

      const existing = sourceMap.get(event.source) || {
        source: event.source,
        leads: 0,
        qualified: 0,
        scheduled: 0,
        converted: 0,
        conversionRate: 0,
      };

      if (event.event_type === "lead_created") existing.leads++;
      if (event.event_type === "qualified") existing.qualified++;
      if (event.event_type === "scheduled") existing.scheduled++;
      if (event.event_type === "converted") existing.converted++;

      sourceMap.set(event.source, existing);
    });

    // Calcular taxas de conversão por origem
    const sources: SourcePerformance[] = Array.from(sourceMap.values())
      .map((source) => ({
        ...source,
        conversionRate: source.leads > 0 ? (source.converted / source.leads) * 100 : 0,
      }))
      .sort((a, b) => b.converted - a.converted);

    // Processar performance por tema
    const topicMap = new Map<string, TopicPerformance>();

    eventsData?.forEach((event) => {
      if (!event.topic) return;

      const existing = topicMap.get(event.topic) || {
        topic: event.topic,
        leads: 0,
        conversions: 0,
        conversionRate: 0,
      };

      if (event.event_type === "lead_created") existing.leads++;
      if (event.event_type === "converted") existing.conversions++;

      topicMap.set(event.topic, existing);
    });

    const topics: TopicPerformance[] = Array.from(topicMap.values())
      .map((topic) => ({
        ...topic,
        conversionRate: topic.leads > 0 ? (topic.conversions / topic.leads) * 100 : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    // Processar performance por campanha
    const campaignMap = new Map<string, CampaignPerformance>();

    eventsData?.forEach((event) => {
      if (!event.campaign) return;

      const existing = campaignMap.get(event.campaign) || {
        campaign: event.campaign,
        leads: 0,
        conversions: 0,
        conversionRate: 0,
      };

      if (event.event_type === "lead_created") existing.leads++;
      if (event.event_type === "converted") existing.conversions++;

      campaignMap.set(event.campaign, existing);
    });

    const campaigns: CampaignPerformance[] = Array.from(campaignMap.values())
      .map((campaign) => ({
        ...campaign,
        conversionRate: campaign.leads > 0 ? (campaign.conversions / campaign.leads) * 100 : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    // Processar performance por conteúdo
    const contentMap = new Map<string, ContentPerformance>();

    eventsData?.forEach((event) => {
      if (!event.content_id) return;

      const existing = contentMap.get(event.content_id) || {
        contentId: event.content_id,
        leadsGenerated: 0,
        conversions: 0,
        conversionRate: 0,
      };

      if (event.event_type === "lead_created") existing.leadsGenerated++;
      if (event.event_type === "converted") existing.conversions++;

      contentMap.set(event.content_id, existing);
    });

    const content: ContentPerformance[] = Array.from(contentMap.values())
      .map((contentItem) => ({
        ...contentItem,
        conversionRate:
          contentItem.leadsGenerated > 0
            ? (contentItem.conversions / contentItem.leadsGenerated) * 100
            : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    const response: AnalyticsResponse = {
      metrics,
      funnel,
      sources,
      topics,
      campaigns,
      content,
      period,
      generatedAt: new Date().toISOString(),
    };

    logEvent("ANALYTICS_DATA_FETCHED", {
      userId: profile.id,
      period,
      totalLeads: metrics.totalLeads,
      conversionRate: metrics.conversionRate,
    });

    return NextResponse.json(response);
  } catch (error) {
    logEvent(
      "ANALYTICS_SERVER_ERROR",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}