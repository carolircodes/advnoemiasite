alter table if exists public.conversation_sessions
  drop constraint if exists conversation_sessions_channel_check;

alter table if exists public.conversation_sessions
  add constraint conversation_sessions_channel_check
    check (channel in ('instagram', 'whatsapp', 'site', 'portal', 'telegram'));

alter table if exists public.processed_webhook_events
  drop constraint if exists processed_webhook_events_channel_check;

alter table if exists public.processed_webhook_events
  add constraint processed_webhook_events_channel_check
    check (channel in ('instagram', 'whatsapp', 'telegram'));

create index if not exists idx_conversation_sessions_telegram_surface
  on public.conversation_sessions (
    channel,
    ((metadata -> 'telegram' ->> 'surface')),
    last_message_at desc nulls last
  )
  where channel = 'telegram';

create index if not exists idx_conversation_messages_telegram_surface
  on public.conversation_messages (
    session_id,
    message_type,
    created_at desc
  )
  where message_type in ('telegram_private', 'telegram_group_signal');
