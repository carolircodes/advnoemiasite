import "server-only";

import {
  caseAreaLabels,
  formatPortalDateTime,
  intakeRequestStatusLabels,
  publicIntakeUrgencyLabels
} from "../domain/portal.ts";
import { createServerSupabaseClient } from "../supabase/server.ts";

const TRACKED_AUTOMATION_TEMPLATES = new Set([
  "triage-submitted",
  "triage-urgent",
  "invite-reminder",
  "document-request-reminder",
  "appointment-reminder"
]);

const EVENT_LABELS: Record<string, string> = {
  site_visit_started: "Visita inicial",
  cta_start_triage_clicked: "Clique para iniciar triagem",
  cta_client_portal_clicked: "Clique para entrar no portal",
  cta_noemia_clicked: "Clique para abrir Noemia",
  triage_started: "Triagem iniciada",
  triage_submitted: "Triagem enviada",
  client_created: "Cliente criado",
  portal_access_completed: "Entrada no portal",
  client_portal_viewed: "Painel do cliente visualizado",
  client_documents_viewed: "Documentos visualizados",
  client_agenda_viewed: "Agenda visualizada",
  client_document_previewed: "Documento visualizado",
  client_document_downloaded: "Documento baixado",
  noemia_opened: "Noemia aberta",
  noemia_message_sent: "Mensagem enviada para Noemia"
};

function clampDays(value: number) {
  if (!Number.isFinite(value)) {
    return 30;
  }

  return Math.min(Math.max(Math.round(value), 7), 180);
}

function getUniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

function getEventLabel(eventKey: string) {
  return EVENT_LABELS[eventKey] || eventKey;
}

type Suggestion = {
  title: string;
  body: string;
  href: string;
};

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42703" ||
    (typeof error?.message === "string" && error.message.includes("does not exist"))
  );
}

function logSchemaCompatibilityFallback(
  scope: string,
  table: string,
  missingColumn: string
) {
  console.warn("[intelligence.schema] Using legacy compatibility fallback", {
    scope,
    table,
    missingColumn
  });
}

async function loadUpcomingAppointments(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  nowIso: string,
  soonThreshold: string
) {
  const result = await supabase
    .from("appointments")
    .select("id,case_id,title,status,visible_to_client,starts_at")
    .in("status", ["scheduled", "confirmed"])
    .eq("visible_to_client", true)
    .gte("starts_at", nowIso)
    .lte("starts_at", soonThreshold)
    .order("starts_at", { ascending: true })
    .limit(1000);

  if (!isMissingColumnError(result.error)) {
    return result;
  }

  const legacyResult = await supabase
    .from("appointments")
    .select("id,case_id,status,starts_at")
    .in("status", ["scheduled", "confirmed"])
    .gte("starts_at", nowIso)
    .lte("starts_at", soonThreshold)
    .order("starts_at", { ascending: true })
    .limit(1000);

  if (legacyResult.error) {
    return legacyResult;
  }

  logSchemaCompatibilityFallback("business-intelligence", "appointments", "title");

  return {
    data: (legacyResult.data || []).map((item) => ({
      ...item,
      title: "Compromisso do caso",
      visible_to_client: true
    })),
    error: null
  };
}

