import { z } from "zod";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export const portalRoles = ["admin", "advogada", "cliente"] as const;
export const caseAreas = [
  "previdenciario",
  "consumidor_bancario",
  "familia",
  "civil"
] as const;
export const clientStatuses = [
  "triagem",
  "convite-enviado",
  "aguardando-primeiro-acesso",
  "ativo",
  "aguardando-documentos",
  "em-acompanhamento",
  "encerrado"
] as const;
export const caseStatuses = [
  "triagem",
  "documentos",
  "analise",
  "em-andamento",
  "aguardando-retorno",
  "concluido"
] as const;
export const casePriorities = ["baixa", "normal", "alta", "urgente"] as const;
export const publicIntakeUrgencies = ["baixa", "moderada", "alta", "urgente"] as const;
export const publicIntakeStages = [
  "ainda-nao-iniciei",
  "ja-estou-em-atendimento",
  "tenho-prazo-proximo",
  "recebi-negativa-ou-cobranca"
] as const;
export const publicContactPeriods = [
  "manha",
  "tarde",
  "noite",
  "horario-comercial"
] as const;
export const intakeRequestStatuses = [
  "new",
  "in_review",
  "contacted",
  "converted",
  "closed"
] as const;
export const portalEventTypes = [
  "case_update",
  "new_document",
  "new_appointment",
  "document_request",
  "status_change"
] as const;
export const appointmentLifecycleEventTypes = [
  "appointment_updated",
  "appointment_rescheduled",
  "appointment_cancelled"
] as const;
export const documentStatuses = [
  "recebido",
  "pendente",
  "solicitado",
  "revisado"
] as const;
export const documentRequestStatuses = ["pending", "completed", "cancelled"] as const;
export const notificationChannels = ["email", "whatsapp", "noemia"] as const;
export const clientTiers = ["novo-cliente", "em-andamento", "pendencia", "vip"] as const;
export const notificationStatuses = [
  "pending",
  "processing",
  "sent",
  "failed",
  "skipped"
] as const;
export const documentVisibility = ["client", "internal"] as const;
export const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;
export const allowedDocumentExtensions = [
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif"
] as const;
export const documentPreviewMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;
export const documentUploadAccept =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif";
export const maxDocumentFileSizeBytes = 20 * 1024 * 1024;
export const appointmentStatuses = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled"
] as const;
export const appointmentTypes = [
  "reuniao",
  "retorno",
  "prazo",
  "audiencia",
  "ligacao"
] as const;
export const appointmentChangeTypes = [
  "created",
  "updated",
  "rescheduled",
  "cancelled"
] as const;
export const noemiaAudiences = ["visitor", "client", "staff"] as const;

export type PortalRole = (typeof portalRoles)[number];
export type CaseArea = (typeof caseAreas)[number];
export type ClientStatus = (typeof clientStatuses)[number];
export type CaseStatus = (typeof caseStatuses)[number];
export type CasePriority = (typeof casePriorities)[number];
export type PublicIntakeUrgency = (typeof publicIntakeUrgencies)[number];
export type PublicIntakeStage = (typeof publicIntakeStages)[number];
export type PublicContactPeriod = (typeof publicContactPeriods)[number];
export type IntakeRequestStatus = (typeof intakeRequestStatuses)[number];
export type PortalEventType = (typeof portalEventTypes)[number];
export type AppointmentLifecycleEventType = (typeof appointmentLifecycleEventTypes)[number];
export type AnyCaseEventType = PortalEventType | AppointmentLifecycleEventType;
export type DocumentStatus = (typeof documentStatuses)[number];
export type DocumentRequestStatus = (typeof documentRequestStatuses)[number];
export type AppointmentType = (typeof appointmentTypes)[number];
export type AppointmentChangeType = (typeof appointmentChangeTypes)[number];
export type NoemiaAudience = (typeof noemiaAudiences)[number];
export type NotificationChannel = (typeof notificationChannels)[number];
export type ClientTier = (typeof clientTiers)[number];

export function isPortalRole(value: unknown): value is PortalRole {
  return typeof value === "string" && portalRoles.includes(value as PortalRole);
}

export const caseAreaLabels: Record<CaseArea, string> = {
  previdenciario: "Direito Previdenciario",
  consumidor_bancario: "Direito do Consumidor/Bancario",
  familia: "Direito de Familia",
  civil: "Direito Civil"
};

