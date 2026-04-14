alter table if exists public.conversation_sessions
  add column if not exists next_action_hint text;

alter table if exists public.conversation_sessions
  add column if not exists priority_source text not null default 'inferred'
    check (priority_source in ('manual', 'inferred', 'hybrid'));

alter table if exists public.conversation_sessions
  add column if not exists sensitivity_level text not null default 'normal'
    check (sensitivity_level in ('low', 'normal', 'high'));

alter table if exists public.conversation_sessions
  add column if not exists follow_up_status text not null default 'none'
    check (follow_up_status in ('none', 'pending', 'due', 'overdue', 'resolved', 'converted'));

alter table if exists public.conversation_sessions
  add column if not exists follow_up_due_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists follow_up_resolved_at timestamptz;

alter table if exists public.conversation_sessions
  add column if not exists last_status_event_at timestamptz;

create index if not exists idx_conversation_sessions_follow_up_status
  on public.conversation_sessions (follow_up_status, follow_up_due_at asc, updated_at desc);

create index if not exists idx_conversation_sessions_priority_source
  on public.conversation_sessions (priority_source, priority, updated_at desc);

comment on column public.conversation_sessions.next_action_hint is
  'Leitura taticamente resumida do proximo movimento recomendado para a thread.';

comment on column public.conversation_sessions.follow_up_status is
  'Estado unico de follow-up consolidado dentro da inbox.';

comment on column public.conversation_sessions.follow_up_due_at is
  'Prazo operacional do follow-up consolidado por thread.';

comment on column public.conversation_sessions.priority_source is
  'Distingue prioridade manual de prioridade inferida pela operacao.';
