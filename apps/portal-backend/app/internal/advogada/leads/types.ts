// Tipos compartilhados para o sistema de leads

export interface Lead {
  id: string;
  platform_user_id: string;
  username: string | null;
  legal_area: "previdenciario" | "bancario" | "familia" | "geral";
  lead_status: "frio" | "curioso" | "interessado" | "quente" | "pronto_para_agendar" | "cliente_ativo" | "sem_aderencia";
  funnel_stage: "contato_inicial" | "qualificacao" | "triagem" | "interesse" | "agendamento" | "cliente";
  urgency: "baixa" | "media" | "alta";
  last_message: string;
  last_response: string;
  wants_human: boolean;
  should_schedule: boolean;
  summary: string;
  suggested_action: string;
  first_contact_at: string;
  last_contact_at: string;
  conversation_count: number;
  operational_status: "new" | "viewed" | "in_progress" | "scheduled" | "converted" | "closed";
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  platform_user_id: string;
  username: string | null;
  event_type: "message" | "comment" | "postback";
  user_text: string;
  ai_response: string;
  legal_area: string;
  lead_status: string;
  funnel_stage: string;
  urgency: string;
  created_at: string;
}

// Configurações de visual (compartilhadas)
export interface VisualConfig {
  label: string;
  color: string;
  bgColor: string;
}

export interface AreaConfig extends VisualConfig {
  icon: string;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon: string;
  trend?: { value: number; label: string };
}

export interface StatusBadgeProps {
  config: { label: string; color: string; bgColor: string };
}

export interface LeadTableRowProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
}

export interface PrioridadesProps {
  leads: Lead[];
}
