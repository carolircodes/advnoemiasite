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

async function generateAIResponse(
  userText: string,
  area: any,
  analysis: any,
  userId: string
) {
  if (!openai) {
    return fallbackResponse(area.name, analysis);
  }

  try {
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

    const text =
      completion.choices?.[0]?.message?.content?.trim() || fallbackResponse(area.name, analysis);

    const finalResponse = `${text}${buildAssistantCTA(area.name, analysis, 'whatsapp')}`;

    pushConversationMemory(userId, [
      { role: 'user', content: userText },
      { role: 'assistant', content: finalResponse },
    ]);

    return finalResponse;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return fallbackResponse(area.name, analysis);
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

// Função principal de processamento
export async function processPlatformMessage(message: PlatformMessage): Promise<{
  lead?: LeadRecord;
  conversation?: ConversationRecord;
  response?: string;
  error?: string;
}> {
  try {
    // Verificar mensagem duplicada
    if (isDuplicateMessage(message.platformMessageId)) {
      return { error: 'Mensagem duplicada' };
    }

    // Detectar área jurídica
    const legalArea = detectLegalArea(message.text);
    
    // Classificar lead
    const analysis = classifyLead(message.text, legalArea.name);
    
    // Gerar resposta da IA
    const aiResponse = await generateAIResponse(
      message.text,
      legalArea,
      analysis,
      message.platformUserId
    );

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
        ...message.metadata
      }
    };

    return {
      lead: leadRecord,
      conversation: conversationRecord,
      response: aiResponse
    };

  } catch (error) {
    console.error('Error processing platform message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Função para enviar resposta via plataforma
export async function sendPlatformResponse(
  platform: Platform,
  recipientId: string,
  messageText: string
): Promise<boolean> {
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
        console.error('Instagram API Error:', response.status, errorText);
        return false;
      }

      console.log('Instagram message sent successfully');
      return true;

    } else if (platform === 'whatsapp') {
      // WhatsApp Cloud API - CORREÇÃO AQUI
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      
      if (!phoneNumberId || !accessToken) {
        console.error('WhatsApp API Error: Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
        return false;
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
        console.error('WhatsApp API Error:', response.status, errorText);
        return false;
      }

      console.log('WhatsApp message sent successfully');
      return true;
    }

    return false;

  } catch (error) {
    console.error('Error sending platform response:', error);
    return false;
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
