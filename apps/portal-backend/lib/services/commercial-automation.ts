import "server-only";

import { createWebhookSupabaseClient } from "../supabase/webhook.ts";
import { followUpEngine } from "./follow-up-engine.ts";
import type { GrowthContextByItem } from "./growth-item-context.ts";

export type CommercialAutomationPlan = {
  ruleKey: string;
  label: string;
  detail: string;
  messageType: string;
  state: "eligible" | "queued" | "cooldown" | "idle";
  scheduledFor?: string;
};

type CommercialAutomationContact = {
  clientId: string;
  pipelineId: string;
  isClient: boolean;
  pipelineStage: string;
  leadTemperature: string;
  sourceChannel: string;
  attentionBucket: "needs_attention" | "follow_up" | "blocked" | "monitor";
  priorityLabel: "high" | "medium" | "low";
  daysSinceLastContact: number;
  consultationReadiness?: string;
  recommendedAction?: string;
  opportunityState?: string;
  blockingReason?: string | null;
  consultationRecommendationState?: string;
  channels: Array<{
    channel: string;
    externalUserId: string;
    lastContactAt: string;
  }>;
  growthContext?: GrowthContextByItem | null;
};

type QueueSummary = {
  evaluated: number;
  eligible: number;
  queued: number;
  cooldown: number;
  idle: number;
};

function pickPrimaryChannel(contact: CommercialAutomationContact) {
  if (contact.channels.some((item) => item.channel === "whatsapp")) {
    return "whatsapp" as const;
  }

  if (contact.channels.some((item) => item.channel === "instagram")) {
    return "instagram" as const;
  }

  return null;
}

function buildCandidate(contact: CommercialAutomationContact): Omit<CommercialAutomationPlan, "state" | "scheduledFor"> | null {
  const growth = contact.growthContext;

  if (growth?.pendingDocumentsCount && contact.isClient) {
    return {
      ruleKey: "document-request-nudge",
      label: "Cobrar documento pendente",
      detail: growth.pendingDocumentsLabel,
      messageType: "document_request_nudge"
    };
  }

  if (contact.pipelineStage === "proposal_sent" && contact.daysSinceLastContact >= 2) {
    return {
      ruleKey: "proposal-restart",
      label: "Retomar proposta sem resposta",
      detail: "A proposta ja foi enviada e ainda pede retorno para destravar a decisao.",
      messageType: "proposal_reminder"
    };
  }

  if (contact.pipelineStage === "consultation_offered" && contact.daysSinceLastContact >= 1) {
    return {
      ruleKey: "consultation-restart",
      label: "Retomar consulta oferecida",
      detail: "O lead ja recebeu convite de consulta e ainda pode converter nesta janela.",
      messageType: "consultation_followup"
    };
  }

  if (
    !contact.isClient &&
    contact.consultationRecommendationState === "recommend_now" &&
    contact.recommendedAction === "offer_consultation"
  ) {
    return {
      ruleKey: "consultation-ready-advance",
      label: "Sugerir consulta no timing certo",
      detail: "A leitura comercial indica prontidao real para consulta, com criterio e sem excesso.",
      messageType: "consultation_followup"
    };
  }

  if (
    !contact.isClient &&
    contact.blockingReason === "missing_documents" &&
    contact.daysSinceLastContact >= 1
  ) {
    return {
      ruleKey: "document-context-unblock",
      label: "Destravar com documento",
      detail: "A conversa avancou, mas o fechamento depende de contexto documental.",
      messageType: "document_request_nudge"
    };
  }

  if (contact.pipelineStage === "consultation_scheduled" && contact.daysSinceLastContact >= 1) {
    return {
      ruleKey: "consultation-confirmation",
      label: "Confirmar consulta encaminhada",
      detail: "A consulta ja entrou em fase operacional e merece confirmacao elegante para evitar no-show.",
      messageType: "pre_consultation_confirmation"
    };
  }

  if (
    !contact.isClient &&
    growth?.intakeContext &&
    growth.intakeContext.status !== "converted" &&
    growth.intakeContext.status !== "closed" &&
    growth.intakeContext.currentStage !== "completed"
  ) {
    return {
      ruleKey: "intake-completion-reminder",
      label: "Retomar triagem iniciada",
      detail: "Existe triagem ainda aberta sem fechamento, com risco de perda no meio do funil.",
      messageType: "intake_completion_reminder"
    };
  }

  if (
    !contact.isClient &&
    contact.priorityLabel === "high" &&
    contact.daysSinceLastContact >= 2 &&
    growth?.hasStrongGrowthSignal
  ) {
    return {
      ruleKey: "strong-source-reengagement",
      label: "Insistir em lead de origem forte",
      detail: "O contato veio de origem ou tema com bom historico de avancos e merece nova tentativa.",
      messageType: "strong_source_reengagement"
    };
  }

  if (
    !contact.isClient &&
    contact.priorityLabel === "high" &&
    (contact.attentionBucket === "follow_up" || contact.attentionBucket === "needs_attention")
  ) {
    return {
      ruleKey: "high-priority-reengagement",
      label: "Reengajar lead prioritario",
      detail: "O item segue com bom sinal comercial e sem resposta recente.",
      messageType: "reengagement"
    };
  }

  return null;
}

