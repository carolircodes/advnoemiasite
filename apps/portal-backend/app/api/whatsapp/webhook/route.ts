import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// Configurações
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "noeminha_whatsapp_secret_2026";

// Função de log
function logEvent(event: string, data?: any) {
  console.log(`[${new Date().toISOString()}] WHATSAPP_WEBHOOK ${event}:`, data || '');
}

// Validar assinatura HMAC-SHA256
function verifySignature(body: string, signature: string): boolean {
  if (!signature) return false;
  
  const expectedSignature = `sha256=${createHmac('sha256', APP_SECRET)
    .update(body, 'utf8')
    .digest('hex')}`;
  
  return signature === expectedSignature;
}

// Handler GET para verificação do webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  logEvent('VERIFICATION_ATTEMPT', {
    mode,
    token: token === VERIFY_TOKEN ? 'VALID' : 'INVALID',
    hasChallenge: !!challenge
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logEvent('VERIFICATION_SUCCESS', { challenge });
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  logEvent('VERIFICATION_FAILED', { mode, token });
  return new Response("Forbidden", { status: 403 });
}

// Handler POST para processamento de mensagens
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();

  // Validar assinatura
  if (!verifySignature(body, signature || "")) {
    logEvent('SIGNATURE_INVALID', { signature: signature?.substring(0, 20) + '...' });
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    const data = JSON.parse(body);
    logEvent('MESSAGE_RECEIVED', { 
      object: data.object,
      entryCount: data.entry?.length || 0 
    });

    // Processar mensagens (implementação básica)
    if (data.object === "whatsapp_business_account") {
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const messages = change.value.messages || [];
            for (const message of messages) {
              if (message.type === "text") {
                logEvent('TEXT_MESSAGE', {
                  from: message.from,
                  text: message.text.body,
                  timestamp: message.timestamp
                });
                
                // TODO: Implementar processamento real da mensagem
                // - Salvar no banco
                // - Processar com IA
                // - Enviar resposta
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      status: "received", 
      processed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logEvent('PROCESSING_ERROR', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
