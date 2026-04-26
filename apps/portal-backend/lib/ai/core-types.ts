import type { PortalProfile } from "../auth/guards.ts";

export type NoemiaChannel =
  | "site"
  | "portal"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "telegram";
export type NoemiaUserType = "visitor" | "client" | "staff" | "unknown";
export type NoemiaDomain =
  | "public_site_chat"
  | "portal_support"
  | "commercial_conversion"
  | "internal_operational"
  | "channel_comment";
export type NoemiaPolicyMode = "public" | "commercial" | "internal" | "channel_automation";

export type LegalTheme =
  | "previdenciario"
  | "bancario"
  | "familia"
  | "civil"
  | "geral";

export type ClassifiedIntent =
  | "curiosity"
  | "lead_interest"
  | "support"
  | "appointment_interest";

export type LeadTemperature = "cold" | "warm" | "hot";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";
export type RecommendedAction =
  | "continue_triage"
  | "schedule_consultation"
  | "human_handoff"
  | "send_info";

export type AcquisitionContext = {
  source?: string;
  campaign?: string;
  topic?: string;
  content_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ai_context?: string;
  language_adaptation?: string;
};

export type NoemiaContext = {
  acquisition?: AcquisitionContext;
  page?: Record<string, unknown>;
  journey?: Record<string, unknown>;
  relationship?: Record<string, unknown>;
  [key: string]: unknown;
};

export type NoemiaPromptContextSummary = {
  domain: NoemiaDomain;
  channel: NoemiaChannel;
  audience: NoemiaUserType;
  sections: string[];
  inputKeys: string[];
  hasAcquisitionContext: boolean;
  hasClientContext: boolean;
  hasPageContext: boolean;
  hasJourneyContext: boolean;
};

export type FollowUpTrigger =
  | "inactivity"
  | "post_handoff"
  | "consultation_proposed"
  | "follow_up_needed";

export type FollowUpPriority = "immediate" | "high" | "medium" | "low";

export type FollowUpCadence = {
  minutes: number;
  hours: number;
  days: number;
};

export interface FollowUpRule {
  id: string;
  trigger: FollowUpTrigger;
  temperature: LeadTemperature;
  commercialStatus?: string;
  cadence: FollowUpCadence;
  maxAttempts: number;
  priority: FollowUpPriority;
}

export interface FollowUpAttempt {
  id: string;
  sessionId: string;
  attemptNumber: number;
  trigger: FollowUpTrigger;
  message: string;
  sentAt: Date;
  responseReceived?: boolean;
  nextAttemptAt?: Date;
}

export type ConversationStep =
  | "acolhimento"
  | "identificacao_area"
  | "problema_principal"
  | "tempo_momento"
  | "documentos_provas"
  | "objetivo_cliente"
  | "avaliacao_urgencia"
  | "resumo_encaminhamento";

export interface CollectedData {
  area?: LegalTheme;
  problema_principal?: string;
  timeframe?: string;
  acontecendo_agora?: boolean;
  tem_documentos?: boolean;
  tipos_documentos?: string[];
  objetivo_cliente?: string;
  nivel_urgencia?: "baixa" | "media" | "alta";
  prejuizo_ativo?: boolean;
  detalhes?: string[];
  palavras_chave?: string[];
}

export interface ConversationState {
  currentStep: ConversationStep;
  collectedData: CollectedData;
  isHotLead: boolean;
  needsHumanAttention: boolean;
  triageCompleteness: number;
  leadTemperature: LeadTemperature;
  conversionScore: number;
  priorityLevel: PriorityLevel;
  recommendedAction: RecommendedAction;
  readyForHandoff: boolean;
  commercialMomentDetected: boolean;
  sessionId: string;
  handoffReason?: string;
  conversationStatus?:
    | "ai_active"
    | "triage_in_progress"
    | "explanation_in_progress"
    | "consultation_offer"
    | "scheduling_in_progress"
    | "scheduling_preference_captured"
    | "consultation_ready"
    | "lawyer_notified"
    | "handed_off_to_lawyer"
    | "human_followup_pending"
    | "closed"
    | "archived";
  triageStage?:
    | "not_started"
    | "collecting_context"
    | "area_identified"
    | "details_in_progress"
    | "urgency_assessed"
    | "completed";
  explanationStage?:
    | "not_started"
    | "understanding_case"
    | "clarifying_questions"
    | "guidance_shared"
    | "consultation_positioned";
  consultationStage?:
    | "not_offered"
    | "offered"
    | "interest_detected"
    | "collecting_availability"
    | "availability_collected"
    | "ready_for_lawyer"
    | "scheduled_pending_confirmation"
    | "forwarded_to_lawyer";
  lawyerNotificationGenerated?: boolean;
  lawyerNotificationState?: "not_notified" | "ready_to_notify" | "notified";
  contactPreferences?: {
    channel: "whatsapp" | "ligacao" | "consulta_online" | "email";
    period: "manha" | "tarde" | "noite" | "qualquer_horario";
    urgency: "hoje" | "esta_semana" | "proxima_semana" | "sem_urgencia";
    availability: string;
  };
  commercialStatus?:
    | "new_lead"
    | "triage_in_progress"
    | "qualified"
    | "awaiting_human_contact"
    | "human_contact_started"
    | "consultation_proposed"
    | "consultation_scheduled"
    | "follow_up_needed"
    | "converted"
    | "lost";
  aiActiveOnChannel?: boolean;
  operationalHandoffRecorded?: boolean;
  humanFollowUpPending?: boolean;
  followUpReady?: boolean;
  handoffReasonCode?: string;
  handoffPackage?: unknown;
}

export interface NoemiaCoreInput {
  channel: NoemiaChannel;
  userType: NoemiaUserType;
  domain?: NoemiaDomain;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: NoemiaContext;
  metadata?: Record<string, unknown>;
  profile?: PortalProfile | null;
  conversationState?: ConversationState;
}

export interface NoemiaCoreOutput {
  reply: string;
  intent?: string;
  audience: string;
  source: "openai" | "fallback" | "triage";
  actions?: Array<{ type: string; label: string; url?: string }>;
  usedFallback: boolean;
  error?: string | null;
  metadata: {
    responseTime: number;
    detectedTheme?: string;
    channel: NoemiaChannel;
    openaiUsed?: boolean;
    classification?: {
      theme: LegalTheme;
      intent: ClassifiedIntent;
      leadTemperature: LeadTemperature;
    };
    domain?: NoemiaDomain;
    policyMode?: NoemiaPolicyMode;
    promptVersion?: string;
    contextSummary?: NoemiaPromptContextSummary;
    sideEffects?: string[];
    conversationState?: ConversationState;
    noemiaCompliance?: {
      requiresHumanHandoff: boolean;
      riskLevel: "low" | "medium" | "high" | "critical";
      reasonCodes: string[];
      surface: "public_comment" | "private_conversation";
    };
  };
}

export interface CommentProcessingOutput {
  reply: string;
  shouldReplyPrivately: boolean;
  classification: {
    theme: LegalTheme;
    intent: ClassifiedIntent;
    leadTemperature: LeadTemperature;
  };
  metadata: {
    responseTime: number;
    channel: string;
    openaiUsed: boolean;
    domain?: NoemiaDomain;
    promptVersion?: string;
  };
}
