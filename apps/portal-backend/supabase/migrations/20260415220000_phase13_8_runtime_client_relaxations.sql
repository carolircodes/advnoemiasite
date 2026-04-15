alter table if exists public.clients
  alter column profile_id drop not null;

alter table if exists public.clients
  alter column cpf drop not null;

alter table if exists public.clients
  alter column phone drop not null;
