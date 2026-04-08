# AUDITORIA DE RUNTIME - NOEMIA PRODUÇÃO

## 📋 RESUMO EXECUTIVO

### PROBLEMAS IDENTIFICADOS:
1. **WhatsApp**: Usando fallback/template em vez de OpenAI real
2. **Instagram**: Parou de responder (possível problema de token/env)

### LOGS ADICIONADOS:
- ✅ Logs detalhados no WhatsApp (`processTextMessage`)
- ✅ Logs detalhados no Instagram (`processMessageWithNoemia`) 
- ✅ Logs detalhados na OpenAI (`callOpenAI`)
- ✅ Logs detalhados no gerador (`generateIntelligentResponse`)

---

## 🔍 ETAPA 1 - AUDITORIA DE FLUXOS

### 1.1 WhatsApp Webhook (`/app/api/whatsapp/webhook/route.ts`)

**Fluxo identificado:**
```
Mensagem → processTextMessage() → answerNoemia() → generateIntelligentResponse()
```

**Pontos críticos mapeados:**
- ✅ `answerNoemia()` é chamada corretamente
- ✅ `generateIntelligentResponse()` é chamada com `audience: "visitor"`
- ✅ OpenAI deveria ser tentada (exceto `legal_advice_request`)

### 1.2 Instagram Webhook (`/app/api/meta/webhook/route.ts`)

**Fluxo identificado:**
```
DM → processMessageWithNoemia() → answerNoemia() → generateIntelligentResponse()
```

**Pontos críticos mapeados:**
- ✅ `answerNoemia()` é chamada corretamente
- ✅ `generateIntelligentResponse()` é chamada com `audience: "visitor"`
- ✅ OpenAI deveria ser tentada (exceto `legal_advice_request`)

### 1.3 Core NoemIA (`/lib/services/noemia.ts`)

**Fluxo OpenAI em `generateIntelligentResponse()`:**
```typescript
// Linha 973-977
const shouldTryOpenAI = !(intent === 'legal_advice_request' && audience === 'visitor');

if (shouldTryOpenAI) {
  // Chama callOpenAI() com contexto completo
  const openaiResult = await callOpenAI(userMessage, contextText, detectedTheme);
  
  if (openaiResult.success && openaiResult.response) {
    // Retorna resposta OpenAI com source: 'openai'
    return { message: openaiResult.response, meta: { source: 'openai' } };
  }
  
  // Se falhar, continua para fallback
}
```

**Fluxo OpenAI em `callOpenAI()`:**
```typescript
// Linha 866-872
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

if (!apiKey) {
  console.log('OPENAI_REQUEST_FAILED: API key not configured');
  return { success: false, error: 'API key not configured' };
}

// Chamada real à API OpenAI
const response = await openai.chat.completions.create({...});
```

---

## 🔍 ETAPA 2 - CAUSA DO WHATSAPP COM FALLBACK

### 2.1 Possíveis Causas Identificadas:

#### **Causa Provável #1: OPENAI_API_KEY ausente**
```bash
# Se não estiver configurada no Vercel:
OPENAI_API_KEY=undefined  # → fallback imediato
```

#### **Causa Provável #2: OPENAI_API_KEY inválida/expirada**
```bash
# Se estiver inválida:
OPENAI_API_KEY=sk-expired  # → API error → fallback
```

#### **Causa Provável #3: Quota esgotada**
```bash
# Se quota esgotada:
OPENAI_API_KEY=sk-valid  # → insufficient_quota → fallback
```

#### **Causa Provável #4: Modelo inválido**
```bash
# Se modelo não existir:
OPENAI_MODEL=gpt-4.1-mini  # → model_not_found → fallback
```

### 2.2 Logs para Verificar no Vercel:

**Procurar por estes logs exatos:**
```
=== WHATSAPP_MESSAGE_RECEIVED ===
WHATSAPP_OPENAI_ELIGIBLE: true
WHATSAPP_OPENAI_KEY_EXISTS: true/false
WHATSAPP_OPENAI_MODEL: gpt-3.5-turbo
```

