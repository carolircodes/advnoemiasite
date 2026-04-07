# 🔍 Next.js App Router 404 Debug - Guia Completo

## 🚨 Problema Identificado

**ERRO**: Webhook retornando 404 em `/api/whatsapp/webhook`

**CAUSA**: A rota não está sendo registrada corretamente no Next.js 15 App Router

---

## 📋 Estrutura Verificada

### ✅ **Arquivo no Local Correto**:
```
app/
└── api/
    └── whatsapp/
        └── webhook/
            └── route.ts  ✅ EXISTE
```

### ✅ **Arquivos Removidos**:
- ❌ `api/whatsapp/webhook.ts` (removido)
- ❌ `api/meta/webhook.ts` (removido)

### ✅ **Middleware Não Bloqueia**:
```
matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"]
# Não bloqueia /api/whatsapp/webhook
```

---

## 🔧 Soluções Implementadas

### 1. **Webhook Corrigido**
- ✅ Export functions: `GET(request: NextRequest)` e `POST(request: NextRequest)`
- ✅ Response format correto para Meta
- ✅ Logs completos para debug

### 2. **Rota de Teste Criada**
- ✅ `/api/test/route.ts` para verificar se App Router funciona
- ✅ GET e POST simples

---

## 🧪 Testes Obrigatórios

### 1. **Testar Rota de Teste PRIMEIRO**:
```bash
# Local
curl "http://localhost:3000/api/test"

# Produção
curl "https://advnoemia.com.br/api/test"

# Se funcionar → App Router OK
# Se der 404 → Problema no Next.js
```

### 2. **Testar Webhook WhatsApp**:
```bash
# Local
curl "http://localhost:3000/api/whatsapp/webhook"

# Produção
curl "https://advnoemia.com.br/api/whatsapp/webhook"

# Se der 404 → Problema específico do webhook
```

### 3. **Testar Verificação Meta**:
```bash
curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=test_123"

# Deve retornar: test_123
# Status: 200 OK
```

---

## 🚨 Possíveis Causas do 404

### Causa 1: **Deploy Incompleto**
```bash
Sintomas:
- Rota funciona local mas não em produção
- 404只在生产环境

Solução:
1. Verificar se arquivo foi commitado
2. Forçar novo deploy no Vercel
3. Verificar build logs
```

### Causa 2: **Next.js Configuration**
```bash
Sintomas:
- Todas as rotas /api dão 404
- Até /api/test dá 404

Solução:
1. Verificar next.config.js
2. Verificar se há rewrites bloqueando
3. Verificar se App Router está habilitado
```

### Causa 3: **Estrutura de Diretórios**
```bash
Sintomas:
- Apenas /api/whatsapp/webhook dá 404
- Outras rotas /api funcionam

Solução:
1. Verificar estrutura exata: app/api/whatsapp/webhook/route.ts
2. Verificar se há arquivos conflitantes
3. Verificar se há charset issues
```

---

## 🔧 Debug Passo a Passo

### Passo 1: **Verificar Build**
```bash
# Local
npm run build
npm start

# Testar
curl "http://localhost:3000/api/whatsapp/webhook"

# Se funcionar em build local → problema no deploy
```

### Passo 2: **Verificar Vercel Logs**
```bash
# Dashboard Vercel → Functions → api/whatsapp/webhook
# Procurar por:
- 404 errors
- Build errors
- Function not found
```

### Passo 3: **Verificar Arquivos no Deploy**
```bash
# No Vercel, verificar se o arquivo existe:
# 1. Deployments → Latest
# 2. View Function Logs
# 3. Verificar se route.ts foi incluído
```

---

## 🚀 Soluções Rápidas

### Solução 1: **Forçar Deploy**
```bash
# Commit e push
git add app/api/whatsapp/webhook/route.ts
git commit -m "Fix WhatsApp webhook route"
git push origin main

# Forçar novo deploy no Vercel
```

### Solução 2: **Recriar Arquivo**
```bash
# Se arquivo estiver corrompido
rm app/api/whatsapp/webhook/route.ts
# Recriar com conteúdo mínimo
```

### Solução 3: **Verificar App Router**
```bash
# Adicionar ao next.config.js:
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: []
  }
  // Garantir que não há appDir: false
};
```

---

## 📊 Logs Esperados

### **Se Funcionar**:
```bash
# Local
[2026-04-06T...] WHATSAPP_WEBHOOK VERIFICATION_ATTEMPT: {...}

# Vercel
Function logs mostram: WHATSAPP_WEBHOOK VERIFICATION_ATTEMPT
```

### **Se Der 404**:
```bash
# Vercel
Function logs mostram: 404 Not Found
Ou: Function not found
Ou: No such function
```

---

## 🆘️ Resposta de Emergência

### **Se NADA funcionar**:
1. **Criar rota simples**:
```typescript
// app/api/simple/route.ts
export async function GET() {
  return new Response("SIMPLE WORKS");
}
```

2. **Testar /api/simple**:
```bash
curl "https://advnoemia.com.br/api/simple"
```

3. **Se /api/simple funcionar** → Problema no webhook
4. **Se /api/simple der 404** → Problema no Next.js

---

## 🎯 Checklist Final

### ✅ **Antes de Testar**:
- [ ] Arquivo em: `app/api/whatsapp/webhook/route.ts`
- [ ] Export functions: GET e POST
- [ ] Sem arquivos conflitantes
- [ ] Deploy atualizado no Vercel

### ✅ **Testes em Ordem**:
1. [ ] `curl https://advnoemia.com.br/api/test`
2. [ ] `curl https://advnoemia.com.br/api/whatsapp/webhook`
3. [ ] `curl "https://advnoemia.com.br/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=noeminia_whatsapp_verify_2026&hub.challenge=test"`

### ✅ **Se Funcionar**:
- [ ] Configurar Meta Developers
- [ ] Testar mensagem real no WhatsApp

---

## 🔍 Diagnóstico Rápido

### **Baseado nos resultados**:

#### `/api/test` funciona + `/api/whatsapp/webhook` dá 404:
```bash
Causa: Problema específico do webhook
Solução: Recriar arquivo webhook
```

#### `/api/test` dá 404:
```bash
Causa: Problema no Next.js App Router
Solução: Verificar next.config.js, build, deploy
```

#### Ambos funcionam:
```bash
Causa: Configuração Meta incorreta
Solução: Verificar URL e token no Meta Developers
```

---

**Com este guia, vamos identificar EXATAMENTE por que está dando 404!** 🔍
