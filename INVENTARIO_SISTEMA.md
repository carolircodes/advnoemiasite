# Inventário do Sistema

## Resumo quantitativo

- workspace principal de aplicação: `apps/portal-backend`
- páginas App Router: `41`
- rotas API `route.ts`: `40`
- serviços em `lib/services`: `67`
- migrations Supabase: `43`
- componentes em `components`: `26`

## Stack e dependências principais

### Core

- `next`
- `react`
- `react-dom`
- `typescript`
- `zod`
- `@supabase/ssr`
- `@supabase/supabase-js`
- `openai`
- `mercadopago`

### Infra e build

- `tailwindcss`
- `postcss`
- `autoprefixer`

## Estrutura principal do repositório

### Raiz

- `app/` com rotas legadas de webhook/teste
- `apps/portal-backend/` como app operacional principal
- `artigos/`, `entrada/`, `portal/` e vários `.html` estáticos históricos
- `lib/` raiz com camada antiga `platforms`
- `tests/` raiz com testes/scripts antigos de integrações
- dezenas de relatórios `.md` operacionais e de correção na raiz

### Workspace principal

- `apps/portal-backend/app`
- `apps/portal-backend/components`
- `apps/portal-backend/lib`
- `apps/portal-backend/supabase`
- `apps/portal-backend/scripts`
- `apps/portal-backend/tests`
- `apps/portal-backend/docs`

## Páginas existentes no app principal

### Públicas / institucionais

- `/`
- `/noemia`
- `/triagem`
- `/portal/login`
- `/auth/login`
- `/auth/esqueci-senha`
- `/auth/atualizar-senha`
- `/auth/primeiro-acesso`
- `/exclusao-de-dados`
- `/politica-de-privacidade`
- `/termos-de-uso`
- `/pagamento/sucesso`
- `/pagamento/pendente`
- `/pagamento/falha`
- `/examples/tracking-links`

### Cliente

- `/cliente`
- `/cliente/ecossistema`
- `/cliente/ecossistema/beneficios`
- `/cliente/ecossistema/comunidade`
- `/cliente/ecossistema/conteudo`
- `/documentos`
- `/agenda`

### Internas / equipe

- `/internal/advogada`
- `/internal/advogada/acquisition`
- `/internal/advogada/agenda`
- `/internal/advogada/atendimento`
- `/internal/advogada/automacoes`
- `/internal/advogada/canais`
- `/internal/advogada/casos`
- `/internal/advogada/casos/novo`
- `/internal/advogada/casos/[id]`
- `/internal/advogada/clientes/[id]`
- `/internal/advogada/configuracoes`
- `/internal/advogada/documentos`
- `/internal/advogada/ecossistema`
- `/internal/advogada/inteligencia`
- `/internal/advogada/leads`
- `/internal/advogada/operacional`
- `/internal/advogada/performance`
- `/internal/advogada/preview-emails`
- `/internal/analytics`

## APIs existentes

### Públicas

- `/api/public/triage`
- `/api/public/events`
- `/api/acquisition/events`
- `/api/analytics/acquisition`
- `/api/health`

### Portal / internas

- `/api/internal/acquisition`
- `/api/internal/appointments`
- `/api/internal/clients`
- `/api/internal/clients/merge`
- `/api/internal/conversations`
- `/api/internal/document-requests`
- `/api/internal/documents`
- `/api/internal/email-preview`
- `/api/internal/events`
- `/api/internal/follow-up`
- `/api/internal/leads`
- `/api/internal/leads/[userId]/conversations`
- `/api/internal/operational`
- `/api/internal/performance`
- `/api/internal/telegram/distribution`

### IA / Noemia

- `/api/noemia/chat`
- `/api/noemia/payment`
- `/api/noemia/suggestions`
- `/api/noemia/triage/all`
- `/api/noemia/triage/attend`
- `/api/noemia/triage/hot-leads`
- `/api/noemia/triage/needs-attention`
- `/api/noemia/triage/report`

### Pagamentos e assinatura

- `/api/payment/create`
- `/api/payment/webhook`
- `/api/ecosystem/subscription/start`
- `/api/ecosystem/subscription/manage`
- `/api/ecosystem/subscription/webhook`

### Webhooks e workers

- `/api/meta/webhook`
- `/api/whatsapp/webhook`
- `/api/telegram/webhook`
- `/api/cron/notifications`
- `/api/worker/notifications/process`
- `/api/documents/[documentId]`
- `/api/leads/create`

## Serviços e módulos relevantes

### Autenticação e acesso

- `lib/auth/access-control.ts`
- `lib/auth/guards.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`

### Intake e growth

- `lib/services/public-intake.ts`
- `lib/services/register-event.ts`
- `lib/acquisition/acquisition-service.ts`
- `lib/middleware/acquisition-middleware.ts`
- `lib/services/lead-capture.ts`

### Portal jurídico core

- `lib/services/create-client.ts`
- `lib/services/manage-clients.ts`
- `lib/services/manage-cases.ts`
- `lib/services/manage-documents.ts`
- `lib/services/manage-appointments.ts`
- `lib/services/dashboard.ts`
- `lib/services/intelligence.ts`

