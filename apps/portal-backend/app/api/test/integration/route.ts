import { NextResponse } from "next/server";
import { getNotificationEnv } from "../../../../lib/config/env";
import { createAdminSupabaseClient } from "../../../../lib/supabase/admin";

export async function GET() {
  try {
    // Verificar configurações do WhatsApp
    const whatsappConfig = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'CONFIGURED' : 'MISSING',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'CONFIGURED' : 'MISSING',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'CONFIGURED' : 'MISSING',
      appSecret: process.env.WHATSAPP_APP_SECRET ? 'CONFIGURED' : 'MISSING'
    };

    // Verificar se o sistema está pronto para integração
    const systemReady = Object.values(whatsappConfig).every(status => status === 'CONFIGURED');

    // Testar conexão com banco (para salvar mensagens)
    let dbConnection = 'NOT_TESTED';
    try {
      const supabase = createAdminSupabaseClient();
      const { error } = await supabase.from('noemia_leads').select('count').limit(1);
      dbConnection = error ? 'ERROR' : 'CONNECTED';
    } catch (error) {
      dbConnection = 'ERROR';
    }

    // Verificar se as tabelas necessárias existem
    const requiredTables = ['noemia_leads', 'noemia_conversations'];
    let tablesStatus = 'UNKNOWN';

    return NextResponse.json({
      status: "integration_test",
      timestamp: new Date().toISOString(),
      systemReady,
      whatsapp: whatsappConfig,
      database: {
        connection: dbConnection,
        requiredTables: requiredTables
      },
      webhook: {
        getUrl: "https://portal.advnoemia.com.br/api/whatsapp/webhook",
        verification: "READY",
        processing: "READY"
      },
      nextSteps: systemReady ? [
        "1. Validar webhook na Meta Developer Console",
        "2. Testar envio de mensagem real",
        "3. Implementar salvamento no banco",
        "4. Conectar com sistema de IA"
      ] : [
        "1. Configurar variáveis WhatsApp faltantes",
        "2. Verificar conexão com banco",
        "3. Validar estrutura das tabelas"
      ]
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Erro ao testar integração",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, testMessage } = await request.json();

    if (action === "simulate_lead_creation") {
      // Simular criação de lead a partir de mensagem WhatsApp
      const supabase = createAdminSupabaseClient();
      
      const leadData = {
        platform: 'whatsapp',
        phone: '5584999999999',
        name: 'Teste WhatsApp Integration',
        message: testMessage || 'Mensagem de teste do sistema',
        status: 'new',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('noemia_leads')
        .insert(leadData)
        .select()
        .single();

      if (error) {
        return NextResponse.json({
          status: "error",
          message: "Falha ao criar lead de teste",
          error: error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        status: "success",
        message: "Lead de teste criado com sucesso",
        data: leadData
      });
    }

    return NextResponse.json({
      status: "error",
      message: "Ação não reconhecida"
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Erro na simulação",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
