import crypto from 'crypto';

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminia_app_secret_2026";

// Função de log unificado
function logEvent(event, data) {
  console.log(`[${new Date().toISOString()}] META_WEBHOOK ${event}:`, data || '');
}

// Detecção de intenção jurídica
function detectLegalIntent(text) {
  const lowerText = text.toLowerCase();
  
  const themes = {
    aposentadoria: ['aposentadoria', 'aposentar', 'aposentado', 'inss', 'previdência', 'benefício', 'rgps'],
    previdenciario: ['previdenciário', 'auxílio', 'doença', 'invalidez', 'acidente', 'trabalho'],
    bancario: ['banco', 'cobrança', 'desconto', 'tarifa', 'juros', 'emprestimo', 'financiamento', 'cheque especial'],
    consumidor: ['consumidor', 'produto', 'serviço', 'defeito', 'troca', 'garantia', 'direito do consumidor'],
    familia: ['divórcio', 'pensão', 'guarda', 'herança', 'testamento', 'inventário', 'filho', 'casamento'],
    civil: ['contrato', 'dano', 'indenização', 'responsabilidade', 'obrigação', 'negócio jurídico']
  };
  
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return theme;
    }
  }
  
  return null;
}

// Geração de link contextual
function generateContextualLink(intent, platform = 'instagram') {
  const baseUrl = 'https://advnoemia.com.br/noemia';
  const params = new URLSearchParams();
  
  if (intent) params.append('tema', intent);
  params.append('origem', platform);
  params.append('video', 'auto');
  
  return `${baseUrl}?${params.toString()}`;
}

// Geração de resposta automática
function generateAutomaticResponse(intent, receivedText, senderName = '', platform = 'instagram') {
  const contextualLink = generateContextualLink(intent, platform);
  
  const responses = {
    aposentadoria: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Vi seu interesse em aposentadoria.`,
      context: 'Entendo que você tem dúvidas sobre aposentadoria. É importante analisar tempo de contribuição, idade mínima e tipo de benefício.',
      cta: 'Posso te ajudar com uma análise personalizada do seu caso.',
      link: contextualLink
    },
    previdenciario: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Entendo sua dúvida previdenciária.`,
      context: 'Questões previdenciárias envolvem diversos benefícios e condições específicas.',
      cta: 'Vamos analisar qual benefício se aplica ao seu caso.',
      link: contextualLink
    },
    bancario: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Recebi sua mensagem sobre questão bancária.`,
      context: 'Problemas com bancos envolvem direitos do consumidor e legislação específica.',
      cta: 'Posso te orientar sobre seus direitos e opções.',
      link: contextualLink
    },
    consumidor: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Vi sua dúvida de consumidor.`,
      context: 'Direitos do consumidor são fundamentais e precisam ser respeitados.',
      cta: 'Vamos verificar seus direitos neste caso.',
      link: contextualLink
    },
    familia: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Entendo sua questão familiar.`,
      context: 'Assuntos de família requerem sensibilidade e conhecimento jurídico adequado.',
      cta: 'Posso te ajudar com orientação familiar.',
      link: contextualLink
    },
    civil: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Recebi sua consulta civil.`,
      context: 'Questões cíveis envolvem obrigações e direitos entre partes.',
      cta: 'Vamos analisar os aspectos do seu caso.',
      link: contextualLink
    }
  };
  
  const response = responses[intent] || {
    greeting: `Olá${senderName ? ', ' + senderName : ''}! Recebi sua mensagem.`,
    context: 'Vou analisar sua solicitação e te retornar com as orientações adequadas.',
    cta: 'Em breve entrarei em contato com mais informações.',
    link: contextualLink
  };
  
  return `${response.greeting} ${response.context} ${response.cta} Acesse: ${response.link}`;
}