export const clientStatusLabels: Record<ClientStatus, string> = {
  triagem: "Triagem",
  "convite-enviado": "Convite enviado",
  "aguardando-primeiro-acesso": "Aguardando primeiro acesso",
  ativo: "Ativo",
  "aguardando-documentos": "Aguardando documentos",
  "em-acompanhamento": "Em acompanhamento",
  encerrado: "Encerrado"
};

export const caseStatusLabels: Record<CaseStatus, string> = {
  triagem: "Triagem",
  documentos: "Documentos",
  analise: "Analise",
  "em-andamento": "Em andamento",
  "aguardando-retorno": "Aguardando retorno",
  concluido: "Concluido"
};
export const casePriorityLabels: Record<CasePriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente"
};
export const publicIntakeUrgencyLabels: Record<PublicIntakeUrgency, string> = {
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  urgente: "Urgente"
};
export const publicIntakeStageLabels: Record<PublicIntakeStage, string> = {
  "ainda-nao-iniciei": "Ainda nao iniciei o atendimento",
  "ja-estou-em-atendimento": "Ja estou em atendimento ou processo",
  "tenho-prazo-proximo": "Tenho prazo, audiencia ou retorno proximo",
  "recebi-negativa-ou-cobranca": "Recebi negativa, cobranca ou resposta recente"
};
export const publicContactPeriodLabels: Record<PublicContactPeriod, string> = {
  manha: "Manha",
  tarde: "Tarde",
  noite: "Noite",
  "horario-comercial": "Horario comercial"
};
export const intakeRequestStatusLabels: Record<IntakeRequestStatus, string> = {
  new: "Nova",
  in_review: "Em analise",
  contacted: "Contato realizado",
  converted: "Convertida",
  closed: "Encerrada"
};

export const portalEventTypeLabels: Record<PortalEventType, string> = {
  case_update: "Atualizacao do caso",
  new_document: "Novo documento",
  new_appointment: "Compromisso criado",
  document_request: "Solicitacao de documento",
  status_change: "Mudanca de status"
};
export const appointmentLifecycleEventLabels: Record<AppointmentLifecycleEventType, string> = {
  appointment_updated: "Compromisso atualizado",
  appointment_rescheduled: "Compromisso reagendado",
  appointment_cancelled: "Compromisso cancelado"
};
export const caseEventTypeLabels: Record<AnyCaseEventType, string> = {
  ...portalEventTypeLabels,
  ...appointmentLifecycleEventLabels
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  recebido: "Recebido",
  pendente: "Pendente",
  solicitado: "Solicitado",
  revisado: "Revisado"
};

export const documentRequestStatusLabels: Record<DocumentRequestStatus, string> = {
  pending: "Aberta",
  completed: "Concluida",
  cancelled: "Cancelada"
};

export const appointmentStatusLabels: Record<(typeof appointmentStatuses)[number], string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluido",
  cancelled: "Cancelado"
};

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  reuniao: "Reuniao",
  retorno: "Retorno",
  prazo: "Prazo",
  audiencia: "Audiencia",
  ligacao: "Ligacao"
};
export const appointmentChangeLabels: Record<AppointmentChangeType, string> = {
  created: "Criado",
  updated: "Editado",
  rescheduled: "Reagendado",
  cancelled: "Cancelado"
};

export function formatPortalDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const createClientSchema = z.object({
  intakeRequestId: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || /^[0-9a-fA-F-]{36}$/.test(value), {
      message: "Informe uma triagem valida para vincular ao cliente."
    }),
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
  cpf: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((value) => value.length === 11, "Informe um CPF com 11 digitos."),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine(
      (value) => value.length >= 10 && value.length <= 11,
      "Informe um telefone com DDD."
    ),
  caseArea: z.enum(caseAreas, {
    errorMap: () => ({ message: "Selecione a area do caso." })
  }),
  notes: z.string().trim().max(1200).optional().default(""),
  status: z.enum(clientStatuses, {
    errorMap: () => ({ message: "Selecione o status inicial do cliente." })
  })
});

export const updateClientSchema = z.object({
  clientId: z.string().uuid("Informe um identificador de cliente valido."),
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
  cpf: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((value) => value.length === 11, "Informe um CPF com 11 digitos."),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine(
      (value) => value.length >= 10 && value.length <= 11,
      "Informe um telefone com DDD."
    ),
  status: z.enum(clientStatuses, {
    errorMap: () => ({ message: "Selecione um status valido para o cliente." })
  }),
  notes: z.string().trim().max(1200).optional().default(""),
  isActive: z.coerce.boolean().default(true)
});

