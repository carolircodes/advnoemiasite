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
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://advnoemia.com.br';
const WHATSAPP_URL = process.env.NOEMIA_WHATSAPP_URL || 'https://wa.me/5511999999999';

const openai = OPENAI_API_KEY
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
  return `Olá! Sou a NoemIA, assistente da Advogada Noemia.\n\nRecebi sua mensagem e já estou encaminhando para análise. Para atendimento imediato, fale diretamente com a advogada:\n\n📱 WhatsApp: ${WHATSAPP_URL}\n🌐 Site: ${PUBLIC_SITE_URL}\n\nEm breve entraremos em contato!`;
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

async function generateAIResponse(
  userText: string,
  area: any,
  analysis: any,
  userId: string,
  platform: Platform
): Promise<{ response: string; usedFallback: boolean; error?: string }> {
  // Se não há OpenAI configurada, usar fallback imediatamente
  if (!openai) {
    logError('OPENAI_ERROR', {
      platform,
      userId,
      error: 'OPENAI_NOT_CONFIGURED',
      fallbackUsed: true,
      context: { area: area.name, analysis }
    });
    
    const fallbackResponse = getWhatsAppFallbackResponse(area.name, analysis);
    return { response: fallbackResponse, usedFallback: true };
  }

  try {
    logSuccess('OPENAI_REQUEST', {
      platform,
      userId,
      context: { area: area.name, model: OPENAI_MODEL }
    });

    const memory = getConversationMemory(userId);
    const messages = buildConversationMessages(
      userText,
      buildSystemPrompt(area, analysis),
      memory
    );

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 300,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    
    if (!text) {
      logError('OPENAI_ERROR', {
        platform,
        userId,
        error: 'EMPTY_RESPONSE',
        fallbackUsed: true,
        context: { area: area.name, completion }
      });
      
      const fallbackResponse = getWhatsAppFallbackResponse(area.name, analysis);
      return { response: fallbackResponse, usedFallback: true };
    }

    const finalResponse = `${text}${buildAssistantCTA(area.name, analysis, platform)}`;

    pushConversationMemory(userId, [
      { role: 'user', content: userText },
      { role: 'assistant', content: finalResponse },
    ]);

    logSuccess('OPENAI_SUCCESS', {
      platform,
      userId,
      context: { 
        area: area.name, 
        responseLength: finalResponse.length,
        tokensUsed: completion.usage?.total_tokens || 0
      }
    });

    return { response: finalResponse, usedFallback: false };

  } catch (error: any) {
    // Detectar tipos específicos de erro da OpenAI
    let errorType = 'OPENAI_UNKNOWN_ERROR';
    let shouldUseFallback = true;

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

    logError('OPENAI_ERROR', {
      platform,
      userId,
      error: errorType,
      fallbackUsed: true,
      context: { 
        area: area.name, 
        originalError: error.message,
        code: error.code,
        status: error.status
      }
    });

    // Sempre usar fallback em caso de erro
    const fallbackResponse = getWhatsAppFallbackResponse(area.name, analysis);
    return { response: fallbackResponse, usedFallback: true, error: errorType };
  }
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
  
  try {
    // Verificar mensagem duplicada
    if (isDuplicateMessage(message.platformMessageId)) {
      return { error: 'Mensagem duplicada' };
    }

    // Detectar área jurídica
    const legalArea = detectLegalArea(message.text);
    
    // Classificar lead
    const analysis = classifyLead(message.text, legalArea.name);
    
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
      logError('OPENAI_ERROR', {
        platform: message.platform,
        userId: message.platformUserId,
        error: 'CRITICAL_AI_FAILURE',
        fallbackUsed: true,
        context: { 
          originalError: aiError instanceof Error ? aiError.message : 'unknown',
          area: legalArea.name 
        }
      });
      
      aiResponse = getCriticalFallbackResponse();
      usedFallback = true;
      fallbackReason = 'CRITICAL_AI_FAILURE';
    }

    // Garantir que sempre temos uma resposta
    if (!aiResponse || aiResponse.trim().length === 0) {
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

    return {
      lead: leadRecord,
      conversation: conversationRecord,
      response: aiResponse,
      usedFallback,
      fallbackReason
    };

  } catch (error) {
    logError('WEBHOOK_PARSING_ERROR', {
      platform: message.platform,
      userId: message.platformUserId,
      messageId: message.platformMessageId,
      error: error instanceof Error ? error.message : 'unknown',
      fallbackUsed: true,
      context: { text: message.text.substring(0, 100) }
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
        
        logError('WHATSAPP_SEND_ERROR', {
          platform: 'instagram',
          userId: recipientId,
          error: 'INSTAGRAM_SEND_FAILED',
          fallbackUsed: false,
          context: { status: response.status, errorText }
        });
        
        return { success: false, error: errorMsg };
      }

      logSuccess('WHATSAPP_SEND_SUCCESS', {
        platform: 'instagram',
        userId: recipientId,
        context: { messageLength: messageText.length }
      });
      
      return { success: true };

    } else if (platform === 'whatsapp') {
      // WhatsApp Cloud API
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      
      if (!phoneNumberId || !accessToken) {
        const errorMsg = 'WhatsApp API Error: Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN';
        
        logError('WHATSAPP_SEND_ERROR', {
          platform: 'whatsapp',
          userId: recipientId,
          error: 'MISSING_CONFIG',
          fallbackUsed: false,
          context: { hasPhoneNumberId: !!phoneNumberId, hasAccessToken: !!accessToken }
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
        
        logError('WHATSAPP_SEND_ERROR', {
          platform: 'whatsapp',
          userId: recipientId,
          error: 'WHATSAPP_SEND_FAILED',
          fallbackUsed: false,
          context: { status: response.status, errorText, messageLength: messageText.length }
        });
        
        return { success: false, error: errorMsg };
      }

      logSuccess('WHATSAPP_SEND_SUCCESS', {
        platform: 'whatsapp',
        userId: recipientId,
        context: { messageLength: messageText.length, phoneNumberId }
      });
      
      return { success: true };
    }

    return { success: false, error: 'Platform not supported' };

  } catch (error) {
    logError('WHATSAPP_SEND_ERROR', {
      platform,
      userId: recipientId,
      error: 'NETWORK_ERROR',
      fallbackUsed: false,
      context: { 
        originalError: error instanceof Error ? error.message : 'unknown',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

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

// Logs estruturados
export function logPlatformEvent(eventType: string, platform: Platform, data?: any) {
  const log = {
    timestamp: nowIso(),
    source: 'platform-webhook',
    platform,
    eventType,
    ...data
  };
  
  console.log('PLATFORM_EVENT:', JSON.stringify(log, null, 2));
}
