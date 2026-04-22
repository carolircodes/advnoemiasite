import { NextRequest } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import {
  buildPaymentReadinessSection,
  getPaymentRuntimeDiagnostics
} from "@/lib/diagnostics/payment-readiness";
import {
  computeHmacSha256Hex,
  parseMercadoPagoSignatureInput,
  timingSafeEqualText
} from "@/lib/http/webhook-security";
import {
  buildPaymentIgnoredTransitionKey,
  buildPaymentTransitionKey,
  canApplyPaymentTransition,
  getPersistedFinancialState,
  mapFinancialStateToCommercialPaymentState,
  mapMercadoPagoStatusToFinancialState,
  pickCanonicalPaymentRecord,
  type PaymentFinancialState,
  type PaymentTechnicalState
} from "@/lib/payment/payment-workflow";
import { getRevenueOfferByCode } from "@/lib/services/revenue-architecture";
import { recordRevenueTelemetry } from "@/lib/services/revenue-telemetry";
import { commercialClosingService } from "@/lib/services/commercial-closing";
import { commercialAppointmentService } from "@/lib/services/commercial-appointment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { categorizeObservedError } from "@/lib/observability/error-categorization";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation,
  type RequestObservation
} from "@/lib/observability/request-observability";

type PaymentWebhookContext = {
  mercadopago: MercadoPagoConfig;
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  webhookSecret?: string;
};

type ParsedExternalReference = {
  offerCode: string;
  leadId: string;
};

type PaymentWebhookLogger = (
  level: "info" | "warn" | "error",
  event: string,
  metadata?: Record<string, unknown>,
  error?: unknown
) => void;

