alter table if exists public.clients
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

alter table if exists public.clients
  add column if not exists source_intake_request_id uuid;

alter table if exists public.clients
  add column if not exists name text;

alter table if exists public.clients
  add column if not exists full_name text;

alter table if exists public.clients
  add column if not exists phone text;

alter table if exists public.clients
  add column if not exists instagram_id text;

alter table if exists public.clients
  add column if not exists email text;

alter table if exists public.clients
  add column if not exists is_client boolean not null default false;

alter table if exists public.clients
  add column if not exists merge_status text not null default 'active';

alter table if exists public.clients
  add column if not exists merged_into_client_id uuid references public.clients(id) on delete set null;

alter table if exists public.clients
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.clients
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table if exists public.clients
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists idx_clients_merge_status
  on public.clients (merge_status, updated_at desc);

create index if not exists idx_clients_phone
  on public.clients (phone);

create index if not exists idx_clients_instagram_id
  on public.clients (instagram_id);

create index if not exists idx_clients_email
  on public.clients (email);

create table if not exists public.client_channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null,
  external_user_id text not null,
  external_thread_id text,
  display_name text,
  last_session_id uuid references public.conversation_sessions(id) on delete set null,
  match_source text,
  match_confidence numeric(5,2),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  last_contact_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_client_channels_client
  on public.client_channels (client_id, last_contact_at desc);

create index if not exists idx_client_channels_external
  on public.client_channels (channel, external_user_id);

create index if not exists idx_client_channels_thread
  on public.client_channels (external_thread_id);

create index if not exists idx_client_channels_last_session
  on public.client_channels (last_session_id, last_contact_at desc);

create table if not exists public.client_pipeline (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  stage text not null default 'new_lead',
  lead_temperature text not null default 'cold',
  source_channel text,
  assigned_to uuid references public.profiles(id) on delete set null,
  priority integer not null default 0,
  priority_score integer not null default 0,
  area_interest text,
  tags text[] not null default '{}'::text[],
  notes text,
  summary text,
  follow_up_status text not null default 'none',
  follow_up_state text not null default 'none',
  follow_up_reason text,
  waiting_on text not null default 'none',
  first_contact_at timestamptz not null default timezone('utc', now()),
  last_contact_at timestamptz not null default timezone('utc', now()),
  next_follow_up_at timestamptz,
  next_step text,
  next_step_due_at timestamptz,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  owner_assigned_at timestamptz,
  converted_to_client_at timestamptz,
  consultation_offered_at timestamptz,
  consultation_scheduled_at timestamptz,
  proposal_sent_at timestamptz,
  contract_pending_at timestamptz,
  closed_won_at timestamptz,
  closed_lost_at timestamptz,
  last_thread_session_id uuid references public.conversation_sessions(id) on delete set null,
  last_commercial_note_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_client_pipeline_stage
  on public.client_pipeline (stage, updated_at desc);

create index if not exists idx_client_pipeline_follow_up_state
  on public.client_pipeline (follow_up_state, next_follow_up_at asc nulls last, updated_at desc);

create index if not exists idx_client_pipeline_owner
  on public.client_pipeline (owner_profile_id, updated_at desc);

create index if not exists idx_client_pipeline_last_thread
  on public.client_pipeline (last_thread_session_id, updated_at desc);

alter table if exists public.conversation_sessions
  add column if not exists client_id uuid references public.clients(id) on delete set null;

alter table if exists public.conversation_sessions
  add column if not exists client_channel_id uuid references public.client_channels(id) on delete set null;

create index if not exists idx_conversation_sessions_client
  on public.conversation_sessions (client_id, updated_at desc);

create index if not exists idx_conversation_sessions_client_channel
  on public.conversation_sessions (client_channel_id, updated_at desc);

alter table if exists public.conversation_notes
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

alter table if exists public.conversation_notes
  add column if not exists pipeline_id uuid references public.client_pipeline(id) on delete set null;

create index if not exists idx_conversation_notes_client
  on public.conversation_notes (client_id, created_at desc);

create index if not exists idx_conversation_notes_pipeline
  on public.conversation_notes (pipeline_id, created_at desc);

create table if not exists public.follow_up_responses (
  id uuid primary key default gen_random_uuid(),
  follow_up_message_id uuid not null references public.follow_up_messages(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  pipeline_id uuid references public.client_pipeline(id) on delete set null,
  channel text not null,
  external_message_id text,
  response_content text not null,
  response_type text not null default 'text',
  received_at timestamptz not null,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_follow_up_responses_message
  on public.follow_up_responses (follow_up_message_id, received_at desc);

create index if not exists idx_follow_up_responses_client
  on public.follow_up_responses (client_id, received_at desc);

create or replace function public.get_canonical_client_id(client_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := client_uuid;
  next_id uuid;
begin
  if current_id is null then
    return null;
  end if;

  loop
    select merged_into_client_id
      into next_id
      from public.clients
     where id = current_id;

    exit when next_id is null or next_id = current_id;
    current_id := next_id;
  end loop;

  return current_id;
end;
$$;

alter table if exists public.follow_up_responses enable row level security;

drop policy if exists "follow_up_responses_staff_only" on public.follow_up_responses;
create policy "follow_up_responses_staff_only"
on public.follow_up_responses
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
    execute 'drop trigger if exists set_client_channels_updated_at on public.client_channels';
    execute 'create trigger set_client_channels_updated_at before update on public.client_channels for each row execute function public.set_updated_at()';

    execute 'drop trigger if exists set_client_pipeline_updated_at on public.client_pipeline';
    execute 'create trigger set_client_pipeline_updated_at before update on public.client_pipeline for each row execute function public.set_updated_at()';
  end if;
end $$;
