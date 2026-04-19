# Fase 10 - Consolidacao final da plataforma

## Objetivo

Fechar a consolidacao operacional, tecnica e estrategica do core do projeto ADVNOEMIA / Imperio Juridico sem expandir escopo de produto. A fase focou em observabilidade, funil, SEO editorial em subpasta, governanca pratica e readiness de operacao real.

## O que foi implementado

### Observabilidade tecnica

- helper de request observability em `apps/portal-backend/lib/observability/request-observability.ts`
- `x-request-id`, `x-correlation-id` e `server-timing` nas respostas observadas
- logging estruturado e sanitizado para:
  - `GET /api/health`
  - `POST /api/public/events`
  - `POST /api/public/triage`
  - `GET /api/analytics/acquisition`

### Metricas de negocio e funil

- taxonomia central de eventos em `apps/portal-backend/lib/analytics/funnel-events.ts`
- normalizacao unica de:
  - `source`
  - `medium`
  - `campaign`
  - `topic`
  - `contentId`
  - `landingPage`
  - `referrer`
- mascaramento de chaves sensiveis no payload de analytics
- agregacao operacional em `apps/portal-backend/lib/services/acquisition-analytics.ts`
- painel interno consolidado em `apps/portal-backend/app/internal/analytics/page.tsx`

### SEO tecnico e editorial em subpasta

- estrutura editorial real em:
  - `apps/portal-backend/app/artigos/page.tsx`
  - `apps/portal-backend/app/artigos/[slug]/page.tsx`
- catalogo reaproveitando o acervo real em HTML do repositorio via `lib/site/article-content.ts`
- `robots.ts` e `sitemap.ts` atualizados
- canonical, Open Graph, Twitter cards e schema `Article` + `BreadcrumbList`
- interlinking entre artigos relacionados
- cards editoriais destacados na home para reduzir paginas orfas e melhorar distribuicao de autoridade

### Seguranca e hardening final

- headers de seguranca adicionados no `next.config.ts`
- consolidacao do mascaramento de payload sensivel na telemetria
- rota legada de analytics substituida por uma superficie staff-only baseada nas tabelas atuais do backend

### Automações e auditabilidade

- eventos publicos e de triagem agora usam a mesma normalizacao central antes de persistir em `product_events`
- dados de funil e operacao passam a refletir tabelas reais (`product_events`, `intake_requests`, `appointments`, `notifications_outbox`, `automation_dispatches`)

### CI e governanca

- novo smoke `npm run smoke:phase10`
- CI atualizado para rodar esse smoke alem do baseline anterior
- lint expandido de forma controlada para as novas areas:
  - `app/artigos`
  - `lib/analytics`
  - `lib/site`
  - `lib/observability`
  - `lib/services/acquisition-analytics.ts`

## Fluxos criticos consolidados

### Captura e funil

1. Home publica registra visita relevante.
2. CTA e interacoes de conteudo usam taxonomia unica.
3. Triagem publica persiste contexto operacional em `intake_requests`.
4. `product_events` guarda o rastro consolidado do funil.
5. `/api/analytics/acquisition` agrega os dados para leitura operacional real.

### Conteudo editorial

1. Artigos agora existem em subpasta real (`/artigos/...`).
2. Cada artigo possui canonical e schema coerentes.
3. A pagina registra `strategic_content_viewed`.
4. CTA de artigo leva para triagem com `topic` e `contentId` rastreaveis.

## Novas validacoes e testes

- `apps/portal-backend/tests/phase10-hardening.test.ts`
- smoke de Fase 10
- lint/typecheck/test/build revalidados

## Variaveis e configuracao relevantes

- `NEXT_PUBLIC_PUBLIC_SITE_URL` passa a ser preferida para canonical/sitemap editorial quando existir
- `NEXT_PUBLIC_APP_URL` continua sendo a referencia do host real do portal/backend

## Como validar localmente

```powershell
npm run lint
npm run typecheck
npm run test
npm run smoke:phase10
npm run operations:verify
npm run operations:verify:ci
npm run operations:evidence:ci
npm run build
```

## O que ainda permanece manual ou externo

- prova final de convergencia duravel em ambiente real com acesso administrativo Supabase
- aplicacao da migration `20260418120000_phase3_durable_abuse_controls.sql` em todos os ambientes relevantes
- rotacao externa/manual de segredos de providers e secrets internos
- fechamento do warning `MODULE_TYPELESS_PACKAGE_JSON`

## Riscos remanescentes

- parte da prova operacional final ainda depende de credenciais externas que nao ficam no repositorio
- o restante da divida de lint fora do perimetro backend permanece fora do baseline desta fase
- a superficie editorial ainda depende do catalogo manual atual; um CMS futuro so faz sentido depois de estabilizar o core

## Proximos passos recomendados

1. Executar a prova real de convergencia duravel com evidencias anexadas ao fluxo de release.
2. Fechar as rotacoes externas/manual de segredos com revalidacao pos-rotacao.
3. Avaliar consolidacao do warning `MODULE_TYPELESS_PACKAGE_JSON` sem quebrar os scripts atuais.
4. Expandir a leitura editorial operacional com dados reais de performance, sem introduzir stack de analytics pesado antes da necessidade.
