# CONFIGURAÇÃO DE DEPLOY - ARQUITETURA CORRIGIDA

## ARQUITETURA FINAL
- **Domínio Principal**: `advnoemia.com.br` → Site estático (index.html)
- **Portal/Subdomínio**: `portal.advnoemia.com.br` → App Next.js (apps/portal-backend)

## CONFIGURAÇÃO VERCEL

### 1. DOMÍNIO PRINCIPAL (advnoemia.com.br)
- **Framework**: Static Site (nenhum)
- **Build Command**: Não necessário
- **Output Directory**: Public root (.)
- **Entrada**: index.html
- **APIs**: Mantidas via rewrites em vercel.json

### 2. PORTAL (portal.advnoemia.com.br)
- **Framework**: Next.js
- **Build Command**: `npm run build` (em apps/portal-backend)
- **Output Directory**: `.next`
- **Root Directory**: `apps/portal-backend`

## PASSOS PARA CONFIGURAR NO VERCEL

### DOMÍNIO PRINCIPAL:
1. Criar projeto "advnoemia-site"
2. Apontar para repositório principal
3. Framework: Other / Static Site
4. Build Settings: Deixar em branco
5. Adicionar domínio: advnoemia.com.br

### PORTAL:
1. Criar projeto "advnoemia-portal"
2. Apontar para mesmo repositório
3. Root Directory: apps/portal-backend
4. Framework: Next.js
5. Adicionar domínio: portal.advnoemia.com.br

## VARIÁVEIS DE AMBIENTE

### Portal (apps/portal-backend):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- META_VERIFY_TOKEN
- META_APP_SECRET
- WHATSAPP_VERIFY_TOKEN
- WHATSAPP_APP_SECRET
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- OPENAI_API_KEY

### Site Principal:
- Nenhuma (estático)

## RESULTADO ESPERADO
- advnoemia.com.br → Site institucional original
- portal.advnoemia.com.br → Portal/clientes com NoêmIA
- APIs funcionando em ambos os domínios
- Separação clara de responsabilidades
