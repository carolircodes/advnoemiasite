import type { LegalTheme, NoemiaChannel, NoemiaDomain } from "../ai/core-types.ts";
import { evaluateNoemiaCompliance } from "../ai/noemia-compliance.ts";

export type FunnelEntryPoint =
  | "site"
  | "triage_page"
  | "noemia_chat"
  | "whatsapp"
  | "instagram_comment"
  | "facebook_comment"
  | "messenger"
  | "telegram"
  | "campaign_link"
  | "consultation_cta"
  | "payment_cta"
  | "client_portal";

export type FunnelLeadState =
  | "new"
  | "triaged"
  | "qualified"
  | "needs_human_review"
  | "awaiting_contact"
  | "consultation_offered"
  | "consultation_scheduled"
  | "payment_pending"
  | "converted"
  | "lost"
  | "archived";

export type FunnelConversationState =
  | "open"
  | "ai_assisted"
  | "manual_followup_required"
  | "waiting_human"
  | "waiting_client"
  | "resolved"
  | "escalated"
  | "closed";

export type FunnelConsultationState =
  | "not_offered"
  | "offered"
  | "accepted"
  | "scheduled"
  | "rescheduled"
  | "canceled"
  | "completed"
  | "no_show";

export type FunnelPaymentState =
  | "not_created"
  | "pending"
  | "approved"
  | "rejected"
  | "canceled"
  | "refunded"
  | "failed"
  | "expired";

export type FunnelPortalState =
  | "not_created"
  | "invite_pending"
  | "ready"
  | "active"
  | "needs_manual_setup";

export type FunnelNotificationState =
  | "not_needed"
  | "queued"
  | "provider_missing"
  | "manual_check_required"
  | "sent"
  | "failed";

export type FunnelProviderStatus =
  | "ready"
  | "provider_missing"
  | "manual_check_required"
  | "not_configured";

export type FunnelTrackingEvent =
  | "lead_created"
  | "triage_completed"
  | "handoff_required"
  | "inbox_opened"
  | "consultation_offered"
  | "consultation_scheduled"
  | "payment_link_created"
  | "payment_approved"
  | "portal_accessed"
  | "notification_queued"
  | "notification_failed"
  | "manual_followup_required"
  | "conversion_completed";

export type FunnelJourneyProjectionInput = {
  entryPoint: FunnelEntryPoint;
  message: string;
  sourceChannel?: NoemiaChannel;
  campaign?: string | null;
  topic?: string | null;
  outboundConfigured?: boolean;
  paymentProviderConfigured?: boolean;
  notificationProviderConfigured?: boolean;
  portalAccountExists?: boolean;
  consultationOffered?: boolean;
  consultationScheduled?: boolean;
  mockPaymentState?: FunnelPaymentState;
};

export type FunnelJourneyProjection = {
  entryPoint: FunnelEntryPoint;
  channel: NoemiaChannel;
  legalArea: LegalTheme;
  topic: string;
  source: {
    channel: NoemiaChannel;
    campaign: string | null;
    entryPoint: FunnelEntryPoint;
  };
  lead: {
    status: FunnelLeadState;
    label: string;
  };
  conversation: {
    status: FunnelConversationState;
    label: string;
    requiresHuman: boolean;
    reasonCodes: string[];
    safeSummary: string;
  };
  inbox: {
    appearsInInbox: boolean;
    priority: "low" | "medium" | "high";
    nextAction: string;
    badges: string[];
  };
  consultation: {
    status: FunnelConsultationState;
    label: string;
    manualSchedulingRequired: boolean;
  };
  payment: {
    status: FunnelPaymentState;
    label: string;
    providerStatus: FunnelProviderStatus;
    linkedToLead: boolean;
    linkedToConsultation: boolean;
  };
  portal: {
    status: FunnelPortalState;
    label: string;
    nextStep: string;
  };
  notification: {
    status: FunnelNotificationState;
    label: string;
  };
  trackingEvents: FunnelTrackingEvent[];
};

type StatusDictionary = {
  lead: Record<FunnelLeadState, string>;
  conversation: Record<FunnelConversationState, string>;
  consultation: Record<FunnelConsultationState, string>;
  payment: Record<FunnelPaymentState, string>;
  portal: Record<FunnelPortalState, string>;
  notification: Record<FunnelNotificationState, string>;
};

