type PersistedPaymentLike = {
  id: string;
  status: string;
  amount: number | null;
  payment_url: string | null;
  external_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function buildPublicPaymentPayload(payment: PersistedPaymentLike) {
  const metadata =
    payment?.metadata && typeof payment.metadata === "object" ? payment.metadata : {};

  return {
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    payment_url: payment.payment_url,
    external_id: payment.external_id,
    metadata: {
      offer_code: typeof metadata.offer_code === "string" ? metadata.offer_code : null,
      offer_name: typeof metadata.offer_name === "string" ? metadata.offer_name : null,
      offer_kind: typeof metadata.offer_kind === "string" ? metadata.offer_kind : null
    },
    created_at: payment.created_at,
    updated_at: payment.updated_at
  };
}