### IA e conversa

- `lib/ai/noemia-core.ts`
- `lib/ai/message-classifier.ts`
- `lib/ai/response-composer.ts`
- `lib/ai/state-manager.ts`
- `lib/services/channel-conversation-router.ts`
- `lib/services/conversation-persistence.ts`
- `lib/services/conversation-inbox.ts`
- `lib/services/anti-spam-guard.ts`

### Canais e integrações

- `lib/meta/instagram-service.ts`
- `lib/meta/facebook-service.ts`
- `lib/meta/whatsapp-service.ts`
- `lib/telegram/telegram-service.ts`
- `lib/services/telegram-conversation.ts`
- `lib/services/telegram-distribution.ts`
- `lib/services/comment-automation.ts`
- `lib/services/instagram-comment-automation.ts`
- `lib/services/instagram-keyword-automation.ts`

### Notificações

- `lib/notifications/outbox.ts`
- `lib/notifications/email-delivery.ts`
- `lib/services/process-notifications.ts`
- `lib/notifications/whatsapp-delivery.ts`

### Comercial e monetização

- `lib/services/commercial-funnel.ts`
- `lib/services/commercial-closing.ts`
- `lib/services/commercial-conversion.ts`
- `lib/payment/payment-service.ts`
- `lib/payment/pricing.ts`
- `lib/services/revenue-architecture.ts`
- `lib/services/revenue-telemetry.ts`

### Ecossistema expandido

- `lib/services/ecosystem-platform.ts`
- `lib/services/ecosystem-billing.ts`
- `lib/services/ecosystem-journey.ts`
- `lib/services/ecosystem-community-operations.ts`
- `lib/services/ecosystem-telemetry.ts`

## Modelagem de banco identificada

### Tabelas core jurídicas

- `profiles`
- `staff_members`
- `clients`
- `cases`
- `documents`
- `document_requests`
- `appointments`
- `case_events`
- `notifications_outbox`
- `audit_logs`
- `intake_requests`
- `product_events`
- `appointment_history`
- `automation_dispatches`

### Conversas e canais

- `conversation_sessions`
- `conversation_messages`
- `processed_webhook_events`
- `conversation_events`
- tabelas auxiliares de follow-up / leads / comercial indicadas por services e migrations

### Monetização

- `payments`
- `follow_up_events`
- `noemia_leads`
- `noemia_lead_conversations`

### Ecossistema

- `ecosystem_catalog_items`
- `ecosystem_plan_tiers`
- `ecosystem_plan_benefits`
- `ecosystem_subscriptions`
- `ecosystem_access_grants`
- `ecosystem_content_tracks`
- `ecosystem_content_modules`
- `ecosystem_content_units`
- `ecosystem_content_assets`
- `ecosystem_content_progress`
- `ecosystem_communities`
- `ecosystem_community_memberships`

## Integrações existentes

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- OpenAI
- WhatsApp Cloud API
- Instagram
- Facebook
- Telegram
- Mercado Pago
- SMTP/Resend para notificações

## Scripts e operações

### Scripts oficiais

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run validate:schema`
- `npm run validate:channels`
- `npm run bootstrap:admin`
- `npm run notifications:process`
- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:db:reset`
- `npm run supabase:status`

### Scripts de fase/expansão

- `prepare:phase12:*`
- `materialize:phase12:*`
- `bootstrap:phase12:live`
- `telemetry:phase12:smoke`

## Testes existentes

### `apps/portal-backend/tests`

- `commercial-appointment.test.ts`
- `commercial-closing.test.ts`
- `commercial-conversion.test.ts`
- `payment-pricing.test.ts`

### `tests/` raiz

- `test_hybrid_system.js`
- `test_instagram_integration.js`
- `test_meta_webhook.js`
- `test_whatsapp_fallback.js`
- `test_whatsapp_fixed.js`
- `test_whatsapp_integration.js`

Observação:

- não há `test` script oficial no `package.json`
- não há runner de testes explicitamente configurado no workspace principal

## Infra e deploy relevantes

- `next.config.ts`
- `middleware.ts`
- `vercel.json` na raiz e no app
- `supabase/config.toml`
- `_redirects` na raiz

## Automações e artefatos sensíveis/versionados

Encontrados no repositório:

- logs e artefatos históricos na raiz
- perfis/artefatos Codex ignorados por `.gitignore`
- arquivos versionados de teste/pagamento:
  - `apps/portal-backend/mp-card-token.json`
  - `apps/portal-backend/mp-payment.json`
  - `apps/portal-backend/mp-test-user.json`

## Pontos de entrada do usuário

### Entrada pública

- home `/`
- chat/concierge `/noemia`
- triagem ancorada na home via `/triagem`
- CTAs para atendimento, triagem e portal

### Entrada autenticada

- login `/portal/login`
- callback `/auth/callback`
- primeiro acesso `/auth/primeiro-acesso`
- área do cliente `/cliente`
- área interna `/internal/advogada`

### Entrada multicanal

- WhatsApp webhook
- Instagram/Facebook webhook
- Telegram webhook
- site chat via `/api/noemia/chat`