export async function getCommercialAutomationPlans(
  contacts: CommercialAutomationContact[]
) {
  const supabase = createWebhookSupabaseClient();
  const plans = new Map<string, CommercialAutomationPlan>();

  if (!contacts.length) {
    return plans;
  }

  const clientIds = [...new Set(contacts.map((item) => item.clientId))];
  const { data: recentMessages, error } = await supabase
    .from("follow_up_messages")
    .select("client_id,pipeline_id,message_type,status,scheduled_for,created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(
      `Nao foi possivel carregar a fila comercial recente: ${error.message}`
    );
  }

  const messagesByClient = new Map<string, typeof recentMessages>();

  for (const message of recentMessages || []) {
    const current = messagesByClient.get(message.client_id) || [];
    current.push(message);
    messagesByClient.set(message.client_id, current);
  }

  for (const contact of contacts) {
    const candidate = buildCandidate(contact);

    if (!candidate) {
      plans.set(contact.clientId, {
        ruleKey: "idle",
        label: "Sem automacao segura agora",
        detail: "O item segue apenas em acompanhamento humano neste momento.",
        messageType: "custom",
        state: "idle"
      });
      continue;
    }

    const existing = (messagesByClient.get(contact.clientId) || []).find(
      (message) =>
        message.pipeline_id === contact.pipelineId &&
        message.message_type === candidate.messageType
    );

    if (existing?.status === "scheduled" || existing?.status === "draft") {
      plans.set(contact.clientId, {
        ...candidate,
        state: "queued",
        scheduledFor: existing.scheduled_for || existing.created_at
      });
      continue;
    }

    if (existing?.created_at) {
      const elapsedHours =
        (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60);

      if (elapsedHours <= 72) {
        plans.set(contact.clientId, {
          ...candidate,
          state: "cooldown",
          scheduledFor: existing.created_at
        });
        continue;
      }
    }

    plans.set(contact.clientId, {
      ...candidate,
      state: "eligible"
    });
  }

  return plans;
}

export async function queueEligibleCommercialAutomations(
  contacts: CommercialAutomationContact[],
  limit = 20
): Promise<QueueSummary> {
  const plans = await getCommercialAutomationPlans(contacts);
  const summary: QueueSummary = {
    evaluated: contacts.length,
    eligible: 0,
    queued: 0,
    cooldown: 0,
    idle: 0
  };

  for (const contact of contacts) {
    const plan = plans.get(contact.clientId);

    if (!plan) {
      continue;
    }

    if (plan.state === "idle") {
      summary.idle += 1;
      continue;
    }

    if (plan.state === "cooldown" || plan.state === "queued") {
      summary.cooldown += 1;
      continue;
    }

    summary.eligible += 1;

    if (summary.queued >= limit) {
      continue;
    }

    const channel = pickPrimaryChannel(contact);

    if (!channel) {
      continue;
    }

    const scheduledFor = new Date(Date.now() + 15 * 60 * 1000);
    const scheduled = await followUpEngine.scheduleFollowUpForClient({
      clientId: contact.clientId,
      pipelineId: contact.pipelineId,
      channel,
      messageType: plan.messageType,
      scheduledFor,
      metadata: {
        automationRuleKey: plan.ruleKey,
        automationLabel: plan.label,
        automationDetail: plan.detail
      }
    });

    if (scheduled) {
      summary.queued += 1;
    }
  }

  return summary;
}
