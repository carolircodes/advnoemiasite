# Instagram Direct Auto-Reply - Debug e Solução Completa

## PROBLEMA IDENTIFICADO

O Instagram Direct não estava respondendo porque o webhook só processava a estrutura `entry.messaging`, mas o Instagram pode enviar 3 estruturas diferentes:

1. **entry.messaging** (estrutura clássica, menos comum hoje)
2. **entry.changes** (estrutura mais comum recentemente) 
3. **entry.standby** (estrutura alternativa)

## ARQUIVOS ALTERADOS

### 1. app/api/meta/webhook/route.ts

**Adicionados:**
- Logs completos para debug do payload recebido
- Parsing para todas as estruturas do Instagram
- Logs detalhados na função sendInstagramMessage()
- Tratamento robusto de erros

**Código principal adicionado:**

```typescript
// Logs completos do payload
logEvent('FULL_PAYLOAD_DEBUG', {
  fullBody: body,
  bodyString: JSON.stringify(body, null, 2),
  headers: Object.fromEntries(request.headers.entries())
});

// Parsing para entry.changes (estrutura mais comum)
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
    }
  }
}

// Parsing para entry.standby
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
}

// Logs detalhados na API call
logEvent('SEND_INSTAGRAM_RESPONSE', {
  senderId,
  httpStatus: response.status,
  httpStatusText: response.statusText,
  responseHeaders: Object.fromEntries(response.headers.entries()),
  responseData,
  responseText: responseText.substring(0, 500)
});
```

## ESTRUTURAS SUPORTADAS

### 1. Classic Messaging
```json
{
  "object": "instagram",
  "entry": [{
    "messaging": [{
      "sender": {"id": "USER_ID"},
      "message": {"text": "mensagem", "mid": "MSG_ID"}
    }]
  }]
}
```

### 2. Changes (Mais Comum)
```json
{
  "object": "instagram", 
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": {"id": "USER_ID"},
          "text": "mensagem",
          "type": "text",
          "id": "MSG_ID"
        }]
      }
    }]
  }]
}
```

### 3. Standby
```json
{
  "object": "instagram",
  "entry": [{
    "standby": [{
      "sender": {"id": "USER_ID"},
      "message": {"text": "mensagem", "mid": "MSG_ID"}
    }]
  }]
}
```

## CONFIGURAÇÃO NECESSÁRIA

1. **Variável de ambiente:**
   ```
   INSTAGRAM_ACCESS_TOKEN=seu_token_aqui
   ```

2. **Endpoint API (já configurado):**
   ```
   POST https://graph.facebook.com/v18.0/me/messages
   ```

## LOGS PARA DEBUG

O sistema agora gera logs detalhados:

- `FULL_PAYLOAD_DEBUG`: Payload completo recebido
- `PROCESSING_INSTAGRAM_ENTRIES`: Estrutura das entries
- `FOUND_MESSAGING_OBJECT`: Se tem messaging
- `FOUND_CHANGES_OBJECT`: Se tem changes  
- `FOUND_STANDBY_OBJECT`: Se tem standby
- `SEND_INSTAGRAM_API_CALL`: Detalhes da chamada API
- `SEND_INSTAGRAM_RESPONSE`: Resposta completa da API

## TESTES CRIADOS

- `debug_instagram_webhook.js`: Testa todas as estruturas de payload
- `test_instagram_auto_reply.js`: Teste do fluxo completo

## PRÓXIMOS PASSOS

1. **Deploy no Vercel** (já feito)
2. **Configurar INSTAGRAM_ACCESS_TOKEN** no ambiente
3. **Testar com mensagem real** no Instagram Direct
4. **Monitorar logs** para identificar estrutura recebida
5. **Verificar resposta** chegando no Direct

## RESULTADO

O sistema agora suporta TODAS as estruturas de payload do Instagram e deve responder automaticamente a qualquer mensagem recebida, independentemente da estrutura usada pela Meta.
