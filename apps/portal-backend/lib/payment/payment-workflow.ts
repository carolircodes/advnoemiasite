export type PaymentTechnicalState =
  | "checkout_created"
  | "webhook_received"
  | "webhook_validated"
  | "reconciled"
  | "webhook_ignored"
  | "superseded";

export type PaymentFinancialState =
  | "pending"
  | "approved"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "charged_back";

export type CommercialPaymentState =
  | "not_started"
  | "link_sent"
  | "pending"
  | "approved"
  | "failed"
  | "expired"
  | "abandoned";

export type PaymentOriginType =
  | "staff"
  | "internal_secret"
  | "channel_automation"
  | "site_flow"
  | "noemia_flow"
  | "system";

type PersistedPaymentSnapshot = {
  id: string;
  status?: string | null;
  financial_state?: string | null;
  active_for_lead?: boolean | null;
  external_id?: string | null;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function coercePaymentFinancialState(
  value: string | null | undefined,
  statusDetail?: string | null | undefined
): PaymentFinancialState {
  const normalized = normalizeText(value);
  const normalizedDetail = normalizeText(statusDetail);

  if (normalized === "approved") {
    return "approved";
  }

  if (normalized === "refunded") {
    return "refunded";
  }

  if (normalized === "charged_back" || normalizedDetail.includes("chargeback")) {
    return "charged_back";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return normalizedDetail.includes("expired") ? "expired" : "cancelled";
  }

  if (normalized === "rejected" || normalized === "failed") {
    return normalizedDetail.includes("expired") ? "expired" : "failed";
  }

  if (normalized === "expired") {
    return "expired";
  }

  if (
    normalized === "authorized" ||
    normalized === "in_process" ||
    normalized === "in_mediation" ||
    normalized === "pending"
  ) {
    return "pending";
  }

  return "pending";
}

export function mapMercadoPagoStatusToFinancialState(paymentInfo: {
  status?: string | null;
  status_detail?: string | null;
}) {
  return coercePaymentFinancialState(paymentInfo.status, paymentInfo.status_detail);
}

export function mapFinancialStateToCommercialPaymentState(
  financialState: PaymentFinancialState
): CommercialPaymentState {
  switch (financialState) {
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "expired":
      return "expired";
    case "failed":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "failed";
    default:
      return "not_started";
  }
}

export function isApprovedFinancialState(value: string | null | undefined) {
  return coercePaymentFinancialState(value) === "approved";
}

export function getPersistedFinancialState(payment: PersistedPaymentSnapshot | null | undefined) {
  if (!payment) {
    return "pending" as PaymentFinancialState;
  }

  return coercePaymentFinancialState(payment.financial_state);
}

export function canApplyPaymentTransition(args: {
  currentState: PaymentFinancialState;
  nextState: PaymentFinancialState;
}) {
  const { currentState, nextState } = args;

  if (currentState === nextState) {
    return true;
  }

  switch (currentState) {
    case "pending":
      return true;
    case "failed":
      return nextState === "approved" || nextState === "refunded" || nextState === "charged_back";
    case "expired":
      return nextState === "refunded" || nextState === "charged_back";
    case "cancelled":
      return nextState === "refunded" || nextState === "charged_back";
    case "approved":
      return nextState === "refunded" || nextState === "charged_back";
    case "refunded":
      return nextState === "charged_back";
    case "charged_back":
      return false;
    default:
      return false;
  }
}

export function buildPaymentTransitionKey(args: {
  paymentId: string;
  providerPaymentId: string | number | null | undefined;
  financialState: PaymentFinancialState;
  stage: "checkout" | "webhook" | "commercial";
}) {
  const providerPaymentId =
    typeof args.providerPaymentId === "undefined" || args.providerPaymentId === null
      ? "none"
      : String(args.providerPaymentId);

  return `${args.stage}:${args.paymentId}:${providerPaymentId}:${args.financialState}`;
}

export function buildPaymentIgnoredTransitionKey(args: {
  paymentId: string;
  providerPaymentId: string | number | null | undefined;
  financialState: PaymentFinancialState;
}) {
  const providerPaymentId =
    typeof args.providerPaymentId === "undefined" || args.providerPaymentId === null
      ? "none"
      : String(args.providerPaymentId);

  return `ignored:${args.paymentId}:${providerPaymentId}:${args.financialState}`;
}

export function pickCanonicalPaymentRecord(
  payments: PersistedPaymentSnapshot[],
  args: {
    externalReference?: string | null;
    providerPaymentId?: string | number | null;
  }
) {
  const normalizedExternalReference = normalizeText(args.externalReference);
  const normalizedProviderPaymentId =
    typeof args.providerPaymentId === "undefined" || args.providerPaymentId === null
      ? ""
      : String(args.providerPaymentId).trim();

  const matchedByReference = payments.find((payment) => {
    const metadataExternalReference =
      typeof payment.metadata?.external_reference === "string"
        ? payment.metadata.external_reference
        : null;

    return (
      normalizeText(payment.external_reference) === normalizedExternalReference ||
      normalizeText(metadataExternalReference) === normalizedExternalReference
    );
  });

  if (matchedByReference) {
    return matchedByReference;
  }

  const matchedByProviderPaymentId = payments.find((payment) => {
    const preferenceId =
      typeof payment.metadata?.preference_id === "string" ? payment.metadata.preference_id : null;

    return payment.external_id === normalizedProviderPaymentId || preferenceId === normalizedProviderPaymentId;
  });

  if (matchedByProviderPaymentId) {
    return matchedByProviderPaymentId;
  }

  const activePayment = payments.find((payment) => payment.active_for_lead !== false);
  return activePayment || payments[0] || null;
}

export function shouldTreatPaymentAsActivePending(payment: PersistedPaymentSnapshot | null | undefined) {
  if (!payment || payment.active_for_lead === false) {
    return false;
  }

  return getPersistedFinancialState(payment) === "pending";
}

export function resolvePaymentOrigin(args: {
  accessActor: "staff" | "internal-secret";
  monetizationSource?: string | null;
  metadata?: Record<string, unknown> | null;
  profileId?: string | null;
  userId?: string | null;
}) {
  const sourceCandidate = normalizeText(
    (typeof args.monetizationSource === "string" && args.monetizationSource) ||
      (typeof args.metadata?.monetization_source === "string"
        ? args.metadata.monetization_source
        : null) ||
      (typeof args.metadata?.channel === "string" ? args.metadata.channel : null)
  );

  if (args.accessActor === "staff") {
    return {
      originType: "staff" as PaymentOriginType,
      originSource: sourceCandidate || "internal_operator",
      originActorId: args.profileId || null
    };
  }

  if (["whatsapp", "instagram", "facebook", "telegram", "messenger"].includes(sourceCandidate)) {
    return {
      originType: "channel_automation" as PaymentOriginType,
      originSource: sourceCandidate,
      originActorId: args.userId || null
    };
  }

  if (sourceCandidate === "site" || sourceCandidate === "public_site") {
    return {
      originType: "site_flow" as PaymentOriginType,
      originSource: sourceCandidate,
      originActorId: args.userId || null
    };
  }

  if (sourceCandidate === "noemia") {
    return {
      originType: "noemia_flow" as PaymentOriginType,
      originSource: sourceCandidate,
      originActorId: args.userId || null
    };
  }

  return {
    originType: "internal_secret" as PaymentOriginType,
    originSource: sourceCandidate || "internal_runtime",
    originActorId: args.userId || null
  };
}

export function buildPaymentContextSnapshot(args: {
  offerCode: string;
  offerKind: string;
  monetizationPath: string;
  monetizationSource: string;
  requestFingerprint: string;
  requestedAmountCents?: number | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    offer_code: args.offerCode,
    offer_kind: args.offerKind,
    monetization_path: args.monetizationPath,
    monetization_source: args.monetizationSource,
    request_fingerprint: args.requestFingerprint,
    requested_amount_cents:
      typeof args.requestedAmountCents === "number" ? args.requestedAmountCents : null,
    channel:
      typeof args.metadata?.channel === "string" ? args.metadata.channel : null,
    source:
      typeof args.metadata?.source === "string" ? args.metadata.source : null,
    event_id:
      typeof args.metadata?.event_id === "string" ? args.metadata.event_id : null,
    session_id:
      typeof args.metadata?.session_id === "string" ? args.metadata.session_id : null
  };
}
