import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin";
import { getProductEventDefinition } from "../analytics/funnel-events";

export type AnalyticsPeriod = "today" | "7days" | "30days";

export type AcquisitionAnalyticsResponse = {
  metrics: {
    totalLeads: number;
    qualifiedLeads: number;
    hotLeads: number;
    scheduledAppointments: number;
    conversions: number;
    conversionRate: number;
    averageLeadScore: number;
    averageResponseTimeHours: number;
    strategicContentViews: number;
    ctaClicks: number;
    automationFailures: number;
  };
  funnel: Array<{
    stage: string;
    count: number;
    dropRate: number;
  }>;
  sources: Array<{
    source: string;
    leads: number;
    qualified: number;
    conversions: number;
    conversionRate: number;
  }>;
  channels: Array<{
    channel: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }>;
  topics: Array<{
    topic: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }>;
  campaigns: Array<{
    campaign: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }>;
  readiness: Array<{
    level: string;
    leads: number;
    hotLeads: number;
  }>;
  leadScore: {
    average: number;
    cold: number;
    warm: number;
    hot: number;
    urgent: number;
  };
  content: Array<{
    contentId: string;
    views: number;
    ctaClicks: number;
    qualifiedLeads: number;
    hotLeads: number;
    conversions: number;
    conversionRate: number;
  }>;
  experiments: Array<{
    experimentId: string;
    variantId: string;
    impressions: number;
    ctaClicks: number;
    triageSubmissions: number;
    leads: number;
    qualifiedLeads: number;
    conversions: number;
    conversionRate: number;
  }>;
  automation: {
    failedDispatches: number;
    failedNotifications: number;
  };
  period: AnalyticsPeriod;
  generatedAt: string;
};

