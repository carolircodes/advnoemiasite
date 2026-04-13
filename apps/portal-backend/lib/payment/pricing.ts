export const CONSULTATION_ONLINE_AMOUNT_CENTS = 10000;
export const OWNER_TEST_OVERRIDE_PHONE = "5584998566004";
export const MIN_TEST_OVERRIDE_AMOUNT_CENTS = 100;
export const MAX_TEST_OVERRIDE_AMOUNT_CENTS = 100000;
export const DEFAULT_CHECKOUT_MAX_INSTALLMENTS = 12;

export type PriceSource =
  | "default_consultation"
  | "default_offer_catalog"
  | "owner_test_override";

export type PaymentPricingResolution = {
  baseAmountCents: number;
  finalAmountCents: number;
  priceSource: PriceSource;
  requestedTestAmountCents: number | null;
  ownerOverridePhone: string | null;
  auditReason: string;
  safeMetadata: Record<string, unknown>;
};

type PaymentPricingInput = {
  offerCode: string;
  offerDefaultAmount: number | null;
  requesterPhone?: string | null;
  originalMessage?: string | null;
  requestedAmountCents?: number | null;
};

function parseMonetaryNumber(raw: string) {
  const normalized = raw.replace(/\s+/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizePhoneNumber(value: string | null | undefined) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function amountCentsToDecimal(amountCents: number) {
  return Number((amountCents / 100).toFixed(2));
}

export function amountDecimalToCents(amount: number | null | undefined) {
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round((amount as number) * 100);
}

export function parseRequestedAmountCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = parseMonetaryNumber(value);
  return parsed === null ? null : Math.round(parsed * 100);
}

export function extractAmountCentsFromMessage(messageText: string | null | undefined) {
  if (typeof messageText !== "string" || !messageText.trim()) {
    return null;
  }

  const message = messageText.toLowerCase();
  const patterns = [
    /r\$\s*(\d{1,5}(?:[.,]\d{1,2})?)/i,
    /(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:reais|real)\b/i,
    /(?:link|pagamento|pagar|pix|cartao|cartão|cobranca|cobrança|teste)\D{0,20}(\d{1,5}(?:[.,]\d{1,2})?)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const parsed = match?.[1] ? parseMonetaryNumber(match[1]) : null;

    if (parsed !== null) {
      return Math.round(parsed * 100);
    }
  }

  return null;
}

export function detectExplicitPaymentLinkRequest(messageText: string | null | undefined) {
  const normalizedMessage = (messageText || "").toLowerCase();

  return [
    "link de pagamento",
    "link para pagamento",
    "link pra pagamento",
    "link para pagar",
    "link pra pagar",
    "envia o link",
    "me manda o link",
    "gera o link",
    "gerar o link",
    "quero pagar",
    "pagar agora",
    "posso pagar",
    "como pagar",
    "checkout",
    "pix",
    "cartao",
    "cartão",
    "cobranca",
    "cobrança",
    "teste de pagamento",
    "teste autorizado"
  ].some((token) => normalizedMessage.includes(token));
}

export function buildCheckoutPaymentMethods() {
  return {
    installments: DEFAULT_CHECKOUT_MAX_INSTALLMENTS,
    default_installments: 1
  };
}

export function resolvePaymentPricing(input: PaymentPricingInput): PaymentPricingResolution {
  const normalizedPhone = normalizePhoneNumber(input.requesterPhone);
  const normalizedMessage = (input.originalMessage || "").toLowerCase();
  const requestedAmountFromPayload = parseRequestedAmountCents(input.requestedAmountCents);
  const requestedAmountFromMessage = extractAmountCentsFromMessage(input.originalMessage);
  const requestedTestAmountCents =
    requestedAmountFromPayload ?? requestedAmountFromMessage ?? null;
  const explicitPaymentRequest =
    detectExplicitPaymentLinkRequest(input.originalMessage) ||
    (requestedTestAmountCents !== null &&
      /(link|pagamento|pagar|teste|pix|cartao|cartão|checkout)/i.test(normalizedMessage));
  const isConsultationOffer = input.offerCode === "consultation_initial";
  const catalogBaseAmountCents =
    amountDecimalToCents(input.offerDefaultAmount) ??
    (isConsultationOffer ? CONSULTATION_ONLINE_AMOUNT_CENTS : 0);
  const baseAmountCents = isConsultationOffer
    ? CONSULTATION_ONLINE_AMOUNT_CENTS
    : catalogBaseAmountCents;
  const isOwnerPhone = normalizedPhone === OWNER_TEST_OVERRIDE_PHONE;
  const requestedAmountIsValid =
    requestedTestAmountCents !== null &&
    requestedTestAmountCents >= MIN_TEST_OVERRIDE_AMOUNT_CENTS &&
    requestedTestAmountCents <= MAX_TEST_OVERRIDE_AMOUNT_CENTS;
  const ownerOverrideAllowed =
    isOwnerPhone &&
    explicitPaymentRequest &&
    requestedAmountIsValid;

  if (ownerOverrideAllowed && requestedTestAmountCents !== null) {
    return {
      baseAmountCents,
      finalAmountCents: requestedTestAmountCents,
      priceSource: "owner_test_override",
      requestedTestAmountCents,
      ownerOverridePhone: normalizedPhone,
      auditReason: "owner_test_override_authorized",
      safeMetadata: {
        explicit_payment_request: true,
        override_owner_phone_matched: true,
        override_amount_within_range: true
      }
    };
  }

  return {
    baseAmountCents,
    finalAmountCents: baseAmountCents,
    priceSource: isConsultationOffer ? "default_consultation" : "default_offer_catalog",
    requestedTestAmountCents,
    ownerOverridePhone: isOwnerPhone ? normalizedPhone : null,
    auditReason: !explicitPaymentRequest
      ? "default_price_without_explicit_payment_request"
      : !isOwnerPhone
        ? "default_price_owner_override_blocked_for_non_owner"
        : !requestedAmountIsValid
          ? "default_price_owner_override_missing_or_invalid_amount"
          : "default_price_from_offer_catalog",
    safeMetadata: {
      explicit_payment_request: explicitPaymentRequest,
      override_owner_phone_matched: isOwnerPhone,
      override_amount_within_range: requestedAmountIsValid
    }
  };
}
