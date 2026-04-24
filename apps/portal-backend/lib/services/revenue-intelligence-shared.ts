export type RevenuePaymentRow = {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  external_id: string | null;
  amount: number | null;
  base_amount_cents?: number | null;
  final_amount_cents?: number | null;
  price_source?: string | null;
  status: string | null;
  financial_state?: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  metadata: Record<string, unknown> | null;
  status_detail: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeRevenuePaymentRows(
  rows: Array<{
    id: string;
    lead_id: string | null;
    user_id: string | null;
    external_id: string | null;
    amount: number | null;
    status: string | null;
    created_at: string;
    updated_at: string;
    approved_at: string | null;
    rejected_at: string | null;
    metadata: Record<string, unknown> | null;
    status_detail: string | null;
    base_amount_cents?: number | null;
    final_amount_cents?: number | null;
    price_source?: string | null;
    financial_state?: string | null;
  }>
): RevenuePaymentRow[] {
  return rows.map((payment) => ({
    ...payment,
    base_amount_cents:
      typeof payment.base_amount_cents === "number" ? payment.base_amount_cents : null,
    final_amount_cents:
      typeof payment.final_amount_cents === "number" ? payment.final_amount_cents : null,
    price_source:
      typeof payment.price_source === "string"
        ? payment.price_source
        : asString(payment.metadata?.price_source) || null,
    financial_state:
      typeof payment.financial_state === "string" ? payment.financial_state : null
  }));
}
