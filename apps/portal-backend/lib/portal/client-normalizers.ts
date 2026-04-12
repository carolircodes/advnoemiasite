import {
  appointmentStatusLabels,
  appointmentTypeLabels,
  caseEventTypeLabels,
  caseStatusLabels,
  documentRequestStatusLabels,
  documentStatusLabels,
  formatPortalDateTime,
  portalEventTypeLabels
} from "../domain/portal";

export function getClientDisplayName(fullName: string | null | undefined, email: string) {
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Cliente";
}

export function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function normalizeNullableText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function safeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

export function normalizeArray<T>(value: T[] | null | undefined) {
  return safeArray(value);
}

export function safeRecord<T extends Record<string, unknown>>(value: unknown, fallback: T): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }

  return fallback;
}

export function safeDate(value: unknown, fallback: string | null = null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toISOString();
}

export function safeEnumLabel<T extends Record<string, string>>(
  labels: T,
  value: unknown,
  fallback: string
) {
  if (typeof value !== "string") {
    return fallback;
  }

  return labels[value as keyof T] || value || fallback;
}

export function normalizeDateLabel(value: unknown, fallback = "Nao informado") {
  const safeValue = safeDate(value);

  if (!safeValue) {
    return fallback;
  }

  try {
    return formatPortalDateTime(safeValue);
  } catch {
    return fallback;
  }
}

export function normalizeCaseStatusLabel(value: unknown) {
  return safeEnumLabel(caseStatusLabels, value, "Sem status");
}

export function normalizeDocumentStatusLabel(value: unknown) {
  return safeEnumLabel(documentStatusLabels, value, "Sem status");
}

export function normalizeDocumentRequestStatusLabel(value: unknown) {
  return safeEnumLabel(documentRequestStatusLabels, value, "Sem status");
}

export function normalizeAppointmentStatusLabel(value: unknown) {
  return safeEnumLabel(appointmentStatusLabels, value, "Sem status");
}

export function normalizeAppointmentTypeLabel(value: unknown) {
  return safeEnumLabel(appointmentTypeLabels, value, "Compromisso");
}

export function normalizeEventLabel(value: unknown) {
  return (
    safeEnumLabel(caseEventTypeLabels, value, "") ||
    safeEnumLabel(portalEventTypeLabels, value, "Atualizacao")
  );
}

export function normalizeClientProfileSummary(profile: {
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  first_login_completed_at?: unknown;
  role?: unknown;
  is_active?: unknown;
}) {
  const email = normalizeText(profile.email, "Nao informado");
  const firstLoginCompletedAt = safeDate(profile.first_login_completed_at);

  return {
    displayName: getClientDisplayName(normalizeNullableText(profile.full_name), email),
    email,
    phoneLabel: normalizeText(profile.phone, "Nao informado"),
    firstLoginCompletedAt,
    firstLoginCompletedLabel: normalizeDateLabel(firstLoginCompletedAt),
    role: normalizeText(profile.role),
    isActive: profile.is_active !== false
  };
}

export function normalizeClientRecordSummary(record?: unknown) {
  const safeValue = safeRecord<Record<string, unknown>>(record, {});

  return {
    id: normalizeText(safeValue.id),
    status: normalizeText(safeValue.status, "indisponivel"),
    notes: normalizeText(safeValue.notes),
    created_at: safeDate(safeValue.created_at, new Date().toISOString()) || new Date().toISOString()
  };
}

export function normalizeClientCaseSummaryItem(caseItem?: unknown) {
  const safeValue = safeRecord<Record<string, unknown>>(caseItem, {});

  return {
    id: normalizeText(safeValue.id),
    title: normalizeText(safeValue.title, "Caso em acompanhamento"),
    area: normalizeNullableText(safeValue.area),
    status: normalizeText(safeValue.status, "analise"),
    created_at: safeDate(safeValue.created_at, new Date().toISOString()) || new Date().toISOString(),
    statusLabel: normalizeCaseStatusLabel(safeValue.status)
  };
}

