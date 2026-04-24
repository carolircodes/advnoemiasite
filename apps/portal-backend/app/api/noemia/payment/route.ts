import { NextRequest, NextResponse } from "next/server";

import { requireRouteSecretOrStaffAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage } from "@/lib/http/api-response";
import { parseJsonBody } from "@/lib/http/request-guards";
import { extractAmountCentsFromMessage } from "@/lib/payment/pricing";
import { getPersistedFinancialState } from "@/lib/payment/payment-workflow";
import { noemiaPaymentRequestSchema } from "@/lib/payment/payment-security";
import { generatePaymentLink, generatePaymentMessage } from "@/lib/payment/payment-service";
import { getRevenueOfferByCode, getRevenueOfferByIntent } from "@/lib/services/revenue-architecture";
import { recordRevenueTelemetry } from "@/lib/services/revenue-telemetry";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function createPaymentSupabaseClient() {
  return createAdminSupabaseClient();
}

async function requireNoemiaPaymentAccess(request: NextRequest) {
  return requireRouteSecretOrStaffAccess({
    request,
    service: "noemia_payment",
    action: "privileged_payment_route",
    expectedSecret: process.env.INTERNAL_API_SECRET?.trim(),
    secretName: "INTERNAL_API_SECRET",
    errorMessage: "Apenas perfis internos autorizados podem acessar esta rota.",
    headerNames: ["x-internal-api-secret"],
    allowStaffFallback: true
  });
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireNoemiaPaymentAccess(request);

    if (!access.ok) {
      return access.response;
    }

    const supabase = createPaymentSupabaseClient();
    const parsedBody = await parseJsonBody(request, noemiaPaymentRequestSchema, {
      invalidBodyError: "invalid_noemia_payment_request",
      includeValidationDetails: access.actor === "staff"
    });

    if (!parsedBody.ok) {
      return parsedBody.response;
    }
    const { leadId, userId, message, intentionType, offerCode } = parsedBody.data;

    const { data: lead, error: leadError } = await supabase
      .from("noemia_leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Pagamento indisponivel para este lead." }, { status: 404 });
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .eq("active_for_lead", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const selectedOffer =
      typeof offerCode === "string" && offerCode.trim()
        ? getRevenueOfferByCode(offerCode)
        : getRevenueOfferByIntent(typeof intentionType === "string" ? intentionType : "");

    if (existingPayment && getPersistedFinancialState(existingPayment) === "pending") {
      const responseMessage = generatePaymentMessage({
        success: true,
        paymentUrl: existingPayment.payment_url,
        paymentId: existingPayment.external_id,
        amount: existingPayment.amount
      });

      return NextResponse.json({
        success: true,
        message: responseMessage,
        paymentUrl: existingPayment.payment_url,
        paymentId: existingPayment.external_id,
        offer: {
          code: selectedOffer.code,
          name: selectedOffer.name,
          kind: selectedOffer.kind
        },
        alreadyExists: true
      });
    }

    if (existingPayment && getPersistedFinancialState(existingPayment) === "approved") {
      return NextResponse.json({
        success: true,
        message:
          "Seu pagamento ja foi confirmado. Em instantes voce recebera as proximas orientacoes.",
        alreadyPaid: true
      });
    }

    try {
      await recordRevenueTelemetry({
        eventKey: "offer_presented",
        pagePath: "/noemia",
        payload: {
          lead_id: leadId,
          user_id: userId,
          offer_code: selectedOffer.code,
          offer_kind: selectedOffer.kind,
          offer_name: selectedOffer.name,
          intention_type: intentionType || "consultation",
          monetization_source: "noemia",
          monetization_path: `noemia_${selectedOffer.kind}_flow`
        }
      });

      await recordRevenueTelemetry({
        eventKey: "offer_acceptance_signal",
        pagePath: "/noemia",
        payload: {
          lead_id: leadId,
          user_id: userId,
          offer_code: selectedOffer.code,
          offer_kind: selectedOffer.kind,
          source_message: message || "",
          intention_type: intentionType || "consultation",
          monetization_source: "noemia",
          monetization_path: `noemia_${selectedOffer.kind}_flow`
        }
      });
    } catch (trackingError) {
      console.error("[noemia.payment] Failed to record offer telemetry", {
        trackingError
      });
    }

    const paymentResponse = await generatePaymentLink({
      leadId,
      userId,
      offerCode: selectedOffer.code,
      intentionType,
      monetizationPath: `noemia_${selectedOffer.kind}_flow`,
      monetizationSource: "noemia",
      metadata: {
        intention_type: intentionType,
        original_message: message,
        requester_phone: userId,
        external_user_id: userId,
        requested_test_amount_cents: extractAmountCentsFromMessage(message),
        user_agent: request.headers.get("user-agent"),
        offer_code: selectedOffer.code,
        offer_kind: selectedOffer.kind,
        offer_name: selectedOffer.name,
        monetization_path: `noemia_${selectedOffer.kind}_flow`,
        monetization_source: "noemia"
      },
      requestedAmountCents: extractAmountCentsFromMessage(message)
    } as any);

    if (!paymentResponse.success) {
      return NextResponse.json(
        { error: paymentResponse.error || "Erro ao gerar pagamento" },
        { status: 500 }
      );
    }

    const aiMessage = generatePaymentMessage(paymentResponse);

    await supabase.from("noemia_lead_conversations").insert({
      lead_id: leadId,
      message: aiMessage,
      sender: "noemia",
      message_type: "payment_request",
      metadata: {
        payment_generated: true,
        payment_id: paymentResponse.paymentId,
        payment_url: paymentResponse.paymentUrl,
        amount: paymentResponse.amount,
        intention_type: intentionType,
        offer_code: selectedOffer.code,
        offer_kind: selectedOffer.kind,
        offer_name: selectedOffer.name
      },
      created_at: new Date().toISOString()
    });

    await supabase
      .from("noemia_leads")
      .update({
        status: "payment_pending",
        payment_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId);

    return NextResponse.json({
      success: true,
      message: aiMessage,
      paymentUrl: paymentResponse.paymentUrl,
      paymentId: paymentResponse.paymentId,
      amount: paymentResponse.amount,
      offer: {
        code: selectedOffer.code,
        name: selectedOffer.name,
        kind: selectedOffer.kind
      }
    });
  } catch (error) {
    console.error("[noemia.payment] Internal error", {
      error: extractErrorMessage(error, "Erro interno do servidor")
    });

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const access = await requireNoemiaPaymentAccess(request);

  if (!access.ok) {
    return access.response;
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  if (!leadId) {
    return NextResponse.json({ error: "lead_id e obrigatorio" }, { status: 400 });
  }

  try {
    const supabase = createPaymentSupabaseClient();
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json(
        { error: "Nenhum pagamento encontrado para este lead" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        external_id: payment.external_id,
        status: payment.status,
        financial_state: getPersistedFinancialState(payment),
        technical_state: payment.technical_state || null,
        external_reference: payment.external_reference || null,
        active_for_lead: payment.active_for_lead ?? null,
        amount: payment.amount,
        base_amount_cents: payment.base_amount_cents,
        final_amount_cents: payment.final_amount_cents,
        price_source: payment.price_source,
        metadata: payment.metadata || null,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        approved_at: payment.approved_at
      }
    });
  } catch (error) {
    console.error("[noemia.payment] Failed to fetch payment", {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
