alter table if exists public.payments
  add column if not exists base_amount_cents integer not null default 0,
  add column if not exists final_amount_cents integer not null default 0,
  add column if not exists price_source text not null default 'default_consultation',
  add column if not exists requested_test_amount_cents integer,
  add column if not exists owner_override_phone text;

update public.payments
set
  base_amount_cents = coalesce(base_amount_cents, round(coalesce(amount, 0) * 100)),
  final_amount_cents = coalesce(final_amount_cents, round(coalesce(amount, 0) * 100)),
  price_source = case
    when coalesce(price_source, '') <> '' then price_source
    when metadata ->> 'price_source' is not null then metadata ->> 'price_source'
    else 'default_consultation'
  end,
  requested_test_amount_cents = coalesce(
    requested_test_amount_cents,
    nullif(metadata ->> 'requested_test_amount_cents', '')::integer
  ),
  owner_override_phone = coalesce(
    owner_override_phone,
    nullif(metadata ->> 'owner_override_phone', '')
  )
where
  base_amount_cents = 0
  or final_amount_cents = 0
  or coalesce(price_source, '') = ''
  or requested_test_amount_cents is null
  or owner_override_phone is null;

create index if not exists payments_price_source_created_idx
  on public.payments (price_source, created_at desc);

create index if not exists payments_final_amount_created_idx
  on public.payments (final_amount_cents, created_at desc);
