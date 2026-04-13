-- Recuperacao oficial da camada de leads da NoemIA.
-- Objetivo:
-- 1. oficializar public.noemia_leads conforme o codigo vivo;
-- 2. recompor as superficies adjacentes usadas pelo fluxo (conversas e aquisicao);
-- 3. remover dependencia de schema legado fora da trilha oficial.

create table if not exists public.noemia_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  message text,
  status text not null default 'new',
  lead_status text not null default 'new',
  funnel_stage text not null default 'top',
  urgency text not null default 'medium',
  platform text,
  platform_user_id text,
  username text,
  legal_area text,
  last_message text,
  last_response text,
  wants_human boolean not null default false,
  should_schedule boolean not null default false,
  summary text,
  suggested_action text,
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  conversation_count integer not null default 0,
  operational_status text not null default 'new',
  source text,
  campaign text,
  topic text,
  content_id text,
  acquisition_metadata jsonb not null default '{}'::jsonb,
  acquisition_tags text[] not null default array[]::text[],
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  payment_id uuid,
  payment_status text,
  payment_requested_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_rejected_at timestamptz,
  merged_into uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.noemia_leads
  add column if not exists name text;
alter table if exists public.noemia_leads
  add column if not exists email text;
alter table if exists public.noemia_leads
  add column if not exists phone text;
alter table if exists public.noemia_leads
  add column if not exists message text;
alter table if exists public.noemia_leads
  add column if not exists status text not null default 'new';
alter table if exists public.noemia_leads
  add column if not exists lead_status text not null default 'new';
alter table if exists public.noemia_leads
  add column if not exists funnel_stage text not null default 'top';
alter table if exists public.noemia_leads
  add column if not exists urgency text not null default 'medium';
alter table if exists public.noemia_leads
  add column if not exists platform text;
alter table if exists public.noemia_leads
  add column if not exists platform_user_id text;
alter table if exists public.noemia_leads
  add column if not exists username text;
alter table if exists public.noemia_leads
  add column if not exists legal_area text;
alter table if exists public.noemia_leads
  add column if not exists last_message text;
alter table if exists public.noemia_leads
  add column if not exists last_response text;
alter table if exists public.noemia_leads
  add column if not exists wants_human boolean not null default false;
alter table if exists public.noemia_leads
  add column if not exists should_schedule boolean not null default false;
alter table if exists public.noemia_leads
  add column if not exists summary text;
alter table if exists public.noemia_leads
  add column if not exists suggested_action text;
alter table if exists public.noemia_leads
  add column if not exists first_contact_at timestamptz;
alter table if exists public.noemia_leads
  add column if not exists last_contact_at timestamptz;
alter table if exists public.noemia_leads
  add column if not exists conversation_count integer not null default 0;
alter table if exists public.noemia_leads
  add column if not exists operational_status text not null default 'new';
alter table if exists public.noemia_leads
  add column if not exists source text;
alter table if exists public.noemia_leads
  add column if not exists campaign text;
alter table if exists public.noemia_leads
  add column if not exists topic text;
alter table if exists public.noemia_leads
  add column if not exists content_id text;
alter table if exists public.noemia_leads
  add column if not exists acquisition_metadata jsonb not null default '{}'::jsonb;
alter table if exists public.noemia_leads
  add column if not exists acquisition_tags text[] not null default array[]::text[];
alter table if exists public.noemia_leads
  add column if not exists utm_source text;
alter table if exists public.noemia_leads
  add column if not exists utm_medium text;
alter table if exists public.noemia_leads
  add column if not exists utm_campaign text;
alter table if exists public.noemia_leads
  add column if not exists utm_term text;
alter table if exists public.noemia_leads
  add column if not exists utm_content text;
alter table if exists public.noemia_leads
  add column if not exists payment_id uuid;
alter table if exists public.noemia_leads
  add column if not exists payment_status text;
alter table if exists public.noemia_leads
  add column if not exists payment_requested_at timestamptz;
alter table if exists public.noemia_leads
  add column if not exists payment_confirmed_at timestamptz;
alter table if exists public.noemia_leads
  add column if not exists payment_rejected_at timestamptz;
alter table if exists public.noemia_leads
  add column if not exists merged_into uuid;
alter table if exists public.noemia_leads
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.noemia_leads
  add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table if exists public.noemia_leads
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

comment on table public.noemia_leads is
  'Camada oficial de leads da NoemIA, usada por aquisicao, comercial, pagamentos e painels internos.';

create index if not exists noemia_leads_created_at_idx
  on public.noemia_leads (created_at desc);

