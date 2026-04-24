begin;

-- Convergencia idempotente para ambientes historicos onde partes do schema
-- canônico ficaram parcialmente aplicadas. Esta migration nao remove
-- compatibilidade; ela aproxima o banco real do source of truth atual.

alter table if exists public.case_events
  add column if not exists visible_to_client boolean not null default false;

update public.case_events
set visible_to_client = coalesce(nullif(btrim(public_summary), ''), '') <> ''
where visible_to_client = false;

create index if not exists case_events_client_visible_idx
  on public.case_events (client_id, visible_to_client, occurred_at desc);

do $$
begin
  create type public.document_status as enum ('recebido', 'pendente', 'solicitado', 'revisado');
exception
  when duplicate_object then null;
end $$;

alter table if exists public.documents
  alter column storage_path drop not null;

alter table if exists public.documents
  add column if not exists description text,
  add column if not exists status public.document_status not null default 'recebido',
  add column if not exists document_date timestamptz not null default timezone('utc', now()),
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint;

update public.documents
set document_date = coalesce(document_date, created_at, timezone('utc', now()))
where document_date is null;

create index if not exists documents_case_status_idx
  on public.documents (case_id, status, document_date desc);

do $$
begin
  create type public.appointment_type as enum (
    'reuniao',
    'retorno',
    'prazo',
    'audiencia',
    'ligacao'
  );
exception
  when duplicate_object then null;
end $$;

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

alter table if exists public.appointments
  add column if not exists title text not null default 'Compromisso do caso',
  add column if not exists appointment_type public.appointment_type not null default 'reuniao',
  add column if not exists visible_to_client boolean not null default true;

create index if not exists appointments_client_visible_idx
  on public.appointments (client_id, visible_to_client, starts_at asc);

create index if not exists appointments_case_starts_idx
  on public.appointments (case_id, starts_at asc);

create table if not exists public.appointment_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  change_type public.appointment_change_type not null default 'updated',
  title text not null default 'Compromisso do caso',
  description text,
  appointment_type public.appointment_type not null default 'reuniao',
  starts_at timestamptz not null default timezone('utc', now()),
  status public.appointment_status not null default 'scheduled',
  visible_to_client boolean not null default true,
  changed_fields text[] not null default '{}'::text[],
  previous_state jsonb not null default '{}'::jsonb,
  current_state jsonb not null default '{}'::jsonb,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.appointment_history
  add column if not exists case_id uuid references public.cases(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists change_type public.appointment_change_type not null default 'updated',
  add column if not exists title text not null default 'Compromisso do caso',
  add column if not exists description text,
  add column if not exists appointment_type public.appointment_type not null default 'reuniao',
  add column if not exists starts_at timestamptz not null default timezone('utc', now()),
  add column if not exists status public.appointment_status not null default 'scheduled',
  add column if not exists visible_to_client boolean not null default true,
  add column if not exists changed_fields text[] not null default '{}'::text[],
  add column if not exists previous_state jsonb not null default '{}'::jsonb,
  add column if not exists current_state jsonb not null default '{}'::jsonb,
  add column if not exists changed_by uuid references public.profiles(id),
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists appointment_history_appointment_created_idx
  on public.appointment_history (appointment_id, created_at desc);

create index if not exists appointment_history_case_created_idx
  on public.appointment_history (case_id, created_at desc);

alter table if exists public.intake_requests
  add column if not exists preferred_contact_channel text not null default 'whatsapp',
  add column if not exists lead_score integer not null default 0,
  add column if not exists lead_temperature text not null default 'cold',
  add column if not exists lifecycle_stage text not null default 'new_inquiry',
  add column if not exists last_activity_at timestamptz not null default timezone('utc', now());

create index if not exists intake_requests_lead_score_idx
  on public.intake_requests (lead_score desc, submitted_at desc);

create index if not exists intake_requests_temperature_idx
  on public.intake_requests (lead_temperature, submitted_at desc);

create index if not exists intake_requests_lifecycle_idx
  on public.intake_requests (lifecycle_stage, submitted_at desc);

alter table if exists public.payments
  add column if not exists external_reference text,
  add column if not exists financial_state text not null default 'pending',
  add column if not exists technical_state text not null default 'checkout_created',
  add column if not exists origin_type text not null default 'internal_secret',
  add column if not exists origin_source text,
  add column if not exists origin_actor_id text,
  add column if not exists origin_context jsonb not null default '{}'::jsonb,
  add column if not exists active_for_lead boolean not null default true,
  add column if not exists last_reconciled_at timestamptz,
  add column if not exists commercial_effect_applied_at timestamptz,
  add column if not exists commercial_effect_key text,
  add column if not exists last_provider_status text,
  add column if not exists last_provider_payment_id text,
  add column if not exists last_event_key text,
  add column if not exists webhook_received_at timestamptz,
  add column if not exists webhook_validated_at timestamptz,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by_payment_id uuid references public.payments(id),
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
    when origin_context = '{}'::jsonb then jsonb_strip_nulls(
      jsonb_build_object(
        'monetization_path', metadata ->> 'monetization_path',
        'monetization_source', metadata ->> 'monetization_source',
        'request_fingerprint', metadata ->> 'request_fingerprint',
        'event_id', metadata ->> 'event_id',
        'session_id', metadata ->> 'session_id'
      )
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

create index if not exists idx_payment_events_provider_payment
  on public.payment_events (provider_payment_id, created_at desc)
  where provider_payment_id is not null;

commit;
