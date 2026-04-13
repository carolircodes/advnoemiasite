alter table if exists public.payments
  alter column user_id type text using user_id::text;