type ProductEventRow = {
  event_key: string;
  event_group: string | null;
  page_path: string | null;
  intake_request_id: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

type IntakeRequestRow = {
  id: string;
  status: string;
  case_area: string;
  readiness_level: string | null;
  lead_score: number | null;
  lead_temperature: string | null;
  lifecycle_stage: string | null;
  source_path: string | null;
  experiment_context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type AppointmentRow = {
  id: string;
  status: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  status: string;
  channel: string | null;
  created_at: string;
};

type AutomationDispatchRow = {
  id: string;
  status: string | null;
  created_at: string;
};

function formatDropRate(previousCount: number, currentCount: number) {
  if (previousCount <= 0) {
    return 0;
  }

  return Number((((previousCount - currentCount) / previousCount) * 100).toFixed(1));
}

function getDateRange(period: AnalyticsPeriod) {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "30days":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "7days":
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

function readPayloadField(
  payload: Record<string, unknown> | null | undefined,
  field: string,
  fallback = "direct"
) {
  const value = payload?.[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return value.trim().slice(0, 120);
}

function pushAggregate(
  map: Map<string, { leads: number; qualified: number; conversions: number }>,
  key: string,
  state: { lead?: boolean; qualified?: boolean; converted?: boolean }
) {
  const existing = map.get(key) || { leads: 0, qualified: 0, conversions: 0 };

  if (state.lead) {
    existing.leads += 1;
  }

  if (state.qualified) {
    existing.qualified += 1;
  }

  if (state.converted) {
    existing.conversions += 1;
  }

  map.set(key, existing);
}

export async function buildAcquisitionAnalytics(
  period: AnalyticsPeriod = "7days"
): Promise<AcquisitionAnalyticsResponse> {
  const supabase = createAdminSupabaseClient();
  const { start, end } = getDateRange(period);
  const rangeStart = start.toISOString();
  const rangeEnd = end.toISOString();

  const [
    productEventsResult,
    intakeRequestsResult,
    appointmentsResult,
    notificationsResult,
    automationDispatchesResult
  ] = await Promise.all([
    supabase
      .from("product_events")
      .select("event_key,event_group,page_path,intake_request_id,payload,occurred_at")
      .gte("occurred_at", rangeStart)
      .lte("occurred_at", rangeEnd)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("intake_requests")
      .select("id,status,case_area,readiness_level,lead_score,lead_temperature,lifecycle_stage,source_path,experiment_context,metadata,submitted_at,reviewed_at")
      .gte("submitted_at", rangeStart)
      .lte("submitted_at", rangeEnd)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("id,status,created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("notifications_outbox")
      .select("id,status,channel,created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("automation_dispatches")
      .select("id,status,created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd)
  ]);

  if (productEventsResult.error) {
    throw new Error(productEventsResult.error.message);
  }

  if (intakeRequestsResult.error) {
    throw new Error(intakeRequestsResult.error.message);
  }

  if (appointmentsResult.error) {
    throw new Error(appointmentsResult.error.message);
  }

  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message);
  }

  if (automationDispatchesResult.error) {
    throw new Error(automationDispatchesResult.error.message);
  }

  const productEvents = (productEventsResult.data || []) as ProductEventRow[];
  const intakeRequests = (intakeRequestsResult.data || []) as IntakeRequestRow[];
  const appointments = (appointmentsResult.data || []) as AppointmentRow[];
  const notifications = (notificationsResult.data || []) as NotificationRow[];
  const automationDispatches = (automationDispatchesResult.data || []) as AutomationDispatchRow[];

  const strategicContentViews = productEvents.filter(
    (event) => getProductEventDefinition(event.event_key)?.funnelStage === "content_view"
  ).length;
  const ctaClicks = productEvents.filter(
    (event) =>
      getProductEventDefinition(event.event_key)?.funnelStage === "cta_click" ||
      getProductEventDefinition(event.event_key)?.funnelStage === "whatsapp_click"
  ).length;
  const formSubmissions = productEvents.filter(
    (event) => getProductEventDefinition(event.event_key)?.funnelStage === "form_submitted"
  ).length;
  const relevantPageViews = productEvents.filter(
    (event) => getProductEventDefinition(event.event_key)?.funnelStage === "page_view"
  ).length;
  const qualifiedLeads = intakeRequests.filter((request) =>
    ["in_review", "contacted", "converted"].includes(request.status)
  ).length;
  const conversions = intakeRequests.filter((request) => request.status === "converted").length;
  const hotLeads = intakeRequests.filter((request) =>
    ["hot", "urgent"].includes(request.lead_temperature || "")
  ).length;
  const averageLeadScore = intakeRequests.length
    ? Number(
        (
          intakeRequests.reduce(
            (sum, request) => sum + Math.max(request.lead_score || 0, 0),
            0
          ) / intakeRequests.length
        ).toFixed(1)
      )
    : 0;
  const scheduledAppointments = appointments.filter((appointment) =>
    ["scheduled", "confirmed", "completed"].includes(appointment.status)
  ).length;
  const automationFailures =
    notifications.filter((notification) => notification.status === "failed").length +
    automationDispatches.filter((dispatch) => dispatch.status === "failed").length;

  const averageResponseTimeHours = intakeRequests.length
    ? Number(
        (
          intakeRequests
            .filter((request) => request.reviewed_at)
            .reduce((accumulator, request) => {
              const submitted = new Date(request.submitted_at).getTime();
              const reviewed = new Date(request.reviewed_at || request.submitted_at).getTime();

              return accumulator + Math.max(reviewed - submitted, 0);
            }, 0) /
          Math.max(intakeRequests.filter((request) => request.reviewed_at).length, 1) /
          (1000 * 60 * 60)
        ).toFixed(1)
      )
    : 0;

  const sourceMap = new Map<string, { leads: number; qualified: number; conversions: number }>();
  const channelMap = new Map<string, { leads: number; qualified: number; conversions: number }>();
  const topicMap = new Map<string, { leads: number; qualified: number; conversions: number }>();
  const campaignMap = new Map<string, { leads: number; qualified: number; conversions: number }>();
  const readinessMap = new Map<string, { leads: number; hotLeads: number }>();

  for (const request of intakeRequests) {
    const source =
      readPayloadField(request.metadata, "source", "site") ||
      readPayloadField(request.metadata, "origem", "site");
    const channel = readPayloadField(request.metadata, "channel", source);
    const topic =
      readPayloadField(request.metadata, "theme", request.case_area) ||
      readPayloadField(request.metadata, "tema", request.case_area);
    const campaign =
      readPayloadField(request.metadata, "campaign", "organic") ||
      readPayloadField(request.metadata, "campanha", "organic");
    const qualified = ["in_review", "contacted", "converted"].includes(request.status);
    const converted = request.status === "converted";
    const readinessLevel = request.readiness_level || "explorando";

    pushAggregate(sourceMap, source, { lead: true, qualified, converted });
    pushAggregate(channelMap, channel, { lead: true, qualified, converted });
    pushAggregate(topicMap, topic, { lead: true, qualified, converted });
    pushAggregate(campaignMap, campaign, { lead: true, qualified, converted });

    const readinessEntry = readinessMap.get(readinessLevel) || { leads: 0, hotLeads: 0 };
    readinessEntry.leads += 1;
    if (["hot", "urgent"].includes(request.lead_temperature || "")) {
      readinessEntry.hotLeads += 1;
    }
    readinessMap.set(readinessLevel, readinessEntry);
  }

  const contentMap = new Map<
    string,
    { views: number; ctaClicks: number; qualifiedLeads: number; hotLeads: number; conversions: number }
  >();
  const experimentMap = new Map<
    string,
    {
      experimentId: string;
      variantId: string;
      impressions: number;
      ctaClicks: number;
      triageSubmissions: number;
      leads: number;
      qualifiedLeads: number;
      conversions: number;
    }
  >();

  function getExperimentKey(experimentId: string, variantId: string) {
    return `${experimentId}:${variantId}`;
  }

  function touchExperiment(experimentId: string, variantId: string) {
    const key = getExperimentKey(experimentId, variantId);
    const existing = experimentMap.get(key) || {
      experimentId,
      variantId,
      impressions: 0,
      ctaClicks: 0,
      triageSubmissions: 0,
      leads: 0,
      qualifiedLeads: 0,
      conversions: 0
    };
    experimentMap.set(key, existing);
    return existing;
  }

  for (const event of productEvents) {
    const contentId =
      readPayloadField(event.payload, "contentId", "") ||
      readPayloadField(event.payload, "articleSlug", "") ||
      "unknown";
    const definition = getProductEventDefinition(event.event_key);

    if (!definition || contentId === "unknown") {
      continue;
    }

    const existing = contentMap.get(contentId) || {
      views: 0,
      ctaClicks: 0,
      qualifiedLeads: 0,
      hotLeads: 0,
      conversions: 0
    };

    if (definition.funnelStage === "content_view") {
      existing.views += 1;
    }

    if (
      definition.funnelStage === "cta_click" ||
      definition.funnelStage === "whatsapp_click"
    ) {
      existing.ctaClicks += 1;
    }

    contentMap.set(contentId, existing);

    const experimentId = readPayloadField(event.payload, "experimentId", "");
    const variantId = readPayloadField(event.payload, "variantId", "");

    if (experimentId && variantId) {
      const experiment = touchExperiment(experimentId, variantId);

      if (event.event_key === "experiment_variant_viewed") {
        experiment.impressions += 1;
      }

      if (
        definition.funnelStage === "cta_click" ||
        definition.funnelStage === "whatsapp_click"
      ) {
        experiment.ctaClicks += 1;
      }

      if (definition.funnelStage === "form_submitted") {
        experiment.triageSubmissions += 1;
      }
    }
  }

  for (const request of intakeRequests) {
    const contentId =
      readPayloadField(request.metadata, "contentId", "") ||
      readPayloadField(request.metadata, "page", "") ||
      readPayloadField(request.metadata, "source_path", "");

    if (!contentId) {
      continue;
    }

    const existing = contentMap.get(contentId) || {
      views: 0,
      ctaClicks: 0,
      qualifiedLeads: 0,
      hotLeads: 0,
      conversions: 0
    };

    if (["in_review", "contacted", "converted"].includes(request.status)) {
      existing.qualifiedLeads += 1;
    }

    if (["hot", "urgent"].includes(request.lead_temperature || "")) {
      existing.hotLeads += 1;
    }

    if (request.status === "converted") {
      existing.conversions += 1;
    }

    contentMap.set(contentId, existing);

    const experimentId =
      readPayloadField(request.metadata, "experimentId", "") ||
      readPayloadField(request.experiment_context, "experimentId", "");
    const variantId =
      readPayloadField(request.metadata, "variantId", "") ||
      readPayloadField(request.experiment_context, "variantId", "");

    if (experimentId && variantId) {
      const experiment = touchExperiment(experimentId, variantId);
      experiment.leads += 1;

      if (["in_review", "contacted", "converted"].includes(request.status)) {
        experiment.qualifiedLeads += 1;
      }

      if (request.status === "converted") {
        experiment.conversions += 1;
      }
    }
  }

  const funnelStages = [
    { label: "Page views relevantes", count: relevantPageViews },
    { label: "Conteudo estrategico", count: strategicContentViews },
    { label: "CTAs clicados", count: ctaClicks },
    { label: "Triagens enviadas", count: formSubmissions },
    { label: "Leads criados", count: intakeRequests.length },
    { label: "Leads qualificados", count: qualifiedLeads },
    { label: "Conversoes", count: conversions }
  ];

  let previousCount = 0;
  const funnel = funnelStages.map((stage, index) => {
    const dropRate = index === 0 ? 0 : formatDropRate(previousCount, stage.count);
    previousCount = stage.count;

    return {
      stage: stage.label,
      count: stage.count,
      dropRate
    };
  });

  return {
    metrics: {
      totalLeads: intakeRequests.length,
      qualifiedLeads,
      hotLeads,
      scheduledAppointments,
      conversions,
      conversionRate:
        intakeRequests.length > 0
          ? Number(((conversions / intakeRequests.length) * 100).toFixed(1))
          : 0,
      averageLeadScore,
      averageResponseTimeHours,
      strategicContentViews,
      ctaClicks,
      automationFailures
    },
    funnel,
    sources: Array.from(sourceMap.entries())
      .map(([source, totals]) => ({
        source,
        leads: totals.leads,
        qualified: totals.qualified,
        conversions: totals.conversions,
        conversionRate:
          totals.leads > 0 ? Number(((totals.conversions / totals.leads) * 100).toFixed(1)) : 0
      }))
      .sort((left, right) => right.leads - left.leads),
    channels: Array.from(channelMap.entries())
      .map(([channel, totals]) => ({
        channel,
        leads: totals.leads,
        conversions: totals.conversions,
        conversionRate:
          totals.leads > 0 ? Number(((totals.conversions / totals.leads) * 100).toFixed(1)) : 0
      }))
      .sort((left, right) => right.leads - left.leads),
    topics: Array.from(topicMap.entries())
      .map(([topic, totals]) => ({
        topic,
        leads: totals.leads,
        conversions: totals.conversions,
        conversionRate:
          totals.leads > 0 ? Number(((totals.conversions / totals.leads) * 100).toFixed(1)) : 0
      }))
      .sort((left, right) => right.leads - left.leads),
    campaigns: Array.from(campaignMap.entries())
      .map(([campaign, totals]) => ({
        campaign,
        leads: totals.leads,
        conversions: totals.conversions,
        conversionRate:
          totals.leads > 0 ? Number(((totals.conversions / totals.leads) * 100).toFixed(1)) : 0
      }))
      .sort((left, right) => right.leads - left.leads),
    readiness: Array.from(readinessMap.entries())
      .map(([level, totals]) => ({
        level,
        leads: totals.leads,
        hotLeads: totals.hotLeads
      }))
      .sort((left, right) => right.leads - left.leads),
    leadScore: {
      average: averageLeadScore,
      cold: intakeRequests.filter((request) => (request.lead_temperature || "cold") === "cold").length,
      warm: intakeRequests.filter((request) => request.lead_temperature === "warm").length,
      hot: intakeRequests.filter((request) => request.lead_temperature === "hot").length,
      urgent: intakeRequests.filter((request) => request.lead_temperature === "urgent").length
    },
    content: Array.from(contentMap.entries())
      .map(([contentId, totals]) => ({
        contentId,
        views: totals.views,
        ctaClicks: totals.ctaClicks,
        qualifiedLeads: totals.qualifiedLeads,
        hotLeads: totals.hotLeads,
        conversions: totals.conversions,
        conversionRate:
          totals.views > 0 ? Number(((totals.conversions / totals.views) * 100).toFixed(1)) : 0
      }))
      .sort((left, right) => right.views - left.views),
    experiments: Array.from(experimentMap.values())
      .map((experiment) => ({
        ...experiment,
        conversionRate:
          experiment.leads > 0
            ? Number(((experiment.conversions / experiment.leads) * 100).toFixed(1))
            : 0
      }))
      .sort((left, right) => right.leads - left.leads),
    automation: {
      failedDispatches: automationDispatches.filter((dispatch) => dispatch.status === "failed")
        .length,
      failedNotifications: notifications.filter((notification) => notification.status === "failed")
        .length
    },
    period,
    generatedAt: new Date().toISOString()
  };
}
