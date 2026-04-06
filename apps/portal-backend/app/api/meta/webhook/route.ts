import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processMetaEvent } from '@/lib/meta/webhook-processor';
import { logMetaEvent } from '@/lib/meta/logging';

// Configurações da Meta
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

/**
 * Webhook para receber eventos da Meta (Instagram + WhatsApp)
 * GET: Verificação do webhook
 * POST: Recebimento de eventos
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificação inicial do webhook com Meta
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('✅ Webhook Meta verificado com sucesso');
    return new NextResponse(challenge);
  }

  return NextResponse.json({ error: 'Verificação falhou' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Validar assinatura da Meta (segurança)
    if (!validateMetaSignature(body, signature)) {
      console.error('❌ Assinatura inválida do webhook Meta');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 403 });
    }

    const event = JSON.parse(body);
    
    // Log do evento bruto para debug
    await logMetaEvent('webhook_received', {
      object: event.object,
      entry_count: event.entry?.length || 0,
      timestamp: Date.now()
    });

    // Processar cada entrada do evento
    for (const entry of event.entry || []) {
      await processWebhookEntry(entry);
    }

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    console.error('❌ Erro no webhook Meta:', error);
    await logMetaEvent('webhook_error', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    });
    
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * Valida assinatura do webhook da Meta
 */
function validateMetaSignature(body: string, signature: string | null): boolean {
  if (!META_APP_SECRET || !signature) {
    return false;
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Processa uma entrada do webhook
 */
async function processWebhookEntry(entry: any) {
  const { id, time, messaging, changes, standby } = entry;

  // Eventos do Instagram Direct
  if (messaging) {
    for (const message of messaging) {
      await processMetaEvent({
        type: 'instagram_direct',
        platform: 'instagram',
        data: message,
        timestamp: time
      });
    }
  }

  // Eventos de mudanças (comentários, etc.)
  if (changes) {
    for (const change of changes) {
      await processMetaEvent({
        type: 'instagram_change',
        platform: 'instagram',
        data: change,
        timestamp: time
      });
    }
  }

  // Eventos do WhatsApp
  if (standby) {
    for (const message of standby) {
      await processMetaEvent({
        type: 'whatsapp_message',
        platform: 'whatsapp',
        data: message,
        timestamp: time
      });
    }
  }
}
