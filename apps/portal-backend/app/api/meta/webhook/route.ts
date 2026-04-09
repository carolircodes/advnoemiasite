import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { processNoemiaCore } from "../../../../lib/ai/noemia-core";
import { conversationPersistence } from "../../../../lib/services/conversation-persistence";
import { antiSpamGuard } from "../../../../lib/services/anti-spam-guard";
import { instagramCommentAutomation } from "../../../../lib/services/instagram-comment-automation";
import { instagramCommentContext } from "../../../../lib/services/instagram-comment-context";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminia_verify_2026";
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const PALAVRA_CHAVE_INSTAGRAM = "palavra";

function logEvent(
  event: string,
  data?: unknown,
  level: "info" | "warn" | "error" = "info"
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      data: data ?? null,
    })
  );
}

function verifySignature(rawBuffer: Buffer, signature: string): boolean {
  console.log("=== META_SIGNATURE_AUDIT_START ===");

  const envCandidates = [
    { name: 'INSTAGRAM_APP_SECRET', value: process.env.INSTAGRAM_APP_SECRET },
    { name: 'META_APP_SECRET', value: process.env.META_APP_SECRET },
    { name: 'APP_SECRET', value: process.env.APP_SECRET },
    { name: 'META_INSTAGRAM_APP_SECRET', value: process.env.META_INSTAGRAM_APP_SECRET }
  ];

  console.log("META_SECRET_RESOLUTION_ORDER: 1.INSTAGRAM_APP_SECRET 2.META_APP_SECRET 3.APP_SECRET 4.META_INSTAGRAM_APP_SECRET");

  let selectedSecret = null;
  let selectedEnvName = null;

  if (process.env.INSTAGRAM_APP_SECRET) {
    selectedSecret = process.env.INSTAGRAM_APP_SECRET;
    selectedEnvName = 'INSTAGRAM_APP_SECRET';
  } else if (process.env.META_APP_SECRET) {
    selectedSecret = process.env.META_APP_SECRET;
    selectedEnvName = 'META_APP_SECRET';
  } else if (process.env.APP_SECRET) {
    selectedSecret = process.env.APP_SECRET;
    selectedEnvName = 'APP_SECRET';
  } else if (process.env.META_INSTAGRAM_APP_SECRET) {
    selectedSecret = process.env.META_INSTAGRAM_APP_SECRET;
    selectedEnvName = 'META_INSTAGRAM_APP_SECRET';
  } else {
    console.log("META_WEBHOOK_ABORT_REASON: No app secret configured");
    console.log("META_SECRET_RESOLUTION_ORDER: 1.INSTAGRAM_APP_SECRET 2.META_APP_SECRET 3.APP_SECRET 4.META_INSTAGRAM_APP_SECRET");
    console.log("META_SECRET_CANDIDATES_STATUS:", {
      INSTAGRAM_APP_SECRET: !!process.env.INSTAGRAM_APP_SECRET,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      APP_SECRET: !!process.env.APP_SECRET,
      META_INSTAGRAM_APP_SECRET: !!process.env.META_INSTAGRAM_APP_SECRET
    });
    return false;
  }

  console.log("APP_SECRET_SOURCE_SELECTED:", selectedEnvName);
  console.log("APP_SECRET_LENGTH:", selectedSecret?.length || 0);
  console.log("APP_SECRET_FIRST6_MASKED:", selectedSecret ? `${selectedSecret.substring(0, 6)}...` : 'MISSING');

  envCandidates.forEach((env, index) => {
    console.log(`META_SECRET_CANDIDATE_${index + 1}:`, {
      name: env.name,
      present: !!env.value,
      length: env.value?.length || 0,
      selected: env.name === selectedEnvName
    });
  });

  console.log("SIGNATURE_HEADER_PRESENT:", !!signature);
  console.log("SIGNATURE_HEADER_LENGTH:", signature?.length || 0);
  console.log("SIGNATURE_HEADER_PREFIX:", signature ? signature.substring(0, 20) : 'MISSING');
  console.log("RAW_BODY_BUFFER_LENGTH:", rawBuffer.length);

  const bodyText = rawBuffer.toString('utf8');
  console.log("RAW_BODY_TEXT_LENGTH:", bodyText.length);

  if (!signature) {
    console.log("META_WEBHOOK_ABORT_REASON: No signature header");
    return false;
  }

  console.log("META_HMAC_ALGORITHM: SHA256");
  console.log("META_HEADER_EXPECTED: x-hub-signature-256");
  console.log("META_BODY_BEFORE_HMAC: RAW_BUFFER_BYTES");

  const hmac = createHmac('sha256', selectedSecret);
  hmac.update(rawBuffer);
  const computedHash = hmac.digest('hex');
  const expectedSignature = `sha256=${computedHash}`;

  console.log("COMPUTED_SIGNATURE_PREFIX:", expectedSignature.substring(0, 20));
  console.log("SIGNATURE_RECEIVED_PREFIX:", signature.substring(0, 20));

  const signatureMatch = signature === expectedSignature;
  console.log("SIGNATURE_MATCH_EXACT:", signatureMatch);

  if (signature !== expectedSignature) {
    console.log("META_WEBHOOK_ABORT_REASON: Signature mismatch");
    console.log("META_DEBUG_INFO:", {
      selectedEnvName,
      secretLength: selectedSecret?.length || 0,
      bufferLength: rawBuffer.length,
      textLength: bodyText.length,
      signatureLength: signature.length,
      computedHashLength: computedHash.length
    });
    return false;
  } else {
    console.log("META_WEBHOOK_DIAGNOSIS: Signature VALID");
    return true;
  }
}