export function normalizeClientDocumentSummaryItem(document?: unknown, caseTitle = "Caso") {
  const safeValue = safeRecord<Record<string, unknown>>(document, {});

  return {
    id: normalizeText(safeValue.id),
    case_id: normalizeText(safeValue.case_id),
    file_name: normalizeText(safeValue.file_name, "Documento sem titulo"),
    category: normalizeText(safeValue.category, "Documento"),
    description: normalizeText(safeValue.description),
    status: normalizeText(safeValue.status, "pendente"),
    statusLabel: normalizeDocumentStatusLabel(safeValue.status),
    visibility: normalizeText(safeValue.visibility, "client"),
    document_date:
      safeDate(safeValue.document_date || safeValue.created_at, new Date().toISOString()) ||
      new Date().toISOString(),
    created_at: safeDate(safeValue.created_at, new Date().toISOString()) || new Date().toISOString(),
    storage_path: normalizeNullableText(safeValue.storage_path),
    mime_type: normalizeNullableText(safeValue.mime_type),
    file_size_bytes:
      typeof safeValue.file_size_bytes === "number" ? safeValue.file_size_bytes : null,
    caseTitle: normalizeText(caseTitle, "Caso")
  };
}

export function normalizeClientRequestSummaryItem(request?: unknown, caseTitle = "Caso") {
  const safeValue = safeRecord<Record<string, unknown>>(request, {});

  return {
    id: normalizeText(safeValue.id),
    case_id: normalizeText(safeValue.case_id),
    title: normalizeText(safeValue.title, "Solicitacao documental"),
    instructions: normalizeText(safeValue.instructions),
    due_at: safeDate(safeValue.due_at),
    status: normalizeText(safeValue.status, "pending"),
    statusLabel: normalizeDocumentRequestStatusLabel(safeValue.status),
    visible_to_client: safeValue.visible_to_client !== false,
    created_at: safeDate(safeValue.created_at, new Date().toISOString()) || new Date().toISOString(),
    caseTitle: normalizeText(caseTitle, "Caso")
  };
}

export function normalizeClientAppointmentSummaryItem(
  appointment?: unknown,
  caseTitle = "Caso"
) {
  const safeValue = safeRecord<Record<string, unknown>>(appointment, {});

  return {
    id: normalizeText(safeValue.id),
    case_id: normalizeText(safeValue.case_id),
    title: normalizeText(safeValue.title, "Compromisso agendado"),
    appointment_type: normalizeText(safeValue.appointment_type, "reuniao"),
    starts_at: safeDate(safeValue.starts_at, new Date().toISOString()) || new Date().toISOString(),
    ends_at: safeDate(safeValue.ends_at),
    mode: normalizeNullableText(safeValue.mode),
    status: normalizeText(safeValue.status, "scheduled"),
    notes: normalizeText(safeValue.notes),
    description: normalizeText(safeValue.notes),
    visible_to_client: safeValue.visible_to_client !== false,
    caseTitle: normalizeText(caseTitle, "Caso"),
    statusLabel: normalizeAppointmentStatusLabel(safeValue.status),
    typeLabel: normalizeAppointmentTypeLabel(safeValue.appointment_type)
  };
}

export function normalizeClientEventSummaryItem(event?: unknown, caseTitle = "Caso") {
  const safeValue = safeRecord<Record<string, unknown>>(event, {});

  return {
    id: normalizeText(safeValue.id),
    case_id: normalizeText(safeValue.case_id),
    event_type: normalizeText(safeValue.event_type, "case_update"),
    title: normalizeText(safeValue.title, "Atualizacao do caso"),
    public_summary: normalizeText(safeValue.public_summary),
    occurred_at: safeDate(safeValue.occurred_at, new Date().toISOString()) || new Date().toISOString(),
    caseTitle: normalizeText(caseTitle, "Caso"),
    eventLabel: normalizeEventLabel(safeValue.event_type)
  };
}
