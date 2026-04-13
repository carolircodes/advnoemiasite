-- Hardening de schema para canais/webhooks sem quebrar ambientes já existentes.
-- Objetivo:
-- 1. garantir metadata em conversation_sessions;
-- 2. garantir colunas de idempotência em processed_webhook_events;
-- 3. manter compatibilidade com ambientes antigos.

alter table if exists public.conversation_sessions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.conversation_sessions.metadata is
  'Metadados operacionais do roteador de canais, handoff e contexto adicional da sessão.';

alter table if exists public.processed_webhook_events
  add column if not exists external_user_id varchar(255);

alter table if exists public.processed_webhook_events
  add column if not exists payload_hash varchar(64);

alter table if exists public.processed_webhook_events
  add column if not exists response_sent_at timestamptz;

comment on column public.processed_webhook_events.external_user_id is
  'Identificador externo do usuário no canal para auditoria e troubleshooting.';

comment on column public.processed_webhook_events.payload_hash is
  'Hash opcional do payload para auditoria e deduplicação auxiliar.';

comment on column public.processed_webhook_events.response_sent_at is
  'Timestamp em que o sistema concluiu a resposta outbound para o evento processado.';

create index if not exists idx_processed_webhook_events_message_id
  on public.processed_webhook_events (channel, external_message_id);

create index if not exists idx_processed_webhook_events_external_user
  on public.processed_webhook_events (channel, external_user_id);
