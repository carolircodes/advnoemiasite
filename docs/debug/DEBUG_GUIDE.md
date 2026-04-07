# 🔍 DEBUG COMPLETO - Sistema Híbrido NoemIA

## 📋 Objetivo

Identificar EXATAMENTE onde o fluxo está quebrando no WhatsApp e Instagram com logs detalhados em TODAS as etapas.

---

## 🎯 Logs Implementados

### 1. **Logs Gerais do Webhook**
```
🔥 WEBHOOK_RECEIVED: Webhook recebido
📝 MESSAGE_PARSED: Mensagem parseada
🎯 LEAD_CLASSIFIED: Lead classificado
🏁 PROCESSING_COMPLETE: Processamento completo
```

### 2. **Logs OpenAI**
```
✅ OPENAI_ENABLED: OpenAI configurada e pronta
🚫 OPENAI_SKIPPED: OpenAI desabilitada ou sem API key
🤖 OPENAI_CALLED: Chamando API OpenAI
🚨 OPENAI_ERROR: Erro na API OpenAI
✅ OPENAI_SUCCESS: Resposta OpenAI gerada
```

### 3. **Logs Fallback**
```
🛡️ FALLBACK_USED: Fallback inteligente ativado
🚨 CRITICAL_FALLBACK: Fallback crítico (quando tudo falha)
```

### 4. **Logs Instagram**
```
📤 INSTAGRAM_SEND_ATTEMPT: Tentando enviar mensagem
✅ INSTAGRAM_SEND_SUCCESS: Mensagem enviada com sucesso
❌ INSTAGRAM_SEND_ERROR: Falha no envio
```

### 5. **Logs WhatsApp**
```
📤 WHATSAPP_SEND_ATTEMPT: Tentando enviar mensagem
✅ WHATSAPP_SEND_SUCCESS: Mensagem enviada com sucesso
❌ WHATSAPP_SEND_ERROR: Falha no envio
```

---

## 🔧 Como Usar os Logs

### 1. **Verificar Logs no Vercel**
```bash
# Acessar logs no dashboard Vercel
1. Vá para seu projeto no Vercel
2. Clique na aba "Functions"
3. Filtre por: api/meta/webhook ou api/whatsapp/webhook
4. Procure pelos emojis 🔥📝🎯📤❌
```

### 2. **Verificar Logs Localmente**
```bash
# Durante desenvolvimento
npm run dev

# Logs aparecerão no terminal com emojis
🔥 WEBHOOK_RECEIVED: {...}
📝 MESSAGE_PARSED: {...}
🎯 LEAD_CLASSIFIED: {...}
```

---

## 🚨 Fluxo Esperado de Logs

### Mensagem Instagram Recebida (Funcionando)
```
🔥 WEBHOOK_RECEIVED
📝 MESSAGE_PARSED  
🎯 LEAD_CLASSIFIED
🤖 OPENAI_CALLED (ou 🚫 OPENAI_SKIPPED)
✅ OPENAI_SUCCESS (ou 🛡️ FALLBACK_USED)
📤 INSTAGRAM_SEND_ATTEMPT
✅ INSTAGRAM_SEND_SUCCESS
🏁 PROCESSING_COMPLETE
```

### Mensagem WhatsApp Recebida (Funcionando)
```
🔥 WEBHOOK_RECEIVED
📝 MESSAGE_PARSED
🎯 LEAD_CLASSIFIED  
🤖 OPENAI_CALLED (ou 🚫 OPENAI_SKIPPED)
✅ OPENAI_SUCCESS (ou 🛡️ FALLBACK_USED)
📤 WHATSAPP_SEND_ATTEMPT
✅ WHATSAPP_SEND_SUCCESS
🏁 PROCESSING_COMPLETE
```

---

## 🐛 Problemas Comuns e Como Identificar

### 1. **Webhook Não é Chamado**
```
SINTOMA: Nenhum log 🔥 aparece
DIAGNÓSTICO: 
  - URL do webhook está incorreta?
  - Meta não está configurada para enviar eventos?
  - Firewall bloqueando requisições?
```

### 2. **Webhook Recebido mas Sem Eventos**
```
🔥 WEBHOOK_RECEIVED: ✅
NO_EVENTS: ❌

DIAGNÓSTICO:
  - Formato do payload mudou?
  - Parse está falhando?
  - Meta enviando objeto vazio?
```

### 3. **OpenAI Falhando**
```
🔥 WEBHOOK_RECEIVED: ✅
📝 MESSAGE_PARSED: ✅
🎯 LEAD_CLASSIFIED: ✅
🤖 OPENAI_CALLED: ✅
🚨 OPENAI_ERROR: ❌
🛡️ FALLBACK_USED: ✅
📤 INSTAGRAM_SEND_ATTEMPT: ✅
✅ INSTAGRAM_SEND_SUCCESS: ✅

DIAGNÓSTICO:
  - OPENAI_API_KEY inválida?
  - Sem créditos na OpenAI?
  - Modelo incorreto?
  - Rate limit?
```