export const submitPublicTriageSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo."),
  email: z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine(
      (value) => value.length >= 10 && value.length <= 11,
      "Informe um telefone com DDD."
    ),
  city: z.string().trim().max(120).optional().default(""),
  caseArea: z.enum(caseAreas, {
    errorMap: () => ({ message: "Selecione a area principal do atendimento." })
  }),
  currentStage: z.enum(publicIntakeStages, {
    errorMap: () => ({ message: "Selecione o momento atual do seu caso." })
  }),
  urgencyLevel: z.enum(publicIntakeUrgencies, {
    errorMap: () => ({ message: "Selecione o nivel de urgencia." })
  }),
  preferredContactPeriod: z.enum(publicContactPeriods, {
    errorMap: () => ({ message: "Selecione o melhor horario para contato." })
  }),
  caseSummary: z
    .string()
    .trim()
    .min(30, "Descreva em poucas linhas o que aconteceu e o que voce precisa.")
    .max(2000, "Resuma o contexto em ate 2000 caracteres."),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: "Confirme a autorizacao para envio da triagem." })
  }),
  sourcePath: z.string().trim().max(300).optional().default("/triagem"),
  website: z.string().trim().max(0).optional().default(""),
  captureMetadata: z
    .object({
      source: z.string().trim().max(120).optional().default(""),
      page: z.string().trim().max(300).optional().default(""),
      theme: z.string().trim().max(120).optional().default(""),
      campaign: z.string().trim().max(120).optional().default(""),
      video: z.string().trim().max(120).optional().default("")
    })
    .optional()
});

export const submitLegacySiteTriageSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo."),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine(
      (value) => value.length >= 10 && value.length <= 11,
      "Informe um telefone com DDD."
    ),
  city: z.string().trim().min(2, "Informe sua cidade.").max(120),
  problem_type: z
    .string()
    .trim()
    .min(2, "Selecione o tipo de problema.")
    .max(120),
  description: z
    .string()
    .trim()
    .min(20, "Descreva em poucas linhas o que aconteceu e o que voce precisa.")
    .max(2000, "Resuma o contexto em ate 2000 caracteres."),
  urgency: z.string().trim().min(3, "Selecione a urgencia.").max(80),
  area: z.string().trim().max(120).optional().default("geral"),
  source: z.string().trim().max(120).optional().default("site"),
  page: z.string().trim().max(300).optional().default("triagem.html"),
  theme: z.string().trim().max(120).optional().default(""),
  campaign: z.string().trim().max(120).optional().default(""),
  video: z.string().trim().max(120).optional().default(""),
  sourcePath: z.string().trim().max(300).optional().default("/triagem.html"),
  website: z.string().trim().max(0).optional().default("")
});

export const recordProductEventSchema = z.object({
  eventKey: z.string().trim().min(3).max(120),
  eventGroup: z.string().trim().min(3).max(80).optional().default("conversion"),
  pagePath: z.string().trim().max(300).optional().default(""),
  sessionId: z.string().trim().max(120).optional().default(""),
  intakeRequestId: z.string().uuid().optional(),
  payload: z.record(z.any()).optional().default({})
});

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
  password: z.string().min(8, "Informe sua senha.")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe o e-mail cadastrado.").toLowerCase()
});

export const passwordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais."
  });

export const recordPortalEventSchema = z.object({
  caseId: z.string().uuid("Informe um identificador de caso valido."),
  eventType: z.enum(portalEventTypes, {
    errorMap: () => ({ message: "Selecione o tipo de atualizacao." })
  }),
  title: z.string().trim().min(3, "Informe um titulo para a atualizacao."),
  description: z.string().trim().max(2000).optional().default(""),
  publicSummary: z.string().trim().max(500).optional().default(""),
  occurredAt: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
      message: "Informe uma data valida para a atualizacao."
    }),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true),
  payload: z.record(z.any()).optional().default({})
});

