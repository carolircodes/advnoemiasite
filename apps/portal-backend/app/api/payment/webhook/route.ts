import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import {
  computeHmacSha256Hex,
  parseMercadoPagoSignatureInput,
  shouldEnforceWebhookSignature,
  timingSafeEqualText
} from "@/lib/http/webhook-security";
import { getRevenueOfferByCode } from "@/lib/services/revenue-architecture";
import { recordRevenueTelemetry } from "@/lib/services/revenue-telemetry";
import { commercialClosingService } from "@/lib/services/commercial-closing";
import { commercialAppointmentService } from "@/lib/services/commercial-appointment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type PaymentWebhookContext = {
  mercadopago: MercadoPagoConfig;
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  webhookSecret?: string;
};

type ParsedExternalReference = {
  offerCode: string;
  leadId: string;
};

type WebhookRuntimeDiagnostics = {
  mercadoPagoAccessTokenConfigured: boolean;
  mercadoPagoPublicKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseSecretConfigured: boolean;
  siteUrlConfigured: boolean;
  siteUrlSource:
    | "NEXT_PUBLIC_SITE_URL"
    | "NEXT_PUBLIC_PUBLIC_SITE_URL"
    | "NEXT_PUBLIC_BASE_URL"
    | "NEXT_PUBLIC_APP_URL"
    | null;
};

function getWebhookRuntimeDiagnostics(): WebhookRuntimeDiagnostics {
  const siteUrlSource = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    ? "NEXT_PUBLIC_SITE_URL"
    : process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.trim()
      ? "NEXT_PUBLIC_PUBLIC_SITE_URL"
      : process.env.NEXT_PUBLIC_BASE_URL?.trim()
        ? "NEXT_PUBLIC_BASE_URL"
        : process.env.NEXT_PUBLIC_APP_URL?.trim()
          ? "NEXT_PUBLIC_APP_URL"
          : null;

  return {
    mercadoPagoAccessTokenConfigured: Boolean(
      process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()
    ),
    mercadoPagoPublicKeyConfigured: Boolean(
      process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim()
    ),
    webhookSecretConfigured: Boolean(
      process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()
    ),
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseSecretConfigured: Boolean(
      process.env.SUPABASE_SECRET_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ),
    siteUrlConfigured: Boolean(siteUrlSource),
    siteUrlSource
  };
}

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
    !supabaseSecretKey ? "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY" : null
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

