create table if not exists public.ecosystem_billing_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.ecosystem_subscriptions(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  plan_tier_id uuid references public.ecosystem_plan_tiers(id) on delete set null,
  provider text not null,
  provider_event_type text not null,
  provider_status text,
  billing_status text,
  amount numeric(10,2),
  currency_code text not null default 'BRL',
  provider_reference text,
  external_reference text,
  occurred_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.ecosystem_plan_tiers
  add column if not exists billing_provider text,
  add column if not exists billing_plan_reference text,
  add column if not exists billing_status text not null default 'foundation',
  add column if not exists billing_metadata jsonb not null default '{}'::jsonb,
  add column if not exists billing_activated_at timestamptz;

alter table public.ecosystem_subscriptions
  add column if not exists billing_status text not null default 'pending_setup',
  add column if not exists billing_provider_reference text,
  add column if not exists billing_provider_plan_reference text,
  add column if not exists source_of_activation text not null default 'manual_beta',
  add column if not exists renewal_cycle integer not null default 1,
  add column if not exists renewal_due_at timestamptz,
  add column if not exists next_billing_at timestamptz,
  add column if not exists past_due_at timestamptz,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists last_billing_event_at timestamptz,
  add column if not exists billing_metadata jsonb not null default '{}'::jsonb;

alter table public.ecosystem_access_grants
  add column if not exists last_synced_at timestamptz,
  add column if not exists access_origin text not null default 'manual';

alter table public.ecosystem_community_memberships
  add column if not exists entitlement_origin text not null default 'manual';

create index if not exists ecosystem_billing_events_subscription_idx
  on public.ecosystem_billing_events(subscription_id, occurred_at desc);

create index if not exists ecosystem_billing_events_profile_idx
  on public.ecosystem_billing_events(profile_id, occurred_at desc);

create index if not exists ecosystem_subscriptions_billing_reference_idx
  on public.ecosystem_subscriptions(payment_provider, billing_provider_reference, created_at desc);

alter table public.ecosystem_billing_events enable row level security;

drop policy if exists "ecosystem_billing_events_own_or_staff" on public.ecosystem_billing_events;
create policy "ecosystem_billing_events_own_or_staff"
on public.ecosystem_billing_events
for select
using (public.is_staff() or profile_id = auth.uid());

drop policy if exists "ecosystem_billing_events_staff_manage" on public.ecosystem_billing_events;
create policy "ecosystem_billing_events_staff_manage"
on public.ecosystem_billing_events
for all
using (public.is_staff())
with check (public.is_staff());

update public.ecosystem_plan_tiers
set
  status = case when code = 'circulo_essencial' then 'published'::public.ecosystem_availability_status else status end,
  price_amount = case when code = 'circulo_essencial' then 149.00 else price_amount end,
  billing_provider = case when code = 'circulo_essencial' then 'mercado_pago_preapproval' else billing_provider end,
  billing_status = case when code = 'circulo_essencial' then 'live_preparing' else billing_status end,
  billing_metadata = coalesce(billing_metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.3',
    'anchor_subscription_plan', code = 'circulo_essencial',
    'single_live_plan', code = 'circulo_essencial'
  ),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.3',
    'billing_mode', case when code = 'circulo_essencial' then 'operational_live_preparing' else 'not_live' end
  )
where code in ('circulo_essencial', 'circulo_reserva');

update public.ecosystem_subscriptions
set
  billing_status = case
    when renewal_mode = 'manual_beta' then 'beta_manual'
    when status = 'active' then 'active'
    when status = 'paused' then 'paused'
    when status = 'canceled' then 'canceled'
    when status = 'past_due' then 'past_due'
    else billing_status
  end,
  source_of_activation = case
    when renewal_mode = 'manual_beta' then 'founding_beta'
    else coalesce(nullif(source_of_activation, ''), 'manual_review')
  end,
  renewal_due_at = coalesce(renewal_due_at, current_period_ends_at, trial_ends_at),
  next_billing_at = coalesce(next_billing_at, current_period_ends_at, trial_ends_at),
  last_billing_event_at = coalesce(last_billing_event_at, updated_at, created_at),
  billing_metadata = coalesce(billing_metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.3',
    'transition', case when renewal_mode = 'manual_beta' then 'beta_preserved' else 'lifecycle_enabled' end,
    'founding_benefits_preserved', renewal_mode = 'manual_beta'
  ),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.3',
    'entitlement_source', case when renewal_mode = 'manual_beta' then 'founding_beta' else 'subscription_lifecycle' end
  )
where plan_tier_id in (
  select id from public.ecosystem_plan_tiers where code = 'circulo_essencial'
);

update public.ecosystem_access_grants
set
  access_origin = case
    when source_type = 'manual_beta' then 'founding_beta'
    else 'subscription_lifecycle'
  end,
  last_synced_at = timezone('utc', now()),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.3',
    'entitlement_live_ready', true
  )
where catalog_item_id in (
  select id from public.ecosystem_catalog_items where slug = 'biblioteca-estrategica-premium'
);

update public.ecosystem_community_memberships
set
  entitlement_origin = case
    when access_level = 'founding_beta' then 'founding_beta'
    else 'subscription_lifecycle'
  end,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.3',
    'community_entitlement_live_ready', true
  )
where community_id in (
  select id from public.ecosystem_communities where slug = 'circulo-reservado'
);
