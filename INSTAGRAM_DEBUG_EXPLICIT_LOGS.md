# Depuração Instagram Webhook - Logs Explícitos

## **Trecho Exato que Extrai senderId**

### **Formato entry.messaging:**
```typescript
if (messaging.message?.text && messaging.sender?.id) {
  console.log("SENDER_ID_EXTRACTED (messaging):", messaging.sender.id);
  console.log("MESSAGE_TEXT_EXTRACTED (messaging):", messaging.message.text);
  
  const messageSent = await sendInstagramMessage(messaging.sender.id, fixedResponse);
}
```

### **Formato entry.changes:**
```typescript
if (message.text && message.from?.id) {
  console.log("SENDER_ID_EXTRACTED (changes):", message.from.id);
  console.log("MESSAGE_TEXT_EXTRACTED (changes):", message.text);
  
  const messageSent = await sendInstagramMessage(message.from.id, fixedResponse);
}
```

---

## **Trecho Exato que Chama o fetch**

```typescript
console.log("ABOUT_TO_SEND_INSTAGRAM_MESSAGE: true");
const startTime = Date.now();

const response = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

console.log("GRAPH_API_STATUS:", response.status);
const responseText = await response.text();
console.log("GRAPH_API_RESPONSE_TEXT:", responseText);
```

---

## **Logs para Procurar no Vercel**

### **1. Verificação de Token:**
```
TOKEN_EXISTS: true/false
```

### **2. Extração de Dados:**
```
SENDER_ID_EXTRACTED (messaging): USER_ID
SENDER_ID_EXTRACTED (changes): USER_ID
MESSAGE_TEXT_EXTRACTED (messaging): texto da mensagem
MESSAGE_TEXT_EXTRACTED (changes): texto da mensagem
```

### **3. Início do Envio:**
```
ABOUT_TO_SEND_INSTAGRAM_MESSAGE: true
```

### **4. Status da Graph API:**
```
GRAPH_API_STATUS: 200/400/403/500
```

### **5. Corpo Completo da Resposta:**
```
GRAPH_API_RESPONSE_TEXT: {"error": {...}} ou {"message_id": "..."}
```

---

## **Fluxo Completo de Debug**

### **Passo 1: Webhook Recebido?**
- Procurar: `TOKEN_EXISTS: true`
- Se `false`: Token não configurado

### **Passo 2: Mensagem Detectada?**
- Procurar: `SENDER_ID_EXTRACTED`
- Se não aparecer: Payload sem mensagem válida

### **Passo 3: Envio Iniciado?**
- Procurar: `ABOUT_TO_SEND_INSTAGRAM_MESSAGE: true`
- Se não aparecer: Erro antes do fetch

### **Passo 4: Resposta Recebida?**
- Procurar: `GRAPH_API_STATUS`
- Se não aparecer: Erro no fetch/exceção

### **Passo 5: Conteúdo da Resposta?**
- Procurar: `GRAPH_API_RESPONSE_TEXT`
- Verificar erro ou sucesso

---

## **Exemplos de Logs Esperados**

### **Sucesso Completo:**
```
TOKEN_EXISTS: true
SENDER_ID_EXTRACTED (changes): 1234567890
MESSAGE_TEXT_EXTRACTED (changes): posso me aposentar?
ABOUT_TO_SEND_INSTAGRAM_MESSAGE: true
GRAPH_API_STATUS: 200
GRAPH_API_RESPONSE_TEXT: {"message_id": "m_abc123", "recipient_id": "1234567890"}
```

### **Erro de Token:**
```
TOKEN_EXISTS: false
INSTAGRAM_ACCESS_TOKEN não configurado
```

### **Erro Graph API 400:**
```
TOKEN_EXISTS: true
SENDER_ID_EXTRACTED (changes): 1234567890
ABOUT_TO_SEND_INSTAGRAM_MESSAGE: true
GRAPH_API_STATUS: 400
GRAPH_API_RESPONSE_TEXT: {"error": {"code": 190, "message": "Invalid access token"}}
```

---

## **Possíveis Problemas e Soluções**

### **TOKEN_EXISTS: false**
- **Problema:** Variável `INSTAGRAM_ACCESS_TOKEN` não configurada
- **Solução:** Adicionar variável no Vercel

### **SENDER_ID_EXTRACTED não aparece**
- **Problema:** Payload não contém sender.id
- **Solução:** Verificar estrutura do webhook

### **GRAPH_API_STATUS: 400**
- **Problema:** Token inválido ou Business Account ID errado
- **Solução:** Verificar `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_BUSINESS_ACCOUNT_ID`

### **GRAPH_API_STATUS: 403**
- **Problema:** Permissões insuficientes
- **Solução:** Verificar permissões do App Meta

---

## **Checklist Rápido**

Ao testar, procurar nesta ordem:

1. `TOKEN_EXISTS: true` 
2. `SENDER_ID_EXTRACTED: USER_ID`
3. `MESSAGE_TEXT_EXTRACTED: texto`
4. `ABOUT_TO_SEND_INSTAGRAM_MESSAGE: true`
5. `GRAPH_API_STATUS: 200`
6. `GRAPH_API_RESPONSE_TEXT: {"message_id": "..."}`

**Se todos os logs aparecerem em ordem, o envio funciona!**
