import { createAdminSupabaseClient } from "../supabase/admin";

export interface PaymentRequest {
  leadId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  amount?: number;
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

export async function generatePaymentLink(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${getPaymentApiBaseUrl()}/api/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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

  return `Perfeito. Vou te encaminhar o link para agendamento da consulta.

Assim que o pagamento for confirmado, seguimos com seu atendimento prioritario.

Link para pagamento: ${paymentResponse.paymentUrl}

O valor da consulta e de R$ ${paymentResponse.amount?.toFixed(2)} e pode ser pago via Pix ou cartao de credito.

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
