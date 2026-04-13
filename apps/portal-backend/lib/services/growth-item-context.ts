import "server-only";

import {
  intakeRequestStatusLabels,
  publicIntakeStageLabels,
  publicIntakeUrgencyLabels
} from "../domain/portal";
import { createWebhookSupabaseClient } from "../supabase/webhook";
import { getBusinessIntelligenceOverview } from "./intelligence";

type OperationalGrowthSeed = {
  clientId: string;
  profileId?: string | null;
  sourceIntakeRequestId?: string | null;
};

type ProductEventRecord = {
  intake_request_id: string | null;
  payload: Record<string, unknown> | null;
  event_key: string;
  occurred_at: string;
};

export type FunnelLossSignal = {
  key: string;
  label: string;
  detail: string;
};

export type AcquisitionContext = {
  sourceKey: string;
  sourceLabel: string;
  campaignKey: string;
  campaignLabel: string;
  topicKey: string;
  topicLabel: string;
  contentKey: string;
  contentLabel: string;
  sourceStrength: "strong" | "watch" | "weak" | "unknown";
  topicStrength: "strong" | "watch" | "weak" | "unknown";
  contentStrength: "strong" | "watch" | "weak" | "unknown";
};

export type IntakeContext = {
  intakeRequestId: string;
  status: string;
  statusLabel: string;
  currentStage: string;
  currentStageLabel: string;
  urgencyLevel: string;
  urgencyLabel: string;
  submittedAt: string;
};

