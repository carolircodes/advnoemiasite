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

export type PortalRole = (typeof portalRoles)[number];
export type CaseArea = (typeof caseAreas)[number];
export type ClientStatus = (typeof clientStatuses)[number];
export type CaseStatus = (typeof caseStatuses)[number];
export type PortalEventType = (typeof portalEventTypes)[number];

export const caseAreaLabels: Record<CaseArea, string> = {
  previdenciario: "Direito Previdenciário",
  consumidor_bancario: "Direito do Consumidor/Bancário",
  familia: "Direito de Família",
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

export const portalEventTypeLabels: Record<PortalEventType, string> = {
  case_update: "Atualização do caso",
  new_document: "Novo documento",
  new_appointment: "Novo agendamento",
  document_request: "Solicitação de documento",
  status_change: "Mudança de status"
};

export const createClientSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
  cpf: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((value) => value.length === 11, "Informe um CPF com 11 dígitos."),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine(
      (value) => value.length >= 10 && value.length <= 11,
      "Informe um telefone com DDD."
    ),
  caseArea: z.enum(caseAreas, {
    errorMap: () => ({ message: "Selecione a área do caso." })
  }),
  notes: z.string().trim().max(1200).optional().default(""),
  status: z.enum(clientStatuses, {
    errorMap: () => ({ message: "Selecione o status inicial do cliente." })
  })
});

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
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
  caseId: z.string().uuid("Informe um identificador de caso válido."),
  eventType: z.enum(portalEventTypes, {
    errorMap: () => ({ message: "Selecione o tipo de evento." })
  }),
  title: z.string().trim().min(3, "Informe um título para o evento."),
  description: z.string().trim().max(2000).optional().default(""),
  publicSummary: z.string().trim().max(500).optional().default(""),
  shouldNotifyClient: z.coerce.boolean().default(true),
  payload: z.record(z.any()).optional().default({})
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

