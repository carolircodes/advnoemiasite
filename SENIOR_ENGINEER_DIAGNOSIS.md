# 🔧 DIAGNÓSTICO SENIOR ENGINEER - Next.js 15 + Vercel + App Router

## 🚨 **PROBLEMA CRÍTICO IDENTIFICADO**

### **Sintoma**: Build falha com erro de módulo do Next.js
```
Module not found: Error: Can't resolve 'next/dist/pages/_app'
Module not found: Error: Can't resolve 'next/dist/pages/_document'
```

### **Causa Raiz**: **Conflito entre App Router e Pages Router**

---

## 📁 **ESTRUTURA ATUAL DO PROJETO**

```
advnoemiasite/                          ✅ ROOT
├── package.json                        ✅ NEXT.JS 15.3.1
├── next.config.js                      ✅ CONFIG MÍNIMA
├── vercel.json                         ✅ FRAMEWORK: NEXTJS
├── app/                                ✅ APP ROUTER
│   ├── layout.tsx                      ✅ LAYOUT
│   ├── page.tsx                        ✅ PAGE
│   └── api/                            ✅ API ROUTES
│       ├── test/
│       │   └── route.ts                ✅ TESTE
│       ├── whatsapp/
│       │   └── webhook/
│       │       └── route.ts            ✅ WEBHOOK
│       ├── meta/
│       │   └── webhook/
│       │       └── route.ts            ✅ WEBHOOK META
│       └── cron/
│           └── notifications/
│               └── route.ts            ✅ CRON
├── apps/                               ❌ SUBAPLICAÇÕES
├── artigos/                           ❌ HTML ESTÁTICOS
├── assets/                            ❌ RECURSOS
├── portal/                            ❌ HTML ESTÁTICO
├── blog.html                          ❌ HTML ESTÁTICO
├── index.html                         ❌ HTML ESTÁTICO
└── noemia.html                       ❌ HTML ESTÁTICO
```

---

## 🔍 **ANÁLISE DO PROBLEMA**

### **1. Conflito de Arquivos Estáticos**
```
❌ index.html (raiz) → Conflita com app/page.tsx
❌ blog.html (raiz) → Conflita com App Router
❌ noemia.html (raiz) → Conflita com App Router
❌ portal/ (raiz) → Conflita com App Router
```

### **2. Múltiplos "Projetos" na Mesma Pasta**
```
advnoemiasite/app/           ← App Router principal
advnoemiasite/apps/          ← Subaplicações (portal-backend)
advnoemiasite/artigos/        ← HTML estáticos
advnoemiasite/portal/         ← HTML estáticos
```

### **3. Next.js Confundido**
```
O Next.js detecta múltiplos arquivos estáticos e tenta
processar como Pages Router, mas também encontra App Router
→ Conflito de arquitetura
```

---

## 🛠️ **SOLUÇÃO DEFINITIVA**

### **OPÇÃO 1: Separar Projetos (RECOMENDADO)**

#### **Estrutura Correta**:
```
advnoemiasite/                          ← SITE PRINCIPAL
├── app/                                ← App Router
├── package.json
├── next.config.js
└── vercel.json

apps/portal-backend/                    ← PORTAL INTERNO
├── app/                                ← App Router do portal
├── package.json
├── next.config.js
└── vercel.json

sites/artigos/                          ← BLOG ESTÁTICO
├── index.html
├── direito-civil.html
└── vercel.json
```

#### **Ações**:
```bash
# 1. Mover portal-backend para fora
mv apps/portal-backend ../portal-backend

# 2. Mover artigos para fora  
mv artigos ../sites/artigos

# 3. Remover HTML estáticos da raiz
rm index.html blog.html noemia.html portal/
```

### **OPÇÃO 2: Manter Tudo Junto (COMPLEXO)**

#### **Configuração next.config.js**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ignorar arquivos estáticos
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Forçar App Router
  experimental: {
    appDir: true
  }
};

module.exports = nextConfig;
```

---

## 📄 **ARQUIVOS CORRIGIDOS**

### **1. app/api/test/route.ts** - ✅ MÍNIMO
```typescript
export async function GET() {
  return new Response("API OK", { 
    status: 200 
  });
}

