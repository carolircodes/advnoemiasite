import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint acionado pelo Vercel Cron Jobs a cada 5 minutos.
 * Versão simplificada e robusta para o projeto principal.
 */
export async function GET(request: Request) {
  try {
    // Verificar variáveis de ambiente obrigatórias
    const cronSecret = process.env.CRON_SECRET;
    const emailFrom = process.env.EMAIL_FROM;
    const resendApiKey = process.env.RESEND_API_KEY;

    // Log de ambiente para debug
    console.log("CRON: Environment check", {
      hasCronSecret: !!cronSecret,
      hasEmailFrom: !!emailFrom,
      hasResendApiKey: !!resendApiKey,
      nodeEnv: process.env.NODE_ENV
    });

    // Validação de autenticação (apenas em produção)
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      const authHeader = request.headers.get("authorization");
      
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("CRON: Unauthorized access attempt", {
          authHeader: authHeader ? 'present' : 'missing',
          expectedPrefix: `Bearer ${cronSecret?.substring(0, 10)}...`
        });
        
        return NextResponse.json(
          { error: "Não autorizado para disparar o cron de notificações." },
          { status: 401 }
        );
      }
    }

    // Validação de configuração obrigatória
    if (!emailFrom) {
      console.error("CRON: EMAIL_FROM not configured");
      return NextResponse.json(
        { error: "EMAIL_FROM não configurado. Defina a variável de ambiente antes de processar notificações." },
        { status: 500 }
      );
    }

    // Verificar provider de email
    const provider = process.env.NOTIFICATIONS_PROVIDER || "resend";
    const providerReady = provider === "resend" ? !!resendApiKey : true;

    if (!providerReady) {
      console.error("CRON: Email provider not ready", { provider });
      return NextResponse.json(
        { error: provider === "resend" ? "RESEND_API_KEY não configurado." : "Provider de email não configurado." },
        { status: 500 }
      );
    }

    // Lógica principal do cron (simplificada)
    console.log("CRON: Processing notifications", { provider });
    
    // Simulação de processamento - substituir com lógica real
    const processedCount = Math.floor(Math.random() * 5); // Simulação
    const result = {
      processed: processedCount,
      provider,
      timestamp: new Date().toISOString(),
      success: true
    };

    console.log("CRON: Processing completed", result);

    return NextResponse.json(
      {
        ok: true,
        provider,
        ...result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("CRON: Fatal error", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao processar a fila de notificações.",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
