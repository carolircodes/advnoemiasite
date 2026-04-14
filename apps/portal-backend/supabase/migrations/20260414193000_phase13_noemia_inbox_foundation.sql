alter table if exists public.conversation_sessions
  add column if not exists thread_status text not null default 'new'
    check (thread_status in ('new', 'unread', 'waiting_human', 'waiting_client', 'ai_active', 'handoff', 'closed', 'archived'));

alter table if exists public.conversation_sessions
  add column if not exists waiting_for text not null default 'human'
    check (waiting_for in ('human', 'client', 'ai', 'none'));

alter table if exists public.conversation_sessions
  add column if not exists owner_mode text not null default 'ai'
    check (owner_mode in ('ai', 'human', 'hybrid'));

alter table if exists public.conversation_sessions
  add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

alter table if exists public.conversation_sessions
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high'));

alter table if exists public.conversation_sessions
  add column if not exists unread_count integer not null default 0;

alter table if exists public.conversation_sessions
  add column if not exists handoff_state text not null default 'none'
    check (handoff_state in ('none', 'requested', 'active', 'resolved'));

alter table if exists public.conversation_sessions
  add column if not exists handoff_reason text;

alter table if exists public.conversation_sessions
  add column if not exists ai_enabled boolean not null default true;

alter table if exists public.conversation_sessions
  add column if not exists last_message_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists last_message_preview text;

alter table if exists public.conversation_sessions
  add column if not exists last_message_direction text
    check (last_message_direction in ('inbound', 'outbound'));

alter table if exists public.conversation_sessions
  add column if not exists last_human_reply_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists last_ai_reply_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists closed_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists archived_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists internal_notes text;

alter table if exists public.conversation_sessions
  add column if not exists tags jsonb not null default '[]'::jsonb;

create index if not exists idx_conversation_sessions_thread_status
  on public.conversation_sessions (thread_status, priority, updated_at desc);

create index if not exists idx_conversation_sessions_waiting_for
  on public.conversation_sessions (waiting_for, updated_at desc);

create index if not exists idx_conversation_sessions_handoff_state
  on public.conversation_sessions (handoff_state, updated_at desc);

create index if not exists idx_conversation_sessions_owner_user
  on public.conversation_sessions (owner_user_id, updated_at desc);

create index if not exists idx_conversation_sessions_last_message_at
  on public.conversation_sessions (last_message_at desc nulls last);

alter table if exists public.conversation_messages
  add column if not exists message_type text not null default 'text';

alter table if exists public.conversation_messages
  add column if not exists sender_type text not null default 'contact'
    check (sender_type in ('contact', 'ai', 'human', 'system'));

alter table if exists public.conversation_messages
  add column if not exists send_status text not null default 'received'
    check (send_status in ('received', 'pending', 'sent', 'delivered', 'read', 'failed'));

alter table if exists public.conversation_messages
  add column if not exists delivery_status text;

alter table if exists public.conversation_messages
  add column if not exists is_read boolean not null default false;

alter table if exists public.conversation_messages
  add column if not exists read_at timestamptz;

alter table if exists public.conversation_messages
  add column if not exists error_message text;

alter table if exists public.conversation_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

create index if not exists idx_conversation_messages_sender_type
  on public.conversation_messages (session_id, sender_type, created_at desc);

create index if not exists idx_conversation_messages_send_status
  on public.conversation_messages (send_status, created_at desc);

create table if not exists public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'system'
    check (actor_type in ('system', 'ai', 'human')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_label text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_conversation_events_session_created
  on public.conversation_events (session_id, created_at desc);

create index if not exists idx_conversation_events_event_type
  on public.conversation_events (event_type, created_at desc);

comment on column public.conversation_sessions.thread_status is
  'Estado operacional oficial da thread na inbox da NoemIA.';

comment on column public.conversation_sessions.waiting_for is
  'Indica se a thread aguarda humano, cliente, IA ou ninguem.';

comment on column public.conversation_sessions.owner_mode is
  'Ownership corrente da thread: IA, humano ou acompanhamento hibrido.';

comment on column public.conversation_sessions.priority is
  'Prioridade operacional enxuta para a fila premium da inbox.';

comment on column public.conversation_sessions.handoff_state is
  'Estado de handoff entre IA e humano sem quebrar a continuidade da thread.';

comment on column public.conversation_messages.sender_type is
  'Origem semantica da mensagem para leitura historica clara.';

comment on table public.conversation_events is
  'Trilha historica de ownership, handoff, leitura, resposta humana e mudancas de estado.';
