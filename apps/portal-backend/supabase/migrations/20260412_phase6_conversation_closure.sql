-- Fechamento definitivo da Fase 6:
-- persistir coexistencia entre IA ativa no canal e handoff operacional.

alter table if exists public.noemia_triage_summaries
  add column if not exists explanation_stage varchar(50);

alter table if exists public.noemia_triage_summaries
  add column if not exists ai_active_on_channel boolean not null default true;

alter table if exists public.noemia_triage_summaries
  add column if not exists operational_handoff_recorded boolean not null default false;

alter table if exists public.noemia_triage_summaries
  add column if not exists human_followup_pending boolean not null default false;

alter table if exists public.noemia_triage_summaries
  add column if not exists follow_up_ready boolean not null default false;

create index if not exists idx_noemia_triage_summaries_explanation_stage
  on public.noemia_triage_summaries (explanation_stage);

create index if not exists idx_noemia_triage_summaries_ai_active
  on public.noemia_triage_summaries (ai_active_on_channel, operational_handoff_recorded);

create index if not exists idx_noemia_triage_summaries_followup_ready
  on public.noemia_triage_summaries (human_followup_pending, follow_up_ready);

comment on column public.noemia_triage_summaries.explanation_stage is
  'Etapa explicita da explicacao juridica/comercial conduzida pela NoemIA.';

comment on column public.noemia_triage_summaries.ai_active_on_channel is
  'Indica se a NoemIA continua responsavel pela conversa no canal mesmo apos handoff operacional.';

comment on column public.noemia_triage_summaries.operational_handoff_recorded is
  'Indica que houve registro operacional para a advogada sem encerrar a conversa automatica.';

comment on column public.noemia_triage_summaries.human_followup_pending is
  'Sinal operacional de follow-up humano pendente coexistindo com IA ativa.';

comment on column public.noemia_triage_summaries.follow_up_ready is
  'Marca triagens e consultas com contexto suficiente para follow-up comercial e operacional.';
