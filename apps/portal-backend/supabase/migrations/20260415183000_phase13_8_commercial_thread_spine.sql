alter table if exists public.client_channels
  add column if not exists external_thread_id text;

alter table if exists public.client_channels
  add column if not exists display_name text;

alter table if exists public.client_channels
  add column if not exists last_session_id uuid references public.conversation_sessions(id) on delete set null;

alter table if exists public.client_channels
  add column if not exists match_source text;

alter table if exists public.client_channels
  add column if not exists match_confidence numeric(5,2);

alter table if exists public.client_channels
  add column if not exists is_primary boolean not null default false;

create index if not exists idx_client_channels_last_session
  on public.client_channels (last_session_id, last_contact_at desc);

alter table if exists public.conversation_sessions
  add column if not exists client_channel_id uuid references public.client_channels(id) on delete set null;

create index if not exists idx_conversation_sessions_client_channel
  on public.conversation_sessions (client_channel_id, updated_at desc);

alter table if exists public.client_pipeline
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null;

alter table if exists public.client_pipeline
  add column if not exists owner_assigned_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists next_step text;

alter table if exists public.client_pipeline
  add column if not exists next_step_due_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists waiting_on text not null default 'none';

alter table if exists public.client_pipeline
  add column if not exists follow_up_state text not null default 'none';

alter table if exists public.client_pipeline
  add column if not exists follow_up_reason text;

alter table if exists public.client_pipeline
  add column if not exists last_thread_session_id uuid references public.conversation_sessions(id) on delete set null;

alter table if exists public.client_pipeline
  add column if not exists last_commercial_note_at timestamptz;

create index if not exists idx_client_pipeline_owner
  on public.client_pipeline (owner_profile_id, updated_at desc);

create index if not exists idx_client_pipeline_follow_up_state
  on public.client_pipeline (follow_up_state, next_follow_up_at asc nulls last, updated_at desc);

create index if not exists idx_client_pipeline_last_thread
  on public.client_pipeline (last_thread_session_id, updated_at desc);

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

alter table if exists public.follow_up_responses enable row level security;

drop policy if exists "follow_up_responses_staff_only" on public.follow_up_responses;
create policy "follow_up_responses_staff_only"
on public.follow_up_responses
for all
using (public.is_staff())
with check (public.is_staff());
