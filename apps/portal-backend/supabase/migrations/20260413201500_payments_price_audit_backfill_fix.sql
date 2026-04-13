update public.payments
set
  base_amount_cents = round(coalesce(amount, 0) * 100),
  final_amount_cents = round(coalesce(amount, 0) * 100),
  price_source = case
    when coalesce(price_source, '') = '' then 'default_consultation'
    else price_source
  end
where
  base_amount_cents = 0
  or final_amount_cents = 0
  or coalesce(price_source, '') = '';
