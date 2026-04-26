import { createAdminSupabaseClient } from "../supabase/admin.ts";

export interface PaymentRequest {
  leadId: string;
  userId: string;
  offerCode?: string;
  intentionType?: string;
  monetizationPath?: string;
  monetizationSource?: string;
  requestedAmountCents?: number;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  amount?: number;
  offer?: {
    code: string;
    name: string;
    kind: string;
  };
  priceSource?: string;
  baseAmountCents?: number;
  finalAmountCents?: number;
  message?: string;
  error?: string;
}

function getPaymentApiBaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!value) {
    throw new Error("NEXT_PUBLIC_BASE_URL ou NEXT_PUBLIC_APP_URL precisa estar configurada.");
  }

  return value.replace(/\/$/, "");
}

function getInternalApiSecret() {
  const value = process.env.INTERNAL_API_SECRET?.trim();

  if (!value) {
    throw new Error("INTERNAL_API_SECRET precisa estar configurado para gerar pagamentos.");
  }

  return value;
}

export async function generatePaymentLink(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${getPaymentApiBaseUrl()}/api/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-secret": getInternalApiSecret()
      },
      body: JSON.stringify(request)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro ao gerar pagamento"
      };
    }

    return {
      success: true,
      paymentUrl: data.paymentUrl,
      paymentId: data.paymentId,
      amount: data.amount,
      offer: data.offer,
      priceSource: data.priceSource,
      baseAmountCents: data.baseAmountCents,
      finalAmountCents: data.finalAmountCents,
      message: data.message
    };
  } catch (error) {
    console.error("[payment.service] Failed to generate payment link", {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: "Erro interno do servidor"
    };
  }
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  try {
    const response = await fetch(
      `${getPaymentApiBaseUrl()}/api/payment/create?payment_id=${paymentId}`
    );

    if (!response.ok) {
      return {
        success: false,
        error: "Pagamento nao encontrado"
      };
    }

    const data = await response.json();

    return {
      success: true,
      paymentId: data.payment.id,
      message: `Status: ${data.payment.status}`
    };
  } catch (error) {
    console.error("[payment.service] Failed to check payment status", {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: "Erro interno do servidor"
    };
  }
}

export function generatePaymentMessage(paymentResponse: PaymentResponse): string {
  if (!paymentResponse.success) {
    return "Desculpe, ocorreu um erro ao gerar o link de pagamento. Por favor, tente novamente em alguns instantes.";
  }

  const offerLabel =
    paymentResponse.offer?.kind === "consultation"
      ? paymentResponse.priceSource === "owner_test_override"
        ? "o link solicitado"
        : "a consulta online"
      : paymentResponse.offer?.name || "o pagamento";

  return `Perfeito. Vou te encaminhar o link para ${offerLabel}.

Assim que o pagamento for confirmado, seguimos com seu atendimento prioritario.

Link para pagamento: ${paymentResponse.paymentUrl}

O valor desta etapa e de R$ ${paymentResponse.amount?.toFixed(2)} e pode ser pago via Pix, cartao de debito ou cartao de credito com parcelamento.

Apos a confirmacao, voce recebera as proximas orientacoes automaticamente.`;
}

export async function updateLeadPaymentStatus(
  leadId: string,
  status: "payment_requested" | "payment_pending" | "paid" | "rejected"
): Promise<void> {
  try {
    const supabase = createAdminSupabaseClient();
    const updateData: Record<string, string> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "payment_requested") {
      updateData.payment_requested_at = new Date().toISOString();
    } else if (status === "paid") {
      updateData.payment_confirmed_at = new Date().toISOString();
    } else if (status === "rejected") {
      updateData.payment_rejected_at = new Date().toISOString();
    }

    await supabase.from("noemia_leads").update(updateData).eq("id", leadId);
  } catch (error) {
    console.error("[payment.service] Failed to update lead payment status", {
      leadId,
      status,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
