import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import {
  buildRequestFingerprint,
  getClientIp,
  parseJsonBody
} from "@/lib/http/request-guards";
import {
  buildDurableRateLimitHeaders,
  buildIdempotencyFingerprint,
  claimDurableIdempotencyKey,
  completeDurableIdempotencyKey,
  consumeDurableRateLimit,
  failDurableIdempotencyKey
} from "@/lib/http/durable-abuse-protection";
import {
  amountCentsToDecimal,
  buildCheckoutPaymentMethods,
  normalizePhoneNumber,
  resolvePaymentPricing
} from "@/lib/payment/pricing";
import { buildPublicPaymentPayload } from "@/lib/payment/public-payment-payload";
import {
  buildSafePaymentMetadata,
  paymentCreateRequestSchema,
  publicPaymentLookupQuerySchema
} from "@/lib/payment/payment-security";
import { commercialClosingService } from "@/lib/services/commercial-closing";
import { commercialAppointmentService } from "@/lib/services/commercial-appointment";
import { getRevenueOfferByCode, getRevenueOfferByIntent } from "@/lib/services/revenue-architecture";
import { recordRevenueTelemetry } from "@/lib/services/revenue-telemetry";
type PaymentCreateContext = {
  mercadopago: MercadoPagoConfig;
  supabase: any;
  baseUrl: string;
};

function getPaymentCreateContext():
  | { ok: true; value: PaymentCreateContext }
  | { ok: false; missing: string[] } {
  const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  const missing = [
    !mercadoPagoAccessToken ? "MERCADO_PAGO_ACCESS_TOKEN" : null,
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseSecretKey ? "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY" : null,
    !baseUrl ? "NEXT_PUBLIC_BASE_URL|NEXT_PUBLIC_APP_URL" : null
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
      supabase: createClient(supabaseUrl as string, supabaseSecretKey as string) as any,
      baseUrl: baseUrl!.replace(/\/$/, "")
    }
  };
}

function paymentCreateUnavailableResponse(missing: string[]) {
  console.error("[payment.create] Missing required payment configuration", {
    missing
  });

  return jsonError("payment_create_not_configured", 503);
}

function extractLeadIdFromExternalReference(externalReference: string | null) {
  if (!externalReference) {
    return null;
  }

  const match = externalReference.match(/^(.*)_([0-9a-fA-F-]{36})_(\d+)$/);
  return match?.[2] || null;
}

type PersistedPaymentRecord = {
  amount?: number | null;
  payment_url?: string | null;
  external_id?: string | null;
  price_source?: string | null;
  final_amount_cents?: number | null;
  metadata?: Record<string, unknown> | null;
};

function shouldReusePendingPayment(
  pendingPayment: PersistedPaymentRecord | null,
  resolvedPricing: ReturnType<typeof resolvePaymentPricing>,
  offerCode: string
) {
  if (!pendingPayment) {
    return false;
  }

  const paymentMetadata = pendingPayment.metadata || {};
  const metadataFinalAmount =
    typeof paymentMetadata.final_amount_cents === "number"
      ? paymentMetadata.final_amount_cents
      : null;
  const metadataOfferCode =
    typeof paymentMetadata.offer_code === "string" ? paymentMetadata.offer_code : null;
  const metadataPriceSource =
    typeof paymentMetadata.price_source === "string" ? paymentMetadata.price_source : null;
  const pendingFinalAmountCents = pendingPayment.final_amount_cents ?? metadataFinalAmount;
  const pendingPriceSource = pendingPayment.price_source ?? metadataPriceSource;

  return (
    pendingFinalAmountCents === resolvedPricing.finalAmountCents &&
    metadataOfferCode === offerCode &&
    pendingPriceSource === resolvedPricing.priceSource
  );
}