create index if not exists noemia_leads_last_contact_at_idx
  on public.noemia_leads (last_contact_at desc nulls last);

create index if not exists noemia_leads_phone_created_idx
  on public.noemia_leads (phone, created_at desc);

create index if not exists noemia_leads_platform_user_idx
  on public.noemia_leads (platform_user_id);

create index if not exists noemia_leads_status_idx
  on public.noemia_leads (status, lead_status, funnel_stage);

create index if not exists noemia_leads_operational_idx
  on public.noemia_leads (operational_status, updated_at desc);

create index if not exists noemia_leads_source_topic_idx
  on public.noemia_leads (source, topic, created_at desc);

create index if not exists noemia_leads_campaign_idx
  on public.noemia_leads (campaign, created_at desc);

create index if not exists noemia_leads_metadata_gin_idx
  on public.noemia_leads using gin (metadata);

create index if not exists noemia_leads_acquisition_metadata_gin_idx
  on public.noemia_leads using gin (acquisition_metadata);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'payments'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'noemia_leads_payment_id_fkey'
  ) then
    alter table public.noemia_leads
      add constraint noemia_leads_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'noemia_leads_merged_into_fkey'
  ) then
    alter table public.noemia_leads
      add constraint noemia_leads_merged_into_fkey
      foreign key (merged_into) references public.noemia_leads(id) on delete set null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    execute 'drop trigger if exists set_noemia_leads_updated_at on public.noemia_leads';
    execute 'create trigger set_noemia_leads_updated_at before update on public.noemia_leads for each row execute function public.set_updated_at()';
  end if;
end $$;

create table if not exists public.noemia_lead_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  message text not null,
  sender text not null,
  message_type text not null default 'message',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.noemia_lead_conversations
  add column if not exists lead_id uuid;
alter table if exists public.noemia_lead_conversations
  add column if not exists message text;
alter table if exists public.noemia_lead_conversations
  add column if not exists sender text;
alter table if exists public.noemia_lead_conversations
  add column if not exists message_type text not null default 'message';
alter table if exists public.noemia_lead_conversations
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.noemia_lead_conversations
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists noemia_lead_conversations_lead_created_idx
  on public.noemia_lead_conversations (lead_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'noemia_lead_conversations_lead_id_fkey'
  ) then
    alter table public.noemia_lead_conversations
      add constraint noemia_lead_conversations_lead_id_fkey
      foreign key (lead_id) references public.noemia_leads(id) on delete cascade;
  end if;
end $$;

create table if not exists public.acquisition_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  event_type text not null,
  source text,
  campaign text,
  topic text,
  content_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.acquisition_events
  add column if not exists lead_id uuid;
alter table if exists public.acquisition_events
  add column if not exists event_type text;
alter table if exists public.acquisition_events
  add column if not exists source text;
alter table if exists public.acquisition_events
  add column if not exists campaign text;
alter table if exists public.acquisition_events
  add column if not exists topic text;
alter table if exists public.acquisition_events
  add column if not exists content_id text;
alter table if exists public.acquisition_events
  add column if not exists utm_source text;
alter table if exists public.acquisition_events
  add column if not exists utm_medium text;
alter table if exists public.acquisition_events
  add column if not exists utm_campaign text;
alter table if exists public.acquisition_events
  add column if not exists utm_term text;
alter table if exists public.acquisition_events
  add column if not exists utm_content text;
alter table if exists public.acquisition_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.acquisition_events
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists acquisition_events_lead_created_idx
  on public.acquisition_events (lead_id, created_at desc);

create index if not exists acquisition_events_type_created_idx
  on public.acquisition_events (event_type, created_at desc);

create index if not exists acquisition_events_source_created_idx
  on public.acquisition_events (source, created_at desc);

create index if not exists acquisition_events_topic_created_idx
  on public.acquisition_events (topic, created_at desc);

create index if not exists acquisition_events_campaign_created_idx
  on public.acquisition_events (campaign, created_at desc);

create index if not exists acquisition_events_metadata_gin_idx
  on public.acquisition_events using gin (metadata);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'acquisition_events_lead_id_fkey'
  ) then
    alter table public.acquisition_events
      add constraint acquisition_events_lead_id_fkey
      foreign key (lead_id) references public.noemia_leads(id) on delete cascade;
  end if;
end $$;

grant select, insert, update, delete on public.noemia_leads to authenticated, service_role;
grant select, insert, update, delete on public.noemia_lead_conversations to authenticated, service_role;
grant select, insert, update, delete on public.acquisition_events to authenticated, service_role;
