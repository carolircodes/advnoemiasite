import { NextResponse } from 'next/server';
import { generateContextLink } from '@/lib/meta/link-generator';
import { detectThemeFromText } from '@/lib/meta/theme-detector';

/**
 * Endpoint de teste para funcionalidades da Meta
 * GET: Testa detecção de tema e geração de links
 * POST: Simula evento do webhook
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || 'Preciso de ajuda com aposentadoria';
  const origem = searchParams.get('origem') || 'instagram';

  try {
    // Testar detecção de tema
    const detectedTheme = detectThemeFromText(text);
    
    // Testar geração de link
    const contextLink = generateContextLink({
      tema: detectedTheme,
      origem: origem,
      campanha: 'test',
      video: 'test123'
    });

    const testResults = {
      success: true,
      input: {
        text,
        origem
      },
      output: {
        detectedTheme,
        contextLink,
        confidence: detectedTheme ? 'Theme detected' : 'No theme detected'
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(testResults);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Simular diferentes tipos de eventos
    const eventType = body.type || 'instagram_direct';
    
    let mockEvent;
    
    switch (eventType) {
      case 'instagram_direct':
        mockEvent = {
          object: 'instagram',
          entry: [{
            id: '123456789',
            time: Date.now() / 1000,
            messaging: [{
              sender: { id: 'user_123' },
              message: { text: body.text || 'Preciso de ajuda com aposentadoria' }
            }]
          }]
        };
        break;
        
      case 'instagram_comment':
        mockEvent = {
          object: 'instagram',
          entry: [{
            id: '123456789',
            time: Date.now() / 1000,
            changes: [{
              field: 'comments',
              value: {
                id: 'comment_123',
                text: body.text || 'Como faço para me aposentar?',
                from: { id: 'user_123' }
              }
            }]
          }]
        };
        break;
        
      case 'whatsapp_message':
        mockEvent = {
          object: 'whatsapp_business_account',
          entry: [{
            id: '123456789',
            time: Date.now() / 1000,
            standby: [{
              from: '5584996248241',
              text: { body: body.text || 'Olá, preciso de ajuda jurídica' }
            }]
          }]
        };
        break;
        
      default:
        mockEvent = { error: 'Invalid event type' };
    }

    // Enviar para o webhook principal
    const webhookUrl = new URL('/api/meta/webhook', request.url);
    
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test_signature' // Assinatura de teste
      },
      body: JSON.stringify(mockEvent)
    });

    const responseData = await response.json().catch(() => ({}));

    return NextResponse.json({
      success: response.ok,
      eventType,
      mockEvent,
      webhookResponse: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
