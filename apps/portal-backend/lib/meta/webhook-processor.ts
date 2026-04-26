import { detectThemeFromText } from './theme-detector.ts';
import { generateContextLink } from './link-generator.ts';
import { sendWhatsAppMessage } from './whatsapp-service.ts';
import { logMetaEvent } from './logging.ts';

function buildLegacySafeTriageLink(theme?: string) {
  return generateContextLink({
    tema: theme,
    origem: 'whatsapp',
    campanha: 'legacy-meta-webhook'
  });
}

/**
 * Processa eventos recebidos da Meta (Instagram + WhatsApp)
 */
export async function processMetaEvent(event: MetaEvent) {
  try {
    await logMetaEvent('event_processing_start', {
      type: event.type,
      platform: event.platform,
      timestamp: event.timestamp
    });

    switch (event.type) {
      case 'instagram_direct':
        await handleInstagramDirect(event);
        break;
        
      case 'instagram_change':
        await handleInstagramChange(event);
        break;
        
      case 'whatsapp_message':
        await handleWhatsAppMessage(event);
        break;
        
      default:
        await logMetaEvent('unknown_event_type', { type: event.type });
    }
  } catch (error) {
    await logMetaEvent('event_processing_error', {
      type: event.type,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

/**
 * Processa mensagens do Instagram Direct
 */
async function handleInstagramDirect(event: MetaEvent) {
  const message = event.data;
  const senderId = message.sender.id;
  const messageText = message.message?.text;

  if (!messageText) {
    await logMetaEvent('empty_message', { platform: 'instagram' });
    return;
  }

  // Detectar tema na mensagem
  const theme = detectThemeFromText(messageText);
  
  // Gerar link contextual
  const contextLink = generateContextLink({
    tema: theme,
    origem: 'instagram',
    campanha: 'direct',
    video: message.id
  });

  // Enviar resposta automática com link
  const responseMessage = buildInstagramResponse(theme, contextLink);
  
  await sendInstagramDirectMessage(senderId, responseMessage);
  
  await logMetaEvent('instagram_direct_processed', {
    senderId,
    theme,
    messageLength: messageText.length,
    generatedLink: contextLink
  });
}

/**
 * Processa mudanças no Instagram (comentários, etc.)
 */
async function handleInstagramChange(event: MetaEvent) {
  const change = event.data;
  const changeType = change.field;
  const changeValue = change.value;

  if (changeType === 'comments') {
    await handleInstagramComment(changeValue);
  } else {
    await logMetaEvent('unhandled_change_type', {
      platform: 'instagram',
      changeType
    });
  }
}

/**
 * Processa comentários do Instagram
 */
async function handleInstagramComment(commentData: any) {
  const commentText = commentData.text;
  const commentId = commentData.id;
  const userId = commentData.from?.id;

  if (!commentText) {
    await logMetaEvent('empty_comment', { platform: 'instagram' });
    return;
  }

  // Detectar tema no comentário
  const theme = detectThemeFromText(commentText);
  
  // Gerar link contextual
  const contextLink = generateContextLink({
    tema: theme,
    origem: 'instagram',
    campanha: 'comentario',
    video: commentId
  });

  // Responder ao comentário
  const responseMessage = buildCommentResponse(theme, contextLink);
  
  await replyToInstagramComment(commentId, responseMessage);
  
  await logMetaEvent('instagram_comment_processed', {
    commentId,
    userId,
    theme,
    commentLength: commentText.length,
    generatedLink: contextLink
  });
}

/**
 * Processa mensagens do WhatsApp
 */
async function handleWhatsAppMessage(event: MetaEvent) {
  const message = event.data;
  const messageText = message.text?.body;

  if (!messageText) {
    await logMetaEvent('empty_whatsapp_message', { platform: 'whatsapp' });
    return;
  }

  // Detectar tema na mensagem
  const theme = detectThemeFromText(messageText);
  
  // Enviar resposta contextual
  const responseMessage = buildWhatsAppResponse(theme);
  
  await sendWhatsAppMessage(message.from, responseMessage);
  
  await logMetaEvent('whatsapp_message_processed', {
    senderPhone: message.from,
    theme,
    messageLength: messageText.length
  });
}

/**
 * Constrói resposta para Instagram Direct
 */
function buildInstagramResponse(theme: string, contextLink: string): string {
  const responses = {
    aposentadoria: `👋 Olá! Vi seu interesse em aposentadoria. Preparei uma análise inicial personalizada para você:\n\n${contextLink}\n\nLá você vai organizar suas informações e já falar com a advogada no WhatsApp!`,
    
    bancario: `👋 Olá! Entendi sua dúvida sobre questão bancária. Tenho um caminho rápido para te ajudar:\n\n${contextLink}\n\nPreencha a triagem e já vamos conversar sobre seu caso no WhatsApp!`,
    
    familia: `👋 Olá! Vi sua mensagem sobre direito de família. Preparei um atendimento direcionado para você:\n\n${contextLink}\n\nOrganize seu caso e já agende sua consulta no WhatsApp!`,
    
    consumidor: `👋 Olá! Entendi seu problema de consumo. Tenho uma solução rápida para você:\n\n${contextLink}\n\nPreencha a triagem e já vamos resolver sua situação no WhatsApp!`,
    
    civil: `👋 Olá! Vi sua dúvida jurídica. Preparei uma análise inicial para você:\n\n${contextLink}\n\nLá você organiza seu caso e já fala com a advogada no WhatsApp!`,
    
    default: `👋 Olá! Vi sua mensagem. Para te ajudar melhor, preparei uma triagem inicial:\n\n${contextLink}\n\nLá você conta seu caso e já falamos no WhatsApp!`
  };

  return responses[theme as keyof typeof responses] || responses.default;
}

/**
 * Constrói resposta para comentários
 */
function buildCommentResponse(theme: string, contextLink: string): string {
  return buildInstagramResponse(theme, contextLink);
}

/**
 * Constrói resposta para WhatsApp
 */
function buildWhatsAppResponse(theme: string): string {
  const responses = {
    aposentadoria: `Olá! 👋\n\nVi que você tem uma questão sobre aposentadoria. Para te atender com mais precisão, preparei uma triagem inicial:\n\n🔗 ${buildLegacySafeTriageLink('aposentadoria')}\n\nPreencha os dados que já vou te encaminhar para a advogada!`,
    
    bancario: `Olá! 👋\n\nEntendi sua questão bancária. Para resolver isso rápido, preparei uma triagem específica:\n\n🔗 ${buildLegacySafeTriageLink('bancario')}\n\nPreencha que já vamos conversar sobre seu caso!`,
    
    familia: `Olá! 👋\n\nVi sua mensagem sobre direito de família. Preparei um atendimento direcionado:\n\n🔗 ${buildLegacySafeTriageLink('familia')}\n\nOrganize suas informações que já agendamos sua consulta!`,
    
    consumidor: `Olá! 👋\n\nEntendi seu problema de consumo. Tenho um caminho rápido para você:\n\n🔗 ${buildLegacySafeTriageLink('consumidor')}\n\nPreencha a triagem que já resolvemos sua situação!`,
    
    civil: `Olá! 👋\n\nVi sua dúvida jurídica. Para te ajudar melhor:\n\n🔗 ${buildLegacySafeTriageLink('civil')}\n\nPreencha seus dados que já falamos sobre seu caso!`,
    
    default: `Olá! 👋\n\nPara te atender da melhor forma, preparei uma triagem inicial:\n\n🔗 ${buildLegacySafeTriageLink()}\n\nLá você conta seu caso e já conversamos!`
  };

  return responses[theme as keyof typeof responses] || responses.default;
}

/**
 * Envia mensagem no Instagram Direct (placeholder para implementação)
 */
async function sendInstagramDirectMessage(recipientId: string, message: string) {
  // TODO: Implementar com Instagram Graph API
  await logMetaEvent('instagram_direct_sent', {
    recipientId,
    messageLength: message.length
  });
  
  console.log(`📤 Enviando mensagem Instagram Direct para ${recipientId}:`, message);
}

/**
 * Responde a comentário no Instagram (placeholder para implementação)
 */
async function replyToInstagramComment(commentId: string, message: string) {
  // TODO: Implementar com Instagram Graph API
  await logMetaEvent('instagram_comment_reply_sent', {
    commentId,
    messageLength: message.length
  });
  
  console.log(`💬 Respondendo comentário ${commentId}:`, message);
}

// Types
interface MetaEvent {
  type: 'instagram_direct' | 'instagram_change' | 'whatsapp_message';
  platform: 'instagram' | 'whatsapp';
  data: any;
  timestamp: number;
}