// Validação de assinatura HMAC-SHA256
function validateSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Parse de eventos UNIFICADO (Instagram + WhatsApp)
function parseMetaEvent(body) {
  const events = [];
  
  logEvent('PARSE_ATTEMPT', {
    object: body.object,
    entryCount: body.entry?.length || 0,
    platform: body.object
  });
  
  try {
    // Instagram Graph API
    if (body.object === 'instagram' && body.entry) {
      logEvent('PLATFORM_DETECTED', { platform: 'instagram' });
      
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            if (messaging.message?.text) {
              events.push({
                type: 'message',
                platform: 'instagram',
                sender: messaging.sender.id,
                senderName: messaging.sender.name || null,
                text: messaging.message.text,
                messageId: messaging.message.mid,
                timestamp: messaging.timestamp
              });
            }
          }
        }
      }
    }
    
    // WhatsApp Cloud API
    else if (body.object === 'whatsapp_business_account' && body.entry) {
      logEvent('PLATFORM_DETECTED', { platform: 'whatsapp' });
      
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                // Mensagem do usuário (tem campo 'from')
                if (message.type === 'text' && message.from) {
                  events.push({
                    type: 'message',
                    platform: 'whatsapp',
                    sender: message.from,
                    senderName: change.value.contacts?.[0]?.name?.formatted_name || null,
                    text: message.text?.body || '',
                    messageId: message.id,
                    timestamp: message.timestamp || Date.now(),
                    metadata: {
                      phone_number_id: change.value.metadata?.phone_number_id,
                      display_phone_number: change.value.metadata?.display_phone_number
                    }
                  });
                }
              }
            }
          }
        }
      }
    }
    
    logEvent('PARSE_SUCCESS', {
      eventCount: events.length,
      platforms: [...new Set(events.map(e => e.platform))],
      senders: events.map(e => e.sender)
    });
    
  } catch (error) {
    logEvent('PARSE_ERROR', {
      error: error.message,
      object: body.object
    });
  }
  
  return events;
}

