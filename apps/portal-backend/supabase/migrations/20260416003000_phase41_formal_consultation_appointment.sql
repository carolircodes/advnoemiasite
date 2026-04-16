alter table public.client_pipeline
  add column if not exists consultation_case_id uuid references public.cases(id) on delete set null;

alter table public.client_pipeline
  add column if not exists consultation_appointment_id uuid references public.appointments(id) on delete set null;

alter table public.client_pipeline
  add column if not exists appointment_state text not null default 'not_created';

alter table public.client_pipeline
  add column if not exists consultation_preconfirmed_at timestamptz;

alter table public.client_pipeline
  add column if not exists appointment_created_at timestamptz;

alter table public.client_pipeline
  add column if not exists appointment_confirmed_at timestamptz;

alter table public.client_pipeline
  add column if not exists consultation_confirmation_source text;

create index if not exists idx_client_pipeline_consultation_case
  on public.client_pipeline (consultation_case_id);

create index if not exists idx_client_pipeline_consultation_appointment
  on public.client_pipeline (consultation_appointment_id);

create index if not exists idx_client_pipeline_appointment_state
  on public.client_pipeline (appointment_state, updated_at desc);
