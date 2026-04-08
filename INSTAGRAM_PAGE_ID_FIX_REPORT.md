# AJUSTE CIRÚRGICO FINAL - TROCAR /me/messages POR /{PAGE_ID}/messages

## **CONTEXTO JÁ PROVADO**

### **Logs Mostram:**
- `SIGNATURE_MATCH_EXACT: true` 
- `INSTAGRAM_SIGNATURE_VALIDATION_RESULT: VALID`
- **Erro Atual:** `"Unsupported post request. Object with ID 'me' does not exist..."`

### **Diagnóstico:**
- Webhook está correto
- Assinatura está correta
- Token novo está sendo lido
- **Problema:** Endpoint `/me/messages` não funciona com token específico

---

## **ARQUIVO ALTERADO**

### **Arquivo:**
- `apps/portal-backend/app/api/meta/webhook/route.ts`

### **Linhas Alteradas:**
- **Linha 9:** Adicionada `const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;`
- **Linha 133-134:** Adicionados logs `FACEBOOK_PAGE_ID_PRESENT` e `FACEBOOK_PAGE_ID_VALUE_MASKED`
- **Linha 147-154:** Adicionada validação do `FACEBOOK_PAGE_ID`
- **Linha 156:** Alterada URL de `/me/messages` para `/${FACEBOOK_PAGE_ID}/messages`
- **Linha 157:** Adicionado log `INSTAGRAM_GRAPH_API_URL_FINAL`

---

## **TRECHO EXATO ALTERADO**

### **Antes:**
```typescript
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const PALAVRA_CHAVE_INSTAGRAM = "palavra";

// ...

const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
```

### **Depois:**
```typescript
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const PALAVRA_CHAVE_INSTAGRAM = "palavra";

// ...

console.log("FACEBOOK_PAGE_ID_PRESENT:", !!FACEBOOK_PAGE_ID);
console.log("FACEBOOK_PAGE_ID_VALUE_MASKED:", FACEBOOK_PAGE_ID ? `${FACEBOOK_PAGE_ID.substring(0, 6)}...` : 'MISSING');

if (!FACEBOOK_PAGE_ID) {
  console.log("INSTAGRAM_SEND_MESSAGE_FAILED: FACEBOOK_PAGE_ID missing");
  logEvent("INSTAGRAM_SEND_MESSAGE_FAILED", { 
    reason: "FACEBOOK_PAGE_ID_MISSING", 
    senderId 
  }, "error");
  return false;
}

const apiUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
console.log("INSTAGRAM_GRAPH_API_URL_FINAL:", apiUrl);
```

---

## **NOVA VARIÁVEL DE AMBIENTE NECESSÁRIA**

### **Variável Adicionada:**
```
FACEBOOK_PAGE_ID=ID_DA_PAGINA_FACEBOOK
```

### **Onde Configurar:**
- **Vercel:** Environment Variables
- **Valor:** ID numérico da página Facebook/Instagram

---

## **LOGS ADICIONADOS**

### **Logs de Verificação:**
- `FACEBOOK_PAGE_ID_PRESENT`
- `FACEBOOK_PAGE_ID_VALUE_MASKED`

### **Logs de URL:**
- `INSTAGRAM_GRAPH_API_URL_FINAL`

### **Logs de Erro:**
- `INSTAGRAM_SEND_MESSAGE_FAILED: FACEBOOK_PAGE_ID missing`

---

## **VALIDAÇÃO IMPLEMENTADA**

### **Se FACEBOOK_PAGE_ID não existir:**
1. Log claro: `FACEBOOK_PAGE_ID missing`
2. Evento: `INSTAGRAM_SEND_MESSAGE_FAILED` com motivo
3. Retorno: `false` (falha controlada)
4. **Build:** Não quebra

### **Se FACEBOOK_PAGE_ID existir:**
1. Log: `FACEBOOK_PAGE_ID_PRESENT: true`
2. Log: `FACEBOOK_PAGE_ID_VALUE_MASKED: 123456...`
3. Log: `INSTAGRAM_GRAPH_API_URL_FINAL: https://graph.facebook.com/v19.0/123456/messages?access_token=...`
4. Continua fluxo normal

---

## **IMPACTO ZERO EM OUTRAS ÁREAS**

### **NÃO Alterado:**
- **Frontend:** Intacto
- **Portal:** Intacto
- **Layout:** Intacto
- **Supabase:** Intacto
- **NoemIA:** Intacta
- **WhatsApp:** Intacto
- **Outras rotas:** Intactas
- **Validação webhook:** Intacta
- **Processamento payload:** Intacto

### **SOMENTE Alterado:**
- **Envio de mensagens Instagram:** Troca de endpoint

---

## **URL FINAL ESPERADA**

### **Formato:**
```
https://graph.facebook.com/v19.0/123456789/messages?access_token=EAAJZC...
```

### **Onde:**
- `123456789` = `FACEBOOK_PAGE_ID`
- `EAAJZC...` = `INSTAGRAM_ACCESS_TOKEN`

---

## **PRÓXIMO PASSO**

### **Configurar no Vercel:**
1. Adicionar `FACEBOOK_PAGE_ID` nas Environment Variables
2. Deploy com nova variável
3. Testar mensagem no Instagram

### **Logs Esperados:**
```
FACEBOOK_PAGE_ID_PRESENT: true
FACEBOOK_PAGE_ID_VALUE_MASKED: 123456...
INSTAGRAM_GRAPH_API_URL_FINAL: https://graph.facebook.com/v19.0/123456/messages?access_token=EAAJZC...
GRAPH_API_RESPONSE_STATUS: 200
GRAPH_API_RESPONSE_BODY: {"recipient_id":"USER_ID","message_id":"MSG_ID"}
```

---

## **RESUMO EXECUTIVO**

**Ação:** Trocado `/me/messages` por `/{PAGE_ID}/messages`  
**Variável:** `FACEBOOK_PAGE_ID` necessária no Vercel  
**Impacto:** Zero no sistema existente  
**Resultado:** Endpoint específico para página deve funcionar  

---

**CONCLUSÃO:** Ajuste cirúrgico implementado. Agora o endpoint usa Page ID explícito em vez de `/me`. Configurar `FACEBOOK_PAGE_ID` no Vercel para testar.
