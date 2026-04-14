do $$
begin
  create type public.ecosystem_vertical as enum (
    'core_legal',
    'legal_service',
    'education',
    'premium_material',
    'community',
    'membership',
    'digital_product',
    'certification'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_catalog_kind as enum (
    'service',
    'plan',
    'material',
    'track',
    'module',
    'community',
    'membership',
    'digital_product'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_delivery_kind as enum (
    'legal_service',
    'portal_content',
    'download',
    'community_access',
    'hybrid',
    'future_release'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_access_model as enum (
    'single_purchase',
    'subscription',
    'plan_included',
    'complimentary',
    'manual_curated'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_availability_status as enum (
    'foundation',
    'draft',
    'private_beta',
    'published',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_brand_scope as enum (
    'main_brand',
    'shared_brand',
    'future_subbrand'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_boundary as enum (
    'core_legal',
    'adjacent_ecosystem',
    'isolated_future_vertical'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ecosystem_portal_workspace as enum (
    'legal_client',
    'premium_content',
    'plans_benefits',
    'community',
    'ecosystem_hub'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum (
    'interest',
    'incomplete',
    'trialing',
    'active',
    'past_due',
    'paused',
    'canceled',
    'expired'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_cadence as enum (
    'one_time',
    'monthly',
    'quarterly',
    'semiannual',
    'annual',
    'custom'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.access_grant_status as enum (
    'scheduled',
    'active',
    'paused',
    'expired',
    'revoked'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.community_member_status as enum (
    'invited',
    'active',
    'paused',
    'left',
    'removed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_progress_status as enum (
    'not_started',
    'in_progress',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ecosystem_catalog_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  vertical public.ecosystem_vertical not null,
  catalog_kind public.ecosystem_catalog_kind not null,
  delivery_kind public.ecosystem_delivery_kind not null,
  access_model public.ecosystem_access_model not null,
  availability_status public.ecosystem_availability_status not null default 'foundation',
  brand_scope public.ecosystem_brand_scope not null default 'shared_brand',
  legal_boundary public.ecosystem_boundary not null default 'adjacent_ecosystem',
  portal_workspace public.ecosystem_portal_workspace not null default 'ecosystem_hub',
  visibility_scope text not null default 'private',
  duration_days integer,
  expires_after_days integer,
  price_amount numeric(10,2),
  currency_code text not null default 'BRL',
  checkout_offer_code text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_plan_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  headline text not null,
  description text,
  cadence public.subscription_cadence not null default 'monthly',
  status public.ecosystem_availability_status not null default 'foundation',
  brand_scope public.ecosystem_brand_scope not null default 'shared_brand',
  legal_boundary public.ecosystem_boundary not null default 'adjacent_ecosystem',
  portal_workspace public.ecosystem_portal_workspace not null default 'plans_benefits',
  price_amount numeric(10,2),
  currency_code text not null default 'BRL',
  grace_period_days integer not null default 0,
  cancellation_policy text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_plan_benefits (
  id uuid primary key default gen_random_uuid(),
  plan_tier_id uuid not null references public.ecosystem_plan_tiers(id) on delete cascade,
  benefit_key text not null,
  title text not null,
  description text,
  benefit_type text not null default 'access',
  delivery_kind public.ecosystem_delivery_kind not null,
  access_scope text not null default 'standard',
  position integer not null default 0,
  status public.ecosystem_availability_status not null default 'foundation',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(plan_tier_id, benefit_key)
);

create table if not exists public.ecosystem_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier_id uuid not null references public.ecosystem_plan_tiers(id) on delete restrict,
  origin_catalog_item_id uuid references public.ecosystem_catalog_items(id) on delete set null,
  status public.subscription_status not null default 'interest',
  cadence public.subscription_cadence not null default 'monthly',
  renewal_mode text not null default 'manual_review',
  payment_provider text,
  external_reference text,
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  trial_ends_at timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  paused_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_access_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  catalog_item_id uuid not null references public.ecosystem_catalog_items(id) on delete cascade,
  subscription_id uuid references public.ecosystem_subscriptions(id) on delete set null,
  source_type text not null default 'manual',
  grant_status public.access_grant_status not null default 'scheduled',
  portal_workspace public.ecosystem_portal_workspace not null default 'ecosystem_hub',
  access_scope text not null default 'standard',
  starts_at timestamptz,
  ends_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_content_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  status public.ecosystem_availability_status not null default 'foundation',
  access_model public.ecosystem_access_model not null default 'plan_included',
  portal_workspace public.ecosystem_portal_workspace not null default 'premium_content',
  certification_enabled boolean not null default false,
  estimated_duration_minutes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_content_modules (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.ecosystem_content_tracks(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  position integer not null default 0,
  status public.ecosystem_availability_status not null default 'foundation',
  estimated_duration_minutes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(track_id, slug)
);

create table if not exists public.ecosystem_content_units (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.ecosystem_content_modules(id) on delete cascade,
  slug text not null,
  title text not null,
  unit_type text not null default 'lesson',
  teaser text,
  body_markdown text,
  position integer not null default 0,
  status public.ecosystem_availability_status not null default 'foundation',
  unlock_rule text not null default 'included',
  estimated_duration_minutes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(module_id, slug)
);

create table if not exists public.ecosystem_content_assets (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.ecosystem_content_units(id) on delete cascade,
  asset_type text not null default 'material',
  title text not null,
  delivery_url text,
  file_name text,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_content_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.ecosystem_content_tracks(id) on delete cascade,
  module_id uuid references public.ecosystem_content_modules(id) on delete set null,
  unit_id uuid references public.ecosystem_content_units(id) on delete set null,
  status public.content_progress_status not null default 'not_started',
  progress_percent numeric(5,2) not null default 0,
  started_at timestamptz,
  last_consumed_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(profile_id, track_id, unit_id)
);

create table if not exists public.ecosystem_communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status public.ecosystem_availability_status not null default 'foundation',
  access_model public.ecosystem_access_model not null default 'plan_included',
  portal_workspace public.ecosystem_portal_workspace not null default 'community',
  onboarding_copy text,
  offboarding_copy text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ecosystem_community_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.ecosystem_communities(id) on delete cascade,
  subscription_id uuid references public.ecosystem_subscriptions(id) on delete set null,
  status public.community_member_status not null default 'invited',
  access_level text not null default 'member',
  joined_at timestamptz,
  left_at timestamptz,
  last_active_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(profile_id, community_id)
);

create index if not exists ecosystem_catalog_items_vertical_idx
  on public.ecosystem_catalog_items(vertical, availability_status, created_at desc);
create index if not exists ecosystem_plan_tiers_status_idx
  on public.ecosystem_plan_tiers(status, cadence, created_at desc);
create index if not exists ecosystem_subscriptions_profile_idx
  on public.ecosystem_subscriptions(profile_id, status, created_at desc);
create index if not exists ecosystem_access_grants_profile_idx
  on public.ecosystem_access_grants(profile_id, grant_status, created_at desc);
create index if not exists ecosystem_content_tracks_status_idx
  on public.ecosystem_content_tracks(status, created_at desc);
create index if not exists ecosystem_content_progress_profile_idx
  on public.ecosystem_content_progress(profile_id, status, updated_at desc);
create index if not exists ecosystem_community_memberships_profile_idx
  on public.ecosystem_community_memberships(profile_id, status, created_at desc);

drop trigger if exists set_ecosystem_catalog_items_updated_at on public.ecosystem_catalog_items;
create trigger set_ecosystem_catalog_items_updated_at
before update on public.ecosystem_catalog_items
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_plan_tiers_updated_at on public.ecosystem_plan_tiers;
create trigger set_ecosystem_plan_tiers_updated_at
before update on public.ecosystem_plan_tiers
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_plan_benefits_updated_at on public.ecosystem_plan_benefits;
create trigger set_ecosystem_plan_benefits_updated_at
before update on public.ecosystem_plan_benefits
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_subscriptions_updated_at on public.ecosystem_subscriptions;
create trigger set_ecosystem_subscriptions_updated_at
before update on public.ecosystem_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_access_grants_updated_at on public.ecosystem_access_grants;
create trigger set_ecosystem_access_grants_updated_at
before update on public.ecosystem_access_grants
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_content_tracks_updated_at on public.ecosystem_content_tracks;
create trigger set_ecosystem_content_tracks_updated_at
before update on public.ecosystem_content_tracks
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_content_modules_updated_at on public.ecosystem_content_modules;
create trigger set_ecosystem_content_modules_updated_at
before update on public.ecosystem_content_modules
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_content_units_updated_at on public.ecosystem_content_units;
create trigger set_ecosystem_content_units_updated_at
before update on public.ecosystem_content_units
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_content_assets_updated_at on public.ecosystem_content_assets;
create trigger set_ecosystem_content_assets_updated_at
before update on public.ecosystem_content_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_content_progress_updated_at on public.ecosystem_content_progress;
create trigger set_ecosystem_content_progress_updated_at
before update on public.ecosystem_content_progress
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_communities_updated_at on public.ecosystem_communities;
create trigger set_ecosystem_communities_updated_at
before update on public.ecosystem_communities
for each row execute function public.set_updated_at();

drop trigger if exists set_ecosystem_community_memberships_updated_at on public.ecosystem_community_memberships;
create trigger set_ecosystem_community_memberships_updated_at
before update on public.ecosystem_community_memberships
for each row execute function public.set_updated_at();

alter table public.ecosystem_catalog_items enable row level security;
alter table public.ecosystem_plan_tiers enable row level security;
alter table public.ecosystem_plan_benefits enable row level security;
alter table public.ecosystem_subscriptions enable row level security;
alter table public.ecosystem_access_grants enable row level security;
alter table public.ecosystem_content_tracks enable row level security;
alter table public.ecosystem_content_modules enable row level security;
alter table public.ecosystem_content_units enable row level security;
alter table public.ecosystem_content_assets enable row level security;
alter table public.ecosystem_content_progress enable row level security;
alter table public.ecosystem_communities enable row level security;
alter table public.ecosystem_community_memberships enable row level security;

drop policy if exists "ecosystem_catalog_items_staff_manage" on public.ecosystem_catalog_items;
create policy "ecosystem_catalog_items_staff_manage"
on public.ecosystem_catalog_items
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_catalog_items_authenticated_published" on public.ecosystem_catalog_items;
create policy "ecosystem_catalog_items_authenticated_published"
on public.ecosystem_catalog_items
for select
using (
  public.is_staff()
  or (
    auth.role() = 'authenticated'
    and availability_status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_plan_tiers_staff_manage" on public.ecosystem_plan_tiers;
create policy "ecosystem_plan_tiers_staff_manage"
on public.ecosystem_plan_tiers
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_plan_tiers_authenticated_published" on public.ecosystem_plan_tiers;
create policy "ecosystem_plan_tiers_authenticated_published"
on public.ecosystem_plan_tiers
for select
using (
  public.is_staff()
  or (
    auth.role() = 'authenticated'
    and status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_plan_benefits_staff_manage" on public.ecosystem_plan_benefits;
create policy "ecosystem_plan_benefits_staff_manage"
on public.ecosystem_plan_benefits
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_plan_benefits_authenticated_published" on public.ecosystem_plan_benefits;
create policy "ecosystem_plan_benefits_authenticated_published"
on public.ecosystem_plan_benefits
for select
using (
  public.is_staff()
  or exists (
    select 1
    from public.ecosystem_plan_tiers
    where public.ecosystem_plan_tiers.id = public.ecosystem_plan_benefits.plan_tier_id
      and public.ecosystem_plan_tiers.status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_subscriptions_own_or_staff" on public.ecosystem_subscriptions;
create policy "ecosystem_subscriptions_own_or_staff"
on public.ecosystem_subscriptions
for select
using (public.is_staff() or profile_id = auth.uid());

drop policy if exists "ecosystem_subscriptions_staff_manage" on public.ecosystem_subscriptions;
create policy "ecosystem_subscriptions_staff_manage"
on public.ecosystem_subscriptions
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_access_grants_own_or_staff" on public.ecosystem_access_grants;
create policy "ecosystem_access_grants_own_or_staff"
on public.ecosystem_access_grants
for select
using (public.is_staff() or profile_id = auth.uid());

drop policy if exists "ecosystem_access_grants_staff_manage" on public.ecosystem_access_grants;
create policy "ecosystem_access_grants_staff_manage"
on public.ecosystem_access_grants
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_content_tracks_staff_manage" on public.ecosystem_content_tracks;
create policy "ecosystem_content_tracks_staff_manage"
on public.ecosystem_content_tracks
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_content_tracks_authenticated_published" on public.ecosystem_content_tracks;
create policy "ecosystem_content_tracks_authenticated_published"
on public.ecosystem_content_tracks
for select
using (
  public.is_staff()
  or (
    auth.role() = 'authenticated'
    and status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_content_modules_staff_manage" on public.ecosystem_content_modules;
create policy "ecosystem_content_modules_staff_manage"
on public.ecosystem_content_modules
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_content_modules_authenticated_published" on public.ecosystem_content_modules;
create policy "ecosystem_content_modules_authenticated_published"
on public.ecosystem_content_modules
for select
using (
  public.is_staff()
  or exists (
    select 1
    from public.ecosystem_content_tracks
    where public.ecosystem_content_tracks.id = public.ecosystem_content_modules.track_id
      and public.ecosystem_content_tracks.status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_content_units_staff_manage" on public.ecosystem_content_units;
create policy "ecosystem_content_units_staff_manage"
on public.ecosystem_content_units
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_content_units_authenticated_published" on public.ecosystem_content_units;
create policy "ecosystem_content_units_authenticated_published"
on public.ecosystem_content_units
for select
using (
  public.is_staff()
  or exists (
    select 1
    from public.ecosystem_content_modules
    join public.ecosystem_content_tracks
      on public.ecosystem_content_tracks.id = public.ecosystem_content_modules.track_id
    where public.ecosystem_content_modules.id = public.ecosystem_content_units.module_id
      and public.ecosystem_content_tracks.status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_content_assets_staff_manage" on public.ecosystem_content_assets;
create policy "ecosystem_content_assets_staff_manage"
on public.ecosystem_content_assets
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_content_assets_authenticated_published" on public.ecosystem_content_assets;
create policy "ecosystem_content_assets_authenticated_published"
on public.ecosystem_content_assets
for select
using (
  public.is_staff()
  or exists (
    select 1
    from public.ecosystem_content_units
    join public.ecosystem_content_modules
      on public.ecosystem_content_modules.id = public.ecosystem_content_units.module_id
    join public.ecosystem_content_tracks
      on public.ecosystem_content_tracks.id = public.ecosystem_content_modules.track_id
    where public.ecosystem_content_units.id = public.ecosystem_content_assets.unit_id
      and public.ecosystem_content_tracks.status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_content_progress_own_or_staff" on public.ecosystem_content_progress;
create policy "ecosystem_content_progress_own_or_staff"
on public.ecosystem_content_progress
for select
using (public.is_staff() or profile_id = auth.uid());

drop policy if exists "ecosystem_content_progress_staff_manage" on public.ecosystem_content_progress;
create policy "ecosystem_content_progress_staff_manage"
on public.ecosystem_content_progress
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_communities_staff_manage" on public.ecosystem_communities;
create policy "ecosystem_communities_staff_manage"
on public.ecosystem_communities
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "ecosystem_communities_authenticated_published" on public.ecosystem_communities;
create policy "ecosystem_communities_authenticated_published"
on public.ecosystem_communities
for select
using (
  public.is_staff()
  or (
    auth.role() = 'authenticated'
    and status in ('private_beta', 'published')
  )
);

drop policy if exists "ecosystem_community_memberships_own_or_staff" on public.ecosystem_community_memberships;
create policy "ecosystem_community_memberships_own_or_staff"
on public.ecosystem_community_memberships
for select
using (public.is_staff() or profile_id = auth.uid());

drop policy if exists "ecosystem_community_memberships_staff_manage" on public.ecosystem_community_memberships;
create policy "ecosystem_community_memberships_staff_manage"
on public.ecosystem_community_memberships
for all
using (public.is_staff())
with check (public.is_staff());
