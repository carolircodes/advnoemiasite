import "server-only";

import { createServerSupabaseClient } from "../supabase/server";
import { resolveOperationalLabel } from "../channels/channel-presentation";
import {
  buildJourneyTouchLabel,
  normalizeJourneyTaxonomy,
  type JourneyTaxonomy
} from "../journey/taxonomy";

type IntakeRow = {
  id: string;
  status: string;
  case_area: string;
  readiness_level: string | null;
  lead_score: number | null;
  lead_temperature: string | null;
  lifecycle_stage: string | null;
  source_path: string | null;
  preferred_contact_channel: string | null;
  appointment_interest: boolean | null;
  submitted_at: string;
  reviewed_at: string | null;
  metadata: Record<string, unknown> | null;
};

type PipelineRow = {
  id: string;
  client_id: string;
  stage: string | null;
  source_channel: string | null;
  source_campaign: string | null;
  source_medium: string | null;
  source_topic: string | null;
  source_content_id: string | null;
  lead_score: number | null;
  lead_temperature: string | null;
  lifecycle_stage: string | null;
  follow_up_status: string | null;
  scheduling_state: string | null;
  closing_state: string | null;
  preferred_channel: string | null;
  waiting_on: string | null;
  next_follow_up_at: string | null;
  last_contact_at: string | null;
  recommended_action: string | null;
  consultation_readiness: string | null;
  experiment_context: Record<string, unknown> | null;
  score_explanation: Array<{ label?: string; reason?: string }> | null;
  notes: string | null;
};

