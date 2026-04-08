# AJUSTE TEMPORÁRIO CONTROLADO - WEBHOOK INSTAGRAM

## **TRECHO EXATO ALTERADO**

### **Bypass Temporário (Linha 335-355):**
```typescript
// TEMPORARY DEBUG BYPASS FOR INSTAGRAM SIGNATURE VALIDATION
// PROVISÓRIO: Este bypass é temporário apenas para diagnóstico da integração
// NÃO USAR EM PRODUÇÃO - Remover após confirmar funcionamento do restante do fluxo
const isValid = verifySignature(rawBuffer, signature || "");

console.log("INSTAGRAM_SIGNATURE_VALIDATION_RESULT:", isValid ? "VALID" : "INVALID");

if (!isValid) {
  console.log("INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY");
  logEvent(
    "INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY",
    {
      signature: signature ? `${signature.substring(0, 20)}...` : null,
      note: "TEMPORARY BYPASS FOR DIAGNOSIS - DO NOT USE IN PRODUCTION"
    },
    "warn"
  );
  // NÃO retorna 403 - continua processamento para diagnóstico
} else {
  console.log("INSTAGRAM_SIGNATURE_VALID - CONTINUING FLOW");
}
```

---

## **CONFIRMAÇÃO: SOMENTE INSTAGRAM AFETADO**

### **Arquivo Alterado:**
- `apps/portal-backend/app/api/meta/webhook/route.ts` ✅

### **Arquivos NÃO Alterados:**
- Frontend: ✅ Intacto
- Portal: ✅ Intacto  
- Layout: ✅ Intacto
- Supabase: ✅ Intacto
- NoemIA: ✅ Intacto
- WhatsApp: ✅ Intacto
- Outras rotas: ✅ Intactas

---

## **LOGS OBRIGATÓRIOS ADICIONADOS**

### **Logs de Validação:**
- `INSTAGRAM_SIGNATURE_VALIDATION_RESULT`
- `INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY`

### **Logs de Evento:**
- `INSTAGRAM_EVENT_OBJECT` (JSON completo do evento)
- `INSTAGRAM_MESSAGE_TEXT_EXTRACTED`

### **Logs de Envio:**
- `ABOUT_TO_SEND_INSTAGRAM_MESSAGE`
- `GRAPH_API_RESPONSE_STATUS`
- `GRAPH_API_RESPONSE_BODY`

---

## **LOGS PARA PROCURAR NO VERCEL APÓS O TESTE**

### **Caso de Sucesso (Fluxo Completo):**
```
INSTAGRAM_WEBHOOK_POST_RECEIVED
INSTAGRAM_SIGNATURE_HEADER_RECEIVED: [PRESENT]
INSTAGRAM_SIGNATURE_VALIDATION_RESULT: INVALID
INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY
ENTRY_COUNT: 1
INSTAGRAM_STRUCTURE_MATCHED: messaging
INSTAGRAM_EVENT_OBJECT: {"sender":{"id":"USER_ID"},"message":{"text":"mensagem recebida"}}
INSTAGRAM_MESSAGE_TEXT_EXTRACTED: mensagem recebida
=== INSTAGRAM_MESSAGE_RECEIVED ===
=== INSTAGRAM_SEND_ATTEMPT ===
ABOUT_TO_SEND_INSTAGRAM_MESSAGE
GRAPH_API_RESPONSE_STATUS: 200
GRAPH_API_RESPONSE_BODY: {"recipient_id":"USER_ID","message_id":"MSG_ID"}
INSTAGRAM_SEND_SUCCESS: Message sent successfully
=== META WEBHOOK PROCESSED SUCCESSFULLY ===
```

### **Caso de Erro na Graph API:**
```
ABOUT_TO_SEND_INSTAGRAM_MESSAGE
GRAPH_API_RESPONSE_STATUS: 400
GRAPH_API_RESPONSE_BODY: {"error":{"message":"Invalid OAuth access token","type":"OAuthException","code":190}}
INSTAGRAM_SEND_MESSAGE_FAILED: API error
```

### **Caso de Erro no Parsing:**
```
INSTAGRAM_SIGNATURE_INVALID_BUT_BYPASSED_TEMPORARILY
ENTRY_COUNT: 0
META_WEBHOOK_ERROR: Unexpected token in JSON at position...
```

---

## **ESTRUTURA ESPERADA**

### **Fluxo Completo:**
1. **Recebimento:** POST no webhook
2. **Validação:** HMAC com bytes crus (bypass se inválido)
3. **Parsing:** JSON do payload
4. **Extração:** sender ID e message text
5. **Processamento:** Chamada à NoemIA
6. **Envio:** Resposta via Graph API
7. **Resposta:** HTTP 200 rápido

---

## **COMENTÁRIO CLARO ADICIONADO**

### **Aviso de Produção:**
```typescript
// TEMPORARY DEBUG BYPASS FOR INSTAGRAM SIGNATURE VALIDATION
// PROVISÓRIO: Este bypass é temporário apenas para diagnóstico da integração
// NÃO USAR EM PRODUÇÃO - Remover após confirmar funcionamento do restante do fluxo
```

---

## **STATUS FINAL**

### **Implementado:**
- ✅ Bypass temporário controlado
- ✅ Logs completos de diagnóstico
- ✅ Fluxo continua mesmo com assinatura inválida
- ✅ Comentário claro sobre natureza temporária
- ✅ Zero impacto em outras áreas do sistema

### **Próximo Passo:**
1. Deploy com bypass temporário
2. Testar mensagem no Instagram
3. Verificar logs completos no Vercel
4. Confirmar funcionamento do restante da integração

---

**CONCLUSÃO:** Webhook agora processa eventos mesmo com assinatura inválida para diagnóstico completo. Fluxo completo de ponta a ponta pode ser testado. 🚀
