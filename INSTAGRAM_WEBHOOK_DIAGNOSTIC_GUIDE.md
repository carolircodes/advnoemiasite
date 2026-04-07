# Guia de Diagnóstico - Instagram Webhook

## 🔍 Logs para Procurar no Vercel

### 1. **Webhook Recebido (Primeiro Sinal)**
```
🔥🔥🔥 NOVA VERSÃO DO WEBHOOK ATIVA 🔥🔥🔥
🚀 INSTAGRAM WEBHOOK HIT - POST REQUEST RECEIVED
```
**Se não aparecer:** O webhook não está sendo chamado pela Meta.

### 2. **Mensagem Detectada**
```
🎯🎯🎯 MENSAGEM DETECTADA (MESSAGING) 🎯🎯🎯
🎯🎯🎯 MENSAGEM DETECTADA (CHANGES) 🎯🎯🎯
```
**Se não aparecer:** O payload não contém mensagem válida.

### 3. **Início do Envio**
```
🔍🔍🔍 INICIANDO ENVIO DE MENSAGEM INSTAGRAM 🔍🔍🔍
📩 CHAMANDO sendInstagramMessage() para
```

### 4. **Verificação de Token**
```
🔍 VERIFICANDO INSTAGRAM_ACCESS_TOKEN:
   - Token existe: true/false
   - Token length: 0 ou número
   - Token prefix: EAA...
```

### 5. **Chamada à Graph API**
```
🚀 EXECUTANDO FETCH PARA GRAPH API...
🔍 RESPOSTA HTTP RECEBIDA:
   - Status: 200/400/403/500
   - OK: true/false
```

### 6. **Corpo da Resposta**
```
🔍 LENDO BODY DA RESPOSTA...
   - Response Text (raw): {"error": {...}}
```

## 🎯 **Trecho Exato que Envia a Mensagem**

```typescript
// Função principal de envio
async function sendInstagramMessage(senderId: string, messageText: string): Promise<boolean> {
  const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
  
  const payload = {
    recipient: { id: senderId },
    message: { text: messageText }
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  // Análise da resposta...
}
```

## 🔧 **Possíveis Causas de Erro**

### **HTTP 400 - Bad Request**
```
🔍 DIAGNÓSTICO 400 - Bad Request:
```

**Causas Comuns:**
- **Code 100:** Parâmetro inválido ou faltando
  - `senderId` inválido ou nulo
  - `messageText` vazio
  - Token mal formatado

- **Code 190:** Token de acesso inválido ou expirado
  - `INSTAGRAM_ACCESS_TOKEN` incorreto
  - Token expirou
  - Token revogado

- **Code 200:** Permissões insuficientes
  - App não tem `instagram_manage_messages`
  - App não tem `pages_messaging`

### **HTTP 403 - Forbidden**
```
🔍 DIAGNÓSTICO 403 - Forbidden:
   - Causa: App não tem permissão para esta operação
```

**Causas:**
- Webhook não está verificado na Meta
- App não está em modo de produção
- Domínio não autorizado

### **HTTP 500 - Server Error**
```
🔍 DIAGNÓSTICO 500 - Server Error:
   - Causa: Erro interno dos servidores Facebook
```

**Causas:**
- Instabilidade nos servidores Meta
- Manutenção da API

### **Token Ausente**
```
❌ INSTAGRAM_ACCESS_TOKEN não configurado
🔍 DIAGNÓSTICO: Variável de ambiente INSTAGRAM_ACCESS_TOKEN não encontrada
```

**Solução:**
Adicionar variável de ambiente no Vercel:
```
INSTAGRAM_ACCESS_TOKEN=EAA...
```

## 📊 **Fluxo Completo de Debug**

### **Passo 1:** Webhook Recebido?
- ✅ `🔥🔥🔥 NOVA VERSÃO DO WEBHOOK ATIVA 🔥🔥🔥`
- ❌ Problema na configuração do webhook na Meta

### **Passo 2:** Payload Válido?
- ✅ `OBJECT: instagram`
- ✅ `ENTRY COUNT: > 0`
- ❌ Meta enviando objeto errado

### **Passo 3:** Mensagem Detectada?
- ✅ `🎯🎯🎯 MENSAGEM DETECTADA`
- ❌ Payload sem mensagem ou sender.id

### **Passo 4:** Token Configurado?
- ✅ `Token existe: true`
- ✅ `Token length: > 0`
- ❌ Variável de ambiente ausente

### **Passo 5:** Graph API Chamada?
- ✅ `🚀 EXECUTANDO FETCH PARA GRAPH API`
- ❌ Erro antes da chamada

### **Passo 6:** Resposta Recebida?
- ✅ `🔍 RESPOSTA HTTP RECEBIDA`
- ✅ `Status: 200`
- ❌ Erro HTTP (400/403/500)

### **Passo 7:** Sucesso no Envio?
- ✅ `✅ SUCESSO NO ENVIO!`
- ✅ `Message ID: xxx`
- ❌ Erro na resposta da API

## 🛠️ **Ações Corretivas**

### **1. Verificar Variáveis de Ambiente**
```bash
# No Vercel Dashboard ou .env.local
INSTAGRAM_ACCESS_TOKEN=EAA...
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026
```

### **2. Verificar Permissões do App**
- `instagram_manage_messages` ✅
- `pages_messaging` ✅
- Webhook Fields: `messages` ✅

### **3. Verificar Configuração Webhook**
- URL: `https://advnoemia.com.br/api/meta/webhook`
- Verify Token: `noeminha_verify_2026`
- Status: `Active` (verde)

### **4. Testar Manualmente**
```bash
curl -X POST https://graph.facebook.com/v19.0/me/messages \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"id": "TEST_USER_ID"},
    "message": {"text": "Test message"}
  }' \
  "?access_token=INSTAGRAM_ACCESS_TOKEN"
```

## 📋 **Checklist de Produção**

- [ ] `🔥🔥🔥 NOVA VERSÃO DO WEBHOOK ATIVA 🔥🔥🔥` aparece nos logs
- [ ] `🎯🎯🎯 MENSAGEM DETECTADA` aparece
- [ ] `Token existe: true` nos logs
- [ ] `Status: 200` na resposta da Graph API
- [ ] `✅ SUCESSO NO ENVIO!` aparece
- [ ] Usuário recebe a mensagem no Instagram

## 🚨 **Sintomas Comuns**

### **Webhook processa 200 mas não envia:**
1. Token ausente/inválido
2. Permissões insuficientes
3. Sender ID inválido
4. Rate limiting

### **Webhook nem chega:**
1. URL errada na Meta
2. Webhook não verificado
3. Firewall bloqueando

### **Resposta 400 da Graph API:**
1. Token expirado
2. Payload mal formatado
3. Permissões faltando