type PersistedPaymentRecord = {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  external_id?: string | null;
  external_reference?: string | null;
  amount?: number | null;
  transaction_amount?: number | null;
  status?: string | null;
  financial_state?: string | null;
  technical_state?: string | null;
  status_detail?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  active_for_lead?: boolean | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

function getWebhookContext():
  | { ok: true; value: PaymentWebhookContext }
  | { ok: false; missing: string[] } {
  const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

  const missing = [
    !mercadoPagoAccessToken ? "MERCADO_PAGO_ACCESS_TOKEN" : null,
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseSecretKey ? "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY" : null,
    !webhookSecret ? "MERCADO_PAGO_WEBHOOK_SECRET" : null
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    value: {
      mercadopago: new MercadoPagoConfig({
        accessToken: mercadoPagoAccessToken as string
      }),
      supabase: createAdminSupabaseClient(),
      webhookSecret
    }
  };
}

function createPaymentWebhookLogger(observation: RequestObservation): PaymentWebhookLogger {
  return (level, event, metadata = {}, error) => {
    logObservedRequest(
      level,
      event,
      observation,
      {
        flow: "payment_webhook",
        provider: "mercado_pago",
        ...metadata
      },
      error
    );
  };
}

function getMercadoPagoWebhookEventId(request: NextRequest, event: any) {
  return (
    request.nextUrl.searchParams.get("data.id") ||
    request.nextUrl.searchParams.get("id") ||
    (typeof event?.data?.id === "string" || typeof event?.data?.id === "number"
      ? String(event.data.id)
      : null) ||
    (typeof event?.id === "string" || typeof event?.id === "number" ? String(event.id) : null)
  );
}

function validateMercadoPagoWebhookSignature(args: {
  request: NextRequest;
  event: any;
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
    header: args.request.headers.get("x-signature"),
    requestId: args.request.headers.get("x-request-id"),
    dataId: getMercadoPagoWebhookEventId(args.request, args.event)
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

function parseExternalReference(externalReference: unknown): ParsedExternalReference | null {
  if (typeof externalReference !== "string") {
    return null;
  }

  const match = externalReference.match(/^(.*)_([0-9a-fA-F-]{36})_(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    offerCode: match[1],
    leadId: match[2]
  };
}

function mergeMercadoPagoMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  paymentInfo: any
) {
  return {
    ...(currentMetadata || {}),
    mercado_pago_payment_id: paymentInfo.id,
    mercado_pago_status: paymentInfo.status,
    mercado_pago_status_detail: paymentInfo.status_detail,
    external_reference:
      typeof paymentInfo.external_reference === "string" ? paymentInfo.external_reference : null,
    last_webhook_seen_at: new Date().toISOString()
  };
}

async function findPaymentRecordForWebhook(
  supabase: any,
  leadId: string,
  args: {
    externalReference?: string | null;
    providerPaymentId?: string | number | null;
  }
) {
  const paymentsLookup = await supabase
    .from("payments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (paymentsLookup.error) {
    throw paymentsLookup.error;
  }

  const payments = Array.isArray(paymentsLookup.data)
    ? (paymentsLookup.data as PersistedPaymentRecord[])
    : [];

  return pickCanonicalPaymentRecord(payments, {
    externalReference: args.externalReference,
    providerPaymentId: args.providerPaymentId
  }) as PersistedPaymentRecord | null;
}

function mapFinancialStateToPaymentRowStatus(financialState: PaymentFinancialState) {
  switch (financialState) {
    case "approved":
      return "approved";
    case "failed":
      return "rejected";
    case "expired":
      return "expired";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "charged_back";
    default:
      return "pending";
  }
}

function buildLeadPaymentPatch(args: {
  paymentId: string;
  financialState: PaymentFinancialState;
  now: string;
}) {
  switch (args.financialState) {
    case "approved":
      return {
        status: "paid",
        payment_id: args.paymentId,
        payment_status: "confirmed",
        payment_confirmed_at: args.now,
        updated_at: args.now
      };
    case "pending":
      return {
        status: "payment_pending",
        payment_id: args.paymentId,
        payment_status: "pending",
        updated_at: args.now
      };
    case "expired":
      return {
        payment_status: "expired",
        payment_rejected_at: args.now,
        updated_at: args.now
      };
    case "failed":
    case "cancelled":
      return {
        payment_status: "rejected",
        payment_rejected_at: args.now,
        updated_at: args.now
      };
    case "refunded":
    case "charged_back":
      return {
        payment_status: args.financialState,
        updated_at: args.now
      };
    default:
      return {
        updated_at: args.now
      };
  }
}

function buildCommercialSyncPayload(args: {
  financialState: PaymentFinancialState;
  providerPaymentId: string;
  amount: number | null;
  now: string;
}) {
  switch (args.financialState) {
    case "approved":
      return {
        paymentState: "approved" as const,
        paymentApprovedAt: args.now,
        paymentReference: args.providerPaymentId,
        consultationOfferAmount: args.amount
      };
    case "expired":
      return {
        paymentState: "expired" as const,
        paymentExpiredAt: args.now,
        paymentReference: args.providerPaymentId
      };
    case "failed":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return {
        paymentState: "failed" as const,
        paymentFailedAt: args.now,
        paymentReference: args.providerPaymentId
      };
    default:
      return {
        paymentState: "pending" as const,
        paymentPendingAt: args.now,
        paymentReference: args.providerPaymentId
      };
  }
}

async function claimPaymentTransitionEvent(args: {
  supabase: any;
  paymentId: string;
  transitionKey: string;
  providerPaymentId: string;
  providerStatus: string | null | undefined;
  financialState: PaymentFinancialState;
  technicalState: PaymentTechnicalState;
  payload: Record<string, unknown>;
}) {
  const { data, error } = await args.supabase
    .from("payment_events")
    .insert({
      payment_id: args.paymentId,
      event_kind: "financial_transition",
      transition_key: args.transitionKey,
      source: "payment_webhook",
      provider_payment_id: args.providerPaymentId,
      provider_status: args.providerStatus || null,
      financial_state: args.financialState,
      technical_state: args.technicalState,
      commercial_state: mapFinancialStateToCommercialPaymentState(args.financialState),
      side_effect_applied: false,
      payload: args.payload
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("duplicate key")) {
      const existingEventLookup = await args.supabase
        .from("payment_events")
        .select("id,side_effect_applied")
        .eq("transition_key", args.transitionKey)
        .maybeSingle();

      return {
        claimed: false,
        eventId: existingEventLookup.data?.id || null,
        recoverable: existingEventLookup.data?.side_effect_applied !== true
      };
    }

    throw error;
  }

  return {
    claimed: true,
    eventId: data?.id || null,
    recoverable: true
  };
}

async function finalizePaymentTransitionEvent(args: {
  supabase: any;
  transitionKey: string;
  sideEffectApplied: boolean;
}) {
  await args.supabase
    .from("payment_events")
    .update({
      side_effect_applied: args.sideEffectApplied,
      processed_at: new Date().toISOString()
    })
    .eq("transition_key", args.transitionKey);
}

async function applyCommercialProjection(args: {
  supabase: any;
  payment: PersistedPaymentRecord;
  paymentInfo: any;
  financialState: PaymentFinancialState;
  now: string;
  log: PaymentWebhookLogger;
}) {
  const profileId = typeof args.payment.user_id === "string" ? args.payment.user_id : null;

  if (!profileId) {
    return;
  }

  try {
    const assessment = await commercialClosingService.syncPipelineClosingFromProfile({
      profileId,
      payload: buildCommercialSyncPayload({
        financialState: args.financialState,
        providerPaymentId: String(args.paymentInfo.id),
        amount:
          typeof args.paymentInfo.transaction_amount === "number"
            ? args.paymentInfo.transaction_amount
            : null,
        now: args.now
      })
    });

    if (assessment?.pipelineId) {
      await commercialAppointmentService.syncFormalConsultation({
        pipelineId: assessment.pipelineId,
        source: "payment_webhook",
        createEvent: false
      });
    }
  } catch (closingSyncError) {
    args.log("warn", "PAYMENT_WEBHOOK_COMMERCIAL_SYNC_DEGRADED", {
      outcome: "degraded",
      status: 200,
      errorCategory: "internal",
      paymentId: args.payment.id,
      mercadoPagoPaymentId: args.paymentInfo.id,
      financialState: args.financialState
    }, closingSyncError);
  }
}

async function sendPaymentConfirmationMessage(
  supabase: any,
  lead: any,
  paymentId: string,
  log: PaymentWebhookLogger
) {
  try {
    const confirmationMessage = `Recebemos a confirmacao do seu pagamento.

Agora vamos dar andamento ao seu atendimento com prioridade.

Em instantes voce recebera as proximas orientacoes.`;

    await supabase.from("noemia_lead_conversations").insert({
      lead_id: lead.id,
      message: confirmationMessage,
      sender: "noemia",
      message_type: "payment_confirmation",
      metadata: {
        payment_confirmed: true,
        payment_id: paymentId,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    log("warn", "PAYMENT_WEBHOOK_CONFIRMATION_MESSAGE_FAILED", {
      outcome: "degraded",
      status: 200,
      errorCategory: "internal",
      leadId: lead?.id || null
    }, error);
  }
}

async function applyPaymentBusinessSideEffects(args: {
  supabase: any;
  payment: PersistedPaymentRecord;
  leadId: string;
  offerCode: string;
  paymentInfo: any;
  previousFinancialState: PaymentFinancialState;
  nextFinancialState: PaymentFinancialState;
  transitionKey: string;
  now: string;
  log: PaymentWebhookLogger;
}) {
  const leadPatch = buildLeadPaymentPatch({
    paymentId: args.payment.id,
    financialState: args.nextFinancialState,
    now: args.now
  });

  const leadUpdate = await args.supabase
    .from("noemia_leads")
    .update(leadPatch)
    .eq("id", args.leadId)
    .select()
    .maybeSingle();

  if (leadUpdate.error) {
    throw leadUpdate.error;
  }

  await applyCommercialProjection({
    supabase: args.supabase,
    payment: args.payment,
    paymentInfo: args.paymentInfo,
    financialState: args.nextFinancialState,
    now: args.now,
    log: args.log
  });

  const offer = getRevenueOfferByCode(
    args.payment?.metadata?.offer_code || args.paymentInfo.metadata?.offer_code || args.offerCode
  );

  if (args.nextFinancialState === "approved") {
    await sendPaymentConfirmationMessage(
      args.supabase,
      leadUpdate.data,
      args.payment.id,
      args.log
    );

    try {
      const { error: followUpError } = await args.supabase.from("follow_up_events").insert({
        lead_id: args.leadId,
        event_type: "payment_confirmed",
        trigger: "automatic",
        message: "Pagamento conciliado automaticamente via webhook",
        metadata: {
          payment_id: args.payment.id,
          mercado_pago_payment_id: args.paymentInfo.id,
          amount: args.paymentInfo.transaction_amount,
          payment_method: args.paymentInfo.payment_method_id,
          transition_key: args.transitionKey
        },
        sent_at: args.now
      });

      if (followUpError) {
        args.log("warn", "PAYMENT_WEBHOOK_APPROVAL_FOLLOWUP_DEGRADED", {
          outcome: "degraded",
          status: 200,
          errorCategory: "internal",
          leadId: args.leadId,
          paymentId: args.payment.id,
          mercadoPagoPaymentId: args.paymentInfo.id
        }, followUpError);
      }
    } catch (followUpInsertError) {
      args.log("warn", "PAYMENT_WEBHOOK_APPROVAL_FOLLOWUP_CRASHED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "internal",
        leadId: args.leadId,
        paymentId: args.payment.id,
        mercadoPagoPaymentId: args.paymentInfo.id
      }, followUpInsertError);
    }

    try {
      await recordRevenueTelemetry({
        eventKey: "payment_approved",
        pagePath: "/pagamento/sucesso",
        payload: {
          lead_id: args.leadId,
          payment_id: args.payment.id,
          external_id: args.paymentInfo.id,
          amount: args.paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind,
          monetization_path:
            args.payment?.metadata?.monetization_path ||
            args.paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow",
          monetization_source:
            args.payment?.metadata?.monetization_source ||
            args.paymentInfo.metadata?.monetization_source ||
            "noemia",
          payment_method: args.paymentInfo.payment_method_id
        }
      });

      await recordRevenueTelemetry({
        eventKey: offer.kind === "analysis" ? "paid_analysis" : "paid_consultation",
        pagePath: "/pagamento/sucesso",
        payload: {
          lead_id: args.leadId,
          payment_id: args.payment.id,
          amount: args.paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind
        }
      });

      await recordRevenueTelemetry({
        eventKey: "revenue_confirmed",
        pagePath: "/pagamento/sucesso",
        payload: {
          lead_id: args.leadId,
          payment_id: args.payment.id,
          amount: args.paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind,
          monetization_path:
            args.payment?.metadata?.monetization_path ||
            args.paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow"
        }
      });

      if (args.previousFinancialState === "failed") {
        await recordRevenueTelemetry({
          eventKey: "payment_recovered",
          pagePath: "/pagamento/sucesso",
          payload: {
            lead_id: args.leadId,
            payment_id: args.payment.id,
            amount: args.paymentInfo.transaction_amount,
            offer_code: offer.code,
            offer_kind: offer.kind
          }
        });
      }
    } catch (trackingError) {
      args.log("warn", "PAYMENT_WEBHOOK_APPROVAL_TELEMETRY_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "provider",
        leadId: args.leadId,
        paymentId: args.payment.id
      }, trackingError);
    }
    return;
  }

  if (args.nextFinancialState === "pending") {
    try {
      await recordRevenueTelemetry({
        eventKey: "payment_pending",
        pagePath: "/pagamento/pendente",
        payload: {
          lead_id: args.leadId,
          payment_id: args.payment.id,
          external_id: args.paymentInfo.id,
          amount: args.paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind,
          monetization_path:
            args.payment?.metadata?.monetization_path ||
            args.paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow"
        }
      });
    } catch (trackingError) {
      args.log("warn", "PAYMENT_WEBHOOK_PENDING_TELEMETRY_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "provider",
        leadId: args.leadId
      }, trackingError);
    }
    return;
  }

  if (args.nextFinancialState === "failed" || args.nextFinancialState === "expired" || args.nextFinancialState === "cancelled") {
    try {
      await recordRevenueTelemetry({
        eventKey: "payment_failed",
        pagePath: "/pagamento/falha",
        payload: {
          lead_id: args.leadId,
          payment_id: args.payment.id,
          external_id: args.paymentInfo.id,
          offer_code: offer.code,
          offer_kind: offer.kind,
          amount: args.paymentInfo.transaction_amount,
          status_detail: args.paymentInfo.status_detail,
          financial_state: args.nextFinancialState,
          monetization_path:
            args.payment?.metadata?.monetization_path ||
            args.paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow"
        }
      });

      await recordRevenueTelemetry({
        eventKey: "payment_followup_needed",
        pagePath: "/pagamento/falha",
        payload: {
          lead_id: args.leadId,
          payment_id: args.payment.id,
          offer_code: offer.code,
          offer_kind: offer.kind,
          reason: args.nextFinancialState
        }
      });
    } catch (trackingError) {
      args.log("warn", "PAYMENT_WEBHOOK_FAILURE_TELEMETRY_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "provider",
        leadId: args.leadId
      }, trackingError);
    }
  }
}

async function handlePaymentWebhookState(
  supabase: any,
  paymentInfo: any,
  log: PaymentWebhookLogger
) {
  const reference = parseExternalReference(paymentInfo.external_reference);

  if (!reference) {
    log("error", "PAYMENT_WEBHOOK_INVALID_EXTERNAL_REFERENCE", {
      outcome: "failed",
      status: 200,
      errorCategory: "validation",
      externalReference: paymentInfo.external_reference
    });
    return;
  }

  const paymentRecord = await findPaymentRecordForWebhook(supabase, reference.leadId, {
    externalReference: paymentInfo.external_reference,
    providerPaymentId: paymentInfo.id
  });

  if (!paymentRecord?.id) {
    log("error", "PAYMENT_WEBHOOK_PAYMENT_NOT_FOUND", {
      outcome: "failed",
      status: 200,
      errorCategory: "not_found",
      leadId: reference.leadId,
      externalReference: paymentInfo.external_reference
    });
    return;
  }

  const now = new Date().toISOString();
  const previousFinancialState = getPersistedFinancialState(paymentRecord);
  const nextFinancialState = mapMercadoPagoStatusToFinancialState(paymentInfo);
  const transitionKey = buildPaymentTransitionKey({
    paymentId: paymentRecord.id,
    providerPaymentId: paymentInfo.id,
    financialState: nextFinancialState,
    stage: "webhook"
  });
  const mergedMetadata = mergeMercadoPagoMetadata(paymentRecord.metadata, paymentInfo);
  const transitionAllowed = canApplyPaymentTransition({
    currentState: previousFinancialState,
    nextState: nextFinancialState
  });

  if (!transitionAllowed) {
    await supabase
      .from("payments")
      .update({
        webhook_received_at: now,
        webhook_validated_at: now,
        technical_state: "webhook_ignored",
        last_provider_status: paymentInfo.status,
        last_provider_payment_id: String(paymentInfo.id),
        last_event_key: buildPaymentIgnoredTransitionKey({
          paymentId: paymentRecord.id,
          providerPaymentId: paymentInfo.id,
          financialState: nextFinancialState
        }),
        status_detail: paymentInfo.status_detail,
        metadata: mergedMetadata
      })
      .eq("id", paymentRecord.id);

    log("warn", "PAYMENT_WEBHOOK_STALE_TRANSITION_IGNORED", {
      outcome: "ignored",
      status: 200,
      leadId: reference.leadId,
      paymentId: paymentRecord.id,
      previousFinancialState,
      nextFinancialState
    });
    return;
  }

  const financialRowStatus = mapFinancialStateToPaymentRowStatus(nextFinancialState);
  const technicalState: PaymentTechnicalState =
    previousFinancialState === nextFinancialState ? "webhook_validated" : "reconciled";
  const approvedAt =
    nextFinancialState === "approved" ? paymentRecord.approved_at || now : paymentRecord.approved_at || null;
  const rejectedAt =
    nextFinancialState === "failed" || nextFinancialState === "expired" || nextFinancialState === "cancelled"
      ? paymentRecord.rejected_at || now
      : paymentRecord.rejected_at || null;

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .update({
      external_id: String(paymentInfo.id),
      external_reference:
        typeof paymentInfo.external_reference === "string"
          ? paymentInfo.external_reference
          : paymentRecord.external_reference || null,
      status: financialRowStatus,
      financial_state: nextFinancialState,
      technical_state: technicalState,
      payment_method_id: paymentInfo.payment_method_id,
      payment_type_id: paymentInfo.payment_type_id,
      status_detail: paymentInfo.status_detail,
      transaction_amount: paymentInfo.transaction_amount,
      approved_at: approvedAt,
      rejected_at: rejectedAt,
      active_for_lead: nextFinancialState === "pending" || nextFinancialState === "approved",
      webhook_received_at: now,
      webhook_validated_at: now,
      last_provider_status: paymentInfo.status,
      last_provider_payment_id: String(paymentInfo.id),
      last_event_key: transitionKey,
      last_reconciled_at: now,
      expired_at: nextFinancialState === "expired" ? now : null,
      cancelled_at: nextFinancialState === "cancelled" ? now : null,
      refunded_at: nextFinancialState === "refunded" ? now : null,
      charged_back_at: nextFinancialState === "charged_back" ? now : null,
      metadata: mergedMetadata
    })
    .eq("id", paymentRecord.id)
    .select()
    .single();

  if (paymentError) {
    throw paymentError;
  }

  const transitionClaim = await claimPaymentTransitionEvent({
    supabase,
    paymentId: payment.id,
    transitionKey,
    providerPaymentId: String(paymentInfo.id),
    providerStatus: paymentInfo.status,
    financialState: nextFinancialState,
    technicalState,
    payload: {
      lead_id: reference.leadId,
      previous_financial_state: previousFinancialState,
      next_financial_state: nextFinancialState,
      external_reference: paymentInfo.external_reference || null,
      status_detail: paymentInfo.status_detail || null
    }
  });

  if (!transitionClaim.claimed) {
    if (transitionClaim.recoverable) {
      log("warn", "PAYMENT_WEBHOOK_TRANSITION_RECOVERY", {
        outcome: "reprocessing",
        status: 200,
        leadId: reference.leadId,
        paymentId: payment.id,
        previousFinancialState,
        nextFinancialState
      });
    } else {
      log("info", "PAYMENT_WEBHOOK_TRANSITION_REPLAY", {
        outcome: "replay",
        status: 200,
        leadId: reference.leadId,
        paymentId: payment.id,
        previousFinancialState,
        nextFinancialState
      });
      return;
    }
  }

  await applyPaymentBusinessSideEffects({
    supabase,
    payment,
    leadId: reference.leadId,
    offerCode: reference.offerCode,
    paymentInfo,
    previousFinancialState,
    nextFinancialState,
    transitionKey,
    now,
    log
  });

  await supabase
    .from("payments")
    .update({
      commercial_effect_applied_at: now,
      commercial_effect_key: transitionKey,
      updated_at: now
    })
    .eq("id", payment.id);

  await finalizePaymentTransitionEvent({
    supabase,
    transitionKey,
    sideEffectApplied: true
  });
}

export async function POST(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "payment_webhook",
    provider: "mercado_pago"
  });
  const log = createPaymentWebhookLogger(observation);
  const context = getWebhookContext();

  if (!context.ok) {
    log("error", "PAYMENT_WEBHOOK_CONFIG_MISSING", {
      outcome: "failed",
      status: 503,
      errorCategory: "configuration",
      missing: context.missing
    });
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "payment_webhook_not_configured" },
      { status: 503 }
    );
  }

  const { mercadopago, supabase, webhookSecret } = context.value;

  try {
    const body = await request.text();

    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      log("warn", "PAYMENT_WEBHOOK_INVALID_JSON", {
        outcome: "failed",
        status: 400,
        errorCategory: "validation"
      }, parseError);
      return createObservedJsonResponse(
        observation,
        { ok: false, error: "invalid_json" },
        { status: 400 }
      );
    }

    const signatureValidation = validateMercadoPagoWebhookSignature({
      request,
      event,
      webhookSecret
    });

    if (!signatureValidation.ok) {
      log("warn", "PAYMENT_WEBHOOK_SIGNATURE_REJECTED", {
        outcome: "denied",
        status: signatureValidation.status,
        errorCategory:
          signatureValidation.code === "missing_secret" ? "configuration" : "authentication",
        code: signatureValidation.code
      });

      return createObservedJsonResponse(
        observation,
        { ok: false, error: "invalid_webhook_signature", code: signatureValidation.code },
        { status: signatureValidation.status }
      );
    }

    if (event.type !== "payment") {
      log("info", "PAYMENT_WEBHOOK_IGNORED_NON_PAYMENT", {
        outcome: "ignored",
        status: 200,
        type: event.type
      });
      return createObservedJsonResponse(observation, { received: true }, { status: 200 });
    }

    const payment = new Payment(mercadopago);
    const paymentInfo = await payment.get({ id: event.data.id });
    const normalizedFinancialState = mapMercadoPagoStatusToFinancialState(paymentInfo);

    log("info", "PAYMENT_WEBHOOK_PAYMENT_FETCHED", {
      outcome: "processing",
      status: 200,
      paymentId: paymentInfo.id,
      paymentStatus: paymentInfo.status,
      paymentFinancialState: normalizedFinancialState,
      status_detail: paymentInfo.status_detail,
      external_reference: paymentInfo.external_reference
    });

    await handlePaymentWebhookState(supabase, paymentInfo, log);

    log("info", "PAYMENT_WEBHOOK_PROCESSED", {
      outcome: "success",
      status: 200,
      paymentStatus: paymentInfo.status,
      paymentFinancialState: normalizedFinancialState,
      paymentId: paymentInfo.id
    });

    return createObservedJsonResponse(observation, { received: true }, { status: 200 });
  } catch (error) {
    log("error", "PAYMENT_WEBHOOK_FAILED", {
      outcome: "failed",
      status: 500,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "internal_server_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "payment_webhook_diagnostics",
    provider: "mercado_pago"
  });
  const diagnosticsAccess = await requireRouteSecretOrStaffAccess({
    request,
    service: "payment_webhook",
    action: "diagnostics",
    expectedSecret: process.env.INTERNAL_API_SECRET?.trim(),
    secretName: "INTERNAL_API_SECRET",
    errorMessage: "Apenas operadores autenticados podem ver diagnosticos do webhook.",
    headerNames: ["x-internal-api-secret"],
    allowStaffFallback: true
  });

  if (!diagnosticsAccess.ok) {
    logObservedRequest("warn", "PAYMENT_WEBHOOK_DIAGNOSTICS_DENIED", observation, {
      flow: "payment_webhook_diagnostics",
      provider: "mercado_pago",
      outcome: "denied",
      status: diagnosticsAccess.status,
      errorCategory: "boundary"
    });
    return diagnosticsAccess.response;
  }

  const diagnostics = getPaymentRuntimeDiagnostics();
  const paymentReadiness = buildPaymentReadinessSection();

  logObservedRequest("info", "PAYMENT_WEBHOOK_DIAGNOSTICS_READY", observation, {
    flow: "payment_webhook_diagnostics",
    provider: "mercado_pago",
    outcome: paymentReadiness.status === "healthy" ? "success" : "degraded",
    status: 200,
    runtimeState: paymentReadiness.status
  });

  return createObservedJsonResponse(observation, {
    status: paymentReadiness.status,
    timestamp: new Date().toISOString(),
    message: "Webhook do Mercado Pago esta acessivel para validacao e monitoramento.",
    summary: paymentReadiness.summary,
    validation: {
      topic: request.nextUrl.searchParams.get("topic"),
      id: request.nextUrl.searchParams.get("id"),
      dataId: request.nextUrl.searchParams.get("data.id")
    },
    runtime: diagnostics,
    operatorAction: paymentReadiness.operatorAction,
    verification: paymentReadiness.verification,
    signature: {
      enforced: diagnostics.signatureEnforced,
      secretConfigured: diagnostics.webhookSecretConfigured
    }
  });
}