export async function POST(request: NextRequest) {
  const context = getPaymentCreateContext();

  if (!context.ok) {
    return paymentCreateUnavailableResponse(context.missing);
  }

  const { mercadopago, supabase, baseUrl } = context.value;
  const rateLimit = await consumeDurableRateLimit({
    bucket: "payment-create",
    key: `${getClientIp(request)}:${request.headers.get("x-idempotency-key") || "none"}`,
    limit: 8,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    console.warn("[payment.create] Rate limit exceeded", {
      fingerprint: buildRequestFingerprint(request, "payment-create"),
      ipAddress: getClientIp(request)
    });

    return NextResponse.json(
      { ok: false, error: "payment_create_rate_limited" },
      {
        status: 429,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  let idempotencyState:
    | {
        keyHash: string;
        requestFingerprint: string;
      }
    | null = null;

  try {
    const parsedBody = await parseJsonBody(request, paymentCreateRequestSchema, {
      invalidBodyError: "invalid_payment_request"
    });

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const {
      leadId,
      userId,
      offerCode,
      intentionType,
      monetizationPath,
      monetizationSource,
      requestedAmountCents,
      metadata
    } = parsedBody.data;
    const safeMetadata = buildSafePaymentMetadata(metadata);
    const requestFingerprint = buildRequestFingerprint(request, "payment-create");

    const selectedOffer =
      offerCode && typeof offerCode === "string"
        ? getRevenueOfferByCode(offerCode)
        : getRevenueOfferByIntent(typeof intentionType === "string" ? intentionType : "");
    const requesterPhone = normalizePhoneNumber(
      typeof metadata?.external_user_id === "string"
        ? metadata.external_user_id
        : typeof metadata?.requester_phone === "string"
          ? metadata.requester_phone
          : typeof userId === "string"
            ? userId
            : ""
    );
    const resolvedPricing = resolvePaymentPricing({
      offerCode: selectedOffer.code,
      offerDefaultAmount: selectedOffer.defaultAmount,
      requesterPhone,
      originalMessage:
        typeof metadata?.original_message === "string" ? metadata.original_message : null,
      requestedAmountCents
    });
    const amount = amountCentsToDecimal(resolvedPricing.finalAmountCents);

    if (!amount) {
      return NextResponse.json(
        { error: "Oferta sem configuracao de pagamento pronta para checkout" },
        { status: 400 }
      );
    }

    const idempotencyKey =
      request.headers.get("x-idempotency-key")?.trim() ||
      `${leadId}:${userId}:${selectedOffer.code}:${resolvedPricing.finalAmountCents}`;
    const requestIdempotencyFingerprint = buildIdempotencyFingerprint([
      leadId,
      userId,
      selectedOffer.code,
      resolvedPricing.finalAmountCents,
      resolvedPricing.priceSource,
      requestFingerprint
    ]);
    const idempotency = await claimDurableIdempotencyKey({
      scope: "payment-create",
      key: idempotencyKey,
      requestFingerprint: requestIdempotencyFingerprint,
      ttlMs: 15 * 60 * 1000
    });

    if (idempotency.ok && idempotency.status === "replay") {
      return NextResponse.json(idempotency.responsePayload, {
        headers: {
          ...buildDurableRateLimitHeaders(rateLimit),
          "X-Idempotent-Replay": "true"
        }
      });
    }

    if (!idempotency.ok) {
      return jsonError(
        idempotency.status === "conflict"
          ? "payment_create_idempotency_conflict"
          : "payment_create_in_progress",
        409,
        {
          details: {
            retryAfterSeconds: idempotency.retryAfterSeconds
          }
        }
      );
    }

    idempotencyState = {
      keyHash: idempotency.keyHash,
      requestFingerprint: requestIdempotencyFingerprint
    };

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      existingPayment &&
      shouldReusePendingPayment(
        existingPayment as PersistedPaymentRecord,
        resolvedPricing,
        selectedOffer.code
      )
    ) {
      const pendingPayment = existingPayment as {
        payment_url?: string | null;
        external_id?: string | null;
      };
      const payload = {
        success: true,
        paymentUrl: pendingPayment.payment_url,
        paymentId: pendingPayment.external_id,
        amount,
        priceSource: resolvedPricing.priceSource,
        baseAmountCents: resolvedPricing.baseAmountCents,
        finalAmountCents: resolvedPricing.finalAmountCents,
        offer: {
          code: selectedOffer.code,
          name: selectedOffer.name,
          kind: selectedOffer.kind
        },
        message: "Pagamento ja gerado anteriormente"
      };

      await completeDurableIdempotencyKey({
        scope: "payment-create",
        keyHash: idempotencyState.keyHash,
        requestFingerprint: idempotencyState.requestFingerprint,
        resourceId: pendingPayment.external_id,
        responsePayload: payload
      });

      return NextResponse.json(payload, {
        headers: buildDurableRateLimitHeaders(rateLimit)
      });
    }

    const preference = new Preference(mercadopago);
    const revenuePath =
      (typeof monetizationPath === "string" && monetizationPath.trim()) ||
      (typeof metadata?.monetization_path === "string" && metadata.monetization_path) ||
      `noemia_${selectedOffer.kind}_flow`;
    const revenueSource =
      (typeof monetizationSource === "string" && monetizationSource.trim()) ||
      (typeof metadata?.monetization_source === "string" && metadata.monetization_source) ||
      "noemia";
    const checkoutStartedAt = new Date().toISOString();
    const externalReference = `${selectedOffer.code}_${leadId}_${Date.now()}`;
    const ipAddress = getClientIp(request);
    const safePriceMetadata = {
      base_amount_cents: resolvedPricing.baseAmountCents,
      final_amount_cents: resolvedPricing.finalAmountCents,
      price_source: resolvedPricing.priceSource,
      requested_test_amount_cents: resolvedPricing.requestedTestAmountCents,
      owner_override_phone: resolvedPricing.ownerOverridePhone,
      price_reason: resolvedPricing.auditReason,
      pricing_context: resolvedPricing.safeMetadata
    };
    const supportsAutoReturn = /^https:\/\//i.test(baseUrl);

    const preferenceData = {
      items: [
        {
          id: `${selectedOffer.code}_${leadId}`,
          title: `${selectedOffer.checkoutTitle} - Noemia Paixao Advocacia`,
          description: selectedOffer.checkoutDescription,
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL"
        }
      ],
      payer: {
        email: typeof metadata.email === "string" ? metadata.email : undefined,
        name: typeof metadata.name === "string" ? metadata.name : undefined,
        identification: {
          type: typeof metadata.documentType === "string" ? metadata.documentType : undefined,
          number:
            typeof metadata.documentNumber === "string" ? metadata.documentNumber : undefined
        }
      },
      payment_methods: buildCheckoutPaymentMethods(),
      back_urls: {
        success: `${baseUrl}/pagamento/sucesso`,
        failure: `${baseUrl}/pagamento/falha`,
        pending: `${baseUrl}/pagamento/pendente`
      },
      external_reference: externalReference,
      metadata: {
        lead_id: leadId,
        user_id: userId,
        offer_code: selectedOffer.code,
        offer_name: selectedOffer.name,
        offer_kind: selectedOffer.kind,
        revenue_layer: selectedOffer.layer,
        monetization_path: revenuePath,
        monetization_source: revenueSource,
        checkout_started_at: checkoutStartedAt,
        external_reference: externalReference,
        requester_phone: requesterPhone || null,
        request_fingerprint: requestFingerprint,
        request_ip_hash: ipAddress === "unknown" ? null : buildRequestFingerprint(request, "payment-ip"),
        ...safePriceMetadata,
        ...safeMetadata
      }
    };

    if (supportsAutoReturn) {
      Object.assign(preferenceData, {
        notification_url: `${baseUrl}/api/payment/webhook`,
        auto_return: "approved" as const
      });
    }

    const response = await preference.create({ body: preferenceData });

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        lead_id: leadId,
        user_id: userId,
        external_id: response.id,
        payment_url: response.init_point,
        amount,
        base_amount_cents: resolvedPricing.baseAmountCents,
        final_amount_cents: resolvedPricing.finalAmountCents,
        price_source: resolvedPricing.priceSource,
        requested_test_amount_cents: resolvedPricing.requestedTestAmountCents,
        owner_override_phone: resolvedPricing.ownerOverridePhone,
        status: "pending",
        metadata: {
          ...preferenceData.metadata,
          preference_id: response.id
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error("[payment.create] Failed to persist payment", { paymentError });
      return jsonError("payment_persistence_failed", 500);
    }

    await supabase
      .from("noemia_leads")
      .update({
        status: "payment_pending",
        payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId);

    try {
      const assessment = await commercialClosingService.syncPipelineClosingFromProfile({
        profileId: userId,
        payload: {
          paymentState: "link_sent",
          paymentLinkSentAt: checkoutStartedAt,
          paymentLinkUrl: response.init_point,
          paymentReference: response.id,
          paymentPendingAt: checkoutStartedAt,
          consultationOfferAmount: amount
        }
      });

      if (assessment?.pipelineId) {
        await commercialAppointmentService.syncFormalConsultation({
          pipelineId: assessment.pipelineId,
          source: "payment_create",
          createEvent: false
        });
      }
    } catch (closingSyncError) {
      console.error("[payment.create] Failed to sync commercial closing state", {
        closingSyncError,
        userId,
        leadId
      });
    }

    try {
      await recordRevenueTelemetry({
        eventKey: "checkout_started",
        pagePath: "/pagamento/checkout",
        payload: {
          lead_id: leadId,
          user_id: userId,
          payment_id: payment.id,
          external_id: response.id,
          amount,
          price_source: resolvedPricing.priceSource,
          base_amount_cents: resolvedPricing.baseAmountCents,
          final_amount_cents: resolvedPricing.finalAmountCents,
          offer_code: selectedOffer.code,
          offer_kind: selectedOffer.kind,
          monetization_source: revenueSource,
          monetization_path: revenuePath
        }
      });

      await recordRevenueTelemetry({
        eventKey: "payment_pending",
        pagePath: "/pagamento/checkout",
        payload: {
          lead_id: leadId,
          user_id: userId,
          payment_id: payment.id,
          external_id: response.id,
          amount,
          price_source: resolvedPricing.priceSource,
          base_amount_cents: resolvedPricing.baseAmountCents,
          final_amount_cents: resolvedPricing.finalAmountCents,
          offer_code: selectedOffer.code,
          offer_kind: selectedOffer.kind,
          monetization_source: revenueSource,
          monetization_path: revenuePath
        }
      });

      await recordRevenueTelemetry({
        eventKey: "revenue_signal",
        pagePath: "/pagamento/checkout",
        payload: {
          lead_id: leadId,
          payment_id: payment.id,
          amount,
          price_source: resolvedPricing.priceSource,
          base_amount_cents: resolvedPricing.baseAmountCents,
          final_amount_cents: resolvedPricing.finalAmountCents,
          offer_code: selectedOffer.code,
          offer_kind: selectedOffer.kind,
          monetization_source: revenueSource,
          monetization_path: revenuePath,
          signal: "checkout_created"
        }
      });
    } catch (trackingError) {
      console.error("[payment.create] Failed to record revenue telemetry", {
        trackingError
      });
    }

    const payload = {
      success: true,
      paymentUrl: response.init_point,
      paymentId: response.id,
      amount,
      priceSource: resolvedPricing.priceSource,
      baseAmountCents: resolvedPricing.baseAmountCents,
      finalAmountCents: resolvedPricing.finalAmountCents,
      offer: {
        code: selectedOffer.code,
        name: selectedOffer.name,
        kind: selectedOffer.kind
      },
      message: "Link de pagamento gerado com sucesso"
    };

    await completeDurableIdempotencyKey({
      scope: "payment-create",
      keyHash: idempotencyState.keyHash,
      requestFingerprint: idempotencyState.requestFingerprint,
      resourceId: response.id,
      responsePayload: payload
    });

    return NextResponse.json(payload, {
      headers: buildDurableRateLimitHeaders(rateLimit)
    });
  } catch (error) {
    if (idempotencyState) {
      await failDurableIdempotencyKey({
        scope: "payment-create",
        keyHash: idempotencyState.keyHash,
        requestFingerprint: idempotencyState.requestFingerprint,
        error: extractErrorMessage(error, "internal_server_error")
      });
    }

    console.error("[payment.create] Internal error", {
      error: extractErrorMessage(error, "internal_server_error")
    });
    return NextResponse.json(
      { ok: false, error: "internal_server_error" },
      {
        status: 500,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const context = getPaymentCreateContext();

  if (!context.ok) {
    return paymentCreateUnavailableResponse(context.missing);
  }

  const { supabase } = context.value;
  const rateLimit = await consumeDurableRateLimit({
    bucket: "payment-status",
    key: getClientIp(request),
    limit: 20,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "payment_status_rate_limited" },
      {
        status: 429,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = publicPaymentLookupQuerySchema.safeParse({
    payment_id: searchParams.get("payment_id") || undefined,
    collection_id: searchParams.get("collection_id") || undefined,
    external_reference: searchParams.get("external_reference") || undefined,
    lead_id: searchParams.get("lead_id") || undefined
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payment_lookup" },
      {
        status: 400,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  const paymentId =
    parsedQuery.data.payment_id || parsedQuery.data.collection_id;
  const externalReference = parsedQuery.data.external_reference || null;
  const directLeadId = parsedQuery.data.lead_id || null;
  const leadId = directLeadId || extractLeadIdFromExternalReference(externalReference);
  const usesProtectedLeadLookup = Boolean(directLeadId) && !paymentId && !externalReference;

  try {
    if (usesProtectedLeadLookup) {
      const access = await requireRouteSecretOrStaffAccess({
        request,
        service: "payment_create",
        action: "lookup_by_lead_id",
        expectedSecret: process.env.INTERNAL_API_SECRET?.trim(),
        secretName: "INTERNAL_API_SECRET",
        errorMessage: "lead_id_exige_acesso_interno",
        headerNames: ["x-internal-api-secret"],
        allowStaffFallback: true
      });

      if (!access.ok) {
        return access.response;
      }
    }

    let payment = null;

    if (paymentId) {
      const paymentByExternalId = await supabase
        .from("payments")
        .select("*")
        .eq("external_id", paymentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentByExternalId.error) {
        throw paymentByExternalId.error;
      }

      payment = paymentByExternalId.data;
    }

    if (!payment && leadId) {
      const paymentByLead = await supabase
        .from("payments")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentByLead.error) {
        throw paymentByLead.error;
      }

      payment = paymentByLead.data;
    }

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "payment_status_unavailable" },
        {
          status: 404,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payment: buildPublicPaymentPayload(payment)
      },
      {
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  } catch (error) {
    console.error("[payment.create] Failed to fetch payment status", {
      error: extractErrorMessage(error, "internal_server_error")
    });
    return NextResponse.json(
      { ok: false, error: "internal_server_error" },
      {
        status: 500,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }
}
