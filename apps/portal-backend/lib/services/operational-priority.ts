import type { GrowthContextByItem } from "./growth-item-context";

export type OperationalPriorityLabel = "high" | "medium" | "low";

export type OperationalAttentionBucket =
  | "needs_attention"
  | "follow_up"
  | "blocked"
  | "monitor";

export type OperationalNextBestAction = {
  title: string;
  detail: string;
};

type OperationalPriorityInput = {
  isClient: boolean;
  pipelineStage: string;
  leadTemperature: string;
  sourceChannel: string;
  areaInterest?: string | null;
  followUpStatus?: string | null;
  nextFollowUpAt?: string | null;
  daysSinceLastContact: number;
  isOverdue: boolean;
  followUpCount: number;
  growthContext?: GrowthContextByItem | null;
};

type OperationalPriorityResult = {
  score: number;
  label: OperationalPriorityLabel;
  reasons: string[];
  attentionBucket: OperationalAttentionBucket;
  nextBestAction: OperationalNextBestAction;
};

function clampScore(value: number) {
  return Math.max(1, Math.min(10, value));
}

function getPriorityLabel(score: number): OperationalPriorityLabel {
  if (score >= 8) {
    return "high";
  }

  if (score >= 5) {
    return "medium";
  }

  return "low";
}

function getAttentionBucket(
  input: OperationalPriorityInput,
  score: number
): OperationalAttentionBucket {
  if (input.pipelineStage === "closed_lost" || input.pipelineStage === "inactive") {
    return "monitor";
  }

  if (
    input.isClient &&
    (input.pipelineStage === "contract_pending" || input.pipelineStage === "consultation_scheduled")
  ) {
    return "needs_attention";
  }

  if ((input.growthContext?.pendingDocumentsCount || 0) > 0) {
    return "needs_attention";
  }

  if (input.isOverdue || score >= 8) {
    return "needs_attention";
  }

  if (
    isPendingFollowUpStatus(input.followUpStatus, {
      pipelineStage: input.pipelineStage
    }) ||
    input.pipelineStage === "consultation_offered" ||
    input.pipelineStage === "proposal_sent"
  ) {
    return "follow_up";
  }

  if (input.daysSinceLastContact >= 10 || input.followUpCount >= 3) {
    return "blocked";
  }

  return "monitor";
}

function buildNextBestAction(
  input: OperationalPriorityInput,
  attentionBucket: OperationalAttentionBucket
): OperationalNextBestAction {
  if (input.pipelineStage === "proposal_sent") {
    return {
      title: "Retomar proposta",
      detail: "Confirme interesse, ajuste termos e tente destravar a decisao ainda nesta janela."
    };
  }

  if (input.pipelineStage === "contract_pending") {
    return {
      title: "Fechar contrato",
      detail: "Documento pendente nesta etapa costuma esfriar rapido. Vale contato objetivo e confirmacao de assinatura."
    };
  }

  if (input.pipelineStage === "consultation_offered") {
    return {
      title: "Converter consulta em agenda",
      detail: "A oferta ja foi feita. O melhor proximo passo e confirmar horario e remover friccao do agendamento."
    };
  }

  if (input.pipelineStage === "consultation_scheduled") {
    return {
      title: "Preparar consulta",
      detail: "Confirme presenca, alinhe contexto essencial e evite surpresa na proxima conversa."
    };
  }

  if ((input.growthContext?.pendingDocumentsCount || 0) > 0) {
    return {
      title: "Cobrar documento pendente",
      detail: input.growthContext?.pendingDocumentsLabel || "Existe pendencia documental aberta segurando o proximo passo."
    };
  }

  if (
    input.growthContext?.intakeContext &&
    input.growthContext.intakeContext.status !== "converted" &&
    input.growthContext.intakeContext.status !== "closed" &&
    input.growthContext.intakeContext.currentStage !== "completed"
  ) {
    return {
      title: "Revisar triagem travada",
      detail: "A triagem segue aberta no meio do funil e merece retomada antes de esfriar."
    };
  }

  if (input.isClient && input.isOverdue) {
    return {
      title: "Retomar cliente parado",
      detail: "Ha demanda aberta sem retorno no prazo esperado. Vale contato curto, objetivo e com proximo passo claro."
    };
  }

  if (!input.isClient && input.leadTemperature === "hot" && input.daysSinceLastContact <= 2) {
    return {
      title: "Reengajar lead quente",
      detail: "O sinal ainda esta vivo. Priorize retorno humano enquanto a intencao segue recente."
    };
  }

  if (!input.isClient && input.followUpStatus === "pending") {
    return {
      title: "Fazer follow-up",
      detail: "Existe continuidade em aberto. Vale contato agora para nao perder timing comercial."
    };
  }

  if (!input.isClient && input.growthContext?.hasStrongGrowthSignal && input.daysSinceLastContact >= 2) {
    return {
      title: "Insistir em origem forte",
      detail: "O item veio de origem ou tema com boa progressao. Vale nova tentativa enquanto o sinal comercial continua valido."
    };
  }

  if (!input.isClient && input.growthContext?.hasWeakGrowthSignal) {
    return {
      title: "Corrigir perda no funil",
      detail: "Ha sinal de perda em origem, conteudo ou triagem. Vale ajustar abordagem e CTA antes de insistir no mesmo fluxo."
    };
  }

  if (!input.isClient && input.daysSinceLastContact >= 7) {
    return {
      title: "Reativar contato parado",
      detail: "O lead esfriou sem conclusao. Retome com mensagem curta, contexto do interesse e CTA simples."
    };
  }

  if (input.sourceChannel === "instagram" && input.leadTemperature !== "cold") {
    return {
      title: "Insistir no canal que trouxe tracao",
      detail: "Este contato chegou por origem com bom potencial. Vale manter a conversa no mesmo contexto de entrada."
    };
  }

  if (attentionBucket === "blocked") {
    return {
      title: "Revisar travamento",
      detail: "O item esta acumulando espera ou tentativas. Decida se vale insistir, mudar abordagem ou encerrar ciclo."
    };
  }

  return {
    title: "Acompanhar proximo passo",
    detail: "Mantenha o caso no radar e avance quando a proxima resposta, documento ou agenda abrir nova acao."
  };
}

