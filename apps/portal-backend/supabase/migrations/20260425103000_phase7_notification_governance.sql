create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text not null default 'America/Fortaleza',
  quiet_hours_start smallint not null default 21 check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint not null default 8 check (quiet_hours_end between 0 and 23),
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  push_enabled boolean not null default false,
  event_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_own_or_staff" on public.notification_preferences;
create policy "notification_preferences_own_or_staff"
on public.notification_preferences
for select
using (profile_id = auth.uid() or public.is_staff());

drop policy if exists "notification_preferences_own_update_or_staff" on public.notification_preferences;
create policy "notification_preferences_own_update_or_staff"
on public.notification_preferences
for all
using (profile_id = auth.uid() or public.is_staff())
with check (profile_id = auth.uid() or public.is_staff());

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notifications_outbox
  add column if not exists audience text,
  add column if not exists priority text,
  add column if not exists canonical_event_key text,
  add column if not exists action_label text,
  add column if not exists action_url text,
  add column if not exists dedup_key text,
  add column if not exists governance_reason text,
  add column if not exists cooldown_until timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists decision_context jsonb not null default '{}'::jsonb;

create index if not exists notifications_outbox_dedup_idx
  on public.notifications_outbox (dedup_key, created_at desc)
  where dedup_key is not null;

create index if not exists notifications_outbox_event_priority_idx
  on public.notifications_outbox (canonical_event_key, priority, created_at desc);
