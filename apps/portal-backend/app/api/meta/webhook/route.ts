import { NextResponse } from "next/server";
import { createHmac } from "crypto";

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminha_app_secret_2026";

// Função de log estruturado
function logEvent(event: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: data || null
  };
  
  console.log(JSON.stringify(logEntry));
}

// Validar assinatura HMAC-SHA256
function verifySignature(body: string, signature: string): boolean {
  if (!signature) {
    logEvent('SIGNATURE_MISSING', { 
      hasAppSecret: !!APP_SECRET,
      appSecretLength: APP_SECRET?.length || 0
    }, 'error');
    return false;
  }
  
  const expectedSignature = `sha256=${createHmac('sha256', APP_SECRET)
    .update(body, 'utf8')
    .digest('hex')}`;
  
  const isValid = signature === expectedSignature;
  
  logEvent('SIGNATURE_VALIDATION_DEBUG', {
    received: signature?.substring(0, 50) + '...',
    expected: expectedSignature?.substring(0, 50) + '...',
    isValid,
    appSecretSet: !!APP_SECRET,
    appSecretLength: APP_SECRET?.length || 0,
    bodyLength: body.length
  });
  
  return isValid;
}

export async function GET(request: Request) {
  console.log("=== META WEBHOOK GET RECEIVED ===");
  
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("=== META VERIFICATION DEBUG ===");
  console.log("MODE:", mode);
  console.log("TOKEN:", token === VERIFY_TOKEN ? 'VALID' : 'INVALID');
  console.log("HAS CHALLENGE:", !!challenge);
  console.log("EXPECTED TOKEN:", VERIFY_TOKEN);
  console.log("RECEIVED TOKEN:", token);

  logEvent('META_VERIFICATION_ATTEMPT', {
    mode,
    token: token === VERIFY_TOKEN ? 'VALID' : 'INVALID',
    hasChallenge: !!challenge,
    expectedToken: VERIFY_TOKEN,
    receivedToken: token
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("=== META VERIFICATION SUCCESS ===");
    logEvent('META_VERIFICATION_SUCCESS', { challenge });
    return new NextResponse(challenge, { status: 200 });
  }

  console.log("=== META VERIFICATION FAILED ===");
  logEvent('META_VERIFICATION_FAILED', { mode, token });
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  // LOGS MUITO VISÍVEIS NO INÍCIO - ANTES DE QUALQUER PARSING
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INSTAGRAM WEBHOOK HIT - POST REQUEST RECEIVED');
  console.log('='.repeat(80));
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 URL:', request.url);
  console.log('🔑 Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  console.log('👤 User-Agent:', request.headers.get('user-agent'));
  console.log('📍 IP Origin:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown');
  console.log('='.repeat(80) + '\n');
    META_APP_SECRET: !!APP_SECRET,
    ALL_ENVS: {
      META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ? 'SET' : 'MISSING',
      META_APP_SECRET: process.env.META_APP_SECRET ? 'SET' : 'MISSING',
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'MISSING',
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ? 'SET' : 'MISSING'
    }
  });

  console.log("=== META POST DEBUG ===");
  console.log("HEADERS:", {
    'content-type': request.headers.get("content-type"),
    'x-hub-signature-256': signature?.substring(0, 50) + '...',
    'user-agent': request.headers.get("user-agent")
  });
  console.log("BODY LENGTH:", body.length);
  console.log("BODY PREVIEW:", body.substring(0, 1000) + (body.length > 1000 ? '...' : ''));

  // Validar assinatura
  console.log("=== VALIDATING META SIGNATURE ===");
  if (!verifySignature(body, signature || "")) {
    console.log("=== META SIGNATURE INVALID ===");
    logEvent('META_SIGNATURE_INVALID', { 
      signature: signature?.substring(0, 20) + '...' 
    }, 'error');
    return new NextResponse("Invalid signature", { status: 403 });
  }

  console.log("=== META SIGNATURE VALID ===");
  logEvent('META_SIGNATURE_OK', { 
    signature: signature?.substring(0, 20) + '...',
    bodyLength: body.length
  });

  try {
    const data = JSON.parse(body);
    
    console.log("=== PARSING META PAYLOAD ===");
    console.log("OBJECT:", data.object);
    console.log("ENTRY COUNT:", data.entry?.length || 0);
    console.log("FULL PAYLOAD:", JSON.stringify(data, null, 2));
    
    logEvent('META_WEBHOOK_RECEIVED', { 
      object: data.object,
      entryCount: data.entry?.length || 0,
      fullData: data
    });

    // Verificar se é Instagram
    if (data.object === "instagram") {
      console.log("=== INSTAGRAM EVENT DETECTED ===");
      logEvent('INSTAGRAM_EVENT_RECEIVED', { 
        object: data.object,
        entryCount: data.entry?.length || 0
      });

      // Processar mensagens do Instagram
      for (const entry of data.entry || []) {
        console.log("=== PROCESSING INSTAGRAM ENTRY ===");
        console.log("ENTRY ID:", entry.id);
        console.log("CHANGES COUNT:", entry.changes?.length || 0);
        
        for (const change of entry.changes || []) {
          console.log("=== PROCESSING INSTAGRAM CHANGE ===");
          console.log("FIELD:", change.field);
          
          if (change.field === "messages") {
            console.log("=== INSTAGRAM MESSAGES FOUND ===");
            const messages = change.value.messages || [];
            console.log("MESSAGES COUNT:", messages.length);
            
            for (const message of messages) {
              console.log("=== PROCESSING INSTAGRAM MESSAGE ===");
              console.log("FROM:", message.from?.id);
              console.log("MESSAGE ID:", message.id);
              console.log("CONTENT:", message.text || 'NO TEXT');
              
              logEvent('INSTAGRAM_MESSAGE_PARSED', {
                from: message.from?.id,
                messageId: message.id,
                content: message.text,
                timestamp: message.timestamp
              });

              // Resposta FIXA sem dependência de IA
              const fixedResponse = "Olá! Recebi sua mensagem e já vou te ajudar.";
              
              console.log("=== SENDING FIXED INSTAGRAM RESPONSE ===");
              console.log("RESPONSE TEXT:", fixedResponse);
              console.log("=== TODO: IMPLEMENT INSTAGRAM API SEND ===");
              
              logEvent('INSTAGRAM_SENDING_FIXED_RESPONSE', {
                messageId: message.id,
                from: message.from?.id,
                fixedResponse: fixedResponse,
                status: 'NOT_IMPLEMENTED_YET'
              });

              // TODO: Implementar envio via Instagram Graph API
              // Por agora, apenas log que a resposta foi preparada
              console.log("=== INSTAGRAM RESPONSE PREPARED (NOT SENT) ===");
              console.log("REASON: Instagram API send not implemented yet");
            }
          }
        }
      }
    } else {
      console.log("=== NOT INSTAGRAM OBJECT ===");
      console.log("OBJECT TYPE:", data.object);
      logEvent('META_NOT_INSTAGRAM', {
        object: data.object
      });
    }

    console.log("=== META WEBHOOK PROCESSED SUCCESSFULLY ===");
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (error) {
    console.log("=== META WEBHOOK ERROR ===");
    console.log("ERROR:", error instanceof Error ? error.message : String(error));
    
    logEvent('META_WEBHOOK_ERROR', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, 'error');
    
    return NextResponse.json({ received: false }, { status: 400 });
  }
}