alter table public.clients
  add column if not exists source_intake_request_id uuid references public.intake_requests(id) on delete set null;

create index if not exists clients_source_intake_request_idx
  on public.clients(source_intake_request_id);

create index if not exists profiles_invited_first_access_idx
  on public.profiles(invited_at, first_login_completed_at);

create index if not exists product_events_event_group_idx
  on public.product_events(event_group, occurred_at desc);

create index if not exists document_requests_reminder_idx
  on public.document_requests(status, visible_to_client, due_at, created_at desc);

create index if not exists appointments_reminder_idx
  on public.appointments(status, visible_to_client, starts_at);

create table if not exists public.automation_dispatches (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  entity_type text not null,
  entity_key text not null,
  notification_id uuid references public.notifications_outbox(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  dispatched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists automation_dispatches_rule_entity_key_idx
  on public.automation_dispatches(rule_key, entity_type, entity_key);

create index if not exists automation_dispatches_created_at_idx
  on public.automation_dispatches(created_at desc);

alter table public.automation_dispatches enable row level security;

drop policy if exists "automation_dispatches_staff_only" on public.automation_dispatches;
create policy "automation_dispatches_staff_only"
on public.automation_dispatches
for all
using (public.is_staff())
with check (public.is_staff());
