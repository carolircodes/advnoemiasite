begin;

-- Fase 6: fundacao de dados mais governavel, semanticamente coerente e preparada
-- para crescimento. O foco aqui e endurecer semantica, reduzir drift entre banco e
-- backend, melhorar acesso e reforcar caminhos operacionais centrais sem quebrar o
-- produto atual.

comment on table public.client_pipeline is
  'Source of truth operacional/comercial por cliente canonico. Resume ownership, follow-up, conversao e fechamento sem substituir historicos de conversa ou pagamento.';

comment on column public.client_pipeline.stage is
  'Resumo enxuto do ponto atual no funil comercial. Estados especializados devem morar nas colunas derivadas de conversao e fechamento.';

comment on column public.client_pipeline.follow_up_status is
  'Estado canonico compartilhado com a inbox para o trilho de follow-up: none, pending, due, overdue, resolved ou converted.';

comment on column public.client_pipeline.follow_up_state is
  'Detalhe operacional do follow-up comercial. Pode carregar granularidade adicional sem contradizer follow_up_status.';

comment on column public.client_pipeline.consultation_readiness is
  'Leitura de maturidade comercial para consulta, usada como diagnostico e nao como historico.';

comment on column public.client_pipeline.conversion_stage is
  'Projecao de conversao comercial usada para acompanhamento interno e automacoes.';

comment on column public.client_pipeline.consultation_offer_state is
  'Estado do trilho de proposta de consulta. Nao representa agenda nem pagamento.';

comment on column public.client_pipeline.scheduling_state is
  'Estado do trilho de agendamento da consulta, separado de proposta e pagamento.';

comment on column public.client_pipeline.payment_state is
  'Estado comercial do pagamento para fechamento. O source of truth financeiro oficial continua em public.payments.financial_state.';

comment on column public.client_pipeline.closing_state is
  'Estado sintetico do fechamento comercial, derivado dos trilhos de proposta, agenda e pagamento.';

comment on table public.noemia_leads is
  'Camada operacional sensivel da NoemIA para captacao e monetizacao. Deve permanecer separada de clientes canonicos e de projections comerciais.';

comment on column public.noemia_leads.status is
  'Status legado amplo do lead na operacao NoemIA. Mantido por compatibilidade; evitar expandir sua responsabilidade.';

comment on column public.noemia_leads.lead_status is
  'Status de funil do lead dentro da captacao NoemIA. Usar para semantica comercial do lead, nao para fila operacional.';

comment on column public.noemia_leads.operational_status is
  'Controle de fila e tratamento operacional interno da camada NoemIA.';

comment on column public.noemia_leads.payment_status is
  'Resumo de pagamento observado no lead. O source of truth financeiro continua em public.payments.';

comment on table public.payments is
  'Source of truth financeiro transacional por tentativa de checkout/cobranca. Estados canonicos vivem em financial_state e technical_state; status permanece como compatibilidade externa.';

comment on column public.payments.status is
  'Campo legado/externo de compatibilidade com providers e endpoints antigos. Preferir financial_state para leitura canonica.';

comment on column public.payments.financial_state is
  'Estado financeiro canonico da tentativa de pagamento.';

comment on column public.payments.technical_state is
  'Estado tecnico do processamento do pagamento e da reconciliacao.';

comment on column public.payments.origin_type is
  'Origem governada da emissao do pagamento.';

comment on column public.payments.active_for_lead is
  'Indica se a tentativa ainda e a referencia ativa para o lead. Tentativas superseded permanecem auditaveis, mas nao devem dirigir o produto.';

comment on table public.payment_events is
  'Trilha auditavel e idempotente de transicoes de pagamento e efeitos laterais.';

comment on column public.payment_events.transition_key is
  'Chave idempotente da transicao financeira/comercial. Impede replay silencioso de efeitos laterais.';

comment on column public.payment_events.commercial_state is
  'Projecao comercial derivada da transicao financeira, usada para reconciliacao com pipeline.';

comment on table public.acquisition_events is
  'Eventos internos de aquisicao ligados a noemia_leads para atribuicao, auditoria e reconciliacao de origem.';

-- Normalizacao de follow_up_status para a linguagem canonica compartilhada com a inbox.
update public.client_pipeline
set follow_up_status = case
  when lower(coalesce(stage, '')) = 'consultation_scheduled'
    and lower(coalesce(follow_up_status, '')) in ('completed', 'resolved', 'converted')
    then 'converted'
  when lower(coalesce(follow_up_status, '')) in ('scheduled', 'sent', 'delivered', 'read')
    then 'pending'
  when lower(coalesce(follow_up_status, '')) in ('completed', 'replied')
    then 'resolved'
  when lower(coalesce(follow_up_status, '')) in ('failed', 'cancelled', 'no_response')
    then 'due'
  else follow_up_status
end
where lower(coalesce(follow_up_status, '')) in (
  'scheduled',
  'sent',
  'delivered',
  'read',
  'completed',
  'replied',
  'failed',
  'cancelled',
  'no_response'
);

update public.conversation_sessions
set follow_up_status = case
  when lower(coalesce(follow_up_status, '')) in ('scheduled', 'sent', 'delivered', 'read')
    then 'pending'
  when lower(coalesce(follow_up_status, '')) in ('completed', 'replied')
    then 'resolved'
  when lower(coalesce(follow_up_status, '')) in ('failed', 'cancelled', 'no_response')
    then 'due'
  else follow_up_status