export const FUNNEL_STATUS_LABELS: StatusDictionary = {
  lead: {
    new: "Novo",
    triaged: "Triado",
    qualified: "Qualificado",
    needs_human_review: "Precisa de revisao humana",
    awaiting_contact: "Aguardando contato",
    consultation_offered: "Consulta oferecida",
    consultation_scheduled: "Consulta agendada",
    payment_pending: "Pagamento pendente",
    converted: "Convertido",
    lost: "Perdido",
    archived: "Arquivado"
  },
  conversation: {
    open: "Aberta",
    ai_assisted: "Assistida pela NoemIA",
    manual_followup_required: "Follow-up manual necessario",
    waiting_human: "Aguardando equipe",
    waiting_client: "Aguardando cliente",
    resolved: "Resolvida",
    escalated: "Escalada",
    closed: "Fechada"
  },
  consultation: {
    not_offered: "Consulta ainda nao oferecida",
    offered: "Consulta oferecida",
    accepted: "Consulta aceita",
    scheduled: "Consulta agendada",
    rescheduled: "Consulta reagendada",
    canceled: "Consulta cancelada",
    completed: "Consulta concluida",
    no_show: "Nao compareceu"
  },
  payment: {
    not_created: "Pagamento nao criado",
    pending: "Pagamento pendente",
    approved: "Pagamento aprovado",
    rejected: "Pagamento recusado",
    canceled: "Pagamento cancelado",
    refunded: "Pagamento estornado",
    failed: "Pagamento com falha",
    expired: "Pagamento expirado"
  },
  portal: {
    not_created: "Portal ainda nao criado",
    invite_pending: "Convite do portal pendente",
    ready: "Portal pronto",
    active: "Portal ativo",
    needs_manual_setup: "Criacao manual do portal necessaria"
  },
  notification: {
    not_needed: "Sem notificacao necessaria",
    queued: "Notificacao enfileirada",
    provider_missing: "Provider de notificacao ausente",
    manual_check_required: "Checagem manual necessaria",
    sent: "Notificacao enviada",
    failed: "Notificacao falhou"
  }
};

export const FUNNEL_TRACKING_EVENTS: FunnelTrackingEvent[] = [
  "lead_created",
  "triage_completed",
  "handoff_required",
  "inbox_opened",
  "consultation_offered",
  "consultation_scheduled",
  "payment_link_created",
  "payment_approved",
  "portal_accessed",
  "notification_queued",
  "notification_failed",
  "manual_followup_required",
  "conversion_completed"
];

export function buildFunnelStateMatrix() {
  return {
    states: FUNNEL_STATUS_LABELS,
    transitions: {
      lead: [
        "new -> triaged -> qualified",
        "qualified -> consultation_offered -> payment_pending -> converted",
        "triaged -> needs_human_review -> awaiting_contact",
        "any_active -> lost|archived"
      ],
      conversation: [
        "open -> ai_assisted",
        "ai_assisted -> manual_followup_required|waiting_human|waiting_client",
        "waiting_human -> waiting_client -> resolved",
        "manual_followup_required -> escalated|closed"
      ],
      consultation: [
        "not_offered -> offered -> accepted -> scheduled",
        "scheduled -> completed|rescheduled|canceled|no_show"
      ],
      payment: [
        "not_created -> pending -> approved",
        "pending -> rejected|failed|expired|canceled",
        "approved -> refunded"
      ],
      portal: [
        "not_created -> invite_pending -> ready -> active",
        "not_created -> needs_manual_setup"
      ],
      notification: [
        "not_needed -> queued -> sent",
        "queued -> failed|provider_missing|manual_check_required"
      ]
    }
  };
}

function normalizeMessage(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchFunnelKeyword(message: string) {
  const normalized = normalizeMessage(message).replace(/[^\p{L}\p{N}\s]+/gu, " ");
  const normalizedCompact = normalized.replace(/\s+/g, " ").trim();
  const bankingAliases = [
    "negativacao",
    "negativacao indevida",
    "nome sujo",
    "serasa",
    "spc",
    "banco negativou",
    "banco negativou meu nome",
    "me negativou",
    "negativou meu nome"
  ];

  for (const alias of bankingAliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "u");

    if (pattern.test(normalizedCompact)) {
      return {
        matched: true,
        topic: "bancario" as LegalTheme,
        alias
      };
    }
  }

  return {
    matched: false,
    topic: "geral" as LegalTheme,
    alias: null
  };
}

