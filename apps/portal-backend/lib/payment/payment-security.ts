import { z } from "zod";

const paymentCreateMetadataValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().trim().max(500),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(paymentCreateMetadataValueSchema).max(10),
    z.record(z.string(), paymentCreateMetadataValueSchema)
  ])
);

export const paymentCreateRequestSchema = z.object({
  leadId: z.string().trim().min(1).max(120),
  userId: z.string().trim().min(1).max(160),
  offerCode: z.string().trim().min(1).max(80).optional(),
  intentionType: z.string().trim().min(1).max(80).optional(),
  monetizationPath: z.string().trim().min(1).max(120).optional(),
  monetizationSource: z.string().trim().min(1).max(120).optional(),
  requestedAmountCents: z.number().int().positive().max(500000).optional(),
  metadata: z.record(z.string(), paymentCreateMetadataValueSchema).optional().default({})
});

export const noemiaPaymentRequestSchema = z.object({
  leadId: z.string().trim().min(1).max(120),
  userId: z.string().trim().min(1).max(160),
  message: z.string().trim().max(4000).optional().default(""),
  intentionType: z.string().trim().min(1).max(80).optional(),
  offerCode: z.string().trim().min(1).max(80).optional()
});

export const publicPaymentLookupQuerySchema = z
  .object({
    payment_id: z.string().trim().min(1).max(160).optional(),
    collection_id: z.string().trim().min(1).max(160).optional(),
    external_reference: z.string().trim().min(1).max(240).optional(),
    lead_id: z.string().trim().min(1).max(120).optional()
  })
  .superRefine((input, ctx) => {
    if (
      !input.payment_id &&
      !input.collection_id &&
      !input.external_reference &&
      !input.lead_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "payment_id, collection_id, external_reference ou lead_id sao obrigatorios."
      });
    }
  });

const RESERVED_PAYMENT_METADATA_KEYS = new Set([
  "lead_id",
  "user_id",
  "offer_code",
  "offer_name",
  "offer_kind",
  "revenue_layer",
  "monetization_path",
  "monetization_source",
  "checkout_started_at",
  "external_reference",
  "requester_phone",
  "base_amount_cents",
  "final_amount_cents",
  "price_source",
  "requested_test_amount_cents",
  "owner_override_phone",
  "price_reason",
  "pricing_context",
  "preference_id"
]);

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value === "string" ? value.trim().slice(0, 500) : value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => typeof item !== "undefined");
  }

  if (typeof value !== "object") {
    return undefined;
  }

  return Object.entries(value as Record<string, unknown>)
    .slice(0, 20)
    .reduce<Record<string, unknown>>((accumulator, [key, nestedValue]) => {
      const sanitized = sanitizeMetadataValue(nestedValue, depth + 1);

      if (typeof sanitized !== "undefined") {
        accumulator[key] = sanitized;
      }

      return accumulator;
    }, {});
}

export function buildSafePaymentMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return {};
  }

  return Object.entries(metadata)
    .slice(0, 20)
    .reduce<Record<string, unknown>>((accumulator, [key, value]) => {
      const normalizedKey = key.trim();

      if (!normalizedKey || RESERVED_PAYMENT_METADATA_KEYS.has(normalizedKey)) {
        return accumulator;
      }

      const sanitizedValue = sanitizeMetadataValue(value);

      if (typeof sanitizedValue !== "undefined") {
        accumulator[normalizedKey] = sanitizedValue;
      }

      return accumulator;
    }, {});
}
