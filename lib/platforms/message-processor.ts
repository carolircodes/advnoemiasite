import OpenAI from 'openai';
import crypto from 'crypto';
import { 
  Platform, 
  PlatformMessage, 
  LeadRecord, 
  ConversationRecord,
  platformConfigs,
  detectLegalArea,
  classifyLead,
  nowIso
} from './core';

// Configurações
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ENABLE_OPENAI = process.env.ENABLE_OPENAI === 'true';
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://advnoemia.com.br';
const WHATSAPP_URL = process.env.NOEMIA_WHATSAPP_URL || 'https://wa.me/5511999999999';

const openai = OPENAI_API_KEY && ENABLE_OPENAI
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

// Memória temporária (em produção usar Redis)
const memoryStore = new Map<string, any[]>();
const processedMessageIds = new Set<string>();

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function getConversationMemory(userId: string): ConversationMessage[] {
  return memoryStore.get(userId) || [];
}

function pushConversationMemory(userId: string, messages: ConversationMessage[]) {
  const current = getConversationMemory(userId);
  const merged = [...current, ...messages].slice(-12);
  memoryStore.set(userId, merged);
}

function buildConversationMessages(
  userText: string,
  systemPrompt: string,
  memory: ConversationMessage[]
): ConversationMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...memory.filter((m) => m.role !== 'system'),
    { role: 'user', content: userText },
  ];
}

function isDuplicateMessage(messageId: string) {
  if (!messageId) return false;
  if (processedMessageIds.has(messageId)) return true;
  processedMessageIds.add(messageId);

  if (processedMessageIds.size > 5000) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }

  return false;
}

function buildSystemPrompt(area: any, analysis: any) {
  const generalSystemPrompt = `
Você é a NoemIA, assistente virtual da Advogada Noemia.

REGRAS:
- Fale em português do Brasil.
- Seja acolhedora, profissional, objetiva e elegante.
- Não prometa resultado.
- Não afirme conclusão jurídica fechada sem análise do caso.
- Não invente leis, prazos ou direitos.
- Não diga que a pessoa "ganhará" ou que "é causa certa".
- Explique de forma simples.
- Sempre conduza para análise com a advogada quando houver caso concreto.
- Se perceber urgência, sofrimento, risco financeiro alto, prazo ou intenção clara de contratar, priorize transferência para humano.
- Em respostas de WhatsApp, prefira mensagens curtas ou médias, com boa legibilidade.
- Quando adequado, encerre com CTA para WhatsApp ou site específico.
`;

  const urgencyRule =
    analysis.urgency === 'alta'
      ? 'Há sinais de urgência. Priorize acolhimento e condução rápida para atendimento humano.'
      : 'Não há urgência extrema evidente. Responda com clareza e convide para aprofundar o caso.';

  const funnelRule =
    analysis.wantsHuman || analysis.shouldSchedule
      ? 'A pessoa demonstra intenção forte de atendimento. Direcione para WhatsApp e agendamento.'
      : 'A pessoa ainda pode precisar de qualificação. Faça uma resposta útil e depois convide para análise com a advogada.';

  return `
${generalSystemPrompt}

ÁREA PRINCIPAL:
${area.systemPrompt}

CONTEXTO DO LEAD:
- Área detectada: ${analysis.legalArea}
- Status do lead: ${analysis.leadStatus}
- Etapa do funil: ${analysis.funnelStage}
- Urgência: ${analysis.urgency}
- Quer humano: ${analysis.wantsHuman ? 'sim' : 'não'}
- Deve agendar: ${analysis.shouldSchedule ? 'sim' : 'não'}

DIRETRIZES ESPECIAIS:
- Responda em no máximo 900 caracteres.
- Use frases claras.
- Não faça resposta longa demais.
- Seja calorosa e firme.
- Dê uma orientação inicial útil, mas sem substituir análise jurídica individual.
- Sempre que fizer sentido, sugira o próximo passo.
- Evite excesso de emojis.
- Use no máximo 1 emoji, e só se ajudar.

${urgencyRule}
${funnelRule}
`;
}

