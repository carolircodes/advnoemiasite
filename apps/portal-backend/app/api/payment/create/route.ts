import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuração do Mercado Pago com proteção
const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!mercadoPagoAccessToken || !supabaseUrl || !supabaseSecretKey) {
  console.error("Variáveis obrigatórias não configuradas para criação de pagamento");
  throw new Error("Configuração obrigatória ausente para criação de pagamento");
}

const mercadopago = new MercadoPagoConfig({
  accessToken: mercadoPagoAccessToken,
});

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// Valor padrão da consulta (pode ser configurado via variável de ambiente)
const CONSULTATION_VALUE = Number(process.env.CONSULTATION_VALUE) || 297.00;

export async function POST(request: NextRequest) {
  try {
    const { leadId, userId, metadata = {} } = await request.json();

    // Validar dados obrigatórios
    if (!leadId || !userId) {
      return NextResponse.json(
        { error: 'leadId e userId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe um pagamento pendente para este lead
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('lead_id', leadId)
      .eq('status', 'pending')
      .single();

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        paymentUrl: existingPayment.payment_url,
        paymentId: existingPayment.external_id,
        message: 'Pagamento já gerado anteriormente'
      });
    }

    // Criar preferência de pagamento no Mercado Pago
    const preference = new Preference(mercadopago);

    const preferenceData = {
      items: [
        {
          id: `consultation_${leadId}`,
          title: 'Consulta Jurídica - Noêmia Paixão Advocacia',
          description: 'Análise completa do seu caso jurídico com orientação especializada',
          quantity: 1,
          unit_price: CONSULTATION_VALUE,
          currency_id: 'BRL',
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
        excluded_payment_types: [
          { id: 'debit_card' },
          { id: 'credit_card' }
        ],
        excluded_payment_methods: [
          { id: 'bolbradesco' },
          { id: 'pec' }
        ],
        default_payment_method_id: 'pix'
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/pagamento/sucesso`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/pagamento/falha`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pagamento/pendente`
      },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/webhook`,
      auto_return: 'approved',
      external_reference: `consultation_${leadId}_${Date.now()}`,
      metadata: {
        lead_id: leadId,
        user_id: userId,
        consultation_type: 'initial',
        ...metadata
      }
    };

    const response = await preference.create({ body: preferenceData });

    // Salvar pagamento no banco de dados
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        lead_id: leadId,
        user_id: userId,
        external_id: response.id,
        payment_url: response.init_point,
        amount: CONSULTATION_VALUE,
        status: 'pending',
        metadata: {
          ...preferenceData.metadata,
          preference_id: response.id
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao salvar pagamento:', paymentError);
      return NextResponse.json(
        { error: 'Erro ao processar pagamento' },
        { status: 500 }
      );
    }

    // Atualizar status do lead para "payment_pending"
    await supabase
      .from('noemia_leads')
      .update({
        status: 'payment_pending',
        payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    return NextResponse.json({
      success: true,
      paymentUrl: response.init_point,
      paymentId: response.id,
      amount: CONSULTATION_VALUE,
      message: 'Link de pagamento gerado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Método GET para verificar status de pagamento
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('payment_id');

  if (!paymentId) {
    return NextResponse.json(
      { error: 'payment_id é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('external_id', paymentId)
      .single();

    if (!payment) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado' },
        { status: 404 }
      );
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
    console.error('Erro ao verificar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
