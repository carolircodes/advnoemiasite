import { NextResponse } from "next/server";
import { getServerEnv, getNotificationEnv } from "../../../../lib/config/env";

export async function GET() {
  try {
    const serverEnv = getServerEnv();
    const notificationEnv = getNotificationEnv();

    // Verificar variáveis críticas
    const criticalEnvs = {
      NEXT_PUBLIC_APP_URL: serverEnv.NEXT_PUBLIC_APP_URL,
      EMAIL_FROM: notificationEnv.emailFrom,
      NOTIFICATIONS_PROVIDER: notificationEnv.provider,
      RESEND_API_KEY: notificationEnv.resendApiKey ? 'CONFIGURED' : 'MISSING',
      CRON_SECRET: serverEnv.CRON_SECRET ? 'CONFIGURED' : 'MISSING'
    };

    // Verificar Supabase
    const supabaseEnvs = {
      NEXT_PUBLIC_SUPABASE_URL: serverEnv.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: serverEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'CONFIGURED' : 'MISSING',
      SUPABASE_SECRET_KEY: serverEnv.SUPABASE_SECRET_KEY ? 'CONFIGURED' : 'MISSING'
    };

    return NextResponse.json({
      status: "debug",
      timestamp: new Date().toISOString(),
      critical: criticalEnvs,
      supabase: supabaseEnvs,
      notificationConfig: {
        provider: notificationEnv.provider,
        emailFrom: notificationEnv.emailFrom,
        resendApiKey: notificationEnv.resendApiKey ? 'SET' : 'NOT SET',
        smtpHost: notificationEnv.smtpHost,
        smtpPort: notificationEnv.smtpPort
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
