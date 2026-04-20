import {
  presentOperationalChannelLabel,
  presentOperationalSourceLabel
} from "@/lib/channels/channel-presentation";

function normalizeToken(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function titleize(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const tokenLabels: Record<string, string> = {
  high: "Alta prioridade",
  medium: "Prioridade moderada",
  low: "Baixa prioridade",
  new_lead: "Novo lead",
  engaged: "Engajado",
  warm_lead: "Lead em amadurecimento",
  hot_lead: "Lead aquecido",
  consultation_offered: "Consulta apresentada",
  consultation_scheduled: "Consulta agendada",
  proposal_sent: "Proposta enviada",
  contract_pending: "Contrato pendente",
  closed_lost: "Perda registrada",
  inactive: "Inativo",
  client: "Cliente ativo",
  ai: "IA",
  human: "Humano",
  hybrid: "Operacao hibrida",
  ai_active: "IA conduzindo",
  waiting_human: "Aguardando atuacao humana",
  waiting_client: "Aguardando retorno do cliente",
  waiting_team: "Aguardando equipe",
  waiting_office: "Aguardando escritorio",
  handoff: "Em transicao",
  active: "Ativo",
  resolved: "Resolvido",
  closed: "Encerrado",
  archived: "Arquivado",
  none: "Sem pendencia",
  due: "Para hoje",
  overdue: "Vencido",
  pending: "Pendente",
  needs_return: "Retomar contato",
  scheduled: "Agendado",
  completed: "Concluido",
  converted: "Convertido",
  dm: "Mensagem direta",
  comment: "Comentario publico",
  comment_to_dm: "Comentario convertido em conversa",
  site_chat: "Site",
  telegram_private: "Telegram privado",
  telegram_group: "Telegram grupo",
  direct_message: "Mensagem direta",
  public_comment: "Comentario publico",
  inbound: "Recebida",
  outbound: "Enviada",
  contact: "Contato",
  system: "Sistema",
  operational: "Operacional",
  next_action: "Proxima acao",
  context: "Contexto",
  sensitive: "Sensivel",
  cold: "Baixa prontidao",
  warm: "Em amadurecimento",
  hot: "Quente",
  monitor: "Monitorar",
  closing: "Em fechamento",
  clarifying: "Esclarecimento em curso",
  advanced_triage: "Triagem avancada",
  almost_ready: "Quase pronto para consulta",
  ready_for_consultation: "Pronto para consulta",
  blocked_by_objection: "Travado por objecao",
  blocked_by_silence: "Travado por silencio",
  blocked_by_missing_context: "Travado por contexto insuficiente",
  new_contact: "Novo contato",
  in_welcome: "Boas-vindas",
  in_triage: "Triagem em andamento",
  in_qualification: "Qualificacao comercial",
  consultation_ready: "Pronto para consulta",
  proposal_in_motion: "Proposta em andamento",
  awaiting_decision: "Aguardando decisao",
  converted_to_consultation: "Consulta convertida",
  cooled_down: "Esfriou",
  lost: "Perdido",
  reactivable: "Reativavel",
  missing_context: "Contexto insuficiente",
  missing_documents: "Documentacao pendente",
  objection_value: "Sensibilidade a valor",
  objection_viability: "Duvida de viabilidade",
  objection_insecurity: "Inseguranca",
  lead_silent: "Lead silencioso",
  diffuse_interest: "Interesse difuso",
  urgency_without_structure: "Urgencia sem estrutura",
  value: "Objecao de valor",
  viability: "Objecao de viabilidade",
  insecurity: "Objecao por inseguranca",
  timing: "Timing inadequado",
  silent: "Silencio do lead",
  hold: "Manter em preparo",
  prepare: "Preparar avanco",
  recommend_now: "Recomendar agora",
  offered: "Apresentada",
  interest_detected: "Interesse detectado",
  collecting_availability: "Coletando disponibilidade",
  availability_collected: "Disponibilidade coletada",
  ready_for_lawyer: "Pronto para a advogada",
  scheduled_pending_confirmation: "Agendado, aguardando confirmacao",
  forwarded_to_lawyer: "Encaminhado a advogada",
  not_offered: "Proposta ainda nao apresentada",
  not_started: "Ainda nao iniciado",
  open: "Em aberto",
  approved: "Aprovado",
  failed: "Falhou",
  expired: "Expirado",
  abandoned: "Abandonado",
  not_created: "Ainda nao criado",
  payment_in_progress: "Pagamento em andamento",
  scheduling_in_progress: "Agendamento em andamento",
  consultation_confirmed: "Consulta confirmada",
  consultation_recommended: "Consulta recomendada",
  under_review: "Em revisao",
  private: "Privado",
  group: "Grupo",
  channel: "Canal",
  unknown: "Nao classificado",
  founder: "Fundadora",
  waitlist: "Lista de espera",
  instagram: "Instagram Direct",
  facebook: "Facebook Messenger",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  site: "Site",
  portal: "Portal"
};

export function presentToken(value: string | null | undefined, fallback = "Sem leitura") {
  const normalized = normalizeToken(value);

  if (!normalized) {
    return fallback;
  }

  return tokenLabels[normalized] || titleize(normalized);
}

export function presentBoolean(value: boolean, yes = "Sim", no = "Nao") {
  return value ? yes : no;
}

export function presentMaybeId(value: string | null | undefined, fallback = "Sem vinculo") {
  if (!value) {
    return fallback;
  }

  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

export function presentChannelOrigin(value: string | null | undefined, fallback = "Origem nao identificada") {
  const sourceLabel = presentOperationalSourceLabel(value, "");

  if (sourceLabel) {
    return sourceLabel;
  }

  const channelLabel = presentOperationalChannelLabel(value, "");
  return channelLabel || presentToken(value, fallback);
}
