import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
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
  failDurableIdempotencyKey,
  shouldEnforceDurableProtection
} from "@/lib/http/durable-abuse-protection";
import {
  amountCentsToDecimal,
  buildCheckoutPaymentMethods,
  normalizePhoneNumber,
  resolvePaymentPricing
} from "@/lib/payment/pricing";
import { buildPublicPaymentPayload } from "@/lib/payment/public-payment-payload";
import {
  buildPaymentContextSnapshot,
  buildPaymentTransitionKey,
  getPersistedFinancialState,
  resolvePaymentOrigin,
  shouldTreatPaymentAsActivePending
} from "@/lib/payment/payment-workflow";
import {
  buildSafePaymentMetadata,
  paymentCreateRequestSchema,
  publicPaymentLookupQuerySchema
} from "@/lib/payment/payment-security";
import { commercialClosingService } from "@/lib/services/commercial-closing";
import { commercialAppointmentService } from "@/lib/services/commercial-appointment";
import { getRevenueOfferByCode, getRevenueOfferByIntent } from "@/lib/services/revenue-architecture";
import { recordRevenueTelemetry } from "@/lib/services/revenue-telemetry";
import { categorizeObservedError } from "@/lib/observability/error-categorization";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation,
  type RequestObservation
} from "@/lib/observability/request-observability";
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

function logPaymentCreateEvent(
  level: "info" | "warn" | "error",
  event: string,
  observation: RequestObservation,
  metadata: Record<string, unknown> = {},
  error?: unknown
) {
  logObservedRequest(
    level,
    event,
    observation,
    {
      flow: observation.flow || "payment_create",
      provider: "mercado_pago",
      ...metadata
    },
    error
  );
}

function extractLeadIdFromExternalReference(externalReference: string | null) {
  if (!externalReference) {
    return null;
  }

  const match = externalReference.match(/^(.*)_([0-9a-fA-F-]{36})_(\d+)$/);
  return match?.[2] || null;
}

