do $$
begin
  create type public.appointment_change_type as enum (
    'created',
    'updated',
    'rescheduled',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.appointment_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  change_type public.appointment_change_type not null,
  title text not null,
  description text,
  appointment_type public.appointment_type not null,
  starts_at timestamptz not null,
  status public.appointment_status not null,
  visible_to_client boolean not null default true,
  changed_fields text[] not null default '{}'::text[],
  previous_state jsonb not null default '{}'::jsonb,
  current_state jsonb not null default '{}'::jsonb,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists appointment_history_appointment_created_idx
on public.appointment_history(appointment_id, created_at desc);

create index if not exists appointment_history_case_created_idx
on public.appointment_history(case_id, created_at desc);

alter table public.appointment_history enable row level security;

drop policy if exists "appointment_history_staff_only" on public.appointment_history;
create policy "appointment_history_staff_only"
on public.appointment_history
for all
using (public.is_staff())
with check (public.is_staff());