### 4. **Falha no Envio Instagram**
```
🔥 WEBHOOK_RECEIVED: ✅
📝 MESSAGE_PARSED: ✅
🎯 LEAD_CLASSIFIED: ✅
🛡️ FALLBACK_USED: ✅
📤 INSTAGRAM_SEND_ATTEMPT: ✅
❌ INSTAGRAM_SEND_ERROR: ❌

DIAGNÓSTICO:
  - INSTAGRAM_ACCESS_TOKEN inválido?
  - Token expirou?
  - Permissões insuficientes?
  - API do Instagram com problemas?
```

### 5. **Falha no Envio WhatsApp**
```
🔥 WEBHOOK_RECEIVED: ✅
📝 MESSAGE_PARSED: ✅
🎯 LEAD_CLASSIFIED: ✅
🛡️ FALLBACK_USED: ✅
📤 WHATSAPP_SEND_ATTEMPT: ✅
❌ WHATSAPP_SEND_ERROR: ❌

DIAGNÓSTICO:
  - WHATSAPP_ACCESS_TOKEN inválido?
  - WHATSAPP_PHONE_NUMBER_ID incorreto?
  - Número não verificado no WhatsApp?
  - API do WhatsApp com problemas?
```

---

## 🔧 Teste Passo a Passo

### 1. **Testar Webhook Instagram**
```bash
# Teste manual
curl -X POST https://advnoemia.com.br/api/meta/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "123",
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "test_user"},
        "recipient": {"id": "test_page"},
        "timestamp": 1234567890,
        "message": {
          "mid": "test_msg",
          "text": "posso me aposentar?"
        }
      }]
    }]
  }'

# Deve ver logs 🔥📝🎯📤❌
```

### 2. **Testar Webhook WhatsApp**
```bash
# Teste manual
curl -X POST https://advnoemia.com.br/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "phone_number_id": "test_phone_id",
            "display_phone_number": "+5511999999999"
          },
          "contacts": [{
            "wa_id": "test_user",
            "name": {"formatted_name": "Test User"}
          }],
          "messages": [{
            "from": "test_user",
            "id": "test_msg",
            "timestamp": 1234567890,
            "text": {"body": "posso me aposentar?"},
            "type": "text"
          }]
        }
      }]
    }]
  }'

# Deve ver logs 🔥📝🎯📤❌
```

---

## 📊 Checklist de Configuração

### Instagram
```bash
✅ META_VERIFY_TOKEN configurado
✅ META_APP_SECRET configurado
✅ INSTAGRAM_ACCESS_TOKEN válido e não expirado
✅ Webhook URL configurado no Meta Developers
✅ Permissões: messages, messaging_postbacks, comments
✅ Webhook está "Verified" no Meta
```

### WhatsApp
```bash
✅ WHATSAPP_VERIFY_TOKEN configurado
✅ WHATSAPP_APP_SECRET configurado
✅ WHATSAPP_ACCESS_TOKEN válido e não expirado
✅ WHATSAPP_PHONE_NUMBER_ID correto
✅ Número verificado no WhatsApp Business
✅ Webhook URL configurado no Meta Developers
✅ Permissões: messages
```

### OpenAI
```bash
✅ ENABLE_OPENAI=true ou false
✅ OPENAI_API_KEY válida (se ENABLE_OPENAI=true)
✅ OPENAI_MODEL configurado (ex: gpt-4o-mini)
✅ Créditos disponíveis na OpenAI
```

---

## 🚀 Ações Imediatas

### 1. **Verificar Logs Reais**
```bash
# No Vercel CLI
vercel logs --follow

# Ou no dashboard Vercel
# Functions -> api/meta/webhook -> Logs
```

### 2. **Testar com ENABLE_OPENAI=false**
```bash
# No .env.local
ENABLE_OPENAI=false

# Deve ver:
🚫 OPENAI_SKIPPED
🛡️ FALLBACK_USED
✅ WHATSAPP_SEND_SUCCESS
```

### 3. **Verificar Variáveis de Ambiente**
```bash
# No código, adicionar log temporário:
console.log('ENV CHECK:', {
  ENABLE_OPENAI: process.env.ENABLE_OPENAI,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
  INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN ? 'SET' : 'MISSING',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'MISSING'
});
```

---

## 🆘️ Respostas de Emergência

### Se NADA funcionar:
1. **Verificar se webhooks estão ativos** no Meta Developers
2. **Testar URLs manualmente** com curl
3. **Verificar variáveis de ambiente** no Vercel
4. **Verificar se há erros de build** no deploy
5. **Reiniciar o deploy** no Vercel

### Se OpenAI falhar:
1. **Setar ENABLE_OPENAI=false**
2. **Verificar se fallback funciona**
3. **Adicionar créditos** na conta OpenAI

### Se envio falhar:
1. **Verificar tokens de acesso**
2. **Verificar permissões no Meta**
3. **Testar tokens manualmente** com curl
4. **Verificar se números estão verificados**

---

## 📈 Métricas para Monitorar

### KPIs de Saúde:
- **Taxa de sucesso do webhook**: % de requisições com 200
- **Taxa de processamento**: % de mensagens processadas
- **Taxa de envio**: % de respostas enviadas
- **Taxa de OpenAI**: % de respostas da IA vs fallback
- **Tempo de resposta**: ms desde webhook até envio

### Alertas:
- Se webhook falhar > 50% por 5min
- Se envio falhar > 20% por 5min  
- Se OpenAI error > 80% por 1h

---

**Com este DEBUG COMPLETO, você identificará EXATAMENTE onde está o problema!** 🔍