async function sendInstagramMessage(
  senderId: string,
  messageText: string
): Promise<boolean> {
  try {
    console.log("INSTAGRAM_BUSINESS_ACCOUNT_ID_PRESENT:", !!INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log("INSTAGRAM_BUSINESS_ACCOUNT_ID_LENGTH:", INSTAGRAM_BUSINESS_ACCOUNT_ID?.length || 0);
    console.log("INSTAGRAM_ACCESS_TOKEN_PRESENT:", !!INSTAGRAM_ACCESS_TOKEN);
    console.log("INSTAGRAM_ACCESS_TOKEN_LENGTH:", INSTAGRAM_ACCESS_TOKEN?.length || 0);
    
    // DIAGNÓSTICO TEMPORÁRIO DO TOKEN EM RUNTIME
    if (INSTAGRAM_ACCESS_TOKEN) {
      const prefix = INSTAGRAM_ACCESS_TOKEN.substring(0, 8);
      const suffix = INSTAGRAM_ACCESS_TOKEN.slice(-8);
      const length = INSTAGRAM_ACCESS_TOKEN.length;
      console.log("INSTAGRAM_TOKEN_DEBUG:", JSON.stringify({
        prefix,
        suffix,
        length
      }));
    }
    console.log("FACEBOOK_PAGE_ID_PRESENT:", !!FACEBOOK_PAGE_ID);
    console.log("FACEBOOK_PAGE_ID_VALUE_MASKED:", FACEBOOK_PAGE_ID ? `${FACEBOOK_PAGE_ID.substring(0, 6)}...` : 'MISSING');
    console.log("INSTAGRAM_SENDER_ID_EXTRACTED:", senderId);
    console.log("INSTAGRAM_MESSAGE_TEXT_EXTRACTED:", messageText);

    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log("INSTAGRAM_SEND_MESSAGE_FAILED: ACCESS_TOKEN missing");
      logEvent("INSTAGRAM_SEND_MESSAGE_FAILED", { 
        reason: "ACCESS_TOKEN_MISSING", 
        senderId 
      }, "error");
      return false;
    }

    if (!FACEBOOK_PAGE_ID) {
      console.log("INSTAGRAM_SEND_ABORTED_MISSING_FACEBOOK_PAGE_ID");
      logEvent("INSTAGRAM_SEND_ABORTED_MISSING_FACEBOOK_PAGE_ID", { 
        reason: "FACEBOOK_PAGE_ID_MISSING", 
        senderId 
      }, "error");
      return false;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    console.log("INSTAGRAM_GRAPH_API_URL_FINAL:", apiUrl);
    console.log("INSTAGRAM_USING_FACEBOOK_PAGE_ID:", FACEBOOK_PAGE_ID);
    console.log("INSTAGRAM_ACCESS_TOKEN_PREFIX_MASKED:", INSTAGRAM_ACCESS_TOKEN ? `${INSTAGRAM_ACCESS_TOKEN.substring(0, 6)}...` : 'MISSING');
    console.log("INSTAGRAM_ACCESS_TOKEN_LENGTH:", INSTAGRAM_ACCESS_TOKEN?.length || 0);
    
    const payload = {
      recipient: { 
        id: senderId 
      },
      message: { 
        text: messageText 
      },
      messaging_type: "RESPONSE"
    };

    console.log("ABOUT_TO_SEND_INSTAGRAM_MESSAGE");
    console.log("INSTAGRAM_GRAPH_API_URL_FINAL:", apiUrl);
    console.log("INSTAGRAM_GRAPH_API_PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    console.log("GRAPH_API_RESPONSE_STATUS:", response.status);
    console.log("GRAPH_API_RESPONSE_BODY:", responseText);

    if (!response.ok) {
      console.log("INSTAGRAM_SEND_MESSAGE_FAILED: API error");
      logEvent(
        "INSTAGRAM_SEND_MESSAGE_FAILED",
        {
          reason: "API_ERROR",
          senderId,
          httpStatus: response.status,
          responseBody: responseText,
          requestPayload: payload,
        },
        "error"
      );
      return false;
    }

    console.log("INSTAGRAM_SEND_MESSAGE_SUCCESS: Message sent successfully");
    logEvent("INSTAGRAM_SEND_MESSAGE_SUCCESS", {
      senderId,
      httpStatus: response.status,
      responseBody: responseText,
    });

    return true;
  } catch (error) {
    console.log("INSTAGRAM_SEND_MESSAGE_FAILED: Exception occurred");
    logEvent(
      "INSTAGRAM_SEND_MESSAGE_FAILED",
      {
        reason: "EXCEPTION",
        senderId,
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );
    return false;
  }
}

async function handleUnsupportedInstagramMessage(senderId: string, messageType: string): Promise<boolean> {
  const unsupportedMessage = "No momento, este atendimento está habilitado apenas para mensagens escritas. Pode me contar por texto, de forma simples, o que aconteceu no seu caso?";
  
  logEvent("UNSUPPORTED_MESSAGE_HANDLED", {
    platform: "instagram",
    sender: senderId,
    messageType,
    response: unsupportedMessage
  });

  return await sendInstagramMessage(senderId, unsupportedMessage);
}

// FASE 2, 3, 4, 6, 7: Processamento completo de comentários com logs
async function processInstagramCommentWithAutomation(comment: any): Promise<void> {
  try {
    logEvent("INSTAGRAM_COMMENT_RECEIVED", {
      commentId: comment.id,
      userId: comment.from?.id,
      username: comment.from?.username,
      commentText: comment.text,
      mediaId: comment.media?.id
    });

    const commentData = {
      id: comment.id,
      from: {
        id: comment.from?.id,
        username: comment.from?.username,
        full_name: comment.from?.full_name
      },
      text: comment.text,
      media: comment.media ? {
        id: comment.media.id
      } : undefined
    };

    // Processar comentário com automação
    const result = await instagramCommentAutomation.processComment(commentData);

    if (result.success && result.campaign && result.event) {
      logEvent("COMMENT_CAMPAIGN_FOUND", {
        commentId: comment.id,
        campaignId: result.campaign.id,
        keyword: result.campaign.keyword,
        theme: result.campaign.theme,
        area: result.campaign.area
      });

      logEvent("COMMENT_KEYWORD_MATCHED", {
        commentId: comment.id,
        keyword: result.campaign.keyword,
        commentText: comment.text
      });

      // FASE 5: Criar contexto de memória
      if (result.dmSent) {
        try {
          const session = await instagramCommentContext.createSessionWithCommentContext(
            comment.from?.id,
            {
              source: 'instagram_comment',
              media_id: comment.media?.id || '',
              keyword: result.campaign.keyword,
              theme: result.campaign.theme,
              area: result.campaign.area,
              campaign_id: result.campaign.id,
              comment_id: comment.id,
              comment_text: comment.text
            }
          );

          logEvent("COMMENT_CONTEXT_CREATED", {
            commentId: comment.id,
            userId: comment.from?.id,
            sessionId: session.id,
            theme: result.campaign.theme
          });
        } catch (contextError) {
          logEvent("COMMENT_CONTEXT_ERROR", {
            commentId: comment.id,
            error: contextError instanceof Error ? contextError.message : String(contextError)
          }, "error");
        }
      }

      if (result.publicReplySent) {
        logEvent("COMMENT_PUBLIC_REPLY_SENT", {
          commentId: comment.id,
          replyTemplate: result.campaign.public_reply_template
        });
      }

      if (result.dmSent) {
        logEvent("COMMENT_DM_SENT", {
          commentId: comment.id,
          userId: comment.from?.id,
          dmTemplate: result.campaign.dm_opening_template.substring(0, 100) + '...'
        });
      }

      logEvent("COMMENT_FLOW_COMPLETED", {
        commentId: comment.id,
        userId: comment.from?.id,
        campaignId: result.campaign.id,
        publicReplySent: result.publicReplySent,
        dmSent: result.dmSent
      });

    } else {
      logEvent("COMMENT_FLOW_SKIPPED", {
        commentId: comment.id,
        userId: comment.from?.id,
        reason: result.error || 'No matching campaign'
      });
    }
  } catch (error) {
    logEvent("COMMENT_PROCESSING_ERROR", {
      commentId: comment.id,
      error: error instanceof Error ? error.message : String(error)
    }, "error");
  }
}


async function processMessageWithNoemia(
  senderId: string, 
  messageText: string,
  externalMessageId?: string,
  externalEventId?: string
) {
  try {
    console.log('=== INSTAGRAM_MESSAGE_RECEIVED ===');
    console.log('SENDER_ID:', senderId);
    console.log('MESSAGE:', messageText);
    console.log('LENGTH:', messageText.length);
    console.log('EXTERNAL_MESSAGE_ID:', externalMessageId);
    console.log('EXTERNAL_EVENT_ID:', externalEventId);
    
    logEvent("INSTAGRAM_CALLING_NOEMIA", {
      senderId,
      messageLength: messageText.length,
      externalMessageId,
      externalEventId
    });

    // 1. Verificar anti-spam guard
    const guardResult = await antiSpamGuard.shouldRespondToEvent({
      channel: 'instagram',
      externalEventId,
      externalMessageId,
      externalUserId: senderId,
      messageText,
      isEcho: false,
      messageType: 'text'
    });

    if (!guardResult.shouldRespond) {
      console.log('INSTAGRAM_RESPONSE_BLOCKED_BY_GUARD:', guardResult.reason);
      logEvent("INSTAGRAM_RESPONSE_BLOCKED_BY_GUARD", {
        senderId,
        reason: guardResult.reason,
        guardResult
      });
      return;
    }

    // 2. Obter ou criar sessão de conversação
    const session = await conversationPersistence.getOrCreateSession(
      'instagram',
      senderId
    );

    console.log('INSTAGRAM_SESSION_FOUND_OR_CREATED:', {
      sessionId: session.id,
      leadStage: session.lead_stage,
      caseArea: session.case_area
    });

    // 3. Salvar mensagem do usuário
    await conversationPersistence.saveMessage(
      session.id,
      externalMessageId,
      'user',
      messageText,
      'inbound',
      {
        channel: 'instagram',
        externalUserId: senderId,
        externalMessageId
      }
    );

    // 4. Obter histórico recente da conversação
    const recentMessages = await conversationPersistence.getRecentMessages(session.id, 12);
    
    // 5. Construir histórico para o Noemia Core
    const history = recentMessages
      .reverse()
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    console.log('INSTAGRAM_CONTEXT_LOADED:', {
      sessionId: session.id,
      historyLength: history.length,
      lastSummary: session.last_summary
    });

    // 6. Gerar resumo se a conversa for longa
    const summary = await conversationPersistence.generateConversationSummary(
      session.id,
      recentMessages
    );

    // 7. Construir contexto para a IA
    let context = {
      sessionId: session.id,
      leadStage: session.lead_stage,
      caseArea: session.case_area,
      currentIntent: session.current_intent,
      lastSummary: session.last_summary,
      conversationHistory: summary
    };

    // FASE 5: Enriquecer contexto se vier de comentário
    const enrichedContext = await instagramCommentContext.enrichNoemiaContext(
      session.id,
      context
    );
    
    if (enrichedContext.isFromComment) {
      console.log('USING_COMMENT_CONTEXT_FOR_NOEMIA:', {
        sessionId: session.id,
        theme: enrichedContext.commentTheme,
        keyword: enrichedContext.commentKeyword
      });
    }

    // 8. Processar com Noemia Core
    const coreResponse = await processNoemiaCore({
      channel: 'instagram',
      userType: 'visitor',
      message: messageText,
      history,
      context: enrichedContext, // Usar contexto enriquecido
      metadata: { 
        senderId,
        sessionId: session.id,
        externalMessageId,
        isFromComment: enrichedContext.isFromComment || false,
        commentTheme: enrichedContext.commentTheme,
        commentKeyword: enrichedContext.commentKeyword
      }
    });

    console.log('INSTAGRAM_NOEMIA_CORE_RESPONSE_RECEIVED');
    console.log('RESPONSE_LENGTH:', coreResponse.reply.length);
    console.log('RESPONSE_SOURCE:', coreResponse.source);
    console.log('USED_FALLBACK:', coreResponse.usedFallback);
    console.log('OPENAI_USED:', coreResponse.metadata.openaiUsed);
    console.log('CLASSIFICATION:', coreResponse.metadata.classification);
    
    logEvent("INSTAGRAM_NOEMIA_CORE_RESPONSE", {
      senderId,
      sessionId: session.id,
      responseLength: coreResponse.reply.length,
      audience: coreResponse.audience,
      source: coreResponse.source,
      usedFallback: coreResponse.usedFallback,
      responseTime: coreResponse.metadata.responseTime,
      classification: coreResponse.metadata.classification
    });

    // 9. Salvar resposta da IA
    await conversationPersistence.saveMessage(
      session.id,
      undefined, // IA não tem external message ID
      'assistant',
      coreResponse.reply,
      'outbound',
      {
        channel: 'instagram',
        source: coreResponse.source,
        responseTime: coreResponse.metadata.responseTime,
        classification: coreResponse.metadata.classification
      }
    );

    // 10. Atualizar sessão com informações da conversação
    await conversationPersistence.updateSession(session.id, {
      lead_stage: 'engaged',
      case_area: coreResponse.metadata.classification?.theme || session.case_area,
      current_intent: coreResponse.intent || session.current_intent,
      last_inbound_at: new Date().toISOString(),
      last_outbound_at: new Date().toISOString()
    });

    // 11. Enviar resposta
    console.log('=== INSTAGRAM_SEND_ATTEMPT ===');
    const sent = await sendInstagramMessage(senderId, coreResponse.reply || "Desculpe, não consegui processar sua mensagem no momento. Tente novamente.");
    
    if (sent) {
      console.log('INSTAGRAM_SEND_SUCCESS: Message sent successfully');
      logEvent("INSTAGRAM_RESPONSE_SENT", {
        senderId,
        sessionId: session.id,
        responseLength: coreResponse.reply.length
      });

      // 12. Marcar evento como processado
      await antiSpamGuard.markEventProcessed({
        channel: 'instagram',
        externalEventId,
        externalMessageId,
        externalUserId: senderId,
        messageText
      });
    } else {
      console.log('INSTAGRAM_SEND_FAILED: Failed to send message');
      logEvent("INSTAGRAM_RESPONSE_FAILED", {
        senderId,
        sessionId: session.id,
        error: 'Failed to send Instagram message'
      }, "error");
    }
  } catch (error) {
    console.log('INSTAGRAM_NOEMIA_ERROR: Error in processMessageWithNoemia');
    console.log('ERROR:', error instanceof Error ? error.message : String(error));
    
    logEvent("INSTAGRAM_NOEMIA_ERROR", {
      senderId,
      error: error instanceof Error ? error.message : String(error)
    }, "error");

    const fallbackResponse = "Oi! Vi que você enviou uma mensagem. Vou te explicar de forma simples o que pode estar acontecendo no seu caso. Muitas pessoas passam por isso sem saber que podem ter um direito não reconhecido. Se você quiser, posso entender melhor sua situação.";
    
    console.log('=== INSTAGRAM_FALLBACK_ATTEMPT ===');
    const sent = await sendInstagramMessage(senderId, fallbackResponse);
    
    if (sent) {
      console.log('INSTAGRAM_FALLBACK_SENT: Fallback message sent');
      logEvent("INSTAGRAM_FALLBACK_SENT", {
        senderId,
        responseLength: fallbackResponse.length
      });
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  console.log("INSTAGRAM_WEBHOOK_POST_RECEIVED");

  console.log("META_APP_SECRET_PRESENT:", !!APP_SECRET);
  console.log("META_APP_SECRET_LENGTH:", APP_SECRET?.length || 0);
  console.log("META_VERIFY_TOKEN_PRESENT:", !!VERIFY_TOKEN);
  console.log("META_VERIFY_TOKEN_LENGTH:", VERIFY_TOKEN?.length || 0);

  const rawBuffer = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-hub-signature-256");
  
  console.log("INSTAGRAM_SIGNATURE_HEADER_RECEIVED:", signature ? "[PRESENT]" : "[MISSING]");
  console.log("INSTAGRAM_SIGNATURE_HEADER_VALUE:", signature ? `${signature.substring(0, 20)}...` : "[MISSING]");
  
  // TEMPORARY DEBUG BYPASS FOR INSTAGRAM SIGNATURE VALIDATION
  // PROVISÓRIO: Este bypass é temporário apenas para diagnóstico da integração
  // NÃO USAR EM PRODUÇÃO - Remover após confirmar funcionamento do restante do fluxo
  const isValid = verifySignature(rawBuffer, signature || "");
  
  console.log("INSTAGRAM_SIGNATURE_VALIDATION_RESULT:", isValid ? "VALID" : "INVALID");
  
  if (!isValid) {
    console.log("INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY");
    logEvent(
      "INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY",
      {
        signature: signature ? `${signature.substring(0, 20)}...` : null,
        note: "TEMPORARY BYPASS FOR DIAGNOSIS - DO NOT USE IN PRODUCTION"
      },
      "warn"
    );
    // NÃO retorna 403 - continua processamento para diagnóstico
  } else {
    console.log("INSTAGRAM_SIGNATURE_VALID - CONTINUING FLOW");
  }

  try {
    const bodyText = rawBuffer.toString('utf8');
    const data = JSON.parse(bodyText);

    // LOGS SEGUROS DA ESTRUTURA REAL
    console.log("ENTRY_COUNT:", data.entry?.length || 0);
    console.log("ENTRY_KEYS:", data.entry?.length > 0 ? Object.keys(data.entry[0] || {}) : []);
    console.log("FIRST_ENTRY_KEYS:", data.entry?.length > 0 ? Object.keys(data.entry[0] || {}) : []);

    if (data.entry?.length > 0) {
      const firstEntry = data.entry[0];
      const messagingCount = firstEntry.messaging?.length || 0;
      const changesCount = firstEntry.changes?.length || 0;

      console.log("MESSAGING_COUNT:", messagingCount);
      console.log("CHANGES_COUNT:", changesCount);

      if (changesCount > 0) {
        const firstChange = firstEntry.changes[0];
        console.log("CHANGE_FIELD:", firstChange.field);
        console.log("CHANGE_VALUE_KEYS:", Object.keys(firstChange.value || {}));
      }

      if (messagingCount > 0) {
        const firstMessaging = firstEntry.messaging[0];
        console.log("MESSAGE_KEYS:", Object.keys(firstMessaging || {}));
      }
    }

    // LOG RESUMIDO DO PRIMEIRO EVENTO
    if (data.entry?.length > 0) {
      const firstEntry = data.entry[0];
      const eventSummary = {
        object: data.object,
        entryKeys: Object.keys(firstEntry),
        hasMessaging: !!firstEntry.messaging,
        hasChanges: !!firstEntry.changes,
        changeField: firstEntry.changes?.[0]?.field,
        changeValueKeys: Object.keys(firstEntry.changes?.[0]?.value || {}),
        senderKeys: firstEntry.messaging?.[0]?.sender ? Object.keys(firstEntry.messaging[0].sender) : null,
        recipientKeys: firstEntry.messaging?.[0]?.recipient ? Object.keys(firstEntry.messaging[0].recipient) : null,
        messageKeys: firstEntry.messaging?.[0]?.message ? Object.keys(firstEntry.messaging[0].message) : null,
        hasText: !!(firstEntry.messaging?.[0]?.message?.text || firstEntry.changes?.[0]?.value?.messages?.[0]?.text),
        hasMid: !!(firstEntry.messaging?.[0]?.message?.mid || firstEntry.changes?.[0]?.value?.messages?.[0]?.mid)
      };
      console.log("EVENT_SUMMARY:", JSON.stringify(eventSummary, null, 2));
    }

    if (data.object === "instagram") {
      for (const entry of data.entry || []) {
        // Process entry.messaging format
        for (const messaging of entry.messaging || []) {
          console.log("INSTAGRAM_STRUCTURE_MATCHED: messaging");
          if (!messaging.sender?.id) {
            console.log("EVENT_IGNORED_MISSING_SENDER: messaging structure without sender.id");
            continue;
          }

          // Ignorar mensagens echo (próprias mensagens da página)
          if (messaging.message?.is_echo) {
            console.log("EVENT_IGNORED_ECHO_MESSAGE: Ignoring own message");
            continue;
          }

          // Verificar se é mensagem de texto
          if (!messaging.message?.text) {
            console.log("EVENT_IGNORED_NO_MESSAGE: messaging structure without message.text");
            // Enviar mensagem de proteção para conteúdo não suportado
            await handleUnsupportedInstagramMessage(messaging.sender.id, messaging.message?.type || 'unknown');
            continue;
          }

          if (!messaging.message.text.trim()) {
            console.log("EVENT_IGNORED_NO_TEXT: messaging structure with empty text");
            continue;
          }

          console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: messaging");
          console.log("INSTAGRAM_SENDER_EXTRACTED:", messaging.sender.id);
          console.log("INSTAGRAM_TEXT_EXTRACTED:", messaging.message.text);
          console.log("INSTAGRAM_EVENT_OBJECT:", JSON.stringify(messaging, null, 2));

          await processMessageWithNoemia(
            messaging.sender.id, 
            messaging.message.text,
            messaging.message.mid,
            `messaging_${messaging.sender.id}_${Date.now()}`
          );
        }

        // Process entry.changes format
        for (const change of entry.changes || []) {
          console.log("INSTAGRAM_STRUCTURE_MATCHED: changes");
          
          // FASE 2: Processar comentários com automação completa
          if (change.field === "comments") {
            console.log("INSTAGRAM_COMMENT_STRUCTURE_DETECTED: comments");
            
            const comment = change.value;
            if (!comment || !comment.from || !comment.id || !comment.text) {
              console.log("EVENT_IGNORED_INCOMPLETE_COMMENT: missing required fields");
              continue;
            }

            console.log("INSTAGRAM_COMMENT_RECEIVED:");
            console.log("  - COMMENT_ID:", comment.id);
            console.log("  - USER_ID:", comment.from.id);
            console.log("  - USERNAME:", comment.from.username || "N/A");
            console.log("  - COMMENT_TEXT:", comment.text);
            console.log("  - POST_ID:", comment.media?.id || "N/A");

            // FASE 2, 3, 4, 6, 7: Processar com sistema completo de automação
            await processInstagramCommentWithAutomation(comment);
          }
          
          // Processar mensagens (código existente)
          if (change.field !== "messages" && change.field !== "comments") {
            console.log("EVENT_IGNORED_UNSUPPORTED_STRUCTURE: changes field not 'messages' or 'comments'", { field: change.field });
            continue;
          }

          console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: changes");
          const messages = change.value?.messages || [];

          for (const message of messages) {
            if (!message.from?.id) {
              console.log("EVENT_IGNORED_MISSING_SENDER: changes message without from.id");
              continue;
            }

            // Ignorar mensagens echo (próprias mensagens da página)
            if (message.is_echo) {
              console.log("EVENT_IGNORED_ECHO_MESSAGE: Ignoring own message (changes)");
              continue;
            }

            // Verificar se é mensagem de texto
            if (!message.text) {
              console.log("EVENT_IGNORED_NO_MESSAGE: changes message without text");
              // Enviar mensagem de proteção para conteúdo não suportado
              await handleUnsupportedInstagramMessage(message.from.id, message.type || 'unknown');
              continue;
            }

            if (!message.text.trim()) {
              console.log("EVENT_IGNORED_NO_TEXT: changes message with empty text");
              continue;
            }

            console.log("INSTAGRAM_SENDER_EXTRACTED:", message.from.id);
            console.log("INSTAGRAM_TEXT_EXTRACTED:", message.text);

            await processMessageWithNoemia(
              message.from.id, 
              message.text,
              message.mid,
              `changes_${message.from.id}_${Date.now()}`
            );
          }
        }
      }
    }

    console.log("=== META WEBHOOK PROCESSED SUCCESSFULLY ===");
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logEvent(
      "META_WEBHOOK_ERROR",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );

    return NextResponse.json({ received: false }, { status: 400 });
  }
}