function paymentWebhookUnavailableResponse(missing: string[]) {
  console.error("[payment.webhook] Missing required payment configuration", {
    missing
  });

  return jsonError("payment_webhook_not_configured", 503);
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
  const enforceSignature = shouldEnforceWebhookSignature(
    "MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE"
  );

  if (!args.webhookSecret) {
    return {
      ok: !enforceSignature,
      status: enforceSignature ? 503 : 200,
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
      ok: !enforceSignature,
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
      ok: !enforceSignature,
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
  const context = getWebhookContext();

  if (!context.ok) {
    return paymentWebhookUnavailableResponse(context.missing);
  }

  const { mercadopago, supabase, webhookSecret } = context.value;

  try {
    const body = await request.text();

    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error("[payment.webhook] Invalid JSON payload", { parseError });
      return jsonError("invalid_json", 400);
    }

    const signatureValidation = validateMercadoPagoWebhookSignature({
      request,
      event,
      webhookSecret
    });

    if (!signatureValidation.ok) {
      console.error("[payment.webhook] Signature validation failed", {
        code: signatureValidation.code,
        enforceSignature: shouldEnforceWebhookSignature(
          "MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE"
        )
      });

      return NextResponse.json(
        { ok: false, error: "invalid_webhook_signature", code: signatureValidation.code },
        { status: signatureValidation.status }
      );
    }

    if (signatureValidation.code !== "validated") {
      console.warn("[payment.webhook] Signature validation bypassed", {
        code: signatureValidation.code,
        enforceSignature: shouldEnforceWebhookSignature(
          "MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE"
        )
      });
    }

    if (event.type !== "payment") {
      console.log("[payment.webhook] Ignoring non-payment event", {
        type: event.type
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const payment = new Payment(mercadopago);
    const paymentInfo = await payment.get({ id: event.data.id });

    console.log("[payment.webhook] Payment fetched", {
      id: paymentInfo.id,
      status: paymentInfo.status,
      status_detail: paymentInfo.status_detail,
      external_reference: paymentInfo.external_reference
    });

    if (paymentInfo.status === "approved") {
      await handleApprovedPayment(supabase, paymentInfo);
    } else if (paymentInfo.status === "rejected") {
      await handleRejectedPayment(supabase, paymentInfo);
    } else if (paymentInfo.status === "pending") {
      await handlePendingPayment(supabase, paymentInfo);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[payment.webhook] Internal error", {
      error: extractErrorMessage(error, "internal_server_error")
    });
    return jsonError("internal_server_error", 500);
  }
}

async function handleApprovedPayment(supabase: any, paymentInfo: any) {
  try {
    const reference = parseExternalReference(paymentInfo.external_reference);

    if (!reference) {
      console.error("[payment.webhook] Invalid external reference", {
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
      console.log("[payment.webhook] Payment already processed; replaying reconciliation", {
        paymentId: paymentInfo.id,
        leadId
      });
    }

    if (!previousPayment?.id) {
      console.error("[payment.webhook] Payment record not found for approval", {
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
      console.error("[payment.webhook] Failed to update payment", { paymentError });
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
      console.error("[payment.webhook] Failed to update lead", { leadError });
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
      console.error("[payment.webhook] Failed to sync approved closing state", {
        closingSyncError,
        paymentId: payment?.id,
        mercadoPagoPaymentId: paymentInfo.id
      });
    }

    await sendPaymentConfirmationMessage(supabase, lead);

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
        console.error("[payment.webhook] Failed to persist follow-up event", {
          followUpError,
          leadId,
          paymentId: payment.id,
          mercadoPagoPaymentId: paymentInfo.id
        });
      }
    } catch (followUpInsertError) {
      console.error("[payment.webhook] Follow-up event insert crashed", {
        followUpInsertError,
        leadId,
        paymentId: payment.id,
        mercadoPagoPaymentId: paymentInfo.id
      });
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
      console.error("[payment.webhook] Failed to record approval telemetry", {
        trackingError
      });
    }
  } catch (error) {
    console.error("[payment.webhook] Error processing approved payment", { error });
  }
}

async function handleRejectedPayment(supabase: any, paymentInfo: any) {
  try {
    const reference = parseExternalReference(paymentInfo.external_reference);

    if (!reference) {
      console.error("[payment.webhook] Invalid external reference", {
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
      console.error("[payment.webhook] Payment record not found for rejection", {
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
      console.error("[payment.webhook] Failed to sync rejected closing state", {
        closingSyncError,
        leadId,
        mercadoPagoPaymentId: paymentInfo.id
      });
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
      console.error("[payment.webhook] Failed to record rejection telemetry", {
        trackingError
      });
    }
  } catch (error) {
    console.error("[payment.webhook] Error processing rejected payment", { error });
  }
}

async function handlePendingPayment(supabase: any, paymentInfo: any) {
  try {
    const reference = parseExternalReference(paymentInfo.external_reference);

    if (!reference) {
      console.error("[payment.webhook] Invalid external reference", {
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
      console.error("[payment.webhook] Payment record not found for pending update", {
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
      console.error("[payment.webhook] Failed to sync pending closing state", {
        closingSyncError,
        leadId,
        mercadoPagoPaymentId: paymentInfo.id
      });
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
      console.error("[payment.webhook] Failed to record pending telemetry", {
        trackingError
      });
    }
  } catch (error) {
    console.error("[payment.webhook] Error processing pending payment", { error });
  }
}

async function sendPaymentConfirmationMessage(
  supabase: any,
  lead: any
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
    console.error("[payment.webhook] Failed to send confirmation message", { error });
  }
}

export async function GET(request: NextRequest) {
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
    return NextResponse.json({
      status: "webhook_active",
      timestamp: new Date().toISOString(),
      message: "Webhook do Mercado Pago acessivel."
    });
  }

  const diagnostics = getWebhookRuntimeDiagnostics();

  return NextResponse.json({
    status: "webhook_active",
    timestamp: new Date().toISOString(),
    message: "Webhook do Mercado Pago esta acessivel para validacao e monitoramento.",
    validation: {
      topic: request.nextUrl.searchParams.get("topic"),
      id: request.nextUrl.searchParams.get("id"),
      dataId: request.nextUrl.searchParams.get("data.id")
    },
    runtime: diagnostics,
    signature: {
      enforced: shouldEnforceWebhookSignature("MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE"),
      secretConfigured: diagnostics.webhookSecretConfigured
    }
  });
}
