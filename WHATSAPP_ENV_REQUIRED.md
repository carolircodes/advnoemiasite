# VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS - WHATSAPP WEBHOOK

## VERSÃO PORTAL (apps/portal-backend)

### ✅ OBRIGATÓRIAS PARA FUNCIONAMENTO BÁSICO

| Variável | Lida no Código | Obrigatória | Para que serve |
|----------|---------------|-------------|---------------|
| `WHATSAPP_VERIFY_TOKEN` | ✅ SIM | ✅ SIM | Verificação GET do webhook (hub.verify_token) |
| `WHATSAPP_APP_SECRET` | ✅ SIM | ✅ SIM | Validar assinatura HMAC-SHA256 do POST |
| `NEXT_PUBLIC_APP_URL` | ✅ SIM | ✅ SIM | URL base para chamadas internas da API |

### ⚠️ OBRIGATÓRIAS PARA RESPOSTA AUTOMÁTICA

| Variável | Lida no Código | Obrigatória | Para que serve |
|----------|---------------|-------------|---------------|
| `WHATSAPP_ACCESS_TOKEN` | ✅ SIM | ✅ SIM | Enviar respostas via Graph API |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ SIM | ✅ SIM | ID do telefone para enviar mensagens |

### ❌ NÃO UTILIZADAS (LEGADO)

| Variável | Lida no Código | Obrigatória | Para que serve |
|----------|---------------|-------------|---------------|
| `META_APP_SECRET` | ❌ NÃO | ❌ NÃO | Usada apenas no webhook Instagram |
| `META_VERIFY_TOKEN` | ❌ NÃO | ❌ NÃO | Usada apenas no webhook Instagram |

## VALORES ESPERADOS

```bash
WHATSAPP_VERIFY_TOKEN=noeminha_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminha_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=EAAD...  # Token da Meta Business
WHATSAPP_PHONE_NUMBER_ID=123456789012345
NEXT_PUBLIC_APP_URL=https://advnoemia.com.br
```

## DIAGNÓSTICO DE ERROS

### SIGNATURE_INVALID (403)
- **Causa:** `WHATSAPP_APP_SECRET` não configurada ou incorreta
- **Debug:** Verificar logs `SIGNATURE_VALIDATION_DEBUG`
- **Ação:** Configurar WHATSAPP_APP_SECRET no Vercel

### VERIFICATION_FAILED (403)
- **Causa:** `WHATSAPP_VERIFY_TOKEN` não configurado ou incorreto
- **Debug:** Verificar logs `VERIFICATION_FAILED`
- **Ação:** Configurar WHATSAPP_VERIFY_TOKEN no Vercel

### RESPOSTA NÃO ENVIADA
- **Causa:** `WHATSAPP_ACCESS_TOKEN` ou `WHATSAPP_PHONE_NUMBER_ID` faltando
- **Debug:** Verificar logs `SEND_RESPONSE_CREDS_ERROR`
- **Ação:** Configurar ambas as variáveis no Vercel

## WEBHOOK URLs

- **GET/POST Verification:** `https://advnoemia.com.br/api/whatsapp/webhook`
- **Meta Business Config:** Usar URL acima no webhook configuration
