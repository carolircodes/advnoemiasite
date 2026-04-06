# 🔧 WhatsApp Webhook Verification - Guia Completo

## 🎯 Problema Resolvido

**ERRO**: "Não foi possível validar a URL de callback"

**SOLUÇÃO**: Implementado método GET correto com validação usando `WHATSAPP_VERIFY_TOKEN`

---

## 📋 Configuração Obrigatória

### 1. **Variáveis de Ambiente**
```bash
# No .env.local ou Vercel Environment Variables
WHATSAPP_VERIFY_TOKEN=noeminia_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminia_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=EAxxxxxxxxxx  # Token válido da Meta
WHATSAPP_PHONE_NUMBER_ID=123456789  # ID do número
```

### 2. **Meta Developers Setup**
```bash
1. Ir para: developers.facebook.com
2. App → WhatsApp Business
3. Webhooks → Configure
4. Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
5. Verify Token: noeminia_whatsapp_verify_2026
6. Adicionar subscription: messages
7. Salvar e verificar
```

---

## 🔍 Método GET Implementado

### **Endpoint**: `GET /api/whatsapp/webhook`

### **Query Params**:
- `hub.mode` - deve ser "subscribe"
- `hub.verify_token` - deve ser `WHATSAPP_VERIFY_TOKEN`
- `hub.challenge` - retornado como resposta

### **Lógica de Validação**:
```typescript
if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
  // ✅ Sucesso - retorna challenge
  return new Response(challenge, { status: 200 });
} else {
  // ❌ Falha - retorna 403
  return new Response("Forbidden", { status: 403 });
}
```

---

## 🧪 Como Testar

### 1. **Teste Manual com cURL**
```bash
# Teste de sucesso
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=test_challenge_123"

# Deve retornar: test_challenge_123
# Status: 200 OK

# Teste de falha
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_123"

# Deve retornar: Forbidden
# Status: 403 Forbidden
```

### 2. **Teste no Browser**
```
URL: https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=browser_test

Deve mostrar: browser_test
```

---

## 📊 Logs de Verificação

### **Logs de Sucesso**:
```
🔍 WEBHOOK_VERIFICATION_ATTEMPT: {
  mode: "subscribe",
  token: "VALID",
  tokenMatch: true,
  hasChallenge: true
}

✅ WEBHOOK_VERIFICATION_SUCCESS: {
  mode: "subscribe",
  token: "VALID",
  challenge: "test_challenge_123",
  verifyToken: "SET"
}
```

### **Logs de Falha**:
```
🔍 WEBHOOK_VERIFICATION_ATTEMPT: {
  mode: "subscribe",
  token: "INVALID",
  tokenMatch: false,
  hasChallenge: true
}

❌ WEBHOOK_VERIFICATION_FAILED: {
  mode: "subscribe",
  token: "wrong_token",
  tokenMatch: false,
  expectedToken: "noeminia_whatsapp_verify_2026",
  reason: "Invalid token"
}
```

---

## 🚨 Problemas Comuns e Soluções

### Problema 1: **"Não foi possível validar a URL de callback"**
```
CAUSA: WHATSAPP_VERIFY_TOKEN não configurado ou incorreto
SOLUÇÃO: 
1. Verificar se WHATSAPP_VERIFY_TOKEN está no .env
2. Verificar se é o mesmo no Meta Developers
3. Reiniciar deploy no Vercel
```

### Problema 2: **Status 500 Internal Server**
```
CAUSA: Erro no código ou variáveis de ambiente faltando
SOLUÇÃO:
1. Verificar logs no Vercel Functions
2. Verificar se todas as variáveis estão configuradas
3. Testar com cURL manualmente
```

### Problema 3: **Challenge não retornado**
```
CAUSA: Response format incorreto
SOLUÇÃO:
1. Retornar challenge como texto puro
2. Content-Type: text/plain
3. Status: 200
```

---

## 🔧 Debug Passo a Passo

### Passo 1: **Verificar Variáveis**
```bash
# No código, adicionar log temporário:
console.log('ENV CHECK:', {
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'MISSING',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ? 'SET' : 'MISSING'
});
```

### Passo 2: **Testar Manualmente**
```bash
# Teste completo
curl -v "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=manual_test_123"

# Verificar:
# - HTTP/1.1 200 OK
# - Content-Type: text/plain
# - Body: manual_test_123
```

### Passo 3: **Verificar Logs Vercel**
```bash
# Dashboard Vercel → Functions → api/whatsapp/webhook → Logs
# Procurar por: WEBHOOK_VERIFICATION_
```

---

## 📋 Checklist Final

### ✅ **Antes de Configurar no Meta**:
- [ ] WHATSAPP_VERIFY_TOKEN configurado no Vercel
- [ ] WHATSAPP_APP_SECRET configurado no Vercel
- [ ] Deploy atualizado no Vercel
- [ ] Teste manual com cURL funcionando
- [ ] Logs aparecendo no Vercel

### ✅ **Configuração Meta Developers**:
- [ ] Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
- [ ] Verify Token: noeminia_whatsapp_verify_2026
- [ ] Subscription: messages
- [ ] Webhook status: Verified (verde)

### ✅ **Pós-Configuração**:
- [ ] Testar mensagem real no WhatsApp
- [ ] Verificar logs de MESSAGE_PARSED
- [ ] Confirmar resposta automática enviada

---

## 🚀 Comando Rápido

### **Verificação Instantânea**:
```bash
# Copiar e colar no terminal:
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=quick_test"

# Se retornar "quick_test" → ✅ Webhook OK
# Se retornar "Forbidden" → ❌ Configurar WHATSAPP_VERIFY_TOKEN
```

---

## 🆘️ Resposta de Emergência

### **Se nada funcionar**:
1. **Verificar variáveis no Vercel**: Settings → Environment Variables
2. **Redeploy manual**: Vercel → Deployments → Redeploy
3. **Testar com cURL**: Verificar resposta manual
4. **Verificar logs**: Functions → api/whatsapp/webhook → Logs
5. **Reconfigurar Meta**: Webhooks → Edit → Save

### **Variáveis Obrigatórias Mínimas**:
```bash
WHATSAPP_VERIFY_TOKEN=noeminia_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminia_whatsapp_secret_2026
```

---

**Com este guia, o webhook WhatsApp será validado com SUCESSO!** ✅