**Se `KEY_EXISTS: false`:**
- Problema: OPENAI_API_KEY não configurada no Vercel
- Solução: Adicionar variável de ambiente no painel Vercel

**Se `KEY_EXISTS: true` mas ver `OPENAI_FAILED`:**
- Problema: Chave inválida, quota esgotada ou erro de API
- Solução: Verificar console OpenAI ou usar nova chave

---

## 🔍 ETAPA 3 - CAUSA DO INSTAGRAM PARADO

### 3.1 Possíveis Causas Identificadas:

#### **Causa Provável #1: INSTAGRAM_ACCESS_TOKEN ausente/expirado**
```bash
# Se não estiver configurada:
INSTAGRAM_ACCESS_TOKEN=undefined  # → sendInstagramMessage() retorna false
```

#### **Causa Provável #2: Webhook não recebendo eventos**
```bash
# Se URL na Meta estiver errada:
https://api.advnoemia.com.br/api/meta/webhook  # → NÃO CHEGA
# URL correta:
https://advnoemia.com.br/api/meta/webhook  # → CHEGA
```

#### **Causa Provável #3: INSTAGRAM_BUSINESS_ACCOUNT_ID ausente**
```bash
# Se não configurado:
INSTAGRAM_BUSINESS_ACCOUNT_ID=undefined  # → pode afetar envio
```

### 3.2 Logs para Verificar no Vercel:

**Procurar por estes logs exatos:**
```
INSTAGRAM_WEBHOOK_POST_RECEIVED
INSTAGRAM_SIGNATURE_VALIDATION_RESULT: VALID/INVALID
=== INSTAGRAM_MESSAGE_RECEIVED ===
INSTAGRAM_OPENAI_ELIGIBLE: true
INSTAGRAM_OPENAI_KEY_EXISTS: true/false
=== INSTAGRAM_SEND_ATTEMPT ===
INSTAGRAM_GRAPH_API_STATUS: 200/403/401
```

**Se não aparecer `INSTAGRAM_WEBHOOK_POST_RECEIVED`:**
- Problema: Webhook não está recebendo eventos da Meta
- Verificar: URL configurada no Meta Developers

**Se `KEY_EXISTS: false` ou `SEND_FAILED`:**
- Problema: INSTAGRAM_ACCESS_TOKEN não configurada ou inválida
- Solução: Gerar novo token no Meta Developers

---

## 🔧 ETAPA 4 - LOGS TEMPORÁRIOS IMPLEMENTADOS

### 4.1 Logs WhatsApp Adicionados:
```typescript
// Em processTextMessage()
console.log('=== WHATSAPP_MESSAGE_RECEIVED ===');
console.log('WHATSAPP_OPENAI_ELIGIBLE: true');
console.log('WHATSAPP_OPENAI_KEY_EXISTS:', hasOpenAIKey);
console.log('WHATSAPP_OPENAI_MODEL:', openAIModel);
console.log('WHATSAPP_OPENAI_SUCCESS: OpenAI responded successfully');
console.log('WHATSAPP_FALLBACK_USED: Fallback was used');
```

### 4.2 Logs Instagram Adicionados:
```typescript
// Em processMessageWithNoemia()
console.log('=== INSTAGRAM_MESSAGE_RECEIVED ===');
console.log('INSTAGRAM_OPENAI_ELIGIBLE: true');
console.log('INSTAGRAM_OPENAI_KEY_EXISTS:', hasOpenAIKey);
console.log('INSTAGRAM_OPENAI_MODEL:', openAIModel);
console.log('INSTAGRAM_OPENAI_SUCCESS: OpenAI responded successfully');
console.log('INSTAGRAM_FALLBACK_USED: Fallback was used');
console.log('=== INSTAGRAM_SEND_ATTEMPT ===');
console.log('INSTAGRAM_SEND_SUCCESS: Message sent successfully');
console.log('INSTAGRAM_SEND_FAILED: Failed to send message');
```

