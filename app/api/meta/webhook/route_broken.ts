import { NextRequest, NextResponse } from "next/server";

// Configurações
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

// Função de log
function logEvent(event: string, data?: any) {
  console.log(`[${new Date().toISOString()}] META_WEBHOOK ${event}:`, data || '');
}

// Função para enviar mensagem para Instagram Direct
async function sendInstagramMessage(senderId: string, messageText: string): Promise<boolean> {
  try {
    logEvent('SEND_INSTAGRAM_START', {
      senderId,
      messageLength: messageText.length,
      hasToken: !!INSTAGRAM_ACCESS_TOKEN,
      tokenLength: INSTAGRAM_ACCESS_TOKEN?.length || 0,
      tokenPrefix: INSTAGRAM_ACCESS_TOKEN?.substring(0, 10) + '...'
    });

    if (!INSTAGRAM_ACCESS_TOKEN) {
      logEvent('SEND_INSTAGRAM_ERROR', {
        error: 'INSTAGRAM_ACCESS_TOKEN missing',
        senderId,
        envVars: Object.keys(process.env).filter(k => k.includes('INSTAGRAM'))
      });
      return false;
    }

    // Endpoint correto para Instagram Messaging API
    const apiUrl = 'https://graph.facebook.com/v18.0/me/messages';
    
    const payload = {
      recipient: { id: senderId },
      message: { text: messageText }
    };

    logEvent('SEND_INSTAGRAM_API_CALL', {
      apiUrl,
      method: 'POST',
      payload,
      headers: {
        'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      }
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    logEvent('SEND_INSTAGRAM_RESPONSE', {
      senderId,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseData,
      responseText: responseText.substring(0, 500)
    });

    if (response.ok) {
      logEvent('SEND_INSTAGRAM_SUCCESS', {
        senderId,
        messageId: responseData.message_id,
        responseStatus: response.status,
        responseData
      });
      return true;
    } else {
      logEvent('SEND_INSTAGRAM_ERROR', {
        senderId,
        error: responseData.error?.message || 'Unknown error',
        errorCode: responseData.error?.code,
        errorType: responseData.error?.type,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseData,
        fullResponse: responseText
      });
      return false;
    }

  } catch (error) {
    logEvent('SEND_INSTAGRAM_EXCEPTION', {
      senderId,
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error
    });
    return false;
  }
}

// Handler GET para verificação do webhook
export async function GET(request: NextRequest) {
  // LOGS MUITO VISÍVEIS NO GET - ANTES DE QUALQUER PARSING
  console.log('\n' + '='.repeat(80));
  console.log('🔍 INSTAGRAM WEBHOOK VERIFICATION - GET REQUEST RECEIVED');
  console.log('='.repeat(80));
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 URL:', request.url);
  console.log('🔑 Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  console.log('👤 User-Agent:', request.headers.get('user-agent'));
  console.log('📍 IP Origin:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown');
  console.log('='.repeat(80) + '\n');

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log('🔍 VERIFICATION PARAMETERS:');
  console.log('   Mode:', mode);
  console.log('   Token:', token === VERIFY_TOKEN ? '✅ VALID' : '❌ INVALID');
  console.log('   Expected Token:', VERIFY_TOKEN);
  console.log('   Received Token:', token);
  console.log('   Has Challenge:', !!challenge);
  console.log('   Challenge:', challenge);
  console.log('='.repeat(80) + '\n');

  logEvent('VERIFICATION_ATTEMPT', {
    mode,
    token: token === VERIFY_TOKEN ? 'VALID' : 'INVALID',
    tokenMatch: token === VERIFY_TOKEN,
    hasChallenge: !!challenge,
    verifyToken: VERIFY_TOKEN ? 'SET' : 'MISSING'
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK VERIFICATION SUCCESS!');
    console.log('🎯 Returning challenge:', challenge);
    console.log('='.repeat(80) + '\n');
    
    logEvent('VERIFICATION_SUCCESS', {
      mode,
      token: 'VALID',
      challenge
    });
    
    // Retornar SOMENTE hub.challenge como texto puro
    return new Response(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      }
    });
  }

  console.log('❌ WEBHOOK VERIFICATION FAILED!');
  console.log('   Reason:', mode !== 'subscribe' ? 'Invalid mode' : 'Invalid token');
  console.log('='.repeat(80) + '\n');

  logEvent('VERIFICATION_FAILED', {
    mode,
    token,
    tokenMatch: token === VERIFY_TOKEN,
    expectedToken: VERIFY_TOKEN,
    reason: mode !== 'subscribe' ? 'Invalid mode' : 'Invalid token'
  });

  return new Response("Forbidden", { 
    status: 403,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8'
    }
  });
}

// Handler POST para processamento de mensagens
export async function POST(request: NextRequest) {
  // 🔥 INSTAGRAM EVENT RECEBIDO - LOG IMEDIATO
  console.log("🔥 INSTAGRAM EVENT RECEBIDO");
  
  // Retornar 200 imediatamente para Meta não reenviar
  const response = NextResponse.json({ received: true }, { status: 200 });
  
  // Processar em background sem bloquear resposta
  (async () => {
    try {
      // LOG ABSOLUTO NO INÍCIO - CAPTURA QUALQUER EVENTO ANTES DE PARSING
      console.log('\n' + '='.repeat(100));
      console.log('POST RECEBIDO - QUALQUER EVENTO DO META');
      console.log('='.repeat(100));
      console.log('Timestamp:', new Date().toISOString());
      console.log('URL:', request.url);
      console.log('Method:', request.method);
      console.log('Headers:', Object.fromEntries(request.headers.entries()));
      console.log('Content-Type:', request.headers.get('content-type'));
      console.log('User-Agent:', request.headers.get('user-agent'));
      console.log('IP:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown');
      console.log('='.repeat(100) + '\n');

      // LOGS MUITO VISÍVEIS NO INÍCIO - ANTES DE QUALQUER PARSING
      console.log('\n' + '='.repeat(80));
      console.log('Instagram Webhook Hit - POST Request Received');
      console.log('='.repeat(80));
      console.log('Timestamp:', new Date().toISOString());
      console.log('URL:', request.url);
      console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
      console.log('User-Agent:', request.headers.get('user-agent'));
      console.log('IP Origin:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown');
      console.log('='.repeat(80) + '\n');

      logEvent('POST_RECEIVED', {
        method: 'POST',
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        userAgent: request.headers.get('user-agent')
      });

      const body = await request.json();
      
      logEvent('BODY_PARSED', {
        object: body.object,
        entryCount: body.entry?.length || 0,
        hasBody: !!body,
        bodyPreview: JSON.stringify(body).substring(0, 500)
      });

      // Log completo do payload para debug
      logEvent('FULL_PAYLOAD_DEBUG', {
        fullBody: body,
        bodyString: JSON.stringify(body, null, 2),
        headers: Object.fromEntries(request.headers.entries())
      });

      // Detectar plataforma
      let platform = 'unknown';
      if (body.object === 'instagram') {
        platform = 'instagram';
      } else if (body.object === 'whatsapp_business_account') {
        platform = 'whatsapp';
      }

      logEvent('PLATFORM_DETECTED', { platform, object: body.object });

      // Processar eventos
      const events = [];
      
      if (platform === 'instagram' && body.entry) {
        logEvent('PROCESSING_INSTAGRAM_ENTRIES', {
          entryCount: body.entry.length,
          entries: body.entry.map((entry: any) => ({
            id: entry.id,
            time: entry.time,
            hasMessaging: !!entry.messaging,
            hasChanges: !!entry.changes,
            hasStandby: !!entry.standby,
            entryKeys: Object.keys(entry)
          }))
        });

        for (const entry of body.entry) {
          logEvent('PROCESSING_INSTAGRAM_ENTRY', {
            entryId: entry.id,
            entryTime: entry.time,
            entryStructure: Object.keys(entry),
            hasMessaging: !!entry.messaging,
            messagingCount: entry.messaging?.length || 0,
            hasChanges: !!entry.changes,
            changesCount: entry.changes?.length || 0
          });

          if (entry.messaging) {
            logEvent('FOUND_MESSAGING_OBJECT', {
              messagingCount: entry.messaging.length,
              messagingStructure: entry.messaging.map((m: any) => ({
                sender: m.sender,
                recipient: m.recipient,
                timestamp: m.timestamp,
                hasMessage: !!m.message,
                hasPostback: !!m.postback,
                hasRead: !!m.read,
                hasDelivery: !!m.delivery,
                messageKeys: m.message ? Object.keys(m.message) : []
              }))
            });

            for (const messaging of entry.messaging) {
              logEvent('PROCESSING_MESSAGING_ITEM', {
                senderId: messaging.sender?.id,
                senderName: messaging.sender?.name,
                recipientId: messaging.recipient?.id,
                timestamp: messaging.timestamp,
                hasMessageText: !!messaging.message?.text,
                messageText: messaging.message?.text,
                messageId: messaging.message?.mid,
                messageType: messaging.message?.type,
                fullMessaging: messaging
              });

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

                logEvent('INSTAGRAM_MESSAGE_EXTRACTED', {
                  senderId: messaging.sender.id,
                  text: messaging.message.text,
                  messageId: messaging.message.mid
                });
              }
            }
          } else if (entry.changes) {
            logEvent('FOUND_CHANGES_OBJECT', {
              changesCount: entry.changes.length,
              changesStructure: entry.changes.map((c: any) => ({
                field: c.field,
                value: c.value,
                hasMessages: !!c.value?.messages,
                hasContacts: !!c.value?.contacts
              }))
            });

            // Processar estrutura CHANGES (mais comum recentemente)
            for (const change of entry.changes) {
              logEvent('PROCESSING_CHANGE', {
                field: change.field,
                hasMessages: !!change.value?.messages,
                messagesCount: change.value?.messages?.length || 0
              });

              if (change.field === 'messages' && change.value?.messages) {
                for (const message of change.value.messages) {
                  if (message.type === 'text' && message.from) {
                    events.push({
                      type: 'message',
                      platform: 'instagram',
                      sender: message.from.id,
                      senderName: change.value.contacts?.[0]?.display_name || message.from.username || null,
                      text: message.text || '',
                      messageId: message.id,
                      timestamp: message.timestamp || Date.now()
                    });

                    logEvent('INSTAGRAM_MESSAGE_FROM_CHANGES', {
                      senderId: message.from.id,
                      senderName: change.value.contacts?.[0]?.display_name || message.from.username,
                      text: message.text,
                      messageId: message.id
                    });
                  }
                }
              }
            }
          } else if (entry.standby) {
            logEvent('FOUND_STANDBY_OBJECT', {
              standbyCount: entry.standby.length,
              standbyStructure: entry.standby.map((s: any) => ({
                sender: s.sender,
                recipient: s.recipient,
                timestamp: s.timestamp,
                hasMessage: !!s.message
              }))
            });

            // Processar estrutura STANDBY
            for (const standby of entry.standby) {
              if (standby.message?.text && standby.sender?.id) {
                events.push({
                  type: 'message',
                  platform: 'instagram',
                  sender: standby.sender.id,
                  senderName: standby.sender.name || null,
                  text: standby.message.text,
                  messageId: standby.message.mid,
                  timestamp: standby.timestamp
                });

                logEvent('INSTAGRAM_MESSAGE_FROM_STANDBY', {
                  senderId: standby.sender.id,
                  senderName: standby.sender.name,
                  text: standby.message.text,
                  messageId: standby.message.mid
                });
              }
            }
          } else {
            logEvent('NO_RECOGNIZED_STRUCTURE', {
              entryId: entry.id,
              entryKeys: Object.keys(entry),
              availableStructures: ['messaging', 'changes', 'standby']
            });
          }
        }
      } else if (platform === 'whatsapp' && body.entry) {
        for (const entry of body.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value?.messages) {
                for (const message of change.value.messages) {
                  if (message.type === 'text' && message.from) {
                    events.push({
                      type: 'message',
                      platform: 'whatsapp',
                      sender: message.from,
                      senderName: change.value.contacts?.[0]?.name?.formatted_name || null,
                      text: message.text?.body || '',
                      messageId: message.id,
                      timestamp: message.timestamp
                    });

                    logEvent('WHATSAPP_MESSAGE_EXTRACTED', {
                      from: message.from,
                      text: message.text?.body,
                      messageId: message.id
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Processar eventos capturados
      for (const event of events) {
        if (event.platform === 'instagram') {
          logEvent('PROCESSING_INSTAGRAM_EVENT', {
            type: event.type,
            sender: event.sender,
            text: event.text,
            messageId: event.messageId
          });

          // Gerar resposta simples
          const responseText = `Olá! Recebi sua mensagem: "${event.text}". Em breve entrarei em contato!`;
          
          logEvent('RESPONSE_GENERATED', {
            platform: event.platform,
            sender: event.sender,
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 100)
          });

          // Enviar resposta real para Instagram
          let messageSent = false;
          
          if (event.platform === 'instagram') {
            messageSent = await sendInstagramMessage(event.sender, responseText);
          } else {
            logEvent('SEND_SKIP', {
              platform: event.platform,
              reason: 'Only Instagram auto-reply implemented'
            });
          }

          if (messageSent) {
            logEvent('SEND_SUCCESS', {
              platform: event.platform,
              sender: event.sender,
              messageSent
            });
          } else {
            logEvent('SEND_FAILED', {
              platform: event.platform,
              sender: event.sender,
              messageSent
            });
          }

          processedEvents.push({
            ...event,
            messageSent,
            processed: true,
            responseLength: responseText.length
          });
        }
      }

      console.log("=== META WEBHOOK PROCESSED SUCCESSFULLY ===");
      logEvent('WEBHOOK_PROCESSED', {
        totalEvents: events.length,
        processedEvents: processedEvents.length,
        platform
      });
      
    } catch (error) {
      console.log("=== META WEBHOOK ERROR ===");
      console.log("ERROR:", error instanceof Error ? error.message : String(error));
      
      logEvent('WEBHOOK_ERROR', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      }, 'error');
    }
  })();

  // Retornar 200 imediatamente
  return response;
}
    logEvent('POST_RECEIVED', {
      method: 'POST',
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent')
    });

    const body = await request.json();
    
    logEvent('BODY_PARSED', {
      object: body.object,
      entryCount: body.entry?.length || 0,
      hasBody: !!body,
      bodyPreview: JSON.stringify(body).substring(0, 500)
    });

    // Log completo do payload para debug
    logEvent('FULL_PAYLOAD_DEBUG', {
      fullBody: body,
      bodyString: JSON.stringify(body, null, 2),
      headers: Object.fromEntries(request.headers.entries())
    });

    // Detectar plataforma
    let platform = 'unknown';
    if (body.object === 'instagram') {
      platform = 'instagram';
    } else if (body.object === 'whatsapp_business_account') {
      platform = 'whatsapp';
    }

    logEvent('PLATFORM_DETECTED', { platform, object: body.object });

    // Processar eventos
    const events = [];
    
    if (platform === 'instagram' && body.entry) {
      logEvent('PROCESSING_INSTAGRAM_ENTRIES', {
        entryCount: body.entry.length,
        entries: body.entry.map(entry => ({
          id: entry.id,
          time: entry.time,
          hasMessaging: !!entry.messaging,
          hasChanges: !!entry.changes,
          hasStandby: !!entry.standby,
          entryKeys: Object.keys(entry)
        }))
      });

      for (const entry of body.entry) {
        logEvent('PROCESSING_INSTAGRAM_ENTRY', {
          entryId: entry.id,
          entryTime: entry.time,
          entryStructure: Object.keys(entry),
          hasMessaging: !!entry.messaging,
          messagingCount: entry.messaging?.length || 0,
          hasChanges: !!entry.changes,
          changesCount: entry.changes?.length || 0
        });

        if (entry.messaging) {
          logEvent('FOUND_MESSAGING_OBJECT', {
            messagingCount: entry.messaging.length,
            messagingStructure: entry.messaging.map(m => ({
              sender: m.sender,
              recipient: m.recipient,
              timestamp: m.timestamp,
              hasMessage: !!m.message,
              hasPostback: !!m.postback,
              hasRead: !!m.read,
              hasDelivery: !!m.delivery,
              messageKeys: m.message ? Object.keys(m.message) : []
            }))
          });

          for (const messaging of entry.messaging) {
            logEvent('PROCESSING_MESSAGING_ITEM', {
              senderId: messaging.sender?.id,
              senderName: messaging.sender?.name,
              recipientId: messaging.recipient?.id,
              timestamp: messaging.timestamp,
              hasMessageText: !!messaging.message?.text,
              messageText: messaging.message?.text,
              messageId: messaging.message?.mid,
              messageType: messaging.message?.type,
              fullMessaging: messaging
            });

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

              logEvent('INSTAGRAM_MESSAGE_EXTRACTED', {
                senderId: messaging.sender.id,
                text: messaging.message.text,
                messageId: messaging.message.mid
              });
            }
          }
        } else if (entry.changes) {
          logEvent('FOUND_CHANGES_OBJECT', {
            changesCount: entry.changes.length,
            changesStructure: entry.changes.map((c: any) => ({
              field: c.field,
              value: c.value,
              hasMessages: !!c.value?.messages,
              hasContacts: !!c.value?.contacts
            }))
          });

          // Processar estrutura CHANGES (mais comum recentemente)
          for (const change of entry.changes) {
            logEvent('PROCESSING_CHANGE', {
              field: change.field,
              hasMessages: !!change.value?.messages,
              messagesCount: change.value?.messages?.length || 0
            });

            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                if (message.type === 'text' && message.from) {
                  events.push({
                    type: 'message',
                    platform: 'instagram',
                    sender: message.from.id,
                    senderName: change.value.contacts?.[0]?.display_name || message.from.username || null,
                    text: message.text || '',
                    messageId: message.id,
                    timestamp: message.timestamp || Date.now()
                  });

                  logEvent('INSTAGRAM_MESSAGE_FROM_CHANGES', {
                    senderId: message.from.id,
                    senderName: change.value.contacts?.[0]?.display_name || message.from.username,
                    text: message.text,
                    messageId: message.id
                  });
                }
              }
            }
          }
        } else if (entry.standby) {
          logEvent('FOUND_STANDBY_OBJECT', {
            standbyCount: entry.standby.length,
            standbyStructure: entry.standby.map((s: any) => ({
              sender: s.sender,
              recipient: s.recipient,
              timestamp: s.timestamp,
              hasMessage: !!s.message
            }))
          });

          // Processar estrutura STANDBY
          for (const standby of entry.standby) {
            if (standby.message?.text && standby.sender?.id) {
              events.push({
                type: 'message',
                platform: 'instagram',
                sender: standby.sender.id,
                senderName: standby.sender.name || null,
                text: standby.message.text,
                messageId: standby.message.mid,
                timestamp: standby.timestamp
              });

              logEvent('INSTAGRAM_MESSAGE_FROM_STANDBY', {
                senderId: standby.sender.id,
                senderName: standby.sender.name,
                text: standby.message.text,
                messageId: standby.message.mid
              });
            }
          }
        } else {
          logEvent('NO_RECOGNIZED_STRUCTURE', {
            entryId: entry.id,
            entryKeys: Object.keys(entry),
            availableStructures: ['messaging', 'changes', 'standby']
          });
        }
      }
    } else if (platform === 'whatsapp' && body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                if (message.type === 'text' && message.from) {
                  events.push({
                    type: 'message',
                    platform: 'whatsapp',
                    sender: message.from,
                    senderName: change.value.contacts?.[0]?.name?.formatted_name || null,
                    text: message.text?.body || '',
                    messageId: message.id,
                    timestamp: message.timestamp || Date.now()
                  });
                }
              }
            }
          }
        }
      }
    }

    logEvent('EVENTS_PARSED', {
      eventCount: events.length,
      platforms: [...new Set(events.map(e => e.platform))],
      senders: events.map(e => e.sender)
    });

    if (!events.length) {
      logEvent('NO_EVENTS_FOUND', { 
        object: body.object,
        body: JSON.stringify(body).substring(0, 1000)
      });
      return NextResponse.json({ received: true, events: [] });
    }

    // Processar cada evento
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

        // Gerar resposta simples
        const responseText = `Olá! Recebi sua mensagem: "${event.text}". Em breve entrarei em contato!`;
        
        logEvent('RESPONSE_GENERATED', {
          platform: event.platform,
          sender: event.sender,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 100)
        });

        // Enviar resposta real para Instagram
        let messageSent = false;
        
        if (event.platform === 'instagram') {
          messageSent = await sendInstagramMessage(event.sender, responseText);
        } else {
          logEvent('SEND_SKIP', {
            platform: event.platform,
            reason: 'Only Instagram auto-reply implemented'
          });
        }

        if (messageSent) {
          logEvent('SEND_SUCCESS', {
            platform: event.platform,
            sender: event.sender,
            messageSent
          });
        } else {
          logEvent('SEND_FAILED', {
            platform: event.platform,
            sender: event.sender,
            messageSent
          });
        }

        processedEvents.push({
          ...event,
          messageSent,
          processed: true,
          responseLength: responseText.length
        });

      } catch (eventError) {
        logEvent('EVENT_PROCESSING_ERROR', {
          platform: event.platform,
          sender: event.sender,
          messageId: event.messageId,
          error: eventError instanceof Error ? eventError.message : 'unknown'
        });

        processedEvents.push({
          ...event,
          error: true,
          processed: false
        });
      }
    }

    const successCount = processedEvents.filter(r => r.processed).length;
    const errorCount = processedEvents.filter(r => (r as any).error).length;
    const sentCount = processedEvents.filter(r => (r as any).messageSent).length;

    logEvent('PROCESSING_COMPLETE', {
      totalEvents: events.length,
      successCount,
      errorCount,
      sentCount
    });

    return NextResponse.json({
      received: true,
      processed: processedEvents.length,
      successCount,
      errorCount,
      sentCount,
      events: processedEvents
    });

  } catch (error) {
    logEvent('FATAL_ERROR', {
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined,
      method: 'POST',
      url: request.url
    });

    return NextResponse.json({
      error: 'internal_error',
      received: true
    }, { status: 500 });
  }
}
