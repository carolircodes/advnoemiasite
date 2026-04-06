import crypto from 'crypto';

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "noeminha_app_secret_2026";

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
function generateContextualLink(intent, source = 'instagram') {
  const baseUrl = 'https://advnoemia.com.br/noemia';
  const params = new URLSearchParams();
  
  if (intent) params.append('tema', intent);
  params.append('origem', source);
  params.append('video', 'auto');
  
  return `${baseUrl}?${params.toString()}`;
}

// Geração de resposta automática
function generateAutomaticResponse(intent, receivedText, senderName = '') {
  const contextualLink = generateContextualLink(intent);
  
  const responses = {
    aposentadoria: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Vi seu interesse em aposentadoria.`,
      context: 'Entendo que você tem dúvidas sobre aposentadoria. É importante analisar tempo de contribuição, idade mínima e tipo de benefício.',
      cta: 'Posso te ajudar com uma análise personalizada do seu caso.',
      link: contextualLink
    },
    previdenciario: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Notamos seu interesse em direito previdenciário.`,
      context: 'Benefícios previdenciários envolvem regras específicas que precisam ser analisadas com cuidado.',
      cta: 'Uma análise detalhada pode garantir seu direito ao benefício.',
      link: contextualLink
    },
    bancario: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Identificamos sua questão sobre direito bancário.`,
      context: 'Problemas com bancos envolvem legislação específica de proteção ao consumidor.',
      cta: 'Podemos analisar seu caso para identificar irregularidades e buscar seus direitos.',
      link: contextualLink
    },
    consumidor: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Sua questão de consumo foi detectada.`,
      context: 'Direitos do consumidor são amplamente protegidos por lei.',
      cta: 'Te ajudamos a entender seus direitos e como exercê-los.',
      link: contextualLink
    },
    familia: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Entendemos sua necessidade em direito de família.`,
      context: 'Questões familiares exigem sensibilidade e conhecimento jurídico específico.',
      cta: 'Oferecemos orientação segura para proteger seus interesses e sua família.',
      link: contextualLink
    },
    civil: {
      greeting: `Olá${senderName ? ', ' + senderName : ''}! Sua questão civil foi identificada.`,
      context: 'Direito civil envolve obrigações, contratos e responsabilidades importantes.',
      cta: 'Uma análise cuidadosa pode evitar prejuízos e garantir seus direitos.',
      link: contextualLink
    }
  };
  
  const defaultResponse = {
    greeting: `Olá${senderName ? ', ' + senderName : ''}! Sou a assistente virtual da Advogada Noemia.`,
    context: 'Identificamos que você precisa de orientação jurídica.',
    cta: 'Nossa inteligência artificial pode te ajudar a entender seu caso.',
    link: generateContextualLink(null)
  };
  
  const response = responses[intent] || defaultResponse;
  
  return `${response.greeting}\n\n${response.context}\n\n${response.cta}\n\n🤖 Fale com nossa IA especializada: ${response.link}\n\n📅 Agende uma consulta: https://wa.me/5511999999999`;
}

// Validação de assinatura da Meta
function validateSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  
  const [algorithm, signatureHash] = signature.split('=');
  if (algorithm !== 'sha256') return false;
  
  const body = JSON.stringify(req.body);
  const expectedHash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
}

// Logs estruturados
function logMetaEvent(eventType, data) {
  const log = {
    timestamp: new Date().toISOString(),
    type: 'META_WEBHOOK',
    eventType,
    ...data
  };
  
  console.log('META_EVENT:', JSON.stringify(log, null, 2));
}

// Parsing seguro de eventos
function parseMetaEvent(body) {
  try {
    const events = [];
    
    // Messages (Direct Messages)
    if (body.object === 'instagram' && body.entry) {
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            events.push({
              type: 'message',
              sender: messaging.sender.id,
              recipient: messaging.recipient.id,
              timestamp: messaging.timestamp,
              text: messaging.message?.text || '',
              messageId: messaging.message?.mid,
              senderName: messaging.message?.from?.name || ''
            });
          }
        }
        
        // Comments
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'comments' && change.value) {
              events.push({
                type: 'comment',
                sender: change.value.from?.id || '',
                senderName: change.value.from?.username || '',
                recipient: change.value.media?.owner?.id || '',
                timestamp: change.value.created_time,
                text: change.value.message || '',
                commentId: change.value.id,
                mediaId: change.value.media?.id || ''
              });
            }
          }
        }
        
        // Postbacks
        if (entry.standby && entry.standby.length > 0) {
          for (const standby of entry.standby) {
            if (standby.messaging_postbacks) {
              for (const postback of standby.messaging_postbacks) {
                events.push({
                  type: 'postback',
                  sender: postback.sender.id,
                  recipient: postback.recipient.id,
                  timestamp: postback.timestamp,
                  payload: postback.postback?.payload || '',
                  messageId: postback.postback?.mid
                });
              }
            }
          }
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error parsing Meta event:', error);
    return [];
  }
}

export default function handler(req, res) {
  // Log de requisição
  console.log(`${req.method} ${req.url}`);
  
  // Webhook verification (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      logMetaEvent('WEBHOOK_VERIFICATION', { mode, token, challenge });
      return res.status(200).send(challenge);
    }

    logMetaEvent('WEBHOOK_VERIFICATION_FAILED', { mode, token });
    return res.status(403).send("Forbidden");
  }

  // Event processing (POST)
  if (req.method === "POST") {
    try {
      // Validar assinatura
      if (!validateSignature(req)) {
        logMetaEvent('SIGNATURE_VALIDATION_FAILED', {
          headers: req.headers,
          bodyPreview: JSON.stringify(req.body).substring(0, 200)
        });
        return res.status(403).json({ error: "Invalid signature" });
      }

      // Parse events
      const events = parseMetaEvent(req.body);
      
      if (events.length === 0) {
        logMetaEvent('NO_EVENTS_FOUND', { body: req.body });
        return res.status(200).json({ received: true, events: [] });
      }

      // Process each event
      const processedEvents = [];
      
      for (const event of events) {
        // Detectar intenção
        const intent = detectLegalIntent(event.text);
        
        // Gerar resposta automática
        const response = generateAutomaticResponse(intent, event.text, event.senderName);
        
        // Log do processamento
        const eventData = {
          eventType: event.type,
          sender: event.sender,
          senderName: event.senderName,
          receivedText: event.text,
          detectedIntent: intent,
          generatedResponse: response,
          messageId: event.messageId || event.commentId
        };
        
        logMetaEvent('EVENT_PROCESSED', eventData);
        
        processedEvents.push({
          ...event,
          intent,
          response,
          processed: true
        });
      }

      return res.status(200).json({ 
        received: true, 
        events: processedEvents,
        summary: {
          total: events.length,
          withIntent: processedEvents.filter(e => e.intent).length,
          types: [...new Set(events.map(e => e.type))]
        }
      });

    } catch (error) {
      logMetaEvent('PROCESSING_ERROR', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      return res.status(500).json({ 
        error: "Internal server error",
        received: true 
      });
    }
  }

  return res.status(405).end();
}