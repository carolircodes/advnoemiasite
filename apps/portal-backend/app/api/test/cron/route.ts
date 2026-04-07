import { NextResponse } from "next/server";
import { getServerEnv, getNotificationEnv } from "../../../../lib/config/env";
import { processPendingNotifications } from "../../../../lib/services/process-notifications";

export async function GET(request: Request) {
  try {
    // Simular o comportamento do cron real
    const env = getServerEnv();
    const notificationEnv = getNotificationEnv();

    // Verificar configurações obrigatórias
    const configCheck = {
      emailFrom: !!notificationEnv.emailFrom,
      provider: notificationEnv.provider,
      resendApiKey: !!notificationEnv.resendApiKey,
      cronSecret: !!env.CRON_SECRET
    };

    // Verificar se está tudo configurado
    const isConfigured = Object.values(configCheck).every(Boolean);

    if (!isConfigured) {
      return NextResponse.json({
        status: "error",
        message: "Configurações incompletas",
        config: configCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Testar autenticação
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;

    const authResult = {
      hasAuth: !!authHeader,
      isValid: authHeader === expectedAuth,
      expected: expectedAuth,
      received: authHeader
    };

    if (env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json({
        status: "unauthorized",
        message: "Cron secret inválido",
        auth: authResult,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Se chegou aqui, está autorizado ou não exige autenticação
    try {
      // Tentar processar notificações (sem depender de dados reais)
      const result = await processPendingNotifications(5);

      return NextResponse.json({
        status: "success",
        message: "Cron executado com sucesso",
        auth: authResult,
        config: configCheck,
        result: result,
        timestamp: new Date().toISOString()
      });

    } catch (processError) {
      return NextResponse.json({
        status: "processing_error",
        message: "Erro ao processar notificações",
        error: processError instanceof Error ? processError.message : String(processError),
        auth: authResult,
        config: configCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      status: "system_error",
      message: "Erro no sistema de cron",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
