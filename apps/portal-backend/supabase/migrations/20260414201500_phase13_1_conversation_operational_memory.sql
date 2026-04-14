alter table if exists public.conversation_messages
  add column if not exists received_at timestamptz;

alter table if exists public.conversation_messages
  add column if not exists failed_at timestamptz;

create table if not exists public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  note_body text not null,
  note_kind text not null default 'operational'
    check (note_kind in ('operational', 'next_action', 'sensitive', 'context')),
  is_sensitive boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_conversation_notes_session_created
  on public.conversation_notes (session_id, created_at desc);

create index if not exists idx_conversation_notes_kind
  on public.conversation_notes (note_kind, created_at desc);

comment on table public.conversation_notes is
  'Memoria operacional interna por thread, sem exposicao ao cliente.';

comment on column public.conversation_messages.received_at is
  'Momento efetivo em que a mensagem foi recebida pelo sistema interno.';

comment on column public.conversation_messages.failed_at is
  'Momento em que o envio falhou, quando aplicavel.';
