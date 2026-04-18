export type NotificationErrorKind =
  | "provider"
  | "database"
  | "configuration"
  | "validation"
  | "unsupported"
  | "unknown";

export function classifyNotificationError(error: unknown): NotificationErrorKind {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("relation") ||
    message.includes("column") ||
    message.includes("schema") ||
    message.includes("supabase")
  ) {
    return "database";
  }

  if (
    message.includes("resend") ||
    message.includes("twilio") ||
    message.includes("smtp") ||
    message.includes("provider") ||
    message.includes("429")
  ) {
    return "provider";
  }

  if (
    message.includes("missing") ||
    message.includes("required") ||
    message.includes("undefined") ||
    message.includes("invalid")
  ) {
    return "configuration";
  }

  if (message.includes("channel") || message.includes("unsupported")) {
    return "unsupported";
  }

  if (message.includes("payload") || message.includes("template")) {
    return "validation";
  }

  return "unknown";
}