type ProductEventRow = {
  id: string;
  event_key: string;
  event_group: string | null;
  intake_request_id: string | null;
  session_id: string | null;
  page_path: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

type FollowUpRow = {
  id: string;
  client_id: string;
  channel: string | null;
  message_type: string | null;
  status: string | null;
  scheduled_for: string | null;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  client_id: string;
  status: string;
  created_at: string;
  starts_at: string;
};

type OutboxRow = {
  id: string;
  channel: string | null;
  status: string;
  template_key: string | null;
  related_table: string | null;
  created_at: string;
};

type AutomationDispatchRow = {
  id: string;
  rule_key: string | null;
  entity_type: string | null;
  status: string | null;
  created_at: string;
};

type AggregateRow = {
  key: string;
  label: string;
  volume: number;
  hotLeads: number;
  qualified: number;
  appointments: number;
  conversions: number;
  averageScore: number;
  responseHours: number | null;
};

type OmnichannelOverview = {
  periodDays: number;
  generatedAt: string;
  channels: AggregateRow[];
  themes: AggregateRow[];
  campaigns: AggregateRow[];
  contents: Array<
    AggregateRow & {
      qualifiedReads: number;
      ctaClicks: number;
    }
  >;
  abandonmentByStage: Array<{ stage: string; count: number }>;
  followUpsByResult: Array<{ result: string; count: number }>;
  automationHealth: Array<{ key: string; total: number; failed: number; queued: number }>;
  scoreBands: Array<{ band: string; leads: number; conversions: number }>;
  readinessStates: Array<{ state: string; leads: number; appointments: number }>;
  routingActions: Array<{ action: string; total: number; converted: number }>;
  executiveSummary: {
    hottestChannel: string;
    hottestTheme: string;
    strongestCampaign: string;
    bestContent: string;
    slowestChannel: string;
  };
};

function clampDays(value: number) {
  if (!Number.isFinite(value)) {
    return 30;
  }

  return Math.min(Math.max(Math.round(value), 7), 180);
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function formatLabel(value: string) {
  const operationalLabel = resolveOperationalLabel(value);

  if (operationalLabel) {
    return operationalLabel;
  }

  return value
    .split(/[-_:]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAggregateRows(
  map: Map<
    string,
    {
      label: string;
      volume: number;
      hotLeads: number;
      qualified: number;
      appointments: number;
      conversions: number;
      scores: number[];
      responseHours: number[];
    }
  >
) {
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      volume: value.volume,
      hotLeads: value.hotLeads,
      qualified: value.qualified,
      appointments: value.appointments,
      conversions: value.conversions,
      averageScore: average(value.scores),
      responseHours: value.responseHours.length ? average(value.responseHours) : null
    }))
    .sort((left, right) => {
      if (right.conversions !== left.conversions) {
        return right.conversions - left.conversions;
      }

      if (right.hotLeads !== left.hotLeads) {
        return right.hotLeads - left.hotLeads;
      }

      return right.volume - left.volume;
    });
}

function pushAggregate(
  map: Map<
    string,
    {
      label: string;
      volume: number;
      hotLeads: number;
      qualified: number;
      appointments: number;
      conversions: number;
      scores: number[];
      responseHours: number[];
    }
  >,
  key: string,
  label: string,
  input: {
    hotLead: boolean;
    qualified: boolean;
    appointment: boolean;
    converted: boolean;
    score: number;
    responseHours?: number | null;
  }
) {
  const existing = map.get(key) || {
    label,
    volume: 0,
    hotLeads: 0,
    qualified: 0,
    appointments: 0,
    conversions: 0,
    scores: [],
    responseHours: []
  };

  existing.volume += 1;
  existing.hotLeads += input.hotLead ? 1 : 0;
  existing.qualified += input.qualified ? 1 : 0;
  existing.appointments += input.appointment ? 1 : 0;
  existing.conversions += input.converted ? 1 : 0;
  if (input.score > 0) {
    existing.scores.push(input.score);
  }
  if (typeof input.responseHours === "number" && Number.isFinite(input.responseHours)) {
    existing.responseHours.push(input.responseHours);
  }

  map.set(key, existing);
}

function buildPipelineTaxonomy(
  intake: IntakeRow | null,
  pipeline: PipelineRow | null,
  event: ProductEventRow | null
): JourneyTaxonomy {
  return normalizeJourneyTaxonomy({
    metadata: intake?.metadata,
    pipeline,
    event: event?.payload,
    defaults: {
      contentId: pipeline?.source_content_id || undefined,
      campaign: pipeline?.source_campaign || undefined,
      medium: pipeline?.source_medium || undefined,
      legalTopic: pipeline?.source_topic || intake?.case_area || undefined,
      preferredChannel: intake?.preferred_contact_channel || pipeline?.preferred_channel || undefined
    }
  });
}

function getResponseHours(intake: IntakeRow) {
  if (!intake.reviewed_at) {
    return null;
  }

  const submitted = new Date(intake.submitted_at).getTime();
  const reviewed = new Date(intake.reviewed_at).getTime();

  if (Number.isNaN(submitted) || Number.isNaN(reviewed) || reviewed < submitted) {
    return null;
  }

  return (reviewed - submitted) / (1000 * 60 * 60);
}

function getScoreBand(score: number) {
  if (score >= 80) {
    return "80+";
  }
  if (score >= 60) {
    return "60-79";
  }
  if (score >= 40) {
    return "40-59";
  }
  return "0-39";
}

export async function getOmnichannelOverview(rawDays = 30): Promise<OmnichannelOverview> {
  const days = clampDays(rawDays);
  const supabase = await createServerSupabaseClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    intakeResult,
    pipelineResult,
    eventResult,
    followUpResult,
    appointmentResult,
    outboxResult,
    automationResult
  ] = await Promise.all([
    supabase
      .from("intake_requests")
      .select(
        "id,status,case_area,readiness_level,lead_score,lead_temperature,lifecycle_stage,source_path,preferred_contact_channel,appointment_interest,submitted_at,reviewed_at,metadata"
      )
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false })
      .limit(3000),
    supabase
      .from("client_pipeline")
      .select(
        "id,client_id,stage,source_channel,source_campaign,source_medium,source_topic,source_content_id,lead_score,lead_temperature,lifecycle_stage,follow_up_status,scheduling_state,closing_state,preferred_channel,waiting_on,next_follow_up_at,last_contact_at,recommended_action,consultation_readiness,experiment_context,score_explanation,notes"
      )
      .order("updated_at", { ascending: false })
      .limit(3000),
    supabase
      .from("product_events")
      .select("id,event_key,event_group,intake_request_id,session_id,page_path,payload,occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(5000),
    supabase
      .from("follow_up_messages")
      .select("id,client_id,channel,message_type,status,scheduled_for,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("appointments")
      .select("id,client_id,status,created_at,starts_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("notifications_outbox")
      .select("id,channel,status,template_key,related_table,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("automation_dispatches")
      .select("id,rule_key,entity_type,status,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000)
  ]);

  if (intakeResult.error) {
    throw new Error(intakeResult.error.message);
  }
  if (pipelineResult.error) {
    throw new Error(pipelineResult.error.message);
  }
  if (eventResult.error) {
    throw new Error(eventResult.error.message);
  }
  if (followUpResult.error) {
    throw new Error(followUpResult.error.message);
  }
  if (appointmentResult.error) {
    throw new Error(appointmentResult.error.message);
  }
  if (outboxResult.error) {
    throw new Error(outboxResult.error.message);
  }
  if (automationResult.error) {
    throw new Error(automationResult.error.message);
  }

  const intakes = (intakeResult.data || []) as IntakeRow[];
  const pipelines = (pipelineResult.data || []) as PipelineRow[];
  const events = (eventResult.data || []) as ProductEventRow[];
  const followUps = (followUpResult.data || []) as FollowUpRow[];
  const appointments = (appointmentResult.data || []) as AppointmentRow[];
  const outbox = (outboxResult.data || []) as OutboxRow[];
  const automationDispatches = (automationResult.data || []) as AutomationDispatchRow[];

  const intakeById = new Map(intakes.map((item) => [item.id, item]));
  const latestEventByIntake = new Map<string, ProductEventRow>();
  for (const event of events) {
    if (event.intake_request_id && !latestEventByIntake.has(event.intake_request_id)) {
      latestEventByIntake.set(event.intake_request_id, event);
    }
  }

  const pipelineByIntake = new Map<string, PipelineRow>();
  for (const pipeline of pipelines) {
    const candidate = intakes.find((intake) => intake.id === pipeline.client_id);
    if (candidate) {
      pipelineByIntake.set(candidate.id, pipeline);
    }
  }

  const appointmentsByClient = new Map<string, AppointmentRow[]>();
  for (const appointment of appointments) {
    const items = appointmentsByClient.get(appointment.client_id) || [];
    items.push(appointment);
    appointmentsByClient.set(appointment.client_id, items);
  }

  const channelMap = new Map<string, any>();
  const themeMap = new Map<string, any>();
  const campaignMap = new Map<string, any>();
  const contentMap = new Map<string, any>();
  const scoreBands = new Map<string, { leads: number; conversions: number }>();
  const readinessStates = new Map<string, { leads: number; appointments: number }>();
  const routingActions = new Map<string, { total: number; converted: number }>();
  const abandonmentByStage = new Map<string, number>();

  for (const intake of intakes) {
    const pipeline =
      pipelines.find((item) => item.client_id === intake.id) ||
      pipelineByIntake.get(intake.id) ||
      null;
    const event = latestEventByIntake.get(intake.id) || null;
    const taxonomy = buildPipelineTaxonomy(intake, pipeline, event);
    const hotLead = ["hot", "urgent"].includes(intake.lead_temperature || "");
    const qualified = ["in_review", "contacted", "converted"].includes(intake.status);
    const converted = intake.status === "converted" || pipeline?.closing_state === "won";
    const appointment = Boolean(
      intake.appointment_interest ||
        pipeline?.scheduling_state === "confirmed" ||
        pipeline?.stage === "consultation_scheduled"
    );
    const score = toNumber(intake.lead_score || pipeline?.lead_score);
    const responseHours = getResponseHours(intake);
    const aggregateInput = {
      hotLead,
      qualified,
      appointment,
      converted,
      score,
      responseHours
    };

    pushAggregate(channelMap, taxonomy.channel, formatLabel(taxonomy.channel), aggregateInput);
    pushAggregate(themeMap, taxonomy.legalTopic, formatLabel(taxonomy.legalTopic), aggregateInput);
    pushAggregate(campaignMap, taxonomy.campaign, formatLabel(taxonomy.campaign), aggregateInput);
    pushAggregate(contentMap, taxonomy.contentId, formatLabel(taxonomy.contentId), aggregateInput);

    const band = scoreBands.get(getScoreBand(score)) || { leads: 0, conversions: 0 };
    band.leads += 1;
    band.conversions += converted ? 1 : 0;
    scoreBands.set(getScoreBand(score), band);

    const readinessKey = intake.readiness_level || "unknown";
    const readiness = readinessStates.get(readinessKey) || { leads: 0, appointments: 0 };
    readiness.leads += 1;
    readiness.appointments += appointment ? 1 : 0;
    readinessStates.set(readinessKey, readiness);

    const actionKey = pipeline?.recommended_action || "review_manually";
    const action = routingActions.get(actionKey) || { total: 0, converted: 0 };
    action.total += 1;
    action.converted += converted ? 1 : 0;
    routingActions.set(actionKey, action);

    if (!qualified) {
      const stage = taxonomy.funnelStage === "unknown" ? intake.lifecycle_stage || "unknown" : taxonomy.funnelStage;
      abandonmentByStage.set(stage, (abandonmentByStage.get(stage) || 0) + 1);
    }
  }

  const contentMetrics = buildAggregateRows(contentMap).map((row) => {
    const relatedEvents = events.filter(
      (event) =>
        normalizeJourneyTaxonomy({ event: event.payload }).contentId === row.key
    );
    const qualifiedReads = relatedEvents.filter(
      (event) =>
        event.event_key === "content_qualified_read" || event.event_key === "article_scroll_depth_reached"
    ).length;
    const ctaClicks = relatedEvents.filter((event) =>
      ["cta_start_triage_clicked", "cta_whatsapp_clicked", "cta_client_portal_clicked"].includes(
        event.event_key
      )
    ).length;

    return {
      ...row,
      qualifiedReads,
      ctaClicks
    };
  });

  const followUpsByResult = [...followUps.reduce((map, item) => {
    const key = item.status || "unknown";
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .map(([result, count]) => ({ result, count }))
    .sort((left, right) => right.count - left.count);

  const automationHealth = [...automationDispatches.reduce((map, item) => {
    const key = item.rule_key || item.entity_type || "unknown";
    const current = map.get(key) || { total: 0, failed: 0, queued: 0 };
    current.total += 1;
    current.failed += item.status === "failed" ? 1 : 0;
    current.queued += item.status === "pending" ? 1 : 0;
    map.set(key, current);
    return map;
  }, new Map<string, { total: number; failed: number; queued: number }>()).entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);

  const channels = buildAggregateRows(channelMap);
  const themes = buildAggregateRows(themeMap);
  const campaigns = buildAggregateRows(campaignMap);

  const outboxByChannel = [...outbox.reduce((map, item) => {
    const key = item.channel || "unknown";
    const current = map.get(key) || { total: 0, failed: 0, queued: 0 };
    current.total += 1;
    current.failed += item.status === "failed" ? 1 : 0;
    current.queued += item.status === "pending" ? 1 : 0;
    map.set(key, current);
    return map;
  }, new Map<string, { total: number; failed: number; queued: number }>()).entries()]
    .map(([key, value]) => ({ key, ...value }));

  for (const item of outboxByChannel) {
    if (!automationHealth.find((entry) => entry.key === item.key)) {
      automationHealth.push(item);
    }
  }

  const slowestChannel =
    [...channels]
      .filter((item) => item.responseHours !== null)
      .sort((left, right) => (right.responseHours || 0) - (left.responseHours || 0))[0]?.label ||
    "Sem base suficiente";

  return {
    periodDays: days,
    generatedAt: new Date().toISOString(),
    channels,
    themes,
    campaigns,
    contents: contentMetrics,
    abandonmentByStage: [...abandonmentByStage.entries()]
      .map(([stage, count]) => ({ stage, count }))
      .sort((left, right) => right.count - left.count),
    followUpsByResult,
    automationHealth,
    scoreBands: [...scoreBands.entries()]
      .map(([band, value]) => ({ band, ...value }))
      .sort((left, right) => left.band.localeCompare(right.band)),
    readinessStates: [...readinessStates.entries()]
      .map(([state, value]) => ({ state, ...value }))
      .sort((left, right) => right.leads - left.leads),
    routingActions: [...routingActions.entries()]
      .map(([action, value]) => ({ action, ...value }))
      .sort((left, right) => right.total - left.total),
    executiveSummary: {
      hottestChannel: channels[0]?.label || "Sem base suficiente",
      hottestTheme: themes[0]?.label || "Sem base suficiente",
      strongestCampaign: campaigns[0]?.label || "Sem base suficiente",
      bestContent: contentMetrics[0]?.label || "Sem base suficiente",
      slowestChannel
    }
  };
}

export function buildJourneyTouchSummary(taxonomy: JourneyTaxonomy) {
  return {
    label: buildJourneyTouchLabel(taxonomy),
    channelLabel: formatLabel(taxonomy.channel),
    themeLabel: formatLabel(taxonomy.legalTopic),
    surfaceLabel: formatLabel(taxonomy.entrySurface)
  };
}
