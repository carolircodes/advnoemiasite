alter table if exists public.conversation_sessions
  drop constraint if exists conversation_sessions_channel_check;

alter table if exists public.conversation_sessions
  add constraint conversation_sessions_channel_check
  check (channel in ('instagram', 'facebook', 'whatsapp', 'site', 'portal', 'telegram'));

alter table if exists public.processed_webhook_events
  drop constraint if exists processed_webhook_events_channel_check;

alter table if exists public.processed_webhook_events
  add constraint processed_webhook_events_channel_check
  check (channel in ('instagram', 'facebook', 'whatsapp', 'telegram'));

alter table if exists public.noemia_triage_summaries
  drop constraint if exists noemia_triage_summaries_channel_check;

alter table if exists public.noemia_triage_summaries
  add constraint noemia_triage_summaries_channel_check
  check (channel in ('instagram', 'facebook', 'whatsapp', 'site', 'portal'));

alter table if exists public.follow_up_messages
  drop constraint if exists follow_up_messages_channel_check;

alter table if exists public.follow_up_messages
  add constraint follow_up_messages_channel_check
  check (channel in ('whatsapp', 'instagram', 'facebook', 'site', 'portal'));