function buildAssistantCTA(area: string, analysis: any, platform: Platform) {
  const areaConfig = detectLegalArea('');
  const foundArea = areaConfig.name === area ? areaConfig : detectLegalArea(area);
  const areaLink = `${PUBLIC_SITE_URL}${foundArea.landingPath}`;

  if (analysis.wantsHuman || analysis.shouldSchedule) {
    return `\n\nSe você quiser, posso te direcionar agora para o atendimento da advogada:\nWhatsApp: ${WHATSAPP_URL}\nPágina: ${areaLink}`;
  }

  return `\n\nSe quiser, você também pode entender melhor por aqui:\n${areaLink}\nOu falar direto com a advogada: ${WHATSAPP_URL}`;
}

// Função de fallback robusta para WhatsApp
function getWhatsAppFallbackResponse(area: string, analysis: any): string {
  const areaLabel =
    area === 'previdenciario'
      ? 'direito previdenciário'
      : area === 'bancario'
      ? 'direito bancário'
      : area === 'familia'
      ? 'direito de família'
      : 'questão jurídica';

  if (analysis.wantsHuman || analysis.shouldSchedule) {
    return `Olá! Sou a NoemIA, assistente da Advogada Noemia. Entendi que você precisa de atendimento sobre ${areaLabel}.\n\nPosso te direcionar agora para falar diretamente com a advogada:\n📱 WhatsApp: ${WHATSAPP_URL}\n🌐 Site: ${PUBLIC_SITE_URL}`;
  }

  return `Olá! Sou a NoemIA, assistente da Advogada Noemia. Recebi sua mensagem sobre ${areaLabel}.\n\nPara te dar uma orientação segura e personalizada, o ideal é conversar diretamente com a advogada Noemia.\n\n📱 WhatsApp: ${WHATSAPP_URL}\n🌐 Site: ${PUBLIC_SITE_URL}`;
}

// Função de fallback crítico (quando tudo falha)
function getCriticalFallbackResponse(): string {
  console.log('🚨 CRITICAL_FALLBACK: Usando resposta de emergência');
  
  return `Olá! Sou a NoemIA, assistente da Advogada Noemia.

Recebi sua mensagem e já estou encaminhando para análise. Para atendimento imediato, fale diretamente com a advogada:

📱 WhatsApp: ${WHATSAPP_URL}
🌐 Site: ${PUBLIC_SITE_URL}

Em breve entraremos em contato!`;
}

// Função de log específica para erros
function logError(type: 'OPENAI_ERROR' | 'WHATSAPP_SEND_ERROR' | 'WEBHOOK_PARSING_ERROR', details: any) {
  const logEntry = {
    timestamp: nowIso(),
    type,
    platform: details.platform || 'unknown',
    error: details.error,
    userId: details.userId,
    messageId: details.messageId,
    context: {
      ...details.context,
      fallbackUsed: details.fallbackUsed || false
    }
  };

  console.error(`🚨 ${type}:`, JSON.stringify(logEntry, null, 2));
}

// Função de log específica para sucesso
function logSuccess(type: 'OPENAI_SUCCESS' | 'WHATSAPP_SEND_SUCCESS' | 'MESSAGE_PROCESSED' | 'OPENAI_REQUEST', details: any) {
  const logEntry = {
    timestamp: nowIso(),
    type,
    platform: details.platform || 'unknown',
    userId: details.userId,
    messageId: details.messageId,
    context: details.context || {}
  };

  console.log(`✅ ${type}:`, JSON.stringify(logEntry, null, 2));
}

