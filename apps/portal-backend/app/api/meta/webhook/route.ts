import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { processNoemiaCore } from "../../../../lib/ai/noemia-core";
import { conversationPersistence } from "../../../../lib/services/conversation-persistence";
import { antiSpamGuard } from "../../../../lib/services/anti-spam-guard";
import { instagramCommentAutomation } from "../../../../lib/services/instagram-comment-automation";
import { instagramCommentContext } from "../../../../lib/services/instagram-comment-context";
import { instagramMessageGuard } from "../../../../lib/services/instagram-message-guard";
import { instagramKeywordAutomation } from "../../../../lib/services/instagram-keyword-automation";
import { leadCaptureService } from "../../../../lib/services/lead-capture";
import { abTestingService } from "../../../../lib/services/ab-testing";

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
  }

  console.log("META_SECRET_SELECTED:", selectedEnvName);
  console.log("META_SECRET_LENGTH:", selectedSecret?.length || 0);

  if (!selectedSecret) {
    console.log("META_SECRET_MISSING: No valid secret found");
    return false;
  }

  console.log("META_SECRET_HASH_START");
  const expectedSignature = createHmac("sha256", selectedSecret)
    .update(rawBuffer)
    .digest("hex");

  console.log("META_SIGNATURE_CALCULATED:", expectedSignature);
  console.log("META_SIGNATURE_RECEIVED:", signature);

  const isValid = signature === expectedSignature;

  console.log("META_SIGNATURE_VALIDATION_RESULT:", isValid ? "VALID" : "INVALID");
  console.log("=== META_SIGNATURE_AUDIT_END ===");

  return isValid;
}

