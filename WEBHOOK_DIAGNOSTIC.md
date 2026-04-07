# DIAGNÓSTICO DE WEBHOOKS - WHATSAPP & INSTAGRAM

## ENDPOINTS DISPONÍVEIS

### WhatsApp Webhook
- **URL:** `/api/whatsapp/webhook`
- **GET:** Verificação do webhook
- **POST:** Recebe mensagens do WhatsApp

### Instagram/Meta Webhook  
- **URL:** `/api/meta/webhook`
- **GET:** Verificação do webhook
- **POST:** Recebe mensagens do Instagram

## LOGS IMPLEMENTADOS

### WhatsApp - Eventos
- `EVENT_RECEIVED` - POST recebido
- `SIGNATURE_OK` / `SIGNATURE_INVALID` - Validação HMAC
- `MESSAGE_PARSED` - Mensagem extraída com sucesso
- `RESPONSE_ATTEMPT` - Tentativa de envio de resposta
- `RESPONSE_SUCCESS` / `RESPONSE_ERROR` - Resultado do envio

### Instagram - Eventos
- `META_EVENT_RECEIVED` - POST recebido
- `META_SIGNATURE_OK` / `META_SIGNATURE_INVALID` - Validação HMAC
- `INSTAGRAM_MESSAGE_PARSED` - Mensagem extraída
- `INSTAGRAM_RESPONSE_NOT_IMPLEMENTED` - Resposta não implementada

## VARIÁVEIS DE AMBIENTE

### WhatsApp (Obrigatórias)
```bash
WHATSAPP_VERIFY_TOKEN=noeminha_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminha_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=EAAD...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

### Instagram (Obrigatórias)
```bash
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026
```

## FLUXO ESPERADO

### WhatsApp
1. Meta envia POST para `/api/whatsapp/webhook`
2. Sistema valida assinatura HMAC com `WHATSAPP_APP_SECRET`
3. Extrai informações da mensagem (from, content, type)
4. Envia resposta automática: "Olá! Recebi sua mensagem e já vou te ajudar."
5. Loga sucesso/erro do envio

### Instagram
1. Meta envia POST para `/api/meta/webhook`
2. Sistema valida assinatura HMAC com `META_APP_SECRET`
3. Extrai informações da mensagem (from, content)
4. **TODO:** Implementar resposta automática
5. Loga que resposta não está implementada

## COMO TESTAR

### 1. Verificar Logs em Tempo Real
```bash
# Vercel logs
vercel logs --follow

# Ou no dashboard Vercel > Functions > Logs
```

### 2. Enviar Mensagem de Teste
- **WhatsApp:** Enviar "teste" para o número conectado
- **Instagram:** Enviar DM para @advnoemia

### 3. Procurar nos Logs
```bash
# WhatsApp
grep "=== WHATSAPP WEBHOOK POST RECEIVED ==="

# Instagram  
grep "=== META WEBHOOK POST RECEIVED ==="
```

## PROBLEMAS COMUNS

### SIGNATURE_INVALID
- **Causa:** Variável de ambiente secret não configurada
- **WhatsApp:** Verificar `WHATSAPP_APP_SECRET`
- **Instagram:** Verificar `META_APP_SECRET`

### RESPONSE_ERROR
- **Causa:** Credenciais da API não configuradas
- **Verificar:** `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`

### Nenhuma mensagem recebida
- **Causa:** Webhook não configurado no Meta Business
- **Ação:** Configurar URL correta no Meta Business Manager

## STATUS ATUAL

- [x] Build do portal funcionando
- [x] Logs de diagnóstico implementados
- [x] WhatsApp webhook com resposta automática
- [x] Instagram webhook com diagnóstico
- [ ] Instagram resposta automática (TODO)
- [ ] Teste real em produção
