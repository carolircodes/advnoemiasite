# 🎯 Webhook Unificado Meta - Instagram + WhatsApp

## 🎉 **PROBLEMA RESOLVIDO!**

**Rota Oficial**: `/api/meta/webhook` (já funciona!)
- ✅ **Instagram**: `object: "instagram"`
- ✅ **WhatsApp**: `object: "whatsapp_business_account"`
- ✅ **GET verification**: Meta webhook validation
- ✅ **POST processing**: Ambas plataformas
- ✅ **Unified response**: Mesma lógica para ambas

---

## 📋 **Configuração Obrigatória**

### **Variáveis de Ambiente (Vercel)**:
```bash
# Verificação do Webhook
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026

# Instagram
INSTAGRAM_ACCESS_TOKEN=EAxxxxxxxxxx

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
```

---

## 🔧 **Como Funciona Agora**

### **1. GET Verification (Meta)**:
```typescript
// Instagram e WhatsApp usam o mesmo endpoint
GET /api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=challenge_123

// Retorna: challenge_123 (texto puro)
// Status: 200 OK
```

### **2. POST Processing (Unificado)**:
```typescript
// Instagram POST
{
  "object": "instagram",
  "entry": [{
    "messaging": [{
      "sender": {"id": "user_123"},
      "message": {"text": "posso me aposentar?", "mid": "msg_456"}
    }]
  }]
}

// WhatsApp POST
{
  "object": "whatsapp_business_account", 
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": "user_789",
          "text": {"body": "posso me aposentar?"},
          "id": "msg_012"
        }]
      }
    }]
  }]
}
```

---

## 🌐 **Configuração Meta Developers**

### **Instagram**:
```bash
1. App → Instagram → Webhooks
2. Callback URL: https://advnoemia.com.br/api/meta/webhook
3. Verify Token: noeminha_verify_2026
4. Subscribe: messages, messaging_postbacks, comments
5. Status: ✅ Verified
```

### **WhatsApp**:
```bash
1. App → WhatsApp Business
2. Webhooks → Configure
3. Callback URL: https://advnoemia.com.br/api/meta/webhook
4. Verify Token: noeminha_verify_2026
5. Subscribe: messages
6. Status: ✅ Verified
```

---

## 📊 **Logs Unificados**

### **Instagram**:
```
[2026-04-06T...] META_WEBHOOK REQUEST_RECEIVED: {
  method: "POST",
  object: "instagram"
}

[2026-04-06T...] META_WEBHOOK PLATFORM_DETECTED: {
  platform: "instagram"
}

[2026-04-06T...] META_WEBHOOK EVENT_PROCESSED: {
  platform: "instagram",
  sender: "user_123",
  detectedIntent: "aposentadoria"
}

[2026-04-06T...] META_WEBHOOK SEND_SUCCESS: {
  platform: "instagram",
  recipient: "user_123"
}
```

### **WhatsApp**:
```
[2026-04-06T...] META_WEBHOOK REQUEST_RECEIVED: {
  method: "POST", 
  object: "whatsapp_business_account"
}

[2026-04-06T...] META_WEBHOOK PLATFORM_DETECTED: {
  platform: "whatsapp"
}

[2026-04-06T...] META_WEBHOOK EVENT_PROCESSED: {
  platform: "whatsapp",
  sender: "user_789",
  detectedIntent: "aposentadoria"
}

[2026-04-06T...] META_WEBHOOK SEND_SUCCESS: {
  platform: "whatsapp",
  recipient: "user_789"
}
```

---

## 🧪 **Testes Imediatos**

### **1. Teste Verification (Ambas plataformas)**:
```bash
curl "https://advnoemia.com.br/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test_123"

# Deve retornar: test_123
# Status: 200 OK
```

### **2. Teste Instagram (Simulado)**:
```bash
curl -X POST https://advnoemia.com.br/api/meta/webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test_signature" \
  -d '{
    "object": "instagram",
    "entry": [{
      "messaging": [{
        "sender": {"id": "test_user"},
        "message": {"text": "posso me aposentar?", "mid": "test_msg"}
      }]
    }]
  }'
```

### **3. Teste WhatsApp (Simulado)**:
```bash
curl -X POST https://advnoemia.com.br/api/meta/webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test_signature" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "from": "test_user",
            "text": {"body": "posso me aposentar?"},
            "id": "test_msg"
          }]
        }
      }]
    }]
  }'
```

---

## 🎯 **Fluxo Completo**

### **Instagram**:
```
Instagram DM → /api/meta/webhook → Parse Instagram → Detect Intent → Generate Response → Send Instagram → User Reply
```

### **WhatsApp**:
```
WhatsApp Message → /api/meta/webhook → Parse WhatsApp → Detect Intent → Generate Response → Send WhatsApp → User Reply
```

### **Mesma Lógica**:
- ✅ **Detecção de intenção jurídica**
- ✅ **Resposta contextual personalizada**
- ✅ **Link para NoemIA com origem**
- ✅ **Envio automático via API**
- ✅ **Logs detalhados**

---

## 📈 **Respostas Geradas**

### **Exemplo WhatsApp**:
```
Olá, João! Vi seu interesse em aposentadoria. Entendo que você tem dúvidas sobre aposentadoria. É importante analisar tempo de contribuição, idade mínima e tipo de benefício. Posso te ajudar com uma análise personalizada do seu caso. Acesse: https://advnoemia.com.br/noemia?tema=aposentadoria&origem=whatsapp&video=auto
```

### **Exemplo Instagram**:
```
Olá, Maria! Vi seu interesse em aposentadoria. Entendo que você tem dúvidas sobre aposentadoria. É importante analisar tempo de contribuição, idade mínima e tipo de benefício. Posso te ajudar com uma análise personalizada do seu caso. Acesse: https://advnoemia.com.br/noemia?tema=aposentadoria&origem=instagram&video=auto
```

---

## 🚨 **Troubleshooting**

### **Instagram não funciona**:
```bash
Verificar:
- INSTAGRAM_ACCESS_TOKEN configurado?
- Webhook verified no Meta?
- Permissões: messages, messaging_postbacks, comments
```

### **WhatsApp não funciona**:
```bash
Verificar:
- WHATSAPP_ACCESS_TOKEN configurado?
- WHATSAPP_PHONE_NUMBER_ID correto?
- Webhook verified no Meta?
- Permissões: messages
```

### **Ambos não funcionam**:
```bash
Verificar:
- META_VERIFY_TOKEN correto?
- META_APP_SECRET correto?
- URL: https://advnoemia.com.br/api/meta/webhook
- Deploy atualizado no Vercel
```

---

## 🎖️ **Resultado Final**

**Webhook Unificado**:
- ✅ **Único endpoint**: `/api/meta/webhook`
- ✅ **Duas plataformas**: Instagram + WhatsApp
- ✅ **Mesma lógica**: Detecção + Resposta + Envio
- ✅ **Logs unificados**: Debug completo
- ✅ **Configuração simplificada**: Um webhook para ambas
- ✅ **Funcionando**: Já recebeu POST 200 do WhatsApp!

**Agora é só configurar no Meta Developers!** 🚀