end
where lower(coalesce(follow_up_status, '')) in (
  'scheduled',
  'sent',
  'delivered',
  'read',
  'completed',
  'replied',
  'failed',
  'cancelled',
  'no_response'
);

-- Endurecimento cirurgico de grants em tabelas estritamente backend-only.
do $$
begin
  if to_regclass('public.request_rate_limits') is not null then
    execute 'revoke all on table public.request_rate_limits from authenticated';
    execute 'grant select, insert, update, delete on table public.request_rate_limits to service_role';
  end if;

  if to_regclass('public.idempotency_keys') is not null then
    execute 'revoke all on table public.idempotency_keys from authenticated';
    execute 'grant select, insert, update, delete on table public.idempotency_keys to service_role';
  end if;

  if to_regclass('public.processed_webhook_events') is not null then
    execute 'revoke all on table public.processed_webhook_events from authenticated';
    execute 'grant select, insert, update, delete on table public.processed_webhook_events to service_role';
  end if;

  if to_regclass('public.keyword_automation_events') is not null then
    execute 'revoke all on table public.keyword_automation_events from authenticated';
    execute 'grant select, insert, update, delete on table public.keyword_automation_events to service_role';
  elsif to_regclass('keyword_automation_events') is not null then
    execute 'revoke all on table keyword_automation_events from authenticated';
    execute 'grant select, insert, update, delete on table keyword_automation_events to service_role';
  end if;
end $$;

-- Indices para filas centrais e reconciliacoes quentes.
create index if not exists idx_client_channels_active_external
  on public.client_channels (channel, external_user_id, last_contact_at desc)
  where is_active = true;

create index if not exists idx_client_pipeline_owner_follow_up_queue
  on public.client_pipeline (owner_profile_id, follow_up_state, next_follow_up_at asc nulls last, updated_at desc);

create index if not exists idx_client_pipeline_closing_queue
  on public.client_pipeline (closing_state, payment_state, scheduling_state, updated_at desc);

create index if not exists idx_conversation_sessions_follow_up_due
  on public.conversation_sessions (follow_up_status, follow_up_due_at asc nulls last, last_message_at desc nulls last)
  where thread_status <> 'archived';

create index if not exists idx_follow_up_messages_external_message_id
  on public.follow_up_messages (external_message_id)
  where external_message_id is not null;

create index if not exists idx_payments_lead_reconciliation
  on public.payments (lead_id, active_for_lead, financial_state, created_at desc);

create index if not exists idx_payment_events_provider_payment
  on public.payment_events (provider_payment_id, created_at desc)
  where provider_payment_id is not null;

create index if not exists idx_noemia_leads_payment_status_window
  on public.noemia_leads (payment_status, payment_requested_at desc, updated_at desc);

-- Constraints NOT VALID: endurecem escrita futura sem exigir limpeza destrutiva imediata.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_pipeline_follow_up_status_known_check'
  ) then
    alter table public.client_pipeline
      add constraint client_pipeline_follow_up_status_known_check
      check (follow_up_status in ('none', 'pending', 'due', 'overdue', 'resolved', 'converted')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'conversation_sessions_follow_up_status_known_check'
  ) then
    alter table public.conversation_sessions
      add constraint conversation_sessions_follow_up_status_known_check
      check (follow_up_status in ('none', 'pending', 'due', 'overdue', 'resolved', 'converted')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_status_known_check'
  ) then
    alter table public.payments
      add constraint payments_status_known_check
      check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'refunded', 'charged_back')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_financial_state_known_check'
  ) then
    alter table public.payments
      add constraint payments_financial_state_known_check
      check (financial_state in ('pending', 'approved', 'failed', 'expired', 'cancelled', 'refunded', 'charged_back')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_technical_state_known_check'
  ) then
    alter table public.payments
      add constraint payments_technical_state_known_check
      check (technical_state in ('checkout_created', 'webhook_received', 'webhook_validated', 'reconciled', 'webhook_ignored', 'superseded')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_origin_type_known_check'
  ) then
    alter table public.payments
      add constraint payments_origin_type_known_check
      check (origin_type in ('staff', 'internal_secret', 'channel_automation', 'site_flow', 'noemia_flow', 'system')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_amount_nonnegative_check'
  ) then
    alter table public.payments
      add constraint payments_amount_nonnegative_check
      check (
        amount >= 0
        and (transaction_amount is null or transaction_amount >= 0)
        and base_amount_cents >= 0
        and final_amount_cents >= 0
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_subject_present_check'
  ) then
    alter table public.payments
      add constraint payments_subject_present_check
      check (lead_id is not null or user_id is not null) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payment_events_financial_state_known_check'
  ) then
    alter table public.payment_events
      add constraint payment_events_financial_state_known_check
      check (
        financial_state is null
        or financial_state in ('pending', 'approved', 'failed', 'expired', 'cancelled', 'refunded', 'charged_back')
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payment_events_technical_state_known_check'
  ) then
    alter table public.payment_events
      add constraint payment_events_technical_state_known_check
      check (
        technical_state is null
        or technical_state in ('checkout_created', 'webhook_received', 'webhook_validated', 'reconciled', 'webhook_ignored', 'superseded')
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payment_events_commercial_state_known_check'
  ) then
    alter table public.payment_events
      add constraint payment_events_commercial_state_known_check
      check (
        commercial_state is null
        or commercial_state in ('not_started', 'link_sent', 'pending', 'approved', 'failed', 'expired', 'abandoned')
      ) not valid;
  end if;
end $$;

commit;
