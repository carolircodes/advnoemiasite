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

export function normalizeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

export function normalizeDateLabel(value: unknown, fallback = "Nao informado") {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  try {
    return formatPortalDateTime(value);
  } catch {
    return fallback;
  }
}

export function normalizeCaseStatusLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Sem status";
  }

  return caseStatusLabels[value as keyof typeof caseStatusLabels] || value;
}

export function normalizeDocumentStatusLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Sem status";
  }

  return documentStatusLabels[value as keyof typeof documentStatusLabels] || value;
}

export function normalizeDocumentRequestStatusLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Sem status";
  }

  return (
    documentRequestStatusLabels[value as keyof typeof documentRequestStatusLabels] || value
  );
}

export function normalizeAppointmentStatusLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Sem status";
  }

  return appointmentStatusLabels[value as keyof typeof appointmentStatusLabels] || value;
}

export function normalizeAppointmentTypeLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Compromisso";
  }

  return appointmentTypeLabels[value as keyof typeof appointmentTypeLabels] || value;
}

export function normalizeEventLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Atualizacao";
  }

  return (
    caseEventTypeLabels[value as keyof typeof caseEventTypeLabels] ||
    portalEventTypeLabels[value as keyof typeof portalEventTypeLabels] ||
    value
  );
}