function inferChannel(input: FunnelJourneyProjectionInput): NoemiaChannel {
  if (input.sourceChannel) {
    return input.sourceChannel;
  }

  if (input.entryPoint === "whatsapp") return "whatsapp";
  if (input.entryPoint === "instagram_comment") return "instagram";
  if (input.entryPoint === "facebook_comment" || input.entryPoint === "messenger") return "facebook";
  if (input.entryPoint === "telegram") return "telegram";
  if (input.entryPoint === "client_portal") return "portal";
  return "site";
}

function inferLegalArea(input: FunnelJourneyProjectionInput): LegalTheme {
  const keyword = matchFunnelKeyword(input.message);
  const normalized = normalizeMessage(input.message);

  if (keyword.matched) {
    return keyword.topic;
  }

  if (/\b(inss|beneficio|bpc|loas|aposentadoria|auxilio|pericia)\b/.test(normalized)) {
    return "previdenciario";
  }

  if (/\b(negativacao|nome sujo|serasa|spc|banco|consignado|desconto indevido|rmc|rcc)\b/.test(normalized)) {
    return "bancario";
  }

  if (/\b(pensao|guarda|divorcio|visitas|uniao estavel|partilha|crianca|adolescente)\b/.test(normalized)) {
    return "familia";
  }

  if (/\b(contrato|cobranca|dano moral|indenizacao|responsabilidade civil|vizinhanca)\b/.test(normalized)) {
    return "civil";
  }

  return "geral";
}

function inferTopic(input: FunnelJourneyProjectionInput, area: LegalTheme) {
  const keyword = matchFunnelKeyword(input.message);

  if (keyword.matched) {
    return keyword.alias || keyword.topic;
  }

  return input.topic || area;
}

function toComplianceDomain(input: FunnelJourneyProjectionInput): NoemiaDomain {
  return input.entryPoint === "instagram_comment" || input.entryPoint === "facebook_comment"
    ? "channel_comment"
    : "commercial_conversion";
}

function buildSafeSummary(input: FunnelJourneyProjectionInput, area: LegalTheme, topic: string) {
  return `Entrada ${input.entryPoint} com tema ${topic || area}. Resumo seguro para operacao: organizar contexto, validar prazo/comunicacao oficial e encaminhar sem prometer resultado.`;
}

