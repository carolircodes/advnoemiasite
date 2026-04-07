# RASTREAMENTO EM TEMPO REAL - MENSAGENS DE TESTE

## INSTRUÇÕES

1. **ENVIAR MENSAGENS DE TESTE AGORA:**
   - WhatsApp: Enviar "teste" para o número conectado
   - Instagram: Enviar "teste" via DM para @advnoemia

2. **VERIFICAR LOGS:**
   - Endpoint: `/api/debug/logs`
   - URL: `https://advnoemia.com.br/api/debug/logs`

## O QUE ESPERAR VER

### WhatsApp - Se funcionar:
```json
{
  "event": "WHATSAPP_POST_RECEIVED",
  "headers": { "x-hub-signature-256": "sha256=..." },
  "body": "{\"object\":\"whatsapp_business_account\",\"entry\":[...]}",
  "timestamp": "2026-04-07T..."
}
```

### Instagram - Se funcionar:
```json
{
  "event": "META_POST_RECEIVED", 
  "headers": { "x-hub-signature-256": "sha256=..." },
  "body": "{\"object\":\"instagram\",\"entry\":[...]}",
  "timestamp": "2026-04-07T..."
}
```

## RESULTADOS ESPERADOS

### WHATSAPP
- **EVENT_RECEIVED:** ??? (sim/não)
- **SIGNATURE_OK:** ??? (sim/não) 
- **MESSAGE_PARSED:** ??? (sim/não)
- **RESPONSE_ATTEMPT:** ??? (sim/não)
- **RESPONSE_SUCCESS:** ??? (sim/não)

### INSTAGRAM
- **EVENT_RECEIVED:** ??? (sim/não)
- **MESSAGE_PARSED:** ??? (sim/não)
- **RESPONSE_ATTEMPT:** ??? (sim/não)
- **RESPONSE_SUCCESS:** ??? (sim/não)

## PRÓXIMO PASSO

Após enviar as mensagens, vou verificar os logs e informar:
- Exatamente onde o fluxo quebra
- Se o problema é na Meta (webhook não chega)
- Se o problema é na assinatura (chegou mas falhou validação)
- Se o problema é na API de resposta (processou mas não enviou)

**ENVIE AS MENSAGENS AGORA!**