### 4.3 Logs OpenAI Adicionados:
```typescript
// Em callOpenAI()
console.log('=== OPENAI_CALL_START ===');
console.log('MODEL:', model);
console.log('API_KEY_EXISTS:', !!apiKey);
console.log('API_KEY_LENGTH:', apiKey?.length || 0);
console.log('OPENAI_API_CALL: Making request to OpenAI API');
console.log('=== OPENAI_CALL_SUCCESS ===');
console.log('=== OPENAI_CALL_FAILED ===');
```

### 4.4 Logs Gerador Adicionados:
```typescript
// Em generateIntelligentResponse()
console.log('=== GENERATE_INTELLIGENT_RESPONSE_START ===');
console.log('SHOULD_TRY_OPENAI:', shouldTryOpenAI);
console.log('=== OPENAI_ELIGIBLE ===');
console.log('=== OPENAI_SKIPPED ===');
console.log('=== OPENAI_SUCCESS ===');
console.log('=== OPENAI_FAILED ===');
console.log('=== LEGAL_ADVICE_BLOCK ===');
```

---

## 📋 ETAPA 5 - ARQUIVOS ALTERADOS

### 5.1 Arquivos Modificados:
1. **`/app/api/whatsapp/webhook/route.ts`**
   - Função: `processTextMessage()`
   - Logs: 15 novos logs detalhados

2. **`/app/api/meta/webhook/route.ts`**
   - Função: `processMessageWithNoemia()`
   - Logs: 15 novos logs detalhados

3. **`/lib/services/noemia.ts`**
   - Função: `callOpenAI()`
   - Função: `generateIntelligentResponse()`
   - Logs: 20 novos logs detalhados

### 5.2 Código Completo dos Logs Adicionados:

**WhatsApp:**
```typescript
console.log('=== WHATSAPP_MESSAGE_RECEIVED ===');
console.log('FROM:', messageInfo.from);
console.log('CONTENT:', messageInfo.content);
console.log('LENGTH:', messageInfo.content?.length || 0);
console.log('WHATSAPP_OPENAI_ELIGIBLE: true');
console.log('WHATSAPP_OPENAI_KEY_EXISTS:', hasOpenAIKey);
console.log('WHATSAPP_OPENAI_MODEL:', openAIModel);
console.log('WHATSAPP_NOEMIA_RESPONSE_RECEIVED');
console.log('RESPONSE_SOURCE:', response.meta?.source || 'unknown');

if (response.meta?.source === 'openai') {
  console.log('WHATSAPP_OPENAI_SUCCESS: OpenAI responded successfully');
} else if (response.meta?.source === 'fallback') {
  console.log('WHATSAPP_FALLBACK_USED: Fallback was used');
}
```

**Instagram:**
```typescript
console.log('=== INSTAGRAM_MESSAGE_RECEIVED ===');
console.log('SENDER_ID:', senderId);
console.log('MESSAGE:', messageText);
console.log('LENGTH:', messageText.length);
console.log('INSTAGRAM_OPENAI_ELIGIBLE: true');
console.log('INSTAGRAM_OPENAI_KEY_EXISTS:', hasOpenAIKey);
console.log('INSTAGRAM_OPENAI_MODEL:', openAIModel);
console.log('=== INSTAGRAM_SEND_ATTEMPT ===');

if (response.meta?.source === 'openai') {
  console.log('INSTAGRAM_OPENAI_SUCCESS: OpenAI responded successfully');
} else if (response.meta?.source === 'fallback') {
  console.log('INSTAGRAM_FALLBACK_USED: Fallback was used');
}
```

