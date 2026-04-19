import type { CaseArea } from "../domain/portal";

export type LeadTemperature = "cold" | "warm" | "hot" | "urgent";
export type LeadLifecycleStage =
  | "new_inquiry"
  | "qualified_interest"
  | "consultation_candidate"
  | "urgent_triage";
export type LeadReadinessLevel =
  | "explorando"
  | "comparando"
  | "pronto-para-agendar"
  | "urgencia-imediata";
export type PreferredContactChannel = "whatsapp" | "telefone" | "email";

export type LeadScoreReason = {
  label: string;
  points: number;
  detail: string;
};

export type LeadScoreProfile = {
  score: number;
  temperature: LeadTemperature;
  lifecycleStage: LeadLifecycleStage;
  recommendedAction: string;
  recommendedActionLabel: string;
  operationalSlaHours: number;
  reasons: LeadScoreReason[];
  explanation: string;
};

type LeadScoreInput = {
  caseArea: CaseArea;
  urgencyLevel: "baixa" | "moderada" | "alta" | "urgente";
  currentStage:
    | "ainda-nao-iniciei"
    | "ja-estou-em-atendimento"
    | "tenho-prazo-proximo"
    | "recebi-negativa-ou-cobranca";
  readinessLevel: LeadReadinessLevel;
  preferredContactChannel: PreferredContactChannel;
  preferredContactPeriod: string;
  appointmentInterest: boolean;
  caseSummary: string;
  source?: string;
  topic?: string;
  campaign?: string;
  contentId?: string;
  contentStage?: "awareness" | "consideration" | "decision";
  returnVisitor?: boolean;
};

const temperatureThresholds: Array<{
  minScore: number;
  temperature: LeadTemperature;
  lifecycleStage: LeadLifecycleStage;
  recommendedAction: string;
  recommendedActionLabel: string;
  operationalSlaHours: number;
}> = [
  {
    minScore: 72,
    temperature: "urgent",
    lifecycleStage: "urgent_triage",
    recommendedAction: "priorizar_contato_humano_imediato",
    recommendedActionLabel: "Contato humano imediato",
    operationalSlaHours: 2
  },
  {
    minScore: 55,
    temperature: "hot",
    lifecycleStage: "consultation_candidate",
    recommendedAction: "oferecer_consulta_com_contexto",
    recommendedActionLabel: "Oferecer consulta",
    operationalSlaHours: 6
  },
  {
    minScore: 35,
    temperature: "warm",
    lifecycleStage: "qualified_interest",
    recommendedAction: "seguir_com_triagem_qualificada",
    recommendedActionLabel: "Seguir com qualificação",
    operationalSlaHours: 24
  },
  {
    minScore: 0,
    temperature: "cold",
    lifecycleStage: "new_inquiry",
    recommendedAction: "educar_e_coletar_contexto",
    recommendedActionLabel: "Educar e coletar contexto",
    operationalSlaHours: 48
  }
];

function pushReason(reasons: LeadScoreReason[], label: string, points: number, detail: string) {
  reasons.push({ label, points, detail });
}

export function calculateLeadScore(input: LeadScoreInput): LeadScoreProfile {
  const reasons: LeadScoreReason[] = [];

  const urgencyPoints = {
    baixa: 4,
    moderada: 10,
    alta: 18,
    urgente: 28
  }[input.urgencyLevel];
  pushReason(
    reasons,
    "Urgência",
    urgencyPoints,
    `O caso foi marcado com urgência ${input.urgencyLevel}.`
  );

  const stagePoints = {
    "ainda-nao-iniciei": 5,
    "ja-estou-em-atendimento": 12,
    "tenho-prazo-proximo": 20,
    "recebi-negativa-ou-cobranca": 16
  }[input.currentStage];
  pushReason(
    reasons,
    "Momento do caso",
    stagePoints,
    "O estágio atual indica quanto contexto e pressão de decisão já existem."
  );

  const readinessPoints = {
    explorando: 4,
    comparando: 10,
    "pronto-para-agendar": 18,
    "urgencia-imediata": 25
  }[input.readinessLevel];
  pushReason(
    reasons,
    "Prontidão comercial",
    readinessPoints,
    "A prontidão declarada ajuda a separar curiosidade de intenção real de atendimento."
  );

  const channelPoints = {
    whatsapp: 6,
    telefone: 5,
    email: 2
  }[input.preferredContactChannel];
  pushReason(
    reasons,
    "Canal preferido",
    channelPoints,
    `O canal ${input.preferredContactChannel} costuma acelerar a continuidade operacional.`
  );

  if (input.appointmentInterest) {
    pushReason(
      reasons,
      "Interesse em agendamento",
      14,
      "A pessoa já sinalizou abertura para consulta ou conversa estruturada."
    );
  }

  if (input.contentStage === "decision") {
    pushReason(
      reasons,
      "Conteúdo de fundo de funil",
      8,
      "A entrada veio de conteúdo com intenção mais próxima de ação."
    );
  } else if (input.contentStage === "consideration") {
    pushReason(
      reasons,
      "Conteúdo de meio de funil",
      4,
      "A entrada veio de leitura comparativa ou de aprofundamento."
    );
  }

  if (input.returnVisitor) {
    pushReason(
      reasons,
      "Retorno recorrente",
      5,
      "O visitante voltou com contexto e tende a estar mais aquecido."
    );
  }

  if (input.campaign) {
    pushReason(
      reasons,
      "Campanha identificada",
      4,
      "O lead chegou com campanha rastreável, o que melhora leitura de intenção e follow-up."
    );
  }

  if (input.source && input.source !== "direct" && input.source !== "portal-triagem") {
    pushReason(
      reasons,
      "Origem identificada",
      3,
      `A origem ${input.source} ajuda a manter contexto comercial desde a entrada.`
    );
  }

  if (input.topic && input.topic === input.caseArea) {
    pushReason(
      reasons,
      "Tema alinhado",
      4,
      "O tema da entrada combina com a área jurídica principal declarada."
    );
  }

  const summaryLength = input.caseSummary.trim().length;
  if (summaryLength >= 200) {
    pushReason(
      reasons,
      "Contexto detalhado",
      6,
      "O resumo já chega com densidade suficiente para reduzir ida e volta operacional."
    );
  } else if (summaryLength >= 80) {
    pushReason(
      reasons,
      "Contexto útil",
      3,
      "O resumo traz contexto mínimo útil para triagem qualificada."
    );
  }

  if (input.preferredContactPeriod === "horario-comercial") {
    pushReason(
      reasons,
      "Janela operacional favorável",
      2,
      "A preferência de contato combina com a janela mais simples para resposta do time."
    );
  }

  const score = reasons.reduce((total, reason) => total + reason.points, 0);
  const resolved = temperatureThresholds.find((item) => score >= item.minScore) || temperatureThresholds.at(-1)!;

  return {
    score,
    temperature: resolved.temperature,
    lifecycleStage: resolved.lifecycleStage,
    recommendedAction: resolved.recommendedAction,
    recommendedActionLabel: resolved.recommendedActionLabel,
    operationalSlaHours: resolved.operationalSlaHours,
    reasons,
    explanation: reasons
      .slice(0, 4)
      .map((reason) => `${reason.label}: +${reason.points}`)
      .join(" | ")
  };
}
