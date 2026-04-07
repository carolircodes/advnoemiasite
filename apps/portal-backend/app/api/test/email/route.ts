// TESTE DE EMAIL DIRETO - VALIDAÇÃO RESEND
import { sendNotificationEmail } from "../../../../lib/notifications/email-delivery";

export async function GET() {
  try {
    const result = await sendNotificationEmail({
      to: "onboarding@resend.dev",
      subject: "Teste Sistema Notificações - Advnoemia Portal",
      html: `
        <h1>Teste de Email - Sistema de Notificações</h1>
        <p>Email de teste para validar configuração do Resend no portal Advnoemia.</p>
        <ul>
          <li>Provider: Resend</li>
          <li>From: onboarding@resend.dev</li>
          <li>To: onboarding@resend.dev</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>Se você recebeu este email, o sistema está funcionando corretamente!</p>
        <br>
        <p>Atenciosamente,<br>Sistema de Notificações Advnoemia</p>
      `,
      text: `
        Teste de Email - Sistema de Notificações
        
        Email de teste para validar configuração do Resend no portal Advnoemia.
        
        Detalhes:
        - Provider: Resend
        - From: onboarding@resend.dev
        - To: onboarding@resend.dev
        - Timestamp: ${new Date().toISOString()}
        
        Se você recebeu este email, o sistema está funcionando corretamente!
        
        Atenciosamente,
        Sistema de Notificações Advnoemia
      `
    });

    return Response.json({
      status: "success",
      message: "Email enviado com sucesso!",
      timestamp: new Date().toISOString(),
      details: result
    });

  } catch (error) {
    return Response.json({
      status: "error",
      message: "Falha ao enviar email",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
