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
    mercado_pago_status_detail: paymentInfo.status_detail
  };
}

async function findPaymentRecordForWebhook(
  supabase: any,
  leadId: string,
  externalReference: string | null | undefined
) {
  const paymentsLookup = await supabase
    .from("payments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (paymentsLookup.error) {
    throw paymentsLookup.error;
  }

  const payments = Array.isArray(paymentsLookup.data) ? paymentsLookup.data : [];

  if (externalReference) {
    const matchedPayment = payments.find(
      (payment: any) => payment?.metadata?.external_reference === externalReference
    );

    if (matchedPayment) {
      return matchedPayment;
    }
  }

  return payments[0] || null;
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

    log("info", "PAYMENT_WEBHOOK_PAYMENT_FETCHED", {
      outcome: "processing",
      status: 200,
      paymentId: paymentInfo.id,
      paymentStatus: paymentInfo.status,
      status_detail: paymentInfo.status_detail,
      external_reference: paymentInfo.external_reference
    });

    if (paymentInfo.status === "approved") {
      await handleApprovedPayment(supabase, paymentInfo, log);
    } else if (paymentInfo.status === "rejected") {
      await handleRejectedPayment(supabase, paymentInfo, log);
    } else if (paymentInfo.status === "pending") {
      await handlePendingPayment(supabase, paymentInfo, log);
    }

    log("info", "PAYMENT_WEBHOOK_PROCESSED", {
      outcome: "success",
      status: 200,
      paymentStatus: paymentInfo.status,
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

async function handleApprovedPayment(supabase: any, paymentInfo: any, log: PaymentWebhookLogger) {
  try {
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

    const { offerCode, leadId } = reference;

    const { data: existingApprovedPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "approved")
      .single();

    const previousPayment =
      existingApprovedPayment ||
      (await findPaymentRecordForWebhook(
        supabase,
        leadId,
        paymentInfo.external_reference
      ));

    if (existingApprovedPayment) {
      log("info", "PAYMENT_WEBHOOK_APPROVAL_REPLAY", {
        outcome: "replay",
        status: 200,
        paymentId: paymentInfo.id,
        leadId
      });
    }

    if (!previousPayment?.id) {
      log("error", "PAYMENT_WEBHOOK_APPROVAL_PAYMENT_NOT_FOUND", {
        outcome: "failed",
        status: 200,
        errorCategory: "not_found",
        leadId,
        externalReference: paymentInfo.external_reference
      });
      return;
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update({
        external_id: String(paymentInfo.id),
        status: "approved",
        payment_method_id: paymentInfo.payment_method_id,
        payment_type_id: paymentInfo.payment_type_id,
        status_detail: paymentInfo.status_detail,
        transaction_amount: paymentInfo.transaction_amount,
        approved_at: previousPayment.approved_at || new Date().toISOString(),
        metadata: mergeMercadoPagoMetadata(previousPayment?.metadata, paymentInfo)
      })
      .eq("id", previousPayment?.id)
      .select()
      .single();

    if (paymentError) {
      log("error", "PAYMENT_WEBHOOK_APPROVAL_UPDATE_PAYMENT_FAILED", {
        outcome: "failed",
        status: 200,
        errorCategory: "internal"
      }, paymentError);
      return;
    }

    const { data: lead, error: leadError } = await supabase
      .from("noemia_leads")
      .update({
        status: "paid",
        payment_status: "confirmed",
        payment_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId)
      .select()
      .single();

    if (leadError) {
      log("error", "PAYMENT_WEBHOOK_APPROVAL_UPDATE_LEAD_FAILED", {
        outcome: "failed",
        status: 200,
        errorCategory: "internal",
        leadId
      }, leadError);
      return;
    }

    const offer = getRevenueOfferByCode(
      payment?.metadata?.offer_code || paymentInfo.metadata?.offer_code || offerCode
    );

    try {
      const profileId =
        typeof payment?.user_id === "string"
          ? payment.user_id
          : typeof previousPayment?.user_id === "string"
            ? previousPayment.user_id
            : null;

      if (profileId) {
        const assessment = await commercialClosingService.syncPipelineClosingFromProfile({
          profileId,
          payload: {
            paymentState: "approved",
            paymentApprovedAt: new Date().toISOString(),
            paymentReference: String(paymentInfo.id),
            consultationOfferAmount:
              typeof paymentInfo.transaction_amount === "number"
                ? paymentInfo.transaction_amount
                : null
          }
        });

        if (assessment?.pipelineId) {
          await commercialAppointmentService.syncFormalConsultation({
            pipelineId: assessment.pipelineId,
            source: "payment_webhook",
            createEvent: false
          });
        }
      }
    } catch (closingSyncError) {
      log("warn", "PAYMENT_WEBHOOK_APPROVAL_COMMERCIAL_SYNC_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "internal",
        paymentId: payment?.id,
        mercadoPagoPaymentId: paymentInfo.id
      }, closingSyncError);
    }

    await sendPaymentConfirmationMessage(supabase, lead, log);

    try {
      const { error: followUpError } = await supabase.from("follow_up_events").insert({
        lead_id: leadId,
        event_type: "payment_confirmed",
        trigger: "automatic",
        message: "Pagamento confirmado automaticamente via webhook",
        metadata: {
          payment_id: payment.id,
          mercado_pago_payment_id: paymentInfo.id,
          amount: paymentInfo.transaction_amount,
          payment_method: paymentInfo.payment_method_id
        },
        sent_at: new Date().toISOString()
      });

      if (followUpError) {
        log("warn", "PAYMENT_WEBHOOK_APPROVAL_FOLLOWUP_DEGRADED", {
          outcome: "degraded",
          status: 200,
          errorCategory: "internal",
          leadId,
          paymentId: payment.id,
          mercadoPagoPaymentId: paymentInfo.id
        }, followUpError);
      }
    } catch (followUpInsertError) {
      log("warn", "PAYMENT_WEBHOOK_APPROVAL_FOLLOWUP_CRASHED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "internal",
        leadId,
        paymentId: payment.id,
        mercadoPagoPaymentId: paymentInfo.id
      }, followUpInsertError);
    }

    try {
      await recordRevenueTelemetry({
        eventKey: "payment_approved",
        pagePath: "/pagamento/sucesso",
        payload: {
          lead_id: leadId,
          payment_id: payment.id,
          external_id: paymentInfo.id,
          amount: paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind,
          monetization_path:
            payment?.metadata?.monetization_path ||
            paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow",
          monetization_source:
            payment?.metadata?.monetization_source ||
            paymentInfo.metadata?.monetization_source ||
            "noemia",
          payment_method: paymentInfo.payment_method_id
        }
      });

      await recordRevenueTelemetry({
        eventKey: offer.kind === "analysis" ? "paid_analysis" : "paid_consultation",
        pagePath: "/pagamento/sucesso",
        payload: {
          lead_id: leadId,
          payment_id: payment.id,
          amount: paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind
        }
      });

      await recordRevenueTelemetry({
        eventKey: "revenue_confirmed",
        pagePath: "/pagamento/sucesso",
        payload: {
          lead_id: leadId,
          payment_id: payment.id,
          amount: paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind,
          monetization_path:
            payment?.metadata?.monetization_path ||
            paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow"
        }
      });

      if (previousPayment?.status === "rejected") {
        await recordRevenueTelemetry({
          eventKey: "payment_recovered",
          pagePath: "/pagamento/sucesso",
          payload: {
            lead_id: leadId,
            payment_id: payment.id,
            amount: paymentInfo.transaction_amount,
            offer_code: offer.code,
            offer_kind: offer.kind
          }
        });
      }
    } catch (trackingError) {
      log("warn", "PAYMENT_WEBHOOK_APPROVAL_TELEMETRY_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "provider",
        leadId,
        paymentId: payment?.id || null
      }, trackingError);
    }
  } catch (error) {
    log("error", "PAYMENT_WEBHOOK_APPROVAL_FAILED", {
      outcome: "failed",
      status: 200,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);
  }
}

async function handleRejectedPayment(supabase: any, paymentInfo: any, log: PaymentWebhookLogger) {
  try {
    const reference = parseExternalReference(paymentInfo.external_reference);

    if (!reference) {
      log("error", "PAYMENT_WEBHOOK_REJECTION_INVALID_REFERENCE", {
        outcome: "failed",
        status: 200,
        errorCategory: "validation",
        externalReference: paymentInfo.external_reference
      });
      return;
    }

    const { offerCode, leadId } = reference;

    const previousPayment = await findPaymentRecordForWebhook(
      supabase,
      leadId,
      paymentInfo.external_reference
    );

    if (!previousPayment?.id) {
      log("error", "PAYMENT_WEBHOOK_REJECTION_PAYMENT_NOT_FOUND", {
        outcome: "failed",
        status: 200,
        errorCategory: "not_found",
        leadId,
        externalReference: paymentInfo.external_reference
      });
      return;
    }

    const { data: payment } = await supabase
      .from("payments")
      .update({
        external_id: String(paymentInfo.id),
        status: "rejected",
        status_detail: paymentInfo.status_detail,
        rejected_at: new Date().toISOString(),
        metadata: mergeMercadoPagoMetadata(previousPayment?.metadata, paymentInfo)
      })
      .eq("id", previousPayment?.id)
      .select()
      .maybeSingle();

    await supabase
      .from("noemia_leads")
      .update({
        payment_status: "rejected",
        payment_rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId);

    try {
      const profileId =
        typeof payment?.user_id === "string"
          ? payment.user_id
          : typeof previousPayment?.user_id === "string"
            ? previousPayment.user_id
            : null;

      if (profileId) {
        const assessment = await commercialClosingService.syncPipelineClosingFromProfile({
          profileId,
          payload: {
            paymentState: "failed",
            paymentFailedAt: new Date().toISOString(),
            paymentReference: String(paymentInfo.id)
          }
        });

        if (assessment?.pipelineId) {
          await commercialAppointmentService.syncFormalConsultation({
            pipelineId: assessment.pipelineId,
            source: "payment_webhook",
            createEvent: false
          });
        }
      }
    } catch (closingSyncError) {
      log("warn", "PAYMENT_WEBHOOK_REJECTION_COMMERCIAL_SYNC_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "internal",
        leadId,
        mercadoPagoPaymentId: paymentInfo.id
      }, closingSyncError);
    }

    try {
      const offer = getRevenueOfferByCode(
        payment?.metadata?.offer_code || paymentInfo.metadata?.offer_code || offerCode
      );

      await recordRevenueTelemetry({
        eventKey: "payment_failed",
        pagePath: "/pagamento/falha",
        payload: {
          lead_id: leadId,
          payment_id: payment?.id || null,
          external_id: paymentInfo.id,
          offer_code: offer.code,
          offer_kind: offer.kind,
          amount: paymentInfo.transaction_amount,
          status_detail: paymentInfo.status_detail,
          monetization_path:
            payment?.metadata?.monetization_path ||
            paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow"
        }
      });

      await recordRevenueTelemetry({
        eventKey: "payment_followup_needed",
        pagePath: "/pagamento/falha",
        payload: {
          lead_id: leadId,
          payment_id: payment?.id || null,
          offer_code: offer.code,
          offer_kind: offer.kind,
          reason: "payment_failed"
        }
      });
    } catch (trackingError) {
      log("warn", "PAYMENT_WEBHOOK_REJECTION_TELEMETRY_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "provider",
        leadId
      }, trackingError);
    }
  } catch (error) {
    log("error", "PAYMENT_WEBHOOK_REJECTION_FAILED", {
      outcome: "failed",
      status: 200,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);
  }
}

async function handlePendingPayment(supabase: any, paymentInfo: any, log: PaymentWebhookLogger) {
  try {
    const reference = parseExternalReference(paymentInfo.external_reference);

    if (!reference) {
      log("error", "PAYMENT_WEBHOOK_PENDING_INVALID_REFERENCE", {
        outcome: "failed",
        status: 200,
        errorCategory: "validation",
        externalReference: paymentInfo.external_reference
      });
      return;
    }

    const { offerCode, leadId } = reference;

    const previousPayment = await findPaymentRecordForWebhook(
      supabase,
      leadId,
      paymentInfo.external_reference
    );

    if (!previousPayment?.id) {
      log("error", "PAYMENT_WEBHOOK_PENDING_PAYMENT_NOT_FOUND", {
        outcome: "failed",
        status: 200,
        errorCategory: "not_found",
        leadId,
        externalReference: paymentInfo.external_reference
      });
      return;
    }

    const { data: payment } = await supabase
      .from("payments")
      .update({
        external_id: String(paymentInfo.id),
        status: "pending",
        status_detail: paymentInfo.status_detail,
        metadata: mergeMercadoPagoMetadata(previousPayment?.metadata, paymentInfo)
      })
      .eq("id", previousPayment?.id)
      .select()
      .maybeSingle();

    try {
      const profileId =
        typeof payment?.user_id === "string"
          ? payment.user_id
          : typeof previousPayment?.user_id === "string"
            ? previousPayment.user_id
            : null;

      if (profileId) {
        const assessment = await commercialClosingService.syncPipelineClosingFromProfile({
          profileId,
          payload: {
            paymentState: "pending",
            paymentPendingAt: new Date().toISOString(),
            paymentReference: String(paymentInfo.id)
          }
        });

        if (assessment?.pipelineId) {
          await commercialAppointmentService.syncFormalConsultation({
            pipelineId: assessment.pipelineId,
            source: "payment_webhook",
            createEvent: false
          });
        }
      }
    } catch (closingSyncError) {
      log("warn", "PAYMENT_WEBHOOK_PENDING_COMMERCIAL_SYNC_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "internal",
        leadId,
        mercadoPagoPaymentId: paymentInfo.id
      }, closingSyncError);
    }

    try {
      const offer = getRevenueOfferByCode(
        payment?.metadata?.offer_code || previousPayment?.metadata?.offer_code || offerCode
      );

      await recordRevenueTelemetry({
        eventKey: "payment_pending",
        pagePath: "/pagamento/pendente",
        payload: {
          lead_id: leadId,
          payment_id: payment?.id || null,
          external_id: paymentInfo.id,
          amount: paymentInfo.transaction_amount,
          offer_code: offer.code,
          offer_kind: offer.kind,
          monetization_path:
            payment?.metadata?.monetization_path ||
            paymentInfo.metadata?.monetization_path ||
            "noemia_consultation_flow"
        }
      });
    } catch (trackingError) {
      log("warn", "PAYMENT_WEBHOOK_PENDING_TELEMETRY_DEGRADED", {
        outcome: "degraded",
        status: 200,
        errorCategory: "provider",
        leadId
      }, trackingError);
    }
  } catch (error) {
    log("error", "PAYMENT_WEBHOOK_PENDING_FAILED", {
      outcome: "failed",
      status: 200,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);
  }
}

async function sendPaymentConfirmationMessage(
  supabase: any,
  lead: any,
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
