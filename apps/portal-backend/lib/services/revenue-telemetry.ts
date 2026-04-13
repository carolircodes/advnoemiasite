import "server-only";

import { recordProductEvent } from "./public-intake";

type RevenueTelemetryInput = {
  eventKey:
    | "offer_viewed"
    | "offer_presented"
    | "checkout_started"
    | "checkout_abandoned"
    | "payment_pending"
    | "payment_approved"
    | "payment_failed"
    | "payment_recovered"
    | "paid_consultation"
    | "paid_analysis"
    | "revenue_signal"
    | "revenue_confirmed"
    | "payment_followup_needed"
    | "offer_acceptance_signal";
  pagePath?: string;
  profileId?: string;
  payload?: Record<string, unknown>;
};

export async function recordRevenueTelemetry(input: RevenueTelemetryInput) {
  return recordProductEvent({
    eventKey: input.eventKey,
    eventGroup: "revenue",
    pagePath: input.pagePath || "/pagamento",
    profileId: input.profileId,
    payload: input.payload || {}
  });
}
