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
export const portalEventTypes = [
  "case_update",
  "new_document",
  "new_appointment",
  "document_request",
  "status_change"
] as const;
export const documentStatuses = [
  "recebido",
  "pendente",
  "solicitado",
  "revisado"
] as const;
export const documentRequestStatuses = ["pending", "completed", "cancelled"] as const;
export const notificationChannels = ["email"] as const;
export const notificationStatuses = [
  "pending",
  "processing",
  "sent",
  "failed",
  "skipped"
] as const;
export const documentVisibility = ["client", "internal"] as const;
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

export type PortalRole = (typeof portalRoles)[number];
export type CaseArea = (typeof caseAreas)[number];
export type ClientStatus = (typeof clientStatuses)[number];
export type CaseStatus = (typeof caseStatuses)[number];
export type PortalEventType = (typeof portalEventTypes)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type DocumentRequestStatus = (typeof documentRequestStatuses)[number];
export type AppointmentType = (typeof appointmentTypes)[number];

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

export const portalEventTypeLabels: Record<PortalEventType, string> = {
  case_update: "Atualizacao do caso",
  new_document: "Novo documento",
  new_appointment: "Novo agendamento",
  document_request: "Solicitacao de documento",
  status_change: "Mudanca de status"
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

export const createClientSchema = z.object({
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
  fileName: z.string().trim().min(3, "Informe o nome do documento."),
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