export type GrowthContextByItem = {
  acquisitionContext: AcquisitionContext | null;
  intakeContext: IntakeContext | null;
  funnelLossSignals: FunnelLossSignal[];
  pendingDocumentsCount: number;
  pendingDocumentsLabel: string;
  portalActivationPending: boolean;
  hasStrongGrowthSignal: boolean;
  hasWeakGrowthSignal: boolean;
  summaryLines: string[];
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

function normalizeValue(value: string, fallback: string) {
  return value.trim().toLowerCase() || fallback;
}

function formatValue(value: string, fallback: string) {
  return value.trim() || fallback;
}

function inferStrength(
  items: Array<{
    key: string;
    visits: number;
    triageSubmitted: number;
    clientsCreated: number;
    visitToSubmitRate: number;
    triageToClientRate: number;
  }>,
  key: string
) {
  const item = items.find((entry) => entry.key === key);

  if (!item) {
    return "unknown" as const;
  }

  if (item.clientsCreated > 0 || item.triageToClientRate >= 25) {
    return "strong" as const;
  }

  if (
    item.visits >= 3 &&
    (item.visitToSubmitRate < 10 || (item.triageSubmitted >= 2 && item.clientsCreated === 0))
  ) {
    return "weak" as const;
  }

  return "watch" as const;
}

function buildSummaryLines(context: {
  acquisitionContext: AcquisitionContext | null;
  intakeContext: IntakeContext | null;
  pendingDocumentsCount: number;
  portalActivationPending: boolean;
  funnelLossSignals: FunnelLossSignal[];
}) {
  const lines: string[] = [];

  if (context.acquisitionContext) {
    lines.push(
      `${context.acquisitionContext.sourceLabel} | ${context.acquisitionContext.topicLabel}`
    );
  }

  if (context.intakeContext) {
    lines.push(
      `${context.intakeContext.statusLabel} | ${context.intakeContext.currentStageLabel}`
    );
  }

  if (context.pendingDocumentsCount > 0) {
    lines.push(
      `${context.pendingDocumentsCount} pendencia(s) documental(is) aberta(s)`
    );
  }

  if (context.portalActivationPending) {
    lines.push("Cliente ainda sem primeiro acesso ao portal");
  }

  if (context.funnelLossSignals[0]) {
    lines.push(context.funnelLossSignals[0].label);
  }

  return lines.slice(0, 3);
}

export async function getGrowthContextByItems(seeds: OperationalGrowthSeed[]) {
  const normalizedSeeds = seeds.filter((item) => item.clientId);

  if (!normalizedSeeds.length) {
    return new Map<string, GrowthContextByItem>();
  }

  const supabase = createWebhookSupabaseClient();
  const intelligence = await getBusinessIntelligenceOverview(30);
  const intakeIds = [
    ...new Set(normalizedSeeds.map((item) => item.sourceIntakeRequestId).filter(Boolean))
  ] as string[];
  const clientIds = [...new Set(normalizedSeeds.map((item) => item.clientId))];
  const profileIds = [
    ...new Set(normalizedSeeds.map((item) => item.profileId).filter(Boolean))
  ] as string[];

  const [intakeResult, eventsResult, casesResult, profilesResult] = await Promise.all([
    intakeIds.length
      ? supabase
          .from("intake_requests")
          .select("id,status,current_stage,urgency_level,submitted_at")
          .in("id", intakeIds)
      : Promise.resolve({ data: [], error: null }),
    intakeIds.length
      ? supabase
          .from("product_events")
          .select("intake_request_id,payload,event_key,occurred_at")
          .in("intake_request_id", intakeIds)
          .order("occurred_at", { ascending: false })
          .limit(2000)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("cases")
      .select("id,client_id")
      .in("client_id", clientIds),
    profileIds.length
      ? supabase
          .from("profiles")
          .select("id,invited_at,first_login_completed_at")
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (intakeResult.error) {
    throw new Error(
      `Nao foi possivel carregar intake context por item: ${intakeResult.error.message}`
    );
  }

  if (eventsResult.error) {
    throw new Error(
      `Nao foi possivel carregar eventos de tracking por item: ${eventsResult.error.message}`
    );
  }

  if (casesResult.error) {
    throw new Error(
      `Nao foi possivel carregar casos para growth context: ${casesResult.error.message}`
    );
  }

  if (profilesResult.error) {
    throw new Error(
      `Nao foi possivel carregar perfis para growth context: ${profilesResult.error.message}`
    );
  }

  const caseIds = (casesResult.data || []).map((item) => item.id);
  const { data: documentRequests, error: documentRequestsError } = caseIds.length
    ? await supabase
        .from("document_requests")
        .select("id,case_id,title,status,visible_to_client")
        .in("case_id", caseIds)
        .eq("status", "pending")
    : { data: [], error: null };

  if (documentRequestsError) {
    throw new Error(
      `Nao foi possivel carregar pendencias documentais por item: ${documentRequestsError.message}`
    );
  }

  const intakeMap = new Map((intakeResult.data || []).map((item) => [item.id, item]));
  const latestEventByIntake = new Map<string, ProductEventRecord>();

  for (const event of (eventsResult.data || []) as ProductEventRecord[]) {
    if (event.intake_request_id && !latestEventByIntake.has(event.intake_request_id)) {
      latestEventByIntake.set(event.intake_request_id, event);
    }
  }

  const profileMap = new Map((profilesResult.data || []).map((item) => [item.id, item]));
  const caseIdsByClient = new Map<string, string[]>();
  const documentCountByClient = new Map<string, number>();

  for (const item of casesResult.data || []) {
    const current = caseIdsByClient.get(item.client_id) || [];
    current.push(item.id);
    caseIdsByClient.set(item.client_id, current);
  }

  const clientByCaseId = new Map(
    (casesResult.data || []).map((item) => [item.id, item.client_id])
  );

  for (const request of documentRequests || []) {
    const clientId = clientByCaseId.get(request.case_id);

    if (!clientId) {
      continue;
    }

    documentCountByClient.set(clientId, (documentCountByClient.get(clientId) || 0) + 1);
  }

  const result = new Map<string, GrowthContextByItem>();

  for (const seed of normalizedSeeds) {
    const intakeRecord = seed.sourceIntakeRequestId
      ? intakeMap.get(seed.sourceIntakeRequestId)
      : null;
    const event = seed.sourceIntakeRequestId
      ? latestEventByIntake.get(seed.sourceIntakeRequestId)
      : null;

    const sourceKey = normalizeValue(
      getPayloadValue(event?.payload, ["source", "origem"]),
      "nao-identificado"
    );
    const sourceLabel = formatValue(
      getPayloadValue(event?.payload, ["source", "origem"]),
      "Nao identificado"
    );
    const campaignKey = normalizeValue(
      getPayloadValue(event?.payload, ["campaign", "campanha"]),
      "sem-campanha"
    );
    const campaignLabel = formatValue(
      getPayloadValue(event?.payload, ["campaign", "campanha"]),
      "Sem campanha"
    );
    const topicKey = normalizeValue(
      getPayloadValue(event?.payload, ["topic", "tema"]),
      "sem-tema"
    );
    const topicLabel = formatValue(
      getPayloadValue(event?.payload, ["topic", "tema"]),
      "Sem tema"
    );
    const contentKey = normalizeValue(
      getPayloadValue(event?.payload, ["content_id", "contentId"]),
      "sem-conteudo"
    );
    const contentLabel = formatValue(
      getPayloadValue(event?.payload, ["content_id", "contentId"]),
      "Sem conteudo identificado"
    );

    const acquisitionContext: AcquisitionContext | null = event
      ? {
          sourceKey,
          sourceLabel,
          campaignKey,
          campaignLabel,
          topicKey,
          topicLabel,
          contentKey,
          contentLabel,
          sourceStrength: inferStrength(intelligence.acquisition.bySource, sourceKey),
          topicStrength: inferStrength(intelligence.acquisition.byTopic, topicKey),
          contentStrength: inferStrength(intelligence.acquisition.byContent, contentKey)
        }
      : null;

    const intakeContext: IntakeContext | null = intakeRecord
      ? {
          intakeRequestId: intakeRecord.id,
          status: intakeRecord.status,
          statusLabel:
            intakeRequestStatusLabels[
              intakeRecord.status as keyof typeof intakeRequestStatusLabels
            ] || intakeRecord.status,
          currentStage: intakeRecord.current_stage,
          currentStageLabel:
            publicIntakeStageLabels[
              intakeRecord.current_stage as keyof typeof publicIntakeStageLabels
            ] || intakeRecord.current_stage,
          urgencyLevel: intakeRecord.urgency_level,
          urgencyLabel:
            publicIntakeUrgencyLabels[
              intakeRecord.urgency_level as keyof typeof publicIntakeUrgencyLabels
            ] || intakeRecord.urgency_level,
          submittedAt: intakeRecord.submitted_at
        }
      : null;

    const funnelLossSignals: FunnelLossSignal[] = [];

    if (acquisitionContext?.sourceStrength === "strong") {
      funnelLossSignals.push({
        key: "strong-source",
        label: "Origem forte para insistencia",
        detail: `${acquisitionContext.sourceLabel} vem gerando avancos consistentes na ultima janela.`
      });
    }

    if (acquisitionContext?.sourceStrength === "weak") {
      funnelLossSignals.push({
        key: "weak-source",
        label: "Origem com perda de forca",
        detail: `${acquisitionContext.sourceLabel} traz volume, mas esta perdendo conversao cedo demais.`
      });
    }

    if (acquisitionContext?.topicStrength === "strong") {
      funnelLossSignals.push({
        key: "strong-topic",
        label: "Tema com boa progressao",
        detail: `${acquisitionContext.topicLabel} vem sustentando melhor avancos para cliente.`
      });
    }

    if (acquisitionContext?.contentStrength === "weak") {
      funnelLossSignals.push({
        key: "weak-content",
        label: "Conteudo chama atencao e morre cedo",
        detail: `${acquisitionContext.contentLabel} ainda precisa de ajuste de promessa ou passagem para humano.`
      });
    }

    if (
      intakeContext &&
      intakeContext.status !== "converted" &&
      intakeContext.status !== "closed" &&
      intakeContext.currentStage !== "completed"
    ) {
      funnelLossSignals.push({
        key: "intake-incomplete",
        label: "Triagem ainda sem fechamento",
        detail: `${intakeContext.currentStageLabel} e ${intakeContext.statusLabel.toLowerCase()} ainda pedem continuidade.`
      });
    }

    const profile = seed.profileId ? profileMap.get(seed.profileId) : null;
    const portalActivationPending = !!(
      profile?.invited_at &&
      !profile.first_login_completed_at
    );
    const pendingDocumentsCount = documentCountByClient.get(seed.clientId) || 0;
    const context: GrowthContextByItem = {
      acquisitionContext,
      intakeContext,
      funnelLossSignals: funnelLossSignals.slice(0, 4),
      pendingDocumentsCount,
      pendingDocumentsLabel:
        pendingDocumentsCount > 0
          ? `${pendingDocumentsCount} pendencia(s) documental(is)`
          : "Sem pendencias documentais abertas",
      portalActivationPending,
      hasStrongGrowthSignal: funnelLossSignals.some((item) =>
        ["strong-source", "strong-topic"].includes(item.key)
      ),
      hasWeakGrowthSignal: funnelLossSignals.some((item) =>
        ["weak-source", "weak-content", "intake-incomplete"].includes(item.key)
      ),
      summaryLines: []
    };

    context.summaryLines = buildSummaryLines(context);
    result.set(seed.clientId, context);
  }

  return result;
}