// Envio de resposta UNIFICADO
async function sendResponse(platform, recipient, messageText) {
  try {
    logEvent('SEND_ATTEMPT', {
      platform,
      recipient,
      messageLength: messageText.length
    });
    
    if (platform === 'instagram') {
      // Implementar envio para Instagram Graph API
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
      
      if (!INSTAGRAM_ACCESS_TOKEN) {
        logEvent('SEND_ERROR', {
          platform,
          recipient,
          error: 'INSTAGRAM_ACCESS_TOKEN missing'
        });
        return { success: false, error: 'Instagram access token missing' };
      }
      
      const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
      
      const payload = {
        recipient: { id: recipient },
        message: { text: messageText }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        logEvent('SEND_SUCCESS', { platform, recipient });
        return { success: true };
      } else {
        const errorData = await response.text();
        logEvent('SEND_ERROR', {
          platform,
          recipient,
          status: response.status,
          error: errorData
        });
        return { success: false, error: errorData };
      }
    }
    
    else if (platform === 'whatsapp') {
      // Implementar envio para WhatsApp Cloud API
      const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
      const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        logEvent('SEND_ERROR', {
          platform,
          recipient,
          error: 'WhatsApp credentials missing',
          hasToken: !!WHATSAPP_ACCESS_TOKEN,
          hasPhoneId: !!WHATSAPP_PHONE_NUMBER_ID
        });
        return { success: false, error: 'WhatsApp credentials missing' };
      }
      
      const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: recipient,
        text: { body: messageText }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        logEvent('SEND_SUCCESS', { platform, recipient });
        return { success: true };
      } else {
        const errorData = await response.text();
        logEvent('SEND_ERROR', {
          platform,
          recipient,
          status: response.status,
          error: errorData
        });
        return { success: false, error: errorData };
      }
    }
    
  } catch (error) {
    logEvent('SEND_ERROR', {
      platform,
      recipient,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

// Handler principal
export default async function handler(req, res) {
  // Log geral da requisição
  logEvent('REQUEST_RECEIVED', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    object: req.body?.object
  });

  // Webhook verification (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    logEvent('VERIFICATION_ATTEMPT', {
      mode,
      token: token === VERIFY_TOKEN ? 'VALID' : 'INVALID',
      tokenMatch: token === VERIFY_TOKEN,
      hasChallenge: !!challenge,
      verifyToken: VERIFY_TOKEN ? 'SET' : 'MISSING'
    });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      logEvent('VERIFICATION_SUCCESS', {
        mode,
        token: 'VALID',
        challenge
      });
      
      // Retornar challenge como texto puro - EXATAMENTE como Meta exige
      res.status(200).set('Content-Type', 'text/plain').send(challenge);
      return;
    }

    logEvent('VERIFICATION_FAILED', {
      mode,
      token,
      tokenMatch: token === VERIFY_TOKEN,
      expectedToken: VERIFY_TOKEN,
      reason: mode !== 'subscribe' ? 'Invalid mode' : 'Invalid token'
    });
    
    return res.status(403).set('Content-Type', 'text/plain').send("Forbidden");
  }

  // Event processing (POST)
  if (req.method === "POST") {
    try {
      // Validar assinatura
      if (!validateSignature(req)) {
        logEvent('SIGNATURE_VALIDATION_FAILED', {
          headers: req.headers,
          bodyPreview: JSON.stringify(req.body).substring(0, 200)
        });
        return res.status(403).json({ error: "Invalid signature" });
      }

      // Parse events UNIFICADO
      const events = parseMetaEvent(req.body);
      
      if (events.length === 0) {
        logEvent('NO_EVENTS_FOUND', { 
          object: req.body?.object,
          body: JSON.stringify(req.body).substring(0, 500)
        });
        return res.status(200).json({ received: true, events: [] });
      }

      logEvent('EVENTS_DETECTED', {
        eventCount: events.length,
        platforms: [...new Set(events.map(e => e.platform))],
        senders: events.map(e => e.sender)
      });

      // Process each event
      const processedEvents = [];
      
      for (const event of events) {
        try {
          logEvent('PROCESSING_EVENT', {
            platform: event.platform,
            sender: event.sender,
            messageId: event.messageId,
            textLength: event.text.length,
            textPreview: event.text.substring(0, 100)
          });
          
          // Detectar intenção
          const intent = detectLegalIntent(event.text);
          
          // Gerar resposta automática
          const response = generateAutomaticResponse(intent, event.text, event.senderName, event.platform);
          
          // Log do processamento
          const eventData = {
            platform: event.platform,
            eventType: event.type,
            sender: event.sender,
            senderName: event.senderName,
            receivedText: event.text,
            detectedIntent: intent,
            generatedResponse: response,
            messageId: event.messageId
          };
          
          logEvent('EVENT_PROCESSED', eventData);
          
          // Enviar resposta
          const sendResult = await sendResponse(event.platform, event.sender, response);
          
          processedEvents.push({
            ...eventData,
            sent: sendResult.success,
            sendError: sendResult.error
          });
          
        } catch (eventError) {
          logEvent('EVENT_PROCESSING_ERROR', {
            platform: event.platform,
            sender: event.sender,
            messageId: event.messageId,
            error: eventError.message
          });
          
          processedEvents.push({
            platform: event.platform,
            sender: event.sender,
            messageId: event.messageId,
            error: true,
            errorMessage: eventError.message
          });
        }
      }

      const successCount = processedEvents.filter(e => !e.error && e.sent).length;
      const errorCount = processedEvents.filter(e => e.error).length;
      const platforms = [...new Set(processedEvents.map(e => e.platform))];

      logEvent('PROCESSING_COMPLETE', {
        totalEvents: events.length,
        successCount,
        errorCount,
        platforms
      });

      return res.status(200).json({
        received: true,
        processed: processedEvents.length,
        successCount,
        errorCount,
        platforms,
        events: processedEvents
      });

    } catch (error) {
      logEvent('FATAL_ERROR', {
        error: error.message,
        stack: error.stack,
        object: req.body?.object
      });
      
      return res.status(500).json({
        error: 'internal_error',
        received: true
      });
    }
  }

  // Method not allowed
  logEvent('METHOD_NOT_ALLOWED', { method: req.method });
  return res.status(405).json({ error: 'Method not allowed' });
}