type ProductEventRecord = {
  id: string;
  event_key: string;
  event_group: string;
  page_path: string | null;
  session_id: string | null;
  profile_id: string | null;
  intake_request_id: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

type AcquisitionBucket = {
  key: string;
  label: string;
  visits: Set<string>;
  ctas: Set<string>;
  triageStarted: Set<string>;
  triageSubmitted: Set<string>;
  clientsCreated: number;
};

function getPayloadValue(
  payload: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!payload) {
    return "";
  }

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeBucketKey(value: string, fallback = "nao-identificado") {
  return value.trim().toLowerCase() || fallback;
}

function formatBucketLabel(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getSourceLabel(source: string) {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    site: "Site",
    ads: "Ads",
    organic: "Organico",
    referral: "Indicacao",
    "nao-identificado": "Nao identificado"
  };

  return labels[source] || source;
}

function ensureAcquisitionBucket(
  accumulator: Map<string, AcquisitionBucket>,
  key: string,
  label: string
) {
  const existing = accumulator.get(key);

  if (existing) {
    return existing;
  }

  const bucket: AcquisitionBucket = {
    key,
    label,
    visits: new Set<string>(),
    ctas: new Set<string>(),
    triageStarted: new Set<string>(),
    triageSubmitted: new Set<string>(),
    clientsCreated: 0
  };

  accumulator.set(key, bucket);
  return bucket;
}

export async function getBusinessIntelligenceOverview(rawDays = 30) {
  const days = clampDays(rawDays);
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const soonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const [
    productEventsResult,
    intakeRequestsResult,
    clientsResult,
    profilesResult,
    documentRequestsResult,
    appointmentsResult,
    notificationsResult,
    automationDispatchesResult
  ] = await Promise.all([
    supabase
      .from("product_events")
      .select(
        "id,event_key,event_group,page_path,session_id,profile_id,intake_request_id,payload,occurred_at"
      )
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(5000),
    supabase
      .from("intake_requests")
      .select(
        "id,full_name,case_area,urgency_level,status,submitted_at,reviewed_at,created_at"
      )
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false })
      .limit(1000),
    supabase
      .from("clients")
      .select("id,profile_id,status,created_at,source_intake_request_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("profiles")
      .select("id,email,role,invited_at,first_login_completed_at")
      .eq("role", "cliente")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("document_requests")
      .select("id,case_id,title,status,visible_to_client,due_at,created_at")
      .eq("status", "pending")
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false })
      .limit(1000),
    loadUpcomingAppointments(supabase, now.toISOString(), soonThreshold),
    supabase
      .from("notifications_outbox")
      .select("id,template_key,status,created_at,related_table")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("automation_dispatches")
      .select("id,rule_key,entity_type,entity_key,notification_id,dispatched_at,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000)
  ]);

  if (productEventsResult.error) {
    throw new Error(
      `Nao foi possivel carregar os eventos de produto: ${productEventsResult.error.message}`
    );
  }

  if (intakeRequestsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as triagens para inteligencia: ${intakeRequestsResult.error.message}`
    );
  }

  if (clientsResult.error) {
    throw new Error(
      `Nao foi possivel carregar os clientes para inteligencia: ${clientsResult.error.message}`
    );
  }

  if (profilesResult.error) {
    throw new Error(
      `Nao foi possivel carregar os perfis para inteligencia: ${profilesResult.error.message}`
    );
  }

  if (documentRequestsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as solicitacoes documentais: ${documentRequestsResult.error.message}`
    );
  }

  if (appointmentsResult.error) {
    throw new Error(
      `Nao foi possivel carregar os compromissos para inteligencia: ${appointmentsResult.error.message}`
    );
  }

  if (notificationsResult.error) {
    throw new Error(
      `Nao foi possivel carregar as notificacoes para inteligencia: ${notificationsResult.error.message}`
    );
  }

  if (automationDispatchesResult.error) {
    throw new Error(
      `Nao foi possivel carregar os disparos de automacao: ${automationDispatchesResult.error.message}`
    );
  }

  const productEvents = (productEventsResult.data || []) as ProductEventRecord[];
  const intakeRequests = intakeRequestsResult.data || [];
  const clients = clientsResult.data || [];
  const profiles = profilesResult.data || [];
  const documentRequests = documentRequestsResult.data || [];
  const appointments = appointmentsResult.data || [];
  const notifications = notificationsResult.data || [];
  const automationDispatches = automationDispatchesResult.data || [];

  const clientMapByProfile = new Map(clients.map((client) => [client.profile_id, client]));
  const clientProfileIds = new Set(
    clients.map((client) => client.profile_id).filter(Boolean)
  );
  const linkedClientCreations = clients.filter((client) => client.source_intake_request_id);
  const linkedPortalAccesses = profiles.filter((profile) => {
    const linkedClient = clientMapByProfile.get(profile.id);
    return (
      linkedClient?.source_intake_request_id &&
      profile.first_login_completed_at &&
      profile.first_login_completed_at >= since
    );
  });

  const funilVisits = getUniqueCount(
    productEvents
      .filter((event) => event.event_key === "site_visit_started")
      .map((event) => event.session_id)
  );
  const funnelCtas = getUniqueCount(
    productEvents
      .filter((event) => event.event_key === "cta_start_triage_clicked")
      .map((event) => event.session_id)
  );
  const funnelStarted = getUniqueCount(
    productEvents
      .filter((event) => event.event_key === "triage_started")
      .map((event) => event.session_id)
  );
  const funnelSubmitted = intakeRequests.length;
  const funnelClientsCreated = linkedClientCreations.length;
  const funnelPortalAccess = linkedPortalAccesses.length;

  const funnel = [
    {
      key: "visit",
      label: "Visita inicial",
      count: funilVisits
    },
    {
      key: "cta",
      label: "Clique no CTA",
      count: funnelCtas
    },
    {
      key: "triage_started",
      label: "Triagem iniciada",
      count: funnelStarted
    },
    {
      key: "triage_submitted",
      label: "Triagem enviada",
      count: funnelSubmitted
    },
    {
      key: "client_created",
      label: "Cliente criado",
      count: funnelClientsCreated
    },
    {
      key: "portal_access",
      label: "Entrada no portal",
      count: funnelPortalAccess
    }
  ].map((step, index, items) => {
    const previousCount = index === 0 ? step.count : items[index - 1].count;
    return {
      ...step,
      conversionFromPrevious:
        index === 0 || previousCount === 0
          ? null
          : Number(((step.count / previousCount) * 100).toFixed(1)),
      conversionFromStart:
        funilVisits === 0 ? null : Number(((step.count / funilVisits) * 100).toFixed(1))
    };
  });

  const triageAbandonmentCount = Math.max(funnelStarted - funnelSubmitted, 0);
  const triageAbandonmentRate =
    funnelStarted > 0
      ? Number(((triageAbandonmentCount / funnelStarted) * 100).toFixed(1))
      : 0;
  const triageToClientRate =
    funnelSubmitted > 0
      ? Number(((funnelClientsCreated / funnelSubmitted) * 100).toFixed(1))
      : 0;
  const portalActivationRate =
    funnelClientsCreated > 0
      ? Number(((funnelPortalAccess / funnelClientsCreated) * 100).toFixed(1))
      : 0;

  const urgentTriages = intakeRequests.filter(
    (item) =>
      item.urgency_level === "urgente" &&
      (item.status === "new" || item.status === "in_review")
  );
  const triageByArea = Object.values(
    intakeRequests.reduce<Record<string, { key: string; label: string; count: number }>>(
      (accumulator, item) => {
        const key = item.case_area;
        if (!accumulator[key]) {
          accumulator[key] = {
            key,
            label: caseAreaLabels[key as keyof typeof caseAreaLabels] || key,
            count: 0
          };
        }

        accumulator[key].count += 1;
        return accumulator;
      },
      {}
    )
  ).sort((left, right) => right.count - left.count);

  const eventBreakdown = Object.values(
    productEvents.reduce<Record<string, { key: string; label: string; count: number }>>(
      (accumulator, event) => {
        if (!accumulator[event.event_key]) {
          accumulator[event.event_key] = {
            key: event.event_key,
            label: getEventLabel(event.event_key),
            count: 0
          };
        }

        accumulator[event.event_key].count += 1;
        return accumulator;
      },
      {}
    )
  ).sort((left, right) => right.count - left.count);

  const sourceBuckets = new Map<string, AcquisitionBucket>();
  const campaignBuckets = new Map<string, AcquisitionBucket>();
  const topicBuckets = new Map<string, AcquisitionBucket>();
  const contentBuckets = new Map<string, AcquisitionBucket>();
  const intakeSourceMap = new Map<string, string>();
  const intakeCampaignMap = new Map<string, string>();
  const intakeTopicMap = new Map<string, string>();
  const intakeContentMap = new Map<string, string>();

  for (const event of productEvents) {
    const sourceValue = normalizeBucketKey(
      getPayloadValue(event.payload, ["source", "origem"]) ||
        (event.page_path?.includes("/triagem") ? "site" : "nao-identificado")
    );
    const sourceLabel = getSourceLabel(sourceValue);
    const campaignValue = normalizeBucketKey(
      getPayloadValue(event.payload, ["campaign", "campanha"]),
      "sem-campanha"
    );
    const campaignLabel = formatBucketLabel(
      getPayloadValue(event.payload, ["campaign", "campanha"]),
      "Sem campanha"
    );
    const topicValue = normalizeBucketKey(getPayloadValue(event.payload, ["topic", "tema"]), "sem-tema");
    const topicLabel = formatBucketLabel(
      getPayloadValue(event.payload, ["topic", "tema"]),
      "Sem tema"
    );
    const contentValue = normalizeBucketKey(
      getPayloadValue(event.payload, ["content_id", "contentId"]),
      "sem-conteudo"
    );
    const contentLabel = formatBucketLabel(
      getPayloadValue(event.payload, ["content_id", "contentId"]),
      "Sem conteudo identificado"
    );

    const sourceBucket = ensureAcquisitionBucket(sourceBuckets, sourceValue, sourceLabel);
    const campaignBucket = ensureAcquisitionBucket(campaignBuckets, campaignValue, campaignLabel);
    const topicBucket = ensureAcquisitionBucket(topicBuckets, topicValue, topicLabel);
    const contentBucket = ensureAcquisitionBucket(contentBuckets, contentValue, contentLabel);

    const sessionId = event.session_id || "";
    const recordStep = (collection: Set<string>) => {
      if (sessionId) {
        collection.add(sessionId);
      }
    };

    if (event.event_key === "site_visit_started") {
      recordStep(sourceBucket.visits);
      recordStep(campaignBucket.visits);
      recordStep(topicBucket.visits);
      recordStep(contentBucket.visits);
    }

    if (event.event_key === "cta_start_triage_clicked") {
      recordStep(sourceBucket.ctas);
      recordStep(campaignBucket.ctas);
      recordStep(topicBucket.ctas);
      recordStep(contentBucket.ctas);
    }

    if (event.event_key === "triage_started") {
      recordStep(sourceBucket.triageStarted);
      recordStep(campaignBucket.triageStarted);
      recordStep(topicBucket.triageStarted);
      recordStep(contentBucket.triageStarted);
    }

    if (event.event_key === "triage_submitted") {
      recordStep(sourceBucket.triageSubmitted);
      recordStep(campaignBucket.triageSubmitted);
      recordStep(topicBucket.triageSubmitted);
      recordStep(contentBucket.triageSubmitted);

      if (event.intake_request_id) {
        intakeSourceMap.set(event.intake_request_id, sourceValue);
        intakeCampaignMap.set(event.intake_request_id, campaignValue);
        intakeTopicMap.set(event.intake_request_id, topicValue);
        intakeContentMap.set(event.intake_request_id, contentValue);
      }
    }
  }

  for (const client of linkedClientCreations) {
    const intakeRequestId = client.source_intake_request_id;

    if (!intakeRequestId) {
      continue;
    }

    const sourceKey = intakeSourceMap.get(intakeRequestId);
    const campaignKey = intakeCampaignMap.get(intakeRequestId);
    const topicKey = intakeTopicMap.get(intakeRequestId);
    const contentKey = intakeContentMap.get(intakeRequestId);

    if (sourceKey) {
      const bucket = sourceBuckets.get(sourceKey);
      if (bucket) {
        bucket.clientsCreated += 1;
      }
    }

    if (campaignKey) {
      const bucket = campaignBuckets.get(campaignKey);
      if (bucket) {
        bucket.clientsCreated += 1;
      }
    }

    if (topicKey) {
      const bucket = topicBuckets.get(topicKey);
      if (bucket) {
        bucket.clientsCreated += 1;
      }
    }

    if (contentKey) {
      const bucket = contentBuckets.get(contentKey);
      if (bucket) {
        bucket.clientsCreated += 1;
      }
    }
  }

  const toAcquisitionRows = (buckets: Map<string, AcquisitionBucket>) =>
    [...buckets.values()]
      .map((bucket) => {
        const visits = bucket.visits.size;
        const ctas = bucket.ctas.size;
        const triageStarted = bucket.triageStarted.size;
        const triageSubmitted = bucket.triageSubmitted.size;
        const clientsCreated = bucket.clientsCreated;

        return {
          key: bucket.key,
          label: bucket.label,
          visits,
          ctas,
          triageStarted,
          triageSubmitted,
          clientsCreated,
          visitToSubmitRate:
            visits > 0 ? Number(((triageSubmitted / visits) * 100).toFixed(1)) : 0,
          triageToClientRate:
            triageSubmitted > 0
              ? Number(((clientsCreated / triageSubmitted) * 100).toFixed(1))
              : 0
        };
      })
      .filter((item) => item.visits || item.triageStarted || item.triageSubmitted || item.clientsCreated)
      .sort((left, right) => {
        if (right.clientsCreated !== left.clientsCreated) {
          return right.clientsCreated - left.clientsCreated;
        }

        if (right.triageSubmitted !== left.triageSubmitted) {
          return right.triageSubmitted - left.triageSubmitted;
        }

        return right.visits - left.visits;
      });

  const acquisition = {
    bySource: toAcquisitionRows(sourceBuckets).slice(0, 6),
    byCampaign: toAcquisitionRows(campaignBuckets).slice(0, 6),
    byTopic: toAcquisitionRows(topicBuckets).slice(0, 6),
    byContent: toAcquisitionRows(contentBuckets).slice(0, 6)
  };

  const portalEvents = productEvents.filter((event) => {
    if (!event.profile_id) {
      return false;
    }

    return clientProfileIds.has(event.profile_id);
  });

  const portalUsage = {
    activeClients: getUniqueCount(
      portalEvents
        .filter((event) =>
          [
            "portal_access_completed",
            "client_portal_viewed",
            "client_documents_viewed",
            "client_agenda_viewed",
            "client_document_previewed",
            "client_document_downloaded",
            "noemia_message_sent"
          ].includes(event.event_key)
        )
        .map((event) => event.profile_id)
    ),
    dashboardViews: portalEvents.filter((event) => event.event_key === "client_portal_viewed")
      .length,
    documentViews: portalEvents.filter((event) =>
      ["client_documents_viewed", "client_document_previewed", "client_document_downloaded"].includes(
        event.event_key
      )
    ).length,
    agendaViews: portalEvents.filter((event) => event.event_key === "client_agenda_viewed")
      .length,
    noemiaMessages: productEvents.filter(
      (event) =>
        event.event_key === "noemia_message_sent" &&
        ((event.profile_id && clientProfileIds.has(event.profile_id)) ||
          event.payload?.audience === "client")
    ).length
  };

  const pendingAutomationNotifications = notifications.filter(
    (item) =>
      TRACKED_AUTOMATION_TEMPLATES.has(item.template_key) &&
      (item.status === "pending" || item.status === "failed")
  );
  const clientsAwaitingFirstAccess = profiles.filter((profile) => {
    if (!profile.invited_at || profile.first_login_completed_at) {
      return false;
    }

    return new Date(profile.invited_at).getTime() <= now.getTime() - 24 * 60 * 60 * 1000;
  });
  const overdueDocumentRequests = documentRequests.filter(
    (item) => item.due_at && item.due_at < now.toISOString()
  );
  const stalledDocumentRequests = documentRequests.filter(
    (item) => !item.due_at && item.created_at < since
  );
  const automationSummary = {
    pendingQueue: pendingAutomationNotifications.length,
    dispatches: automationDispatches.length,
    inviteReminders: automationDispatches.filter((item) =>
      item.rule_key.startsWith("invite-access-reminder-")
    ).length,
    documentReminders: automationDispatches.filter((item) =>
      item.rule_key.startsWith("document-request-reminder-")
    ).length,
    appointmentReminders: automationDispatches.filter(
      (item) => item.rule_key === "appointment-reminder-24h"
    ).length,
    triageAlerts: automationDispatches.filter(
      (item) =>
        item.rule_key === "triage-submitted-alert" || item.rule_key === "triage-urgent-alert"
    ).length
  };

  const suggestions: Suggestion[] = [];

  if (urgentTriages.length) {
    suggestions.push({
      title: `${urgentTriages.length} triagem(ns) urgente(s) aguardando revisao`,
      body: "Priorize as triagens urgentes no painel interno para reduzir tempo de resposta do primeiro contato.",
      href: "/internal/advogada#triagens-recebidas"
    });
  }

  if (clientsAwaitingFirstAccess.length) {
    suggestions.push({
      title: `${clientsAwaitingFirstAccess.length} cliente(s) ainda sem primeiro acesso`,
      body: "O worker ja prepara lembretes automaticos. Vale acompanhar os casos que ainda nao concluíram a entrada no portal.",
      href: "/internal/advogada"
    });
  }

  if (overdueDocumentRequests.length || stalledDocumentRequests.length) {
    suggestions.push({
      title: `${overdueDocumentRequests.length + stalledDocumentRequests.length} pendencia(s) documental(is) precisam de atencao`,
      body: "As solicitacoes em atraso ou abertas por muito tempo ja entram na trilha de lembretes e merecem revisao operacional.",
      href: "/documentos#solicitacoes-abertas"
    });
  }

  if (appointments.length) {
    suggestions.push({
      title: `${appointments.length} compromisso(s) entram no radar das proximas 48 horas`,
      body: "Esses itens ja podem gerar lembretes automaticos para o cliente e merecem revisao de horario, status e orientacoes.",
      href: "/agenda#proximos-compromissos"
    });
  }

  if (triageAbandonmentRate >= 30) {
    suggestions.push({
      title: "A triagem ainda perde visitantes antes do envio",
      body: `A taxa de abandono ficou em ${triageAbandonmentRate}%. Vale revisar copy, friccao e CTA da triagem.`,
      href: "/triagem"
    });
  }

  const strongestSource = acquisition.bySource[0] || null;
  const weakestSource = acquisition.bySource
    .filter((item) => item.visits >= 3)
    .sort((left, right) => left.visitToSubmitRate - right.visitToSubmitRate)[0] || null;

  if (strongestSource && strongestSource.clientsCreated > 0) {
    suggestions.push({
      title: `${strongestSource.label} e a origem que mais virou cliente`,
      body: `${strongestSource.clientsCreated} cliente(s) vieram dessa origem no periodo. Vale aprofundar campanha, tema e conteudo relacionados.`,
      href: "/internal/advogada/acquisition"
    });
  }

  if (weakestSource && weakestSource.visitToSubmitRate < 10) {
    suggestions.push({
      title: `${weakestSource.label} traz visitas, mas perde forca antes do envio`,
      body: `A origem converteu apenas ${weakestSource.visitToSubmitRate}% das visitas em triagens enviadas. Vale revisar CTA, promessa e friccao desse caminho.`,
      href: "/internal/advogada/performance"
    });
  }

  return {
    days,
    since,
    summary: {
      visits: funilVisits,
      ctas: funnelCtas,
      triageStarted: funnelStarted,
      triageSubmitted: funnelSubmitted,
      clientsCreated: funnelClientsCreated,
      portalAccess: funnelPortalAccess,
      triageAbandonmentCount,
      triageAbandonmentRate,
      triageToClientRate,
      portalActivationRate
    },
    funnel,
    triage: {
      total: intakeRequests.length,
      urgentCount: urgentTriages.length,
      byArea: triageByArea,
      latest: intakeRequests.slice(0, 6).map((item) => ({
        id: item.id,
        fullName: item.full_name,
        submittedAtLabel: formatPortalDateTime(item.submitted_at),
        urgencyLabel:
          publicIntakeUrgencyLabels[
            item.urgency_level as keyof typeof publicIntakeUrgencyLabels
          ] || item.urgency_level,
        statusLabel:
          intakeRequestStatusLabels[item.status as keyof typeof intakeRequestStatusLabels] ||
          item.status
      }))
    },
    acquisition,
    portalUsage,
    automation: {
      ...automationSummary,
      clientsAwaitingFirstAccess: clientsAwaitingFirstAccess.length,
      overdueDocumentRequests: overdueDocumentRequests.length,
      upcomingAppointments: appointments.length
    },
    recentEvents: productEvents.slice(0, 14).map((event) => ({
      id: event.id,
      label: getEventLabel(event.event_key),
      eventKey: event.event_key,
      eventGroup: event.event_group,
      pagePath: event.page_path || "",
      occurredAtLabel: formatPortalDateTime(event.occurred_at)
    })),
    eventBreakdown: eventBreakdown.slice(0, 10),
    suggestions: suggestions.slice(0, 5)
  };
}
