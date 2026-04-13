-- Fase 8 fechamento: garantir no remoto os indexes de aquisicao social
-- com timestamp unico e execucao idempotente.

create index if not exists product_events_group_key_occurred_idx
  on public.product_events (event_group, event_key, occurred_at desc);

create index if not exists product_events_intake_group_occurred_idx
  on public.product_events (intake_request_id, event_group, occurred_at desc);

create index if not exists product_events_payload_gin_idx
  on public.product_events using gin (payload);

create index if not exists conversation_sessions_metadata_gin_idx
  on public.conversation_sessions using gin (metadata);
