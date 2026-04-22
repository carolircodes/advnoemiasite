# Arquitetura Real e Source of Truth

Este documento e a referencia canonica de superficies, ownership e deploy do repositorio.

## Regra principal

- `apps/portal-backend` e a unica aplicacao Next.js viva do monorepo.
- a raiz do repositorio hospeda o site institucional estatico e historico documental.
- novos endpoints, webhooks, fluxos internos e regras de negocio devem nascer em `apps/portal-backend`.
- `app/api` na raiz nao e source of truth de runtime. Ele existe apenas como compatibilidade historica e sentinela de legado.

## Superficies reais

### 1. Site institucional estatico

- local: raiz do repositorio (`index.html`, paginas `.html`, `assets/`, `artigos/`, `robots.txt`, `sitemap.xml`)
- responsabilidade: marketing institucional, paginas estaticas, conteudo legado do dominio principal
- status: ativo para o deploy do site principal
- deploy canonico: projeto Vercel `advnoemiasite`, Root Directory `.`
- observacao: nao usar a raiz como prova de deploy do portal

### 2. Portal operacional e backend principal

- local: `apps/portal-backend`
- responsabilidade: portal autenticado, site publico do portal, APIs internas/publicas, webhooks, pagamentos, NoemIA, readiness e operacao
- status: ativo em runtime
- deploy canonico: projeto Vercel `advnoemiaportal`, Root Directory `apps/portal-backend`
- observacao: esta pasta e a unica fonte valida para mudancas de produto/backend do portal

### 3. APIs publicas do portal

- local: `apps/portal-backend/app/api/public/*`, `apps/portal-backend/app/api/health/*`, partes publicas de `apps/portal-backend/app/api/noemia/*`
- responsabilidade: intake publico, tracking publico endurecido, healthcheck e experiencia publica controlada
- status: ativo em runtime
- ownership: backend do portal

### 4. APIs internas e operacionais

- local: `apps/portal-backend/app/api/internal/*`, `apps/portal-backend/app/internal/*`
- responsabilidade: operacao interna, CRM, diagnostico, readiness, paineis e automacoes internas
- status: ativo em runtime
- ownership: backend do portal

### 5. Integracoes e webhooks

- local:
  - `apps/portal-backend/app/api/meta/webhook/route.ts`
  - `apps/portal-backend/app/api/whatsapp/webhook/route.ts`
  - `apps/portal-backend/app/api/telegram/webhook/route.ts`
  - `apps/portal-backend/app/api/internal/youtube/route.ts`
  - `apps/portal-backend/app/api/youtube/oauth/callback/route.ts`
  - `apps/portal-backend/app/api/payment/webhook/route.ts`
  - `apps/portal-backend/app/api/cron/notifications/route.ts`
  - `apps/portal-backend/app/api/worker/notifications/process/route.ts`
- responsabilidade: canais, pagamentos, cron, workers e integracoes externas
- status: ativo em runtime
- ownership: backend do portal

### 6. Conteudo/editorial do portal

- local: `apps/portal-backend/app/artigos/*` e `apps/portal-backend/lib/site/article-content.ts`
- responsabilidade: artigos e taxonomia de conteudo no app Next do portal
- status: ativo em runtime
- observacao: convive com HTMLs estaticos legados na raiz; o time precisa escolher uma estrategia editorial unica antes de escalar

### 7. Legado e historico

- local:
  - `app/api/*` na raiz
  - `docs/debug/*`
  - relatorios `*_REPORT.md`, `*_IMPLEMENTATION.md`, `*_AUDIT*.md` na raiz e em `apps/portal-backend`
- responsabilidade: historico de diagnostico, correcoes antigas e sentinelas de compatibilidade
- status: nao canonico
- regra: esses arquivos podem ajudar investigacao, mas nao definem arquitetura, deploy ou runtime atual

## Source of truth por dominio

- portal/backend: `apps/portal-backend/app`, `apps/portal-backend/lib`, `apps/portal-backend/components`
- site publico do portal: `apps/portal-backend/app/page.tsx`, `apps/portal-backend/app/triagem`, `apps/portal-backend/app/noemia`, `apps/portal-backend/components`
- integracoes/webhooks: `apps/portal-backend/app/api/*/route.ts`
- YouTube: `apps/portal-backend/app/api/internal/youtube/route.ts`, `apps/portal-backend/app/api/youtube/oauth/callback/route.ts`, `apps/portal-backend/lib/services/youtube-orchestration.ts`, `apps/portal-backend/docs/YOUTUBE_OPERATIONS.md`
- pagamentos: `apps/portal-backend/app/api/payment/*`, `apps/portal-backend/lib/payment/*`
- IA/NoemIA: `apps/portal-backend/app/api/noemia/*`, `apps/portal-backend/lib/ai/*`, `apps/portal-backend/lib/site/*`
- conteudo/editorial do portal: `apps/portal-backend/app/artigos/*`, `apps/portal-backend/lib/site/article-content.ts`
- operacoes/readiness: `apps/portal-backend/scripts/verify-backend-operations.ts`, `apps/portal-backend/lib/diagnostics/*`, `apps/portal-backend/docs/*`
- configs de deploy:
  - site principal: `vercel.json` da raiz
  - portal: `apps/portal-backend/vercel.json`
  - CI: `.github/workflows/ci.yml`

## Fronteiras que nao devem ser violadas

- nao adicionar novas rotas em `app/api` na raiz
- nao tratar `docs/debug/*` como documentacao oficial
- nao usar HTML/CSS/JS da raiz como implementacao do portal
- nao usar o dominio `advnoemia.com.br` como validacao de deploy do portal
- nao importar `createAdminSupabaseClient()` para codigo client-side; uso privilegiado deve ficar em rotas server-side e servicos internos controlados

## Clientes privilegiados

- cliente admin Supabase: `apps/portal-backend/lib/supabase/admin.ts`
- uso aceitavel agora: rotas server-side, webhooks, jobs, readiness e servicos internos do portal
- uso que exige cuidado futuro: servicos amplos demais com regra de negocio + acesso admin misturados
- regra operacional: toda entrada publica deve validar permissao/secret antes de tocar em client privilegiado

## Leitura rapida para deploy

- mexeu no portal, backend, webhook, pagamento, NoemIA ou readiness: olhar `apps/portal-backend`
- mexeu no site institucional estatico: olhar a raiz
- esta em duvida: o lugar certo quase sempre e `apps/portal-backend`
