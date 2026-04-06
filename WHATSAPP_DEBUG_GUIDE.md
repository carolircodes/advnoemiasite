# 🔍 WhatsApp Debug - Guia Completo

## 🎯 Problema Identificado

Webhook recebe eventos do WhatsApp mas **NÃO** processa mensagens. Aparece apenas:
```
META WEBHOOK EVENT
```

Mas não aparecem:
- 📝 MESSAGE_PARSED
- 🎯 LEAD_CLASSIFIED  
- 📤 WHATSAPP_SEND_ATTEMPT

## 🔧 Correções Implementadas

### 1. **Parsing Corrigido**
- ✅ Detecção correta do payload `whatsapp_business_account`
- ✅ Extração correta do campo `message.from`
- ✅ Parse do texto em `message.text.body`
- ✅ Logs detalhados em cada etapa

### 2. **Logs Completos Adicionados**
```
🔥 WEBHOOK_RECEIVED - Webhook recebido
📝 WEBHOOK_BODY_PARSED - Body parseado
🎯 PLATFORM_DETECTED - Plataforma detectada
📝 MESSAGE_EXTRACTED - Mensagem extraída
📝 MESSAGE_PARSED - Mensagem parseada
🎯 LEAD_CLASSIFIED - Lead classificado
📤 WHATSAPP_SEND_ATTEMPT - Tentativa de envio
✅ WHATSAPP_SEND_SUCCESS - Envio sucesso
🏁 PROCESSING_COMPLETE - Processamento completo
```

### 3. **Fallback Robusto**
- ✅ Sempre responde, mesmo com erros
- ✅ ENABLE_OPENAI=false funciona
- ✅ Critical fallback se tudo falhar

---

## 🧪 Como Testar Agora

### 1. **Verificar Logs no Vercel**
```bash
# Dashboard Vercel → Functions → api/whatsapp/webhook → Logs
# Procurar por: 🔥📝🎯📤✅
```

### 2. **Fluxo Esperado (Funcionando)**
```
🔥 WEBHOOK_RECEIVED
📝 WEBHOOK_BODY_PARSED
🎯 PLATFORM_DETECTED
📝 MESSAGE_EXTRACTED
📝 MESSAGE_PARSED
🎯 LEAD_CLASSIFIED
🚫 OPENAI_SKIPPED (se ENABLE_OPENAI=false)
🛡️ FALLBACK_USED
📤 WHATSAPP_SEND_ATTEMPT
✅ WHATSAPP_SEND_SUCCESS
🏁 PROCESSING_COMPLETE
```

### 3. **Teste Manual com cURL**
```bash
curl -X POST https://advnoemia.com.br/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test_signature" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "phone_number_id": "test_phone_id",
            "display_phone_number": "+5511999999999"
          },
          "contacts": [{
            "wa_id": "test_user_wa",
            "name": {"formatted_name": "Test User"}
          }],
          "messages": [{
            "from": "test_user",
            "id": "test_msg_123",
            "timestamp": 1234567890,
            "text": {"body": "posso me aposentar?"},
            "type": "text"
          }]
        }
      }]
    }]
  }'
```

---

## 🚨 Possíveis Problemas e Soluções

### Problema 1: **Apenas META WEBHOOK EVENT**
```
SINTOMA: Só aparece "META WEBHOOK EVENT"
CAUSA: Webhook errado sendo chamado
SOLUÇÃO: 
  - Verificar URL no Meta Developers
  - Deve ser: https://advnoemia.com.br/api/whatsapp/webhook
```

### Problema 2: **PLATFORM_DETECTED mas não MESSAGE_EXTRACTED**
```
SINTOMA: 
🎯 PLATFORM_DETECTED ✅
Mas não aparece 📝 MESSAGE_EXTRACTED

CAUSA: Formato do payload mudou
SOLUÇÃO: Verificar logs "MESSAGE_SKIPPED" e "CHANGE_SKIPPED"
```

### Problema 3: **MESSAGE_PARSED mas não LEAD_CLASSIFIED**
```
SINTOMA:
📝 MESSAGE_PARSED ✅
Mas não aparece 🎯 LEAD_CLASSIFIED

CAUSA: Erro no processPlatformMessage()
SOLUÇÃO: Verificar logs de erro no message-processor.ts
```

