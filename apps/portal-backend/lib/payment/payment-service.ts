import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// Proteção contra variáveis não configuradas
if (!supabaseUrl || !supabaseSecretKey) {
  console.warn("Variáveis do Supabase não configuradas em payment-service.ts");
  throw new Error("Configuração do Supabase é obrigatória para pagamentos");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

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

export async function generatePaymentLink(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao gerar pagamento'
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
    console.error('Erro ao gerar link de pagamento:', error);
    return {
      success: false,
      error: 'Erro interno do servidor'
    };
  }
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/create?payment_id=${paymentId}`);
    
    if (!response.ok) {
      return {
        success: false,
        error: 'Pagamento não encontrado'
      };
    }

    const data = await response.json();

    return {
      success: true,
      paymentId: data.payment.id,
      message: `Status: ${data.payment.status}`
    };

  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return {
      success: false,
      error: 'Erro interno do servidor'
    };
  }
}

export function generatePaymentMessage(paymentResponse: PaymentResponse): string {
  if (!paymentResponse.success) {
    return "Desculpe, ocorreu um erro ao gerar o link de pagamento. Por favor, tente novamente em alguns instantes.";
  }

  return `Perfeito. Vou te encaminhar o link para agendamento da consulta.

Assim que o pagamento for confirmado, seguimos com seu atendimento prioritário.

🔗 **Link para pagamento**: ${paymentResponse.paymentUrl}

O valor da consulta é de R$ ${paymentResponse.amount?.toFixed(2)} e pode ser pago via Pix ou cartão de crédito.

Após a confirmação, você receberá as próximas orientações automaticamente.`;
}

export async function updateLeadPaymentStatus(leadId: string, status: 'payment_requested' | 'payment_pending' | 'paid' | 'rejected'): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'payment_requested') {
      updateData.payment_requested_at = new Date().toISOString();
    } else if (status === 'paid') {
      updateData.payment_confirmed_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.payment_rejected_at = new Date().toISOString();
    }

    await supabase
      .from('noemia_leads')
      .update(updateData)
      .eq('id', leadId);

  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);
  }
}
