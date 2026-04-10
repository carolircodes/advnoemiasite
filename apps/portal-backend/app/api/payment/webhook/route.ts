import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Configuração do Mercado Pago
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

// Configuração do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Webhook secret para validação (opcional, mas recomendado)
const WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');
    
    // Log para debug
    console.log('🔔 WEBHOOK RECEBIDO - Mercado Pago');
    console.log('Signature:', signature);
    console.log('Body:', body);

    // Parse do body
    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Erro ao parsear webhook:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Validar tipo de evento
    if (event.type !== 'payment') {
      console.log('⏭️ Ignorando evento não relacionado a pagamento:', event.type);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentData = event.data;

    // Buscar informações detalhadas do pagamento
    const payment = new Payment(mercadopago);
    const paymentInfo = await payment.get({ id: paymentData.id });

    console.log('💳 INFORMAÇÕES DO PAGAMENTO:', {
      id: paymentInfo.id,
      status: paymentInfo.status,
      status_detail: paymentInfo.status_detail,
      external_reference: paymentInfo.external_reference,
      amount: paymentInfo.transaction_amount,
      payment_method_id: paymentInfo.payment_method_id,
      payment_type_id: paymentInfo.payment_type_id
    });

    // Processar apenas pagamentos aprovados
    if (paymentInfo.status === 'approved') {
      await handleApprovedPayment(paymentInfo);
    } else if (paymentInfo.status === 'rejected') {
      await handleRejectedPayment(paymentInfo);
    } else if (paymentInfo.status === 'pending') {
      await handlePendingPayment(paymentInfo);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('❌ ERRO NO WEBHOOK:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Função para processar pagamento aprovado
async function handleApprovedPayment(paymentInfo: any) {
  console.log('✅ PROCESSANDO PAGAMENTO APROVADO');

  try {
    // Extrair informações do external_reference
    const externalReference = paymentInfo.external_reference;
    const match = externalReference.match(/consultation_(\d+)_\d+/);
    
    if (!match) {
      console.error('❌ External reference inválido:', externalReference);
      return;
    }

    const leadId = match[1];

    // Verificar se já foi processado
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('external_id', paymentInfo.id)
      .eq('status', 'approved')
      .single();

    if (existingPayment) {
      console.log('⚠️ Pagamento já processado anteriormente');
      return;
    }

    // Atualizar status do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'approved',
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
      .eq('external_id', paymentInfo.id)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao atualizar pagamento:', paymentError);
      return;
    }

    // Atualizar status do lead
    const { data: lead, error: leadError } = await supabase
      .from('noemia_leads')
      .update({
        status: 'paid',
        payment_status: 'confirmed',
        payment_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (leadError) {
      console.error('❌ Erro ao atualizar lead:', leadError);
      return;
    }

    // Enviar mensagem automática de confirmação
    await sendPaymentConfirmationMessage(lead);

    // Criar evento de acompanhamento
    await supabase
      .from('follow_up_events')
      .insert({
        lead_id: leadId,
        event_type: 'payment_confirmed',
        trigger: 'automatic',
        message: 'Pagamento confirmado automaticamente via webhook',
        metadata: {
          payment_id: payment.id,
          mercado_pago_payment_id: paymentInfo.id,
          amount: paymentInfo.transaction_amount,
          payment_method: paymentInfo.payment_method_id
        },
        sent_at: new Date().toISOString()
      });

    console.log('✅ PAGAMENTO PROCESSADO COM SUCESSO:', {
      leadId,
      paymentId: payment.id,
      amount: paymentInfo.transaction_amount
    });

  } catch (error) {
    console.error('❌ ERRO AO PROCESSAR PAGAMENTO APROVADO:', error);
  }
}

// Função para processar pagamento rejeitado
async function handleRejectedPayment(paymentInfo: any) {
  console.log('❌ PROCESSANDO PAGAMENTO REJEITADO');

  try {
    const externalReference = paymentInfo.external_reference;
    const match = externalReference.match(/consultation_(\d+)_\d+/);
    
    if (!match) {
      console.error('❌ External reference inválido:', externalReference);
      return;
    }

    const leadId = match[1];

    // Atualizar status do pagamento
    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        status_detail: paymentInfo.status_detail,
        rejected_at: new Date().toISOString(),
        metadata: {
          mercado_pago_payment_id: paymentInfo.id,
          mercado_pago_status: paymentInfo.status,
          mercado_pago_status_detail: paymentInfo.status_detail
        }
      })
      .eq('external_id', paymentInfo.id);

    // Atualizar status do lead
    await supabase
      .from('noemia_leads')
      .update({
        payment_status: 'rejected',
        payment_rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    console.log('❌ PAGAMENTO REJEITADO:', {
      leadId,
      paymentId: paymentInfo.id,
      reason: paymentInfo.status_detail
    });

  } catch (error) {
    console.error('❌ ERRO AO PROCESSAR PAGAMENTO REJEITADO:', error);
  }
}

// Função para processar pagamento pendente
async function handlePendingPayment(paymentInfo: any) {
  console.log('⏳ PROCESSANDO PAGAMENTO PENDENTE');

  try {
    const externalReference = paymentInfo.external_reference;
    const match = externalReference.match(/consultation_(\d+)_\d+/);
    
    if (!match) {
      console.error('❌ External reference inválido:', externalReference);
      return;
    }

    const leadId = match[1];

    // Atualizar status do pagamento
    await supabase
      .from('payments')
      .update({
        status: 'pending',
        status_detail: paymentInfo.status_detail,
        metadata: {
          mercado_pago_payment_id: paymentInfo.id,
          mercado_pago_status: paymentInfo.status,
          mercado_pago_status_detail: paymentInfo.status_detail
        }
      })
      .eq('external_id', paymentInfo.id);

    console.log('⏳ PAGAMENTO PENDENTE:', {
      leadId,
      paymentId: paymentInfo.id,
      status_detail: paymentInfo.status_detail
    });

  } catch (error) {
    console.error('❌ ERRO AO PROCESSAR PAGAMENTO PENDENTE:', error);
  }
}

// Função para enviar mensagem de confirmação automática
async function sendPaymentConfirmationMessage(lead: any) {
  try {
    const confirmationMessage = `Recebemos a confirmação do seu pagamento.

Agora vamos dar andamento ao seu atendimento com prioridade.

Em instantes você receberá as próximas orientações.`;

    // Adicionar mensagem ao histórico do lead
    await supabase
      .from('noemia_lead_conversations')
      .insert({
        lead_id: lead.id,
        message: confirmationMessage,
        sender: 'noemia',
        message_type: 'payment_confirmation',
        metadata: {
          payment_confirmed: true,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    console.log('📨 Mensagem de confirmação enviada para o lead:', lead.id);

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de confirmação:', error);
  }
}

// Método GET para verificar webhook status
export async function GET() {
  return NextResponse.json({
    status: 'webhook_active',
    timestamp: new Date().toISOString(),
    message: 'Webhook do Mercado Pago está ativo'
  });
}
