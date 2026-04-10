import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePaymentLink, generatePaymentMessage } from '@/lib/payment/payment-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("Variáveis do Supabase não configuradas em noemia payment route");
  throw new Error("Configuração do Supabase é obrigatória para pagamentos da NoemIA");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

export async function POST(request: NextRequest) {
  try {
    const { leadId, userId, message, intentionType } = await request.json();

    // Validar dados obrigatórios
    if (!leadId || !userId) {
      return NextResponse.json(
        { error: 'leadId e userId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o lead existe
    const { data: lead, error: leadError } = await supabase
      .from('noemia_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe um pagamento ativo
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('lead_id', leadId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingPayment && existingPayment.status === 'pending') {
      // Já existe pagamento pendente, retornar link existente
      const message = generatePaymentMessage({
        success: true,
        paymentUrl: existingPayment.payment_url,
        paymentId: existingPayment.external_id,
        amount: existingPayment.amount
      });

      return NextResponse.json({
        success: true,
        message,
        paymentUrl: existingPayment.payment_url,
        paymentId: existingPayment.external_id,
        alreadyExists: true
      });
    }

    if (existingPayment && existingPayment.status === 'approved') {
      // Pagamento já aprovado
      return NextResponse.json({
        success: true,
        message: "Seu pagamento já foi confirmado! Em instantes você receberá as próximas orientações.",
        alreadyPaid: true
      });
    }

    // Gerar novo pagamento
    const paymentResponse = await generatePaymentLink({
      leadId,
      userId,
      metadata: {
        intention_type: intentionType,
        original_message: message,
        user_agent: request.headers.get('user-agent')
      }
    });

    if (!paymentResponse.success) {
      return NextResponse.json(
        { error: paymentResponse.error || 'Erro ao gerar pagamento' },
        { status: 500 }
      );
    }

    // Adicionar mensagem ao histórico do lead
    const aiMessage = generatePaymentMessage(paymentResponse);
    
    await supabase
      .from('noemia_lead_conversations')
      .insert({
        lead_id: leadId,
        message: aiMessage,
        sender: 'noemia',
        message_type: 'payment_request',
        metadata: {
          payment_generated: true,
          payment_id: paymentResponse.paymentId,
          payment_url: paymentResponse.paymentUrl,
          amount: paymentResponse.amount,
          intention_type: intentionType
        },
        created_at: new Date().toISOString()
      });

    // Atualizar status do lead
    await supabase
      .from('noemia_leads')
      .update({
        status: 'payment_pending',
        payment_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    return NextResponse.json({
      success: true,
      message: aiMessage,
      paymentUrl: paymentResponse.paymentUrl,
      paymentId: paymentResponse.paymentId,
      amount: paymentResponse.amount
    });

  } catch (error) {
    console.error('Erro ao processar pagamento da IA:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Método GET para verificar status de pagamento de um lead
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');

  if (!leadId) {
    return NextResponse.json(
      { error: 'lead_id é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!payment) {
      return NextResponse.json(
        { error: 'Nenhum pagamento encontrado para este lead' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        external_id: payment.external_id,
        status: payment.status,
        amount: payment.amount,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        approved_at: payment.approved_at
      }
    });

  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
