alter table public.notifications_outbox
  add column if not exists last_clicked_at timestamptz,
  add column if not exists last_opened_at timestamptz,
  add column if not exists last_action_taken_at timestamptz,
  add column if not exists last_expired_at timestamptz,
  add column if not exists last_interaction_at timestamptz,
  add column if not exists last_interaction_type text;

create table if not exists public.notification_interactions (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications_outbox(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  interaction_type text not null check (
    interaction_type in ('cta_clicked', 'deep_link_opened', 'action_completed', 'expired_without_action')
  ),
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_interactions_notification_idx
  on public.notification_interactions (notification_id, created_at desc);

create index if not exists notification_interactions_type_idx
  on public.notification_interactions (interaction_type, created_at desc);

alter table public.notification_interactions enable row level security;

drop policy if exists "notification_interactions_staff_only" on public.notification_interactions;
create policy "notification_interactions_staff_only"
on public.notification_interactions
for select
using (public.is_staff());

create table if not exists public.notification_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  device_label text,
  platform text,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked', 'failed')),
  last_seen_at timestamptz,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_push_subscriptions_profile_idx
  on public.notification_push_subscriptions (profile_id, created_at desc);

alter table public.notification_push_subscriptions enable row level security;

drop policy if exists "notification_push_subscriptions_own_or_staff" on public.notification_push_subscriptions;
create policy "notification_push_subscriptions_own_or_staff"
on public.notification_push_subscriptions
for select
using (profile_id = auth.uid() or public.is_staff());

drop policy if exists "notification_push_subscriptions_own_write_or_staff" on public.notification_push_subscriptions;
create policy "notification_push_subscriptions_own_write_or_staff"
on public.notification_push_subscriptions
for all
using (profile_id = auth.uid() or public.is_staff())
with check (profile_id = auth.uid() or public.is_staff());

drop trigger if exists set_notification_push_subscriptions_updated_at on public.notification_push_subscriptions;
create trigger set_notification_push_subscriptions_updated_at
before update on public.notification_push_subscriptions
for each row execute function public.set_updated_at();
