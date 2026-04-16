alter table if exists public.client_pipeline
  add column if not exists consultation_offer_state text not null default 'not_offered';

alter table if exists public.client_pipeline
  add column if not exists consultation_offer_sent_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists consultation_offer_reason text;

alter table if exists public.client_pipeline
  add column if not exists consultation_offer_copy text;

alter table if exists public.client_pipeline
  add column if not exists consultation_offer_amount numeric(10,2);

alter table if exists public.client_pipeline
  add column if not exists scheduling_state text not null default 'not_started';

alter table if exists public.client_pipeline
  add column if not exists scheduling_intent text;

alter table if exists public.client_pipeline
  add column if not exists scheduling_suggested_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists lead_schedule_preference text;

alter table if exists public.client_pipeline
  add column if not exists desired_schedule_window text;

alter table if exists public.client_pipeline
  add column if not exists schedule_confirmed_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists payment_state text not null default 'not_started';

alter table if exists public.client_pipeline
  add column if not exists payment_link_sent_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists payment_link_url text;

alter table if exists public.client_pipeline
  add column if not exists payment_reference text;

alter table if exists public.client_pipeline
  add column if not exists payment_pending_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists payment_approved_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists payment_failed_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists payment_expired_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists payment_abandoned_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists consultation_confirmed_at timestamptz;

alter table if exists public.client_pipeline
  add column if not exists closing_state text not null default 'open';

alter table if exists public.client_pipeline
  add column if not exists closing_block_reason text;

alter table if exists public.client_pipeline
  add column if not exists closing_signal text;

alter table if exists public.client_pipeline
  add column if not exists closing_next_step text;

alter table if exists public.client_pipeline
  add column if not exists closing_recommended_action text;

alter table if exists public.client_pipeline
  add column if not exists closing_recommended_action_detail text;

alter table if exists public.client_pipeline
  add column if not exists closing_copy_suggestion text;

alter table if exists public.client_pipeline
  add column if not exists last_closing_signal_at timestamptz;

create index if not exists idx_client_pipeline_offer_state
  on public.client_pipeline (consultation_offer_state, updated_at desc);

create index if not exists idx_client_pipeline_scheduling_state
  on public.client_pipeline (scheduling_state, updated_at desc);

create index if not exists idx_client_pipeline_payment_state
  on public.client_pipeline (payment_state, updated_at desc);

create index if not exists idx_client_pipeline_closing_state
  on public.client_pipeline (closing_state, updated_at desc);