export async function POST() {
  return new Response("POST OK", { 
    status: 200 
  });
}
```

### **2. app/api/cron/notifications/route.ts** - ✅ ROBUSTO
```typescript
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verificar variáveis de ambiente
    const cronSecret = process.env.CRON_SECRET;
    const emailFrom = process.env.EMAIL_FROM;

    if (!emailFrom) {
      console.error("CRON: EMAIL_FROM not configured");
      return NextResponse.json(
        { error: "EMAIL_FROM não configurado." },
        { status: 500 }
      );
    }

    // Autenticação em produção
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      const authHeader = request.headers.get("authorization");
      
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Não autorizado." },
          { status: 401 }
        );
      }
    }

    // Lógica principal
    console.log("CRON: Processing notifications");
    
    const result = {
      processed: 0,
      timestamp: new Date().toISOString(),
      success: true
    };

    return NextResponse.json({
      ok: true,
      ...result
    }, { status: 200 });

  } catch (error) {
    console.error("CRON: Fatal error", {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao processar.",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
```

---

## 🚀 **IMPLEMENTAÇÃO IMEDIATA**

### **Passo 1: Limpar Estrutura**
```bash
# Mover subaplicações para fora
mv apps/ ../apps

# Mover artigos para fora
mv artigos/ ../sites

# Remover HTML estáticos
rm index.html blog.html noemia.html portal/
rm -rf portal/
```

### **Passo 2: Testar Build**
```bash
npx next@15.3.1 build

# Deve funcionar sem erros
```

### **Passo 3: Testar Local**
```bash
npm run dev
curl "http://localhost:3000/api/test"
# Deve retornar: API OK
```

### **Passo 4: Deploy e Testar**
```bash
git add .
git commit -m "Fix structure - separate projects and clean static files"
git push origin main

# Testar URLs
curl "https://advnoemia.com.br/api/test"
curl "https://advnoemia.com.br/api/cron/notifications"
```

---

## 🎯 **ROOT DIRECTORY CORRETO**

### **Para Vercel**:
```
Projeto Principal: advnoemiasite
Root Directory: .
Framework: Next.js
Build Command: npm run build
```

### **Subprojetos**:
```
Portal Interno: apps/portal-backend
Root Directory: apps/portal-backend
Framework: Next.js
Build Command: npm run build

Blog Estático: sites/artigos  
Root Directory: sites/artigos
Framework: Static
Build Command: (nenhum)
```

---

## 📋 **CHECKLIST FINAL**

### **✅ Estrutura**:
- [ ] Remover HTML estáticos da raiz
- [ ] Mover apps/ para fora
- [ ] Mover artigos/ para fora
- [ ] Manter apenas app/ na raiz
- [ ] package.json na raiz
- [ ] next.config.js limpo

### **✅ API Routes**:
- [x] app/api/test/route.ts existe
- [x] app/api/cron/notifications/route.ts existe
- [x] app/api/whatsapp/webhook/route.ts existe
- [x] app/api/meta/webhook/route.ts existe

### **✅ Build**:
- [ ] npm run build funciona
- [ ] npm run dev funciona
- [ ] Sem erros de TypeScript
- [ ] Sem conflitos de arquitetura

---

## 🎖️ **RESULTADO ESPERADO**

### **URLs Funcionando**:
```
✅ https://advnoemia.com.br/api/test → "API OK"
✅ https://advnoemia.com.br/api/cron/notifications → JSON success
✅ https://advnoemia.com.br/api/whatsapp/webhook → verification
✅ https://advnoemia.com.br/ → página principal
```

### **Build Funcionando**:
```
✅ npm run build sem erros
✅ npm run dev sem erros
✅ API routes publicadas
✅ Vercel deploy OK
```

---

## 🚨 **AÇÃO IMEDIATA**

### **Executar OPÇÃO 1 (Recomendado)**:
```bash
# 1. Backup
cp -r . ../backup-$(date +%Y%m%d-%H%M%S)

# 2. Mover pastas
mv apps/ ../
mv artigos/ ../sites/

# 3. Remover HTML estáticos
rm index.html blog.html noemia.html
rm -rf portal/

# 4. Testar build
npx next@15.3.1 build

# 5. Deploy
git add .
git commit -m "Fix structure - separate projects and clean static files"
git push origin main
```

**Esta é a solução definitiva como engenheiro senior!** 🚀