type PersistedPaymentRecord = {
  id: string;
  amount?: number | null;
  payment_url?: string | null;
  external_id?: string | null;
  external_reference?: string | null;
  price_source?: string | null;
  final_amount_cents?: number | null;
  status?: string | null;
  financial_state?: string | null;
  active_for_lead?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

function shouldReusePendingPayment(
  pendingPayment: PersistedPaymentRecord | null,
  resolvedPricing: ReturnType<typeof resolvePaymentPricing>,
  offerCode: string
) {
  if (!pendingPayment || !shouldTreatPaymentAsActivePending(pendingPayment)) {
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
  const observation = startRequestObservation(request, {
    flow: "payment_create",
    provider: "mercado_pago"
  });
  const access = await requireRouteSecretOrStaffAccess({
    request,
    service: "payment_create",
    action: "create_checkout",
    expectedSecret: process.env.INTERNAL_API_SECRET?.trim(),
    secretName: "INTERNAL_API_SECRET",
    errorMessage: "A criacao de pagamento exige acesso interno autenticado.",
    headerNames: ["x-internal-api-secret"],
    allowStaffFallback: true
  });

  if (!access.ok) {
    logPaymentCreateEvent("warn", "PAYMENT_CREATE_ACCESS_DENIED", observation, {
      outcome: "denied",
      status: access.status,
      errorCategory: "boundary"
    });
    return access.response;
  }

  const context = getPaymentCreateContext();

  if (!context.ok) {
    logPaymentCreateEvent("error", "PAYMENT_CREATE_CONFIG_MISSING", observation, {
      outcome: "failed",
      status: 503,
      errorCategory: "configuration",
      missing: context.missing
    });
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "payment_create_not_configured" },
      { status: 503 }
    );
  }

  const { mercadopago, supabase, baseUrl } = context.value;
  const rateLimit = await consumeDurableRateLimit({
    bucket: "payment-create",
    key: `${getClientIp(request)}:${request.headers.get("x-idempotency-key") || "none"}`,
    limit: 8,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimit.mode !== "durable" && shouldEnforceDurableProtection()) {
    logPaymentCreateEvent("error", "PAYMENT_CREATE_DURABLE_PROTECTION_UNAVAILABLE", observation, {
      outcome: "failed",
      status: 503,
      errorCategory: "fallback",
      runtimeState: rateLimit.mode
    });
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "payment_create_temporarily_unavailable" },
      {
        status: 503,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  if (!rateLimit.ok) {
    logPaymentCreateEvent("warn", "PAYMENT_CREATE_RATE_LIMITED", observation, {
      outcome: "failed",
      status: 429,
      errorCategory: "rate_limit",
      fingerprint: buildRequestFingerprint(request, "payment-create"),
      ipAddress: getClientIp(request)
    });

    return createObservedJsonResponse(
      observation,
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
      logPaymentCreateEvent("warn", "PAYMENT_CREATE_INVALID_BODY", observation, {
        outcome: "failed",
        status: 400,
        errorCategory: "validation"
      });
      return createObservedJsonResponse(
        observation,
        { ok: false, error: "invalid_payment_request" },
        {
          status: 400,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
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
    const actorProfileId = access.actor === "staff" ? access.profile.id : null;

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
      logPaymentCreateEvent("warn", "PAYMENT_CREATE_INVALID_PRICING", observation, {
        outcome: "failed",
        status: 400,
        errorCategory: "validation",
        leadId,
        userId,
        offerCode: selectedOffer.code
      });
      return createObservedJsonResponse(
        observation,
        { error: "Oferta sem configuracao de pagamento pronta para checkout" },
        {
          status: 400,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
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
      logPaymentCreateEvent("info", "PAYMENT_CREATE_IDEMPOTENT_REPLAY", observation, {
        outcome: "replay",
        status: 200
      });
      return createObservedJsonResponse(observation, idempotency.responsePayload, {
        headers: {
          ...buildDurableRateLimitHeaders(rateLimit),
          "X-Idempotent-Replay": "true"
        }
      });
    }

    if (!idempotency.ok) {
      logPaymentCreateEvent("warn", "PAYMENT_CREATE_IDEMPOTENCY_BLOCKED", observation, {
        outcome: "failed",
        status: 409,
        errorCategory: "idempotency",
        retryAfterSeconds: idempotency.retryAfterSeconds
      });
      return createObservedJsonResponse(
        observation,
        {
          ok: false,
          error:
            idempotency.status === "conflict"
              ? "payment_create_idempotency_conflict"
              : "payment_create_in_progress",
          details: {
            retryAfterSeconds: idempotency.retryAfterSeconds
          }
        },
        {
          status: 409,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    idempotencyState = {
      keyHash: idempotency.keyHash,
      requestFingerprint: requestIdempotencyFingerprint
    };

    const { data: existingPayments, error: existingPaymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (existingPaymentsError) {
      throw existingPaymentsError;
    }

    const paymentCandidates = Array.isArray(existingPayments)
      ? (existingPayments as PersistedPaymentRecord[])
      : [];
    const approvedPayment = paymentCandidates.find(
      (payment) =>
        payment.active_for_lead !== false &&
        getPersistedFinancialState(payment) === "approved"
    );

    if (approvedPayment) {
      logPaymentCreateEvent("warn", "PAYMENT_CREATE_ALREADY_APPROVED", observation, {
        outcome: "denied",
        status: 409,
        errorCategory: "boundary",
        leadId,
        userId,
        paymentId: approvedPayment.external_id || approvedPayment.id
      });
      return createObservedJsonResponse(
        observation,
        { ok: false, error: "payment_already_confirmed" },
        {
          status: 409,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    const existingPayment = paymentCandidates.find((payment) =>
      shouldTreatPaymentAsActivePending(payment)
    );

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

      logPaymentCreateEvent("info", "PAYMENT_CREATE_REUSED_PENDING", observation, {
        outcome: "replay",
        status: 200,
        leadId,
        userId,
        paymentId: pendingPayment.external_id,
        priceSource: resolvedPricing.priceSource
      });

      return createObservedJsonResponse(observation, payload, {
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
    const paymentOrigin = resolvePaymentOrigin({
      accessActor: access.actor,
      monetizationSource: revenueSource,
      metadata: safeMetadata,
      profileId: actorProfileId,
      userId
    });
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
    const paymentContextSnapshot = buildPaymentContextSnapshot({
      offerCode: selectedOffer.code,
      offerKind: selectedOffer.kind,
      monetizationPath: revenuePath,
      monetizationSource: revenueSource,
      requestFingerprint,
      requestedAmountCents: resolvedPricing.requestedTestAmountCents,
      metadata: safeMetadata
    });
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
        external_reference: externalReference,
        payment_url: response.init_point,
        amount,
        base_amount_cents: resolvedPricing.baseAmountCents,
        final_amount_cents: resolvedPricing.finalAmountCents,
        price_source: resolvedPricing.priceSource,
        requested_test_amount_cents: resolvedPricing.requestedTestAmountCents,
        owner_override_phone: resolvedPricing.ownerOverridePhone,
        status: "pending",
        financial_state: "pending",
        technical_state: "checkout_created",
        origin_type: paymentOrigin.originType,
        origin_source: paymentOrigin.originSource,
        origin_actor_id: paymentOrigin.originActorId,
        origin_context: paymentContextSnapshot,
        active_for_lead: true,
        last_provider_status: "pending",
        last_provider_payment_id: response.id,
        last_reconciled_at: checkoutStartedAt,
        metadata: {
          ...preferenceData.metadata,
          preference_id: response.id
        }
      })
      .select()
      .single();

    if (paymentError) {
      logPaymentCreateEvent(
        "error",
        "PAYMENT_CREATE_PERSISTENCE_FAILED",
        observation,
        {
          outcome: "failed",
          status: 500,
          errorCategory: "internal",
          leadId,
          userId
        },
        paymentError
      );
      return createObservedJsonResponse(
        observation,
        { ok: false, error: "payment_persistence_failed" },
        {
          status: 500,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    await supabase
      .from("payments")
      .update({
        active_for_lead: false,
        superseded_at: checkoutStartedAt,
        superseded_by_payment_id: payment.id,
        technical_state: "superseded",
        updated_at: checkoutStartedAt
      })
      .eq("lead_id", leadId)
      .neq("id", payment.id)
      .eq("active_for_lead", true)
      .eq("status", "pending");

    try {
      await supabase.from("payment_events").insert({
        payment_id: payment.id,
        event_kind: "checkout_created",
        transition_key: buildPaymentTransitionKey({
          paymentId: payment.id,
          providerPaymentId: response.id,
          financialState: "pending",
          stage: "checkout"
        }),
        source: "payment_create",
        provider_payment_id: response.id,
        provider_status: "pending",
        financial_state: "pending",
        technical_state: "checkout_created",
        commercial_state: "link_sent",
        side_effect_applied: false,
        payload: {
          lead_id: leadId,
          user_id: userId,
          offer_code: selectedOffer.code,
          price_source: resolvedPricing.priceSource,
          origin_type: paymentOrigin.originType,
          origin_source: paymentOrigin.originSource
        }
      });
    } catch (paymentEventError) {
      logPaymentCreateEvent(
        "warn",
        "PAYMENT_CREATE_AUDIT_EVENT_DEGRADED",
        observation,
        {
          outcome: "degraded",
          status: 200,
          errorCategory: "internal",
          leadId,
          userId,
          paymentId: payment.id
        },
        paymentEventError
      );
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

      await supabase
        .from("payments")
        .update({
          commercial_effect_applied_at: checkoutStartedAt,
          commercial_effect_key: buildPaymentTransitionKey({
            paymentId: payment.id,
            providerPaymentId: response.id,
            financialState: "pending",
            stage: "commercial"
          }),
          updated_at: checkoutStartedAt
        })
        .eq("id", payment.id);
    } catch (closingSyncError) {
      logPaymentCreateEvent(
        "warn",
        "PAYMENT_CREATE_COMMERCIAL_SYNC_DEGRADED",
        observation,
        {
          outcome: "degraded",
          status: 200,
          errorCategory: "internal",
          leadId,
          userId
        },
        closingSyncError
      );
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
      logPaymentCreateEvent(
        "warn",
        "PAYMENT_CREATE_TELEMETRY_DEGRADED",
        observation,
        {
          outcome: "degraded",
          status: 200,
          errorCategory: "provider",
          leadId,
          userId,
          paymentId: response.id
        },
        trackingError
      );
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

    logPaymentCreateEvent("info", "PAYMENT_CREATE_SUCCEEDED", observation, {
      outcome: "success",
      status: 200,
      leadId,
      userId,
      paymentId: response.id,
      priceSource: resolvedPricing.priceSource,
      finalAmountCents: resolvedPricing.finalAmountCents
    });

    return createObservedJsonResponse(observation, payload, {
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

    logPaymentCreateEvent(
      "error",
      "PAYMENT_CREATE_FAILED",
      observation,
      {
        outcome: "failed",
        status: 500,
        errorCategory: categorizeObservedError(error, "internal")
      },
      error
    );
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "internal_server_error" },
      {
        status: 500,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "payment_status",
    provider: "mercado_pago"
  });
  const context = getPaymentCreateContext();

  if (!context.ok) {
    logObservedRequest("error", "PAYMENT_STATUS_CONFIG_MISSING", observation, {
      flow: "payment_status",
      provider: "mercado_pago",
      outcome: "failed",
      status: 503,
      errorCategory: "configuration",
      missing: context.missing
    });
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "payment_create_not_configured" },
      { status: 503 }
    );
  }

  const { supabase } = context.value;
  const rateLimit = await consumeDurableRateLimit({
    bucket: "payment-status",
    key: getClientIp(request),
    limit: 20,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimit.mode !== "durable" && shouldEnforceDurableProtection()) {
    logObservedRequest("error", "PAYMENT_STATUS_DURABLE_PROTECTION_UNAVAILABLE", observation, {
      flow: "payment_status",
      provider: "mercado_pago",
      outcome: "failed",
      status: 503,
      errorCategory: "fallback",
      runtimeState: rateLimit.mode
    });
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "payment_status_temporarily_unavailable" },
      {
        status: 503,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }

  if (!rateLimit.ok) {
    logObservedRequest("warn", "PAYMENT_STATUS_RATE_LIMITED", observation, {
      flow: "payment_status",
      provider: "mercado_pago",
      outcome: "failed",
      status: 429,
      errorCategory: "rate_limit"
    });
    return createObservedJsonResponse(
      observation,
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
    logObservedRequest("warn", "PAYMENT_STATUS_INVALID_QUERY", observation, {
      flow: "payment_status",
      provider: "mercado_pago",
      outcome: "failed",
      status: 400,
      errorCategory: "validation"
    });
    return createObservedJsonResponse(
      observation,
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
        logObservedRequest("warn", "PAYMENT_STATUS_LEAD_LOOKUP_DENIED", observation, {
          flow: "payment_status",
          provider: "mercado_pago",
          outcome: "denied",
          status: access.status,
          errorCategory: "boundary"
        });
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
      logObservedRequest("warn", "PAYMENT_STATUS_NOT_FOUND", observation, {
        flow: "payment_status",
        provider: "mercado_pago",
        outcome: "failed",
        status: 404,
        errorCategory: "not_found",
        leadId,
        paymentId
      });
      return createObservedJsonResponse(
        observation,
        { ok: false, error: "payment_status_unavailable" },
        {
          status: 404,
          headers: buildDurableRateLimitHeaders(rateLimit)
        }
      );
    }

    logObservedRequest("info", "PAYMENT_STATUS_FETCHED", observation, {
      flow: "payment_status",
      provider: "mercado_pago",
      outcome: "success",
      status: 200,
      leadId,
      paymentId: payment.external_id || paymentId || null
    });

    return createObservedJsonResponse(
      observation,
      {
        success: true,
        payment: buildPublicPaymentPayload(payment)
      },
      {
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  } catch (error) {
    logObservedRequest("error", "PAYMENT_STATUS_FAILED", observation, {
      flow: "payment_status",
      provider: "mercado_pago",
      outcome: "failed",
      status: 500,
      errorCategory: categorizeObservedError(error, "internal")
    }, error);
    return createObservedJsonResponse(
      observation,
      { ok: false, error: "internal_server_error" },
      {
        status: 500,
        headers: buildDurableRateLimitHeaders(rateLimit)
      }
    );
  }
}
