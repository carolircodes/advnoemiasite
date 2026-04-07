# Correção de Assinaturas de Rotas Next.js 15

## Problema
Erro de build no Next.js 15.5.14:
```
Type error: Route ".../route.ts" has an invalid "GET" export:
Type "{ params: { userId: string; }; }" is not a valid type for the function's second argument.
```

## Causa
No Next.js 15, parâmetros dinâmicos em rotas de API devem ser `Promise` e não objetos síncronos.

## Correções Aplicadas

### 1. Arquivo: `apps/portal-backend/app/api/internal/leads/[userId]/conversations/route.ts`

**ANTES (Incorreto):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  // ...
}
```

**DEPOIS (Corrigido):**
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  // ...
}
```

### 2. Arquivo: `apps/portal-backend/app/api/documents/[documentId]/route.ts`

**JÁ ESTAVA CORRETO:**
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await context.params;
  // ...
}
```

## Verificação de Outras Rotas

### Rotas de API Verificadas:
- ✅ `apps/portal-backend/app/api/cron/notifications/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/documents/[documentId]/route.ts` (correto)
- ✅ `apps/portal-backend/app/api/health/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/appointments/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/clients/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/document-requests/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/documents/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/email-preview/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/events/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/internal/leads/[userId]/conversations/route.ts` (corrigido)
- ✅ `apps/portal-backend/app/api/internal/leads/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/meta/test/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/meta/webhook/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/noemia/chat/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/noemia/suggestions/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/public/events/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/public/triage/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/api/worker/notifications/process/route.ts` (sem parâmetros)
- ✅ `apps/portal-backend/app/auth/callback/route.ts` (sem parâmetros)

### Páginas Verificadas:
- ✅ `apps/portal-backend/app/internal/advogada/casos/[id]/page.tsx` (já correto)
- ✅ `apps/portal-backend/app/internal/advogada/clientes/[id]/page.tsx` (já correto)

## Padrão Correto Next.js 15

### Para Rotas de API:
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paramName: string }> }
) {
  const { paramName } = await context.params;
  // lógica da rota
}
```

### Para Páginas:
```typescript
export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ paramName: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { paramName } = await params;
  // lógica da página
}
```

## Resumo

- **1 rota corrigida**: `leads/[userId]/conversations/route.ts`
- **1 rota já correta**: `documents/[documentId]/route.ts`
- **17 rotas sem parâmetros**: não precisam de alteração
- **2 páginas já corretas**: usando `Promise` nos parâmetros

**Build agora deve funcionar sem erros!** ✅