// Verificar se deve usar OpenAI
function shouldUseOpenAI(): boolean {
  if (!ENABLE_OPENAI) {
    logPlatformEvent('OPENAI_SKIPPED', 'unknown' as any, { reason: 'ENABLE_OPENAI=false' });
    return false;
  }
  
  if (!openai) {
    logPlatformEvent('OPENAI_SKIPPED', 'unknown' as any, { reason: 'OPENAI_API_KEY não configurada' });
    return false;
  }
  
  logPlatformEvent('OPENAI_ENABLED', 'unknown' as any, { model: OPENAI_MODEL });
  return true;
}

// Gerar resposta com IA
async function generateAIResponse(
  userText: string,
  area: any,
  analysis: any,
  userId: string,
  platform: Platform
): Promise<{ response: string; usedFallback: boolean; error?: string }> {
  logPlatformEvent('OPENAI_CALLED', platform, {
    userId,
    area: area.name,
    textLength: userText.length,
    model: OPENAI_MODEL
  });

  if (!shouldUseOpenAI()) {
    const fallbackResponse = generateFallbackResponse(area.name, analysis, platform);
    return { response: fallbackResponse, usedFallback: true, error: 'OPENAI_DISABLED' };
  }

  try {
    const memory = getConversationMemory(userId);
    const messages = buildConversationMessages(
      userText,
      buildSystemPrompt(area, analysis),
      memory
    );

    const completion = await openai!.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 300,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    
    if (!text) {
      logPlatformEvent('OPENAI_ERROR', platform, {
        userId,
        error: 'EMPTY_RESPONSE',
        completion: JSON.stringify(completion)
      });
      const fallbackResponse = generateFallbackResponse(area.name, analysis, platform);
      return { response: fallbackResponse, usedFallback: true, error: 'EMPTY_RESPONSE' };
    }

    const finalResponse = `${text}${buildAssistantCTA(area.name, analysis, platform)}`;

    pushConversationMemory(userId, [
      { role: 'user', content: userText },
      { role: 'assistant', content: finalResponse },
    ]);

    logPlatformEvent('OPENAI_SUCCESS', platform, {
      userId,
      area: area.name,
      responseLength: finalResponse.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    return { response: finalResponse, usedFallback: false };

  } catch (error: any) {
    // Detectar tipos específicos de erro da OpenAI
    let errorType = 'OPENAI_UNKNOWN_ERROR';

    if (error.code === 'insufficient_quota') {
      errorType = 'OPENAI_INSUFFICIENT_QUOTA';
    } else if (error.code === 'rate_limit_exceeded') {
      errorType = 'OPENAI_RATE_LIMIT';
    } else if (error.code === 'invalid_api_key') {
      errorType = 'OPENAI_INVALID_KEY';
    } else if (error.code === 'model_not_found') {
      errorType = 'OPENAI_MODEL_NOT_FOUND';
    } else if (error.status === 429) {
      errorType = 'OPENAI_RATE_LIMIT';
    } else if (error.status === 401) {
      errorType = 'OPENAI_UNAUTHORIZED';
    }

    logPlatformEvent('OPENAI_ERROR', platform, {
      userId,
      errorType,
      errorMessage: error.message,
      errorStack: error.stack,
      area: area.name,
      originalError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });

    // Sempre usar fallback em caso de erro
    const fallbackResponse = generateFallbackResponse(area.name, analysis, platform);
    return { response: fallbackResponse, usedFallback: true, error: errorType };
  }
}

// Gerar resposta de fallback inteligente
function generateFallbackResponse(area: string, analysis: any, platform: Platform): string {
  logPlatformEvent('FALLBACK_USED', platform, {
    area,
    urgency: analysis.urgency,
    wantsHuman: analysis.wantsHuman,
    shouldSchedule: analysis.shouldSchedule,
    leadStatus: analysis.leadStatus
  });
  
  const areaLabel =
    area === 'previdenciario'
      ? 'direito previdenciário'
      : area === 'bancario'
      ? 'direito bancário e consumidor'
      : area === 'familia'
      ? 'direito de família'
      : 'questão jurídica';

  const isHighIntent = analysis.wantsHuman || analysis.shouldSchedule || analysis.urgency === 'alta';
  
  if (isHighIntent) {
    return `Olá! Sou a NoemIA, assistente da Advogada Noemia. Entendi que você precisa de atendimento sobre ${areaLabel} e já estou direcionando seu caso.

Para atendimento imediato e personalizado, fale diretamente com a advogada:
📱 WhatsApp: ${WHATSAPP_URL}
🌐 Site: ${PUBLIC_SITE_URL}

Em breve entraremos em contato!`;
  }

  return `Olá! Sou a NoemIA, assistente da Advogada Noemia. Recebi sua mensagem sobre ${areaLabel}.

Para te dar uma orientação segura e personalizada, o ideal é conversar diretamente com a advogada Noemia. Cada caso tem suas particularidades e merece atenção individual.

📱 WhatsApp: ${WHATSAPP_URL}
🌐 Site: ${PUBLIC_SITE_URL}

Estamos aguardando seu contato!`;
}

// Função de fallback crítico (quando tudo falha)
function getCriticalFallbackResponseV2(): string {
  logPlatformEvent('CRITICAL_FALLBACK', 'unknown' as any, {
    reason: 'Todos os sistemas falharam'
  });
  
  return `Olá! Sou a NoemIA, assistente da Advogada Noemia.

Recebi sua mensagem e já estou encaminhando para análise. Para atendimento imediato, fale diretamente com a advogada:

📱 WhatsApp: ${WHATSAPP_URL}
🌐 Site: ${PUBLIC_SITE_URL}

Em breve entraremos em contato!`;
}

function fallbackResponse(area: string, analysis: any) {
  const areaLabel =
    area === 'previdenciario'
      ? 'direito previdenciário'
      : area === 'bancario'
      ? 'direito bancário'
      : area === 'familia'
      ? 'direito de família'
      : 'questão jurídica';

  if (analysis.wantsHuman || analysis.shouldSchedule) {
    return `Entendi. Seu caso parece exigir uma análise individual com mais cuidado. Posso te direcionar agora para o atendimento da advogada Noemia sobre ${areaLabel}.\n\nWhatsApp: ${WHATSAPP_URL}\nPágina: ${PUBLIC_SITE_URL}`;
  }

  return `Entendi sua mensagem. Posso te passar uma orientação inicial sobre ${areaLabel}, mas para uma análise segura do seu caso o ideal é falar diretamente com a advogada Noemia.\n\nWhatsApp: ${WHATSAPP_URL}\nPágina: ${PUBLIC_SITE_URL}`;
}

// Função principal de processamento com fallback robusto
export async function processPlatformMessage(message: PlatformMessage): Promise<{
  lead?: LeadRecord;
  conversation?: ConversationRecord;
  response?: string;
  error?: string;
  usedFallback?: boolean;
  fallbackReason?: string;
}> {
  let usedFallback = false;
  let fallbackReason = '';
  let aiResponse = '';
  
  logPlatformEvent('WEBHOOK_RECEIVED', message.platform, {
    platformUserId: message.platformUserId,
    platformMessageId: message.platformMessageId,
    textLength: message.text.length,
    textPreview: message.text.substring(0, 100),
    senderName: message.senderName,
    metadata: message.metadata
  });
  
  try {
    // Verificar mensagem duplicada
    if (isDuplicateMessage(message.platformMessageId)) {
      logPlatformEvent('MESSAGE_DUPLICATE', message.platform, {
        platformUserId: message.platformUserId,
        platformMessageId: message.platformMessageId
      });
      return { error: 'Mensagem duplicada' };
    }

    // Detectar área jurídica
    const legalArea = detectLegalArea(message.text);
    
    // Classificar lead
    const analysis = classifyLead(message.text, legalArea.name);
    
    logPlatformEvent('LEAD_CLASSIFIED', message.platform, {
      platformUserId: message.platformUserId,
      legalArea: legalArea.name,
      leadStatus: analysis.leadStatus,
      funnelStage: analysis.funnelStage,
      urgency: analysis.urgency,
      wantsHuman: analysis.wantsHuman,
      shouldSchedule: analysis.shouldSchedule,
      summary: analysis.summary
    });
    
    try {
      // Tentar gerar resposta da IA
      const aiResult = await generateAIResponse(
        message.text,
        legalArea,
        analysis,
        message.platformUserId,
        message.platform
      );
      
      aiResponse = aiResult.response;
      usedFallback = aiResult.usedFallback;
      fallbackReason = aiResult.error || '';
      
    } catch (aiError) {
      // Fallback se falhar completamente
      logPlatformEvent('OPENAI_ERROR', message.platform, {
        platformUserId: message.platformUserId,
        error: 'CRITICAL_AI_FAILURE',
        originalError: aiError instanceof Error ? aiError.message : 'unknown',
        errorStack: aiError instanceof Error ? aiError.stack : undefined,
        area: legalArea.name 
      });
      
      aiResponse = getCriticalFallbackResponse();
      usedFallback = true;
      fallbackReason = 'CRITICAL_AI_FAILURE';
    }

    // Garantir que sempre temos uma resposta
    if (!aiResponse || aiResponse.trim().length === 0) {
      logPlatformEvent('CRITICAL_FALLBACK', message.platform, {
        platformUserId: message.platformUserId,
        reason: 'EMPTY_RESPONSE_AFTER_AI'
      });
      
      aiResponse = getCriticalFallbackResponse();
      usedFallback = true;
      fallbackReason = 'EMPTY_RESPONSE';
    }

    // Criar registros
    const leadRecord: LeadRecord = {
      platform: message.platform,
      platform_user_id: message.platformUserId,
      username: message.senderName || null,
      legal_area: analysis.legalArea,
      lead_status: analysis.leadStatus,
      funnel_stage: analysis.funnelStage,
      urgency: analysis.urgency,
      last_message: message.text,
      last_response: aiResponse,
      wants_human: analysis.wantsHuman,
      should_schedule: analysis.shouldSchedule,
      summary: analysis.summary,
      suggested_action: analysis.suggestedAction,
      first_contact_at: nowIso(),
      last_contact_at: nowIso(),
      conversation_count: 1,
      metadata: {
        platform_message_id: message.platformMessageId,
        sender_name: message.senderName,
        used_fallback: usedFallback,
        fallback_reason: fallbackReason,
        ...message.metadata
      }
    };

    const conversationRecord: ConversationRecord = {
      platform: message.platform,
      platform_user_id: message.platformUserId,
      username: message.senderName || null,
      event_type: 'message',
      message_id: message.platformMessageId,
      user_text: message.text,
      ai_response: aiResponse,
      legal_area: analysis.legalArea,
      lead_status: analysis.leadStatus,
      funnel_stage: analysis.funnelStage,
      urgency: analysis.urgency,
      wants_human: analysis.wantsHuman,
      should_schedule: analysis.shouldSchedule,
      metadata: {
        processed_at: nowIso(),
        used_fallback: usedFallback,
        fallback_reason: fallbackReason,
        ...message.metadata
      }
    };

    logPlatformEvent('PROCESSING_COMPLETE', message.platform, {
      platformUserId: message.platformUserId,
      responseLength: aiResponse.length,
      usedFallback,
      fallbackReason,
      leadStatus: analysis.leadStatus,
      legalArea: analysis.legalArea
    });

    return {
      lead: leadRecord,
      conversation: conversationRecord,
      response: aiResponse,
      usedFallback,
      fallbackReason
    };

  } catch (error) {
    logPlatformEvent('CRITICAL_FALLBACK', message.platform, {
      platformUserId: message.platformUserId,
      platformMessageId: message.platformMessageId,
      error: error instanceof Error ? error.message : 'unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
      text: message.text.substring(0, 100)
    });
    
    // Mesmo em caso de erro crítico, retornar resposta fallback
    const criticalResponse = getCriticalFallbackResponse();
    
    return {
      response: criticalResponse,
      usedFallback: true,
      fallbackReason: 'CRITICAL_PROCESSING_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Função para enviar resposta via plataforma com fallback robusto
export async function sendPlatformResponse(
  platform: Platform,
  recipientId: string,
  messageText: string
): Promise<{ success: boolean; error?: string; usedFallback?: boolean }> {
  logPlatformEvent(`${platform.toUpperCase()}_SEND_ATTEMPT`, platform, {
    recipientId,
    messageLength: messageText.length,
    messagePreview: messageText.substring(0, 100)
  });

  try {
    const config = platformConfigs[platform];
    
    if (platform === 'instagram') {
      // Instagram Graph API
      const response = await fetch('https://graph.facebook.com/v19.0/me/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText },
          access_token: config.accessToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `Instagram API Error: ${response.status} - ${errorText}`;
        
        logPlatformEvent('INSTAGRAM_SEND_ERROR', 'instagram', {
          recipientId,
          status: response.status,
          statusText: response.statusText,
          errorText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          requestBody: {
            recipient: { id: recipientId },
            message: { text: messageText.substring(0, 50) + '...' },
            access_token: config.accessToken ? 'PRESENT' : 'MISSING'
          }
        });
        
        return { success: false, error: errorMsg };
      }

      const responseData = await response.json();
      logPlatformEvent('INSTAGRAM_SEND_SUCCESS', 'instagram', {
        recipientId,
        messageLength: messageText.length,
        responseId: responseData.message_id || 'UNKNOWN',
        responseData
      });
      
      return { success: true };

    } else if (platform === 'whatsapp') {
      // WhatsApp Cloud API
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      
      if (!phoneNumberId || !accessToken) {
        const errorMsg = 'WhatsApp API Error: Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN';
        
        logPlatformEvent('WHATSAPP_SEND_ERROR', 'whatsapp', {
          recipientId,
          error: errorMsg,
          hasPhoneNumberId: !!phoneNumberId,
          hasAccessToken: !!accessToken,
          envVars: {
            WHATSAPP_PHONE_NUMBER_ID: phoneNumberId ? 'SET' : 'MISSING',
            WHATSAPP_ACCESS_TOKEN: accessToken ? 'SET' : 'MISSING'
          }
        });
        
        return { success: false, error: errorMsg };
      }

      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          text: {
            body: messageText
          },
          recipient_type: 'individual'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `WhatsApp API Error: ${response.status} - ${errorText}`;
        
        logPlatformEvent('WHATSAPP_SEND_ERROR', 'whatsapp', {
          recipientId,
          status: response.status,
          statusText: response.statusText,
          errorText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          requestBody: {
            messaging_product: 'whatsapp',
            to: recipientId,
            text: { body: messageText.substring(0, 50) + '...' },
            recipient_type: 'individual',
            phoneNumberId,
            hasAccessToken: !!accessToken
          }
        });
        
        return { success: false, error: errorMsg };
      }

      const responseData = await response.json();
      logPlatformEvent('WHATSAPP_SEND_SUCCESS', 'whatsapp', {
        recipientId,
        messageLength: messageText.length,
        messageId: responseData.messages?.[0]?.id || 'UNKNOWN',
        phoneNumberId,
        responseData
      });
      
      return { success: true };
    }

    const errorMsg = `Platform not supported: ${platform}`;
    logPlatformEvent('WHATSAPP_SEND_ERROR', platform, {
      recipientId,
      error: errorMsg
    });
    
    return { success: false, error: errorMsg };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    logPlatformEvent('WHATSAPP_SEND_ERROR', platform, {
      recipientId,
      error: 'NETWORK_ERROR',
      originalError: errorMsg,
      errorStack: error instanceof Error ? error.stack : undefined,
      messageLength: messageText.length
    });
    
    return { success: false, error: errorMsg };
  }
}

// ...
// Validação de assinatura (compartilhada)
export function validateSignature(req: any, platform: Platform): boolean {
  const config = platformConfigs[platform];
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  
  if (!signature || !config.appSecret) return false;
  
  const [algorithm, signatureHash] = signature.split('=');
  if (algorithm !== 'sha256' || !signatureHash) return false;
  
  const body = JSON.stringify(req.body);
  const expectedHash = crypto.createHmac('sha256', config.appSecret).update(body).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

// Logs estruturados com DEBUG COMPLETO
export function logPlatformEvent(eventType: string, platform: Platform, data?: any) {
  const log = {
    timestamp: nowIso(),
    source: 'platform-webhook',
    platform,
    eventType,
    ...data
  };
  
  // Logs específicos com emojis para fácil visualização
  switch (eventType) {
    case 'WEBHOOK_RECEIVED':
      console.log('🔥 WEBHOOK_RECEIVED:', JSON.stringify(log, null, 2));
      break;
    case 'MESSAGE_PARSED':
      console.log('📝 MESSAGE_PARSED:', JSON.stringify(log, null, 2));
      break;
    case 'LEAD_CLASSIFIED':
      console.log('🎯 LEAD_CLASSIFIED:', JSON.stringify(log, null, 2));
      break;
    case 'OPENAI_ENABLED':
      console.log('✅ OPENAI_ENABLED:', JSON.stringify(log, null, 2));
      break;
    case 'OPENAI_SKIPPED':
      console.log('🚫 OPENAI_SKIPPED:', JSON.stringify(log, null, 2));
      break;
    case 'OPENAI_CALLED':
      console.log('🤖 OPENAI_CALLED:', JSON.stringify(log, null, 2));
      break;
    case 'OPENAI_ERROR':
      console.log('🚨 OPENAI_ERROR:', JSON.stringify(log, null, 2));
      break;
    case 'OPENAI_SUCCESS':
      console.log('✅ OPENAI_SUCCESS:', JSON.stringify(log, null, 2));
      break;
    case 'FALLBACK_USED':
      console.log('🛡️ FALLBACK_USED:', JSON.stringify(log, null, 2));
      break;
    case 'WHATSAPP_SEND_ATTEMPT':
      console.log('📤 WHATSAPP_SEND_ATTEMPT:', JSON.stringify(log, null, 2));
      break;
    case 'WHATSAPP_SEND_SUCCESS':
      console.log('✅ WHATSAPP_SEND_SUCCESS:', JSON.stringify(log, null, 2));
      break;
    case 'WHATSAPP_SEND_ERROR':
      console.log('❌ WHATSAPP_SEND_ERROR:', JSON.stringify(log, null, 2));
      break;
    case 'INSTAGRAM_SEND_ATTEMPT':
      console.log('📤 INSTAGRAM_SEND_ATTEMPT:', JSON.stringify(log, null, 2));
      break;
    case 'INSTAGRAM_SEND_SUCCESS':
      console.log('✅ INSTAGRAM_SEND_SUCCESS:', JSON.stringify(log, null, 2));
      break;
    case 'INSTAGRAM_SEND_ERROR':
      console.log('❌ INSTAGRAM_SEND_ERROR:', JSON.stringify(log, null, 2));
      break;
    case 'CRITICAL_FALLBACK':
      console.log('🚨 CRITICAL_FALLBACK:', JSON.stringify(log, null, 2));
      break;
    case 'PROCESSING_COMPLETE':
      console.log('🏁 PROCESSING_COMPLETE:', JSON.stringify(log, null, 2));
      break;
    default:
      console.log('PLATFORM_EVENT:', JSON.stringify(log, null, 2));
  }
}