### Problema 4: **LEAD_CLASSIFIED mas não WHATSAPP_SEND_ATTEMPT**
```
SINTOMA:
🎯 LEAD_CLASSIFIED ✅
Mas não aparece 📤 WHATSAPP_SEND_ATTEMPT

CAUSA: Erro no envio da resposta
SOLUÇÃO: Verificar WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID
```

---

## 🔧 Configuração Obrigatória

### Variáveis de Ambiente WhatsApp
```bash
# Webhook Verification
WHATSAPP_VERIFY_TOKEN=noeminha_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminha_whatsapp_secret_2026

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=EAxxxxxxxxxx  # Token válido
WHATSAPP_PHONE_NUMBER_ID=123456789  # ID do número

# Sistema Híbrido
ENABLE_OPENAI=false  # Testar com false primeiro
```

### Configuração Meta Developers
```bash
1. Ir para Meta Developers
2. App WhatsApp Business
3. Webhooks → Configure
4. Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
5. Verify token: noeminha_whatsapp_verify_2026
6. Subscribir a: messages
7. Salvar
```

---

## 📊 Logs para Monitorar

### Logs de Sucesso
```
🔥 WEBHOOK_RECEIVED: Webhook recebido
📝 WEBHOOK_BODY_PARSED: Body parseado com X eventos
🎯 PLATFORM_DETECTED: whatsapp detectado
📝 MESSAGE_EXTRACTED: Mensagem extraída com sucesso
📝 MESSAGE_PARSED: X mensagens parseadas
🎯 LEAD_CLASSIFIED: Lead classificado como previdenciario
🛡️ FALLBACK_USED: Fallback ativado (ENABLE_OPENAI=false)
📤 WHATSAPP_SEND_ATTEMPT: Enviando resposta
✅ WHATSAPP_SEND_SUCCESS: Mensagem enviada com sucesso
🏁 PROCESSING_COMPLETE: Processamento finalizado
```

### Logs de Erro Comuns
```
❌ INVALID_SIGNATURE: Assinatura inválida
📝 MESSAGE_SKIPPED: Mensagem não é texto
🚨 PARSE_ERROR: Erro no parsing
📤 WHATSAPP_SEND_ERROR: Falha no envio
```

---

## 🚀 Teste Passo a Passo

### Passo 1: **Verificar Webhook**
```bash
# Teste de verificação GET
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminha_whatsapp_verify_2026&hub.challenge=test_challenge"

# Deve retornar: test_challenge
```

### Passo 2: **Testar ENABLE_OPENAI=false**
```bash
# No .env.local
ENABLE_OPENAI=false

# Enviar mensagem real para o WhatsApp
# Deve ver: 🚫 OPENAI_SKIPPED + 🛡️ FALLBACK_USED
```

### Passo 3: **Verificar Envio**
```bash
# Se aparecer WHATSAPP_SEND_ERROR:
# Verificar:
# - WHATSAPP_ACCESS_TOKEN válido?
# - WHATSAPP_PHONE_NUMBER_ID correto?
# - Número verificado no WhatsApp?
```

---

## 🆘️ Resposta de Emergência

### Se NADA funcionar:
1. **Verificar variáveis de ambiente** no Vercel
2. **Reconfigurar webhook** no Meta Developers
3. **Testar com cURL** manualmente
4. **Verificar logs completos** no Vercel
5. **Reiniciar deploy** no Vercel

### Comando de Debug Rápido:
```bash
# Adicionar log temporário no início do webhook
console.log('WHATSAPP WEBHOOK DEBUG:', {
  timestamp: new Date().toISOString(),
  method: req.method,
  body: req.body,
  headers: req.headers
});
```

---

## 📈 KPIs para Monitorar

### Métricas de Saúde:
- **Taxa de parsing**: % de mensagens extraídas com sucesso
- **Taxa de processamento**: % de mensagens processadas
- **Taxa de envio**: % de respostas enviadas
- **Taxa de fallback**: % de respostas fallback vs IA

### Alertas:
- Se parsing falhar > 20% por 5min
- Se envio falhar > 10% por 5min
- Se webhook não responder > 50% por 1min

---

**Com este DEBUG COMPLETO, você identificará EXATAMENTE onde está o problema no WhatsApp!** 🔍
