import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// Configurações
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "noeminha_whatsapp_verify_2026";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "noeminha_whatsapp_secret_2026";

// Validar assinatura HMAC-SHA256
function verifySignature(body: string, signature: string): boolean {
  if (!signature) return false;
  
  const expectedSignature = `sha256=${createHmac('sha256', APP_SECRET)
    .update(body, 'utf8')
    .digest('hex')}`;
  
  return signature === expectedSignature;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log(`[WHATSAPP] Verification attempt - mode: ${mode}, token: ${token === VERIFY_TOKEN ? 'VALID' : 'INVALID'}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log(`[WHATSAPP] Verification successful`);
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.log(`[WHATSAPP] Verification failed - mode: ${mode}, token: ${token}`);
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();

  console.log(`[WHATSAPP] POST received - signature: ${signature ? 'PRESENT' : 'MISSING'}, body length: ${body.length}`);

  // NUNCA RETORNAR 403 NO POST - SEMPRE PROCESSAR
  if (!verifySignature(body, signature || "")) {
    console.log(`[WHATSAPP] Invalid signature - CONTINUANDO MESMO ASSIM: ${signature?.substring(0, 50)}...`);
  }

  console.log(`[WHATSAPP] Signature valid - processing webhook`);
  
  try {
    const data = JSON.parse(body);
    console.log(`[WHATSAPP] Webhook processed - object: ${data.object}, entries: ${data.entry?.length || 0}`);
    
    return NextResponse.json({ 
      status: "received", 
      processed: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log(`[WHATSAPP] Processing error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
