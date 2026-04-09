-- =====================================================
-- SCHEMA COMPLETO DO SUPABASE - NOEMIA ADVOCACIA (VERSÃO CORRIGIDA)
-- =====================================================
-- Execute este SQL no SQL Editor do Supabase Cloud
-- ORDEM CORRIGIDA: Funções criadas APÓS as tabelas que elas usam
-- =====================================================

-- 1. EXTENSIONS E TIPOS
create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('admin', 'advogada', 'cliente');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.case_area as enum ('previdenciario', 'consumidor_bancario', 'familia', 'civil');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.client_status as enum (
    'triagem',
    'convite-enviado',
    'aguardando-primeiro-acesso',
    'ativo',
    'aguardando-documentos',
    'em-acompanhamento',
    'encerrado'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.case_status as enum (
    'triagem',
    'documentos',
    'analise',
    'em-andamento',
    'aguardando-retorno',
    'concluido'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_visibility as enum ('client', 'internal');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- 2. TABELAS PRINCIPAIS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role public.app_role not null default 'cliente',
  is_active boolean not null default true,
  invited_at timestamptz,
  first_login_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_members (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  title text not null default 'Advogada',
  receives_notification_emails boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  cpf text not null unique,
  phone text not null,
  notes text,
  status public.client_status not null default 'convite-enviado',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  area public.case_area not null,
  title text not null,
  summary text,
  status public.case_status not null default 'triagem',
  priority text not null default 'normal',
  assigned_staff_id uuid references public.profiles(id),
  last_public_update_at timestamptz,
  last_status_changed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  category text not null,
  visibility public.document_visibility not null default 'client',
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  title text not null,
  instructions text,
  due_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text not null default 'online',
  location text,
  notes text,
  status public.appointment_status not null default 'scheduled',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointment_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  changed_fields text[] not null default '{}'::text[],
  previous_state jsonb not null default '{}'::jsonb,
  current_state jsonb not null default '{}'::jsonb,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  public_summary text,
  payload jsonb not null default '{}'::jsonb,
  triggered_by uuid references public.profiles(id),
  should_notify_client boolean not null default true,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel text not null default 'email',
  recipient_profile_id uuid references public.profiles(id),
  recipient_email text not null,
  subject text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  related_table text not null,
  related_id uuid,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default timezone('utc', now()),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- 3. TABELAS NOEMIA - TRIAGEM
create table if not exists public.noemia_triage_summaries (
  id uuid default gen_random_uuid() primary key,
  session_id text not null unique,
  channel text not null check (channel in ('instagram', 'whatsapp', 'site', 'portal')),
  user_id text not null,
  triage_data jsonb not null default '{}',
  is_hot_lead boolean not null default false,
  needs_human_attention boolean not null default false,
  handoff_reason text,
  internal_summary text not null default '',
  user_friendly_summary text not null default '',
  attended_by text,
  attended_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. TABELAS DE CONVERSAÇÃO
create table if not exists public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  channel varchar(20) not null check (channel in ('instagram', 'whatsapp', 'site', 'portal')),
  external_user_id varchar(255) not null,
  external_thread_id varchar(255),
  lead_name varchar(255),
  lead_stage varchar(50) default 'initial',
  case_area varchar(50),
  current_intent varchar(100),
  last_summary text,
  handoff_to_human boolean default false,
  last_inbound_at timestamp with time zone,
  last_outbound_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  external_message_id varchar(255),
  role varchar(20) not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  direction varchar(20) not null check (direction in ('inbound', 'outbound')),
  metadata_json jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.processed_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel varchar(20) not null check (channel in ('instagram', 'whatsapp')),
  external_event_id varchar(255) not null,
  external_message_id varchar(255),
  response_sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 5. TABELAS DE AUTOMAÇÃO
create table if not exists public.keyword_automation_events (
  id uuid default gen_random_uuid() primary key,
  comment_id text not null,
  user_id text not null,
  keyword text not null,
  theme text not null,
  area text not null,
  dm_sent boolean not null default false,
  session_created boolean not null default false,
  processed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.automation_dispatches (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  entity_type text not null,
  entity_key text not null,
  notification_id uuid,
  dispatched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- 6. TABELAS DE INTAKE E EVENTOS
create table if not exists public.intake_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  city text,
  case_area public.case_area not null,
  current_stage text not null default 'ainda-nao-iniciei',
  urgency_level text not null default 'moderada',
  preferred_contact_period text not null default 'horario-comercial',
  case_summary text not null,
  consent_accepted boolean not null default false,
  source_path text,
  status text not null default 'new',
  internal_notes text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  event_group text not null default 'conversion',
  page_path text,
  session_id text,
  profile_id uuid references public.profiles(id) on delete set null,
  intake_request_id uuid references public.intake_requests(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

-- 7. TABELA DE LOGS ESTRUTURADOS
create table if not exists public.structured_logs (
  timestamp timestamptz not null default timezone('utc', now()),
  level text not null,
  service text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb
);

-- 8. ÍNDICES PRINCIPAIS
create index if not exists clients_profile_id_idx on public.clients(profile_id);
create index if not exists cases_client_id_idx on public.cases(client_id);
create index if not exists case_events_case_id_idx on public.case_events(case_id, occurred_at desc);
create index if not exists documents_case_id_idx on public.documents(case_id);
create index if not exists appointments_client_id_idx on public.appointments(client_id, starts_at);
create index if not exists notifications_outbox_status_idx on public.notifications_outbox(status, available_at);

-- Índices NoemIA
create index if not exists idx_noemia_triage_summaries_session_id on public.noemia_triage_summaries(session_id);
create index if not exists idx_noemia_triage_summaries_channel on public.noemia_triage_summaries(channel);
create index if not exists idx_noemia_triage_summaries_user_id on public.noemia_triage_summaries(user_id);
create index if not exists idx_noemia_triage_summaries_is_hot_lead on public.noemia_triage_summaries(is_hot_lead);
create index if not exists idx_noemia_triage_summaries_needs_attention on public.noemia_triage_summaries(needs_human_attention);
create index if not exists idx_noemia_triage_summaries_created_at on public.noemia_triage_summaries(created_at);
create index if not exists idx_noemia_triage_summaries_updated_at on public.noemia_triage_summaries(updated_at);
create index if not exists idx_noemia_triage_summaries_area on public.noemia_triage_summaries using gin ((triage_data->'area'));
create index if not exists idx_noemia_triage_summaries_urgency on public.noemia_triage_summaries using gin ((triage_data->'nivel_urgencia'));

-- Índices Conversação
create unique index if not exists idx_conversation_sessions_unique on public.conversation_sessions (channel, external_user_id);
create index if not exists idx_conversation_sessions_last_activity on public.conversation_sessions (last_inbound_at desc, last_outbound_at desc);
create index if not exists idx_conversation_messages_session_created on public.conversation_messages (session_id, created_at desc);
create index if not exists idx_conversation_messages_external_id on public.conversation_messages (external_message_id);

-- Índices Automação
create index if not exists idx_keyword_automation_events_comment_id on public.keyword_automation_events(comment_id);
create index if not exists idx_keyword_automation_events_user_id on public.keyword_automation_events(user_id);
create index if not exists idx_keyword_automation_events_keyword on public.keyword_automation_events(keyword);
create index if not exists idx_keyword_automation_events_theme on public.keyword_automation_events(theme);
create index if not exists idx_keyword_automation_events_processed_at on public.keyword_automation_events(processed_at);

create unique index if not exists automation_dispatches_rule_entity_key_idx on public.automation_dispatches(rule_key, entity_type, entity_key);
create index if not exists automation_dispatches_created_at_idx on public.automation_dispatches(created_at desc);

-- 9. FUNÇÕES AUXILIARES (DEPOIS DAS TABELAS)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select profiles.role
      from public.profiles as profiles
      where profiles.id = auth.uid()
    ),
    'cliente'::public.app_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'advogada'), false);
$$;

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inferred_role public.app_role;
  has_explicit_role boolean;
begin
  has_explicit_role := new.raw_user_meta_data ->> 'role' in ('admin', 'advogada', 'cliente');

  inferred_role :=
    case
      when has_explicit_role
        then (new.raw_user_meta_data ->> 'role')::public.app_role
      else 'cliente'::public.app_role
    end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    inferred_role,
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role =
          case
            when has_explicit_role then excluded.role
            else public.profiles.role
          end,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

-- Trigger NoemIA
create or replace function update_noemia_triage_summaries_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- 10. TRIGGERS
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_members_updated_at on public.staff_members;
create trigger set_staff_members_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_cases_updated_at on public.cases;
create trigger set_cases_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

drop trigger if exists set_document_requests_updated_at on public.document_requests;
create trigger set_document_requests_updated_at
before update on public.document_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- Trigger NoemIA
create trigger trigger_update_noemia_triage_summaries_updated_at
    before update on public.noemia_triage_summaries
    for each row
    execute function update_noemia_triage_summaries_updated_at();

-- Trigger Auth
drop trigger if exists on_auth_user_changed on auth.users;
create trigger on_auth_user_changed
after insert or update on auth.users
for each row execute function public.sync_profile_from_auth();

-- 11. PERMISSÕES E RLS
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

-- Habilitar RLS nas tabelas principais
alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.document_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.case_events enable row level security;
alter table public.notifications_outbox enable row level security;
alter table public.audit_logs enable row level security;

-- Habilitar RLS nas tabelas NoemIA
alter table public.noemia_triage_summaries enable row level security;
alter table public.conversation_sessions enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.keyword_automation_events enable row level security;
alter table public.automation_dispatches enable row level security;
alter table public.intake_requests enable row level security;
alter table public.product_events enable row level security;

-- 12. POLICIES RLS - Tabelas Principais
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff"
on public.profiles
for select
using (auth.uid() = id or public.is_staff());

drop policy if exists "profiles_manage_staff" on public.profiles;
create policy "profiles_manage_staff"
on public.profiles
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "staff_members_staff_only" on public.staff_members;
create policy "staff_members_staff_only"
on public.staff_members
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "clients_select_own_or_staff" on public.clients;
create policy "clients_select_own_or_staff"
on public.clients
for select
using (profile_id = auth.uid() or public.is_staff());

drop policy if exists "clients_manage_staff" on public.clients;
create policy "clients_manage_staff"
on public.clients
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "cases_select_own_or_staff" on public.cases;
create policy "cases_select_own_or_staff"
on public.cases
for select
using (
  public.is_staff() or exists (
    select 1
    from public.clients
    where public.clients.id = public.cases.client_id
      and public.clients.profile_id = auth.uid()
  )
);

drop policy if exists "cases_manage_staff" on public.cases;
create policy "cases_manage_staff"
on public.cases
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "documents_select_own_or_staff" on public.documents;
create policy "documents_select_own_or_staff"
on public.documents
for select
using (
  public.is_staff() or (
    visibility = 'client' and exists (
      select 1
      from public.cases
      join public.clients on public.clients.id = public.cases.client_id
      where public.cases.id = public.documents.case_id
        and public.clients.profile_id = auth.uid()
    )
  )
);

drop policy if exists "documents_manage_staff" on public.documents;
create policy "documents_manage_staff"
on public.documents
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "document_requests_select_own_or_staff" on public.document_requests;
create policy "document_requests_select_own_or_staff"
on public.document_requests
for select
using (
  public.is_staff() or exists (
    select 1
    from public.cases
    join public.clients on public.clients.id = public.cases.client_id
    where public.cases.id = public.document_requests.case_id
      and public.clients.profile_id = auth.uid()
  )
);

drop policy if exists "document_requests_manage_staff" on public.document_requests;
create policy "document_requests_manage_staff"
on public.document_requests
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "appointments_select_own_or_staff" on public.appointments;
create policy "appointments_select_own_or_staff"
on public.appointments
for select
using (
  public.is_staff() or exists (
    select 1
    from public.clients
    where public.clients.id = public.appointments.client_id
      and public.clients.profile_id = auth.uid()
  )
);

drop policy if exists "appointments_manage_staff" on public.appointments;
create policy "appointments_manage_staff"
on public.appointments
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "case_events_select_own_or_staff" on public.case_events;
create policy "case_events_select_own_or_staff"
on public.case_events
for select
using (
  public.is_staff() or exists (
    select 1
    from public.clients
    where public.clients.id = public.case_events.client_id
      and public.clients.profile_id = auth.uid()
  )
);

drop policy if exists "case_events_manage_staff" on public.case_events;
create policy "case_events_manage_staff"
on public.case_events
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "notifications_outbox_staff_only" on public.notifications_outbox;
create policy "notifications_outbox_staff_only"
on public.notifications_outbox
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "audit_logs_staff_only" on public.audit_logs;
create policy "audit_logs_staff_only"
on public.audit_logs
for all
using (public.is_staff())
with check (public.is_staff());

-- 13. POLICIES RLS - Tabelas NoemIA
drop policy if exists "noemia_triage_summaries_staff_only" on public.noemia_triage_summaries;
create policy "noemia_triage_summaries_staff_only"
on public.noemia_triage_summaries
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "conversation_sessions_staff_only" on public.conversation_sessions;
create policy "conversation_sessions_staff_only"
on public.conversation_sessions
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "conversation_messages_staff_only" on public.conversation_messages;
create policy "conversation_messages_staff_only"
on public.conversation_messages
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "keyword_automation_events_staff_only" on public.keyword_automation_events;
create policy "keyword_automation_events_staff_only"
on public.keyword_automation_events
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "automation_dispatches_staff_only" on public.automation_dispatches;
create policy "automation_dispatches_staff_only"
on public.automation_dispatches
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "intake_requests_staff_only" on public.intake_requests;
create policy "intake_requests_staff_only"
on public.intake_requests
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "product_events_staff_only" on public.product_events;
create policy "product_events_staff_only"
on public.product_events
for all
using (public.is_staff())
with check (public.is_staff());

-- =====================================================
-- SCHEMA COMPLETO CRIADO COM SUCESSO! (VERSÃO CORRIGIDA)
-- =====================================================
