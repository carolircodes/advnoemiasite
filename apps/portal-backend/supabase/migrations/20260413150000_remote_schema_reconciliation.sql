-- Reconciliacao oficial do schema remoto com a trilha governada da Fase 7.
-- Fecha drift estrutural sem afrouxar schema gate nem editar o banco fora da trilha.

alter table if exists public.conversation_sessions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.processed_webhook_events
  add column if not exists external_user_id varchar(255);

alter table if exists public.processed_webhook_events
  add column if not exists payload_hash varchar(64);

alter table if exists public.processed_webhook_events
  add column if not exists processed_at timestamptz not null default timezone('utc', now());

alter table if exists public.processed_webhook_events
  add column if not exists response_sent_at timestamptz;

create index if not exists idx_processed_webhook_events_processed_at
  on public.processed_webhook_events (processed_at desc);

create index if not exists idx_processed_webhook_events_message_id
  on public.processed_webhook_events (channel, external_message_id);

create index if not exists idx_processed_webhook_events_external_user
  on public.processed_webhook_events (channel, external_user_id);

alter table if exists public.noemia_triage_summaries
  add column if not exists conversation_status varchar(50);

alter table if exists public.noemia_triage_summaries
  add column if not exists explanation_stage varchar(50);

alter table if exists public.noemia_triage_summaries
  add column if not exists consultation_stage varchar(50);

alter table if exists public.noemia_triage_summaries
  add column if not exists report_data jsonb not null default '{}'::jsonb;

alter table if exists public.noemia_triage_summaries
  add column if not exists lawyer_notification_generated boolean not null default false;

alter table if exists public.noemia_triage_summaries
  add column if not exists ai_active_on_channel boolean not null default true;

alter table if exists public.noemia_triage_summaries
  add column if not exists operational_handoff_recorded boolean not null default false;

alter table if exists public.noemia_triage_summaries
  add column if not exists human_followup_pending boolean not null default false;

alter table if exists public.noemia_triage_summaries
  add column if not exists follow_up_ready boolean not null default false;

create index if not exists idx_noemia_triage_summaries_conversation_status
  on public.noemia_triage_summaries (conversation_status);

create index if not exists idx_noemia_triage_summaries_consultation_stage
  on public.noemia_triage_summaries (consultation_stage);

create index if not exists idx_noemia_triage_summaries_report_data
  on public.noemia_triage_summaries using gin (report_data);

create index if not exists idx_noemia_triage_summaries_explanation_stage
  on public.noemia_triage_summaries (explanation_stage);

create index if not exists idx_noemia_triage_summaries_ai_active
  on public.noemia_triage_summaries (ai_active_on_channel, operational_handoff_recorded);

create index if not exists idx_noemia_triage_summaries_followup_ready
  on public.noemia_triage_summaries (human_followup_pending, follow_up_ready);

create table if not exists public.follow_up_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  pipeline_id uuid,
  channel text not null check (channel in ('whatsapp', 'instagram', 'site', 'portal')),
  message_type text not null,
  status text not null default 'draft',
  content text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  external_message_id text,
  approved_by text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.follow_up_messages
  add column if not exists client_id uuid;

alter table if exists public.follow_up_messages
  add column if not exists pipeline_id uuid;

alter table if exists public.follow_up_messages
  add column if not exists channel text;

alter table if exists public.follow_up_messages
  add column if not exists message_type text;

alter table if exists public.follow_up_messages
  add column if not exists status text not null default 'draft';

alter table if exists public.follow_up_messages
  add column if not exists content text;

alter table if exists public.follow_up_messages
  add column if not exists scheduled_for timestamptz;

alter table if exists public.follow_up_messages
  add column if not exists sent_at timestamptz;

alter table if exists public.follow_up_messages
  add column if not exists delivered_at timestamptz;

alter table if exists public.follow_up_messages
  add column if not exists read_at timestamptz;

alter table if exists public.follow_up_messages
  add column if not exists replied_at timestamptz;

alter table if exists public.follow_up_messages
  add column if not exists external_message_id text;

alter table if exists public.follow_up_messages
  add column if not exists approved_by text;

alter table if exists public.follow_up_messages
  add column if not exists error_message text;

alter table if exists public.follow_up_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.follow_up_messages
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table if exists public.follow_up_messages
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists follow_up_messages_client_created_idx
  on public.follow_up_messages (client_id, created_at desc);

create index if not exists follow_up_messages_pipeline_status_idx
  on public.follow_up_messages (pipeline_id, status, created_at desc);

create index if not exists follow_up_messages_scheduled_idx
  on public.follow_up_messages (status, scheduled_for asc);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'clients'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'follow_up_messages_client_id_fkey'
  ) then
    alter table public.follow_up_messages
      add constraint follow_up_messages_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete cascade;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'client_pipeline'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'follow_up_messages_pipeline_id_fkey'
  ) then
    alter table public.follow_up_messages
      add constraint follow_up_messages_pipeline_id_fkey
      foreign key (pipeline_id) references public.client_pipeline(id) on delete set null;
  end if;
end $$;

alter table if exists public.follow_up_messages enable row level security;

drop policy if exists "follow_up_messages_staff_only" on public.follow_up_messages;
create policy "follow_up_messages_staff_only"
on public.follow_up_messages
for all
using (public.is_staff())
with check (public.is_staff());

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    execute 'drop trigger if exists set_follow_up_messages_updated_at on public.follow_up_messages';
    execute 'create trigger set_follow_up_messages_updated_at before update on public.follow_up_messages for each row execute function public.set_updated_at()';
  end if;
end $$;
