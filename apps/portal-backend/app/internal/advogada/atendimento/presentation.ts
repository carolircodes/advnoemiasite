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
  ai: "IA",
  human: "Humano",
  hybrid: "Operação híbrida",
  ai_active: "IA conduzindo",
  waiting_human: "Aguardando atuação humana",
  waiting_client: "Aguardando retorno do cliente",
  waiting_office: "Aguardando escritório",
  handoff: "Em transição",
  active: "Ativo",
  resolved: "Resolvido",
  closed: "Encerrado",
  archived: "Arquivado",
  none: "Sem pendência",
  due: "Para hoje",
  overdue: "Vencido",
  pending: "Pendente",
  converted: "Convertido",
  dm: "Mensagem direta",
  comment: "Comentário público",
  comment_to_dm: "Comentário convertido em conversa",
  site_chat: "Site",
  telegram_private: "Telegram privado",
  telegram_group: "Telegram grupo",
  direct_message: "Mensagem direta",
  public_comment: "Comentário público",
  inbound: "Recebida",
  outbound: "Enviada",
  contact: "Contato",
  system: "Sistema",
  operational: "Operacional",
  next_action: "Próxima ação",
  context: "Contexto",
  sensitive: "Sensível",
  cold: "Baixa prontidão",
  warm: "Em amadurecimento",
  hot: "Quente",
  monitor: "Monitorar",
  closing: "Em fechamento",
  clarifying: "Esclarecimento em curso",
  advanced_triage: "Triagem avançada",
  almost_ready: "Quase pronto para consulta",
  ready_for_consultation: "Pronto para consulta",
  blocked_by_objection: "Travado por objeção",
  blocked_by_silence: "Travado por silêncio",
  blocked_by_missing_context: "Travado por contexto insuficiente",
  new_contact: "Novo contato",
  in_welcome: "Boas-vindas",
  in_triage: "Triagem em andamento",
  in_qualification: "Qualificação comercial",
  consultation_ready: "Pronto para consulta",
  proposal_in_motion: "Proposta em andamento",
  awaiting_decision: "Aguardando decisão",
  converted_to_consultation: "Consulta convertida",
  cooled_down: "Esfriou",
  lost: "Perdido",
  reactivable: "Reativável",
  missing_context: "Contexto insuficiente",
  missing_documents: "Documentação pendente",
  objection_value: "Sensibilidade a valor",
  objection_viability: "Dúvida de viabilidade",
  objection_insecurity: "Insegurança",
  lead_silent: "Lead silencioso",
  diffuse_interest: "Interesse difuso",
  urgency_without_structure: "Urgência sem estrutura",
  value: "Objeção de valor",
  viability: "Objeção de viabilidade",
  insecurity: "Objeção por insegurança",
  timing: "Timing inadequado",
  silent: "Silêncio do lead",
  hold: "Manter em preparo",
  prepare: "Preparar avanço",
  recommend_now: "Recomendar agora",
  not_offered: "Proposta ainda não apresentada",
  not_started: "Ainda não iniciado",
  open: "Em aberto",
  approved: "Aprovado",
  failed: "Falhou",
  expired: "Expirado",
  abandoned: "Abandonado",
  not_created: "Ainda não criado",
  private: "Privado",
  group: "Grupo",
  channel: "Canal",
  unknown: "Não classificado",
  founder: "Founder",
  waitlist: "Waitlist"
};

export function presentToken(value: string | null | undefined, fallback = "Sem leitura") {
  const normalized = normalizeToken(value);

  if (!normalized) {
    return fallback;
  }

  return tokenLabels[normalized] || titleize(normalized);
}

export function presentBoolean(value: boolean, yes = "Sim", no = "Não") {
  return value ? yes : no;
}

export function presentMaybeId(value: string | null | undefined, fallback = "Sem vínculo") {
  if (!value) {
    return fallback;
  }

  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function presentChannelOrigin(value: string | null | undefined, fallback = "Origem não identificada") {
  return presentToken(value, fallback);
}
