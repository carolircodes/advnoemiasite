create table if not exists public.request_rate_limits (
  scope text not null,
  key_hash text not null,
  window_starts_at timestamptz not null,
  expires_at timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (scope, key_hash, window_starts_at)
);

create index if not exists request_rate_limits_expires_at_idx
  on public.request_rate_limits (expires_at);

create table if not exists public.idempotency_keys (
  scope text not null,
  key_hash text not null,
  request_fingerprint text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  resource_id text,
  response_payload jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (scope, key_hash)
);

create index if not exists idempotency_keys_expires_at_idx
  on public.idempotency_keys (expires_at);

alter table public.notifications_outbox
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_worker text,
  add column if not exists last_error_kind text;

create or replace function public.set_idempotency_keys_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.last_seen_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_idempotency_keys_updated_at on public.idempotency_keys;

create trigger trg_idempotency_keys_updated_at
before update on public.idempotency_keys
for each row
execute function public.set_idempotency_keys_updated_at();

create or replace function public.claim_rate_limit_bucket(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  current_count integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window_seconds integer := greatest(coalesce(p_window_seconds, 1), 1);
  v_bucket_epoch bigint;
  v_window_starts_at timestamptz;
  v_reset_at timestamptz;
begin
  if coalesce(length(trim(p_scope)), 0) = 0 then
    raise exception 'p_scope is required';
  end if;

  if coalesce(length(trim(p_key_hash)), 0) = 0 then
    raise exception 'p_key_hash is required';
  end if;

  if coalesce(p_limit, 0) <= 0 then
    raise exception 'p_limit must be positive';
  end if;

  v_bucket_epoch := floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds;
  v_window_starts_at := timezone('utc', to_timestamp(v_bucket_epoch));
  v_reset_at := v_window_starts_at + make_interval(secs => v_window_seconds);

  insert into public.request_rate_limits (
    scope,
    key_hash,
    window_starts_at,
    expires_at,
    request_count,
    last_seen_at
  )
  values (
    p_scope,
    p_key_hash,
    v_window_starts_at,
    v_reset_at,
    1,
    v_now
  )
  on conflict (scope, key_hash, window_starts_at)
  do update
  set request_count = public.request_rate_limits.request_count + 1,
      expires_at = excluded.expires_at,
      last_seen_at = v_now
  returning public.request_rate_limits.request_count, public.request_rate_limits.expires_at
  into current_count, reset_at;

  retry_after_seconds := greatest(ceil(extract(epoch from (reset_at - v_now)))::integer, 1);
  return next;
end;
$$;
