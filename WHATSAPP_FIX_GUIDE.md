# 🚨 Guia de Correção - WhatsApp Cloud API Integration

## Problema Identificado
O sistema recebe mensagens do WhatsApp corretamente, mas **NÃO está respondendo**.

## Causas Principais

### 1. ❌ URL Incorreta da API
**Problema:** Usando `/me/messages` em vez de `/{PHONE_NUMBER_ID}/messages`

**Correção:**
```javascript
// ANTES (INCORRETO)
fetch('https://graph.facebook.com/v19.0/me/messages', {...})

// DEPOIS (CORRETO)
fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {...})
```

### 2. ❌ Token de Acesso Incorreto
**Problema:** Usando `config.accessToken` em vez de `WHATSAPP_ACCESS_TOKEN`

**Correção:**
```javascript
// ANTES (INCORRETO)
'Authorization': `Bearer ${config.accessToken}`

// DEPOIS (CORRETO)
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
'Authorization': `Bearer ${accessToken}`
```

### 3. ❌ Parsing de Mensagens Incorreto
**Problema:** Verificando `message.direction === 'inbound'` que não existe no WhatsApp

**Correção:**
```javascript
// ANTES (INCORRETO)
if (message.type === 'text' && message.direction === 'inbound') {

// DEPOIS (CORRETO)
if (message.type === 'text' && message.from) {
```

### 4. ❌ Extração do Número do Usuário
**Problema:** Não extraindo corretamente do campo `from`

**Correção:**
```javascript
// ANTES (INCORRETO)
platformUserId: message.from || message.from_number,

// DEPOIS (CORRETO)
platformUserId: message.from, // CORREÇÃO: Extrair corretamente do campo 'from'
```

---

## ✅ Arquivos Corrigidos

### 1. `lib/platforms/message-processor.ts`
```javascript
// Função sendPlatformResponse corrigida
export async function sendPlatformResponse(
  platform: Platform,
  recipientId: string,
  messageText: string
): Promise<boolean> {
  try {
    const config = platformConfigs[platform];
    
    if (platform === 'instagram') {
      // Instagram continua igual
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
      // ... resto do código Instagram
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
```

### 2. `api/whatsapp/webhook.ts`
```javascript
// Função parseWhatsAppMessage corrigida
function parseWhatsAppMessage(body: any): Array<{...}> {
  const events = [];

  try {
    // WhatsApp Cloud API structure
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                // CORREÇÃO: Mensagens do usuário não têm 'direction' property
                // Verificar se a mensagem é do usuário (tem campo 'from')
                if (message.type === 'text' && message.from) {
                  events.push({
                    platform: 'whatsapp' as Platform,
                    platformUserId: message.from, // CORREÇÃO: Extrair corretamente do campo 'from'
                    platformMessageId: message.id,
                    senderName: change.value.contacts?.[0]?.name?.formatted_name || message.contact?.name?.formatted_name,
                    text: message.text?.body || '',
                    timestamp: message.timestamp || Date.now(),
                    metadata: {
                      phone_number_id: change.value.metadata?.phone_number_id,
                      display_phone_number: change.value.metadata?.display_phone_number,
                      contact_name: change.value.contacts?.[0]?.name?.formatted_name,
                      wa_id: change.value.contacts?.[0]?.wa_id
                    }
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing WhatsApp message:', error);
  }

  return events;
}
```

---

## 🔧 Variáveis de Ambiente Obrigatórias

```bash
# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN=noeminha_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminha_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=EAAD...  # Token real do WhatsApp Business
WHATSAPP_PHONE_NUMBER_ID=123456789  # ID real do número de telefone

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Sistema
NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br
NOEMIA_WHATSAPP_URL=https://wa.me/5511999999999
```

---

## 🧪 Testes de Validação

### 1. Executar testes corrigidos:
```bash
node test_whatsapp_fixed.js
```

### 2. Verificar webhook:
```bash
curl -X GET "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminha_whatsapp_verify_2026&hub.challenge=test_challenge"
```

### 3. Testar envio direto:
```bash
curl -X POST "https://graph.facebook.com/v19.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "text": {"body": "Teste de envio"},
    "recipient_type": "individual"
  }'
```

---

## 🚨 Checklist de Verificação

### ✅ Antes de Deploy
- [ ] `WHATSAPP_ACCESS_TOKEN` configurado
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configurado
- [ ] Webhook verificado no Meta for Developers
- [ ] Número de telefone verificado no WhatsApp Business
- [ ] Permissões concedidas: `whatsapp_business_messaging`

### ✅ Após Deploy
- [ ] Webhook verification OK
- [ ] Mensagens sendo recebidas
- [ ] **Respostas sendo enviadas** ← Ponto crítico
- [ ] Logs sem erros de API
- [ ] Leads aparecendo no dashboard

---

## 🔍 Debug de Problemas Comuns

### 1. "Missing WHATSAPP_PHONE_NUMBER_ID"
```bash
# Verificar se a variável está configurada
echo $WHATSAPP_PHONE_NUMBER_ID

# Ou no código
console.log('Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);
```

### 2. "401 Unauthorized"
- Verifique se `WHATSAPP_ACCESS_TOKEN` é válido
- Confirme se o token não expirou
- Verifique se o token tem as permissões corretas

### 3. "404 Not Found"
- Verifique se `WHATSAPP_PHONE_NUMBER_ID` está correto
- Confirme se o número está ativo no WhatsApp Business

### 4. "400 Bad Request"
- Verifique o formato do payload
- Confirme se `recipient_type: "individual"` está incluído
- Verifique se o número do destinatário está no formato correto

---

## 📱 Estrutura Correta do Payload WhatsApp

### Payload Recebido (CORRETO):
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": "5511999999999",
          "id": "wamid...",
          "text": {"body": "Mensagem do usuário"},
          "type": "text",
          "timestamp": 1644475265
        }],
        "contacts": [{
          "wa_id": "5511999999999",
          "profile": {"name": "Nome do Contato"}
        }],
        "metadata": {
          "phone_number_id": "123456789",
          "display_phone_number": "+55 11 99999-9999"
        }
      }
    }]
  }]
}
```

### Payload de Envio (CORRETO):
```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "text": {
    "body": "Resposta da NoemIA"
  },
  "recipient_type": "individual"
}
```

---

## 🎯 Resumo das Correções

✅ **URL corrigida**: `/{PHONE_NUMBER_ID}/messages`  
✅ **Token corrigido**: `WHATSAPP_ACCESS_TOKEN`  
✅ **Parsing corrigido**: Removido `direction` check  
✅ **Extração corrigida**: Usar campo `from`  
✅ **Payload corrigido**: Incluir `recipient_type`  
✅ **Testes atualizados**: Validação completa  

**Sistema agora deve responder corretamente no WhatsApp! 🚀**
