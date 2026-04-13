-- Suporte incremental para a nova policy conversacional da NoemIA.
-- Objetivo:
-- 1. persistir estado real da conversa e da consulta;
-- 2. salvar relatório estruturado para painel/follow-up;
-- 3. manter rollout seguro em ambientes com drift.

alter table if exists public.noemia_triage_summaries
  add column if not exists conversation_status varchar(50);

alter table if exists public.noemia_triage_summaries
  add column if not exists consultation_stage varchar(50);

alter table if exists public.noemia_triage_summaries
  add column if not exists report_data jsonb not null default '{}'::jsonb;

alter table if exists public.noemia_triage_summaries
  add column if not exists lawyer_notification_generated boolean not null default false;

create index if not exists idx_noemia_triage_summaries_conversation_status
  on public.noemia_triage_summaries (conversation_status);

create index if not exists idx_noemia_triage_summaries_consultation_stage
  on public.noemia_triage_summaries (consultation_stage);

create index if not exists idx_noemia_triage_summaries_report_data
  on public.noemia_triage_summaries using gin (report_data);

comment on column public.noemia_triage_summaries.conversation_status is
  'Estado operacional da conversa no fluxo ai -> triagem -> consulta -> handoff.';

comment on column public.noemia_triage_summaries.consultation_stage is
  'Etapa explícita de consulta/agendamento capturada pela NoemIA.';

comment on column public.noemia_triage_summaries.report_data is
  'Relatório estruturado da triagem, contexto comercial e próxima ação para a advogada.';

comment on column public.noemia_triage_summaries.lawyer_notification_generated is
  'Indica se já houve geração de aviso operacional para a advogada a partir desta triagem.';
