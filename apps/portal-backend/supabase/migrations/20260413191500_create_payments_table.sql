create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  user_id uuid,
  external_id text,
  payment_url text,
  amount numeric(12,2) not null default 0,
  transaction_amount numeric(12,2),
  status text not null default 'pending',
  status_detail text,
  payment_method_id text,
  payment_type_id text,
  metadata jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payments_lead_created_idx
  on public.payments (lead_id, created_at desc);

create index if not exists payments_status_created_idx
  on public.payments (status, created_at desc);

create index if not exists payments_external_id_idx
  on public.payments (external_id);

create index if not exists payments_metadata_gin_idx
  on public.payments using gin (metadata);

alter table public.payments enable row level security;

drop policy if exists "payments_staff_only" on public.payments;
create policy "payments_staff_only"
on public.payments
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
    execute 'drop trigger if exists set_payments_updated_at on public.payments';
    execute 'create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at()';
  end if;
end $$;
