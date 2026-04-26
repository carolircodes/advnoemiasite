import {
  computeHmacSha256Hex,
  parseMercadoPagoSignatureInput,
  timingSafeEqualText
} from "../http/webhook-security.ts";

export function getMercadoPagoWebhookEventId(args: {
  searchParams?: URLSearchParams;
  event: unknown;
}) {
  const event = args.event && typeof args.event === "object"
    ? (args.event as Record<string, any>)
    : {};

  return (
    args.searchParams?.get("data.id") ||
    args.searchParams?.get("id") ||
    (typeof event?.data?.id === "string" || typeof event?.data?.id === "number"
      ? String(event.data.id)
      : null) ||
    (typeof event?.id === "string" || typeof event?.id === "number" ? String(event.id) : null)
  );
}

export function validateMercadoPagoWebhookSignature(args: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  webhookSecret?: string;
}) {
  if (!args.webhookSecret) {
    return {
      ok: false,
      status: 503,
      code: "missing_secret"
    } as const;
  }

  const signatureInput = parseMercadoPagoSignatureInput({
    header: args.signatureHeader,
    requestId: args.requestId,
    dataId: args.dataId
  });

  if (!signatureInput) {
    return {
      ok: false,
      status: 401,
      code: "invalid_signature_input"
    } as const;
  }

  const expectedSignature = computeHmacSha256Hex(
    args.webhookSecret,
    signatureInput.manifest
  );

  if (!timingSafeEqualText(expectedSignature, signatureInput.version)) {
    return {
      ok: false,
      status: 401,
      code: "invalid_signature"
    } as const;
  }

  return {
    ok: true,
    status: 200,
    code: "validated"
  } as const;
}
