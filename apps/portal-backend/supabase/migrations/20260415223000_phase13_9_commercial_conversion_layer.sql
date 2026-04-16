alter table if exists public.client_pipeline
  add column if not exists consultation_readiness text not null default 'cold';

alter table if exists public.client_pipeline
  add column if not exists conversion_stage text not null default 'new_contact';

alter table if exists public.client_pipeline
  add column if not exists recommended_action text;

alter table if exists public.client_pipeline
  add column if not exists recommended_action_detail text;

alter table if exists public.client_pipeline
  add column if not exists conversion_signal text;

alter table if exists public.client_pipeline
  add column if not exists blocking_reason text;

alter table if exists public.client_pipeline
  add column if not exists objection_state text not null default 'none';

alter table if exists public.client_pipeline
  add column if not exists objection_hint text;

alter table if exists public.client_pipeline
  add column if not exists opportunity_state text not null default 'monitor';

alter table if exists public.client_pipeline
  add column if not exists consultation_recommendation_state text not null default 'hold';

alter table if exists public.client_pipeline
  add column if not exists consultation_recommendation_reason text;

alter table if exists public.client_pipeline
  add column if not exists consultation_suggested_copy text;

alter table if exists public.client_pipeline
  add column if not exists recommended_follow_up_window text;

alter table if exists public.client_pipeline
  add column if not exists advancement_reason text;

alter table if exists public.client_pipeline
  add column if not exists last_conversion_signal_at timestamptz;

create index if not exists idx_client_pipeline_consultation_readiness
  on public.client_pipeline (consultation_readiness, updated_at desc);

create index if not exists idx_client_pipeline_conversion_stage
  on public.client_pipeline (conversion_stage, updated_at desc);

create index if not exists idx_client_pipeline_opportunity_state
  on public.client_pipeline (opportunity_state, updated_at desc);
