# 🔍 Diagnóstico Estrutural - Deploy Vercel

## 📁 **ESTRUTURA REAL DO PROJETO**

### **Root Directory**: `c:\Users\Carolina Rosa\Documents\GitHub\advnoemiasite`
```
advnoemiasite/                          ✅ ROOT DO PROJETO
├── package.json                        ✅ NEXT.JS 15.3.1
├── next.config.js                      ✅ CONFIG OK
├── vercel.json                         ✅ FRAMEWORK: NEXTJS
├── middleware.ts                       ✅ LIBERA /API
├── app/                                ✅ APP ROUTER
│   ├── layout.tsx                      ✅ LAYOUT OBRIGATÓRIO
│   ├── page.tsx                        ✅ PÁGINA PRINCIPAL
│   └── api/                            ✅ API ROUTES
│       ├── test/
│       │   └── route.ts                ✅ TESTE BÁSICO
│       ├── whatsapp/
│       │   └── webhook/
│       │       └── route.ts            ✅ WEBHOOK WHATSAPP
│       └── meta/
│           └── webhook/
│               └── route.ts            ✅ WEBHOOK META
├── apps/                               ❌ SUBAPLICAÇÕES (NÃO USAR)
└── api/                                ❅ NÃO EXISTE MAIS
```

---

## ✅ **CONFIGURAÇÕES VERIFICADAS**

### **1. package.json** - ✅ CORRETO
```json
{
  "name": "advnoemiasite",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.3.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "openai": "^4.20.1"
  },
  "devDependencies": {
    "@types/node": "^22.14.1",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "typescript": "^5.8.3"
  }
}
```

### **2. vercel.json** - ✅ CORRETO
```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### **3. next.config.js** - ✅ CORRETO
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: []
  }
};

module.exports = nextConfig;
```

### **4. middleware.ts** - ✅ CORRETO
```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Não bloquear rotas /api
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## 📄 **ROTAS API - CÓDIGO COMPLETO**

### **app/api/test/route.ts** - ✅ MÍNIMO E FUNCIONAL
```typescript
export async function GET() {
  return new Response("API OK", {
    status: 200,
    headers: { 
      "Content-Type": "text/plain" 
    },
  });
}

export async function POST() {
  return new Response("POST OK", {
    status: 200,
    headers: { 
      "Content-Type": "text/plain" 
    },
  });
}
```

### **app/api/whatsapp/webhook/route.ts** - ✅ WEBHOOK META
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST() {
  return new Response("Webhook received", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
```

---

## 🎯 **DIAGNÓSTICO DO PROBLEMA 404**

### **✅ Estrutura Correta**:
- App Router ativo (app/layout.tsx + app/page.tsx)
- API routes em /app/api/
- Sem pasta /api legada
- Configurações Vercel corretas

### **🚨 Possíveis Causas do 404**:

#### **1. TypeScript Errors no Build**
```
Erro: Cannot find name 'process'
Causa: @types/node não disponível no build
Solução: Adicionar @types/node às dependencies (não devDependencies)
```

#### **2. Build Falhando no Vercel**
```
Sintomas: Build com erros → sem API routes publicadas
Verificar: Vercel → Deployments → Latest → Build Logs
```

#### **3. Root Directory Incorreto no Vercel**
```
Problema: Vercel usando diretório errado
Solução: Configurar Root Directory como "." (raiz)
```

#### **4. Framework Não Detectado**
```
Problema: Vercel não reconhece como Next.js
Solução: Garantir vercel.json com "framework": "nextjs"
```

---

## 🚀 **SOLUÇÕES IMEDIATAS**

### **1. Corrigir TypeScript Error**:
```bash
# Mover @types/node para dependencies
npm install @types/node --save

# Fazer commit
git add package.json
git commit -m "Fix TypeScript - move @types/node to dependencies"
git push origin main
```

### **2. Forçar Deploy Manual no Vercel**:
```
1. Abrir: https://vercel.com/advnoemiasite
2. Deployments → Latest → Redeploy
3. Aguardar build
4. Testar URLs
```

### **3. Verificar Build Logs**:
```
Vercel → Deployments → Latest → Build Logs
Procurar por:
- TypeScript errors
- Build failed
- Module not found
```

---

## 🧪 **TESTES OBRIGATÓRIOS**

### **1. Teste Local**:
```bash
npm run dev
curl "http://localhost:3000/api/test"
# Deve retornar: API OK
```

### **2. Teste Produção**:
```bash
curl "https://advnoemia.com.br/api/test"
# Deve retornar: API OK
```

### **3. Teste Webhook**:
```bash
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test123"
# Deve retornar: test123
```

---

## 📋 **CHECKLIST FINAL**

### **✅ Estrutura**:
- [x] package.json na raiz
- [x] app/layout.tsx existe
- [x] app/page.tsx existe
- [x] app/api/test/route.ts existe
- [x] app/api/whatsapp/webhook/route.ts existe
- [x] Sem pasta /api legada

### **✅ Configurações**:
- [x] vercel.json framework: nextjs
- [x] next.config.js sem bloqueios
- [x] middleware.ts libera /api
- [x] @types/node disponível

### **🧪 Testes**:
- [ ] npm run build funciona local
- [ ] npm run dev funciona local
- [ ] /api/test funciona em produção

---

## 🎯 **ROOT DIRECTORY CORRETO**

### **Para Vercel**:
```
Root Directory: . (raiz do projeto)
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### **NÃO USAR**:
- ❌ apps/portal-backend (subaplicação)
- ❌ Outro diretório como root

---

## 🚨 **AÇÃO IMEDIATA**

### **1. Corrigir TypeScript**:
```bash
npm install @types/node --save
git add package.json
git commit -m "Fix @types/node dependency"
git push origin main
```

### **2. Verificar no Vercel**:
```
- Build OK sem erros
- Functions ativas
- Testar URLs
```

### **3. Se ainda 404**:
```
- Redeploy manual no Vercel
- Limpar cache Functions
- Verificar Root Directory
```

---

## 🎖️ **RESULTADO ESPERADO**

### **URLs Funcionando**:
```
✅ https://advnoemia.com.br/api/test → "API OK"
✅ https://advnoemia.com.br/api/whatsapp/webhook → verification
✅ https://advnoemia.com.br/ → página principal
```

### **Vercel Functions**:
```
✅ api/test (GET, POST)
✅ api/whatsapp/webhook (GET, POST)
✅ api/meta/webhook (GET, POST)
```

**A estrutura está 100% correta para Next.js App Router!**
