import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

import {
  computeHmacSha256Hex,
  parseMercadoPagoSignatureInput,
  shouldEnforceWebhookSignature,
  timingSafeEqualText
} from "@/lib/http/webhook-security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type PaymentWebhookContext = {
  mercadopago: MercadoPagoConfig;
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  webhookSecret?: string;
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

  return NextResponse.json(
    {
      error: "payment_webhook_not_configured",
      message: "Configuracao obrigatoria ausente para webhook de pagamento.",
      missing
    },
    { status: 503 }
  );
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
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
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
        { error: "invalid_webhook_signature", code: signatureValidation.code },
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
    console.error("[payment.webhook] Internal error", { error });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

async function handleApprovedPayment(supabase: any, paymentInfo: any) {
  try {
    const externalReference = paymentInfo.external_reference;
    const match = externalReference?.match(/^consultation_(.+)_\d+$/);

    if (!match) {
      console.error("[payment.webhook] Invalid external reference", {
        externalReference
      });
      return;
    }

    const leadId = match[1];

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", paymentInfo.id)
      .eq("status", "approved")
      .single();

    if (existingPayment) {
      console.log("[payment.webhook] Payment already processed", {
        paymentId: paymentInfo.id
      });
      return;
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update({
        status: "approved",
        payment_method_id: paymentInfo.payment_method_id,
        payment_type_id: paymentInfo.payment_type_id,
        status_detail: paymentInfo.status_detail,
        transaction_amount: paymentInfo.transaction_amount,
        approved_at: new Date().toISOString(),
        metadata: {
          ...paymentInfo.metadata,
          mercado_pago_payment_id: paymentInfo.id,
          mercado_pago_status: paymentInfo.status,
          mercado_pago_status_detail: paymentInfo.status_detail
        }
      })
      .eq("external_id", paymentInfo.id)
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

    await sendPaymentConfirmationMessage(supabase, lead);

    await supabase.from("follow_up_events").insert({
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
  } catch (error) {
    console.error("[payment.webhook] Error processing approved payment", { error });
  }
}

async function handleRejectedPayment(supabase: any, paymentInfo: any) {
  try {
    const externalReference = paymentInfo.external_reference;
    const match = externalReference?.match(/^consultation_(.+)_\d+$/);

    if (!match) {
      console.error("[payment.webhook] Invalid external reference", {
        externalReference
      });
      return;
    }

    const leadId = match[1];

    await supabase
      .from("payments")
      .update({
        status: "rejected",
        status_detail: paymentInfo.status_detail,
        rejected_at: new Date().toISOString(),
        metadata: {
          mercado_pago_payment_id: paymentInfo.id,
          mercado_pago_status: paymentInfo.status,
          mercado_pago_status_detail: paymentInfo.status_detail
        }
      })
      .eq("external_id", paymentInfo.id);

    await supabase
      .from("noemia_leads")
      .update({
        payment_status: "rejected",
        payment_rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId);
  } catch (error) {
    console.error("[payment.webhook] Error processing rejected payment", { error });
  }
}

async function handlePendingPayment(supabase: any, paymentInfo: any) {
  try {
    await supabase
      .from("payments")
      .update({
        status: "pending",
        status_detail: paymentInfo.status_detail,
        metadata: {
          mercado_pago_payment_id: paymentInfo.id,
          mercado_pago_status: paymentInfo.status,
          mercado_pago_status_detail: paymentInfo.status_detail
        }
      })
      .eq("external_id", paymentInfo.id);
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

export async function GET() {
  const context = getWebhookContext();

  if (!context.ok) {
    return paymentWebhookUnavailableResponse(context.missing);
  }

  return NextResponse.json({
    status: "webhook_active",
    timestamp: new Date().toISOString(),
    message: "Webhook do Mercado Pago esta ativo",
    signature: {
      enforced: shouldEnforceWebhookSignature("MERCADO_PAGO_WEBHOOK_ENFORCE_SIGNATURE"),
      secretConfigured: Boolean(context.value.webhookSecret)
    }
  });
}