export const registerCaseDocumentSchema = z.object({
  caseId: z.string().uuid("Informe um identificador de caso valido."),
  requestId: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || /^[0-9a-fA-F-]{36}$/.test(value), {
      message: "Informe uma solicitacao valida para concluir."
    }),
  fileName: z.string().trim().optional().default(""),
  category: z.string().trim().min(2, "Informe o tipo do documento.").max(120),
  description: z.string().trim().max(500).optional().default(""),
  status: z.enum(documentStatuses, {
    errorMap: () => ({ message: "Selecione o status do documento." })
  }),
  documentDate: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
      message: "Informe uma data valida para o documento."
    }),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const requestCaseDocumentSchema = z.object({
  caseId: z.string().uuid("Informe um identificador de caso valido."),
  title: z.string().trim().min(3, "Informe o nome do documento solicitado."),
  instructions: z.string().trim().max(1000).optional().default(""),
  dueAt: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
      message: "Informe uma data limite valida."
    }),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const updateCaseStatusSchema = z.object({
  caseId: z.string().uuid("Informe um identificador de caso valido."),
  status: z.enum(caseStatuses, {
    errorMap: () => ({ message: "Selecione o novo status do caso." })
  }),
  internalNote: z.string().trim().max(1000).optional().default(""),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const createCaseSchema = z.object({
  clientId: z.string().uuid("Informe um identificador de cliente valido."),
  area: z.enum(caseAreas, {
    errorMap: () => ({ message: "Selecione a area do caso." })
  }),
  title: z.string().trim().min(3, "Informe o titulo do caso.").max(160),
  summary: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(casePriorities, {
    errorMap: () => ({ message: "Selecione a prioridade do caso." })
  }),
  status: z.enum(caseStatuses, {
    errorMap: () => ({ message: "Selecione o status inicial do caso." })
  }),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const updateCaseDetailsSchema = z.object({
  caseId: z.string().uuid("Informe um identificador de caso valido."),
  area: z.enum(caseAreas, {
    errorMap: () => ({ message: "Selecione a area do caso." })
  }),
  title: z.string().trim().min(3, "Informe o titulo do caso.").max(160),
  summary: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(casePriorities, {
    errorMap: () => ({ message: "Selecione a prioridade do caso." })
  }),
  changeSummary: z.string().trim().max(1000).optional().default(""),
  visibleToClient: z.coerce.boolean().default(false),
  shouldNotifyClient: z.coerce.boolean().default(false)
});

export const registerCaseAppointmentSchema = z.object({
  caseId: z.string().uuid("Informe um identificador de caso valido."),
  title: z.string().trim().min(3, "Informe o titulo do compromisso."),
  appointmentType: z.enum(appointmentTypes, {
    errorMap: () => ({ message: "Selecione o tipo de compromisso." })
  }),
  description: z.string().trim().max(1000).optional().default(""),
  startsAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Informe uma data e hora validas."
    }),
  status: z.enum(appointmentStatuses, {
    errorMap: () => ({ message: "Selecione o status do compromisso." })
  }),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const updateCaseAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Informe um identificador de compromisso valido."),
  title: z.string().trim().min(3, "Informe o titulo do compromisso."),
  appointmentType: z.enum(appointmentTypes, {
    errorMap: () => ({ message: "Selecione o tipo de compromisso." })
  }),
  description: z.string().trim().max(1000).optional().default(""),
  startsAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Informe uma data e hora validas."
    }),
  status: z.enum(appointmentStatuses, {
    errorMap: () => ({ message: "Selecione o status do compromisso." })
  }),
  visibleToClient: z.coerce.boolean().default(true),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const cancelCaseAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Informe um identificador de compromisso valido."),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const updateDocumentRequestStatusSchema = z.object({
  requestId: z.string().uuid("Informe um identificador de solicitacao valido."),
  status: z.enum(documentRequestStatuses, {
    errorMap: () => ({ message: "Selecione o novo status da solicitacao." })
  }),
  shouldNotifyClient: z.coerce.boolean().default(true)
});

export const updateIntakeRequestStatusSchema = z.object({
  intakeRequestId: z.string().uuid("Informe uma triagem valida."),
  status: z.enum(intakeRequestStatuses, {
    errorMap: () => ({ message: "Selecione um status valido para a triagem." })
  }),
  internalNotes: z.string().trim().max(1200).optional().default("")
});

export const askNoemiaSchema = z.object({
  audience: z.enum(noemiaAudiences).default("visitor"),
  currentPath: z.string().trim().max(300).optional().default(""),
  message: z
    .string()
    .trim()
    .min(5, "Escreva uma pergunta com pelo menos 5 caracteres.")
    .max(2000, "A pergunta precisa ter no maximo 2000 caracteres."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(3000)
      })
    )
    .max(10)
    .optional()
    .default([])
});

export function mapClientStatusToCaseStatus(status: ClientStatus): CaseStatus {
  switch (status) {
    case "triagem":
      return "triagem";
    case "convite-enviado":
    case "aguardando-primeiro-acesso":
    case "aguardando-documentos":
      return "documentos";
    case "ativo":
    case "em-acompanhamento":
      return "em-andamento";
    case "encerrado":
      return "concluido";
    default:
      return "analise";
  }
}
