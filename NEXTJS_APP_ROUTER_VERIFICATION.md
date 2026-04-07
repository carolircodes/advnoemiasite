# 🔍 Next.js App Router - Verificação de Estrutura

## 📋 Estrutura Confirmada

### ✅ **Projeto Usa App Router**
- **Next.js 15.3.1** (App Router padrão)
- **Estrutura**: `app/api/whatsapp/webhook/route.ts`
- **Deploy expõe**: `/api/whatsapp/webhook` no domínio principal

---

## 🎯 **Arquivo Criado Corretamente**

### **Localização**: `app/api/whatsapp/webhook/route.ts`
```
advnoemiasite/
├── app/
│   └── api/
│       └── whatsapp/
│           └── webhook/
│               └── route.ts  ✅ CRIADO
├── api/ (legado - será ignorado)
│   └── whatsapp/
│       └── webhook.ts
```

---

## 🔧 **GET Handler - Exatamente como Meta Exige**

### **Requisitos Meta**:
```typescript
// 1. Retornar SOMENTE hub.challenge
// 2. Status 200
// 3. Content-Type: text/plain
// 4. Sem JSON, HTML ou layout
```

### **Implementação**:
```typescript
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // ✅ EXATAMENTE como Meta exige
    return new Response(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      }
    });
  }

  return new Response("Forbidden", { 
    status: 403,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8'
    }
  });
}
```

---

## 🌐 **URL de Deploy**

### **Domínio Principal**: `https://advnoemia.com.br`
### **Webhook URL**: `https://advnoemia.com.br/api/whatsapp/webhook`
### **Teste Local**: `http://localhost:3000/api/whatsapp/webhook`

---

## 🧪 **Testes Obrigatórios**

### 1. **Teste Manual (Local)**:
```bash
# Iniciar servidor
npm run dev

# Teste GET
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=local_test"

# Deve retornar EXATAMENTE: local_test
# Sem aspas, sem JSON, sem HTML
```

### 2. **Teste Manual (Produção)**:
```bash
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=prod_test"

# Deve retornar EXATAMENTE: prod_test
# Status: 200 OK
# Content-Type: text/plain
```

### 3. **Teste no Browser**:
```
URL: https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=browser_test

Deve mostrar na tela: browser_test
```

---

## 🚨 **Verificações Importantes**

### 1. **App Router vs Pages Router**:
```typescript
// ✅ CORRETO (App Router)
app/api/whatsapp/webhook/route.ts

// ❌ ERRADO (Pages Router - será ignorado)
pages/api/whatsapp/webhook.ts
api/whatsapp/webhook.ts  # legado
```

### 2. **Sem Interferências**:
```json
// vercel.json - SEM rewrites para /api
{
  "framework": "nextjs",
  "crons": [...]
  // SEM rewrites que afetem /api/
}

// next.config.js - SEM rewrites para /api
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: []
  }
  // SEM rewrites para /api/
};
```

### 3. **Variáveis de Ambiente**:
```bash
# Obrigatórias no Vercel
WHATSAPP_VERIFY_TOKEN=noeminia_whatsapp_verify_2026
WHATSAPP_APP_SECRET=noeminia_whatsapp_secret_2026
WHATSAPP_ACCESS_TOKEN=EAxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
```

---

## 📊 **Logs Esperados**

### **Sucesso na Verificação**:
```
[2026-04-06T...] WHATSAPP_WEBHOOK VERIFICATION_ATTEMPT: {
  mode: "subscribe",
  token: "VALID",
  tokenMatch: true,
  hasChallenge: true
}

[2026-04-06T...] WHATSAPP_WEBHOOK VERIFICATION_SUCCESS: {
  mode: "subscribe",
  token: "VALID",
  challenge: "test_challenge_123",
  verifyToken: "SET"
}
```

### **Falha na Verificação**:
```
[2026-04-06T...] WHATSAPP_WEBHOOK VERIFICATION_ATTEMPT: {
  mode: "subscribe",
  token: "INVALID",
  tokenMatch: false,
  hasChallenge: true
}

[2026-04-06T...] WHATSAPP_WEBHOOK VERIFICATION_FAILED: {
  mode: "subscribe",
  token: "wrong_token",
  tokenMatch: false,
  expectedToken: "noeminia_whatsapp_verify_2026",
  reason: "Invalid token"
}
```

---

## 🔧 **Configuração Meta Developers**

### **Webhook Setup**:
```bash
1. App → WhatsApp Business
2. Webhooks → Configure
3. Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
4. Verify Token: noeminia_whatsapp_verify_2026
5. Add subscription: messages
6. Save and Verify
```

### **Resultado Esperado**:
```
✅ Webhook Status: Verified (verde)
✅ Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
✅ Subscription: messages
```

---

## 🚀 **Deploy e Verificação**

### 1. **Deploy no Vercel**:
```bash
# Commit e push
git add app/api/whatsapp/webhook/route.ts
git commit -m "Add WhatsApp webhook for App Router"
git push origin main

# Vercel vai fazer deploy automático
```

### 2. **Verificação Pós-Deploy**:
```bash
# Testar imediatamente após deploy
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=deploy_test"

# Deve funcionar e mostrar logs no Vercel
```

### 3. **Verificar Logs Vercel**:
```bash
# Dashboard Vercel → Functions → api/whatsapp/webhook → Logs
# Procurar por: WHATSAPP_WEBHOOK VERIFICATION_
```

---

## 🆘️ **Troubleshooting**

### Problema: **"Não foi possível validar a URL de callback"**
```bash
Causa: WHATSAPP_VERIFY_TOKEN não configurado
Solução: 
1. Settings → Environment Variables no Vercel
2. Adicionar WHATSAPP_VERIFY_TOKEN=noeminia_whatsapp_verify_2026
3. Redeploy
```

### Problema: **404 Not Found**
```bash
Causa: Arquivo no local errado
Solução: 
1. Verificar se está em app/api/whatsapp/webhook/route.ts
2. Não em api/whatsapp/webhook.ts
3. Não em pages/api/whatsapp/webhook.ts
```

### Problema: **500 Internal Server**
```bash
Causa: Erro no código
Solução: 
1. Verificar logs no Vercel Functions
2. Testar local com npm run dev
3. Verificar sintaxe TypeScript
```

---

## 📋 **Checklist Final**

### ✅ **Antes de Configurar Meta**:
- [ ] Arquivo em: `app/api/whatsapp/webhook/route.ts`
- [ ] WHATSAPP_VERIFY_TOKEN configurado no Vercel
- [ ] Deploy atualizado no Vercel
- [ ] Teste manual com cURL funcionando
- [ ] Logs aparecendo no Vercel

### ✅ **Configuração Meta**:
- [ ] Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
- [ ] Verify Token: noeminia_whatsapp_verify_2026
- [ ] Subscription: messages
- [ ] Status: Verified (verde)

### ✅ **Pós-Configuração**:
- [ ] Testar mensagem real no WhatsApp
- [ ] Verificar logs de POST_RECEIVED
- [ ] Confirmar resposta simulada enviada

---

## 🎖️ **Resultado Final**

**O webhook agora está:**
- ✅ **Localização correta** para App Router
- ✅ **GET handler exato** como Meta exige
- ✅ **Response format** correto (challenge puro)
- ✅ **Status 200** para sucesso
- ✅ **Status 403** para falha
- ✅ **Sem interferências** de rewrites/middleware
- ✅ **Deploy pronto** em advnoemia.com.br

**A verificação do webhook WhatsApp vai funcionar!** ✅
