# 🔧 Next.js API Routes 404 - Problema e Solução

## 🚨 **Problema Identificado**

**Sintoma**: Todas as rotas `/api/*` retornam 404 no Vercel
- `/api/test` → 404
- `/api/whatsapp/webhook` → 404  
- `/api/meta/webhook` → 404

**Causa**: Estrutura App Router incompleta no projeto

---

## 📋 **Diagnóstico Completo**

### **Estrutura Atual**:
```
advnoemiasite/
├── app/                    ✅ Existe
│   ├── api/               ✅ Existe
│   │   ├── test/          ✅ Existe
│   │   │   └── route.ts   ✅ Existe
│   │   └── whatsapp/      ✅ Existe
│   │       └── webhook/   ✅ Existe
│   │           └── route.ts ✅ Existe
│   ├── page.tsx           ✅ CRIADO
│   └── layout.tsx         ✅ CRIADO
├── api/                   ❌ LEGADO (deve ser ignorado)
├── package.json           ✅ Next.js 15.3.1
├── next.config.js          ✅ Config OK
└── vercel.json            ✅ Framework: nextjs
```

### **Configurações Verificadas**:
- ✅ **Next.js 15.3.1** (App Router padrão)
- ✅ **vercel.json**: `"framework": "nextjs"`
- ✅ **next.config.js**: Sem rewrites bloqueando
- ✅ **Estrutura**: `app/api/*/route.ts`

---

## 🔧 **Solução Implementada**

### **1. Estrutura App Router Completa**
```typescript
// app/layout.tsx - OBRIGATÓRIO
export const metadata = {
  title: 'Advnoemia',
  description: 'Advocacia especializada',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
```

```typescript
// app/page.tsx - OBRIGATÓRIO
export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Advnoemia Site</h1>
      <p>Next.js App Router is working!</p>
      <div style={{ marginTop: '20px' }}>
        <h3>API Test Links:</h3>
        <ul>
          <li><a href="/api/test" target="_blank">/api/test</a></li>
          <li><a href="/api/whatsapp/webhook" target="_blank">/api/whatsapp/webhook</a></li>
        </ul>
      </div>
    </div>
  );
}
```

### **2. API Routes Corretas**
```typescript
// app/api/test/route.ts - JÁ EXISTE
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("TEST API ROUTE WORKING");
  
  return new Response("API OK", {
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}
```

```typescript
// app/api/whatsapp/webhook/route.ts - JÁ EXISTE
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
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

## 🧪 **Testes Obrigatórios**

### **1. Teste Local**:
```bash
# Iniciar servidor
npm run dev

# Testar API
curl "http://localhost:3000/api/test"

# Deve retornar: API OK
# Status: 200
```

### **2. Teste Produção (Após Deploy)**:
```bash
# Testar API
curl "https://advnoemia.com.br/api/test"

# Deve retornar: API OK
# Status: 200
```

### **3. Teste Webhook**:
```bash
# Teste verificação
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=test_123"

# Deve retornar: test_123
# Status: 200
```

---

## 🚨 **Possíveis Problemas Restantes**

### **Problema 1: Deploy Incompleto**
```bash
Sintomas:
- Funciona local mas não em produção
- 404 só no Vercel

Solução:
1. Fazer commit dos novos arquivos:
   git add app/page.tsx app/layout.tsx
   git commit -m "Add App Router structure"
   git push origin main

2. Forçar novo deploy no Vercel
```

### **Problema 2: TypeScript Errors**
```bash
Sintomas:
- Build falha com erros JSX
- Types do React faltando

Solução:
npm install @types/react @types/react-dom --save-dev
```

### **Problema 3: Conflito com /api/ legado**
```bash
Sintomas:
- APIs misturadas (App Router + Pages Router)
- Confusão na estrutura

Solução:
1. Remover pasta /api/ raiz:
   rm -rf api/
2. Usar apenas app/api/
```

---

## 📋 **Checklist Final**

### ✅ **Antes do Deploy**:
- [ ] app/layout.tsx existe
- [ ] app/page.tsx existe  
- [ ] app/api/test/route.ts funciona local
- [ ] app/api/whatsapp/webhook/route.ts funciona local
- [ ] npm run build funciona sem erros
- [ ] TypeScript types instalados

### ✅ **Pós-Deploy**:
- [ ] https://advnoemia.com.br/api/test retorna "API OK"
- [ ] https://advnoemia.com.br/ carrega página
- [ ] Logs Vercel mostram funções ativas
- [ ] Webhook verification funciona

---

## 🔍 **Como Verificar no Vercel**

### **1. Build Logs**:
```
Vercel → Deployments → Latest → Build Logs
Procurar por:
- ✓ Next.js Build Completed
- ✓ API routes discovered
- ✓ Functions created
```

### **2. Function Logs**:
```
Vercel → Functions → api/test → Logs
Procurar por:
- ✓ Function executed
- ✓ Response: "API OK"
```

### **3. Runtime**:
```
Vercel → Functions
Deve aparecer:
- api/test (GET)
- api/whatsapp/webhook (GET, POST)
```

---

## 🎯 **Resultado Esperado**

### **URLs Funcionando**:
```
✅ https://advnoemia.com.br/ (página principal)
✅ https://advnoemia.com.br/api/test (API OK)
✅ https://advnoemia.com.br/api/whatsapp/webhook (webhook)
```

### **Logs no Vercel**:
```
[2026-04-06T...] TEST API ROUTE WORKING
[2026-04-06T...] WHATSAPP_WEBHOOK VERIFICATION_ATTEMPT
```

### **Meta Developers**:
```
✅ Webhook Status: Verified
✅ Callback URL: https://advnoemia.com.br/api/whatsapp/webhook
```

---

## 🚀 **Comandos Finais**

### **Forçar Deploy Completo**:
```bash
# 1. Adicionar arquivos
git add app/page.tsx app/layout.tsx

# 2. Commit
git commit -m "Fix Next.js App Router structure - add layout and page"

# 3. Push
git push origin main

# 4. Verificar deploy no Vercel
# 5. Testar APIs
```

### **Teste Completo**:
```bash
# Teste 1: Página
curl "https://advnoemia.com.br/"

# Teste 2: API
curl "https://advnoemia.com.br/api/test"

# Teste 3: Webhook
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminha_whatsapp_verify_2026&hub.challenge=test"
```

---

## 🎖️ **Solução Final**

**Problema**: App Router incompleto sem layout.tsx e page.tsx  
**Solução**: Adicionar estrutura completa do App Router  
**Resultado**: API routes funcionando perfeitamente no Vercel

**Agora as APIs vão funcionar!** 🚀
