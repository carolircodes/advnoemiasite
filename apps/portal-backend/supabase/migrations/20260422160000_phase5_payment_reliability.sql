alter table if exists public.payments
  add column if not exists external_reference text,
  add column if not exists financial_state text not null default 'pending',
  add column if not exists technical_state text not null default 'checkout_created',
  add column if not exists origin_type text not null default 'internal_secret',
  add column if not exists origin_source text,
  add column if not exists origin_actor_id text,
  add column if not exists origin_context jsonb not null default '{}'::jsonb,
  add column if not exists active_for_lead boolean not null default true,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by_payment_id uuid references public.payments(id),
  add column if not exists webhook_received_at timestamptz,
  add column if not exists webhook_validated_at timestamptz,
  add column if not exists last_provider_status text,
  add column if not exists last_provider_payment_id text,
  add column if not exists last_event_key text,
  add column if not exists last_reconciled_at timestamptz,
  add column if not exists commercial_effect_applied_at timestamptz,
  add column if not exists commercial_effect_key text,
  add column if not exists expired_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists charged_back_at timestamptz;

update public.payments
set
  external_reference = coalesce(
    nullif(external_reference, ''),
    nullif(metadata ->> 'external_reference', '')
  ),
  financial_state = case
    when coalesce(financial_state, '') <> '' then financial_state
    when status = 'approved' then 'approved'
    when status in ('rejected', 'failed') and coalesce(status_detail, '') ilike '%expired%' then 'expired'
    when status in ('rejected', 'failed') then 'failed'
    when status in ('cancelled', 'canceled') and coalesce(status_detail, '') ilike '%expired%' then 'expired'
    when status in ('cancelled', 'canceled') then 'cancelled'
    when status = 'refunded' then 'refunded'
    when status = 'charged_back' then 'charged_back'
    else 'pending'
  end,
  technical_state = case
    when coalesce(technical_state, '') <> '' then technical_state
    when status in ('approved', 'rejected', 'failed', 'refunded', 'charged_back', 'cancelled', 'canceled')
      then 'reconciled'
    else 'checkout_created'
  end,
  origin_source = coalesce(
    nullif(origin_source, ''),
    nullif(metadata ->> 'monetization_source', ''),
    nullif(metadata ->> 'channel', ''),
    'internal_runtime'
  ),
  origin_actor_id = coalesce(
    nullif(origin_actor_id, ''),
    nullif(user_id::text, '')
  ),
  origin_context = case
    when origin_context = '{}'::jsonb then jsonb_build_object(
      'monetization_path', metadata ->> 'monetization_path',
      'monetization_source', metadata ->> 'monetization_source',
      'request_fingerprint', metadata ->> 'request_fingerprint',
      'event_id', metadata ->> 'event_id',
      'session_id', metadata ->> 'session_id'
    )
    else origin_context
  end,
  active_for_lead = coalesce(active_for_lead, status in ('pending', 'approved'))
where true;

create index if not exists payments_external_reference_idx
  on public.payments (external_reference);

create index if not exists payments_financial_state_created_idx
  on public.payments (financial_state, created_at desc);

create index if not exists payments_active_for_lead_idx
  on public.payments (lead_id, active_for_lead, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_kind text not null,
  transition_key text not null,
  source text not null default 'payment_workflow',
  provider_payment_id text,
  provider_status text,
  financial_state text,
  technical_state text,
  commercial_state text,
  side_effect_applied boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create unique index if not exists payment_events_transition_key_idx
  on public.payment_events (transition_key);

create index if not exists payment_events_payment_created_idx
  on public.payment_events (payment_id, created_at desc);

alter table public.payment_events enable row level security;

drop policy if exists "payment_events_staff_only" on public.payment_events;
create policy "payment_events_staff_only"
on public.payment_events
for all
using (public.is_staff())
with check (public.is_staff());

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    execute 'drop trigger if exists set_payment_events_updated_at on public.payment_events';
  end if;
end $$;
