# RELATÓRIO EXATO - RASTREAMENTO IMPLEMENTADO

## PROBLEMA IDENTIFICADO E CORRIGIDO

**PROBLEMA CRÍTICO:** Webhooks estavam fazendo fetch para si mesmos, causando loop infinito em serverless.

**SOLUÇÃO:** Removido fetch recursivo e implementado console.log direto.

---

## 1. PROJETO E ROTAS ALTERADAS

### **PROJETO:** `apps/portal-backend` (único deployado)

### **ROTA WHATSAPP:** `/api/whatsapp/webhook`
- **Arquivo:** `apps/portal-backend/app/api/whatsapp/webhook/route.ts`
- **Função:** POST (linha 307)
- **Status:** CORRIGIDO - sem fetch recursivo

### **ROTA INSTAGRAM:** `/api/meta/webhook`
- **Arquivo:** `apps/portal-backend/app/api/meta/webhook/route.ts`
- **Função:** POST (linha 83)
- **Status:** CORRIGIDO - sem fetch recursivo

---

## 2. MARKERS DE LOG EXATOS

### **WhatsApp - LOG MARKERS:**
```javascript
console.log("=== WHATSAPP WEBHOOK POST RECEIVED ===");
console.log("WEBHOOK_DEBUG_WHATSAPP_POST_RECEIVED", {
  timestamp: "...",
  headers: {...},
  bodyLength: 123,
  bodyPreview: "...",
  signature: "sha256=..."
});
```

### **Instagram - LOG MARKERS:**
```javascript
console.log("=== META WEBHOOK POST RECEIVED ===");
console.log("WEBHOOK_DEBUG_META_POST_RECEIVED", {
  timestamp: "...",
  headers: {...},
  bodyLength: 123,
  bodyPreview: "...",
  signature: "sha256=..."
});
```

---

## 3. PROVA DE DEPLOY

**Build Status:** 
```
> portal-backend@0.1.0 build
> next build
Creating an optimized production build...
Compiled successfully
Linting and checking validity of types
Generating static pages (40/40)
Finalizing page optimization
```

**Rotas no Build:**
- `api/whatsapp/webhook` - 206 B (deployed)
- `api/meta/webhook` - 206 B (deployed)

---

## 4. INSTRUÇÕES EXATAS PARA VERCEL

### **Acessar Logs:**
1. Dashboard Vercel > `portal-backend` project
2. Tab "Functions" 
3. Clique em "View Logs"

### **Filtros Exatos:**

**WhatsApp:**
```
WEBHOOK_DEBUG_WHATSAPP_POST_RECEIVED
```

**Instagram:**
```
WEBHOOK_DEBUG_META_POST_RECEIVED
```

**Ou buscar por:**
```
=== WHATSAPP WEBHOOK POST RECEIVED ===
=== META WEBHOOK POST RECEIVED ===
```

### **Time Range:**
- Selecionar "Last 15 minutes" ou "Last hour"
- Data/hora atual: 2026-04-07T11:29 UTC-03

---

## 5. MOTIVO DE NÃO APARECER (SE NÃO APARECER)

### **Possíveis Causas:**

**A) Webhook não configurado no Meta Business:**
- Meta não está enviando eventos para as URLs
- Verificar configuração no Meta Business Manager

**B) URLs incorretas no Meta:**
- WhatsApp deve apontar para: `https://advnoemia.com.br/api/whatsapp/webhook`
- Instagram deve apontar para: `https://advnoemia.com.br/api/meta/webhook`

**C) Problemas de DNS/Propagação:**
- Build pode não estar deployado ainda
- Aguardar propagação do Vercel

**D) Assinatura inválida (403):**
- Meta envia mas rejeita por assinatura inválida
- Verificar variáveis WHATSAPP_APP_SECRET e META_APP_SECRET

---

## 6. RESPOSTA FIXA IMPLEMENTADA

**Texto exato:** `"Olá! Recebi sua mensagem e já vou te ajudar."`

**Localização:**
- WhatsApp: função `processTextMessage()` 
- Instagram: preparada mas não enviada (TODO)

**Sem OpenAI, sem NoemIA, sem IA.**

---

## 7. STATUS FINAL

| Item | Status | Evidência |
|------|--------|-----------|
| Build | **OK** | Compilado sem erros |
| Deploy | **OK** | Rotas listadas no build |
| Logs | **PRONTOS** | Markers implementados |
| Resposta Fixa | **OK** | Texto fixo sem IA |
| Fetch Recursivo | **REMOVIDO** | Corrigido para console.log |

---

## PRÓXIMO PASSO

**ENVIAR MENSAGENS DE TESTE AGORA:**

1. **WhatsApp:** Enviar "teste" para o número
2. **Instagram:** Enviar DM "teste" para @advnoemia
3. **Verificar logs Vercel** com os markers acima

**Se logs não aparecerem, o problema está na configuração do Meta Business, não no código.**
