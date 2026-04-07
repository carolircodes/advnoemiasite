import { NextResponse } from "next/server";

// Simular payload real do WhatsApp
const realWhatsAppPayload = {
  object: "whatsapp_business_account",
  entry: [{
    id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: {
          display_phone_number: "5584999999999",
          phone_number_id: "PHONE_NUMBER_ID"
        },
        contacts: [{
          profile: {
            name: "Teste WhatsApp"
          },
          wa_id: "5584999999999"
        }],
        messages: [{
          from: "5584988888888",
          id: "wamid.HBgLNTI4OTg4ODg4OFVzARAAE=",
          timestamp: "1712478255",
          text: {
            body: "Olá, gostaria de saber sobre aposentadoria"
          },
          type: "text"
        }]
      }
    }]
  }]
};

// Teste completo do fluxo
export async function POST(request: Request) {
  try {
    const { testMessage, phoneNumber } = await request.json();
    
    // Se não fornecer dados, usar payload real
    const payload = testMessage ? {
      object: "whatsapp_business_account",
      entry: [{
        id: "TEST_ENTRY",
        changes: [{
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            messages: [{
              from: phoneNumber || "5584988888888",
              id: "test_message_id",
              timestamp: Date.now().toString(),
              text: {
                body: testMessage
              },
              type: "text"
            }]
          }
        }]
      }]
    } : realWhatsAppPayload;

    // Enviar para o webhook real
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'test_signature_for_development'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    return NextResponse.json({
      status: "test_completed",
      testType: testMessage ? "custom" : "real_payload",
      payload: payload,
      webhookResponse: {
        status: response.status,
        ok: response.ok,
        body: result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: "test_error",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET para mostrar exemplo de payload
export async function GET() {
  return NextResponse.json({
    title: "WhatsApp Webhook - Exemplo de Payload Real",
    description: "Este é um exemplo de payload que o WhatsApp envia para o webhook",
    example: realWhatsAppPayload,
    testEndpoint: "POST /api/test/whatsapp-flow",
    usage: {
      customTest: {
        method: "POST",
        body: {
          testMessage: "Sua mensagem de teste aqui",
          phoneNumber: "5584988888888"
        }
      },
      realPayloadTest: {
        method: "POST",
        body: {}
      }
    },
    expectedBehavior: [
      "1. Webhook recebe o payload",
      "2. Extrai informações da mensagem",
      "3. Loga estrutura da mensagem",
      "4. Processa com NoemIA (se disponível)",
      "5. Envia resposta automática via WhatsApp API",
      "6. Loga resultado completo"
    ]
  });
}
