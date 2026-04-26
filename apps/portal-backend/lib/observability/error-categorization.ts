import { ZodError } from "zod";

import type { ObservedErrorCategory } from "./request-observability.ts";

export function categorizeObservedError(
  error: unknown,
  fallback: ObservedErrorCategory = "internal"
): ObservedErrorCategory {
  if (error instanceof ZodError) {
    return "validation";
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("token") ||
    message.includes("secret") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("assinatura")
  ) {
    return "authentication";
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    return "rate_limit";
  }

  if (
    message.includes("idempot") ||
    message.includes("already in progress") ||
    message.includes("conflict")
  ) {
    return "idempotency";
  }

  if (
    message.includes("env") ||
    message.includes("config") ||
    message.includes("missing") ||
    message.includes("nao configurado")
  ) {
    return "configuration";
  }

  if (
    message.includes("fallback") ||
    message.includes("durable") ||
    message.includes("temporarily unavailable")
  ) {
    return "fallback";
  }

  if (
    message.includes("not found") ||
    message.includes("nao encontrado") ||
    message.includes("unavailable")
  ) {
    return "not_found";
  }

  if (
    message.includes("mercado pago") ||
    message.includes("supabase") ||
    message.includes("openai") ||
    message.includes("meta") ||
    message.includes("telegram") ||
    message.includes("youtube") ||
    message.includes("provider")
  ) {
    return "provider";
  }

  return fallback;
}