export function evaluateOperationalPriority(
  input: OperationalPriorityInput
): OperationalPriorityResult {
  let score = 3;
  const reasons: string[] = [];

  if (input.leadTemperature === "hot") {
    score += 3;
    reasons.push("Lead quente com maior chance de resposta curta.");
  } else if (input.leadTemperature === "warm") {
    score += 2;
    reasons.push("Lead morno ainda pede continuidade humana.");
  } else {
    score -= 1;
  }

  if (
    ["consultation_offered", "consultation_scheduled", "proposal_sent", "contract_pending"].includes(
      input.pipelineStage
    )
  ) {
    score += 2;
    reasons.push("Etapa do funil proxima de conversao ou decisao.");
  }

  if (input.isOverdue) {
    score += 2;
    reasons.push("Follow-up passou do prazo esperado.");
  }

  if (input.followUpStatus === "pending" || input.followUpStatus === "scheduled") {
    score += 1;
    reasons.push("Existe automacao ou retorno pendente em aberto.");
  }

  if (input.growthContext?.hasStrongGrowthSignal) {
    score += 1;
    reasons.push("Origem ou tema do item tem historico melhor de avancos.");
  }

  if (input.growthContext?.hasWeakGrowthSignal) {
    reasons.push("O item carrega sinal de perda em origem, conteudo ou triagem.");
  }

  if ((input.growthContext?.pendingDocumentsCount || 0) > 0) {
    score += 2;
    reasons.push(input.growthContext?.pendingDocumentsLabel || "Existem pendencias documentais abertas.");
  }

  if (input.growthContext?.portalActivationPending) {
    score += 1;
    reasons.push("O portal ainda nao foi ativado e a continuidade pode travar aqui.");
  }

  if (input.daysSinceLastContact <= 2 && input.leadTemperature === "hot") {
    score += 1;
    reasons.push("Janela recente de engajamento ainda favorece conversao.");
  }

  if (input.daysSinceLastContact >= 7 && input.daysSinceLastContact < 14) {
    score += 1;
    reasons.push("Contato esta esfriando e precisa decisao de insistencia.");
  }

  if (input.daysSinceLastContact >= 14) {
    score -= 2;
    reasons.push("Contato envelhecido, com risco maior de travamento.");
  }

  if (input.followUpCount >= 3) {
    score += 1;
    reasons.push("Ja houve varias tentativas e o item precisa leitura mais intencional.");
  }

  if (input.isClient) {
    score += 1;
    reasons.push("Ja existe relacao ativa com o escritorio.");
  }

  if (input.pipelineStage === "closed_lost" || input.pipelineStage === "inactive") {
    score = 2;
    reasons.length = 0;
    reasons.push("Fluxo encerrado ou inativo, sem tracao operacional imediata.");
  }

  const normalizedScore = clampScore(score);
  const label = getPriorityLabel(normalizedScore);
  const attentionBucket = getAttentionBucket(input, normalizedScore);
  const nextBestAction = buildNextBestAction(input, attentionBucket);

  return {
    score: normalizedScore,
    label,
    reasons: reasons.slice(0, 3),
    attentionBucket,
    nextBestAction
  };
}
import { isPendingFollowUpStatus } from "./follow-up-semantics";