export function projectFunnelJourney(input: FunnelJourneyProjectionInput): FunnelJourneyProjection {
  const channel = inferChannel(input);
  const area = inferLegalArea(input);
  const topic = inferTopic(input, area);
  const domain = toComplianceDomain(input);
  const compliance = evaluateNoemiaCompliance({
    message: input.message,
    channel,
    domain,
    theme: area,
    metadata: {
      source:
        input.entryPoint === "instagram_comment"
          ? "instagram_comment"
          : input.entryPoint === "facebook_comment"
            ? "facebook_comment"
            : input.entryPoint
    }
  });

  const isPublicComment = domain === "channel_comment";
  const outboundConfigured = input.outboundConfigured === true;
  const manualFollowUpRequired =
    compliance.requiresHumanHandoff || (isPublicComment && !outboundConfigured);
  const consultationOffered = input.consultationOffered === true;
  const consultationScheduled = input.consultationScheduled === true;
  const paymentProviderConfigured = input.paymentProviderConfigured === true;
  const notificationProviderConfigured = input.notificationProviderConfigured === true;
  const mockPaymentState = input.mockPaymentState || "not_created";

  const paymentStatus: FunnelPaymentState =
    consultationOffered && paymentProviderConfigured
      ? mockPaymentState === "not_created"
        ? "pending"
        : mockPaymentState
      : "not_created";
  const paymentApproved = paymentStatus === "approved";

  const consultationStatus: FunnelConsultationState = consultationScheduled
    ? "scheduled"
    : consultationOffered
      ? "offered"
      : "not_offered";

  const leadStatus: FunnelLeadState = paymentApproved
    ? "converted"
    : paymentStatus === "pending"
      ? "payment_pending"
      : consultationScheduled
        ? "consultation_scheduled"
        : consultationOffered
          ? "consultation_offered"
          : manualFollowUpRequired
            ? "needs_human_review"
            : "triaged";

  const conversationStatus: FunnelConversationState = manualFollowUpRequired
    ? isPublicComment && !outboundConfigured
      ? "manual_followup_required"
      : "waiting_human"
    : "ai_assisted";

  const notificationStatus: FunnelNotificationState =
    notificationProviderConfigured
      ? paymentApproved || manualFollowUpRequired
        ? "queued"
        : "not_needed"
      : paymentApproved || manualFollowUpRequired || consultationOffered
        ? "provider_missing"
        : "not_needed";

  const portalStatus: FunnelPortalState = paymentApproved
    ? input.portalAccountExists
      ? "ready"
      : "needs_manual_setup"
    : input.portalAccountExists
      ? "invite_pending"
      : "not_created";

  const trackingEvents: FunnelTrackingEvent[] = ["lead_created", "triage_completed", "inbox_opened"];

  if (manualFollowUpRequired) {
    trackingEvents.push("handoff_required", "manual_followup_required");
  }
  if (consultationOffered) {
    trackingEvents.push("consultation_offered");
  }
  if (consultationScheduled) {
    trackingEvents.push("consultation_scheduled");
  }
  if (paymentStatus === "pending") {
    trackingEvents.push("payment_link_created");
  }
  if (paymentApproved) {
    trackingEvents.push("payment_approved", "conversion_completed");
  }
  if (portalStatus === "ready") {
    trackingEvents.push("portal_accessed");
  }
  if (notificationStatus === "queued") {
    trackingEvents.push("notification_queued");
  }
  if (notificationStatus === "provider_missing") {
    trackingEvents.push("notification_failed");
  }

  const badges = [
    channel,
    area,
    manualFollowUpRequired ? "handoff" : "ai_assisted",
    paymentStatus === "approved" ? "payment_approved" : null,
    paymentStatus === "pending" ? "payment_pending" : null
  ].filter(Boolean) as string[];

  return {
    entryPoint: input.entryPoint,
    channel,
    legalArea: area,
    topic,
    source: {
      channel,
      campaign: input.campaign || null,
      entryPoint: input.entryPoint
    },
    lead: {
      status: leadStatus,
      label: FUNNEL_STATUS_LABELS.lead[leadStatus]
    },
    conversation: {
      status: conversationStatus,
      label: FUNNEL_STATUS_LABELS.conversation[conversationStatus],
      requiresHuman: manualFollowUpRequired,
      reasonCodes: compliance.reasonCodes,
      safeSummary: buildSafeSummary(input, area, topic)
    },
    inbox: {
      appearsInInbox: true,
      priority: compliance.riskLevel === "critical" || manualFollowUpRequired ? "high" : "medium",
      nextAction: manualFollowUpRequired
        ? isPublicComment && !outboundConfigured
          ? "Chamar no privado ou WhatsApp, registrar follow-up manual e preservar contexto."
          : "Assumir atendimento humano, revisar contexto e definir proximo passo."
        : consultationOffered
          ? "Confirmar interesse, horario e pagamento da consulta."
          : "Continuar triagem com coleta minima e CTA responsavel.",
      badges
    },
    consultation: {
      status: consultationStatus,
      label: FUNNEL_STATUS_LABELS.consultation[consultationStatus],
      manualSchedulingRequired: consultationOffered && !consultationScheduled
    },
    payment: {
      status: paymentStatus,
      label: FUNNEL_STATUS_LABELS.payment[paymentStatus],
      providerStatus: consultationOffered
        ? paymentProviderConfigured
          ? "ready"
          : "provider_missing"
        : "manual_check_required",
      linkedToLead: paymentStatus !== "not_created",
      linkedToConsultation: paymentStatus !== "not_created" && consultationOffered
    },
    portal: {
      status: portalStatus,
      label: FUNNEL_STATUS_LABELS.portal[portalStatus],
      nextStep:
        portalStatus === "needs_manual_setup"
          ? "Criar acesso do cliente no portal e registrar proximo passo."
          : portalStatus === "ready"
            ? "Exibir boas-vindas, consulta, pagamento e documentos iniciais."
            : "Aguardar conversao ou convite para liberar portal."
    },
    notification: {
      status: notificationStatus,
      label: FUNNEL_STATUS_LABELS.notification[notificationStatus]
    },
    trackingEvents: Array.from(new Set(trackingEvents))
  };
}
