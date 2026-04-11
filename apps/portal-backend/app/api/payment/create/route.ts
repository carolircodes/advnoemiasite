import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";

const CONSULTATION_VALUE = Number(process.env.CONSULTATION_VALUE) || 297.0;

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

  return NextResponse.json(
    {
      error: "payment_create_not_configured",
      message: "Configuracao obrigatoria ausente para criacao de pagamento.",
      missing
    },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  const context = getPaymentCreateContext();

  if (!context.ok) {
    return paymentCreateUnavailableResponse(context.missing);
  }

  const { mercadopago, supabase, baseUrl } = context.value;

  try {
    const { leadId, userId, metadata = {} } = await request.json();

    if (!leadId || !userId) {
      return NextResponse.json(
        { error: "leadId e userId sao obrigatorios" },
        { status: 400 }
      );
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPayment) {
      const pendingPayment = existingPayment as {
        payment_url?: string | null;
        external_id?: string | null;
      };
      return NextResponse.json({
        success: true,
        paymentUrl: pendingPayment.payment_url,
        paymentId: pendingPayment.external_id,
        message: "Pagamento ja gerado anteriormente"
      });
    }

    const preference = new Preference(mercadopago);

    const preferenceData = {
      items: [
        {
          id: `consultation_${leadId}`,
          title: "Consulta Juridica - Noemia Paixao Advocacia",
          description: "Analise completa do seu caso juridico com orientacao especializada",
          quantity: 1,
          unit_price: CONSULTATION_VALUE,
          currency_id: "BRL"
        }
      ],
      payer: {
        email: metadata.email || undefined,
        name: metadata.name || undefined,
        identification: {
          type: metadata.documentType || undefined,
          number: metadata.documentNumber || undefined
        }
      },
      payment_methods: {
        excluded_payment_types: [{ id: "debit_card" }, { id: "credit_card" }],
        excluded_payment_methods: [{ id: "bolbradesco" }, { id: "pec" }],
        default_payment_method_id: "pix"
      },
      back_urls: {
        success: `${baseUrl}/pagamento/sucesso`,
        failure: `${baseUrl}/pagamento/falha`,
        pending: `${baseUrl}/pagamento/pendente`
      },
      notification_url: `${baseUrl}/api/payment/webhook`,
      auto_return: "approved",
      external_reference: `consultation_${leadId}_${Date.now()}`,
      metadata: {
        lead_id: leadId,
        user_id: userId,
        consultation_type: "initial",
        ...metadata
      }
    };

    const response = await preference.create({ body: preferenceData });

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        lead_id: leadId,
        user_id: userId,
        external_id: response.id,
        payment_url: response.init_point,
        amount: CONSULTATION_VALUE,
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
      return NextResponse.json({ error: "payment_persistence_failed" }, { status: 500 });
    }

    await supabase
      .from("noemia_leads")
      .update({
        status: "payment_pending",
        payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId);

    return NextResponse.json({
      success: true,
      paymentUrl: response.init_point,
      paymentId: response.id,
      amount: CONSULTATION_VALUE,
      message: "Link de pagamento gerado com sucesso"
    });
  } catch (error) {
    console.error("[payment.create] Internal error", { error });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const context = getPaymentCreateContext();

  if (!context.ok) {
    return paymentCreateUnavailableResponse(context.missing);
  }

  const { supabase } = context.value;
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("payment_id");

  if (!paymentId) {
    return NextResponse.json({ error: "payment_id e obrigatorio" }, { status: 400 });
  }

  try {
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", paymentId)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "pagamento_nao_encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        created_at: payment.created_at,
        updated_at: payment.updated_at
      }
    });
  } catch (error) {
    console.error("[payment.create] Failed to fetch payment status", { error });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