async function sendInstagramMessage(recipientId: string, messageText: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!INSTAGRAM_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      console.log("INSTAGRAM_MESSAGE_SEND_FAILED: Missing credentials");
      return { success: false, error: "Missing credentials" };
    }

    console.log("SEND_INSTAGRAM_API_CALL", {
      recipientId,
      messageLength: messageText.length,
      hasToken: !!INSTAGRAM_ACCESS_TOKEN,
      hasPageId: !!FACEBOOK_PAGE_ID
    });

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: messageText,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("SEND_INSTAGRAM_API_ERROR", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500)
      });
      return { success: false, error: `API Error: ${response.status}` };
    }

    const responseData = await response.json();
    console.log("SEND_INSTAGRAM_RESPONSE_SUCCESS", {
      messageId: responseData.message_id,
      recipientId
    });

    return { success: true };
  } catch (error) {
    console.log("SEND_INSTAGRAM_EXCEPTION", {
      error: error instanceof Error ? error.message : String(error),
      recipientId
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function processMessageWithNoemia(
  senderId: string, 
  messageText: string,
  externalMessageId?: string,
  externalEventId?: string,
  messageType?: string,
  isEcho?: boolean
) {
  try {
    console.log('=== INSTAGRAM_EVENT_RECEIVED ===');
    console.log('SENDER_ID:', senderId);
    console.log('MESSAGE_TEXT:', messageText);
    console.log('EXTERNAL_MESSAGE_ID:', externalMessageId);
    console.log('MESSAGE_TYPE:', messageType);
    console.log('IS_ECHO:', isEcho);

    // 1. Obter ou criar sessão
    const session = await conversationPersistence.getOrCreateSession(
      'instagram',
      senderId
    );

    // 2. Verificar se evento deve ser ignorado
    const instagramEvent = {
      sender: { id: senderId },
      recipient: { id: FACEBOOK_PAGE_ID || '' },
      message: {
        mid: externalMessageId,
        text: messageText,
        is_echo: isEcho,
        type: messageType
      }
    };

    const shouldIgnore = await instagramMessageGuard.shouldIgnoreEvent(instagramEvent, session.id);

    if (shouldIgnore.shouldIgnore) {
      console.log(`INSTAGRAM_EVENT_IGNORED_${shouldIgnore.reason?.toUpperCase()}: Evento bloqueado`);
      return;
    }

    // 3. Verificar se deve usar fallback de mensagens escritas
    const shouldUseFallback = instagramMessageGuard.shouldUseTextOnlyFallback(messageType, messageText);
    
    if (shouldUseFallback) {
      const fallbackMessage = "No momento, este atendimento está habilitado apenas para mensagens escritas. Pode me contar por texto, de forma simples, o que aconteceu no seu caso?";
      
      console.log('INSTAGRAM_FALLBACK_SENT: Mensagem de texto apenas');
      logEvent("INSTAGRAM_FALLBACK_SENT", {
        senderId,
        messageType,
        reason: 'unsupported_format'
      });

      await sendInstagramMessage(senderId, fallbackMessage);
      
      // Marcar mensagem como processada
      await instagramMessageGuard.markMessageAsProcessed(externalMessageId!, senderId, true);
      return;
    }

    // 4. Verificar spam (apenas se não for echo)
    if (!isEcho) {
      const guardResult = await antiSpamGuard.shouldRespondToEvent({
        channel: 'instagram',
        externalEventId,
        externalMessageId,
        externalUserId: senderId,
        messageText,
        isEcho: false,
      });
      
      if (!guardResult.shouldRespond) {
        console.log('MESSAGE_BLOCKED_BY_SPAM_GUARD:', senderId);
        return;
      }
    }

    console.log('INSTAGRAM_SESSION_FOUND_OR_CREATED:', {
      sessionId: session.id,
      leadStage: session.lead_stage,
      caseArea: session.case_area
    });

    // 5. Salvar mensagem do usuário
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

    // 6. Obter histórico recente da conversação
    const recentMessages = await conversationPersistence.getRecentMessages(session.id, 12);
    
    // 7. Construir histórico para o Noemia Core
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

    // 8. Gerar resumo se a conversa for longa
    const summary = await conversationPersistence.generateConversationSummary(
      session.id,
      recentMessages
    );

    // 9. Construir contexto para a IA
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

    // 10. Processar com Noemia Core
    console.log('INSTAGRAM_RESPONSE_GENERATED: Processando com Noemia Core');
    const coreResponse = await processNoemiaCore({
      channel: 'instagram',
      userType: 'visitor',
      message: messageText,
      history,
      context: enrichedContext,
      metadata: { 
        senderId,
        sessionId: session.id,
        externalMessageId,
        isFromComment: enrichedContext.isFromComment || false,
        commentTheme: enrichedContext.commentTheme,
        commentKeyword: enrichedContext.commentKeyword
      }
    });

    console.log('INSTAGRAM_RESPONSE_GENERATED:', {
      sessionId: session.id,
      responseLength: coreResponse.reply.length,
      audience: coreResponse.audience,
      source: coreResponse.source,
      usedFallback: coreResponse.usedFallback
    });

    // 11. Enviar resposta
    await sendInstagramMessage(senderId, coreResponse.reply);

    console.log('INSTAGRAM_RESPONSE_SENT:', {
      sessionId: session.id,
      senderId,
      responseLength: coreResponse.reply.length
    });

    // 12. Marcar mensagem como processada
    await instagramMessageGuard.markMessageAsProcessed(externalMessageId!, senderId, true);

    logEvent("INSTAGRAM_RESPONSE_SENT", {
      senderId,
      sessionId: session.id,
      responseLength: coreResponse.reply.length,
      source: coreResponse.source
    });

  } catch (error) {
    console.log('INSTAGRAM_MESSAGE_PROCESSING_ERROR:', error);
    logEvent("INSTAGRAM_MESSAGE_PROCESSING_ERROR", {
      senderId,
      error: error instanceof Error ? error.message : String(error)
    }, "error");
  }
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  console.log("=== META WEBHOOK GET REQUEST ===");
  console.log("URL:", request.url);
  console.log("SEARCH PARAMS:", Object.fromEntries(searchParams.entries()));
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("META_WEBHOOK_PARAMS:", { mode, token, challenge });

  if (mode === "subscribe") {
    console.log("META_VERIFY_MODE_DETECTED");
    
    if (!token) {
      console.log("META_VERIFY_TOKEN_MISSING");
      return NextResponse.json({ error: "No verify token provided" }, { status: 400 });
    }

    if (token !== VERIFY_TOKEN) {
      console.log("META_VERIFY_TOKEN_INVALID", { 
        received: token, 
        expected: VERIFY_TOKEN 
      });
      return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
    }

    console.log("META_VERIFY_TOKEN_VALID");
    logEvent("META_WEBHOOK_VERIFIED", {
      mode,
      token: token?.substring(0, 10) + "...",
      challenge
    });

    return NextResponse.json({ "hub.challenge": challenge }, { status: 200 });
  }

  console.log("META_VERIFY_MODE_NOT_DETECTED");
  return NextResponse.json({ error: "Mode not supported" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  console.log("=== META WEBHOOK POST REQUEST ===");
  console.log("META_WEBHOOK_URL:", request.url);
  console.log("META_WEBHOOK_METHOD:", request.method);
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  console.log("META_WEBHOOK_HEADERS:", headersObj);

  try {
    const rawBuffer = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("x-hub-signature-256");
    
    console.log("META_SIGNATURE_HEADER_RECEIVED:", signature ? "[PRESENT]" : "[MISSING]");
    console.log("META_SIGNATURE_HEADER_VALUE:", signature ? `${signature.substring(0, 20)}...` : "[MISSING]");
    
    // TEMPORARY DEBUG BYPASS FOR INSTAGRAM SIGNATURE VALIDATION
    const isValid = verifySignature(rawBuffer, signature || "");
    
    console.log("META_SIGNATURE_VALIDATION_RESULT:", isValid ? "VALID" : "INVALID");
    
    if (!isValid) {
      console.log("META_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY");
      logEvent(
        "META_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY",
        {
          signature: signature ? `${signature.substring(0, 20)}...` : null,
          note: "TEMPORARY BYPASS FOR DIAGNOSIS - DO NOT USE IN PRODUCTION"
        },
        "warn"
      );
    } else {
      console.log("META_SIGNATURE_VALID - CONTINUING FLOW");
    }

    try {
      const bodyText = rawBuffer.toString('utf8');
      const data = JSON.parse(bodyText);

      // LOGS SEGUROS DA ESTRUTURA REAL
      console.log("ENTRY_COUNT:", data.entry?.length || 0);
      console.log("ENTRY_KEYS:", data.entry?.length > 0 ? Object.keys(data.entry[0] || {}) : []);
      console.log("FIRST_ENTRY_KEYS:", data.entry?.length > 0 ? Object.keys(data.entry[0] || {}) : []);

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
              continue;
            }

            if (!messaging.message.text.trim()) {
              console.log("EVENT_IGNORED_NO_TEXT: messaging structure with empty text");
              continue;
            }

            console.log("INSTAGRAM_MESSAGE_STRUCTURE_DETECTED: messaging");
            console.log("INSTAGRAM_SENDER_EXTRACTED:", messaging.sender.id);
            console.log("INSTAGRAM_TEXT_EXTRACTED:", messaging.message.text);

            await processMessageWithNoemia(
              messaging.sender.id, 
              messaging.message.text,
              messaging.message.mid,
              `messaging_${messaging.sender.id}_${Date.now()}`,
              messaging.message.type,
              messaging.message.is_echo
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

              // FASE 1: Verificar A/B tests para este conteúdo
              let abTestVariation = null;
              try {
                // Verificar se há testes A/B ativos para o conteúdo
                const activeTests = abTestingService.getActiveTests();
                for (const test of activeTests) {
                  const variation = abTestingService.getVariationForUser(test.id, comment.from.id);
                  if (variation && test.contentId === comment.media?.id) {
                    abTestVariation = { test, variation };
                    console.log("AB_TEST_VARIATION_SELECTED", {
                      testId: test.id,
                      variationId: variation.id,
                      userId: comment.from.id
                    });
                    break;
                  }
                }
              } catch (abError) {
                console.log("AB_TEST_ERROR", {
                  error: abError instanceof Error ? abError.message : String(abError)
                });
              }

              // FASE 2: Capturar lead com sistema de aquisição
              try {
                console.log("LEAD_CAPTURE_START", {
                  commentId: comment.id,
                  userId: comment.from.id,
                  commentText: comment.text,
                  hasABTest: !!abTestVariation
                });

                const captureResult = await leadCaptureService.captureFromComment(
                  comment.from.id,
                  comment.from.username,
                  comment.text,
                  comment.media?.id || '',
                  {
                    userAgent: 'Instagram Webhook',
                    ipAddress: 'Instagram',
                    referrer: 'Instagram Comment',
                    abTestVariation: abTestVariation ? {
                      testId: abTestVariation.test.id,
                      variationId: abTestVariation.variation.id,
                      variationType: abTestVariation.variation.variationType,
                      variationValue: abTestVariation.variation.value
                    } : undefined
                  }
                );

                if (captureResult.success) {
                  console.log("LEAD_CAPTURE_SUCCESS", {
                    commentId: comment.id,
                    userId: comment.from.id,
                    sessionId: captureResult.lead?.sessionId,
                    keyword: captureResult.lead?.trigger.keyword,
                    contentTitle: captureResult.lead?.content.title
                  });

                  // Registrar métricas do A/B test se aplicável
                  if (abTestVariation) {
                    try {
                      await abTestingService.recordLeadGenerated(
                        abTestVariation.test.id,
                        abTestVariation.variation.id,
                        comment.from.id,
                        captureResult.lead?.sessionId || '',
                        {
                          platform: 'instagram',
                          source: 'comment',
                          theme: captureResult.lead?.content.theme,
                          contentId: captureResult.lead?.content.id
                        }
                      );

                      console.log("AB_TEST_LEAD_RECORDED", {
                        testId: abTestVariation.test.id,
                        variationId: abTestVariation.variation.id,
                        userId: comment.from.id,
                        sessionId: captureResult.lead?.sessionId
                      });
                    } catch (metricError) {
                      console.log("AB_TEST_METRIC_ERROR", {
                        error: metricError instanceof Error ? metricError.message : String(metricError)
                      });
                    }
                  }

                  // Enviar DM inicial se gerado
                  let dmMessage = captureResult.noemiaResponse;
                  
                  // Usar variação do A/B test se for tipo 'dm_message'
                  if (abTestVariation && abTestVariation.variation.variationType === 'dm_message') {
                    dmMessage = abTestVariation.variation.value;
                    console.log("AB_TEST_DM_VARIATION_USED", {
                      testId: abTestVariation.test.id,
                      variationId: abTestVariation.variation.id,
                      originalMessage: captureResult.noemiaResponse?.substring(0, 50),
                      testMessage: dmMessage.substring(0, 50)
                    });
                  }

                  if (dmMessage && INSTAGRAM_ACCESS_TOKEN) {
                    try {
                      const dmResponse = await sendInstagramMessage(
                        comment.from.id,
                        dmMessage
                      );

                      if (dmResponse.success) {
                        console.log("LEAD_CAPTURE_DM_SENT", {
                          commentId: comment.id,
                          userId: comment.from.id,
                          sessionId: captureResult.lead?.sessionId,
                          usedABTest: !!abTestVariation
                        });
                      } else {
                        console.log("LEAD_CAPTURE_DM_ERROR", {
                          commentId: comment.id,
                          userId: comment.from.id,
                          error: dmResponse.error
                        });
                      }
                    } catch (dmError) {
                      console.log("LEAD_CAPTURE_DM_EXCEPTION", {
                        commentId: comment.id,
                        userId: comment.from.id,
                        error: dmError instanceof Error ? dmError.message : String(dmError)
                      });
                    }
                  }
                } else {
                  console.log("LEAD_CAPTURE_SKIPPED", {
                    commentId: comment.id,
                    userId: comment.from.id,
                    reason: captureResult.errorMessage
                  });
                }
              } catch (captureError) {
                console.log("LEAD_CAPTURE_ERROR", {
                  commentId: comment.id,
                  userId: comment.from.id,
                  error: captureError instanceof Error ? captureError.message : String(captureError)
                });
              }

              // FASE 2: Processar automação por palavra-chave (sistema legado)
              try {
                const keywordResult = await instagramKeywordAutomation.processKeywordAutomation(
                  comment.id,
                  comment.from.id,
                  comment.text,
                  comment.media?.id || '',
                  comment.from.username
                );

                if (keywordResult.success) {
                  console.log("KEYWORD_AUTOMATION_SUCCESS", {
                    commentId: comment.id,
                    userId: comment.from.id,
                    keyword: keywordResult.keyword,
                    theme: keywordResult.theme,
                    dmSent: keywordResult.dmSent,
                    sessionCreated: keywordResult.sessionCreated
                  });
                } else {
                  console.log("KEYWORD_AUTOMATION_SKIPPED", {
                    commentId: comment.id,
                    userId: comment.from.id,
                    reason: keywordResult.error
                  });
                }
              } catch (keywordError) {
                console.log("KEYWORD_AUTOMATION_ERROR", {
                  commentId: comment.id,
                  error: keywordError instanceof Error ? keywordError.message : String(keywordError)
                });
              }

              // FASE 2: Processar com sistema completo de automação (campanhas existentes)
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
                `changes_${message.from.id}_${Date.now()}`,
                message.type,
                message.is_echo
              );
            }
          }
        }
      }

      console.log("=== META WEBHOOK PROCESSED SUCCESSFULLY ===");
      return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
      logEvent(
        "META_WEBHOOK_PROCESSING_ERROR",
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        "error"
      );
      
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error)
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    logEvent(
      "META_WEBHOOK_PARSING_ERROR",
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
    
    return NextResponse.json(
      { 
        error: "Invalid JSON payload",
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 400 }
    );
  }
}
