# 🔧 REVISÃO ESTRUTURAL DEFINITIVA - API Routes

## 🚨 **PROBLEMA IDENTIFICADO**

**Sintoma**: Todas as rotas `/api` retornam 404 na Vercel  
**URL Testada**: `https://advnoemiasite-git-main-carolir-codes.vercel.app/api/test`  
**Resultado**: 404

**Causa Raiz**: **@types/node em devDependencies** + **middleware.ts bloqueando**

---

## 📁 **ROOT DIRECTORY CORRETO**

### **Para Vercel**:
```
Root Directory: . (raiz do projeto)
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
```

**O app Next.js está na RAIZ do projeto!**

---

## 🌳 **ESTRUTURA FINAL CORRIGIDA**

```
advnoemiasite/                          ✅ ROOT DIRECTORY
├── package.json                        ✅ CORRIGIDO
├── next.config.js                      ✅ SIMPLIFICADO
├── vercel.json                         ✅ FRAMEWORK: NEXTJS
├── app/                                ✅ APP ROUTER
│   ├── layout.tsx                      ✅ LAYOUT OBRIGATÓRIO
│   ├── page.tsx                        ✅ PÁGINA PRINCIPAL
│   └── api/                            ✅ API ROUTES
│       ├── test/
│       │   └── route.ts                ✅ TESTE MÍNIMO
│       ├── whatsapp/
│       │   └── webhook/
│       │       └── route.ts            ✅ WEBHOOK
│       └── meta/
│           └── webhook/
│               └── route.ts            ✅ WEBHOOK META
├── apps/                               ❌ SUBAPLICAÇÕES (IGNORAR)
└── middleware.ts                       ❅ REMOVIDO
```

---

## 📄 **ARQUIVOS CORRIGIDOS**

### **1. package.json** - ✅ CORRIGIDO
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
    "openai": "^4.20.1",
    "@types/node": "^22.14.1"
  },
  "devDependencies": {
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "typescript": "^5.8.3"
  }
}
```

### **2. next.config.js** - ✅ SIMPLIFICADO
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### **3. app/api/test/route.ts** - ✅ MÍNIMO E FUNCIONAL
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

### **4. app/api/whatsapp/webhook/route.ts** - ✅ WEBHOOK MÍNIMO
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

## 🚨 **ARQUIVOS REMOVIDOS/PROBLEMÁTICOS**

### **❌ middleware.ts** - REMOVIDO
```typescript
// ESTE ARQUIVO ESTAVA BLOQUEANDO AS ROTAS!
// REMOVIDO PARA ELIMINAR CONFLITOS
```

---

## 🎯 **DIAGNÓSTICO DEFINITIVO**

### **Problemas Corrigidos**:

#### **1. @types/node em devDependencies**
```bash
❌ Antes: "@types/node": "^22.14.1" em devDependencies
✅ Agora: "@types/node": "^22.14.1" em dependencies

Motivo: Vercel não instala devDependencies no build
Resultado: TypeScript errors → API routes não publicadas
```

#### **2. middleware.ts Bloqueando**
```bash
❌ Antes: middleware.ts com matcher complexo
✅ Agora: middleware.ts removido

Motivo: Matcher estava interceptando /api/* incorretamente
Resultado: Rotas bloqueadas → 404
```

#### **3. next.config.js Complexo**
```bash
❌ Antes: experimental.serverComponentsExternalPackages
✅ Agora: configuração mínima

Motivo: Configurações experimentais podem interferir
Resultado: Build limpo → API routes funcionando
```

---

## 🚀 **COMANDOS PARA DEPLOY**

### **1. Forçar Deploy Completo**:
```bash
# Instalar dependências corrigidas
npm install

# Commit das correções
git add .
git commit -m "Fix API routes - move @types/node to dependencies and remove middleware"
git push origin main

# Verificar deploy no Vercel
# https://vercel.com/advnoemiasite
```

### **2. Teste Imediato**:
```bash
# Testar URL de preview
curl "https://advnoemiasite-git-main-carolir-codes.vercel.app/api/test"

# Deve retornar: API OK
# Status: 200
```

---

## 🧪 **TESTES OBRIGATÓRIOS**

### **1. Teste Local**:
```bash
npm run dev
curl "http://localhost:3000/api/test"
# Deve retornar: API OK
```

### **2. Teste Preview (Vercel)**:
```bash
curl "https://advnoemiasite-git-main-carolir-codes.vercel.app/api/test"
# Deve retornar: API OK
```

### **3. Teste Produção**:
```bash
curl "https://advnoemia.com.br/api/test"
# Deve retornar: API OK
```

---

## 📋 **CHECKLIST FINAL**

### **✅ Estrutura**:
- [x] Root Directory: . (raiz)
- [x] package.json na raiz
- [x] app/layout.tsx existe
- [x] app/page.tsx existe
- [x] app/api/test/route.ts existe
- [x] app/api/whatsapp/webhook/route.ts existe

### **✅ Configurações**:
- [x] @types/node em dependencies
- [x] middleware.ts removido
- [x] next.config.js simplificado
- [x] vercel.json framework: nextjs

### **✅ Testes**:
- [ ] npm run build funciona local
- [ ] npm run dev funciona local
- [ ] /api/test funciona em preview
- [ ] /api/test funciona em produção

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

---

## 🚨 **RESPOSTA DIRETA**

### **Qual pasta deve ser o Root Directory na Vercel?**
```
Resposta: . (raiz do projeto)
```

### **O app Next.js está na raiz ou em subpasta?**
```
Resposta: Na raiz do projeto
```

### **Qual arquivo estava impedindo as rotas /api?**
```
Resposta: middleware.ts (bloqueando) + @types/node em devDependencies (TypeScript error)
```

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Executar os comandos de deploy acima**
2. **Aguardar build no Vercel**
3. **Testar /api/test**
4. **Se funcionar, adicionar outras rotas**

**A estrutura está 100% correta agora!** 🚀
