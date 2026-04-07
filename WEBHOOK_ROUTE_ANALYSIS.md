# Instagram Webhook - Análise Completa de Rotas e Domínios

## 🎯 ANÁLISE DA ESTRUTURA DO PROJETO

### 1. Estrutura do Monorepo
```
advnoemiasite/                    # Root do monorepo
├── vercel.json                   # Configuração principal do Vercel
├── package.json                  # Workspace monorepo
└── apps/portal-backend/          # App principal (onde está o webhook)
    ├── app/api/meta/webhook/     # 🎯 WEBHOOK DO INSTAGRAM AQUI
    └── vercel.json              # Configuração secundária
```

### 2. Configuração Vercel (root/vercel.json)
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": "apps/portal-backend/.next",
  "installCommand": "npm install",
  "rootDirectory": "apps/portal-backend",  # 🎯 APP PRINCIPAL
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

## 🌐 URLs E DOMÍNIOS

### URL Exata do Webhook:
```
https://advnoemia.com.br/api/meta/webhook
```

### Como o roteamento funciona:
1. **Domínio:** `advnoemia.com.br` → Projeto no Vercel
2. **Path:** `/api/meta/webhook` → `apps/portal-backend/app/api/meta/webhook/route.ts`
3. **Rewrite:** `/api/(.*)` → `/api/$1` (mantém o path)

### Domínio `api.advnoemia.com.br`:
❌ **NÃO EXISTE** ou não está apontando para este projeto

## 🔍 VERIFICAÇÕES IMPLEMENTADAS

### 1. Logs Muito Visíveis (GET e POST)
```typescript
// Logs adicionados em ambos os handlers:
console.log('\n' + '='.repeat(80));
console.log('🚀 INSTAGRAM WEBHOOK HIT - POST REQUEST RECEIVED');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🌐 URL:', request.url);
console.log('🔑 Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
console.log('👤 User-Agent:', request.headers.get('user-agent'));
console.log('📍 IP Origin:', request.headers.get('x-forwarded-for'));
console.log('='.repeat(80) + '\n');
```

### 2. GET de Verificação com Debug Completo
```typescript
console.log('🔍 VERIFICATION PARAMETERS:');
console.log('   Mode:', mode);
console.log('   Token:', token === VERIFY_TOKEN ? '✅ VALID' : '❌ INVALID');
console.log('   Expected Token:', VERIFY_TOKEN);
console.log('   Received Token:', token);
console.log('   Has Challenge:', !!challenge);
console.log('   Challenge:', challenge);
```

## 🎯 CONCLUSÕES

### ✅ O que está correto:
1. **Rota do webhook:** `/api/meta/webhook` existe e está implementada
2. **Estrutura do projeto:** Monorepo com app principal em `apps/portal-backend`
3. **Configuração Vercel:** Aponta para o diretório correto
4. **Logs:** Implementados e muito visíveis

### ❌ Possíveis problemas:
1. **Domínio `api.advnoemia.com.br`:** Não existe ou aponta para outro lugar
2. **URL na Meta:** Pode estar configurada com domínio errado
3. **Variáveis de ambiente:** `META_VERIFY_TOKEN` pode não estar configurada

## 📋 VERIFICAÇÕES NECESSÁRIAS

### 1. Verificar URL configurada na Meta:
- Deve ser: `https://advnoemia.com.br/api/meta/webhook`
- NÃO deve ser: `https://api.advnoemia.com.br/api/meta/webhook`

### 2. Testar GET de verificação:
```
https://advnoemia.com.br/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test123
```

### 3. Monitorar logs no Vercel:
- Procurar pelos logs visíveis com emojis 🚀 e 🔍
- Verificar se aparece "WEBHOOK VERIFICATION SUCCESS"

## 🔧 ARQUIVOS ALTERADOS

### app/api/meta/webhook/route.ts
- ✅ Logs muito visíveis no POST (antes de parsing)
- ✅ Logs muito visíveis no GET (verificação)
- ✅ Debug completo de parâmetros
- ✅ Informações de IP, headers, user-agent

## 🎯 PRÓXIMOS PASSOS

1. **Verificar URL na Meta:** Confirmar se está `https://advnoemia.com.br/api/meta/webhook`
2. **Testar GET manual:** Usar URL acima para testar verificação
3. **Monitorar logs Vercel:** Procurar pelos logs com emojis
4. **Se não aparecer logs:** URL está errada ou domínio aponta para outro projeto
