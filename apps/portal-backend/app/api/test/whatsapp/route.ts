import { NextResponse } from "next/server";

export async function GET() {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Verificar se as variáveis estão configuradas
    if (!accessToken) {
      return NextResponse.json({
        status: "error",
        message: "WHATSAPP_ACCESS_TOKEN não configurado",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!phoneNumberId) {
      return NextResponse.json({
        status: "error", 
        message: "WHATSAPP_PHONE_NUMBER_ID não configurado",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Testar API do WhatsApp (verificar se o token é válido)
    const testUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=name,messaging_product&access_token=${accessToken}`;

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        status: "error",
        message: "Falha ao validar token do WhatsApp",
        error: data,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      status: "success",
      message: "WhatsApp API conectado com sucesso",
      data: {
        phoneNumberId: phoneNumberId,
        phoneNumberName: data.name,
        messagingProduct: data.messaging_product
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Erro ao testar integração WhatsApp",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json();

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({
        status: "error",
        message: "Configurações do WhatsApp incompletas"
      }, { status: 400 });
    }

    // Enviar mensagem de teste
    const sendUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: message
      }
    };

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        status: "error",
        message: "Falha ao enviar mensagem",
        error: data
      }, { status: 400 });
    }

    return NextResponse.json({
      status: "success",
      message: "Mensagem enviada com sucesso",
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Erro ao enviar mensagem",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
