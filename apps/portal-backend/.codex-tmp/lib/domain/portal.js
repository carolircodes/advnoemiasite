"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.recordProductEventSchema = exports.submitLegacySiteTriageSchema = exports.submitPublicTriageSchema = exports.updateClientSchema = exports.createClientSchema = exports.appointmentChangeLabels = exports.appointmentTypeLabels = exports.appointmentStatusLabels = exports.documentRequestStatusLabels = exports.documentStatusLabels = exports.caseEventTypeLabels = exports.appointmentLifecycleEventLabels = exports.portalEventTypeLabels = exports.intakeRequestStatusLabels = exports.publicContactPeriodLabels = exports.publicIntakeStageLabels = exports.publicIntakeUrgencyLabels = exports.casePriorityLabels = exports.caseStatusLabels = exports.clientStatusLabels = exports.caseAreaLabels = exports.noemiaAudiences = exports.appointmentChangeTypes = exports.appointmentTypes = exports.appointmentStatuses = exports.maxDocumentFileSizeBytes = exports.documentUploadAccept = exports.documentPreviewMimeTypes = exports.allowedDocumentExtensions = exports.allowedDocumentMimeTypes = exports.documentVisibility = exports.notificationStatuses = exports.clientTiers = exports.notificationChannels = exports.documentRequestStatuses = exports.documentStatuses = exports.appointmentLifecycleEventTypes = exports.portalEventTypes = exports.intakeRequestStatuses = exports.publicContactPeriods = exports.publicIntakeStages = exports.publicIntakeUrgencies = exports.casePriorities = exports.caseStatuses = exports.clientStatuses = exports.caseAreas = exports.portalRoles = void 0;
exports.askNoemiaSchema = exports.updateIntakeRequestStatusSchema = exports.updateDocumentRequestStatusSchema = exports.cancelCaseAppointmentSchema = exports.updateCaseAppointmentSchema = exports.registerCaseAppointmentSchema = exports.updateCaseDetailsSchema = exports.createCaseSchema = exports.updateCaseStatusSchema = exports.requestCaseDocumentSchema = exports.registerCaseDocumentSchema = exports.recordPortalEventSchema = void 0;
exports.isPortalRole = isPortalRole;
exports.formatPortalDateTime = formatPortalDateTime;
exports.formatFileSize = formatFileSize;
exports.mapClientStatusToCaseStatus = mapClientStatusToCaseStatus;
const zod_1 = require("zod");
function onlyDigits(value) {
    return value.replace(/\D/g, "");
}
exports.portalRoles = ["admin", "advogada", "cliente"];
exports.caseAreas = [
    "previdenciario",
    "consumidor_bancario",
    "familia",
    "civil"
];
exports.clientStatuses = [
    "triagem",
    "convite-enviado",
    "aguardando-primeiro-acesso",
    "ativo",
    "aguardando-documentos",
    "em-acompanhamento",
    "encerrado"
];
exports.caseStatuses = [
    "triagem",
    "documentos",
    "analise",
    "em-andamento",
    "aguardando-retorno",
    "concluido"
];
exports.casePriorities = ["baixa", "normal", "alta", "urgente"];
exports.publicIntakeUrgencies = ["baixa", "moderada", "alta", "urgente"];
exports.publicIntakeStages = [
    "ainda-nao-iniciei",
    "ja-estou-em-atendimento",
    "tenho-prazo-proximo",
    "recebi-negativa-ou-cobranca"
];
exports.publicContactPeriods = [
    "manha",
    "tarde",
    "noite",
    "horario-comercial"
];
exports.intakeRequestStatuses = [
    "new",
    "in_review",
    "contacted",
    "converted",
    "closed"
];
exports.portalEventTypes = [
    "case_update",
    "new_document",
    "new_appointment",
    "document_request",
    "status_change"
];
exports.appointmentLifecycleEventTypes = [
    "appointment_updated",
    "appointment_rescheduled",
    "appointment_cancelled"
];
exports.documentStatuses = [
    "recebido",
    "pendente",
    "solicitado",
    "revisado"
];
exports.documentRequestStatuses = ["pending", "completed", "cancelled"];
exports.notificationChannels = ["email", "whatsapp", "noemia"];
exports.clientTiers = ["novo-cliente", "em-andamento", "pendencia", "vip"];
exports.notificationStatuses = [
    "pending",
    "processing",
    "sent",
    "failed",
    "skipped"
];
exports.documentVisibility = ["client", "internal"];
exports.allowedDocumentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];
exports.allowedDocumentExtensions = [
    "pdf",
    "doc",
    "docx",
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif"
];
exports.documentPreviewMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];
exports.documentUploadAccept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif";
exports.maxDocumentFileSizeBytes = 20 * 1024 * 1024;
exports.appointmentStatuses = [
    "scheduled",
    "confirmed",
    "completed",
    "cancelled"
];
exports.appointmentTypes = [
    "reuniao",
    "retorno",
    "prazo",
    "audiencia",
    "ligacao"
];
exports.appointmentChangeTypes = [
    "created",
    "updated",
    "rescheduled",
    "cancelled"
];
exports.noemiaAudiences = ["visitor", "client", "staff"];
function isPortalRole(value) {
    return typeof value === "string" && exports.portalRoles.includes(value);
}
exports.caseAreaLabels = {
    previdenciario: "Direito Previdenciario",
    consumidor_bancario: "Direito do Consumidor/Bancario",
    familia: "Direito de Familia",
    civil: "Direito Civil"
};
exports.clientStatusLabels = {
    triagem: "Triagem",
    "convite-enviado": "Convite enviado",
    "aguardando-primeiro-acesso": "Aguardando primeiro acesso",
    ativo: "Ativo",
    "aguardando-documentos": "Aguardando documentos",
    "em-acompanhamento": "Em acompanhamento",
    encerrado: "Encerrado"
};
exports.caseStatusLabels = {
    triagem: "Triagem",
    documentos: "Documentos",
    analise: "Analise",
    "em-andamento": "Em andamento",
    "aguardando-retorno": "Aguardando retorno",
    concluido: "Concluido"
};
exports.casePriorityLabels = {
    baixa: "Baixa",
    normal: "Normal",
    alta: "Alta",
    urgente: "Urgente"
};
exports.publicIntakeUrgencyLabels = {
    baixa: "Baixa",
    moderada: "Moderada",
    alta: "Alta",
    urgente: "Urgente"
};
exports.publicIntakeStageLabels = {
    "ainda-nao-iniciei": "Ainda nao iniciei o atendimento",
    "ja-estou-em-atendimento": "Ja estou em atendimento ou processo",
    "tenho-prazo-proximo": "Tenho prazo, audiencia ou retorno proximo",
    "recebi-negativa-ou-cobranca": "Recebi negativa, cobranca ou resposta recente"
};
exports.publicContactPeriodLabels = {
    manha: "Manha",
    tarde: "Tarde",
    noite: "Noite",
    "horario-comercial": "Horario comercial"
};
exports.intakeRequestStatusLabels = {
    new: "Nova",
    in_review: "Em analise",
    contacted: "Contato realizado",
    converted: "Convertida",
    closed: "Encerrada"
};
exports.portalEventTypeLabels = {
    case_update: "Atualizacao do caso",
    new_document: "Novo documento",
    new_appointment: "Compromisso criado",
    document_request: "Solicitacao de documento",
    status_change: "Mudanca de status"
};
exports.appointmentLifecycleEventLabels = {
    appointment_updated: "Compromisso atualizado",
    appointment_rescheduled: "Compromisso reagendado",
    appointment_cancelled: "Compromisso cancelado"
};
exports.caseEventTypeLabels = {
    ...exports.portalEventTypeLabels,
    ...exports.appointmentLifecycleEventLabels
};
exports.documentStatusLabels = {
    recebido: "Recebido",
    pendente: "Pendente",
    solicitado: "Solicitado",
    revisado: "Revisado"
};
exports.documentRequestStatusLabels = {
    pending: "Aberta",
    completed: "Concluida",
    cancelled: "Cancelada"
};
exports.appointmentStatusLabels = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado"
};
exports.appointmentTypeLabels = {
    reuniao: "Reuniao",
    retorno: "Retorno",
    prazo: "Prazo",
    audiencia: "Audiencia",
    ligacao: "Ligacao"
};
exports.appointmentChangeLabels = {
    created: "Criado",
    updated: "Editado",
    rescheduled: "Reagendado",
    cancelled: "Cancelado"
};
function formatPortalDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}
function formatFileSize(bytes) {
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
exports.createClientSchema = zod_1.z.object({
    intakeRequestId: zod_1.z
        .string()
        .trim()
        .optional()
        .default("")
        .refine((value) => value === "" || /^[0-9a-fA-F-]{36}$/.test(value), {
        message: "Informe uma triagem valida para vincular ao cliente."
    }),
    fullName: zod_1.z.string().trim().min(3, "Informe o nome completo."),
    email: zod_1.z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
    cpf: zod_1.z
        .string()
        .trim()
        .transform(onlyDigits)
        .refine((value) => value.length === 11, "Informe um CPF com 11 digitos."),
    phone: zod_1.z
        .string()
        .trim()
        .transform(onlyDigits)
        .refine((value) => value.length >= 10 && value.length <= 11, "Informe um telefone com DDD."),
    caseArea: zod_1.z.enum(exports.caseAreas, {
        errorMap: () => ({ message: "Selecione a area do caso." })
    }),
    notes: zod_1.z.string().trim().max(1200).optional().default(""),
    status: zod_1.z.enum(exports.clientStatuses, {
        errorMap: () => ({ message: "Selecione o status inicial do cliente." })
    })
});
exports.updateClientSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid("Informe um identificador de cliente valido."),
    fullName: zod_1.z.string().trim().min(3, "Informe o nome completo."),
    email: zod_1.z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
    cpf: zod_1.z
        .string()
        .trim()
        .transform(onlyDigits)
        .refine((value) => value.length === 11, "Informe um CPF com 11 digitos."),
    phone: zod_1.z
        .string()
        .trim()
        .transform(onlyDigits)
        .refine((value) => value.length >= 10 && value.length <= 11, "Informe um telefone com DDD."),
    status: zod_1.z.enum(exports.clientStatuses, {
        errorMap: () => ({ message: "Selecione um status valido para o cliente." })
    }),
    notes: zod_1.z.string().trim().max(1200).optional().default(""),
    isActive: zod_1.z.coerce.boolean().default(true)
});
exports.submitPublicTriageSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(3, "Informe seu nome completo."),
    email: zod_1.z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
    phone: zod_1.z
        .string()
        .trim()
        .transform(onlyDigits)
        .refine((value) => value.length >= 10 && value.length <= 11, "Informe um telefone com DDD."),
    city: zod_1.z.string().trim().max(120).optional().default(""),
    caseArea: zod_1.z.enum(exports.caseAreas, {
        errorMap: () => ({ message: "Selecione a area principal do atendimento." })
    }),
    currentStage: zod_1.z.enum(exports.publicIntakeStages, {
        errorMap: () => ({ message: "Selecione o momento atual do seu caso." })
    }),
    urgencyLevel: zod_1.z.enum(exports.publicIntakeUrgencies, {
        errorMap: () => ({ message: "Selecione o nivel de urgencia." })
    }),
    preferredContactPeriod: zod_1.z.enum(exports.publicContactPeriods, {
        errorMap: () => ({ message: "Selecione o melhor horario para contato." })
    }),
    caseSummary: zod_1.z
        .string()
        .trim()
        .min(30, "Descreva em poucas linhas o que aconteceu e o que voce precisa.")
        .max(2000, "Resuma o contexto em ate 2000 caracteres."),
    consentAccepted: zod_1.z.literal(true, {
        errorMap: () => ({ message: "Confirme a autorizacao para envio da triagem." })
    }),
    sourcePath: zod_1.z.string().trim().max(300).optional().default("/triagem"),
    website: zod_1.z.string().trim().max(0).optional().default(""),
    captureMetadata: zod_1.z
        .object({
        source: zod_1.z.string().trim().max(120).optional().default(""),
        page: zod_1.z.string().trim().max(300).optional().default(""),
        theme: zod_1.z.string().trim().max(120).optional().default(""),
        campaign: zod_1.z.string().trim().max(120).optional().default(""),
        video: zod_1.z.string().trim().max(120).optional().default("")
    })
        .optional()
});
exports.submitLegacySiteTriageSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, "Informe seu nome completo."),
    phone: zod_1.z
        .string()
        .trim()
        .transform(onlyDigits)
        .refine((value) => value.length >= 10 && value.length <= 11, "Informe um telefone com DDD."),
    city: zod_1.z.string().trim().min(2, "Informe sua cidade.").max(120),
    problem_type: zod_1.z
        .string()
        .trim()
        .min(2, "Selecione o tipo de problema.")
        .max(120),
    description: zod_1.z
        .string()
        .trim()
        .min(20, "Descreva em poucas linhas o que aconteceu e o que voce precisa.")
        .max(2000, "Resuma o contexto em ate 2000 caracteres."),
    urgency: zod_1.z.string().trim().min(3, "Selecione a urgencia.").max(80),
    area: zod_1.z.string().trim().max(120).optional().default("geral"),
    source: zod_1.z.string().trim().max(120).optional().default("site"),
    page: zod_1.z.string().trim().max(300).optional().default("triagem.html"),
    theme: zod_1.z.string().trim().max(120).optional().default(""),
    campaign: zod_1.z.string().trim().max(120).optional().default(""),
    video: zod_1.z.string().trim().max(120).optional().default(""),
    sourcePath: zod_1.z.string().trim().max(300).optional().default("/triagem.html"),
    website: zod_1.z.string().trim().max(0).optional().default("")
});
exports.recordProductEventSchema = zod_1.z.object({
    eventKey: zod_1.z.string().trim().min(3).max(120),
    eventGroup: zod_1.z.string().trim().min(3).max(80).optional().default("conversion"),
    pagePath: zod_1.z.string().trim().max(300).optional().default(""),
    sessionId: zod_1.z.string().trim().max(120).optional().default(""),
    intakeRequestId: zod_1.z.string().uuid().optional(),
    payload: zod_1.z.record(zod_1.z.any()).optional().default({})
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email("Informe um e-mail valido.").toLowerCase(),
    password: zod_1.z.string().min(8, "Informe sua senha.")
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email("Informe o e-mail cadastrado.").toLowerCase()
});
exports.passwordSchema = zod_1.z
    .object({
    password: zod_1.z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: zod_1.z.string().min(8, "Confirme a senha.")
})
    .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais."
});
exports.recordPortalEventSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid("Informe um identificador de caso valido."),
    eventType: zod_1.z.enum(exports.portalEventTypes, {
        errorMap: () => ({ message: "Selecione o tipo de atualizacao." })
    }),
    title: zod_1.z.string().trim().min(3, "Informe um titulo para a atualizacao."),
    description: zod_1.z.string().trim().max(2000).optional().default(""),
    publicSummary: zod_1.z.string().trim().max(500).optional().default(""),
    occurredAt: zod_1.z
        .string()
        .trim()
        .optional()
        .default("")
        .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
        message: "Informe uma data valida para a atualizacao."
    }),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true),
    payload: zod_1.z.record(zod_1.z.any()).optional().default({})
});
exports.registerCaseDocumentSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid("Informe um identificador de caso valido."),
    requestId: zod_1.z
        .string()
        .trim()
        .optional()
        .default("")
        .refine((value) => value === "" || /^[0-9a-fA-F-]{36}$/.test(value), {
        message: "Informe uma solicitacao valida para concluir."
    }),
    fileName: zod_1.z.string().trim().optional().default(""),
    category: zod_1.z.string().trim().min(2, "Informe o tipo do documento.").max(120),
    description: zod_1.z.string().trim().max(500).optional().default(""),
    status: zod_1.z.enum(exports.documentStatuses, {
        errorMap: () => ({ message: "Selecione o status do documento." })
    }),
    documentDate: zod_1.z
        .string()
        .trim()
        .optional()
        .default("")
        .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
        message: "Informe uma data valida para o documento."
    }),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.requestCaseDocumentSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid("Informe um identificador de caso valido."),
    title: zod_1.z.string().trim().min(3, "Informe o nome do documento solicitado."),
    instructions: zod_1.z.string().trim().max(1000).optional().default(""),
    dueAt: zod_1.z
        .string()
        .trim()
        .optional()
        .default("")
        .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
        message: "Informe uma data limite valida."
    }),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.updateCaseStatusSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid("Informe um identificador de caso valido."),
    status: zod_1.z.enum(exports.caseStatuses, {
        errorMap: () => ({ message: "Selecione o novo status do caso." })
    }),
    internalNote: zod_1.z.string().trim().max(1000).optional().default(""),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.createCaseSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid("Informe um identificador de cliente valido."),
    area: zod_1.z.enum(exports.caseAreas, {
        errorMap: () => ({ message: "Selecione a area do caso." })
    }),
    title: zod_1.z.string().trim().min(3, "Informe o titulo do caso.").max(160),
    summary: zod_1.z.string().trim().max(2000).optional().default(""),
    priority: zod_1.z.enum(exports.casePriorities, {
        errorMap: () => ({ message: "Selecione a prioridade do caso." })
    }),
    status: zod_1.z.enum(exports.caseStatuses, {
        errorMap: () => ({ message: "Selecione o status inicial do caso." })
    }),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.updateCaseDetailsSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid("Informe um identificador de caso valido."),
    area: zod_1.z.enum(exports.caseAreas, {
        errorMap: () => ({ message: "Selecione a area do caso." })
    }),
    title: zod_1.z.string().trim().min(3, "Informe o titulo do caso.").max(160),
    summary: zod_1.z.string().trim().max(2000).optional().default(""),
    priority: zod_1.z.enum(exports.casePriorities, {
        errorMap: () => ({ message: "Selecione a prioridade do caso." })
    }),
    changeSummary: zod_1.z.string().trim().max(1000).optional().default(""),
    visibleToClient: zod_1.z.coerce.boolean().default(false),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(false)
});
exports.registerCaseAppointmentSchema = zod_1.z.object({
    caseId: zod_1.z.string().uuid("Informe um identificador de caso valido."),
    title: zod_1.z.string().trim().min(3, "Informe o titulo do compromisso."),
    appointmentType: zod_1.z.enum(exports.appointmentTypes, {
        errorMap: () => ({ message: "Selecione o tipo de compromisso." })
    }),
    description: zod_1.z.string().trim().max(1000).optional().default(""),
    startsAt: zod_1.z
        .string()
        .trim()
        .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Informe uma data e hora validas."
    }),
    status: zod_1.z.enum(exports.appointmentStatuses, {
        errorMap: () => ({ message: "Selecione o status do compromisso." })
    }),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.updateCaseAppointmentSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid("Informe um identificador de compromisso valido."),
    title: zod_1.z.string().trim().min(3, "Informe o titulo do compromisso."),
    appointmentType: zod_1.z.enum(exports.appointmentTypes, {
        errorMap: () => ({ message: "Selecione o tipo de compromisso." })
    }),
    description: zod_1.z.string().trim().max(1000).optional().default(""),
    startsAt: zod_1.z
        .string()
        .trim()
        .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Informe uma data e hora validas."
    }),
    status: zod_1.z.enum(exports.appointmentStatuses, {
        errorMap: () => ({ message: "Selecione o status do compromisso." })
    }),
    visibleToClient: zod_1.z.coerce.boolean().default(true),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.cancelCaseAppointmentSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid("Informe um identificador de compromisso valido."),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.updateDocumentRequestStatusSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid("Informe um identificador de solicitacao valido."),
    status: zod_1.z.enum(exports.documentRequestStatuses, {
        errorMap: () => ({ message: "Selecione o novo status da solicitacao." })
    }),
    shouldNotifyClient: zod_1.z.coerce.boolean().default(true)
});
exports.updateIntakeRequestStatusSchema = zod_1.z.object({
    intakeRequestId: zod_1.z.string().uuid("Informe uma triagem valida."),
    status: zod_1.z.enum(exports.intakeRequestStatuses, {
        errorMap: () => ({ message: "Selecione um status valido para a triagem." })
    }),
    internalNotes: zod_1.z.string().trim().max(1200).optional().default("")
});
exports.askNoemiaSchema = zod_1.z.object({
    audience: zod_1.z.enum(exports.noemiaAudiences).default("visitor"),
    currentPath: zod_1.z.string().trim().max(300).optional().default(""),
    message: zod_1.z
        .string()
        .trim()
        .min(5, "Escreva uma pergunta com pelo menos 5 caracteres.")
        .max(2000, "A pergunta precisa ter no maximo 2000 caracteres."),
    sessionId: zod_1.z.string().trim().max(100).optional(),
    history: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(["user", "assistant"]),
        content: zod_1.z.string().trim().min(1).max(3000)
    }))
        .max(10)
        .optional()
        .default([])
});
function mapClientStatusToCaseStatus(status) {
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
