# DIAGNÓSTICO COMPLETO - CONFIGURAÇÃO META WEBHOOKS

## PROBLEMA IDENTIFICADO

Webhooks não estão recebendo eventos → **Problema na configuração da Meta, não no código.**

---

## 1. TESTE DE ACESSIBILIDADE

### **Endpoints de Teste Criados:**

**WhatsApp Test:** `https://advnoemia.com.br/api/whatsapp/webhook/test`
**Instagram Test:** `https://advnoemia.com.br/api/meta/webhook/test`

### **Como Testar:**
```bash
curl https://advnoemia.com.br/api/whatsapp/webhook/test
curl https://advnoemia.com.br/api/meta/webhook/test
```

**Se responder 200 → Webhooks estão acessíveis.**

---

## 2. CONFIGURAÇÃO META BUSINESS - VERIFICAÇÃO

### **A. WhatsApp Business Account**

**Localização Exata:**
1. Meta Business Suite
2. **WhatsApp** (não Webhooks gerais)
3. **WhatsApp Business Account Settings**
4. **Webhooks**

**Configuração Correta:**
```
Webhook URL: https://advnoemia.com.br/api/whatsapp/webhook
Verify Token: noeminha_whatsapp_verify_2026
App Secret: noeminha_whatsapp_secret_2026
```

**Eventos OBRIGATÓRIOS:**
- ✅ **Messages** (DEVE ESTAR ATIVO)
- ✅ **Message reaction status** (opcional)
- ✅ **Message sent status** (opcional)

### **B. Instagram**

**Localização Exata:**
1. Meta Business Suite
2. **Instagram** 
3. **Instagram API Configuration**
4. **Webhooks**

**Configuração Correta:**
```
Webhook URL: https://advnoemia.com.br/api/meta/webhook
Verify Token: noeminha_verify_2026
App Secret: noeminha_app_secret_2026
```

**Eventos OBRIGATÓRIOS:**
- ✅ **Messages** (DEVE ESTAR ATIVO)
- ✅ **Message reactions** (opcional)

---

## 3. VINCULAÇÃO NÚMERO x APP

### **WhatsApp - Verificar:**

1. **Meta for Developers** → Seu App
2. **WhatsApp** → **Configuration**
3. **Phone Number ID** deve estar listado
4. **Webhook URL** deve estar configurado

**Se não aparecer:**
- Número não vinculado ao app
- Precisa adicionar número ao WhatsApp Business Account

### **Instagram - Verificar:**

1. **Meta for Developers** → Seu App
2. **Products** → **Instagram**
3. **Instagram Graph API**
4. **Webhooks** deve estar configurado

---

## 4. AMBIENTE: TESTE vs PRODUÇÃO

### **WhatsApp Cloud API:**

**Test Mode:**
- Apenas mensagens de números verificados
- Webhook pode não disparar para números normais

**Produção:**
- Qualquer usuário pode enviar mensagem
- Webhook dispara normalmente

**Como Verificar:**
1. Meta for Developers → App → **WhatsApp**
2. **Phone Number** → Verificar se está em **Sandbox** ou **Production**

### **Instagram:**

Sempre em produção após aprovação do app.

---

## 5. PERMISSÕES DO APP

### **Permissões Obrigatórias:**

**WhatsApp:**
- ✅ `whatsapp_business_messaging`
- ✅ `whatsapp_business_management`

**Instagram:**
- ✅ `instagram_basic`
- ✅ `instagram_manage_messages`
- ✅ `pages_show_list`
- ✅ `pages_read_engagement`

**Como Verificar:**
1. Meta for Developers → App → **App Review**
2. **Permissions and Tokens**

---

## 6. VALIDAÇÃO vs ATIVAÇÃO

### **Diferença Crítica:**

**Webhook Validated:**
- Meta conseguiu fazer GET + challenge
- **Não significa que está ativo para POST**

**Webhook Active:**
- Meta está enviando eventos reais
- **É o que precisamos**

### **Como Ativar:**

1. **Após validação bem-sucedida**
2. **Clique em "Manage"** ao lado do webhook
3. **Selecione os eventos** (Messages obrigatório)
4. **Clique "Save"**
5. **Aguardar alguns minutos** para propagação

---

## 7. PASSO A PASSO FINAL

### **PASSO 1 - Testar Acessibilidade:**
```bash
curl https://advnoemia.com.br/api/whatsapp/webhook/test
curl https://advnoemia.com.br/api/meta/webhook/test
```

### **PASSO 2 - Verificar Configuração WhatsApp:**
1. Meta Business Suite → WhatsApp
2. Business Account Settings → Webhooks
3. Confirmar URL: `https://advnoemia.com.br/api/whatsapp/webhook`
4. Confirmar evento **Messages** ATIVO
5. Se não ativo, ativar e salvar

### **PASSO 3 - Verificar Configuração Instagram:**
1. Meta Business Suite → Instagram
2. Instagram API → Webhooks
3. Confirmar URL: `https://advnoemia.com.br/api/meta/webhook`
4. Confirmar evento **Messages** ATIVO
5. Se não ativo, ativar e salvar

### **PASSO 4 - Verificar Vinculação:**
1. Meta for Developers → App
2. WhatsApp → Phone Numbers
3. Confirmar número aparece
4. Instagram → Instagram Graph API
5. Confirmar página aparece

### **PASSO 5 - Testar Envio:**
**WhatsApp:**
- Enviar mensagem do seu celular para o número conectado
- **NÃO usar "Send Message" do painel Meta**

**Instagram:**
- Enviar DM para @advnoemia
- Usar conta real, não página

### **PASSO 6 - Verificar Logs:**
1. Vercel Dashboard → portal-backend
2. Functions → View Logs
3. Procurar: `WEBHOOK_DEBUG_WHATSAPP_POST_RECEIVED`

---

## 8. DIAGNÓSTICO RÁPIDO

### **Se testes de acessibilidade falham:**
- Problema de deploy/dns
- Aguardar propagação Vercel

### **Se testes funcionam mas logs vazios:**
- Webhook não está ativo para eventos
- Evento "Messages" não selecionado
- App em modo sandbox

### **Se logs mostram erro 403:**
- App Secret incorreto
- Verify Token incorreto

### **Se logs mostram erro 400:**
- Payload inválido
- Assinatura inválida

---

## 9. SOLUÇÃO MAIS PROVÁVEL

**90% dos casos:** Evento "Messages" não está ativo no webhook.

**Resolução:**
1. Ir à configuração do webhook
2. Ativar evento "Messages"
3. Salvar
4. Aguardar 5 minutos
5. Testar novamente

---

## 10. CONTINGÊNCIA

Se nada funcionar:
1. **Deletar webhook atual**
2. **Criar novo webhook** com mesma URL
3. **Revalidar**
4. **Ativar eventos**
5. **Testar novamente**

**Às vezes a configuração fica corrompida na Meta.**