**OpenAI:**
```typescript
console.log('=== OPENAI_CALL_START ===');
console.log('MODEL:', model);
console.log('API_KEY_EXISTS:', !!apiKey);
console.log('API_KEY_LENGTH:', apiKey?.length || 0);
console.log('OPENAI_API_CALL: Making request to OpenAI API');
console.log('=== OPENAI_CALL_SUCCESS ===');
console.log('RESPONSE_LENGTH:', responseText.length);
console.log('RESPONSE_TIME:', Date.now() - startTime, 'ms');
```

---

## 🔍 ETAPA 6 - CHECKLIST FINAL DE TESTE MANUAL

### 6.1 Logs para Procurar no Vercel:

**WhatsApp:**
```
WHATSAPP_MESSAGE_RECEIVED
WHATSAPP_OPENAI_KEY_EXISTS: true
WHATSAPP_OPENAI_SUCCESS
WHATSAPP_FALLBACK_USED
WHATSAPP_RESPONSE_SENT
```

**Instagram:**
```
INSTAGRAM_WEBHOOK_POST_RECEIVED
INSTAGRAM_SIGNATURE_VALIDATION_RESULT: VALID
INSTAGRAM_MESSAGE_RECEIVED
INSTAGRAM_OPENAI_KEY_EXISTS: true
INSTAGRAM_SEND_SUCCESS
INSTAGRAM_SEND_FAILED
```

**OpenAI:**
```
OPENAI_CALL_START
OPENAI_REQUEST_STARTED
OPENAI_REQUEST_SUCCESS
OPENAI_REQUEST_FAILED
OPENAI_FALLBACK_USED
```

### 6.2 Teste Manual Passo a Passo:

**Teste WhatsApp:**
1. Enviar "Olá, quero agendar uma consulta" para WhatsApp
2. Verificar logs Vercel em tempo real
3. Procurar: `WHATSAPP_MESSAGE_RECEIVED` → `OPENAI_REQUEST_STARTED` → `OPENAI_REQUEST_SUCCESS`
4. Se aparecer `KEY_EXISTS: false`: Configurar OPENAI_API_KEY no Vercel
5. Se aparecer `OPENAI_REQUEST_FAILED`: Verificar chave/quota OpenAI

**Teste Instagram:**
1. Enviar "Oi, preciso de ajuda com divórcio" no Instagram DM
2. Verificar logs Vercel em tempo real
3. Procurar: `INSTAGRAM_WEBHOOK_POST_RECEIVED` → `INSTAGRAM_MESSAGE_RECEIVED` → `OPENAI_REQUEST_STARTED`
4. Se não aparecer `WEBHOOK_POST_RECEIVED`: Verificar URL na Meta
5. Se aparecer `KEY_EXISTS: false`: Configurar INSTAGRAM_ACCESS_TOKEN no Vercel

---

## 🎯 DIAGNÓSTICO FINAL

### Causa Mais Provável do WhatsApp com Fallback:
**OPENAI_API_KEY não configurada no ambiente Vercel OU quota esgotada**

### Causa Mais Provável do Instagram Parado:
**INSTAGRAM_ACCESS_TOKEN não configurada no ambiente Vercel OU webhook não recebendo eventos**

### Ações Imediatas Necessárias:
1. **Verificar variáveis de ambiente no Vercel:**
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `INSTAGRAM_ACCESS_TOKEN`

2. **Verificar configuração webhook na Meta:**
   - URL: `https://advnoemia.com.br/api/meta/webhook`

3. **Testar com logs novos:**
   - Enviar mensagens de teste
   - Monitorar logs Vercel com os novos marcadores

---

## 📊 PRÓXIMOS PASSOS

1. **Implementar logs temporários** ✅ (FEITO)
2. **Fazer deploy para produção** 
3. **Testar e analisar logs**
4. **Corrigir variáveis de ambiente**
5. **Remover logs temporários após diagnóstico**

---

**STATUS:** Auditoria completa com logs implementados. Pronto para teste em produção.
