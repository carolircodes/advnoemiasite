# AUDITORIA FINAL DE CONTEXTO META - WEBHOOK INSTAGRAM

## **VARIÁVEIS DE AMBIENTE META/INSTAGRAM USADAS**

### **Secrets (Validação):**
- `INSTAGRAM_APP_SECRET` (prioridade 1)
- `META_APP_SECRET` (prioridade 2)
- `APP_SECRET` (prioridade 3)
- `META_INSTAGRAM_APP_SECRET` (prioridade 4)

### **Tokens e IDs (Envio):**
- `INSTAGRAM_ACCESS_TOKEN` (envio de mensagens)
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` (log apenas, não usado ativamente)

### **Verificação:**
- `META_VERIFY_TOKEN` (validação GET do webhook)

---

## **ENDPOINT GRAPH API USADO**

### **URL Exata:**
```
https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}
```

### **Características:**
- **Versão:** v19.0
- **Endpoint:** `/me/messages` (genérico, não específico de app)
- **Token:** `INSTAGRAM_ACCESS_TOKEN` (query parameter)
- **Método:** POST

---

## **REFERÊNCIAS DE APP/CONTEXTO ENCONTRADAS**

### **NÃO EXISTEM:**
- **APP ID** (nenhuma referência no código)
- **Page ID** (nenhuma referência no código)
- **IG User ID** (nenhuma referência no código)
- **Business Account ID** (apenas log, não usado)

### **EXISTEM:**
- **`/me/messages`** - endpoint genérico que usa o contexto do token
- **`INSTAGRAM_ACCESS_TOKEN`** - token que define o app/contexto

---

## **ANÁLISE DE POSSÍVEL INCONSISTÊNCIA**

### **Problema Identificado:**
1. **Validação:** Usa `INSTAGRAM_APP_SECRET` (secret do app Instagram)
2. **Envio:** Usa `INSTAGRAM_ACCESS_TOKEN` (token do app Instagram)
3. **Ambos** deveriam pertencer ao **mesmo app Meta**

### **Possível Causa do Mismatch:**
- `INSTAGRAM_APP_SECRET` pertence a **App A** (configurado no webhook da Meta)
- `INSTAGRAM_ACCESS_TOKEN` pertence a **App B** (gerado separadamente)
- **Webhook assina com App A**, mas **código valida com secret de App A**
- **Se App A != App B**, signature mismatch ocorre

### **Indícios de Múltiplos Apps:**
- Nenhuma referência explícita a APP ID no código
- Uso de endpoint genérico `/me/messages`
- Múltiplas variáveis de secret possíveis

---

## **VARIÁVEIS REALMENTE USADAS PELA ROTA**

### **Para Validação (HMAC):**
```typescript
process.env.INSTAGRAM_APP_SECRET  // Prioridade 1
process.env.META_APP_SECRET       // Prioridade 2
```

### **Para Envio (Graph API):**
```typescript
process.env.INSTAGRAM_ACCESS_TOKEN     // Obrigatório para envio
process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID  // Log apenas
```

### **Para Verificação (GET):**
```typescript
process.env.META_VERIFY_TOKEN
```

---

## **INCONSISTÊNCIAS ENCONTRADAS**

### **1. Contexto Implícito vs Explícito:**
- **Validação:** Assume que `INSTAGRAM_APP_SECRET` é do app correto
- **Envio:** Assume que `INSTAGRAM_ACCESS_TOKEN` é do mesmo app
- **Sem verificação:** Não há validação se ambos pertencem ao mesmo app

### **2. Endpoint Genérico:**
- **`/me/messages`** usa o contexto do token, não de um app ID explícito
- **Se token for de app diferente**, mensagens podem ser enviadas de contexto errado

### **3. Múltiplas Secrets:**
- **4 variáveis diferentes** para secret podem causar confusão
- **Sem APP ID** para associar secret a app específico

---

## **RECOMENDAÇÃO (Sem Alterar Código)**

### **Verificar no Vercel:**
1. **Confirmar** que `INSTAGRAM_APP_SECRET` e `INSTAGRAM_ACCESS_TOKEN` pertencem ao **mesmo app Meta**
2. **Verificar** no Meta Developers qual é o APP ID do token
3. **Confirmar** que o webhook está configurado para o mesmo APP ID

### **Logs para Verificar:**
```
APP_SECRET_SOURCE_SELECTED: INSTAGRAM_APP_SECRET
INSTAGRAM_ACCESS_TOKEN_PRESENT: true
SIGNATURE_MATCH_EXACT: [deve ser true se apps coincidirem]
```

---

## **RESUMO EXECUTIVO**

### **Status do Código:**
- **Tecnicamente correto** - usa variáveis e endpoints adequadamente
- **Sem inconsistências lógicas** - fluxo bem estruturado
- **Dependência de configuração** - requer secrets corretas

### **Possível Problema:**
- **App mismatch** entre secret de validação e token de envio
- **Sem verificação explícita** no código para garantir mesmo app

### **Próxima Ação:**
- **Verificar configuração** no Meta Developers
- **Confirmar** que `INSTAGRAM_APP_SECRET` e `INSTAGRAM_ACCESS_TOKEN` são do mesmo app
- **Testar** com logs para confirmar `SIGNATURE_MATCH_EXACT: true`

---

**CONCLUSÃO:** Código está correto. Problema provável é configuração de secrets de apps diferentes na Meta.
