import "server-only";

import { createServerSupabaseClient } from "../supabase/server";
import {
  getRevenueLayerLabel,
  getRevenueOfferByCode,
  listRevenueOffersByMoment,
  revenueArchitecture
} from "./revenue-architecture";
import {
  normalizeRevenuePaymentRows,
  type RevenuePaymentRow
} from "./revenue-intelligence-shared";

type RevenueEventRow = {
  id: string;
  event_key: string;
  event_group: string | null;
  page_path: string | null;
  profile_id: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42703" ||
    (typeof error?.message === "string" && error.message.includes("does not exist"))
  );
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getFinancialState(payment: RevenuePaymentRow) {
  return asString(payment.financial_state) || asString(payment.status) || "pending";
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function clampDays(value: number) {
  if (!Number.isFinite(value)) {
    return 30;
  }

  return Math.min(Math.max(Math.round(value), 7), 180);
}

function getHoursBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) {
    return null;
  }

  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();

  if (Number.isNaN(startDate) || Number.isNaN(endDate) || endDate < startDate) {
    return null;
  }

  return (endDate - startDate) / (1000 * 60 * 60);
}

async function loadRevenuePayments(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  since: string
) {
  const result = await supabase
    .from("payments")
    .select(
      "id,lead_id,user_id,external_id,amount,base_amount_cents,final_amount_cents,price_source,status,financial_state,created_at,updated_at,approved_at,rejected_at,metadata,status_detail"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (!isMissingColumnError(result.error)) {
    return {
      data: normalizeRevenuePaymentRows((result.data || []) as RevenuePaymentRow[]),
      error: result.error,
      compatibilityMode: "canonical" as const
    };
  }

  const legacyResult = await supabase
    .from("payments")
    .select(
      "id,lead_id,user_id,external_id,amount,status,created_at,updated_at,approved_at,rejected_at,metadata,status_detail"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (legacyResult.error) {
    return {
      data: null,
      error: legacyResult.error,
      compatibilityMode: "legacy" as const
    };
  }

  return {
    data: normalizeRevenuePaymentRows((legacyResult.data || []) as RevenuePaymentRow[]),
    error: null,
    compatibilityMode: "legacy" as const
  };
}

export async function getRevenueIntelligenceOverview(rawDays = 30) {
  const days = clampDays(rawDays);
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const stalePendingLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [paymentsResult, productEventsResult] = await Promise.all([
    loadRevenuePayments(supabase, since),
    supabase
      .from("product_events")
      .select("id,event_key,event_group,page_path,profile_id,payload,occurred_at")
      .eq("event_group", "revenue")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(4000)
  ]);

  if (paymentsResult.error) {
    throw new Error(`Nao foi possivel carregar os pagamentos: ${paymentsResult.error.message}`);
  }

  if (paymentsResult.compatibilityMode === "legacy") {
    console.warn("[revenue.intelligence] Using legacy payments compatibility mode", {
      missingColumn: "financial_state"
    });
  }

  if (productEventsResult.error) {
    throw new Error(
      `Nao foi possivel carregar os eventos de receita: ${productEventsResult.error.message}`
    );
  }

  const payments = paymentsResult.data || [];
  const revenueEvents = (productEventsResult.data || []) as RevenueEventRow[];

  const pendingPayments = payments.filter((payment) => getFinancialState(payment) === "pending");
  const approvedPayments = payments.filter((payment) => getFinancialState(payment) === "approved");
  const failedPayments = payments.filter(
    (payment) => ["failed", "cancelled", "expired", "refunded", "charged_back"].includes(getFinancialState(payment))
  );
  const stalePendingPayments = pendingPayments.filter(
    (payment) => payment.created_at <= stalePendingLimit
  );

  const revenueInFormation = pendingPayments.reduce(
    (total, payment) => total + asNumber(payment.amount),
    0
  );
  const revenueConfirmed = approvedPayments.reduce(
    (total, payment) => total + asNumber(payment.amount),
    0
  );
  const recoveredPayments = revenueEvents.filter((event) => event.event_key === "payment_recovered");
  const checkoutsStarted = revenueEvents.filter((event) => event.event_key === "checkout_started");
  const offerPresented = revenueEvents.filter((event) => event.event_key === "offer_presented");
  const checkoutAbandoned = revenueEvents.filter((event) => event.event_key === "checkout_abandoned");
  const paymentFollowUpNeeded = revenueEvents.filter(
    (event) => event.event_key === "payment_followup_needed"
  );

  const offerBreakdownMap = new Map<
    string,
    {
      code: string;
      label: string;
      kind: string;
      layerLabel: string;
      presented: number;
      checkoutStarted: number;
      pending: number;
      approved: number;
      failed: number;
      revenueConfirmed: number;
      revenueInFormation: number;
    }
  >();

  const ensureOffer = (offerCode: string) => {
    const existing = offerBreakdownMap.get(offerCode);
    if (existing) {
      return existing;
    }

    const offer = getRevenueOfferByCode(offerCode);
    const next = {
      code: offer.code,
      label: offer.name,
      kind: offer.kind,
      layerLabel: getRevenueLayerLabel(offer.layer),
      presented: 0,
      checkoutStarted: 0,
      pending: 0,
      approved: 0,
      failed: 0,
      revenueConfirmed: 0,
      revenueInFormation: 0
    };
    offerBreakdownMap.set(offerCode, next);
    return next;
  };

  for (const event of offerPresented) {
    const offerCode = asString(event.payload?.offer_code) || "consultation_initial";
    ensureOffer(offerCode).presented += 1;
  }

  for (const event of checkoutsStarted) {
    const offerCode = asString(event.payload?.offer_code) || "consultation_initial";
    ensureOffer(offerCode).checkoutStarted += 1;
  }

  for (const payment of payments) {
    const offerCode = asString(payment.metadata?.offer_code) || "consultation_initial";
    const bucket = ensureOffer(offerCode);

    const financialState = getFinancialState(payment);

    if (financialState === "pending") {
      bucket.pending += 1;
      bucket.revenueInFormation += asNumber(payment.amount);
    } else if (financialState === "approved") {
      bucket.approved += 1;
      bucket.revenueConfirmed += asNumber(payment.amount);
    } else if (["failed", "cancelled", "expired", "refunded", "charged_back"].includes(financialState)) {
      bucket.failed += 1;
    }
  }

  const monetizationPathMap = new Map<
    string,
    { path: string; label: string; presented: number; checkoutStarted: number; approved: number }
  >();
  const ensurePath = (path: string) => {
    const existing = monetizationPathMap.get(path);
    if (existing) {
      return existing;
    }

    const next = {
      path,
      label: path.replaceAll("_", " "),
      presented: 0,
      checkoutStarted: 0,
      approved: 0
    };
    monetizationPathMap.set(path, next);
    return next;
  };

  for (const event of offerPresented) {
    const path = asString(event.payload?.monetization_path) || "noemia_consultation_flow";
    ensurePath(path).presented += 1;
  }

  for (const event of checkoutsStarted) {
    const path = asString(event.payload?.monetization_path) || "noemia_consultation_flow";
    ensurePath(path).checkoutStarted += 1;
  }

  for (const payment of approvedPayments) {
    const path = asString(payment.metadata?.monetization_path) || "noemia_consultation_flow";
    ensurePath(path).approved += 1;
  }

  const averageCheckoutToApprovedHours = (() => {
    const diffs = approvedPayments
      .map((payment) =>
        getHoursBetween(
          asString(payment.metadata?.checkout_started_at) || payment.created_at,
          payment.approved_at || payment.updated_at
        )
      )
      .filter((value): value is number => value !== null);

    if (!diffs.length) {
      return null;
    }

    return Number((diffs.reduce((total, value) => total + value, 0) / diffs.length).toFixed(1));
  })();

  const paymentStateSummary = {
    offersPresented: offerPresented.length,
    checkoutStarted: checkoutsStarted.length,
    checkoutAbandoned: checkoutAbandoned.length,
    pendingCount: pendingPayments.length,
    approvedCount: approvedPayments.length,
    failedCount: failedPayments.length,
    recoveredCount: recoveredPayments.length,
    paymentFollowUpNeeded: paymentFollowUpNeeded.length + stalePendingPayments.length,
    revenueInFormation,
    revenueConfirmed,
    averageCheckoutToApprovedHours
  };

  const suggestions = [];

  if (stalePendingPayments.length) {
    suggestions.push({
      title: `${stalePendingPayments.length} pagamento(s) pendente(s) ja pedem follow-up`,
      body:
        "Existem jornadas que aceitaram a oferta e iniciaram checkout, mas ainda nao confirmaram pagamento.",
      href: "/internal/advogada#receita-formacao"
    });
  }

  if (failedPayments.length) {
    suggestions.push({
      title: `${failedPayments.length} pagamento(s) falharam e podem ser recuperados`,
      body:
        "O cockpit agora consegue destacar falhas para reabertura de conversa, novo link ou apoio humano.",
      href: "/internal/advogada/inteligencia"
    });
  }

  if (paymentStateSummary.checkoutStarted > approvedPayments.length) {
    suggestions.push({
      title: "Existe abandono entre checkout e confirmacao",
      body:
        "A leitura de receita mostra gap entre checkout iniciado e pagamento aprovado. Vale reforcar follow-up e framing de valor.",
      href: "/internal/advogada/inteligencia"
    });
  }

  return {
    days,
    since,
    architecture: revenueArchitecture,
    nowOffers: listRevenueOffersByMoment("now"),
    nextOffers: listRevenueOffersByMoment("next"),
    futureOffers: listRevenueOffersByMoment("future"),
    summary: paymentStateSummary,
    offerBreakdown: [...offerBreakdownMap.values()].sort(
      (left, right) => right.revenueConfirmed - left.revenueConfirmed
    ),
    monetizationPaths: [...monetizationPathMap.values()].sort(
      (left, right) => right.approved - left.approved
    ),
    latestPayments: payments.slice(0, 8).map((payment) => {
      const offer = getRevenueOfferByCode(asString(payment.metadata?.offer_code));
      return {
        id: payment.id,
        status: getFinancialState(payment),
        amountLabel: currency(asNumber(payment.amount)),
        offerLabel: offer.name,
        kindLabel: offer.kind,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        leadId: payment.lead_id,
        externalId: payment.external_id,
        followUpNeeded:
          getFinancialState(payment) === "pending" && payment.created_at <= stalePendingLimit,
        statusDetail: payment.status_detail || "",
        priceSource: payment.price_source || asString(payment.metadata?.price_source) || "default_consultation",
        finalAmountCents:
          asNumber(payment.final_amount_cents) ||
          asNumber(payment.base_amount_cents) ||
          Math.round(asNumber(payment.amount) * 100),
        pathLabel:
          asString(payment.metadata?.monetization_path) || "noemia_consultation_flow"
      };
    }),
    recentRevenueEvents: revenueEvents.slice(0, 12).map((event) => ({
      id: event.id,
      eventKey: event.event_key,
      label: event.event_key.replaceAll("_", " "),
      occurredAt: event.occurred_at,
      offerCode: asString(event.payload?.offer_code),
      path: asString(event.payload?.monetization_path)
    })),
    suggestions
  };
}
