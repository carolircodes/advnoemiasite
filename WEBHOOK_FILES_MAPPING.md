# MAPEAMENTO DE ARQUIVOS - WEBHOOK META/INSTAGRAM/WHATSAPP

## **TAREFA 1 - ARQUIVOS MAPEADOS**

### **Arquivos Principais Encontrados:**

#### **1. `/app/api/meta/webhook/route.ts`**
- **Função:** Webhook principal para Instagram/Meta
- **GET:** Validação com `META_VERIFY_TOKEN`
- **POST:** Recebe eventos Instagram, valida assinatura
- **Secret:** `process.env.META_APP_SECRET` (linha 6)
- **Token:** `process.env.INSTAGRAM_ACCESS_TOKEN` (linha 7)
- **Graph API:** Envia mensagens via `https://graph.facebook.com/v19.0/me/messages`

#### **2. `/app/api/whatsapp/webhook/route.ts`**
- **Função:** Webhook para WhatsApp Business
- **GET:** Validação com `WHATSAPP_VERIFY_TOKEN`
- **POST:** Recebe eventos WhatsApp, valida assinatura
- **Secret:** `process.env.WHATSAPP_APP_SECRET` (linha 7)
- **Token:** `process.env.WHATSAPP_ACCESS_TOKEN` (linha 8)
- **Graph API:** Usa serviço separado

#### **3. `/lib/meta/whatsapp-service.ts`**
- **Função:** Serviço de envio WhatsApp Cloud API
- **Graph API:** `https://graph.facebook.com` (4 ocorrências)
- **Função:** Envia mensagens, gerencia comunicação

#### **4. `/app/api/meta/webhook/test/route.ts`**
- **Função:** Testes do webhook Meta
- **Referências:** META_APP_SECRET, INSTAGRAM_APP_SECRET

#### **5. `/app/api/whatsapp/webhook/test/route.ts`**
- **Função:** Testes do webhook WhatsApp

---

## **RESUMO DAS ROTAS E FUNCIONALIDADES**

### **Qual rota recebe GET de validação?**
- **Instagram/Meta:** `GET /api/meta/webhook` (valida `META_VERIFY_TOKEN`)
- **WhatsApp:** `GET /api/whatsapp/webhook` (valida `WHATSAPP_VERIFY_TOKEN`)

### **Qual rota recebe POST do webhook?**
- **Instagram/Meta:** `POST /api/meta/webhook` (recebe eventos Instagram)
- **WhatsApp:** `POST /api/whatsapp/webhook` (recebe eventos WhatsApp)

### **Qual arquivo envia mensagens para a Graph API?**
- **Instagram:** `/app/api/meta/webhook/route.ts` (função `sendInstagramMessage`)
- **WhatsApp:** `/lib/meta/whatsapp-service.ts` (serviço dedicado)

### **Qual arquivo lê META_APP_SECRET?**
- **Principal:** `/app/api/meta/webhook/route.ts` (linha 6)
- **Testes:** `/app/api/meta/webhook/test/route.ts`

### **Qual arquivo lê META_VERIFY_TOKEN?**
- **Principal:** `/app/api/meta/webhook/route.ts` (linha 5)

### **Existe INSTAGRAM_APP_SECRET no código?**
- **Sim:** Referenciado em `/app/api/meta/webhook/route.ts` (linha 32)
- **Sim:** Referenciado em `/app/api/meta/webhook/test/route.ts`
- **Status:** Detectada mas NÃO usada como principal

### **Existe ENABLE_SIGNATURE_VALIDATION no código?**
- **Não:** Não encontrada nenhuma referência

---

## **ORDEM ATUAL DE PRIORIDADE DE SECRETS**

### **Código Atual em `/app/api/meta/webhook/route.ts`:**
```typescript
// Linha 6 - HARD CODED PARA META_APP_SECRET
const APP_SECRET = process.env.META_APP_SECRET || "noeminia_app_secret_2026";

// Linha 41-50 - ORDEM DE RESOLUÇÃO
if (process.env.META_APP_SECRET) {
  selectedSecret = process.env.META_APP_SECRET;           // 1º
} else if (process.env.APP_SECRET) {
  selectedSecret = process.env.APP_SECRET;               // 2º
} else if (process.env.INSTAGRAM_APP_SECRET) {
  selectedSecret = process.env.INSTAGRAM_APP_SECRET;     // 3º
} else if (process.env.META_INSTAGRAM_APP_SECRET) {
  selectedSecret = process.env.META_INSTAGRAM_APP_SECRET; // 4º
} else {
  selectedSecret = "noeminia_app_secret_2026";            // 5º
}
```

### **Problema Identificado:**
- **Linha 6:** Hardcoded para `META_APP_SECRET`
- **Linha 41:** Prioridade 1 para `META_APP_SECRET`
- **Resultado:** `INSTAGRAM_APP_SECRET` nunca será usada mesmo se existir

---

## **ARQUIVOS NÃO ENCONTRADOS**

### **Não existem:**
- `/api/instagram/*` (não há rota específica para Instagram)
- `/pages/api/**/*.ts` (projeto usa App Router)
- `/utils/env*` (não há utilitários de env)
- Helpers dedicados de assinatura (cada webhook implementa próprio)

---

## **PRÓXIMA ETAPA - CORREÇÃO NECESSÁRIA**

### **Arquivo a modificar:**
- **Único:** `/app/api/meta/webhook/route.ts`

### **Mudanças necessárias:**
1. **Linha 6:** Mudar hardcoded para `INSTAGRAM_APP_SECRET || META_APP_SECRET`
2. **Linha 41-50:** Reordenar prioridade para `INSTAGRAM_APP_SECRET` primeiro

### **Impacto:**
- **Zero:** Não afeta frontend, portal, NoemIA, Supabase
- **Mínimo:** Apenas validação de assinatura do webhook Meta
