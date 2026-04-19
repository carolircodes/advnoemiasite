alter table if exists public.intake_requests
  add column if not exists state_code text;

alter table if exists public.intake_requests
  add column if not exists preferred_contact_channel text not null default 'whatsapp';

alter table if exists public.intake_requests
  add column if not exists readiness_level text not null default 'explorando';

alter table if exists public.intake_requests
  add column if not exists appointment_interest boolean not null default false;

alter table if exists public.intake_requests
  add column if not exists lead_score integer not null default 0;

alter table if exists public.intake_requests
  add column if not exists lead_temperature text not null default 'cold';

alter table if exists public.intake_requests
  add column if not exists lifecycle_stage text not null default 'new_inquiry';

alter table if exists public.intake_requests
  add column if not exists score_explanation jsonb not null default '[]'::jsonb;

alter table if exists public.intake_requests
  add column if not exists experiment_context jsonb not null default '{}'::jsonb;

alter table if exists public.intake_requests
  add column if not exists last_activity_at timestamptz not null default timezone('utc', now());

create index if not exists intake_requests_lead_score_idx
  on public.intake_requests (lead_score desc, submitted_at desc);

create index if not exists intake_requests_temperature_idx
  on public.intake_requests (lead_temperature, submitted_at desc);

create index if not exists intake_requests_lifecycle_idx
  on public.intake_requests (lifecycle_stage, submitted_at desc);

alter table if exists public.client_pipeline
  add column if not exists lead_score integer not null default 0;

alter table if exists public.client_pipeline
  add column if not exists lead_score_band text not null default 'cold';

alter table if exists public.client_pipeline
  add column if not exists lifecycle_stage text not null default 'new_inquiry';

alter table if exists public.client_pipeline
  add column if not exists lifecycle_detail text;

alter table if exists public.client_pipeline
  add column if not exists score_explanation jsonb not null default '[]'::jsonb;

alter table if exists public.client_pipeline
  add column if not exists source_campaign text;

alter table if exists public.client_pipeline
  add column if not exists source_medium text;

alter table if exists public.client_pipeline
  add column if not exists source_topic text;

alter table if exists public.client_pipeline
  add column if not exists source_content_id text;

alter table if exists public.client_pipeline
  add column if not exists experiment_context jsonb not null default '{}'::jsonb;

alter table if exists public.client_pipeline
  add column if not exists loss_reason text;

alter table if exists public.client_pipeline
  add column if not exists win_reason text;

alter table if exists public.client_pipeline
  add column if not exists operational_sla_hours integer not null default 24;

alter table if exists public.client_pipeline
  add column if not exists last_score_at timestamptz;

create index if not exists idx_client_pipeline_lead_score
  on public.client_pipeline (lead_score desc, updated_at desc);

create index if not exists idx_client_pipeline_lifecycle_stage
  on public.client_pipeline (lifecycle_stage, updated_at desc);
