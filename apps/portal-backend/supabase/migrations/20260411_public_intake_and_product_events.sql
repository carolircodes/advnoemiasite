create table if not exists public.intake_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  city text,
  case_area public.case_area not null,
  current_stage text not null default 'ainda-nao-iniciei',
  urgency_level text not null default 'moderada',
  preferred_contact_period text not null default 'horario-comercial',
  case_summary text not null,
  consent_accepted boolean not null default false,
  source_path text,
  status text not null default 'new',
  internal_notes text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  event_group text not null default 'conversion',
  page_path text,
  session_id text,
  profile_id uuid references public.profiles(id) on delete set null,
  intake_request_id uuid references public.intake_requests(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists intake_requests_status_idx
  on public.intake_requests(status, submitted_at desc);
create index if not exists intake_requests_case_area_idx
  on public.intake_requests(case_area, created_at desc);
create index if not exists product_events_event_key_idx
  on public.product_events(event_key, occurred_at desc);
create index if not exists product_events_session_idx
  on public.product_events(session_id, occurred_at desc);

drop trigger if exists set_intake_requests_updated_at on public.intake_requests;
create trigger set_intake_requests_updated_at
before update on public.intake_requests
for each row execute function public.set_updated_at();

alter table public.intake_requests enable row level security;
alter table public.product_events enable row level security;

drop policy if exists "intake_requests_staff_only" on public.intake_requests;
create policy "intake_requests_staff_only"
on public.intake_requests
for all
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "product_events_staff_only" on public.product_events;
create policy "product_events_staff_only"
on public.product_events
for all
using (public.is_staff())
with check (public.is_staff());
